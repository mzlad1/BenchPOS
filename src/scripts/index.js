// Global variables for chart
let salesChart = null;
let currentChartPeriod = "week";
let currentChartView = "revenue";
let cachedInvoices = null;
let cachedProducts = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Check if user is logged in
    const user = await window.api.getCurrentUser();
    if (!user) {
      window.location.href = "views/login.html";
      return;
    }

    // Update UI with user info
    document.getElementById("current-user-name").textContent = user.name;
    document.getElementById("current-user-role").textContent = user.role;
    document.getElementById("user-avatar").textContent = user.name
      .charAt(0)
      .toUpperCase();
    document.getElementById("user-greeting").textContent =
      user.name.split(" ")[0];

    // Set current date
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    document.getElementById("current-date").textContent =
      new Date().toLocaleDateString("en-US", options);

    // Apply role-based UI restrictions
    applyRoleBasedAccess(user);

    // Fetch dashboard data
    await fetchDashboardData();

    // Load recent activity
    await loadRecentActivity();

    // Initialize sales chart
    initSalesChart();

    // Set up event listeners
    document
      .getElementById("logout-btn")
      .addEventListener("click", handleLogout);
    document.getElementById("sync-button").addEventListener("click", syncData);
    document
      .getElementById("sync-button-bottom")
      .addEventListener("click", syncData);
    document
      .getElementById("menu-toggle")
      .addEventListener("click", toggleSidebar);
    document
      .getElementById("theme-switcher")
      .addEventListener("click", toggleTheme);

    // Set up chart period buttons
    document.getElementById("chart-week").addEventListener("click", () => {
      setChartPeriod("week");
    });

    document.getElementById("chart-month").addEventListener("click", () => {
      setChartPeriod("month");
    });

    document.getElementById("chart-year").addEventListener("click", () => {
      setChartPeriod("year");
    });

    // Set up chart view tabs
    document.getElementById("tab-revenue").addEventListener("click", () => {
      setChartView("revenue");
    });

    document.getElementById("tab-orders").addEventListener("click", () => {
      setChartView("orders");
    });

    document.getElementById("tab-products").addEventListener("click", () => {
      setChartView("products");
    });

    // Set up quick access cards click handlers
    document.getElementById("billing-card").addEventListener("click", () => {
      window.location.href = "views/billing.html";
    });

    document
      .getElementById("inventory-card")
      .addEventListener("click", (event) => {
        if (
          !document
            .getElementById("inventory-card")
            .classList.contains("disabled")
        ) {
          window.location.href = "views/inventory.html";
        } else {
          event.preventDefault();
          alert("You do not have permission to access Inventory.");
        }
      });

    document
      .getElementById("reports-card")
      .addEventListener("click", (event) => {
        if (
          !document
            .getElementById("reports-card")
            .classList.contains("disabled")
        ) {
          window.location.href = "views/reports.html";
        } else {
          event.preventDefault();
          alert("You do not have permission to access Reports.");
        }
      });

    // Check connection status
    checkConnectionStatus();
    setupOnlineListeners();

    console.log("Dashboard setup complete");
  } catch (error) {
    console.error("Auth check error:", error);
    window.location.href = "views/login.html";
  }
});

// Function to apply role-based access restrictions
function applyRoleBasedAccess(user) {
  const inventoryCard = document.getElementById("inventory-card");
  const reportsCard = document.getElementById("reports-card");
  const inventoryLink = document.getElementById("inventory-link");
  const reportsLink = document.getElementById("reports-link");
  const registerLink = document.getElementById("nav-register");

  if (user.role === "cashier") {
    // Cashiers can only access billing
    if (inventoryCard) {
      inventoryCard.style.display = "none";
    }
    if (reportsCard) {
      reportsCard.style.display = "none";
    }
    if (inventoryLink) {
      inventoryLink.style.display = "none";
    }
    if (reportsLink) {
      reportsLink.style.display = "none";
    }

    if (registerLink) {
      registerLink.style.display = "none";
    }
  } else if (user.role === "manager") {
    // Managers can access billing and inventory but not reports
    if (reportsCard) {
      reportsCard.style.display = "none";
    }
    if (reportsLink) {
      reportsLink.style.display = "none";
    }

    if (registerLink) {
      registerLink.style.display = "none";
    }
  }
  // Admins can access everything (no restrictions)

  console.log(`Applied access restrictions for role: ${user.role}`);
}

