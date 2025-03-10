// sync-ui.js - Include this in your renderer process

// Create and initialize the sync UI
function initSyncUI() {
  // Create sync UI container if it doesn't exist
  let syncContainer = document.getElementById("sync-container");
  if (!syncContainer) {
    syncContainer = document.createElement("div");
    syncContainer.id = "sync-container";
    syncContainer.className = "sync-container";
    document.body.appendChild(syncContainer);
  }

  // Set initial empty state
  syncContainer.innerHTML = `
    <div class="sync-header">
      <h3>Data Synchronization</h3>
      <button id="sync-toggle-btn" class="btn secondary-btn">Show Details</button>
    </div>
    <div class="sync-content" style="display: none;">
      <div id="sync-status" class="sync-status">Checking sync status...</div>
      <div id="unsynced-data" class="unsynced-data"></div>
      <div class="sync-actions">
        <button id="sync-now-btn" class="btn primary-btn">Sync Now</button>
        <button id="refresh-sync-status-btn" class="btn secondary-btn">Refresh Status</button>
      </div>
      <div id="sync-progress" class="sync-progress" style="display: none;">
        <div class="progress-bar-container">
          <div id="sync-progress-bar" class="progress-bar" style="width: 0%"></div>
        </div>
        <div id="sync-progress-text">Starting sync...</div>
      </div>
      <div id="last-sync-time" class="last-sync-time"></div>
    </div>
  `;

  // Add styles for the sync UI
  addSyncStyles();

  // Add event listeners
  document
    .getElementById("sync-toggle-btn")
    .addEventListener("click", toggleSyncDetails);
  document.getElementById("sync-now-btn").addEventListener("click", startSync);
  document
    .getElementById("refresh-sync-status-btn")
    .addEventListener("click", checkSyncStatus);

  // Set up IPC listeners for sync events
  setupSyncListeners();

  // Check sync status initially
  setTimeout(checkSyncStatus, 1000);
}

// Add styles for the sync UI
function addSyncStyles() {
  // Check if styles already exist
  if (document.getElementById("sync-ui-styles")) return;

  const styleElement = document.createElement("style");
  styleElement.id = "sync-ui-styles";
  styleElement.textContent = `
    .sync-container {
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 300px;
      background-color: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      overflow: hidden;
      font-family: Arial, sans-serif;
    }

    .sync-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 15px;
      background-color: #f0f4f8;
      border-bottom: 1px solid #ddd;
    }

    .sync-header h3 {
      margin: 0;
      font-size: 14px;
      color: #333;
    }

    .sync-content {
      padding: 15px;
      font-size: 13px;
    }

    .sync-status {
      margin-bottom: 10px;
      font-weight: bold;
    }

    .unsynced-data {
      margin-bottom: 15px;
    }

    .unsynced-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }

    .sync-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
    }

    .sync-progress {
      margin: 15px 0;
    }

    .progress-bar-container {
      width: 100%;
      height: 8px;
      background-color: #eee;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 5px;
    }

    .progress-bar {
      height: 100%;
      background-color: #4CAF50;
      transition: width 0.3s ease;
    }

    .last-sync-time {
      font-size: 12px;
      color: #666;
      text-align: right;
    }

    /* Status indicators */
    .sync-status.success {
      color: #4CAF50;
    }

    .sync-status.warning {
      color: #FF9800;
    }

    .sync-status.error {
      color: #F44336;
    }

    /* Animated sync icon */
    .sync-icon {
      display: inline-block;
      animation: rotate 2s linear infinite;
      margin-right: 5px;
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Button styles */
    .sync-container .btn {
      padding: 6px 12px;
      font-size: 12px;
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
  `;
  document.head.appendChild(styleElement);
}

// Toggle sync details visibility
function toggleSyncDetails() {
  const syncContent = document.querySelector(".sync-content");
  const toggleBtn = document.getElementById("sync-toggle-btn");

  if (syncContent.style.display === "none") {
    syncContent.style.display = "block";
    toggleBtn.textContent = "Hide Details";
  } else {
    syncContent.style.display = "none";
    toggleBtn.textContent = "Show Details";
  }
}

