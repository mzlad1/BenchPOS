const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
} = require("firebase/firestore");
const { getAuth, signInAnonymously } = require("firebase/auth");
const ElectronStore = require("electron-store");
const localStore = new ElectronStore({ name: "shop-billing-local-data" });

// Your web app's Firebase configuration
// Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC6z4Ci0QvHlLtonZLDAlyJHH7Km0B_PI0",
  authDomain: "shop-d44bb.firebaseapp.com",
  projectId: "shop-d44bb",
  storageBucket: "shop-d44bb.firebasestorage.app",
  messagingSenderId: "624712206371",
  appId: "1:624712206371:web:3e93f2354ed96164804996",
};

// Check if the Firebase config has been updated
const isFirebaseConfigured = () => {
  return (
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID"
  );
};

// Initialize Firebase
let app;
let db;
let auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log("Firebase app initialized");
} catch (error) {
  console.error("Error initializing Firebase app:", error);
}

// Variables for tracking status
let isSyncing = false;
let isOnline = false;
let syncListeners = [];
let lastSyncTime = null;
let firebaseInitialized = false;

// Get last sync time
const getLastSyncTime = () => {
  return lastSyncTime;
};

// Initialize Firebase with offline persistence
const initializeFirebase = async () => {
  try {
    // Check if Firebase config has been updated from placeholder values
    if (!isFirebaseConfigured()) {
      console.error(
        "Firebase not properly configured. Please update the configuration in firebase.js"
      );
      return false;
    }

    // Check if app is initialized
    if (!app || !db || !auth) {
      console.error("Firebase app not initialized");
      return false;
    }

    // Enable offline persistence
    try {
      enableIndexedDbPersistence(db).catch((err) => {
        console.warn(
          `Persistence couldn't be enabled: ${err.code}. Using memory cache instead.`
        );
        // Continue without persistence - the app will still work
      });
      console.log("Attempting to enable offline persistence");
    } catch (err) {
      if (err.code === "failed-precondition") {
        console.warn(
          "Multiple tabs open, persistence can only be enabled in one tab at a time."
        );
      } else if (err.code === "unimplemented") {
        console.warn(
          "The current browser does not support offline persistence."
        );
      } else {
        console.error("Error enabling offline persistence:", err);
      }
    }

    // Handle authentication
    try {
      // Check if auth is initialized before trying to sign in
      if (auth) {
        await signInAnonymously(auth).catch((err) => {
          console.warn(
            "Anonymous auth failed, continuing without authentication:",
            err.message
          );
          // Don't fail the whole initialization process for this
        });
        console.log("Signed in anonymously or continued without auth");
      } else {
        console.warn("Auth not initialized, continuing without authentication");
      }
    } catch (err) {
      console.error("Error in auth process:", err);
      // Don't fail the whole initialization for auth issues
    }

    // Consider initialization successful even if some parts fail
    firebaseInitialized = true;
    console.log("Firebase initialized with best available features");
    return true;
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    return false;
  }
};

// Update online status
const updateOnlineStatus = (status) => {
  isOnline = status;
  notifySyncListeners();
};

// Register for sync status updates
const registerSyncListener = (callback) => {
  syncListeners.push(callback);
  return () => {
    syncListeners = syncListeners.filter((listener) => listener !== callback);
  };
};

// Notify listeners of sync status changes
const notifySyncListeners = () => {
  const status = {
    isOnline,
    isSyncing,
    lastSyncTime,
  };

  syncListeners.forEach((listener) => listener(status));
};

// Sync data between Firebase and local storage
const syncData = async () => {
  if (!isOnline || isSyncing || !firebaseInitialized) return;

  isSyncing = true;
  notifySyncListeners();

  try {
    // Sync products
    await syncCollection("products");

    // Sync invoices
    await syncCollection("invoices");

    lastSyncTime = new Date().toISOString();
    console.log("Data sync completed at", lastSyncTime);
    return true;
  } catch (error) {
    console.error("Error syncing data:", error);
    return false;
  } finally {
    isSyncing = false;
    notifySyncListeners();
  }
};

