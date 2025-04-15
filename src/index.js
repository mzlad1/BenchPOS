const Chart = require("chart.js/auto");
const { app, BrowserWindow, ipcMain, Menu, screen } = require("electron");
const path = require("path");
const { collection, query, where, getDocs } = require("firebase/firestore");
const fs = require("fs");
const Store = require("electron-store");
const { doc, getDoc, deleteDoc, setDoc } = require("firebase/firestore");
const https = require("https");
const localStore = new Store({
  name: "shop-billing-local-data",
});
// Load database service
let dbService = null;
// Variables for tracking status
let isOnline = false;
let db = null;
try {
  dbService = require(path.join(__dirname, "scripts", "database"));
  console.log("Database service loaded successfully");
  // Make the db variable available to other modules
  db = dbService.db;
} catch (error) {
  console.error("Failed to load database service:", error);
  // Create a dummy service
  dbService = {
    db: null,
    addProduct: async (product) => product.id || Date.now().toString(),
    getProducts: async () => [],
    createInvoice: async (invoice) => invoice.id || Date.now().toString(),
    getInvoices: async () => [],
  };
}
// Initialize Firebase service
let firebaseService = null;
try {
  firebaseService = require("./services/firebase");
  console.log("Firebase service loaded successfully");
} catch (error) {
  console.error("Failed to load Firebase service:", error);

  // Create a dummy service to avoid crashes
  firebaseService = {
    initializeFirebase: async () => false,
    updateOnlineStatus: () => {},
    syncData: async () => false,
    getAll: async () => [],
    getById: async () => null,
    add: async (_, item) => item.id || Date.now().toString(),
    update: async () => false,
    remove: async () => false,
    createInvoice: async (invoice) => invoice.id || Date.now().toString(),
    getLastSyncTime: () => null,
  };
}

// Add near the top where you initialize services (around line 100)

