// login-sync-dialog.js - Include in your renderer process

// Function to initialize the post-login sync dialog
function initLoginSyncDialog() {
  // Add styles for the login sync dialog
  addLoginSyncStyles();

  // Listen for unsynced data notification after login
  if (window.api && window.api.onUnsyncedDataAvailable) {
    window.api.onUnsyncedDataAvailable((data) => {
      showUnsyncedDataDialog(data);
    });
  } else {
    console.warn("API for unsynced data events not available");
  }

  if (window.api && window.api.onShowReAuthDialog) {
    window.api.onShowReAuthDialog((data) => {
      showReAuthDialog(data.email, data.callback);
    });
  }
}

// Function to add styles for the login sync dialog
function addLoginSyncStyles() {
  // Check if styles already exist
  if (document.getElementById("login-sync-styles")) return;

  const styleElement = document.createElement("style");
  styleElement.id = "login-sync-styles";
  styleElement.textContent = `
    .sync-dialog {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      font-family: Arial, sans-serif;
    }

    .sync-dialog-content {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    }

    .sync-dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      border-bottom: 1px solid #eee;
    }

    .sync-dialog-header h2 {
      margin: 0;
      font-size: 18px;
      color: #333;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #777;
    }

    .close-btn:hover {
      color: #333;
    }

    .sync-dialog-body {
      padding: 20px;
    }

    .sync-dialog-body ul {
      margin: 15px 0;
      padding-left: 20px;
    }

    .sync-dialog-footer {
      padding: 15px 20px;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    /* Notification styles */
    .temp-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      background-color: #333;
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      z-index: 2000;
      max-width: 300px;
      display: none;
      animation: fadeIn 0.3s ease;
    }

    .temp-notification.success {
      background-color: #4CAF50;
    }

    .temp-notification.error {
      background-color: #F44336;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Sync progress notification */
    .sync-progress-notification {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 15px 20px;
      background-color: #333;
      color: white;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      z-index: 2000;
      max-width: 300px;
      display: none;
    }

    .sync-icon {
      display: inline-block;
      animation: rotate 2s linear infinite;
      margin-right: 5px;
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleElement);
}

// Function to show the unsynced data dialog after login
function showUnsyncedDataDialog(data) {
  // Create dialog if it doesn't exist
  let syncDialog = document.getElementById("sync-dialog");
  if (!syncDialog) {
    syncDialog = document.createElement("div");
    syncDialog.id = "sync-dialog";
    syncDialog.className = "sync-dialog";
    document.body.appendChild(syncDialog);
  }

  // Build summary of unsynced items
  let unsyncedSummary = "";
  for (const [collection, counts] of Object.entries(
    data.unsyncedCounts || {}
  )) {
    unsyncedSummary += `<li><strong>${
      collection.charAt(0).toUpperCase() + collection.slice(1)
    }:</strong> ${counts.total} items</li>`;
  }

  // Set dialog content
  syncDialog.innerHTML = `
    <div class="sync-dialog-content">
      <div class="sync-dialog-header">
        <h2>Data Sync Required</h2>
        <button id="close-sync-dialog" class="close-btn">&times;</button>
      </div>
      <div class="sync-dialog-body">
        <p>We found data that needs to be synchronized:</p>
        <ul>
          ${unsyncedSummary || "<li>Some items need syncing</li>"}
        </ul>
        <p>Would you like to sync your data now?</p>
      </div>
      <div class="sync-dialog-footer">
        <button id="sync-later-btn" class="btn secondary-btn">Sync Later</button>
        <button id="sync-now-btn" class="btn primary-btn">Sync Now</button>
      </div>
    </div>
  `;

  // Show the dialog
  syncDialog.style.display = "flex";

  // Add event listeners
  document.getElementById("close-sync-dialog").addEventListener("click", () => {
    syncDialog.style.display = "none";
  });

  document.getElementById("sync-later-btn").addEventListener("click", () => {
    syncDialog.style.display = "none";

    // Show a temporary notification
    showTemporaryNotification(
      "You can sync anytime by clicking the Sync button in the bottom right corner."
    );
  });

  document
    .getElementById("sync-now-btn")
    .addEventListener("click", async () => {
      // Start sync process
      syncDialog.style.display = "none";

      try {
        // Show sync in progress notification
        showSyncProgressNotification();

        // Perform sync
        const result = await window.api.performSync();

        // Show result
        if (result && result.success) {
          showTemporaryNotification("Sync completed successfully!", "success");
        } else {
          showTemporaryNotification(
            "Sync failed: " + (result?.message || "Unknown error"),
            "error"
          );
        }
      } catch (error) {
        console.error("Error during sync:", error);
        showTemporaryNotification(
          "Error during sync. Please try again later.",
          "error"
        );
      }
    });
}

// Function to show a temporary notification
function showTemporaryNotification(message, type = "info") {
  // Create notification element
  let notification = document.getElementById("temp-notification");
  if (!notification) {
    notification = document.createElement("div");
    notification.id = "temp-notification";
    notification.className = "temp-notification";
    document.body.appendChild(notification);
  }

  // Set message and type
  notification.textContent = message;
  notification.className = `temp-notification ${type}`;

  // Show notification
  notification.style.display = "block";

  // Hide after a delay
  setTimeout(() => {
    notification.style.display = "none";
  }, 5000);
}

// Function to show sync progress notification
function showSyncProgressNotification() {
  // Create notification element
  let notification = document.getElementById("sync-progress-notification");
  if (!notification) {
    notification = document.createElement("div");
    notification.id = "sync-progress-notification";
    notification.className = "sync-progress-notification";
    document.body.appendChild(notification);
  }

  // Set message with spinning icon
  notification.innerHTML = '<span class="sync-icon">⟳</span> Syncing data...';

  // Show notification
  notification.style.display = "block";

  // Set up listener to hide when sync completes
  if (window.api && window.api.onSyncCompleted) {
    const hideListener = window.api.onSyncCompleted(() => {
      notification.style.display = "none";
      hideListener(); // Remove the listener
    });
  } else {
    // Fallback to hide automatically after a timeout
    setTimeout(() => {
      notification.style.display = "none";
    }, 10000);
  }
}

// Export initialization function
window.initLoginSyncDialog = initLoginSyncDialog;

function showReAuthDialog(email, callbackChannel) {
  // Create dialog if it doesn't exist
  let reAuthDialog = document.getElementById("reauth-dialog");
  if (!reAuthDialog) {
    reAuthDialog = document.createElement("div");
    reAuthDialog.id = "reauth-dialog";
    reAuthDialog.className = "sync-dialog";
    document.body.appendChild(reAuthDialog);
  }

  // Set dialog content
  reAuthDialog.innerHTML = `
    <div class="sync-dialog-content">
      <div class="sync-dialog-header">
        <h2>Authentication Required</h2>
        <button id="close-reauth-dialog" class="close-btn">&times;</button>
      </div>
      <div class="sync-dialog-body">
        <p>Please re-enter your password to sync with the cloud.</p>
        <form id="reauth-form">
          <div class="form-group">
            <label for="reauth-email">Email</label>
            <input type="email" id="reauth-email" value="${email}" readonly>
          </div>
          <div class="form-group">
            <label for="reauth-password">Password</label>
            <input type="password" id="reauth-password" placeholder="Enter your password" required>
          </div>
        </form>
      </div>
      <div class="sync-dialog-footer">
        <button id="cancel-reauth-btn" class="btn secondary-btn">Cancel</button>
        <button id="submit-reauth-btn" class="btn primary-btn">Authenticate</button>
      </div>
    </div>
  `;

  // Show the dialog
  reAuthDialog.style.display = "flex";

  // Add event listeners
  document
    .getElementById("close-reauth-dialog")
    .addEventListener("click", () => {
      reAuthDialog.style.display = "none";
      if (window.api) {
        window.api.invokeCallback(callbackChannel, { cancelled: true });
      }
    });

  document.getElementById("cancel-reauth-btn").addEventListener("click", () => {
    reAuthDialog.style.display = "none";
    if (window.api) {
      window.api.invokeCallback(callbackChannel, { cancelled: true });
    }
  });

  document.getElementById("submit-reauth-btn").addEventListener("click", () => {
    const password = document.getElementById("reauth-password").value;

    if (!password) {
      // Show error
      alert("Please enter your password");
      return;
    }

    reAuthDialog.style.display = "none";

    if (window.api) {
      window.api.invokeCallback(callbackChannel, {
        email: email,
        password: password,
        cancelled: false,
      });
    }
  });
}

// Export the function
window.showReAuthDialog = showReAuthDialog;