// Sync a specific collection between Firebase and local storage
const syncCollection = async (collectionName) => {
  try {
    if (!isFirebaseConfigured()) {
      console.error(
        `Cannot sync ${collectionName}: Firebase not properly configured`
      );
      return false;
    }

    if (!firebaseInitialized) {
      console.error(`Cannot sync ${collectionName}: Firebase not initialized`);
      return false;
    }

    console.log(`Starting sync for collection: ${collectionName}`);

    // Get local data
    const localData = localStore.get(collectionName) || [];
    console.log(`Local ${collectionName} count:`, localData.length);

    // Get cloud data
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const cloudData = querySnapshot.docs.map((doc) => doc.data());
      console.log(`Cloud ${collectionName} count:`, cloudData.length);

      // Create a map for easier comparison
      const localMap = new Map(localData.map((item) => [item.id, item]));
      const cloudMap = new Map(cloudData.map((item) => [item.id, item]));

      // Items that only exist locally (need to be uploaded)
      const localOnlyItems = localData.filter((item) => !cloudMap.has(item.id));

      // Items that only exist in cloud (need to be downloaded)
      const cloudOnlyItems = cloudData.filter((item) => !localMap.has(item.id));

      // Items that exist in both places (need field-level merging)
      const itemsInBoth = localData.filter((item) => cloudMap.has(item.id));

      console.log(
        `${localOnlyItems.length} items to upload, ${cloudOnlyItems.length} items to download, ${itemsInBoth.length} items to merge`
      );

      // Upload items that only exist locally
      for (const item of localOnlyItems) {
        try {
          await setDoc(doc(db, collectionName, item.id), item);
          console.log(`Uploaded new ${collectionName} item:`, item.id);
        } catch (error) {
          console.error(`Error uploading ${collectionName}/${item.id}:`, error);
        }
      }

      // Download items that only exist in cloud
      for (const item of cloudOnlyItems) {
        localMap.set(item.id, item);
        console.log(`Downloaded new ${collectionName} item:`, item.id);
      }

      // Merge items that exist in both places
      for (const localItem of itemsInBoth) {
        const cloudItem = cloudMap.get(localItem.id);

        // Create a merged item with the latest version of each field
        const mergedItem = { ...localItem }; // Start with local copy

        // Loop through all fields from cloud item
        for (const [key, value] of Object.entries(cloudItem)) {
          // Skip id field
          if (key === "id") continue;

          // Use cloud value if:
          // 1. Field doesn't exist locally, or
          // 2. Cloud version is newer
          if (
            // Field doesn't exist locally
            localItem[key] === undefined ||
            // Cloud update is newer than local update
            (cloudItem.updatedAt &&
              localItem.updatedAt &&
              new Date(cloudItem.updatedAt) > new Date(localItem.updatedAt))
          ) {
            mergedItem[key] = value;
          }
        }

        // Update both cloud and local with merged item
        try {
          // Add a timestamp for this merge
          mergedItem.updatedAt = new Date().toISOString();

          // Update in Firestore
          await setDoc(doc(db, collectionName, mergedItem.id), mergedItem);

          // Update in local map for later storage update
          localMap.set(mergedItem.id, mergedItem);

          console.log(`Merged ${collectionName} item:`, mergedItem.id);
        } catch (error) {
          console.error(
            `Error merging ${collectionName}/${mergedItem.id}:`,
            error
          );
        }
      }

      // Save all updated data to local storage
      localStore.set(collectionName, Array.from(localMap.values()));
      console.log(`Sync completed for ${collectionName}`);

      return true;
    } catch (error) {
      console.error(`Error getting cloud data for ${collectionName}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`Error syncing ${collectionName}:`, error);
    return false;
  }
};
const lockItem = async (collectionName, itemId, userId) => {
  try {
    const lockRef = doc(db, "locks", `${collectionName}_${itemId}`);
    const lockSnap = await getDoc(lockRef);

    if (lockSnap.exists()) {
      const lock = lockSnap.data();
      // If lock is older than 5 minutes, consider it stale
      if (lock.userId !== userId && Date.now() - lock.timestamp < 300000) {
        return { success: false, lockedBy: lock.userName };
      }
    }

    // Set new lock
    await setDoc(lockRef, {
      userId: userId,
      userName: userName,
      timestamp: Date.now(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error locking item:", error);
    return { success: true }; // Fall back to local mode if locking fails
  }
};

const unlockItem = async (collectionName, itemId, userId) => {
  try {
    const lockRef = doc(db, "locks", `${collectionName}_${itemId}`);
    const lockSnap = await getDoc(lockRef);

    if (lockSnap.exists()) {
      const lock = lockSnap.data();
      if (lock.userId === userId) {
        await deleteDoc(lockRef);
      }
    }
  } catch (error) {
    console.error("Error unlocking item:", error);
  }
};

const logTransaction = async (action, collection, itemId, userId, data) => {
  try {
    if (!isOnline) return; // Only log when online

    const transactionId = Date.now().toString();
    await setDoc(doc(db, "transaction_log", transactionId), {
      action,
      collection,
      itemId,
      userId,
      userName: localStorage.getItem("user_name") || "Unknown User",
      device: localStorage.getItem("device_name") || require("os").hostname(),
      timestamp: Date.now(),
      data: data,
    });
  } catch (error) {
    console.error("Error logging transaction:", error);
  }
};

const subscribeToCollection = (collectionName, callback) => {
  if (!isOnline || !firebaseInitialized) {
    return () => {}; // Return empty unsubscribe function
  }

  try {
    const q = collection(db, collectionName);
    return onSnapshot(q, (snapshot) => {
      const changes = [];
      snapshot.docChanges().forEach((change) => {
        changes.push({
          type: change.type,
          id: change.doc.id,
          data: change.doc.data(),
        });
      });

      callback(changes);
    });
  } catch (error) {
    console.error(`Error subscribing to ${collectionName}:`, error);
    return () => {};
  }
};
// CRUD Operations that work with both online and offline modes

// Get all items from a collection
const getAll = async (collectionName) => {
  try {
    const items = localStore.get(collectionName) || [];
    return items;
  } catch (error) {
    console.error(`Error getting ${collectionName}:`, error);
    return [];
  }
};

// Get a single item by ID
const getById = async (collectionName, id) => {
  try {
    const items = localStore.get(collectionName) || [];
    return items.find((item) => item.id === id);
  } catch (error) {
    console.error(`Error getting ${collectionName} item:`, error);
    return null;
  }
};

// Add a new item
const add = async (collectionName, item) => {
  try {
    if (!isFirebaseConfigured()) {
      throw new Error("Firebase not properly configured");
    }

    if (!firebaseInitialized) {
      throw new Error("Firebase not initialized");
    }

    // Ensure item has ID and timestamps
    const newItem = {
      ...item,
      id: item.id || Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to local storage
    const items = localStore.get(collectionName) || [];
    items.push(newItem);
    localStore.set(collectionName, items);

    // If online, add to Firestore
    if (isOnline) {
      try {
        console.log(`Adding ${collectionName} item to Firestore:`, newItem.id);
        await setDoc(doc(db, collectionName, newItem.id), newItem);
        console.log(
          `Successfully added to Firestore: ${collectionName}/${newItem.id}`
        );
      } catch (firestoreError) {
        console.error(
          `Error adding to Firestore: ${collectionName}/${newItem.id}`,
          firestoreError
        );
        // Still return success since we saved locally
      }
    }

    return newItem.id;
  } catch (error) {
    console.error(`Error adding ${collectionName} item:`, error);
    throw error;
  }
};

// Update an existing item
const update = async (collectionName, item) => {
  try {
    // Ensure item has timestamp
    const updatedItem = {
      ...item,
      updatedAt: new Date().toISOString(),
    };

    // Update in local storage
    const items = localStore.get(collectionName) || [];
    const index = items.findIndex((i) => i.id === item.id);

    if (index >= 0) {
      items[index] = updatedItem;
      localStore.set(collectionName, items);

      // If online, update in Firestore
      if (isOnline) {
        await setDoc(doc(db, collectionName, updatedItem.id), updatedItem);
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error updating ${collectionName} item:`, error);
    return false;
  }
};