// Set chart period and update chart
function setChartPeriod(period) {
  if (currentChartPeriod === period) return;

  currentChartPeriod = period;

  // Update button states
  document.getElementById("chart-week").classList.remove("btn-primary");
  document.getElementById("chart-month").classList.remove("btn-primary");
  document.getElementById("chart-year").classList.remove("btn-primary");

  document.getElementById("chart-week").classList.add("btn-ghost");
  document.getElementById("chart-month").classList.add("btn-ghost");
  document.getElementById("chart-year").classList.add("btn-ghost");

  document.getElementById(`chart-${period}`).classList.remove("btn-ghost");
  document.getElementById(`chart-${period}`).classList.add("btn-primary");

  // Recreate chart with new data
  createAndUpdateChart();
}

// Set chart view and update chart
function setChartView(view) {
  if (currentChartView === view) return;

  currentChartView = view;

  // Update tab states
  document.getElementById("tab-revenue").classList.remove("active");
  document.getElementById("tab-orders").classList.remove("active");
  document.getElementById("tab-products").classList.remove("active");

  document.getElementById(`tab-${view}`).classList.add("active");

  // Recreate chart with new data
  createAndUpdateChart();
}

// Toggle sidebar
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("collapsed");
  sidebar.classList.toggle("expanded");
}

// Toggle theme
function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  document.body.classList.toggle("light-mode");

  // Save preference
  const isDarkMode = document.body.classList.contains("dark-mode");
  localStorage.setItem("darkMode", isDarkMode);

  // Update chart with new theme
  updateChartTheme();
}

// Check for saved theme preference
function loadThemePreference() {
  const darkMode = localStorage.getItem("darkMode") === "true";
  if (darkMode) {
    document.body.classList.remove("light-mode");
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
    document.body.classList.add("light-mode");
  }
}

// Load theme preference when page loads
window.addEventListener("load", loadThemePreference);

// Fetch dashboard data
async function fetchDashboardData() {
  try {
    // Get products
    cachedProducts = await window.api.getProducts();
    document.getElementById("products-count").textContent =
      cachedProducts.length;

    // Count low stock items (stock < 10)
    const lowStockItems = cachedProducts.filter(
      (product) => product.stock < 10
    ).length;
    document.getElementById("low-stock-count").textContent = lowStockItems;
    document.getElementById("inventory-badge").textContent =
      lowStockItems > 0 ? lowStockItems : "";

    // Get invoices
    cachedInvoices = await window.api.getInvoices();
    document.getElementById("sales-count").textContent = cachedInvoices.length;

    // Calculate total revenue
    const totalRevenue = cachedInvoices.reduce(
      (sum, invoice) => sum + (invoice.total || 0),
      0
    );
    document.getElementById(
      "revenue-value"
    ).textContent = `$${totalRevenue.toFixed(2)}`;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
  }
}

// Handle logout
async function handleLogout() {
  try {
    console.log("Logging out...");
    const result = await window.api.logoutUser();

    if (result && result.success) {
      window.location.href = "views/login.html";
    } else {
      console.error("Logout failed:", result);
      alert("Logout failed. Please try again.");
    }
  } catch (error) {
    console.error("Logout error:", error);
    alert("An error occurred during logout.");
  }
}

// Check connection status
async function checkConnectionStatus() {
  try {
    if (typeof window.api.getOnlineStatus === "function") {
      const isOnline = await window.api.getOnlineStatus();
      updateConnectionUI(isOnline);
    } else {
      updateConnectionUI(navigator.onLine);
    }
  } catch (error) {
    console.error("Error checking online status:", error);
    updateConnectionUI(navigator.onLine);
  }
}

// Update UI based on connection status
function updateConnectionUI(isOnline) {
  const indicators = document.querySelectorAll(".status-indicator");
  const texts = document.querySelectorAll("#connection-text");
  const syncButtons = document.querySelectorAll(
    "#sync-button, #sync-button-bottom"
  );

  indicators.forEach((indicator) => {
    if (isOnline) {
      indicator.classList.remove("offline");
      indicator.classList.add("online");
    } else {
      indicator.classList.remove("online");
      indicator.classList.add("offline");
    }
  });

  texts.forEach((text) => {
    text.textContent = isOnline ? "Online Mode" : "Offline Mode";
  });

  syncButtons.forEach((button) => {
    button.disabled = !isOnline;
  });
}

// Set up listeners for online status changes
function setupOnlineListeners() {
  if (typeof window.api.onOnlineStatusChanged === "function") {
    window.api.onOnlineStatusChanged((isOnline) => {
      updateConnectionUI(isOnline);
    });
  } else {
    window.addEventListener("online", () => updateConnectionUI(true));
    window.addEventListener("offline", () => updateConnectionUI(false));
  }
}

