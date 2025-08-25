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

// Existing import in your index.js

// Near the top of your file with other imports
const dotenv = require("dotenv");
// Load environment variables
try {
  // In development
  if (process.env.NODE_ENV === "development") {
    dotenv.config();
  } else {
    // In production, load from extraResources
    dotenv.config({
      path: path.join(process.resourcesPath, ".env"),
    });
  }

  // Log that we loaded the environment variables (optional)
  console.log("Environment variables loaded");
} catch (error) {
  console.error("Error loading .env file:", error);
}

// Then your auto-updater code
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

// Configure logging for auto-updater
log.transports.file.level = "info";
autoUpdater.logger = log;
autoUpdater.autoDownload = false;
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
let syncService = require("./services/simplified-sync");
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
  // Keep your initial window creation with frame: false for the splash screen
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false, // No frame for splash screen
    transparent: true, // Make background transparent
    backgroundColor: "rgba(0,0,0,0)",
    center: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
      allowRunningInsecureContent: false,
      worldSafeExecuteJavaScript: true,
      enableRemoteModule: false,
      devTools: true,
    },
  });

  // Load the splash screen
  mainWindow.loadFile(path.join(__dirname, "./splash.html"));

  // Show window when it's ready to avoid flickering
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Schedule transition to login page after splash finishes
  setTimeout(() => {
    // Make sure the window isn't closed before trying to load login
    if (!mainWindow.isDestroyed()) {
      console.log("Creating new window with frame for login");

      // Create a new window with frame for login
      const loginWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: true, // WITH frame for login
        center: true,
        show: false, // Don't show until ready
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, "preload.js"),
          webSecurity: true,
          allowRunningInsecureContent: false,
          worldSafeExecuteJavaScript: true,
          enableRemoteModule: false,
          devTools: true,
        },
      });

      // Set the same content security policy
      loginWindow.webContents.session.webRequest.onHeadersReceived(
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

      // Load login page in new window
      loginWindow.loadFile(path.join(__dirname, "./views/login.html"));

      // Show new window when ready
      loginWindow.once("ready-to-show", () => {
        loginWindow.show();
        loginWindow.maximize(); // Maximize it

        // Close the splash window once login is loaded
        if (!mainWindow.isDestroyed()) {
          mainWindow.close();
        }

        // Replace the mainWindow reference with the new window
        mainWindow = loginWindow;
      });
    }
  }, 3000); // Adjust timing as needed (3 seconds matches the animation)

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