// Create a global auth request handler that firebase.js can use
global.requestFirebaseAuth = async () => {
  return new Promise((resolve) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.log("No window available for auth request");
      resolve({ success: false, message: "No window available" });
      return;
    }

    // Generate a unique callback channel with timestamp and random value for uniqueness
    const callbackChannel = `firebase-auth-callback-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    console.log(
      "🔑 Setting up auth callback handler for channel:",
      callbackChannel
    );

    // Set up a one-time handler with more robust error handling
    ipcMain.handleOnce(callbackChannel, async (event, credentials) => {
      console.log(
        "Received auth callback response:",
        credentials ? "has credentials" : "no credentials"
      );

      if (!credentials || !credentials.email) {
        console.log("No valid credentials provided, auth failed");
        resolve({ success: false, message: "No valid credentials provided" });
        return { success: false };
      }

      try {
        // Add a debugging log to verify the auth object is available
        let auth;
        try {
          const { auth: firebaseAuth } = require("./services/firebase-core");
          auth = firebaseAuth;
        } catch (error) {
          console.error("Failed to import Firebase auth:", error);
          resolve({
            success: false,
            message: "Firebase auth module not available",
          });
          return { success: false };
        }

        if (!auth) {
          console.error("Firebase auth object is not available!");
          resolve({
            success: false,
            message: "Firebase not properly initialized",
          });
          return { success: false };
        }

        console.log(
          "Attempting Firebase sign in with email:",
          credentials.email
        );

        let signInWithEmailAndPassword;
        try {
          const authModule = require("firebase/auth");
          signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
        } catch (error) {
          console.error("Failed to import signInWithEmailAndPassword:", error);
          resolve({
            success: false,
            message: "Firebase auth method not available",
          });
          return { success: false };
        }

        const userCredential = await signInWithEmailAndPassword(
          auth,
          credentials.email,
          credentials.password
        );

        console.log("✅ Firebase auth successful:", userCredential.user.email);
        resolve({ success: true, user: userCredential.user });
        return { success: true };
      } catch (error) {
        console.error("❌ Firebase auth error:", error.code, error.message);
        resolve({ success: false, error: error.message });
        return { success: false, error: error.message };
      }
    });

    // Send the request to the renderer with timeout handling
    console.log(
      "📤 Sending auth request to renderer with channel:",
      callbackChannel
    );

    // Before sending the request, ensure we're ready to receive the response
    setTimeout(() => {
      mainWindow.webContents.send("request-firebase-auth", callbackChannel);
    }, 100);

    // Set a shorter timeout to improve user experience (20 seconds)
    setTimeout(() => {
      console.log("⏰ Firebase auth request timed out after 20 seconds");
      ipcMain.removeHandler(callbackChannel); // Clean up the handler
      resolve({ success: false, message: "Authentication timed out" });
    }, 20000);
  });
};

// Initialize sync service
let syncService = null;
try {
  syncService = require("./services/simplified-sync");
  console.log("Sync service loaded successfully");
} catch (error) {
  console.error("Failed to load sync service:", error);

  // Create a dummy service to avoid crashes
  syncService = {
    updateOnlineStatus: () => false,
    checkUnsyncedData: async () => ({
      success: false,
      message: "Service not available",
    }),
    performSync: async () => ({
      success: false,
      message: "Service not available",
    }),
    getLastSyncTime: () => null,
    setupIpcHandlers: () => {},
  };
}

// Load auth service
let authService = null;
try {
  authService = require("./services/auth");
  console.log("Auth service loaded successfully");
} catch (error) {
  console.error("Failed to load auth service:", error);

  // Create a dummy service to avoid crashes
  authService = {
    loginUser: async () => ({
      success: false,
      message: "Authentication service not available",
    }),
    registerUser: async () => ({
      success: false,
      message: "Authentication service not available",
    }),
    getCurrentUser: () => null,
    logoutUser: async () => ({ success: true }),
    checkPermission: () => false,
  };
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling
try {
  if (require("electron-squirrel-startup")) {
    app.quit();
  }
} catch (error) {
  console.log(
    "Electron-squirrel-startup not available, skipping Windows install events handling"
  );
}

// Add this in your app initialization
// if (process.env.NODE_ENV !== "development") {
Menu.setApplicationMenu(null);
// }

let mainWindow;
const isDev = process.env.NODE_ENV === "development";
const createWindow = () => {
  // Force development mode for local coding
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "production";
    console.log("Development mode forced for local coding");
  }

  // Create the browser window
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
      allowRunningInsecureContent: false,
      worldSafeExecuteJavaScript: true,
      enableRemoteModule: false,
      devTools: true, // Temporarily enable devTools regardless of environment
    },
  });
  // Maximize the window
  mainWindow.maximize();
  // Set Content-Security-Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline'; " +
              "style-src 'self' 'unsafe-inline' https://*.cloudflare.com https://*.googleapis.com; " +
              "font-src 'self' https://*.gstatic.com https://*.cloudflare.com data: https://*.fontawesome.com; " +
              "connect-src 'self'; " +
              "img-src 'self' data:;",
          ],
        },
      });
    }
  );

  // Load the login page first
  mainWindow.loadFile(path.join(__dirname, "./views/login.html"));

  // // Only open dev tools in development mode
  // if (process.env.NODE_ENV === "development") {
  //   mainWindow.webContents.openDevTools();
  // }

  // Add this after creating the window
  mainWindow.webContents.on("context-menu", (event, params) => {
    // Only allow context menu in development mode
    if (process.env.NODE_ENV !== "development") {
      event.preventDefault();
    }
  });

  // Add this after creating the window
  if (process.env.NODE_ENV !== "development") {
    mainWindow.webContents.on("before-input-event", (event, input) => {
      // Block F12 key
      if (input.key === "F12") {
        event.preventDefault();
      }

      // Block Ctrl+Shift+I, Cmd+Option+I
      if ((input.control || input.meta) && input.shift && input.key === "i") {
        event.preventDefault();
      }

      // Block Ctrl+Shift+C, Cmd+Option+C
      if ((input.control || input.meta) && input.shift && input.key === "c") {
        event.preventDefault();
      }
    });
  }

  if (syncService) {
    syncService.setupIpcHandlers(null); // Initially pass null
  }

  // Set the minimal menu
  const mainMenu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(mainMenu); // Set to null for minimal menu
  // Check online status
  checkOnlineStatus();

  // Initialize Firebase if available
  if (
    firebaseService &&
    typeof firebaseService.initializeFirebase === "function"
  ) {
    initializeFirebase();
  } else {
    console.log("Firebase service not available, running in local-only mode");
  }
};
/**
 * Verify Firebase is properly initialized
 * @returns {Promise<boolean>} Whether Firebase is properly initialized
 */
async function verifyFirebaseSetup() {
  try {
    console.log("Verifying Firebase setup...");

    // Import your Firebase core module
    const firebaseCore = require("./services/firebase-core");

    // Check if Firebase is configured
    if (!firebaseCore.isFirebaseConfigured()) {
      console.error("Firebase is not properly configured!");
      return false;
    }

    // Check if Firebase app is initialized
    if (!firebaseCore.app) {
      console.error("Firebase app is not initialized!");
      return false;
    }

    // Check if Firebase auth is initialized
    if (!firebaseCore.auth) {
      console.error("Firebase auth is not initialized!");
      return false;
    }

    // Check if Firebase Firestore is initialized
    if (!firebaseCore.db) {
      console.error("Firebase Firestore is not initialized!");
      return false;
    }

    // All checks passed!
    console.log("✅ Firebase is properly initialized!");
    return true;
  } catch (error) {
    console.error("Error verifying Firebase setup:", error);
    return false;
  }
}
app.on("ready", async () => {
  console.log("App is ready, creating window...");
  createWindow();

  // Initialize Firebase directly here, remove from createWindow()
  if (
    firebaseService &&
    typeof firebaseService.initializeFirebase === "function"
  ) {
    const result = await initializeFirebase();
    console.log("Firebase initialization result:", result);

    // Set database from either Firebase auth module or direct database service
    if (result) {
      // Try to get db from auth module first
      try {
        const authModule = require("./services/auth");
        db = authModule.db || dbService.db;
      } catch (error) {
        // Fall back to database service
        db = dbService.db;
      }
    }

    // Only set up sync handlers if we have a valid database
    if (db && syncService) {
      syncService.setupIpcHandlers(db);
    } else {
      console.warn(
        "Database not available, sync functionality will be limited"
      );
    }
  }
});

// Check online status
const checkOnlineStatus = () => {
  try {
    // Function to check connectivity by trying to fetch a small resource
    const checkConnection = () => {
      return new Promise((resolve) => {
        // Try multiple URLs in case one is blocked
        const urls = [
          "https://www.google.com/favicon.ico",
          "https://www.microsoft.com/favicon.ico",
          "https://www.apple.com/favicon.ico",
        ];

        let completed = false;

        // Try each URL
        urls.forEach((url) => {
          if (completed) return;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          fetch(url, {
            method: "HEAD",
            mode: "no-cors",
            signal: controller.signal,
            cache: "no-store", // Prevent caching
          })
            .then(() => {
              if (!completed) {
                clearTimeout(timeoutId);
                completed = true;
                resolve(true);
              }
            })
            .catch((error) => {
              clearTimeout(timeoutId);
              console.log(`Connection test failed for ${url}:`, error.message);
              // Only resolve as false if all URLs have been tried
              if (url === urls[urls.length - 1] && !completed) {
                completed = true;
                resolve(false);
              }
            });
        });

        // Fallback - resolve as offline after 5 seconds if no response
        setTimeout(() => {
          if (!completed) {
            completed = true;
            console.log("Connection test timed out");
            resolve(false);
          }
        }, 5000);
      });
    };

    // Initial check
    checkConnection().then((online) => {
      isOnline = online;
      console.log(`Connection status: ${isOnline ? "Online" : "Offline"}`);

      // Update services with online status
      if (
        firebaseService &&
        typeof firebaseService.updateOnlineStatus === "function"
      ) {
        firebaseService.updateOnlineStatus(isOnline);
      }

      if (syncService) {
        syncService.updateOnlineStatus(isOnline);
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("online-status-changed", isOnline);
      }
    });

    // Set up periodic checking
    setInterval(() => {
      checkConnection().then((online) => {
        if (isOnline !== online) {
          isOnline = online;
          console.log(
            `Connection status changed: ${isOnline ? "Online" : "Offline"}`
          );

          if (
            firebaseService &&
            typeof firebaseService.updateOnlineStatus === "function"
          ) {
            firebaseService.updateOnlineStatus(isOnline);
          }

          if (syncService) {
            syncService.updateOnlineStatus(isOnline);
          }

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("online-status-changed", isOnline);

            // If going online, sync data
            if (
              isOnline &&
              firebaseService &&
              typeof firebaseService.syncData === "function"
            ) {
              firebaseService.syncData();
            }
          }
        }
      });
    }, 30000); // Check every 30 seconds
  } catch (error) {
    console.error("Error checking online status:", error);
    isOnline = false;
  }
};

// Initialize Firebase
const initializeFirebase = async () => {
  try {
    if (
      firebaseService &&
      typeof firebaseService.initializeFirebase === "function"
    ) {
      console.log("Initializing Firebase...");
      const result = await firebaseService.initializeFirebase();
      console.log("Firebase initialization result:", result);

      // Add this line to initialize the db variable
      if (result) {
        // Import db from auth module after initialization is complete
        const authModule = require("./services/auth");
        db = authModule.db || null;

        // Now set up the sync service with the real db
        if (syncService) {
          syncService.setupIpcHandlers(db);
        }
      }

      if (result && isOnline) {
        // Initial sync if online
        console.log("Attempting initial data sync...");
        const syncResult = await firebaseService.syncData();
        console.log("Initial sync result:", syncResult);
      }
      return result;
    } else {
      console.log(
        "Firebase service not available or initialization method missing"
      );
      return false;
    }
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    return false;
  }
};

// Menu template
const menuTemplate = [
  {
    label: "File",
    submenu: [
      {
        label: "New Invoice",
        accelerator: process.platform === "darwin" ? "Command+N" : "Ctrl+N",
        click() {
          mainWindow.loadFile(path.join(__dirname, "views/billing.html"));
        },
      },
      {
        label: "Inventory",
        accelerator: process.platform === "darwin" ? "Command+I" : "Ctrl+I",
        click() {
          mainWindow.loadFile(path.join(__dirname, "views/inventory.html"));
        },
      },
      {
        label: "Reports",
        accelerator: process.platform === "darwin" ? "Command+R" : "Ctrl+R",
        click() {
          mainWindow.loadFile(path.join(__dirname, "views/reports.html"));
        },
      },
      {
        type: "separator",
      },
      {
        label: "Exit",
        accelerator: process.platform === "darwin" ? "Command+Q" : "Ctrl+Q",
        click() {
          app.quit();
        },
      },
    ],
  },
];

if (process.env.NODE_ENV !== "production") {
  menuTemplate.push({
    label: "Developer Tools",
    submenu: [
      {
        label: "Toggle DevTools",
        accelerator:
          process.platform === "darwin" ? "Command+Alt+I" : "Ctrl+Shift+I",
        click(item, focusedWindow) {
          focusedWindow.toggleDevTools();
        },
      },
      {
        role: "reload",
      },
    ],
  });
}

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Initialize local storage
if (!localStore.has("invoices")) {
  localStore.set("invoices", []);
}

if (!localStore.has("products")) {
  localStore.set("products", []);
}

// Set up IPC handlers
setupIpcHandlers();

function setupIpcHandlers() {
  // Online status and sync handlers

  ipcMain.handle("check-online-status", async () => {
    return new Promise((resolve) => {
      const request = https.get(
        "https://www.google.com",
        {
          timeout: 5000,
        },
        (res) => {
          resolve(true);
        }
      );

      request.on("error", (err) => {
        console.error("Network check failed:", err);
        resolve(false);
      });

      request.on("timeout", () => {
        request.destroy();
        resolve(false);
      });
    });
  });

  ipcMain.handle("get-online-status", () => {
    console.log("Main process: get-online-status called, returning:", isOnline);
    return isOnline;
  });

  ipcMain.handle("sync-data", async () => {
    console.log("IPC: sync-data called, online status:", isOnline);
    if (!isOnline) {
      console.log("Not online, cannot sync");
      return { success: false, message: "Device is offline" };
    }

    try {
      if (firebaseService && typeof firebaseService.syncData === "function") {
        console.log("Calling firebaseService.syncData()");
        const result = await firebaseService.syncData();
        console.log("Sync result:", result);
        return result;
      } else {
        console.log("Firebase sync not available, running in local-only mode");
        return { success: false, message: "Sync service not available" };
      }
    } catch (error) {
      console.error("Error during sync:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("get-last-sync-time", () => {
    console.log("IPC: get-last-sync-time called");
    if (
      firebaseService &&
      typeof firebaseService.getLastSyncTime === "function"
    ) {
      const time = firebaseService.getLastSyncTime();
      console.log("Last sync time:", time);
      return time;
    } else {
      console.log("Firebase getLastSyncTime not available");
      return null;
    }
  });

  ipcMain.handle("get-user-by-id", async (event, userId) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return null;
      }
      return { id: userSnap.id, ...userSnap.data() };
    } catch (error) {
      console.error("Error in get-user-by-id:", error);
      throw error;
    }
  });

  ipcMain.handle("update-user", async (event, userData) => {
    try {
      // Use authService.updateUser instead of directly using setDoc
      return await authService.updateUser(userData);
    } catch (error) {
      console.error("Error in update-user:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("delete-user", async (event, userId) => {
    try {
      // Use authService.deleteUser instead of deleteDoc
      return await authService.deleteUser(userId);
    } catch (error) {
      console.error("Error in delete-user:", error);
      return { success: false, message: error.message };
    }
  });

  // Check unsynced data
  ipcMain.handle("check-unsynced-data", async () => {
    if (syncService && db) {
      return await syncService.checkUnsyncedData(db);
    } else {
      return {
        success: false,
        message: "Sync service or database not available",
      };
    }
  });

  // Perform manual sync
  ipcMain.handle("perform-sync", async () => {
    if (syncService && db) {
      const result = await syncService.performSync(db);

      // Notify renderer of the result
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("sync-completed", result);
      }

      return result;
    } else {
      return {
        success: false,
        message: "Sync service or database not available",
      };
    }
  });

  // Product management
  ipcMain.handle("add-product", async (event, product) => {
    try {
      if (firebaseService && typeof firebaseService.add === "function") {
        return await firebaseService.add("products", product);
      } else {
        throw new Error("Firebase service not available");
      }
    } catch (error) {
      console.log("Using local storage for add-product:", error.message);

      // Fallback to local storage
      const products = localStore.get("products") || [];
      const newProduct = {
        ...product,
        id: product.id || Date.now().toString(),
        updatedAt: new Date().toISOString(),
      };

      products.push(newProduct);
      localStore.set("products", products);

      return newProduct.id;
    }
  });

  ipcMain.handle("get-products", async (event, options = {}) => {
    try {
      const { page = 1, pageSize = 0, filters = {} } = options;

      if (firebaseService && typeof firebaseService.getAll === "function") {
        // If pageSize is 0, get all products (backward compatibility)
        if (pageSize === 0) {
          return await firebaseService.getAll("products");
        }

        // Otherwise use the new paginated method
        return await firebaseService.getPagedProducts(
          "products",
          page,
          pageSize,
          filters
        );
      } else {
        throw new Error("Firebase service not available");
      }
    } catch (error) {
      console.log("Using local storage for get-products:", error.message);

      // For local storage, we'll implement pagination manually
      let products = localStore.get("products") || [];

      // Apply filters if provided
      if (options && options.filters) {
        const filters = options.filters;
        if (filters.category) {
          products = products.filter((p) => p.category === filters.category);
        }
        if (filters.search) {
          const search = filters.search.toLowerCase();
          products = products.filter(
            (p) =>
              p.name?.toLowerCase().includes(search) ||
              p.sku?.toLowerCase().includes(search)
          );
        }
      }

      // Apply pagination if requested
      if (options && options.page && options.pageSize) {
        const startIdx = (options.page - 1) * options.pageSize;
        const endIdx = startIdx + options.pageSize;

        return {
          items: products.slice(startIdx, endIdx),
          totalCount: products.length,
          page: options.page,
          totalPages: Math.ceil(products.length / options.pageSize),
        };
      }

      // Otherwise return all products
      return products;
    }
  });
  ipcMain.handle("diagnoseFBAuth", async (event, email) => {
    try {
      const { diagnoseFBAuth } = require("./services/auth");
      return await diagnoseFBAuth(email);
    } catch (error) {
      console.error("Error in diagnoseFBAuth:", error);
      return { error: error.message };
    }
  });

  ipcMain.handle("getFirebaseConfig", async () => {
    try {
      const { getConfig } = require("./services/firebase-core");
      return getConfig();
    } catch (error) {
      console.error("Error getting Firebase config:", error);
      return { error: error.message };
    }
  });
  ipcMain.handle("update-product", async (event, product) => {
    try {
      if (firebaseService && typeof firebaseService.update === "function") {
        return await firebaseService.update("products", product);
      } else {
        throw new Error("Firebase service not available");
      }
    } catch (error) {
      console.log("Using local storage for update-product:", error.message);

      // Fallback to local storage
      const products = localStore.get("products") || [];
      const index = products.findIndex((p) => p.id === product.id);

      if (index !== -1) {
        products[index] = {
          ...products[index],
          ...product,
          updatedAt: new Date().toISOString(),
        };

        localStore.set("products", products);
        return true;
      }

      return false;
    }
  });

  ipcMain.handle("send-password-reset", async (event, email) => {
    try {
      console.log("Main process: Handling send-password-reset for", email);

      // Call the sendPasswordReset function from Firebase service
      if (
        firebaseService &&
        typeof firebaseService.sendPasswordReset === "function"
      ) {
        return await firebaseService.sendPasswordReset(email);
      } else {
        console.error("Firebase password reset service not available");
        return {
          success: false,
          message: "Password reset service is not available",
        };
      }
    } catch (error) {
      console.error("Error in send-password-reset handler:", error);
      return {
        success: false,
        message: "An error occurred. Please try again.",
      };
    }
  });

  ipcMain.handle("delete-product", async (event, productId) => {
    try {
      if (firebaseService && typeof firebaseService.remove === "function") {
        return await firebaseService.remove("products", productId);
      } else {
        throw new Error("Firebase service not available");
      }
    } catch (error) {
      console.log("Using local storage for delete-product:", error.message);

      // Fallback to local storage
      const products = localStore.get("products") || [];
      const newProducts = products.filter((p) => p.id !== productId);

      if (newProducts.length !== products.length) {
        localStore.set("products", newProducts);
        return true;
      }

      return false;
    }
  });

  // Invoice management
  ipcMain.handle("create-invoice", async (event, invoice) => {
    try {
      if (
        firebaseService &&
        typeof firebaseService.createInvoice === "function"
      ) {
        return await firebaseService.createInvoice(invoice);
      } else {
        throw new Error("Firebase service not available");
      }
    } catch (error) {
      console.log("Using local storage for create-invoice:", error.message);

      // Fallback to local storage
      const invoices = localStore.get("invoices") || [];
      const newInvoice = {
        ...invoice,
        id: invoice.id || Date.now().toString(),
        createdAt: new Date().toISOString(),
        status: invoice.status || "completed",
      };

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
          }
        });

        localStore.set("products", products);
      }

      return newInvoice.id;
    }
  });

  ipcMain.handle("get-invoices", async () => {
    try {
      if (firebaseService && typeof firebaseService.getAll === "function") {
        return await firebaseService.getAll("invoices");
      } else {
        throw new Error("Firebase service not available");
      }
    } catch (error) {
      console.log("Using local storage for get-invoices:", error.message);
      return localStore.get("invoices") || [];
    }
  });

  ipcMain.handle("update-invoice", async (event, invoice) => {
    try {
      if (firebaseService && typeof firebaseService.update === "function") {
        return await firebaseService.update("invoices", invoice);
      } else {
        throw new Error("Firebase service not available");
      }
    } catch (error) {
      console.log("Using local storage for update-invoice:", error.message);

      // Fallback to local storage
      const invoices = localStore.get("invoices") || [];
      const index = invoices.findIndex((inv) => inv.id === invoice.id);

      if (index !== -1) {
        invoices[index] = {
          ...invoices[index],
          ...invoice,
          updatedAt: new Date().toISOString(),
        };

        localStore.set("invoices", invoices);
        return true;
      }

      return false;
    }
  });

  // Authentication handlers
  ipcMain.handle("login-user", async (event, credentials) => {
    try {
      // Log the login attempt with redacted password
      console.log(
        `Login attempt for: ${credentials.email}, online: ${isOnline}`
      );

      // Add online status to credentials
      credentials.isOnline = isOnline;

      const result = await authService.loginUser(credentials);

      // Log the result (without sensitive data)
      console.log(
        `Login result success: ${result.success}, message: ${
          result.message || "No message"
        }`
      );

      if (result.success) {
        // Success handling...
      } else {
        console.warn("Login failed:", result.message);
      }

      return result;
    } catch (error) {
      console.error("Error during login:", error);
      // Return the actual error message to help with debugging
      return {
        success: false,
        message: `Authentication error: ${error.message}`,
      };
    }
  });

  ipcMain.handle("register-user", async (event, userData) => {
    try {
      return await authService.registerUser(userData);
    } catch (error) {
      console.error("Error during registration:", error);
      return { success: false, message: "Registration error" };
    }
  });

  ipcMain.handle("get-current-user", () => {
    try {
      return authService.getCurrentUser();
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  });

  ipcMain.handle("logout-user", async () => {
    try {
      return await authService.logoutUser();
    } catch (error) {
      console.error("Error during logout:", error);
      return { success: false, message: "Logout error" };
    }
  });

  ipcMain.handle("check-permission", (event, permission) => {
    try {
      return authService.checkPermission(permission);
    } catch (error) {
      console.error("Error checking permission:", error);
      return false;
    }
  });

  // Receipt printing
  ipcMain.handle("print-receipt", async (event, invoiceData) => {
    const receiptPath = path.join(
      app.getPath("temp"),
      `receipt-${invoiceData.id}.pdf`
    );

    const printWindow = new BrowserWindow({
      width: 400,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
      },
    });

    await printWindow.loadFile(
      path.join(__dirname, "views/receipt-template.html")
    );
    await printWindow.webContents.executeJavaScript(`
      document.getElementById('receipt-container').innerHTML = ${JSON.stringify(
        invoiceData.receiptHtml
      )};
    `);

    const pdfData = await printWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: "A4",
      margins: {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
      },
    });

    fs.writeFileSync(receiptPath, pdfData);
    printWindow.close();

    return receiptPath;
  });

  ipcMain.handle("get-users", async (event, filters) => {
    console.log("Main process received filters:", filters);

    // Default filters to an empty object if undefined or null
    if (!filters) {
      console.error("Filters object is null or undefined");
      filters = {};
    }

    try {
      // Create a base collection reference using modular syntax
      let usersQuery = collection(db, "users");

      // Apply filters using query() and where()
      if (filters.roleFilter) {
        console.log(`Filtering by role: ${filters.roleFilter}`);
        usersQuery = query(usersQuery, where("role", "==", filters.roleFilter));
      }

      if (filters.statusFilter) {
        console.log(`Filtering by status: ${filters.statusFilter}`);
        usersQuery = query(
          usersQuery,
          where("status", "==", filters.statusFilter)
        );
      }

      // Execute the query using getDocs()
      const snapshot = await getDocs(usersQuery);
      const users = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      console.log(`Found ${users.length} users matching criteria`);
      return users;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  });

  ipcMain.handle("test-firebase-auth", async (event, credentials) => {
    console.log("Testing direct Firebase auth with:", credentials.email);
    try {
      // Get Firebase auth directly
      const { auth } = require("./services/firebase-core");
      const { signInWithEmailAndPassword } = require("firebase/auth");

      // Attempt direct Firebase login
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );
      console.log("Firebase auth SUCCESS:", userCredential.user.email);

      return {
        success: true,
        user: {
          email: userCredential.user.email,
          uid: userCredential.user.uid,
        },
      };
    } catch (error) {
      console.error("Firebase auth FAILED:", error.code, error.message);
      return {
        success: false,
        code: error.code,
        message: error.message,
      };
    }
  });

  ipcMain.handle("test-firebase-direct-auth", async (event, credentials) => {
    try {
      console.log("Testing direct Firebase auth");

      const { auth } = require("./services/firebase-core");
      const { signInWithEmailAndPassword } = require("firebase/auth");

      console.log("Auth object available:", !!auth);

      // Make sure Firebase is initialized
      if (!auth) {
        return {
          success: false,
          message: "Firebase auth is not initialized",
        };
      }

      console.log("Attempting direct sign in with:", credentials.email);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      console.log("Direct auth succeeded for:", userCredential.user.email);
      return {
        success: true,
        user: {
          email: userCredential.user.email,
          uid: userCredential.user.uid,
        },
      };
    } catch (error) {
      console.error("Direct auth error:", error);
      return {
        success: false,
        code: error.code,
        message: error.message,
      };
    }
  });
}

// Set online status when network connectivity changes
app.on("web-contents-created", (event, contents) => {
  contents.on(
    "did-start-navigation",
    async (event, url, isInPlace, isMainFrame) => {
      if (isMainFrame) {
        try {
          // Use fetch to check online status
          const checkConnection = () => {
            return new Promise((resolve) => {
              // Use fetch with a timeout to check real connection
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);

              fetch("https://www.google.com/favicon.ico", {
                method: "HEAD",
                mode: "no-cors",
                signal: controller.signal,
              })
                .then(() => {
                  clearTimeout(timeoutId);
                  resolve(true);
                })
                .catch(() => {
                  clearTimeout(timeoutId);
                  resolve(false);
                });
            });
          };

          const newOnlineStatus = await checkConnection();

          if (isOnline !== newOnlineStatus) {
            isOnline = newOnlineStatus;
            console.log(
              `Connection status changed: ${isOnline ? "Online" : "Offline"}`
            );

            if (
              firebaseService &&
              typeof firebaseService.updateOnlineStatus === "function"
            ) {
              firebaseService.updateOnlineStatus(isOnline);
            }

            if (syncService) {
              syncService.updateOnlineStatus(isOnline);
            }

            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("online-status-changed", isOnline);

              // If going online, sync data
              if (
                isOnline &&
                firebaseService &&
                typeof firebaseService.syncData === "function"
              ) {
                firebaseService.syncData();
              }
            }
          }
        } catch (error) {
          console.error("Error checking online status:", error);
        }
        verifyFirebaseSetup()
          .then((isSetup) => {
            if (isSetup) {
              console.log("Firebase verification completed successfully");
            } else {
              console.warn(
                "Firebase verification failed - authentication may not work correctly"
              );
            }
          })
          .catch((error) => {
            console.error("Firebase verification error:", error);
          });
      }
    }
  );
});