// Sync data with server
async function syncData() {
  try {
    const syncButtons = document.querySelectorAll(
      "#sync-button, #sync-button-bottom"
    );

    syncButtons.forEach((button) => {
      button.disabled = true;
      button.innerHTML =
        '<div class="btn-icon" style="animation: spin 1s linear infinite;">🔄</div><span>Syncing...</span>';
    });

    if (typeof window.api.syncData === "function") {
      const success = await window.api.syncData();

      if (success) {
        document.getElementById("last-sync").textContent =
          "Last sync: " + new Date().toLocaleString();

        // Log the sync activity
        logActivity("sync", "database", "All data", {
          text: "Data synced successfully with cloud",
          icon: "🔄",
          badge: "Sync",
          badgeClass: "badge-info",
        });

        // Add a temporary sync success message
        const syncSection = document.querySelector(".sync-section");
        const alertDiv = document.createElement("div");
        alertDiv.classList.add("sync-alert", "badge-success");
        alertDiv.style.padding = "0.5rem 1rem";
        alertDiv.style.borderRadius = "0.5rem";
        alertDiv.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
        alertDiv.style.color = "var(--success)";
        alertDiv.style.marginTop = "1rem";
        alertDiv.style.textAlign = "center";
        alertDiv.style.width = "100%";
        alertDiv.textContent = "Data synced successfully!";

        // Remove any existing alerts
        const existingAlert = syncSection.querySelector(".sync-alert");
        if (existingAlert) {
          syncSection.removeChild(existingAlert);
        }

        syncSection.appendChild(alertDiv);

        // Remove the alert after 5 seconds
        setTimeout(() => {
          if (alertDiv.parentNode === syncSection) {
            syncSection.removeChild(alertDiv);
          }
        }, 5000);

        // Refresh dashboard data after sync
        await fetchDashboardData();

        // Refresh activity list and chart
        await loadRecentActivity();
        if (typeof updateSalesChart === "function") {
          updateSalesChart();
        }
      } else {
        // Show error message
        const syncSection = document.querySelector(".sync-section");
        const alertDiv = document.createElement("div");
        alertDiv.classList.add("sync-alert", "badge-danger");
        alertDiv.style.padding = "0.5rem 1rem";
        alertDiv.style.borderRadius = "0.5rem";
        alertDiv.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
        alertDiv.style.color = "var(--danger)";
        alertDiv.style.marginTop = "1rem";
        alertDiv.style.textAlign = "center";
        alertDiv.style.width = "100%";
        alertDiv.textContent = "Sync failed. Please check your connection.";

        // Remove any existing alerts
        const existingAlert = syncSection.querySelector(".sync-alert");
        if (existingAlert) {
          syncSection.removeChild(existingAlert);
        }

        syncSection.appendChild(alertDiv);

        // Remove the alert after 5 seconds
        setTimeout(() => {
          if (alertDiv.parentNode === syncSection) {
            syncSection.removeChild(alertDiv);
          }
        }, 5000);
      }
    } else {
      alert("Sync functionality is not available in this version.");
    }
  } catch (error) {
    console.error("Sync error:", error);
    alert("Error syncing data: " + (error.message || "Unknown error"));
  } finally {
    const syncButtons = document.querySelectorAll(
      "#sync-button, #sync-button-bottom"
    );

    syncButtons.forEach((button) => {
      button.disabled = false;
      button.innerHTML = '<div class="btn-icon">🔄</div><span>Sync Data</span>';
    });
  }
}