// Initialize auto-updater
function initAutoUpdater() {
  // Check for updates during splash screen
  autoUpdater.on("checking-for-update", () => {
    log.info("Checking for update...");
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update-status", { status: "checking" });
    }
  });

  autoUpdater.on("update-available", (info) => {
    log.info("Update available:", info);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update-status", {
        status: "available",
        version: info.version,
      });
    }
  });

  autoUpdater.on("update-not-available", () => {
    log.info("No updates available");
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update-status", { status: "not-available" });
    }
  });

  autoUpdater.on("download-progress", (progress) => {
    log.info(`Download progress: ${progress.percent}%`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update-status", {
        status: "downloading",
        progress: progress,
      });
    }
  });

  autoUpdater.on("update-downloaded", () => {
    log.info("Update downloaded");
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update-status", { status: "downloaded" });
    }
  });

  autoUpdater.on("error", (err) => {
    log.error("Update error:", err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("update-status", {
        status: "error",
        message: err.toString(),
      });
    }
  });
}
app.on("ready", async () => {
  console.log("App is ready, creating window...");
  createWindow();

  // Initialize Auto-Updater
  initAutoUpdater();

  // Check for updates in 3 seconds (after splash screen shows)
  setTimeout(() => {
    if (isOnline) {
      autoUpdater.checkForUpdates();
    }
  }, 3000);

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
  // Authentication handlers
  ipcMain.handle("login-user", async (event, credentials) => {
    try {
      console.log("Main process: Handling login-user");
      if (authService && typeof authService.loginUser === "function") {
        return await authService.loginUser(credentials);
      } else {
        console.error("Auth service not available");
        return {
          success: false,
          message: "Authentication service not available",
        };
      }
    } catch (error) {
      console.error("Error in login-user handler:", error);
      return {
        success: false,
        message: "Login failed: " + error.message,
      };
    }
  });

  ipcMain.handle("get-current-user", async () => {
    try {
      console.log("Main process: Handling get-current-user");
      if (authService && typeof authService.getCurrentUser === "function") {
        return await authService.getCurrentUser();
      } else {
        console.error("Auth service not available");
        return null;
      }
    } catch (error) {
      console.error("Error in get-current-user handler:", error);
      return null;
    }
  });

  ipcMain.handle("register-user", async (event, userData) => {
    try {
      console.log("Main process: Handling register-user");
      if (authService && typeof authService.registerUser === "function") {
        return await authService.registerUser(userData);
      } else {
        console.error("Auth service not available");
        return {
          success: false,
          message: "Authentication service not available",
        };
      }
    } catch (error) {
      console.error("Error in register-user handler:", error);
      return {
        success: false,
        message: "Registration failed: " + error.message,
      };
    }
  });

  ipcMain.handle("logout-user", async () => {
    try {
      console.log("Main process: Handling logout-user");
      if (authService && typeof authService.logoutUser === "function") {
        return await authService.logoutUser();
      } else {
        return { success: true }; // Fallback for logout
      }
    } catch (error) {
      console.error("Error in logout-user handler:", error);
      return {
        success: false,
        message: "Logout failed: " + error.message,
      };
    }
  });

  // Online status and sync handlers
  ipcMain.handle("restore-session", async () => {
    return await authService.restoreSession();
  });
  // Auto-update handlers
  ipcMain.handle("check-for-updates", async () => {
    log.info("Manually checking for updates...");
    try {
      return await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error("Error checking for updates:", error);
      return { error: error.message };
    }
  });

  ipcMain.handle("download-update", async () => {
    log.info("Downloading update...");
    try {
      autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      log.error("Error downloading update:", error);
      return { error: error.message };
    }
  });

  ipcMain.handle("quit-and-install", () => {
    log.info("Installing update...");
    autoUpdater.quitAndInstall(true, true); // Changed from false to true for isSilent
    return true;
  });

  ipcMain.handle("get-current-version", () => {
    return app.getVersion();
  });

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

  // Add this to your setupIpcHandlers function
  ipcMain.handle("batch-add-products", async (event, products) => {
    try {
      console.log(`Processing batch of ${products.length} products`);

      if (firebaseService && typeof firebaseService.batchAdd === "function") {
        return await firebaseService.batchAdd("products", products);
      } else {
        // Fallback to local storage batch operation
        const existingProducts = localStore.get("products") || [];
        const timestamp = new Date().toISOString();

        // Prepare products with timestamps
        const productsWithTimestamps = products.map((product) => ({
          ...product,
          id:
            product.id ||
            Date.now().toString() + Math.random().toString(36).substr(2, 9),
          createdAt: timestamp,
          updatedAt: timestamp,
        }));

        // Add to storage in one operation
        localStore.set("products", [
          ...existingProducts,
          ...productsWithTimestamps,
        ]);

        // Return the count of added products
        return productsWithTimestamps.length;
      }
    } catch (error) {
      console.error("Error in batch-add-products handler:", error);
      return 0;
    }
  });
  // Add this handler for splash screen
  ipcMain.handle("splash-ready", () => {
    // This would be called by splash.html to signal it's ready
    console.log("Splash screen is ready");
    return true;
  });

  const splashHandlers = [];
  ipcMain.on("register-splash-complete-handler", (event) => {
    const webContentsId = event.sender.id;

    // Keep track of which window registered the handler
    splashHandlers.push(webContentsId);

    // Make sure we don't have duplicate handlers
    console.log(
      `Registered splash complete handler for window ${webContentsId}`
    );
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
      const {
        page = 1,
        pageSize = 0,
        filters = {},
        sort = { field: "sku", order: "asc" },
        stats = false,
        statsOnly = false,
      } = options;

      // If we only need stats, return just that
      if (stats && statsOnly) {
        const allProducts = localStore.get("products") || [];
        return {
          stats: {
            totalProducts: allProducts.length,
            totalValue: allProducts.reduce(
              (sum, p) => sum + (p.price || 0) * (p.stock || 0),
              0
            ),
            lowStockCount: allProducts.filter((p) => (p.stock || 0) <= 5)
              .length,
          },
        };
      }

      // Handle low stock filter specially
      if (filters.lowStock) {
        const allProducts = localStore.get("products") || [];
        const lowStockProducts = allProducts.filter((p) => (p.stock || 0) <= 5);

        // Sort the products by SKU
        lowStockProducts.sort((a, b) => {
          const skuA = (a.sku || "").toString().toLowerCase();
          const skuB = (b.sku || "").toString().toLowerCase();

          // Try to compare as numbers if both SKUs are numeric
          if (!isNaN(skuA) && !isNaN(skuB)) {
            return parseFloat(skuA) - parseFloat(skuB);
          }

          // Otherwise compare as strings
          return sort.order === "asc"
            ? skuA.localeCompare(skuB)
            : skuB.localeCompare(skuA);
        });

        return {
          items: lowStockProducts,
          totalCount: lowStockProducts.length,
          page: 1,
          totalPages: 1,
        };
      }

      // Try to use Firebase if available
      if (firebaseService && typeof firebaseService.getAll === "function") {
        try {
          // If pageSize is 0, get all products (backward compatibility)
          if (pageSize === 0) {
            const allProducts = await firebaseService.getAll("products");

            // Make sure we return consistent format
            if (Array.isArray(allProducts)) {
              // Sort by SKU
              allProducts.sort((a, b) => {
                const skuA = (a.sku || "").toString().toLowerCase();
                const skuB = (b.sku || "").toString().toLowerCase();

                // Try to compare as numbers if both SKUs are numeric
                if (!isNaN(skuA) && !isNaN(skuB)) {
                  return parseFloat(skuA) - parseFloat(skuB);
                }

                // Otherwise compare as strings
                return sort.order === "asc"
                  ? skuA.localeCompare(skuB)
                  : skuB.localeCompare(skuA);
              });

              return allProducts;
            }
            return allProducts;
          }

          // Use proper pagination with Firebase
          const paginationOptions = {
            limit: pageSize,
            offset: (page - 1) * pageSize,
            sortBy: sort.field || "sku",
            sortOrder: sort.order || "asc",
            filters: []
          };

          // Add search filters to Firebase query
          if (filters.search || filters.sku || filters.name || filters.category) {
            // For search, we'll need to get all and filter locally since Firebase has limited text search
            const allProducts = await firebaseService.getAll("products");
            
            if (Array.isArray(allProducts)) {
              // Apply search filter locally
              let filteredProducts = allProducts;

              if (filters.search) {
                // Search across all fields
                filteredProducts = allProducts.filter(p => 
                  (p.name && p.name.toLowerCase().includes(filters.search.toLowerCase())) ||
                  (p.sku && p.sku.toLowerCase().includes(filters.search.toLowerCase())) ||
                  (p.category && p.category.toLowerCase().includes(filters.search.toLowerCase()))
                );
              } else if (filters.sku) {
                // Search only in SKU field
                filteredProducts = allProducts.filter(p => 
                  p.sku && p.sku.toLowerCase().includes(filters.sku.toLowerCase())
                );
              } else if (filters.name) {
                // Search only in name field
                filteredProducts = allProducts.filter(p => 
                  p.name && p.name.toLowerCase().includes(filters.name.toLowerCase())
                );
              } else if (filters.category) {
                // Search only in category field
                filteredProducts = allProducts.filter(p => 
                  p.category && p.category.toLowerCase().includes(filters.category.toLowerCase())
                );
              }

              // Apply sorting
              filteredProducts.sort((a, b) => {
                const fieldA = (a[sort.field] || "").toString().toLowerCase();
                const fieldB = (b[sort.field] || "").toString().toLowerCase();

                if (sort.field === "sku" && !isNaN(fieldA) && !isNaN(fieldB)) {
                  return sort.order === "asc" 
                    ? parseFloat(fieldA) - parseFloat(fieldB)
                    : parseFloat(fieldB) - parseFloat(fieldA);
                }

                return sort.order === "asc" 
                  ? fieldA.localeCompare(fieldB)
                  : fieldB.localeCompare(fieldA);
              });

              // Apply pagination
              const startIdx = (page - 1) * pageSize;
              const endIdx = startIdx + pageSize;
              const paginatedProducts = filteredProducts.slice(startIdx, endIdx);

              return {
                items: paginatedProducts,
                totalCount: filteredProducts.length,
                page: page,
                totalPages: Math.ceil(filteredProducts.length / pageSize),
              };
            }
          } else {
            // Use Firebase pagination for non-search queries
            const result = await firebaseService.getPaginated("products", paginationOptions);
            
            if (result && result.items) {
              return {
                items: result.items,
                totalCount: result.total || result.items.length,
                page: page,
                totalPages: Math.ceil((result.total || result.items.length) / pageSize),
              };
            }
          }

          // Fallback: get all and paginate locally
          const allProducts = await firebaseService.getAll("products");
          
          if (Array.isArray(allProducts)) {
            // Apply sorting
            allProducts.sort((a, b) => {
              const fieldA = (a[sort.field] || "").toString().toLowerCase();
              const fieldB = (b[sort.field] || "").toString().toLowerCase();

              if (sort.field === "sku" && !isNaN(fieldA) && !isNaN(fieldB)) {
                return sort.order === "asc" 
                  ? parseFloat(fieldA) - parseFloat(fieldB)
                  : parseFloat(fieldB) - parseFloat(fieldA);
              }

              return sort.order === "asc" 
                ? fieldA.localeCompare(fieldB)
                : fieldB.localeCompare(fieldA);
            });

            // Apply pagination
            const startIdx = (page - 1) * pageSize;
            const endIdx = startIdx + pageSize;
            const paginatedProducts = allProducts.slice(startIdx, endIdx);

            return {
              items: paginatedProducts,
              totalCount: allProducts.length,
              page: page,
              totalPages: Math.ceil(allProducts.length / pageSize),
            };
          }

          return {
            items: [],
            totalCount: 0,
            page: page,
            totalPages: 0,
          };
        } catch (firebaseError) {
          console.error(
            "Firebase error, falling back to local storage:",
            firebaseError
          );
          // Continue to local storage fallback
        }
      }

      // Local storage fallback with improved filtering and sorting
      let products = localStore.get("products") || [];

      // Apply filters
      if (filters) {
        if (filters.category) {
          const category = filters.category.toLowerCase();
          products = products.filter(
            (p) => p.category && p.category.toLowerCase() === category
          );
        }

        if (filters.sku) {
          const sku = filters.sku.toLowerCase();
          products = products.filter(
            (p) => p.sku && p.sku.toLowerCase().includes(sku)
          );
        }

        if (filters.name) {
          const name = filters.name.toLowerCase();
          products = products.filter(
            (p) => p.name && p.name.toLowerCase().includes(name)
          );
        }

        if (filters.search) {
          const search = filters.search.toLowerCase();
          products = products.filter(
            (p) =>
              (p.name && p.name.toLowerCase().includes(search)) ||
              (p.sku && p.sku.toLowerCase().includes(search)) ||
              (p.category && p.category.toLowerCase().includes(search))
          );
        }
      }

      // Sort products by the specified field (default to SKU)
      const sortField = sort.field || "sku";
      const sortOrder = sort.order || "asc";

      products.sort((a, b) => {
        // Handle SKU sorting specially for numeric vs string comparison
        if (sortField === "sku") {
          const skuA = (a.sku || "").toString().toLowerCase();
          const skuB = (b.sku || "").toString().toLowerCase();

          // Try to compare as numbers if both SKUs are numeric
          if (!isNaN(skuA) && !isNaN(skuB)) {
            return sortOrder === "asc"
              ? parseFloat(skuA) - parseFloat(skuB)
              : parseFloat(skuB) - parseFloat(skuA);
          }

          // Otherwise compare as strings
          return sortOrder === "asc"
            ? skuA.localeCompare(skuB)
            : skuB.localeCompare(skuA);
        }

        // For other fields
        const valA = (a[sortField] || "").toString().toLowerCase();
        const valB = (b[sortField] || "").toString().toLowerCase();

        // Try numeric sorting if both values are numbers
        if (!isNaN(valA) && !isNaN(valB)) {
          return sortOrder === "asc"
            ? parseFloat(valA) - parseFloat(valB)
            : parseFloat(valB) - parseFloat(valA);
        }

        // Default string comparison
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      });

      // If stats are requested alongside the data, include them
      const statsData = stats
        ? {
            stats: {
              totalProducts: products.length,
              totalValue: products.reduce(
                (sum, p) => sum + (p.price || 0) * (p.stock || 0),
                0
              ),
              lowStockCount: products.filter((p) => (p.stock || 0) <= 5).length,
            },
          }
        : {};

      // Apply pagination if requested
      if (pageSize > 0) {
        const startIdx = (page - 1) * pageSize;
        const endIdx = startIdx + pageSize;
        const totalPages = Math.ceil(products.length / pageSize);

        return {
          items: products.slice(startIdx, endIdx),
          totalCount: products.length,
          page: page,
          totalPages: totalPages,
          ...statsData,
        };
      }

      // Otherwise return all products with a consistent format
      return {
        items: products,
        totalCount: products.length,
        page: 1,
        totalPages: 1,
        ...statsData,
      };
    } catch (error) {
      console.error("Error in get-products:", error);
      // Return a safe default on error
      return {
        items: [],
        totalCount: 0,
        page: 1,
        totalPages: 0,
      };
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

  ipcMain.handle("get-invoices", async (event, options = {}) => {
    try {
      // Check if pagination options are provided
      if (options.limit || options.offset) {
        // Use pagination
        if (firebaseService && typeof firebaseService.getPaginated === "function") {
          return await firebaseService.getPaginated("invoices", options);
        } else {
          throw new Error("Firebase service not available");
        }
      } else {
        // Use traditional getAll for backward compatibility
        if (firebaseService && typeof firebaseService.getAll === "function") {
          return await firebaseService.getAll("invoices");
        } else {
          throw new Error("Firebase service not available");
        }
      }
    } catch (error) {
      console.log("Using local storage for get-invoices:", error.message);

      // Fallback to local storage with pagination
      const localInvoices = localStore.get("invoices") || [];

      if (options.limit || options.offset) {
        const { limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;

        // Sort invoices
        const sortedInvoices = localInvoices.sort((a, b) => {
          const aValue = a[sortBy] || '';
          const bValue = b[sortBy] || '';

          if (sortOrder === 'desc') {
            return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
          } else {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
          }
        });

        // Apply pagination
        const paginatedInvoices = sortedInvoices.slice(offset, offset + limit);

        return {
          items: paginatedInvoices,
          total: localInvoices.length,
          hasMore: offset + limit < localInvoices.length,
          currentOffset: offset,
          currentLimit: limit
        };
      } else {
        return localInvoices;
      }
    }
  });

  // Add dedicated paginated invoices handler
  ipcMain.handle("get-invoices-paginated", async (event, options = {}) => {
    try {
      if (firebaseService && typeof firebaseService.getPaginatedFromFirebase === "function") {
        return await firebaseService.getPaginatedFromFirebase("invoices", options);
      } else if (firebaseService && typeof firebaseService.getPaginated === "function") {
        return await firebaseService.getPaginated("invoices", options);
      } else {
        throw new Error("Firebase service not available");
      }
    } catch (error) {
      console.log("Using local storage for get-invoices-paginated:", error.message);

      // Fallback to local storage pagination
      const localInvoices = localStore.get("invoices") || [];
      const { limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;

      // Sort invoices
      const sortedInvoices = localInvoices.sort((a, b) => {
        const aValue = a[sortBy] || '';
        const bValue = b[sortBy] || '';

        if (sortOrder === 'desc') {
          return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
        } else {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
      });

      // Apply pagination
      const paginatedInvoices = sortedInvoices.slice(offset, offset + limit);

      return {
        items: paginatedInvoices,
        total: localInvoices.length,
        hasMore: offset + limit < localInvoices.length,
        currentOffset: offset,
        currentLimit: limit
      };
    }
  });

  ipcMain.handle("get-users", async (event, filters = {}) => {
    console.log("Main process received filters:", filters);

    // Default filters to an empty object if undefined or null
    if (!filters) {
      console.error("Filters object is null or undefined");
      filters = {};
    }

    try {
      // Check if pagination options are provided
      if (filters.limit || filters.offset) {
        // Use pagination with Firebase
        if (firebaseService && typeof firebaseService.getPaginatedFromFirebase === "function") {
          const options = {
            limit: filters.limit || 50,
            offset: filters.offset || 0,
            sortBy: filters.sortBy || 'createdAt',
            sortOrder: filters.sortOrder || 'desc',
            filters: []
          };

          // Convert filters to Firebase filter format
          if (filters.roleFilter) {
            options.filters.push({
              field: 'role',
              operator: '==',
              value: filters.roleFilter
            });
          }

          if (filters.statusFilter) {
            options.filters.push({
              field: 'status',
              operator: '==',
              value: filters.statusFilter
            });
          }

          return await firebaseService.getPaginatedFromFirebase("users", options);
        }
      }

      // Original Firebase query logic for backward compatibility
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

      // If pagination was requested, apply it locally as fallback
      if (filters.limit || filters.offset) {
        const { limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

        // Sort users
        const sortedUsers = users.sort((a, b) => {
          const aValue = a[sortBy] || '';
          const bValue = b[sortBy] || '';

          if (sortOrder === 'desc') {
            return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
          } else {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
          }
        });

        // Apply pagination
        const paginatedUsers = sortedUsers.slice(offset, offset + limit);

        return {
          items: paginatedUsers,
          total: users.length,
          hasMore: offset + limit < users.length,
          currentOffset: offset,
          currentLimit: limit
        };
      }

      return users;
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  });
ipcMain.handle("update-invoice", async (event, invoice) => {
    try {
      if (firebaseService && typeof firebaseService.update === "function") {
        return await firebaseService.update("invoices", invoice.id, invoice);
      } else {
        throw new Error("Firebase service not available");
      }
    } catch (error) {
      console.log("Using local storage for update-invoice:", error.message);

      // Fallback to local storage
      const invoices = localStore.get("invoices") || [];
      const invoiceIndex = invoices.findIndex(inv => inv.id === invoice.id);
      
      if (invoiceIndex !== -1) {
        // Update the invoice
        invoices[invoiceIndex] = {
          ...invoices[invoiceIndex],
          ...invoice,
          lastModified: new Date().toISOString()
        };
        localStore.set("invoices", invoices);
        return true;
      } else {
        throw new Error(`Invoice with id ${invoice.id} not found`);
      }
    }
  });
  // Add dedicated paginated users handler
  ipcMain.handle("get-users-paginated", async (event, options = {}) => {
    try {
      if (firebaseService && typeof firebaseService.getPaginatedFromFirebase === "function") {
        const paginationOptions = {
          limit: options.limit || 50,
          offset: options.offset || 0,
          sortBy: options.sortBy || 'createdAt',
          sortOrder: options.sortOrder || 'desc',
          filters: []
        };

        // Convert filters to Firebase filter format
        if (options.roleFilter) {
          paginationOptions.filters.push({
            field: 'role',
            operator: '==',
            value: options.roleFilter
          });
        }

        if (options.statusFilter) {
          paginationOptions.filters.push({
            field: 'status',
            operator: '==',
            value: options.statusFilter
          });
        }

        return await firebaseService.getPaginatedFromFirebase("users", paginationOptions);
      } else {
        throw new Error("Firebase pagination service not available");
      }
    } catch (error) {
      console.log("Using fallback for get-users-paginated:", error.message);

      // Fallback implementation - this would typically use local storage or direct Firebase queries
      try {
        const { limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;

        // Create a base collection reference
        let usersQuery = collection(db, "users");

        // Apply filters
        if (options.roleFilter) {
          usersQuery = query(usersQuery, where("role", "==", options.roleFilter));
        }

        if (options.statusFilter) {
          usersQuery = query(usersQuery, where("status", "==", options.statusFilter));
        }

        // Execute the query
        const snapshot = await getDocs(usersQuery);
        const allUsers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort users
        const sortedUsers = allUsers.sort((a, b) => {
          const aValue = a[sortBy] || '';
          const bValue = b[sortBy] || '';

          if (sortOrder === 'desc') {
            return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
          } else {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
          }
        });

        // Apply pagination
        const paginatedUsers = sortedUsers.slice(offset, offset + limit);

        return {
          items: paginatedUsers,
          total: allUsers.length,
          hasMore: offset + limit < allUsers.length,
          currentOffset: offset,
          currentLimit: limit
        };
      } catch (fallbackError) {
        console.error("Fallback pagination also failed:", fallbackError);
        return {
          items: [],
          total: 0,
          hasMore: false,
          currentOffset: 0,
          currentLimit: limit || 50
        };
      }
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
async function checkForUnsyncedDataAfterLogin() {
  if (!isOnline || !db) return;

  try {
    const result = await syncService.checkUnsyncedData(db);

    // Only show dialog if there are actually items to sync
    if (
      result.success &&
      result.hasUnsyncedData &&
      result.totalUnsyncedItems > 0
    ) {
      // Double-check that at least one collection has items to sync
      let hasItemsToSync = false;
      for (const [collection, counts] of Object.entries(
        result.unsyncedCounts || {}
      )) {
        if (counts.total > 0) {
          hasItemsToSync = true;
          break;
        }
      }

      if (hasItemsToSync) {
        mainWindow.webContents.send("unsynced-data-available", {
          unsyncedCounts: result.unsyncedCounts,
          totalUnsyncedItems: result.totalUnsyncedItems,
        });
      }
    }
  } catch (error) {
    console.error("Error checking for unsynced data:", error);
  }
}
