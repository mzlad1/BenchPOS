const { app, BrowserWindow, ipcMain, Menu, screen } = require("electron");
const path = require("path");

const fs = require("fs");
const Store = require("electron-store");
const localStore = new Store({
  name: "shop-billing-local-data",
});

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

// Variables for tracking status
let isOnline = false;
let db = null;

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

let mainWindow;

const createWindow = () => {
  // Create the browser window
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.resolve(__dirname, "preload.js"), // Use path.resolve instead of path.join
      webSecurity: true,
      allowRunningInsecureContent: false,
      worldSafeExecuteJavaScript: true,
      enableRemoteModule: false,
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
            "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:;",
          ],
        },
      });
    }
  );

  // Load the login page first
  mainWindow.loadFile(path.join(__dirname, "./views/login.html"));

  // Build menu from template
  const mainMenu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(mainMenu);

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

    // Only set up sync handlers if Firebase initialized successfully
    if (result && syncService && db) {
      syncService.setupIpcHandlers(db);
    }
  } else {
    console.log("Firebase service not available, running in local-only mode");
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

        // Now set up the sync service if db is available
        if (db && syncService) {
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

// Add developer tools in non-production environment
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
  ipcMain.handle("get-online-status", () => {
    console.log("IPC: get-online-status called, returning:", isOnline);
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

  ipcMain.handle("get-products", async () => {
    try {
      if (firebaseService && typeof firebaseService.getAll === "function") {
        return await firebaseService.getAll("products");
      } else {
        throw new Error("Firebase service not available");
      }
    } catch (error) {
      console.log("Using local storage for get-products:", error.message);
      return localStore.get("products") || [];
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
      // Add online status to credentials
      credentials.isOnline = isOnline;

      const result = await authService.loginUser(credentials);

      if (result.success) {
        // If login successful, tell the renderer we're logged in
        event.sender.send("login-success", result.user);

        // Check for unsynced data if we're online
        if (isOnline && syncService && db) {
          try {
            // Check for unsynced data
            const unsyncedData = await syncService.checkUnsyncedData(db);

            if (unsyncedData.success && unsyncedData.hasUnsyncedData) {
              // Send unsynced data information to renderer
              event.sender.send("unsynced-data-available", unsyncedData);
            }
          } catch (syncError) {
            console.error(
              "Error checking for unsynced data after login:",
              syncError
            );
          }
        }
      }

      return result;
    } catch (error) {
      console.error("Error during login:", error);
      return { success: false, message: "Authentication error" };
    }
  });

  // Firebase re-authentication callback
  ipcMain.handle("firebase-auth-callback", async (event, authData) => {
    // This is a placeholder that will be replaced dynamically
    // The actual handler is created in ensureFirebaseAuth function
    return { success: false, message: "Handler not initialized" };
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
  ipcMain.handle("firebase-auth-callback", async (event, authData) => {
    // This is a placeholder that will be replaced dynamically
    // The actual handler is created in ensureFirebaseAuth function
    return { success: false, message: "Handler not initialized" };
  });
  ipcMain.handle('get-users', async (event, filters) => {
    console.log('Main process received filters:', filters);

    // Check if filters is undefined or null
    if (!filters) {
      console.error('Filters object is null or undefined');
      filters = {}; // Default to empty object
    }

    try {
      // Create query with filters
      let usersRef = db.collection('users');

      if (filters.roleFilter) {
        console.log(`Filtering by role: ${filters.roleFilter}`);
        usersRef = usersRef.where('role', '==', filters.roleFilter);
      }

      if (filters.statusFilter) {
        console.log(`Filtering by status: ${filters.statusFilter}`);
        usersRef = usersRef.where('status', '==', filters.statusFilter);
      }


      const snapshot = await usersRef.get();
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`Found ${users.length} users matching criteria`);
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
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
      }
    }
  );
});