// Load and render recent activity
// Modified loadRecentActivity function to always check localStorage
// Modified loadRecentActivity function to use the shared activityLogger
async function loadRecentActivity() {
  try {
    const activityList = document.getElementById("activity-list");
    const loadingItem = document.getElementById("activity-loading");

    // Use cached data if available, otherwise fetch
    const invoices = cachedInvoices || (await window.api.getInvoices()) || [];
    const products = cachedProducts || (await window.api.getProducts()) || [];

    // Get activity logs using global logger if available
    let activityLogs = [];

    // First try the global activity logger
    if (
      window.activityLogger &&
      typeof window.activityLogger.getAll === "function"
    ) {
      activityLogs = window.activityLogger.getAll();
      console.log(
        `Loaded ${activityLogs.length} activities from global logger`
      );
    } else {
      // Legacy fallback
      try {
        const storedLogs = localStorage.getItem("mzlad_activity_logs");
        if (storedLogs) {
          activityLogs = JSON.parse(storedLogs);
          console.log(
            `Loaded ${activityLogs.length} activities from localStorage directly`
          );
        }
      } catch (error) {
        console.error("Error loading activity logs from localStorage:", error);
      }
    }

    // Also try to get logs from API if available
    if (window.api && typeof window.api.getActivityLogs === "function") {
      try {
        const apiLogs = (await window.api.getActivityLogs()) || [];

        // Merge API logs with other logs, avoiding duplicates
        const existingTimestamps = new Set(
          activityLogs.map((log) => log.timestamp)
        );
        for (const apiLog of apiLogs) {
          if (!existingTimestamps.has(apiLog.timestamp)) {
            activityLogs.push(apiLog);
          }
        }
        console.log(`Added ${apiLogs.length} activities from API`);
      } catch (error) {
        console.error("Error loading activity logs from API:", error);
      }
    }

    // Clear existing activities
    while (activityList.firstChild) {
      activityList.removeChild(activityList.firstChild);
    }

    // Create a combined activity log
    const activities = [];

    // Add invoice activities
    invoices.forEach((invoice) => {
      activities.push({
        type: "sale",
        icon: "💵",
        text: `New sale completed for <strong>$${(invoice.total || 0).toFixed(
          2
        )}</strong>`,
        timestamp: new Date(invoice.createdAt || Date.now()),
        badge: "Sale",
        badgeClass: "badge-success",
      });
    });

    // Add low stock activities
    products
      .filter((product) => (product.stock || 0) < 10)
      .forEach((product) => {
        activities.push({
          type: "stock",
          icon: "📦",
          text: `Product <strong>${
            product.name || "Unknown"
          }</strong> is running low on stock (${product.stock || 0} left)`,
          timestamp: new Date(product.updatedAt || Date.now()),
          badge: "Stock",
          badgeClass: "badge-warning",
        });
      });

    // Get sync time if available
    const lastSyncTime = window.api.getLastSyncTime
      ? await window.api.getLastSyncTime()
      : null;
    if (lastSyncTime) {
      activities.push({
        type: "sync",
        icon: "🔄",
        text: "Data synced successfully with cloud",
        timestamp: new Date(lastSyncTime),
        badge: "Sync",
        badgeClass: "badge-info",
      });
    }

    // Add activities from the activity log
    activityLogs.forEach((log) => {
      switch (log.action) {
        case "update":
          activities.push({
            type: "update",
            icon: "✏️",
            text: `Updated <strong>${
              log.itemName || log.itemType || "item"
            }</strong>`,
            timestamp: new Date(log.timestamp || Date.now()),
            badge: "Update",
            badgeClass: "badge-info",
          });
          break;
        case "delete":
          activities.push({
            type: "delete",
            icon: "🗑️",
            text: `Deleted <strong>${
              log.itemName || log.itemType || "item"
            }</strong>`,
            timestamp: new Date(log.timestamp || Date.now()),
            badge: "Delete",
            badgeClass: "badge-danger",
          });
          break;
        case "add":
          activities.push({
            type: "add",
            icon: "✚",
            text: `Added <strong>${
              log.itemName || log.itemType || "item"
            }</strong>`,
            timestamp: new Date(log.timestamp || Date.now()),
            badge: "New",
            badgeClass: "badge-success",
          });
          break;
        case "sync":
          // Only add if we didn't already add from lastSyncTime
          if (!lastSyncTime) {
            activities.push({
              type: "sync",
              icon: "🔄",
              text: "Data synced with cloud",
              timestamp: new Date(log.timestamp || Date.now()),
              badge: "Sync",
              badgeClass: "badge-info",
            });
          }
          break;
        default:
          // For any custom activity types
          if (log.text) {
            activities.push({
              type: log.action || "activity",
              icon: log.icon || "🔔",
              text: log.text,
              timestamp: new Date(log.timestamp || Date.now()),
              badge: log.badge,
              badgeClass: log.badgeClass || "badge-info",
            });
          }
      }
    });

    // Sort activities by timestamp, most recent first
    activities.sort((a, b) => {
      const dateA =
        a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const dateB =
        b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      return dateB - dateA;
    });

    // Take only the 5 most recent activities
    const recentActivities = activities.slice(0, 5);

    // If no activities, show a message
    if (recentActivities.length === 0) {
      const noActivityItem = document.createElement("div");
      noActivityItem.className = "activity-item";
      noActivityItem.innerHTML = `
        <div class="activity-content">
          <div class="activity-text">No recent activities found</div>
        </div>
      `;
      activityList.appendChild(noActivityItem);
      return;
    }

    // Render each activity
    recentActivities.forEach((activity) => {
      const activityItem = document.createElement("div");
      activityItem.className = "activity-item";

      // Format the timestamp
      const timeFormatted = formatTimestamp(activity.timestamp);

      // Create HTML structure
      let html = `
        <div class="activity-icon">${activity.icon}</div>
        <div class="activity-content">
          <div class="activity-text">${activity.text}</div>
          <div class="activity-time">${timeFormatted}</div>
        </div>
      `;

      // Add badge if present
      if (activity.badge) {
        html += `<div class="activity-badge ${activity.badgeClass}">${activity.badge}</div>`;
      }

      activityItem.innerHTML = html;
      activityList.appendChild(activityItem);
    });

    console.log("Loaded recent activities:", recentActivities.length);
  } catch (error) {
    console.error("Error loading recent activity:", error);
    const activityList = document.getElementById("activity-list");

    // Clear and show error
    while (activityList.firstChild) {
      activityList.removeChild(activityList.firstChild);
    }

    const errorItem = document.createElement("div");
    errorItem.className = "activity-item";
    errorItem.innerHTML = `
      <div class="activity-content">
        <div class="activity-text">Error loading activities</div>
      </div>
    `;
    activityList.appendChild(errorItem);
  }
}