// Check sync status
async function checkSyncStatus() {
  try {
    const statusEl = document.getElementById("sync-status");
    const unsyncedDataEl = document.getElementById("unsynced-data");
    const lastSyncTimeEl = document.getElementById("last-sync-time");

    // Show checking status
    statusEl.textContent = "Checking sync status...";
    statusEl.className = "sync-status";
    unsyncedDataEl.innerHTML = "";

    // Get online status
    const isOnline = await window.api.getOnlineStatus();
    if (!isOnline) {
      statusEl.textContent = "Currently offline. Sync not available.";
      statusEl.className = "sync-status warning";
      return;
    }

    // Check for unsynced data
    const result = await window.api.checkUnsyncedData();

    if (!result.success) {
      statusEl.textContent = `Error checking sync status: ${
        result.message || "Unknown error"
      }`;
      statusEl.className = "sync-status error";
      return;
    }

    // Get last sync time
    const lastSyncTime = await window.api.getLastSyncTime();
    if (lastSyncTime) {
      const date = new Date(lastSyncTime);
      lastSyncTimeEl.textContent = `Last sync: ${date.toLocaleString()}`;
    } else {
      lastSyncTimeEl.textContent = "Never synced";
    }

    // Update UI based on unsynced data
    if (!result.hasUnsyncedData) {
      statusEl.textContent = "All data is in sync.";
      statusEl.className = "sync-status success";
      return;
    }

    // Display unsynced data summary
    statusEl.textContent = `Found ${result.totalUnsyncedItems} items that need to be synced.`;
    statusEl.className = "sync-status warning";

    let unsyncedHTML = "";
    for (const [collection, counts] of Object.entries(result.unsyncedCounts)) {
      unsyncedHTML += `
        <div class="unsynced-item">
          <span>${
            collection.charAt(0).toUpperCase() + collection.slice(1)
          }</span>
          <span>${counts.total} items</span>
        </div>
        <div class="unsynced-details">
          <small>⬆️ ${counts.toUpload} to upload</small> 
          <small>⬇️ ${counts.toDownload} to download</small>
          <small>⚠️ ${counts.conflicts} conflicts</small>
        </div>
      `;
    }

    unsyncedDataEl.innerHTML = unsyncedHTML;
  } catch (error) {
    console.error("Error checking sync status:", error);
    document.getElementById("sync-status").textContent =
      "Error checking sync status.";
    document.getElementById("sync-status").className = "sync-status error";
  }
}

// Start sync process
async function startSync() {
  try {
    const statusEl = document.getElementById("sync-status");
    const progressEl = document.getElementById("sync-progress");
    const progressBarEl = document.getElementById("sync-progress-bar");
    const progressTextEl = document.getElementById("sync-progress-text");
    const syncNowBtn = document.getElementById("sync-now-btn");

    // Get online status
    const isOnline = await window.api.getOnlineStatus();
    if (!isOnline) {
      statusEl.textContent = "Cannot sync while offline.";
      statusEl.className = "sync-status error";
      return;
    }

    // Disable button and show progress
    syncNowBtn.disabled = true;
    progressEl.style.display = "block";
    progressBarEl.style.width = "0%";
    progressTextEl.innerHTML =
      '<span class="sync-icon">⟳</span> Starting sync...';

    statusEl.textContent = "Synchronizing data...";
    statusEl.className = "sync-status";

    // Start the sync process
    const result = await window.api.performSync();

    // Update UI based on result
    syncNowBtn.disabled = false;

    if (result && result.success) {
      statusEl.textContent = "Sync completed successfully!";
      statusEl.className = "sync-status success";

      // Update last sync time
      if (result.timestamp) {
        const date = new Date(result.timestamp);
        document.getElementById(
          "last-sync-time"
        ).textContent = `Last sync: ${date.toLocaleString()}`;
      }

      // Show completion in progress bar
      progressBarEl.style.width = "100%";
      progressTextEl.textContent = "Sync completed!";

      // Hide progress after a delay
      setTimeout(() => {
        progressEl.style.display = "none";
        // Refresh the status to show we're in sync
        checkSyncStatus();
      }, 2000);
    } else {
      statusEl.textContent =
        result && result.message
          ? `Sync failed: ${result.message}`
          : "Sync failed with unknown error";
      statusEl.className = "sync-status error";
      progressTextEl.textContent = "Sync failed. Please try again.";
    }
  } catch (error) {
    console.error("Error during sync:", error);
    document.getElementById("sync-status").textContent = "Error during sync.";
    document.getElementById("sync-status").className = "sync-status error";
    document.getElementById("sync-progress-text").textContent =
      "Sync error. Please try again.";
    document.getElementById("sync-now-btn").disabled = false;
  }
}

