// Enhanced sync-ui.js - Include this in your renderer process

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

  // Create minimized indicator
  let miniIndicator = document.getElementById("mini-sync-indicator");
  if (!miniIndicator) {
    miniIndicator = document.createElement("div");
    miniIndicator.id = "mini-sync-indicator";
    miniIndicator.className = "sync-indicator";
    document.body.appendChild(miniIndicator);
  }

  // Set initial UI state
  syncContainer.innerHTML = `
    <div class="sync-header">
      <h3><span class="sync-icon">⟳</span> Data Synchronization</h3>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button id="minimize-sync-btn" class="minimize-btn" title="Minimize">−</button>
        <button id="sync-toggle-btn" class="btn">Show Details</button>
      </div>
    </div>
    <div class="sync-content" style="display: none;">
      <div id="sync-status" class="sync-status">
        <span class="status-icon">⟳</span>
        <span>Checking sync status...</span>
      </div>
      <div id="unsynced-data" class="unsynced-data"></div>
      <div class="sync-actions">
        <button id="sync-now-btn" class="btn primary-btn">
          <span class="sync-icon">⟳</span> Sync Now
        </button>
        <button id="refresh-sync-status-btn" class="btn secondary-btn">
          Refresh Status
        </button>
      </div>
      <div id="sync-progress" class="sync-progress" style="display: none;">
        <div class="progress-bar-container">
          <div id="sync-progress-bar" class="progress-bar" style="width: 0%"></div>
        </div>
        <div id="sync-progress-text">
          <span class="sync-icon" style="display: inline-block; animation: spin 1s linear infinite;">⟳</span>
          Starting sync...
        </div>
      </div>
      <div id="last-sync-time" class="last-sync-time"></div>
    </div>
  `;

  // Set minimized indicator content
  miniIndicator.innerHTML = `
    <div class="spinner"></div>
    <span>Syncing data...</span>
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
  document
      .getElementById("minimize-sync-btn")
      .addEventListener("click", minimizeSyncUI);
  document
      .getElementById("mini-sync-indicator")
      .addEventListener("click", maximizeSyncUI);

  // Set up IPC listeners for sync events
  setupSyncListeners();

  // Check sync status initially with a slight delay
  setTimeout(checkSyncStatus, 1000);
}

// Add styles for the sync UI
function addSyncStyles() {
  // Check if styles already exist
  if (document.getElementById("sync-ui-styles")) return;

  const styleElement = document.createElement("style");
  styleElement.id = "sync-ui-styles";
  styleElement.textContent = `
    :root {
      --primary-color: #4361ee;
      --primary-hover: #3a56d4;
      --secondary-color: #3f37c9;
      --accent-color: #4cc9f0;
      --success-color: #0cce6b;
      --warning-color: #ff9e00;
      --danger-color: #e5383b;
      --light-gray: #f8f9fa;
      --medium-gray: #e9ecef;
      --dark-gray: #495057;
      --text-primary: #212529;
      --text-secondary: #6c757d;
      --border-color: #dee2e6;
      --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
      --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
      --border-radius: 8px;
      --border-radius-lg: 12px;
      --transition: all 0.2s ease-in-out;
    }

    /* Sync Container Styles */
    .sync-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 360px;
      background-color: white;
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-lg);
      z-index: 1000;
      overflow: hidden;
      transition: transform 0.3s ease, opacity 0.3s ease;
      transform-origin: bottom right;
    }

    .sync-container.hidden {
      transform: scale(0.6);
      opacity: 0;
      pointer-events: none;
    }

    .sync-header {
      background-color: var(--primary-color);
      padding: 14px 16px;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .sync-header h3 {
      font-size: 16px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sync-header .sync-icon {
      font-size: 18px;
    }

    .sync-header .btn {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: none;
      padding: 6px 10px;
      font-size: 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: var(--transition);
    }

    .sync-header .btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .sync-content {
      padding: 16px;
    }

    .sync-status {
      padding: 12px;
      border-radius: var(--border-radius);
      margin-bottom: 16px;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 10px;
      background-color: var(--light-gray);
    }

    .sync-status.success {
      background-color: rgba(12, 206, 107, 0.1);
      color: var(--success-color);
    }

    .sync-status.warning {
      background-color: rgba(255, 158, 0, 0.1);
      color: var(--warning-color);
    }

    .sync-status.error {
      background-color: rgba(229, 56, 59, 0.1);
      color: var(--danger-color);
    }

    .sync-status .status-icon {
      font-size: 18px;
    }

    .unsynced-data {
      margin-bottom: 16px;
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
    }

    .unsynced-item {
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      font-size: 14px;
    }

    .unsynced-item:last-child {
      border-bottom: none;
    }

    .unsynced-details {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 0 12px 8px 12px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .sync-actions {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }

    .sync-actions .btn {
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: var(--border-radius);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: var(--transition);
    }

    .sync-actions .primary-btn {
      background-color: var(--primary-color);
      color: white;
    }

    .sync-actions .primary-btn:hover, .sync-actions .primary-btn:focus {
      background-color: var(--primary-hover);
    }

    .sync-actions .secondary-btn {
      background-color: var(--light-gray);
      color: var(--text-primary);
    }

    .sync-actions .secondary-btn:hover, .sync-actions .secondary-btn:focus {
      background-color: var(--medium-gray);
    }

    .sync-progress {
      margin: 16px 0;
    }

    .progress-bar-container {
      height: 8px;
      background-color: var(--medium-gray);
      border-radius: 50px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress-bar {
      height: 100%;
      background-color: var(--primary-color);
      width: 0;
      transition: width 0.3s ease;
    }

    #sync-progress-text {
      font-size: 13px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .last-sync-time {
      font-size: 12px;
      color: var(--text-secondary);
      text-align: right;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
    }

    /* Minimized Sync Indicator */
    .sync-indicator {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: var(--primary-color);
      color: white;
      padding: 8px 12px;
      border-radius: 50px;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: var(--shadow-md);
      cursor: pointer;
      z-index: 999;
      opacity: 0;
      transform: translateY(20px);
      transition: var(--transition);
    }

    .sync-indicator.active {
      opacity: 1;
      transform: translateY(0);
    }

    .sync-indicator .spinner {
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    /* Notification styles */
    .temp-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      background-color: white;
      border-left: 4px solid var(--primary-color);
      color: var(--text-primary);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-md);
      z-index: 2000;
      max-width: 300px;
      display: none;
      animation: slideIn 0.3s ease-out;
    }

    .temp-notification.success {
      border-left-color: var(--success-color);
    }

    .temp-notification.error {
      border-left-color: var(--danger-color);
    }

    /* Minimize Button */
    .minimize-btn {
      background: transparent;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 18px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: auto;
      transition: var(--transition);
    }

    .minimize-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }

    /* Animations */
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes slideIn {
      from { 
        opacity: 0;
        transform: translateX(20px);
      }
      to { 
        opacity: 1;
        transform: translateX(0);
      }
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

// Minimize the sync UI
function minimizeSyncUI() {
  const syncContainer = document.getElementById("sync-container");
  const miniIndicator = document.getElementById("mini-sync-indicator");

  syncContainer.classList.add("hidden");
  setTimeout(() => {
    miniIndicator.classList.add("active");
  }, 300);
}

// Maximize the sync UI
function maximizeSyncUI() {
  const syncContainer = document.getElementById("sync-container");
  const miniIndicator = document.getElementById("mini-sync-indicator");

  miniIndicator.classList.remove("active");
  setTimeout(() => {
    syncContainer.classList.remove("hidden");
  }, 100);
}

// Check sync status
async function checkSyncStatus() {
  try {
    const statusEl = document.getElementById("sync-status");
    const unsyncedDataEl = document.getElementById("unsynced-data");
    const lastSyncTimeEl = document.getElementById("last-sync-time");

    // Show checking status
    statusEl.innerHTML = '<span class="status-icon">⟳</span><span>Checking sync status...</span>';
    statusEl.className = "sync-status";
    unsyncedDataEl.innerHTML = "";

    // Get online status
    const isOnline = await window.api.getOnlineStatus();
    if (!isOnline) {
      statusEl.innerHTML = '<span class="status-icon">⚠️</span><span>Currently offline. Sync not available.</span>';
      statusEl.className = "sync-status warning";
      return;
    }

    // Check for unsynced data
    const result = await window.api.checkUnsyncedData();

    if (!result.success) {
      statusEl.innerHTML = `<span class="status-icon">⚠️</span><span>Error checking sync status: ${
          result.message || "Unknown error"
      }</span>`;
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
      statusEl.innerHTML = '<span class="status-icon">✓</span><span>All data is in sync.</span>';
      statusEl.className = "sync-status success";
      unsyncedDataEl.innerHTML = ""; // Clear the container
      return;
    }

    // Display unsynced data summary
    statusEl.innerHTML = `<span class="status-icon">⚠️</span><span>Found ${result.totalUnsyncedItems} items that need to be synced.</span>`;
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
    document.getElementById("sync-status").innerHTML = '<span class="status-icon">⚠️</span><span>Error checking sync status.</span>';
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
      statusEl.innerHTML = '<span class="status-icon">⚠️</span><span>Cannot sync while offline.</span>';
      statusEl.className = "sync-status error";
      showTemporaryNotification("Cannot sync while offline", "error");
      return;
    }

    // Disable button and show progress
    syncNowBtn.disabled = true;
    progressEl.style.display = "block";
    progressBarEl.style.width = "0%";
    progressTextEl.innerHTML =
        '<span class="sync-icon" style="display: inline-block; animation: spin 1s linear infinite;">⟳</span> Starting sync...';

    statusEl.innerHTML = '<span class="status-icon">⟳</span><span>Synchronizing data...</span>';
    statusEl.className = "sync-status";

    // Also update the mini indicator
    document.getElementById("mini-sync-indicator").innerHTML = `
      <div class="spinner"></div>
      <span>Syncing data...</span>
    `;
    document.getElementById("mini-sync-indicator").classList.add("active");

    // Start the sync process
    const result = await window.api.performSync();

    // Update UI based on result
    syncNowBtn.disabled = false;

    if (result && result.success) {
      statusEl.innerHTML = '<span class="status-icon">✓</span><span>Sync completed successfully!</span>';
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
      progressTextEl.innerHTML = '<span class="status-icon">✓</span> Sync completed!';

      // Show success notification
      showTemporaryNotification("Sync completed successfully!", "success");

      // Hide progress after a delay
      setTimeout(() => {
        progressEl.style.display = "none";
        // Refresh the status to show we're in sync
        checkSyncStatus();
      }, 2000);
    } else {
      const errorMessage = result && result.message
          ? `Sync failed: ${result.message}`
          : "Sync failed with unknown error";

      statusEl.innerHTML = `<span class="status-icon">⚠️</span><span>${errorMessage}</span>`;
      statusEl.className = "sync-status error";
      progressTextEl.innerHTML = '<span class="status-icon">⚠️</span> Sync failed. Please try again.';

      // Show error notification
      showTemporaryNotification(errorMessage, "error");
    }

    // Update mini indicator after sync completion
    setTimeout(() => {
      document.getElementById("mini-sync-indicator").classList.remove("active");
    }, 2000);
  } catch (error) {
    console.error("Error during sync:", error);
    document.getElementById("sync-status").innerHTML = '<span class="status-icon">⚠️</span><span>Error during sync.</span>';
    document.getElementById("sync-status").className = "sync-status error";
    document.getElementById("sync-progress-text").innerHTML = '<span class="status-icon">⚠️</span> Sync error. Please try again.';
    document.getElementById("sync-now-btn").disabled = false;

    showTemporaryNotification("Error during sync operation", "error");
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

      statusEl.innerHTML = '<span class="status-icon">⟳</span><span>Synchronizing data...</span>';
      statusEl.className = "sync-status";

      progressEl.style.display = "block";
      progressBarEl.style.width = "0%";
      progressTextEl.innerHTML =
          '<span class="sync-icon" style="display: inline-block; animation: spin 1s linear infinite;">⟳</span> Starting sync...';

      document.getElementById("sync-now-btn").disabled = true;

      // Show mini indicator
      document.getElementById("mini-sync-indicator").classList.add("active");
    });
  }

  // Listen for sync progress events
  if (window.api.onSyncProgress) {
    window.api.onSyncProgress((data) => {
      const progressTextEl = document.getElementById("sync-progress-text");
      const progressBarEl = document.getElementById("sync-progress-bar");

      // Update progress text
      progressTextEl.innerHTML = `<span class="sync-icon" style="display: inline-block; animation: spin 1s linear infinite;">⟳</span> Syncing ${data.collection}...`;

      // Calculate approximate progress (this is just a visual estimate)
      // Getting accurate progress would require knowledge of total items up front
      const collections = ["products", "invoices", "users", "settings"];
      const collectionIndex = collections.indexOf(data.collection);
      let progressPercent = 10; // Start with 10% minimum

      if (data.total > 0) {
        // If we have item count details, calculate more accurate progress
        progressPercent = Math.min(90, Math.round((data.processed / data.total) * 100));
      } else if (collectionIndex >= 0) {
        // Fallback to collection-based progress
        progressPercent = Math.min(90, Math.round(((collectionIndex + 1) / collections.length) * 100));
      }

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
        statusEl.innerHTML = '<span class="status-icon">✓</span><span>Sync completed successfully!</span>';
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
        progressTextEl.innerHTML = '<span class="status-icon">✓</span> Sync completed!';

        // Show notification
        showTemporaryNotification("Sync completed successfully!", "success");

        // Hide progress after a delay
        setTimeout(() => {
          progressEl.style.display = "none";
          // Refresh the status to show we're in sync
          checkSyncStatus();
        }, 2000);
      } else {
        const errorMessage = data && data.error
            ? `Sync failed: ${data.error}`
            : "Sync failed";

        statusEl.innerHTML = `<span class="status-icon">⚠️</span><span>${errorMessage}</span>`;
        statusEl.className = "sync-status error";
        progressTextEl.innerHTML = '<span class="status-icon">⚠️</span> Sync failed. Please try again.';

        // Show error notification
        showTemporaryNotification(errorMessage, "error");
      }

      // Hide mini indicator
      setTimeout(() => {
        document.getElementById("mini-sync-indicator").classList.remove("active");
      }, 2000);
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