// Function to log a new activity
function logActivity(action, itemType, itemName, additionalInfo = {}) {
  try {
    // Create new activity log entry
    const activity = {
      action, // 'update', 'delete', 'sync', etc.
      itemType, // 'product', 'invoice', etc.
      itemName, // Name of the item
      timestamp: new Date().toISOString(),
      ...additionalInfo, // Any additional info like badge, text, icon, etc.
    };

    // Get existing logs
    let activityLogs = [];
    const storedLogs = localStorage.getItem("mzlad_activity_logs");
    if (storedLogs) {
      activityLogs = JSON.parse(storedLogs);
    }

    // Add new log
    activityLogs.unshift(activity);

    // Keep only the most recent logs (e.g., last 50)
    if (activityLogs.length > 50) {
      activityLogs = activityLogs.slice(0, 50);
    }

    // Save back to storage
    localStorage.setItem("mzlad_activity_logs", JSON.stringify(activityLogs));

    // If API method exists, also save there
    if (window.api && window.api.saveActivityLog) {
      window.api.saveActivityLog(activity).catch((error) => {
        console.error("Error saving to API:", error);
      });
    }

    console.log(`Logged activity: ${action} - ${itemType} - ${itemName}`);
    return true;
  } catch (error) {
    console.error("Error logging activity:", error);
    return false;
  }
}

