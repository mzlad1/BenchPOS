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
  if (!isOnline) {
    return { success: false, message: "Device is offline" };
  }

  if (!db) {
    return {
      success: false,
      message: "Database not initialized yet. Please try again later.",
    };
  }

  try {
    const unsyncedCounts = {};
    let totalUnsyncedItems = 0;

    // Check each collection
    for (const collectionName of COLLECTIONS_TO_SYNC) {
      // Get local data
      const localItems = localStore.get(collectionName) || [];

      // Get cloud data
      let cloudItems = [];
      try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        cloudItems = querySnapshot.docs.map((doc) => doc.data());
      } catch (error) {
        console.error(
          `Error fetching cloud data for ${collectionName}:`,
          error
        );
        // Continue with empty cloud items
      }

      // Find items that only exist locally (need to be uploaded)
      const cloudIds = cloudItems.map((item) => item.id).filter((id) => id);
      const localOnlyItems = localItems.filter(
        (item) => item.id && !cloudIds.includes(item.id)
      );

      // Find items that only exist in cloud (need to be downloaded)
      const localIds = localItems.map((item) => item.id).filter((id) => id);
      const cloudOnlyItems = cloudItems.filter(
        (item) => item.id && !localIds.includes(item.id)
      );

      // Find conflicting items (exist in both but with different updatedAt)
      const conflictingItems = localItems.filter((localItem) => {
        if (!localItem.id) return false;

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

      // Only add to unsyncedCounts if there are actually items to sync
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

    if (!db) {
      throw new Error("Invalid Firestore database instance");
    }

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

// Function to validate ID
function isValidId(id) {
  return id && typeof id === "string" && id.trim() !== "";
}

// Function to sync a specific collection
async function syncCollection(db, collectionName) {
  try {
    console.log(`Starting sync for collection: ${collectionName}`);

    // Get local data
    const localItems = localStore.get(collectionName) || [];
    console.log(`Local ${collectionName} items: ${localItems.length}`);

    // Validate local items have valid IDs
    const validLocalItems = localItems.filter((item) => {
      if (!item || !isValidId(item.id)) {
        console.warn(`Found invalid item ID in local ${collectionName}:`, item);
        return false;
      }
      return true;
    });

    if (validLocalItems.length !== localItems.length) {
      console.warn(
        `Filtered out ${
          localItems.length - validLocalItems.length
        } invalid items from local ${collectionName}`
      );
    }

    // Get cloud data
    let cloudItems = [];
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      cloudItems = querySnapshot.docs.map((doc) => doc.data());
      console.log(`Cloud ${collectionName} items: ${cloudItems.length}`);
    } catch (error) {
      console.error(`Error fetching cloud data for ${collectionName}:`, error);
      // Continue with empty cloud items
    }

    // Validate cloud items have valid IDs
    const validCloudItems = cloudItems.filter((item) => {
      if (!item || !isValidId(item.id)) {
        console.warn(`Found invalid item ID in cloud ${collectionName}:`, item);
        return false;
      }
      return true;
    });

    if (validCloudItems.length !== cloudItems.length) {
      console.warn(
        `Filtered out ${
          cloudItems.length - validCloudItems.length
        } invalid items from cloud ${collectionName}`
      );
    }

    // Track sync results
    const result = {
      uploaded: 0,
      downloaded: 0,
      conflicts: 0,
      resolved: 0,
    };

    // Create maps for easier lookups - only use valid items
    const localMap = new Map(validLocalItems.map((item) => [item.id, item]));
    const cloudMap = new Map(validCloudItems.map((item) => [item.id, item]));

    // Create a map for the final result
    const finalMap = new Map(localMap);

    // 1. Items that only exist locally - upload them
    console.log(`${collectionName}: Processing items to upload...`);
    for (const [id, item] of localMap.entries()) {
      if (!cloudMap.has(id)) {
        try {
          // Double-check ID is valid before upload
          if (!isValidId(id)) {
            console.error(
              `Invalid ID found for upload in ${collectionName}: ${id}`
            );
            continue; // Skip this item
          }

          // Create a clean copy of the item to upload
          const itemToUpload = { ...item };

          // Upload to cloud - with extra error handling
          try {
            // Make sure we have valid arguments for doc() function
            if (!db || typeof db !== "object") {
              throw new Error("Invalid database reference");
            }

            if (!collectionName || typeof collectionName !== "string") {
              throw new Error(`Invalid collection name: ${collectionName}`);
            }

            // Create a document reference and upload
            const docRef = doc(db, collectionName, id);
            await setDoc(docRef, itemToUpload);

            result.uploaded++;
            console.log(`${collectionName}: Uploaded item ${id}`);
          } catch (uploadError) {
            console.error(
              `Error creating document reference or uploading for ${id} in ${collectionName}:`,
              uploadError
            );
            throw uploadError; // Re-throw to be caught by outer try-catch
          }
        } catch (error) {
          console.error(
            `Error uploading item ${id} to ${collectionName}:`,
            error
          );
          // Continue with next item
        }
      }
    }

    // 2. Items that only exist in cloud - download them
    console.log(`${collectionName}: Processing items to download...`);
    for (const [id, item] of cloudMap.entries()) {
      if (!localMap.has(id)) {
        try {
          // Validate ID again (although it should be valid from our filtered list)
          if (!isValidId(id)) {
            console.error(
              `Invalid ID found for download in ${collectionName}: ${id}`
            );
            continue; // Skip this item
          }

          // Add to final map
          finalMap.set(id, item);
          result.downloaded++;
          console.log(`${collectionName}: Downloaded item ${id}`);
        } catch (error) {
          console.error(
            `Error processing download for item ${id} in ${collectionName}:`,
            error
          );
          // Continue with next item
        }
      }
    }

    // 3. Handle conflicts (items in both but different)
    console.log(`${collectionName}: Processing conflicts...`);
    for (const [id, localItem] of localMap.entries()) {
      const cloudItem = cloudMap.get(id);
      if (cloudItem) {
        try {
          // Validate ID again
          if (!isValidId(id)) {
            console.error(
              `Invalid ID found in conflict resolution for ${collectionName}: ${id}`
            );
            continue; // Skip this item
          }

          // Check if they're different
          const localUpdated = localItem.updatedAt
            ? new Date(localItem.updatedAt)
            : new Date(0);
          const cloudUpdated = cloudItem.updatedAt
            ? new Date(cloudItem.updatedAt)
            : new Date(0);

          if (localUpdated.getTime() !== cloudUpdated.getTime()) {
            result.conflicts++;
            console.log(`${collectionName}: Found conflict for item ${id}`);

            // Use the newer version
            if (localUpdated > cloudUpdated) {
              // Local is newer, upload it
              const itemToUpload = { ...localItem };

              try {
                const docRef = doc(db, collectionName, id);
                await setDoc(docRef, itemToUpload);
                console.log(
                  `${collectionName}: Resolved conflict (local newer) for item ${id}`
                );
                // Keep local version in final map (already there)
              } catch (uploadError) {
                console.error(
                  `Error creating document reference or uploading during conflict resolution for ${id} in ${collectionName}:`,
                  uploadError
                );
                throw uploadError; // Re-throw to be caught by outer try-catch
              }
            } else {
              // Cloud is newer, download it
              finalMap.set(id, cloudItem);
              console.log(
                `${collectionName}: Resolved conflict (cloud newer) for item ${id}`
              );
            }
            result.resolved++;
          }
        } catch (error) {
          console.error(
            `Error resolving conflict for item ${id} in ${collectionName}:`,
            error
          );
          // Continue with next item
        }
      }
    }

    // Update local storage with final data - convert map to array
    const finalItems = Array.from(finalMap.values());

    // Final validation before saving
    const validFinalItems = finalItems.filter((item) => {
      if (!item || !isValidId(item.id)) {
        console.warn(
          `Found invalid item in final result for ${collectionName}:`,
          item
        );
        return false;
      }
      return true;
    });

    if (validFinalItems.length !== finalItems.length) {
      console.warn(
        `Filtered out ${
          finalItems.length - validFinalItems.length
        } invalid items from final results of ${collectionName}`
      );
    }

    localStore.set(collectionName, validFinalItems);
    console.log(
      `${collectionName}: Saved ${validFinalItems.length} items to local storage`
    );

    console.log(`${collectionName} sync complete. Results:`, result);
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
  // Remove existing handlers first
  try {
    ipcMain.removeHandler("check-unsynced-data");
    ipcMain.removeHandler("perform-sync");
    ipcMain.removeHandler("get-last-sync-time");
  } catch (e) {
    // Ignore errors if handlers don't exist
  }

  // Set up new handlers that check db status first
  ipcMain.handle("check-unsynced-data", async () => {
    if (!db) {
      return {
        success: false,
        message: "Database not initialized yet. Please try again later.",
      };
    }
    return await checkUnsyncedData(db);
  });

  ipcMain.handle("perform-sync", async () => {
    if (!db) {
      return {
        success: false,
        message: "Database not initialized yet. Please try again later.",
      };
    }
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
