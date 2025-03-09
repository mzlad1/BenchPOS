// Load Firebase service if available
// Add this at the very top of your script section in index.html

// Remove the other DOMContentLoaded event listeners since we've merged them
const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const fs = require("fs");
let firebaseService = null;
let isOnline = false;
try {
  // First check if the services directory and firebase.js exist
  const servicesDir = path.join(__dirname, "services");
  const firebasePath = path.join(servicesDir, "firebase.js");

  if (!fs.existsSync(servicesDir)) {
    console.log("Services directory not found, creating it...");
    fs.mkdirSync(servicesDir, { recursive: true });
  }

  if (!fs.existsSync(firebasePath)) {
    console.log("Firebase service not found, creating placeholder...");

    // Create a simple placeholder to avoid crashes
    const placeholderContent = `
      module.exports = {
        initializeFirebase: async () => false,
        updateOnlineStatus: () => {},
        registerSyncListener: () => () => {},
        syncData: async () => false,
        getAll: async () => [],
        getById: async () => null,
        add: async (_, item) => item.id || Date.now().toString(),
        update: async () => false,
        remove: async () => false,
        createInvoice: async (invoice) => invoice.id || Date.now().toString(),
        getLastSyncTime: () => null
      };
    `;

    fs.writeFileSync(firebasePath, placeholderContent);
  }

  firebaseService = require("./services/firebase");
  console.log("Firebase service loaded successfully");
} catch (error) {
  console.error("Failed to load Firebase service:", error);

  // Create a dummy service to avoid crashes
  firebaseService = {
    initializeFirebase: async () => false,
    updateOnlineStatus: () => {},
    registerSyncListener: () => () => {},
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
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      webSecurity: true,
      allowRunningInsecureContent: false,
      contextIsolation: true,
      nodeIntegration: false,
      worldSafeExecuteJavaScript: true,
      // Add this line:
      additionalArguments: ["--disable-web-security"],
    },
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self';",
          ],
        },
      });
    }
  );
  // Load the index.html of the app
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

  // Open DevTools (comment out in production)
  // mainWindow.webContents.openDevTools();
};

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

      if (
        firebaseService &&
        typeof firebaseService.updateOnlineStatus === "function"
      ) {
        firebaseService.updateOnlineStatus(isOnline);
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
    }, 5000); // Check every 5 seconds
  } catch (error) {
    console.error("Error checking online status:", error);
    isOnline = false;
  }
};

ipcMain.handle("update-invoice", async (event, invoice) => {
  try {
    // Use your database module to update the invoice
    // For example, if using the firebaseService:
    if (firebaseService && typeof firebaseService.update === "function") {
      return await firebaseService.update("invoices", invoice);
    } else {
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
  } catch (error) {
    console.error("Error updating invoice:", error);
    return false;
  }
});
// Add event listener to the logout button

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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on("ready", () => {
  console.log("App is ready, creating window...");
  createWindow();
});

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
const Store = require("electron-store");
const localStore = new Store({
  name: "shop-billing-local-data",
});

if (!localStore.has("invoices")) {
  localStore.set("invoices", []);
}

// IPC handlers for online status and sync
// IPC handlers for online status and sync
ipcMain.handle("get-online-status", () => {
  console.log("IPC: get-online-status called, returning:", isOnline);
  return isOnline;
});

// Update the sync-data handler with:
ipcMain.handle("sync-data", async () => {
  console.log("IPC: sync-data called, online status:", isOnline);
  if (!isOnline) {
    console.log("Not online, cannot sync");
    return false;
  }

  try {
    if (firebaseService && typeof firebaseService.syncData === "function") {
      console.log("Calling firebaseService.syncData()");
      const result = await firebaseService.syncData();
      console.log("Sync result:", result);
      return result;
    } else {
      console.log("Firebase sync not available, running in local-only mode");
      return false;
    }
  } catch (error) {
    console.error("Error during sync:", error);
    return false;
  }
});

// Update the get-last-sync-time handler with:
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

// IPC handlers for database operations
ipcMain.handle("add-product", async (event, product) => {
  try {
    // Use Firebase if available, otherwise use local storage
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

// Add these IPC handlers:

// Login user
ipcMain.handle("login-user", async (event, credentials) => {
  try {
    return await authService.loginUser(credentials);
  } catch (error) {
    console.error("Error during login:", error);
    return { success: false, message: "Authentication error" };
  }
});

// Register user
ipcMain.handle("register-user", async (event, userData) => {
  try {
    return await authService.registerUser(userData);
  } catch (error) {
    console.error("Error during registration:", error);
    return { success: false, message: "Registration error" };
  }
});

// Get current user
ipcMain.handle("get-current-user", () => {
  try {
    return authService.getCurrentUser();
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
});

// Logout user
ipcMain.handle("logout-user", async () => {
  try {
    return await authService.logoutUser();
  } catch (error) {
    console.error("Error during logout:", error);
    return { success: false, message: "Logout error" };
  }
});

// Check permission
ipcMain.handle("check-permission", (event, permission) => {
  try {
    return authService.checkPermission(permission);
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
});

ipcMain.handle("get-products", async () => {
  try {
    // Use Firebase if available, otherwise use local storage
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
    // Use Firebase if available, otherwise use local storage
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
    // Use Firebase if available, otherwise use local storage
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

ipcMain.handle("create-invoice", async (event, invoice) => {
  try {
    // Use Firebase if available, otherwise use local storage
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
    // Use Firebase if available, otherwise use local storage
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

// IPC handlers for printing receipts
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