// Helper function to format timestamps for activity list
function formatTimestamp(date) {
  const now = new Date();
  const diff = now - date;
  const dayDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (dayDiff === 0) {
    // Today, show time
    return `Today at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else if (dayDiff === 1) {
    // Yesterday
    return `Yesterday at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else if (dayDiff < 7) {
    // Within the last week
    return `${dayDiff} days ago`;
  } else {
    // Older than a week, show date
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
}

// Initialize sales chart
function initSalesChart() {
  // We'll lazily initialize the chart when needed
  console.log("Chart initialization prepared");

  // Set chart periods and tabs event listeners
  document.getElementById("chart-week").addEventListener("click", () => {
    setChartPeriod("week");
  });

  document.getElementById("chart-month").addEventListener("click", () => {
    setChartPeriod("month");
  });

  document.getElementById("chart-year").addEventListener("click", () => {
    setChartPeriod("year");
  });

  document.getElementById("tab-revenue").addEventListener("click", () => {
    setChartView("revenue");
  });

  document.getElementById("tab-orders").addEventListener("click", () => {
    setChartView("orders");
  });

  document.getElementById("tab-products").addEventListener("click", () => {
    setChartView("products");
  });

  // Initial chart load with slight delay to reduce initial load strain
  setTimeout(() => {
    createAndUpdateChart();
  }, 500);
}
function processChartData(invoices) {
  // Default empty data
  if (!invoices.length) {
    return {
      labels: ["No data"],
      data: [0],
    };
  }

  // Filter invoices based on period
  const now = new Date();
  const filteredInvoices = invoices.filter((invoice) => {
    const invoiceDate = new Date(invoice.createdAt || Date.now());
    if (currentChartPeriod === "week") {
      // Last 7 days
      return now - invoiceDate <= 7 * 24 * 60 * 60 * 1000;
    } else if (currentChartPeriod === "month") {
      // Last 30 days
      return now - invoiceDate <= 30 * 24 * 60 * 60 * 1000;
    } else {
      // Last 365 days
      return now - invoiceDate <= 365 * 24 * 60 * 60 * 1000;
    }
  });

  if (filteredInvoices.length === 0) {
    return {
      labels: ["No data for selected period"],
      data: [0],
    };
  }

  // Group data by date
  const groupedData = {};
  let interval;

  if (currentChartPeriod === "week") {
    // Group by day for week view
    interval = "day";
    filteredInvoices.forEach((invoice) => {
      const date = new Date(invoice.createdAt || Date.now());
      const day = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      if (!groupedData[day]) {
        groupedData[day] = {
          revenue: 0,
          orders: 0,
          products: 0,
        };
      }

      groupedData[day].revenue += invoice.total || 0;
      groupedData[day].orders += 1;

      // Count products sold in this invoice
      const productCount = invoice.items
        ? invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
        : 0;
      groupedData[day].products += productCount;
    });
  } else if (currentChartPeriod === "month") {
    // Group by chunks of days for month view (to reduce data points)
    interval = "day";
    filteredInvoices.forEach((invoice) => {
      const date = new Date(invoice.createdAt || Date.now());
      // Use 3-day chunks for month view to reduce number of bars
      const dayChunk = Math.floor(date.getDate() / 3) * 3;
      const monthName = date.toLocaleDateString("en-US", { month: "short" });
      const chunk = `${monthName} ${dayChunk + 1}-${Math.min(
        dayChunk + 3,
        31
      )}`;

      if (!groupedData[chunk]) {
        groupedData[chunk] = {
          revenue: 0,
          orders: 0,
          products: 0,
        };
      }

      groupedData[chunk].revenue += invoice.total || 0;
      groupedData[chunk].orders += 1;

      // Count products sold in this invoice
      const productCount = invoice.items
        ? invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
        : 0;
      groupedData[chunk].products += productCount;
    });
  } else {
    // Group by month for year view
    interval = "month";
    filteredInvoices.forEach((invoice) => {
      const date = new Date(invoice.createdAt || Date.now());
      const month = date.toLocaleDateString("en-US", { month: "short" });

      if (!groupedData[month]) {
        groupedData[month] = {
          revenue: 0,
          orders: 0,
          products: 0,
        };
      }

      groupedData[month].revenue += invoice.total || 0;
      groupedData[month].orders += 1;

      // Count products sold in this invoice
      const productCount = invoice.items
        ? invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
        : 0;
      groupedData[month].products += productCount;
    });
  }

  // Create sorted arrays of labels and data
  const sortedLabels = [];
  const sortedData = [];

  if (interval === "day") {
    // For week/month view, sort by date
    const tempData = Object.entries(groupedData).map(([day, data]) => ({
      day,
      ...data,
    }));

    // Sort by date
    tempData.sort((a, b) => {
      return new Date(a.day) - new Date(b.day);
    });

    // Extract sorted labels and data
    tempData.forEach((item) => {
      sortedLabels.push(item.day);
      if (currentChartView === "revenue") {
        sortedData.push(item.revenue);
      } else if (currentChartView === "orders") {
        sortedData.push(item.orders);
      } else {
        sortedData.push(item.products);
      }
    });
  } else {
    // For year view, sort months chronologically
    const monthOrder = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    monthOrder.forEach((month) => {
      if (groupedData[month]) {
        sortedLabels.push(month);
        if (currentChartView === "revenue") {
          sortedData.push(groupedData[month].revenue);
        } else if (currentChartView === "orders") {
          sortedData.push(groupedData[month].orders);
        } else {
          sortedData.push(groupedData[month].products);
        }
      }
    });
  }

  // Make sure we don't have too many data points for performance
  if (sortedLabels.length > 12) {
    const step = Math.ceil(sortedLabels.length / 12);
    const reducedLabels = [];
    const reducedData = [];

    for (let i = 0; i < sortedLabels.length; i += step) {
      reducedLabels.push(sortedLabels[i]);
      reducedData.push(sortedData[i]);
    }

    return { labels: reducedLabels, data: reducedData };
  }

  return { labels: sortedLabels, data: sortedData };
}

function getCurrentViewLabel() {
  if (currentChartView === "revenue") {
    return "Revenue ($)";
  } else if (currentChartView === "orders") {
    return "Orders";
  } else {
    return "Products Sold";
  }
}

function getCurrentViewColor(opacity) {
  if (currentChartView === "revenue") {
    return `rgba(99, 102, 241, ${opacity})`;
  } else if (currentChartView === "orders") {
    return `rgba(14, 165, 233, ${opacity})`;
  } else {
    return `rgba(245, 158, 11, ${opacity})`;
  }
}

// Create and update chart - only called when needed
async function createAndUpdateChart() {
  try {
    const chartWrapper = document.getElementById("chart-wrapper");

    // Create canvas if it doesn't exist
    let chartCanvas = document.getElementById("salesChart");
    if (!chartCanvas) {
      const loadingEl = document.getElementById("chart-loading");
      if (loadingEl) {
        chartWrapper.removeChild(loadingEl);
      }

      chartCanvas = document.createElement("canvas");
      chartCanvas.id = "salesChart";
      chartCanvas.height = 300;
      chartWrapper.appendChild(chartCanvas);
    }

    // Get data
    const invoices = cachedInvoices || (await window.api.getInvoices()) || [];

    // Process data
    const { labels, data } = processChartData(invoices);

    // If chart already exists, destroy it first to prevent memory leaks
    if (salesChart) {
      salesChart.destroy();
      salesChart = null;
    }

    // Create a new chart with performance optimizations
    const ctx = chartCanvas.getContext("2d");

    salesChart = new Chart(ctx, {
      type: "bar", // Use bar instead of line for better performance
      data: {
        labels: labels,
        datasets: [
          {
            label: getCurrentViewLabel(),
            data: data,
            backgroundColor: getCurrentViewColor(0.6),
            borderColor: getCurrentViewColor(1),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0, // Disable animations for better performance
        },
        plugins: {
          legend: {
            display: false, // Hide legend for better performance
          },
          tooltip: {
            enabled: true,
            mode: "index",
            intersect: false,
            backgroundColor: getComputedStyle(document.body).getPropertyValue(
              "--base-100"
            ),
            titleColor: getComputedStyle(document.body).getPropertyValue(
              "--text-primary"
            ),
            bodyColor: getComputedStyle(document.body).getPropertyValue(
              "--text-secondary"
            ),
            borderColor: getComputedStyle(document.body).getPropertyValue(
              "--primary"
            ),
            borderWidth: 1,
            // Limited callbacks for performance
            callbacks: {
              label: function (context) {
                let label = context.dataset.label || "";
                if (label) {
                  label += ": ";
                }
                if (context.parsed.y !== null) {
                  if (currentChartView === "revenue") {
                    label += "$" + context.parsed.y.toFixed(2);
                  } else {
                    label += context.parsed.y;
                  }
                }
                return label;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false, // Hide grid for better performance
            },
            ticks: {
              color: getComputedStyle(document.body).getPropertyValue(
                "--text-secondary"
              ),
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
              lineWidth: 0.5, // Thinner lines for better performance
            },
            ticks: {
              color: getComputedStyle(document.body).getPropertyValue(
                "--text-secondary"
              ),
              maxTicksLimit: 5, // Limit number of ticks for better performance
            },
          },
        },
      },
    });

    console.log(`Chart created: ${currentChartPeriod} / ${currentChartView}`);
  } catch (error) {
    console.error("Error creating/updating chart:", error);
    const chartWrapper = document.getElementById("chart-wrapper");
    chartWrapper.innerHTML =
      '<div class="chart-error">Error loading chart data</div>';
  }
}

// Update sales chart with real data
async function updateSalesChart() {
  try {
    // Use cached invoices if available, otherwise fetch
    const invoices = cachedInvoices || (await window.api.getInvoices()) || [];

    if (!invoices.length) {
      // No data available
      salesChart.data.labels = ["No data available"];
      salesChart.data.datasets[0].data = [0];
      salesChart.update();
      return;
    }

    // Filter invoices based on period
    const now = new Date();
    const filteredInvoices = invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.createdAt || Date.now());
      if (currentChartPeriod === "week") {
        // Last 7 days
        return now - invoiceDate <= 7 * 24 * 60 * 60 * 1000;
      } else if (currentChartPeriod === "month") {
        // Last 30 days
        return now - invoiceDate <= 30 * 24 * 60 * 60 * 1000;
      } else {
        // Last 365 days
        return now - invoiceDate <= 365 * 24 * 60 * 60 * 1000;
      }
    });

    // Group data by date
    const groupedData = {};
    let interval;

    if (currentChartPeriod === "week") {
      // Group by day for week view
      interval = "day";
      filteredInvoices.forEach((invoice) => {
        const date = new Date(invoice.createdAt || Date.now());
        const day = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        if (!groupedData[day]) {
          groupedData[day] = {
            revenue: 0,
            orders: 0,
            products: 0,
          };
        }

        groupedData[day].revenue += invoice.total || 0;
        groupedData[day].orders += 1;

        // Count products sold in this invoice
        const productCount = invoice.items
          ? invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
          : 0;
        groupedData[day].products += productCount;
      });
    } else if (currentChartPeriod === "month") {
      // Group by day for month view (still)
      interval = "day";
      filteredInvoices.forEach((invoice) => {
        const date = new Date(invoice.createdAt || Date.now());
        const day = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        if (!groupedData[day]) {
          groupedData[day] = {
            revenue: 0,
            orders: 0,
            products: 0,
          };
        }

        groupedData[day].revenue += invoice.total || 0;
        groupedData[day].orders += 1;

        // Count products sold in this invoice
        const productCount = invoice.items
          ? invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
          : 0;
        groupedData[day].products += productCount;
      });
    } else {
      // Group by month for year view
      interval = "month";
      filteredInvoices.forEach((invoice) => {
        const date = new Date(invoice.createdAt || Date.now());
        const month = date.toLocaleDateString("en-US", { month: "short" });

        if (!groupedData[month]) {
          groupedData[month] = {
            revenue: 0,
            orders: 0,
            products: 0,
          };
        }

        groupedData[month].revenue += invoice.total || 0;
        groupedData[month].orders += 1;

        // Count products sold in this invoice
        const productCount = invoice.items
          ? invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
          : 0;
        groupedData[month].products += productCount;
      });
    }

    // Create sorted arrays of labels and data
    const sortedLabels = [];
    const sortedData = [];

    if (interval === "day") {
      // For week/month view, sort by date
      const tempData = Object.entries(groupedData).map(([day, data]) => ({
        day,
        ...data,
      }));

      // Sort by date
      tempData.sort((a, b) => {
        return new Date(a.day) - new Date(b.day);
      });

      // Extract sorted labels and data
      tempData.forEach((item) => {
        sortedLabels.push(item.day);
        sortedData.push(item);
      });
    } else {
      // For year view, sort months chronologically
      const monthOrder = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      monthOrder.forEach((month) => {
        if (groupedData[month]) {
          sortedLabels.push(month);
          sortedData.push(groupedData[month]);
        }
      });
    }

    // Update chart data based on current view
    salesChart.data.labels = sortedLabels;

    // Select dataset based on view
    if (currentChartView === "revenue") {
      salesChart.data.datasets[0].label = "Revenue";
      salesChart.data.datasets[0].data = sortedData.map((data) => data.revenue);
      salesChart.data.datasets[0].borderColor = getComputedStyle(
        document.body
      ).getPropertyValue("--primary");
      salesChart.data.datasets[0].backgroundColor = "rgba(99, 102, 241, 0.2)";
    } else if (currentChartView === "orders") {
      salesChart.data.datasets[0].label = "Orders";
      salesChart.data.datasets[0].data = sortedData.map((data) => data.orders);
      salesChart.data.datasets[0].borderColor = getComputedStyle(
        document.body
      ).getPropertyValue("--secondary");
      salesChart.data.datasets[0].backgroundColor = "rgba(14, 165, 233, 0.2)";
    } else {
      salesChart.data.datasets[0].label = "Products Sold";
      salesChart.data.datasets[0].data = sortedData.map(
        (data) => data.products
      );
      salesChart.data.datasets[0].borderColor = getComputedStyle(
        document.body
      ).getPropertyValue("--accent");
      salesChart.data.datasets[0].backgroundColor = "rgba(245, 158, 11, 0.2)";
    }

    // Update chart
    salesChart.update();
    console.log(
      `Updated sales chart: ${currentChartPeriod} / ${currentChartView}`
    );
  } catch (error) {
    console.error("Error updating sales chart:", error);
  }
}

// Update chart when theme changes
function updateChartTheme() {
  // Just destroy and recreate the chart with the new theme
  if (salesChart) {
    createAndUpdateChart();
  }
}

if (!window.api) {
  window.api = {};
}

// Add the logActivity function to the API
window.api.logActivity = logActivity;