// Set up IPC listeners for sync events
function setupSyncListeners() {
  // Listen for sync started event
  if (window.api.onSyncStarted) {
    window.api.onSyncStarted(() => {
      const statusEl = document.getElementById("sync-status");
      const progressEl = document.getElementById("sync-progress");
      const progressBarEl = document.getElementById("sync-progress-bar");
      const progressTextEl = document.getElementById("sync-progress-text");

      statusEl.textContent = "Synchronizing data...";
      statusEl.className = "sync-status";

      progressEl.style.display = "block";
      progressBarEl.style.width = "0%";
      progressTextEl.innerHTML =
        '<span class="sync-icon">⟳</span> Starting sync...';

      document.getElementById("sync-now-btn").disabled = true;
    });
  }

  // Listen for sync progress events
  if (window.api.onSyncProgress) {
    window.api.onSyncProgress((data) => {
      const progressTextEl = document.getElementById("sync-progress-text");
      const progressBarEl = document.getElementById("sync-progress-bar");

      // Update progress text
      progressTextEl.innerHTML = `<span class="sync-icon">⟳</span> Syncing ${data.collection}...`;

      // Calculate approximate progress (this is just a visual estimate)
      // Getting accurate progress would require knowledge of total items up front
      const collections = ["products", "invoices"];
      const collectionIndex = collections.indexOf(data.collection);
      const progressPercent = (
        (collectionIndex / collections.length) *
        100
      ).toFixed(0);

      progressBarEl.style.width = `${progressPercent}%`;
    });
  }

  // Listen for sync completed event
  if (window.api.onSyncCompleted) {
    window.api.onSyncCompleted((data) => {
      const statusEl = document.getElementById("sync-status");
      const progressEl = document.getElementById("sync-progress");
      const progressBarEl = document.getElementById("sync-progress-bar");
      const progressTextEl = document.getElementById("sync-progress-text");
      const syncNowBtn = document.getElementById("sync-now-btn");

      syncNowBtn.disabled = false;

      if (data && data.success) {
        statusEl.textContent = "Sync completed successfully!";
        statusEl.className = "sync-status success";

        // Update last sync time
        if (data.timestamp) {
          const date = new Date(data.timestamp);
          const lastSyncTimeEl = document.getElementById("last-sync-time");
          if (lastSyncTimeEl) {
            lastSyncTimeEl.textContent = `Last sync: ${date.toLocaleString()}`;
          }
        }

        // Show completion in progress bar
        progressBarEl.style.width = "100%";
        progressTextEl.textContent = "Sync completed!";

        // Hide progress after a delay
        setTimeout(() => {
          progressEl.style.display = "none";
          // Refresh the status to show we're in sync
          checkSyncStatus();
        }, 2000);
      } else {
        statusEl.textContent =
          data && data.error ? `Sync failed: ${data.error}` : "Sync failed";
        statusEl.className = "sync-status error";
        progressTextEl.textContent = "Sync failed. Please try again.";
      }
    });
  }
}

// Function to show a temporary notification
function showTemporaryNotification(message, type = "info") {
  // Create notification element if it doesn't exist
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

// Export the initialization function
window.initSyncUI = initSyncUI;