// Delete an item
const remove = async (collectionName, id) => {
  try {
    // Remove from local storage
    const items = localStore.get(collectionName) || [];
    const newItems = items.filter((item) => item.id !== id);

    if (newItems.length !== items.length) {
      localStore.set(collectionName, newItems);

      // If online, remove from Firestore
      if (isOnline) {
        await deleteDoc(doc(db, collectionName, id));
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error removing ${collectionName} item:`, error);
    return false;
  }
};

// Create invoice with special handling for product stock
const createInvoice = async (invoice) => {
  try {
    // Ensure invoice has ID and timestamps
    const newInvoice = {
      ...invoice,
      id: invoice.id || Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: invoice.status || "completed",
    };

    // Add to local storage
    const invoices = localStore.get("invoices") || [];
    invoices.push(newInvoice);
    localStore.set("invoices", invoices);

    // Update product stock
    if (invoice.items && invoice.items.length > 0) {
      const products = localStore.get("products") || [];

      invoice.items.forEach((item) => {
        const productIndex = products.findIndex((p) => p.id === item.id);
        if (productIndex !== -1) {
          products[productIndex].stock -= item.quantity;
          if (products[productIndex].stock < 0) {
            products[productIndex].stock = 0;
          }
          products[productIndex].updatedAt = new Date().toISOString();
        }
      });

      localStore.set("products", products);

      // If online, update products in Firestore
      if (isOnline) {
        for (const product of products.filter((p) =>
          invoice.items.some((item) => item.id === p.id)
        )) {
          await setDoc(doc(db, "products", product.id), product);
        }
      }
    }

    // If online, add to Firestore
    if (isOnline) {
      await setDoc(doc(db, "invoices", newInvoice.id), newInvoice);
    }

    return newInvoice.id;
  } catch (error) {
    console.error(`Error creating invoice:`, error);
    return null;
  }
};

module.exports = {
  initializeFirebase,
  updateOnlineStatus,
  registerSyncListener,
  syncData,
  getAll,
  getById,
  add,
  update,
  remove,
  createInvoice,
  getLastSyncTime,
  isFirebaseConfigured,
};
