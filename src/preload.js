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
  updateInvoice: async (invoice) => {
    console.log("Preload: Calling update-invoice", invoice.id);
    return await safeIpcInvoke("update-invoice", invoice);
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
      return { success: false, message: error.message };
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
  checkUnsyncedData: async () => {
    console.log("Preload: Calling check-unsynced-data");
    try {
      return await safeIpcInvoke("check-unsynced-data");
    } catch (error) {
      console.error("Error checking unsynced data:", error);
      return { success: false, message: error.message };
    }
  },
  performSync: async () => {
    console.log("Preload: Calling perform-sync");
    try {
      return await safeIpcInvoke("perform-sync");
    } catch (error) {
      console.error("Error performing sync:", error);
      return { success: false, message: error.message };
    }
  },

  // Event listeners for online status and sync events
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

  onUnsyncedDataAvailable: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on("unsynced-data-available", subscription);
    return () =>
      ipcRenderer.removeListener("unsynced-data-available", subscription);
  },

  onSyncStarted: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on("sync-started", subscription);
    return () => ipcRenderer.removeListener("sync-started", subscription);
  },

  onSyncProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on("sync-progress", subscription);
    return () => ipcRenderer.removeListener("sync-progress", subscription);
  },

  onSyncCompleted: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on("sync-completed", subscription);
    return () => ipcRenderer.removeListener("sync-completed", subscription);
  },

  // User authentication
  loginUser: async (credentials) => {
    console.log("Preload: Calling login-user");
    return await safeIpcInvoke("login-user", credentials);
  },
  registerUser: async (userData) => {
    console.log("Preload: Calling register-user");
    return await safeIpcInvoke("register-user", userData);
  },
  getCurrentUser: async () => {
    console.log("Preload: Calling get-current-user");
    return await safeIpcInvoke("get-current-user");
  },
  logoutUser: async () => {
    console.log("Preload: Calling logout-user");
    try {
      // Clear browser localStorage
      localStorage.removeItem("user_id");
      localStorage.removeItem("user_name");
      localStorage.removeItem("device_name");

      // Then call the main process logout
      return await safeIpcInvoke("logout-user");
    } catch (error) {
      console.error("Error during logout:", error);
      return { success: false, message: error.message };
    }
  },
  checkPermission: async (permission) => {
    console.log("Preload: Calling check-permission", permission);
    return await safeIpcInvoke("check-permission", permission);
  },

  // Utility functions
  printReceipt: async (invoiceData) => {
    console.log("Preload: Calling print-receipt");
    return await safeIpcInvoke("print-receipt", invoiceData);
  },
  getCurrentDate: () => {
    return new Date().toISOString();
  },
  setCurrentUser: (userData) => {
    localStorage.setItem("user_id", userData.id);
    localStorage.setItem("user_name", userData.name);
    localStorage.setItem("device_name", userData.device);
    return true;
  },

  // Authentication dialog handlers
  onShowReAuthDialog: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on("show-reauth-dialog", subscription);
    return () => ipcRenderer.removeListener("show-reauth-dialog", subscription);
  },

  onAuthError: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on("auth-error", subscription);
    return () => ipcRenderer.removeListener("auth-error", subscription);
  },

  invokeCallback: (channel, data) => {
    console.log(`Preload: Invoking callback ${channel}`, data);
    return safeIpcInvoke(channel, data);
  },
});

// Log when preload script has loaded
console.log("Preload script initialized successfully");

// Logout handler (moved from inline function to proper export)
async function handleLogout() {
  try {
    console.log("Logging out...");
    const result = await window.api.logoutUser();
    console.log("Logout result:", result);

    if (result && result.success) {
      // Force redirect to login page
      window.location.href = "login.html";
    } else {
      console.error("Logout failed:", result);
      alert("Logout failed. Please try again.");
    }
  } catch (error) {
    console.error("Logout error:", error);
    alert("An error occurred during logout.");
  }
}

// Make sure this is connected to your logout button
document.getElementById("logout-btn").addEventListener("click", handleLogout);

// Export the logout handler if needed elsewhere
window.handleLogout = handleLogout;
