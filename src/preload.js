const { contextBridge, ipcRenderer } = require("electron");

// Function to safely invoke IPC methods
const safeIpcInvoke = async (channel, ...args) => {
  try {
    return await ipcRenderer.invoke(channel, ...args);
  } catch (error) {
    console.error(`Error invoking ${channel}:`, error);
    throw error;
  }
};

// Simple preload script that exposes ipcRenderer functions
contextBridge.exposeInMainWorld("api", {
  // Database operations
  addProduct: async (product) => {
    console.log("Preload: Calling add-product", product);
    return await safeIpcInvoke("add-product", product);
  },
  getProducts: async () => {
    console.log("Preload: Calling get-products");
    return await safeIpcInvoke("get-products");
  },
  updateProduct: async (product) => {
    console.log("Preload: Calling update-product", product);
    return await safeIpcInvoke("update-product", product);
  },
  deleteProduct: async (productId) => {
    console.log("Preload: Calling delete-product", productId);
    return await safeIpcInvoke("delete-product", productId);
  },
  createInvoice: async (invoice) => {
    console.log("Preload: Calling create-invoice");
    return await safeIpcInvoke("create-invoice", invoice);
  },
  getInvoices: async () => {
    console.log("Preload: Calling get-invoices");
    return await safeIpcInvoke("get-invoices");
  },

  // Online/Offline and sync functions
  getOnlineStatus: async () => {
    console.log("Preload: Calling get-online-status");
    try {
      return await safeIpcInvoke("get-online-status");
    } catch (error) {
      console.error("Error getting online status:", error);
      return navigator.onLine; // Fallback to browser API
    }
  },
  syncData: async () => {
    console.log("Preload: Calling sync-data");
    try {
      return await safeIpcInvoke("sync-data");
    } catch (error) {
      console.error("Error syncing data:", error);
      return false;
    }
  },
  getLastSyncTime: async () => {
    console.log("Preload: Calling get-last-sync-time");
    try {
      return await safeIpcInvoke("get-last-sync-time");
    } catch (error) {
      console.error("Error getting last sync time:", error);
      return null;
    }
  },
  onOnlineStatusChanged: (callback) => {
    console.log("Preload: Setting up online-status-changed listener");
    const subscription = (event, status) => {
      console.log("Received online status change:", status);
      callback(status);
    };

    // Add the event listener
    ipcRenderer.on("online-status-changed", subscription);

    // Return a function to remove the listener
    return () => {
      console.log("Removing online-status-changed listener");
      ipcRenderer.removeListener("online-status-changed", subscription);
    };
  },

  // IPC operations
  printReceipt: async (invoiceData) => {
    console.log("Preload: Calling print-receipt");
    return await safeIpcInvoke("print-receipt", invoiceData);
  },

  // Current date and time
  getCurrentDate: () => {
    return new Date().toISOString();
  },

  getCurrentUser: () => {
    return {
      id: localStorage.getItem("user_id") || `user_${Date.now()}`,
      name: localStorage.getItem("user_name") || "Unknown User",
      device: localStorage.getItem("device_name") || require("os").hostname(),
    };
  },

  setCurrentUser: (userData) => {
    localStorage.setItem("user_id", userData.id);
    localStorage.setItem("user_name", userData.name);
    localStorage.setItem("device_name", userData.device);
    return true;
  },

  subscribeToUpdates: (collectionName, callback) => {
    if (typeof window.api.subscribeToCollection === "function") {
      return window.api.subscribeToCollection(collectionName, callback);
    }
    return () => {}; // Return empty unsubscribe function
  },

  loginUser: async (credentials) => {
    console.log("Preload: Calling login-user");
    return await safeIpcInvoke("login-user", credentials);
  },

  registerUser: async (userData) => {
    console.log("Preload: Calling register-user");
    return await safeIpcInvoke("register-user", userData);
  },
  updateInvoice: async (invoice) => {
    console.log("Preload: Calling update-invoice", invoice.id);
    try {
      return await safeIpcInvoke("update-invoice", invoice);
    } catch (error) {
      console.error("Error updating invoice:", error);
      // You'll also need to add a corresponding handler in your main process
      return false;
    }
  },
  getCurrentUser: async () => {
    console.log("Preload: Calling get-current-user");
    return await safeIpcInvoke("get-current-user");
  },

  logoutUser: async () => {
    console.log("Preload: Calling logout-user");
    return await safeIpcInvoke("logout-user");
  },

  checkPermission: async (permission) => {
    console.log("Preload: Calling check-permission", permission);
    return await safeIpcInvoke("check-permission", permission);
  },
});

// Log when preload script has loaded
console.log("Preload script initialized successfully");
async function handleLogout() {
  try {
    await window.api.logoutUser();
    // Redirect to login.html in the views folder
    window.location.href = "views/login.html";
  } catch (error) {
    console.error("Logout error:", error);
  }
}
