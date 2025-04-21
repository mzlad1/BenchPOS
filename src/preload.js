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
// Auto-Update API
contextBridge.exposeInMainWorld("updates", {
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("download-update"),
  quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),
  getCurrentVersion: () => ipcRenderer.invoke("get-current-version"),
  onUpdateStatus: (callback) =>
    ipcRenderer.on("update-status", (_, status) => callback(status)),
});
// Simple preload script that exposes ipcRenderer functions
contextBridge.exposeInMainWorld("api", {
  // Database operations
  addProduct: async (product) => {
    console.log("Preload: Calling add-product", product);
    return await safeIpcInvoke("add-product", product);
  },
  getProducts: async (options = {}) => {
    console.log("Preload: Calling get-products with options:", options);
    return await safeIpcInvoke("get-products", options);
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
  sendPasswordReset: async (email) => {
    console.log("Preload: Calling send-password-reset", email);
    try {
      return await safeIpcInvoke("send-password-reset", email);
    } catch (error) {
      console.error("Error in sendPasswordReset:", error);
      return {
        success: false,
        message: "Failed to send password reset: " + error.message,
      };
    }
  },
  // Add this diagnostic function
  diagnoseFBAuth: async (email) => {
    return await ipcRenderer.invoke("diagnoseFBAuth", email);
  },

  // Add this config getter
  getFirebaseConfig: async () => {
    return await ipcRenderer.invoke("getFirebaseConfig");
  },
  splashReady: () => ipcRenderer.invoke("splash-ready"),
  onSplashScreenComplete: (callback) => {
    ipcRenderer.on("splash-complete", () => callback());
    ipcRenderer.send("register-splash-complete-handler");
  },
  // Online/Offline and sync functions
  // getOnlineStatus: async () => {
  //   console.log("Preload: Calling get-online-status");
  //   try {
  //     const status = await safeIpcInvoke("get-online-status");
  //     console.log("Preload: Online status received:", status);
  //     return status;
  //   } catch (error) {
  //     console.error("Error getting online status:", error);
  //     return navigator.onLine; // Fallback to browser API
  //   }
  // },
  getOnlineStatus: () => ipcRenderer.invoke("check-online-status"),
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
  ipcRenderer: {
    // Send a message to the main process
    send: (channel, ...args) => {
      ipcRenderer.send(channel, ...args);
    },

    // Call a method in the main process and get the response
    invoke: (channel, ...args) => {
      return ipcRenderer.invoke(channel, ...args);
    },

    // Register a listener for a specific channel
    on: (channel, callback) => {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => callback(...args));

      // Return a cleanup function to remove the listener
      return () => {
        ipcRenderer.removeListener(channel, callback);
      };
    },

    // Register a one-time listener for a specific channel
    once: (channel, callback) => {
      ipcRenderer.once(channel, (event, ...args) => callback(...args));
    },
  },
  getUsers: async (filters) => {
    console.log("Preload: Calling get-users");
    try {
      return await safeIpcInvoke("get-users", filters);
    } catch (error) {
      console.error("Error in getUsers:", error);
      // Return empty array as fallback
      return [];
    }
  },

  getUserById: async (userId) => {
    console.log("Preload: Calling get-user-by-id");
    try {
      return await safeIpcInvoke("get-user-by-id", userId);
    } catch (error) {
      console.error("Error in getUserById:", error);
      return null;
    }
  },

  createUser: async (userData) => {
    console.log("Preload: Calling create-user");
    try {
      return await safeIpcInvoke("create-user", userData);
    } catch (error) {
      console.error("Error in createUser:", error);
      return {
        success: false,
        message: "Failed to create user: " + error.message,
      };
    }
  },

  updateUser: async (userData) => {
    console.log("Preload: Calling update-user");
    try {
      return await safeIpcInvoke("update-user", userData);
    } catch (error) {
      console.error("Error in updateUser:", error);
      return {
        success: false,
        message: "Failed to update user: " + error.message,
      };
    }
  },

  deleteUser: async (userId) => {
    console.log("Preload: Calling delete-user");
    try {
      return await safeIpcInvoke("delete-user", userId);
    } catch (error) {
      console.error("Error in deleteUser:", error);
      return {
        success: false,
        message: "Failed to delete user: " + error.message,
      };
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
  restoreSession: () => ipcRenderer.invoke("restore-session"),

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

  testFirebaseAuth: async (credentials) => {
    console.log("Preload: Testing Firebase auth directly");
    return await safeIpcInvoke("test-firebase-auth", credentials);
  },

  showFirebaseAuthDialog: async () => {
    return showAuthDialog();
  },
});

// Add this after the contextBridge exposures

// Inject styles for the auth dialog
const style = document.createElement("style");
style.textContent = `
  .modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.4);
  }
  
  .modal-content {
    background-color: #fefefe;
    margin: 15% auto;
    padding: 20px;
    border: 1px solid #888;
    border-radius: 5px;
    width: 400px;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  
  .close-btn {
    color: #aaa;
    float: right;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
  }
  
  .close-btn:hover {
    color: black;
  }
  
  .input-group {
    margin-bottom: 15px;
  }
  
  .input-group input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  
  .button-group {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  
  .btn-primary {
    background-color: #4CAF50;
    color: white;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .btn-secondary {
    background-color: #f1f1f1;
    color: #333;
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
`;
document.head.appendChild(style);

// Add this after the contextBridge exposures, before the console.log

// Add console logs in your preload.js to debug the IPC flow

// Make sure this listener is active and working
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
window.i18n.init();

// Helper function to show authentication dialog
function showAuthDialog() {
  return new Promise((resolve) => {
    // Create a dialog to get credentials
    const dialogHTML = `
      <div id="auth-dialog" class="modal">
        <div class="modal-content">
          <span class="close-btn">&times;</span>
          <h2>Firebase Authentication Required</h2>
          <p>Please enter your credentials to authenticate with Firebase:</p>
          <div class="input-group">
            <input type="email" id="auth-email" placeholder="Email" required>
          </div>
          <div class="input-group">
            <input type="password" id="auth-password" placeholder="Password" required>
          </div>
          <div class="button-group">
            <button id="auth-submit" class="btn-primary">Login</button>
            <button id="auth-cancel" class="btn-secondary">Cancel</button>
          </div>
        </div>
      </div>
    `;

    // Add it to the DOM
    const container = document.createElement("div");
    container.innerHTML = dialogHTML;
    document.body.appendChild(container);

    const dialog = document.getElementById("auth-dialog");
    const emailInput = document.getElementById("auth-email");
    const passwordInput = document.getElementById("auth-password");
    const submitBtn = document.getElementById("auth-submit");
    const cancelBtn = document.getElementById("auth-cancel");
    const closeBtn = document.querySelector(".close-btn");

    // Show the dialog
    dialog.style.display = "block";

    // Handle submission
    function handleSubmit() {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (email && password) {
        cleanup();
        resolve({ email, password });
      }
    }

    // Handle cancel
    function handleCancel() {
      cleanup();
      resolve(null);
    }

    // Clean up DOM
    function cleanup() {
      dialog.style.display = "none";
      document.body.removeChild(container);
      submitBtn.removeEventListener("click", handleSubmit);
      cancelBtn.removeEventListener("click", handleCancel);
      closeBtn.removeEventListener("click", handleCancel);
    }

    // Add event listeners
    submitBtn.addEventListener("click", handleSubmit);
    cancelBtn.addEventListener("click", handleCancel);
    closeBtn.addEventListener("click", handleCancel);

    // Auto-fill remembered email if available
    const rememberedEmail = localStorage.getItem("remembered_email");
    if (rememberedEmail) {
      emailInput.value = rememberedEmail;
      passwordInput.focus();
    } else {
      emailInput.focus();
    }
  });
}
