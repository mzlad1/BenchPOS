// simplified-sync.js
const {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
} = require("firebase/firestore");
const ElectronStore = require("electron-store");
const localStore = new ElectronStore({ name: "shop-billing-local-data" });
const { ipcMain, BrowserWindow } = require("electron");

// Track status
let isOnline = false;
let isSyncing = false;
let lastSyncTime = null;
let handlersRegistered = false;

// Collections to sync
const COLLECTIONS_TO_SYNC = ["products", "invoices"];

// Function to update online status
function updateOnlineStatus(status) {
  isOnline = status;
  return isOnline;
}

// Function to get unsynced item counts
async function checkUnsyncedData(db) {
  if (!isOnline || !db) {
    return { success: false, message: "Offline or database not initialized" };
  }

  try {
    const unsyncedCounts = {};
    let totalUnsyncedItems = 0;

    // Check each collection
    for (const collectionName of COLLECTIONS_TO_SYNC) {
      // Get local data
      const localItems = localStore.get(collectionName) || [];

      // Get cloud data
      const querySnapshot = await getDocs(collection(db, collectionName));
      const cloudItems = querySnapshot.docs.map((doc) => doc.data());

      // Find items that only exist locally (need to be uploaded)
      const cloudIds = cloudItems.map((item) => item.id);
      const localOnlyItems = localItems.filter(
        (item) => !cloudIds.includes(item.id)
      );

      // Find items that only exist in cloud (need to be downloaded)
      const localIds = localItems.map((item) => item.id);
      const cloudOnlyItems = cloudItems.filter(
        (item) => !localIds.includes(item.id)
      );

      // Find conflicting items (exist in both but with different updatedAt)
      const conflictingItems = localItems.filter((localItem) => {
        const cloudItem = cloudItems.find((item) => item.id === localItem.id);
        if (!cloudItem) return false;

        // Check if timestamps are different
        const localUpdated = localItem.updatedAt
          ? new Date(localItem.updatedAt)
          : new Date(0);
        const cloudUpdated = cloudItem.updatedAt
          ? new Date(cloudItem.updatedAt)
          : new Date(0);

        return localUpdated.getTime() !== cloudUpdated.getTime();
      });

      // Calculate total unsynced items for this collection
      const unsyncedItemCount =
        localOnlyItems.length + cloudOnlyItems.length + conflictingItems.length;

      if (unsyncedItemCount > 0) {
        unsyncedCounts[collectionName] = {
          toUpload: localOnlyItems.length,
          toDownload: cloudOnlyItems.length,
          conflicts: conflictingItems.length,
          total: unsyncedItemCount,
        };

        totalUnsyncedItems += unsyncedItemCount;
      }
    }

    return {
      success: true,
      hasUnsyncedData: totalUnsyncedItems > 0,
      unsyncedCounts,
      totalUnsyncedItems,
    };
  } catch (error) {
    console.error("Error checking unsynced data:", error);
    return { success: false, message: error.message };
  }
}

// Function to perform sync on demand
async function performSync(db) {
  if (!isOnline || isSyncing || !db) {
    return {
      success: false,
      message:
        "Cannot sync - offline, already syncing, or database not initialized",
    };
  }

  isSyncing = true;
  notifySyncStarted();

  try {
    const results = {};

    // Sync each collection
    for (const collectionName of COLLECTIONS_TO_SYNC) {
      const collectionResult = await syncCollection(db, collectionName);
      results[collectionName] = collectionResult;

      // Notify progress
      notifySyncProgress({
        collection: collectionName,
        uploaded: collectionResult.uploaded,
        downloaded: collectionResult.downloaded,
        conflicts: collectionResult.conflicts,
      });
    }

    // Update last sync time
    lastSyncTime = new Date().toISOString();

    notifySyncCompleted({ success: true, timestamp: lastSyncTime, results });
    return { success: true, timestamp: lastSyncTime, results };
  } catch (error) {
    console.error("Error during sync:", error);
    notifySyncCompleted({ success: false, error: error.message });
    return { success: false, message: error.message };
  } finally {
    isSyncing = false;
  }
}

// Function to sync a specific collection
async function syncCollection(db, collectionName) {
  try {
    // Get local data
    const localItems = localStore.get(collectionName) || [];

    // Get cloud data
    const querySnapshot = await getDocs(collection(db, collectionName));
    const cloudItems = querySnapshot.docs.map((doc) => doc.data());

    // Track sync results
    const result = {
      uploaded: 0,
      downloaded: 0,
      conflicts: 0,
      resolved: 0,
    };

    // Create maps for easier lookups
    const localMap = new Map(localItems.map((item) => [item.id, item]));
    const cloudMap = new Map(cloudItems.map((item) => [item.id, item]));

    // Create a map for the final result
    const finalMap = new Map(localMap);

    // 1. Items that only exist locally - upload them
    for (const [id, item] of localMap.entries()) {
      if (!cloudMap.has(id)) {
        // Upload to cloud
        await setDoc(doc(db, collectionName, id), item);
        result.uploaded++;
      }
    }

    // 2. Items that only exist in cloud - download them
    for (const [id, item] of cloudMap.entries()) {
      if (!localMap.has(id)) {
        // Add to final map
        finalMap.set(id, item);
        result.downloaded++;
      }
    }

    // 3. Handle conflicts (items in both but different)
    for (const [id, localItem] of localMap.entries()) {
      const cloudItem = cloudMap.get(id);
      if (cloudItem) {
        // Check if they're different
        const localUpdated = localItem.updatedAt
          ? new Date(localItem.updatedAt)
          : new Date(0);
        const cloudUpdated = cloudItem.updatedAt
          ? new Date(cloudItem.updatedAt)
          : new Date(0);

        if (localUpdated.getTime() !== cloudUpdated.getTime()) {
          result.conflicts++;

          // Use the newer version
          if (localUpdated > cloudUpdated) {
            // Local is newer, upload it
            await setDoc(doc(db, collectionName, id), localItem);
            // Keep local version in final map (already there)
          } else {
            // Cloud is newer, download it
            finalMap.set(id, cloudItem);
          }
          result.resolved++;
        }
      }
    }

    // Update local storage with final data
    localStore.set(collectionName, Array.from(finalMap.values()));

    return result;
  } catch (error) {
    console.error(`Error syncing collection ${collectionName}:`, error);
    throw error;
  }
}

// Function to get last sync time
function getLastSyncTime() {
  return lastSyncTime;
}

// Functions to notify renderer process about sync status
function notifySyncStarted() {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("sync-started");
  }
}

function notifySyncProgress(data) {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("sync-progress", data);
  }
}

function notifySyncCompleted(data) {
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("sync-completed", data);
  }
}

// Set up IPC handlers
function setupIpcHandlers(db) {
  // Check if handlers are already registered by attempting to remove them first
  try {
    ipcMain.removeHandler("check-unsynced-data");
    ipcMain.removeHandler("perform-sync");
    ipcMain.removeHandler("get-last-sync-time");
    console.log("Removed existing sync handlers");
  } catch (e) {
    // Ignore errors if handlers don't exist
  }

  // Now register the handlers
  ipcMain.handle("check-unsynced-data", async () => {
    return await checkUnsyncedData(db);
  });

  ipcMain.handle("perform-sync", async () => {
    return await performSync(db);
  });

  ipcMain.handle("get-last-sync-time", () => {
    return getLastSyncTime();
  });

  console.log("Sync IPC handlers registered successfully");
}

module.exports = {
  updateOnlineStatus,
  checkUnsyncedData,
  performSync,
  getLastSyncTime,
  setupIpcHandlers,
};
