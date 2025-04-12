// Global variables for chart
let salesChart = null;
let currentChartPeriod = "week";
let currentChartView = "revenue";
let cachedInvoices = null;
let cachedProducts = null;
let translationsApplied = false;

// Helper function for template translation
function translateTemplate(key, defaultText, variables = {}) {
  // Get the translated template
  const template = window.t(key, defaultText);

  // If no variables to replace, return as is
  if (!variables || Object.keys(variables).length === 0) {
    return template;
  }

  // Replace each variable in the template
  let result = template;
  for (const [name, value] of Object.entries(variables)) {
    const placeholder = `{${name}}`;
    result = result.replace(new RegExp(placeholder, "g"), value);
  }

  return result;
}

// Function to apply translations explicitly
async function forceApplyTranslations() {
  if (translationsApplied) {
    console.log("Dashboard: Translations already applied, skipping");
    return;
  }

  try {
    console.log("Dashboard: Force applying translations to all elements");

    // Get current language
    const lang = localStorage.getItem("language") || "en";
    console.log(`Dashboard: Current language: ${lang}`);

    // First ensure translations are loaded
    if (window.i18n) {
      // Try to directly load the translation file for current language
      try {
        // Try absolute paths - this might work better in Electron
        const possiblePaths = [
          `/locales/${lang}.json`,
          `./locales/${lang}.json`,
          `../locales/${lang}.json`,
          `${lang}.json`,
        ];

        console.log(
          "Dashboard: Trying to load translations from paths:",
          possiblePaths
        );

        let translationsLoaded = false;

        for (const path of possiblePaths) {
          try {
            const response = await fetch(path);
            if (response.ok) {
              const data = await response.json();
              console.log(
                `Dashboard: Successfully loaded translations from ${path}`
              );

              // Flatten and apply translations
              if (typeof window.i18n.flattenTranslations === "function") {
                const flattened = window.i18n.flattenTranslations(data);

                // Merge with existing translations
                window.i18n.translations[lang] = {
                  ...(window.i18n.translations[lang] || {}),
                  ...flattened,
                };

                console.log(
                  `Dashboard: Added ${
                    Object.keys(flattened).length
                  } translations`
                );
                translationsLoaded = true;
                break;
              }
            }
          } catch (e) {
            console.warn(`Dashboard: Failed loading from ${path}:`, e);
          }
        }

        if (!translationsLoaded) {
          console.warn(
            `Dashboard: Could not load translations for ${lang} from files`
          );
        }
      } catch (e) {
        console.error("Dashboard: Error loading translation file:", e);
      }

      // Now manually apply translations to all elements with data-i18n
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        console.log(`Dashboard: Translating element with key: ${key}`);

        let translated = window.t(key);
        if (translated === key) {
          console.warn(`Dashboard: Translation not found for key: ${key}`);
        } else {
          console.log(`Dashboard: Translated "${key}" to "${translated}"`);
        }

        el.textContent = translated;
      });
      document.head.insertAdjacentHTML(
        "beforeend",
        `
  <style id="activity-limiter">
    #activity-list .activity-item:nth-child(n+6) {
      display: none !important;
    }
  </style>
`
      );
      // Update placeholders
      document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        const translated = window.t(key);
        console.log(
          `Dashboard: Setting placeholder for key: ${key} to "${translated}"`
        );
        el.setAttribute("placeholder", translated);
      });

      // After manual translation, call the official update method
      if (typeof window.i18n.updatePageContent === "function") {
        window.i18n.updatePageContent();
      }

      translationsApplied = true;

      // Add a listener for language changes to reapply translations
      window.addEventListener("languageChanged", async () => {
        console.log("Dashboard: Language changed, reapplying translations");
        translationsApplied = false; // Reset so we can apply again
        await forceApplyTranslations();

        // Reload chart with new translations
        if (salesChart) {
          createAndUpdateChart();
        }

        // Update date display with new locale
        updateDateDisplay();
      });
    }
  } catch (error) {
    console.error("Dashboard: Error in forceApplyTranslations:", error);
  }
}

// Make forceApplyTranslations available globally
window.forceApplyTranslations = forceApplyTranslations;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Wait for i18n to initialize if it exists
    if (window.i18n) {
      console.log("Initializing i18n");
      await window.i18n.init();
      console.log("i18n initialized");
    }

    // Check if user is logged in - this is now handled in the HTML script tag
    // to coordinate with LayoutManager initialization
    const user = await window.api.getCurrentUser();
    if (!user) {
      // This check is redundant now, but kept for safety
      window.location.href = "views/login.html";
      return;
    }

    // Update UI with user info - LayoutManager will handle some of this
    document.getElementById("user-greeting").textContent =
      user.name.split(" ")[0];

    // Set current date with internationalization
    updateDateDisplay();

    // Apply role-based UI restrictions for components not handled by LayoutManager
    applyRoleBasedAccess(user);

    // Apply translations
    await forceApplyTranslations();

    // Fetch dashboard data
    await fetchDashboardData();

    // Load recent activity
    await loadRecentActivity();

    // Initialize sales chart
    initSalesChart();

    // Set up event listeners - some are now handled by LayoutManager
    document.getElementById("sync-button").addEventListener("click", syncData);
    document
      .getElementById("sync-button-bottom")
      .addEventListener("click", syncData);

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
          alert(
            window.t(
              "dashboard.permissions.inventoryAccess",
              "You do not have permission to access Inventory."
            )
          );
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
          alert(
            window.t(
              "dashboard.permissions.reportsAccess",
              "You do not have permission to access Reports."
            )
          );
        }
      });

    // Check connection status
    checkConnectionStatus();
    setupOnlineListeners();

    console.log("Dashboard setup complete");
  } catch (error) {
    console.error("Dashboard initialization error:", error);
  }
});

// Update date display with current language
function updateDateDisplay() {
  const dateOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  // Get current language
  const lang = localStorage.getItem("language") || "en";

  // Format date according to language
  const dateDisplay = document.getElementById("current-date");
  if (dateDisplay) {
    const date = new Date();
    try {
      // Try language-specific formatting
      dateDisplay.textContent = date.toLocaleDateString(
        lang === "ar" ? "ar-SA" : "en-US",
        dateOptions
      );
    } catch (e) {
      // Fallback to default
      dateDisplay.textContent = date.toLocaleDateString("en-US", dateOptions);
    }
  }
}

// Function to apply role-based access restrictions
function applyRoleBasedAccess(user) {
  const inventoryCard = document.getElementById("inventory-card");
  const reportsCard = document.getElementById("reports-card");

  if (user.role === "cashier") {
    // Cashiers can only access billing
    if (inventoryCard) {
      inventoryCard.style.display = "none";
    }
    if (reportsCard) {
      reportsCard.style.display = "none";
    }
  } else if (user.role === "manager") {
    // Managers can access billing and inventory but not reports
    if (reportsCard) {
      reportsCard.style.display = "none";
    }
  }
  // Admins can access everything (no restrictions)

  console.log(
    `Applied dashboard-specific access restrictions for role: ${user.role}`
  );
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

    // Count low stock items (stock < 5)
    const lowStockItems = cachedProducts.filter(
      (product) => product.stock <= 5
    ).length;
    document.getElementById("low-stock-count").textContent = lowStockItems;

    // Update inventory badge if it exists
    const inventoryBadge = document.getElementById("inventory-badge");
    if (inventoryBadge) {
      inventoryBadge.textContent = lowStockItems > 0 ? lowStockItems : "";
    }

    // Get invoices
    cachedInvoices = await window.api.getInvoices();
    document.getElementById("sales-count").textContent = cachedInvoices.length;

    // Calculate total revenue
    const totalRevenue = cachedInvoices.reduce(
      (sum, invoice) => sum + (invoice.total || 0),
      0
    );

    // Get current language for number formatting
    const lang = localStorage.getItem("language") || "en";

    // Format revenue with current locale
    const revenueEl = document.getElementById("revenue-value");
    if (revenueEl) {
      // if (lang === "ar") {
      //   // For Arabic, format with Arabic numerals if possible
      //   try {
      //     revenueEl.textContent = `$${totalRevenue.toLocaleString("ar-SA", {
      //       minimumFractionDigits: 2,
      //       maximumFractionDigits: 2,
      //     })}`;
      //   } catch (e) {
      //     // Fallback to standard format
      //     revenueEl.textContent = `$${totalRevenue.toFixed(2)}`;
      //   }
      // } else {
      //   // For English and other languages
      //   revenueEl.textContent = `$${totalRevenue.toFixed(2)}`;
      // }
      // For English and other languages
      revenueEl.textContent = formatCurrency(totalRevenue);
    }

    // Calculate trends
    calculateAndDisplayTrends(cachedInvoices);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
  }
}
// Format currency based on user settings
function formatCurrency(amount) {
  const currency = localStorage.getItem("currency") || "USD";
  const symbol = currency === "ILS" ? "₪" : "$";
  return `${symbol}${parseFloat(amount).toFixed(2)}`;
}
function calculateAndDisplayTrends(invoices) {
  try {
    const now = new Date();

    // Define time periods
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);

    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14);

    // Filter invoices by time periods
    const currentWeekInvoices = invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.createdAt || Date.now());
      return invoiceDate >= oneWeekAgo && invoiceDate <= now;
    });

    const previousWeekInvoices = invoices.filter((invoice) => {
      const invoiceDate = new Date(invoice.createdAt || Date.now());
      return invoiceDate >= twoWeeksAgo && invoiceDate < oneWeekAgo;
    });

    // Calculate sales count trends
    const currentWeekSalesCount = currentWeekInvoices.length;
    const previousWeekSalesCount = previousWeekInvoices.length;

    let salesTrendPercentage = 0;
    if (previousWeekSalesCount > 0) {
      salesTrendPercentage =
        ((currentWeekSalesCount - previousWeekSalesCount) /
          previousWeekSalesCount) *
        100;
    }

    // Calculate revenue trends
    const currentWeekRevenue = currentWeekInvoices.reduce(
      (sum, invoice) => sum + (invoice.total || 0),
      0
    );

    const previousWeekRevenue = previousWeekInvoices.reduce(
      (sum, invoice) => sum + (invoice.total || 0),
      0
    );

    let revenueTrendPercentage = 0;
    if (previousWeekRevenue > 0) {
      revenueTrendPercentage =
        ((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) *
        100;
    }

    // Calculate product trend (newly added products in last week)
    const recentlyAddedProducts = cachedProducts.filter((product) => {
      const createdDate = new Date(product.createdAt || Date.now());
      return createdDate >= oneWeekAgo && createdDate <= now;
    }).length;

    // Update sales trend UI
    updateTrendUI(
      "sales-count",
      salesTrendPercentage,
      window.t("dashboard.stats.vsLastWeek", "vs last week")
    );

    // Update revenue trend UI
    updateTrendUI(
      "revenue-value",
      revenueTrendPercentage,
      window.t("dashboard.stats.vsLastWeek", "vs last week")
    );

    // Update products trend UI with recently added count
    const productTrendElement =
      document.querySelector("#products-count").nextElementSibling;
    if (productTrendElement) {
      const recentlyAddedText = window.t(
        "dashboard.stats.recentlyAdded",
        "Recently added"
      );
      productTrendElement.innerHTML = `<span>${recentlyAddedText}: ${recentlyAddedProducts}</span>`;
    }

    // Update low stock trend UI
    const lowStockTrendElement =
      document.querySelector("#low-stock-count").nextElementSibling;
    if (lowStockTrendElement) {
      const requiresAttentionText = window.t(
        "dashboard.stats.requiresAttention",
        "Requires attention"
      );
      lowStockTrendElement.innerHTML = `<span>${requiresAttentionText}</span>`;
      lowStockTrendElement.className = "stat-trend trend-down";
    }

    console.log(
      `Calculated trends - Sales: ${salesTrendPercentage.toFixed(
        1
      )}%, Revenue: ${revenueTrendPercentage.toFixed(1)}%`
    );
  } catch (error) {
    console.error("Error calculating trends:", error);
  }
}

// Helper function to update trend UI
function updateTrendUI(elementId, percentage, comparisonText) {
  const element = document.querySelector(`#${elementId}`).nextElementSibling;
  if (!element) return;

  // Round percentage to 1 decimal place
  const roundedPercentage = Math.abs(percentage).toFixed(1);

  // Determine trend direction and class
  const isUp = percentage >= 0;
  const trendClass = isUp ? "trend-up" : "trend-down";
  const trendSymbol = isUp ? "↑" : "↓";

  // Get current language for number formatting
  const lang = localStorage.getItem("language") || "en";

  // Format the percentage with current locale
  let formattedPercentage;
  if (lang === "ar") {
    try {
      formattedPercentage = roundedPercentage.toLocaleString("ar-SA");
    } catch (e) {
      formattedPercentage = roundedPercentage;
    }
  } else {
    formattedPercentage = roundedPercentage;
  }

  // Update HTML
  element.innerHTML = `
    <span>${trendSymbol} ${formattedPercentage}%</span>
    <span>${comparisonText}</span>
  `;

  // Update class
  element.className = `stat-trend ${trendClass}`;
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
  const syncButtons = document.querySelectorAll(
    "#sync-button, #sync-button-bottom"
  );

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

    const syncingText = window.t("dashboard.sync.syncing", "Syncing...");

    syncButtons.forEach((button) => {
      button.disabled = true;
      button.innerHTML = `<div class="btn-icon" style="animation: spin 1s linear infinite;">🔄</div><span>${syncingText}</span>`;
    });

    if (typeof window.api.syncData === "function") {
      const success = await window.api.syncData();

      if (success) {
        // Get last sync time text with translation
        const lastSyncText = translateTemplate(
          "dashboard.sync.lastSync",
          "Last sync: {time}",
          { time: new Date().toLocaleString() }
        );

        document.getElementById("last-sync").textContent = lastSyncText;

        // Log the sync activity
        logActivity("sync", "database", "All data", {
          text: window.t(
            "dashboard.activity.dataSync",
            "Data synced successfully with cloud"
          ),
          icon: "🔄",
          badge: window.t("dashboard.activity.badges.sync", "Sync"),
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
        alertDiv.style.width = "50%";
        alertDiv.textContent = window.t(
          "dashboard.sync.success",
          "Data synced successfully!"
        );

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
        alertDiv.textContent = window.t(
          "dashboard.sync.failed",
          "Sync failed. Please check your connection."
        );

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
      alert(
        window.t(
          "dashboard.sync.notAvailable",
          "Sync functionality is not available in this version."
        )
      );
    }
  } catch (error) {
    console.error("Sync error:", error);
    const errorMessage = translateTemplate(
      "dashboard.sync.error",
      "Error syncing data: {message}",
      { message: error.message || "Unknown error" }
    );
    alert(errorMessage);
  } finally {
    const syncButtons = document.querySelectorAll(
      "#sync-button, #sync-button-bottom"
    );

    const syncDataText = window.t("dashboard.syncData", "Sync Data");

    syncButtons.forEach((button) => {
      button.disabled = false;
      button.innerHTML = `<div class="btn-icon">🔄</div><span>${syncDataText}</span>`;
    });
  }
}

// Load and render recent activity
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

    // Add invoice activities with translations
    invoices.forEach((invoice) => {
      activities.push({
        type: "sale",
        icon: "💵",
        text: translateTemplate(
          "dashboard.activity.newSale",
          "New sale completed for <strong>${amount}</strong>",
          { amount: (invoice.total || 0).toFixed(2) }
        ),
        timestamp: new Date(invoice.createdAt || Date.now()),
        badge: window.t("dashboard.activity.badges.sale", "Sale"),
        badgeClass: "badge-success",
      });
    });

    // Add low stock activities with translations
    products
      .filter((product) => (product.stock || 0) < 10)
      .forEach((product) => {
        activities.push({
          type: "stock",
          icon: "📦",
          text: translateTemplate(
            "dashboard.activity.lowStock",
            "Product <strong>{name}</strong> is running low on stock ({count} left)",
            {
              name:
                product.name ||
                window.t("dashboard.activity.unknown", "Unknown"),
              count: product.stock || 0,
            }
          ),
          timestamp: new Date(product.updatedAt || Date.now()),
          badge: window.t("dashboard.activity.badges.stock", "Stock"),
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
        text: window.t(
          "dashboard.activity.dataSync",
          "Data synced successfully with cloud"
        ),
        timestamp: new Date(lastSyncTime),
        badge: window.t("dashboard.activity.badges.sync", "Sync"),
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
            text: translateTemplate(
              "dashboard.activity.itemUpdated",
              "Updated <strong>{name}</strong>",
              {
                name:
                  log.itemName ||
                  log.itemType ||
                  window.t("dashboard.activity.item", "item"),
              }
            ),
            timestamp: new Date(log.timestamp || Date.now()),
            badge: window.t("dashboard.activity.badges.update", "Update"),
            badgeClass: "badge-info",
          });
          break;
        case "delete":
          activities.push({
            type: "delete",
            icon: "🗑️",
            text: translateTemplate(
              "dashboard.activity.itemDeleted",
              "Deleted <strong>{name}</strong>",
              {
                name:
                  log.itemName ||
                  log.itemType ||
                  window.t("dashboard.activity.item", "item"),
              }
            ),
            timestamp: new Date(log.timestamp || Date.now()),
            badge: window.t("dashboard.activity.badges.delete", "Delete"),
            badgeClass: "badge-danger",
          });
          break;
        case "add":
          activities.push({
            type: "add",
            icon: "✚",
            text: translateTemplate(
              "dashboard.activity.itemAdded",
              "Added <strong>{name}</strong>",
              {
                name:
                  log.itemName ||
                  log.itemType ||
                  window.t("dashboard.activity.item", "item"),
              }
            ),
            timestamp: new Date(log.timestamp || Date.now()),
            badge: window.t("dashboard.activity.badges.new", "New"),
            badgeClass: "badge-success",
          });
          break;
        case "sync":
          // Only add if we didn't already add from lastSyncTime
          if (!lastSyncTime) {
            activities.push({
              type: "sync",
              icon: "🔄",
              text: window.t(
                "dashboard.activity.dataSync",
                "Data synced with cloud"
              ),
              timestamp: new Date(log.timestamp || Date.now()),
              badge: window.t("dashboard.activity.badges.sync", "Sync"),
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
          <div class="activity-text">${window.t(
            "dashboard.activity.noActivities",
            "No recent activities found"
          )}</div>
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
        <div class="activity-text">${window.t(
          "dashboard.activity.loadError",
          "Error loading activities"
        )}</div>
      </div>
    `;
    activityList.appendChild(errorItem);
  }
}

// Function to log a new activity
function logActivity(action, itemType, itemName, additionalInfo = {}) {
  try {
    // Translate badge text if provided
    if (additionalInfo.badge) {
      const badgeKey = `dashboard.activity.badges.${additionalInfo.badge.toLowerCase()}`;
      const translatedBadge = window.t(badgeKey, additionalInfo.badge);
      additionalInfo.badge = translatedBadge;
    }

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
    return translateTemplate("dashboard.time.today", "Today at {time}", {
      time: date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  } else if (dayDiff === 1) {
    // Yesterday
    return translateTemplate(
      "dashboard.time.yesterday",
      "Yesterday at {time}",
      {
        time: date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }
    );
  } else if (dayDiff < 7) {
    // Within the last week
    return translateTemplate("dashboard.time.daysAgo", "{days} days ago", {
      days: dayDiff,
    });
  } else {
    // Get current language
    const lang = localStorage.getItem("language") || "en";

    // Older than a week, show date
    try {
      return date.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      // Fallback to default
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
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

function getCurrentViewLabel() {
  if (currentChartView === "revenue") {
    return window.t("dashboard.chart.revenue", "Revenue ");
  } else if (currentChartView === "orders") {
    return window.t("dashboard.chart.orders", "Orders");
  } else {
    return window.t("dashboard.chart.productsSold", "Products Sold");
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

function processChartData(invoices) {
  // Default empty data
  if (!invoices.length) {
    return {
      labels: [window.t("dashboard.chart.noData", "No data")],
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
      labels: [
        window.t("dashboard.chart.noDataPeriod", "No data for selected period"),
      ],
      data: [0],
    };
  }

  // Get current language
  const lang = localStorage.getItem("language") || "en";
  const locale = lang === "ar" ? "ar-SA" : "en-US";

  // Group data by date
  const groupedData = {};
  let interval;

  if (currentChartPeriod === "week") {
    // Group by day for week view
    interval = "day";
    filteredInvoices.forEach((invoice) => {
      const date = new Date(invoice.createdAt || Date.now());
      try {
        const day = date.toLocaleDateString(locale, {
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
      } catch (e) {
        // Fallback to default locale if there's an error
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
      }
    });
  } else if (currentChartPeriod === "month") {
    // Group by chunks of days for month view (to reduce data points)
    interval = "day";
    filteredInvoices.forEach((invoice) => {
      const date = new Date(invoice.createdAt || Date.now());
      // Use 3-day chunks for month view to reduce number of bars
      const dayChunk = Math.floor(date.getDate() / 3) * 3;

      try {
        const monthName = date.toLocaleDateString(locale, { month: "short" });
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
      } catch (e) {
        // Fallback to default locale
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

        const productCount = invoice.items
          ? invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
          : 0;
        groupedData[chunk].products += productCount;
      }
    });
  } else {
    // Group by month for year view
    interval = "month";
    filteredInvoices.forEach((invoice) => {
      const date = new Date(invoice.createdAt || Date.now());
      try {
        const month = date.toLocaleDateString(locale, { month: "short" });

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
      } catch (e) {
        // Fallback to default locale
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

        const productCount = invoice.items
          ? invoice.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
          : 0;
        groupedData[month].products += productCount;
      }
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
                    label += "$" + formatCurrency(context.parsed.y);
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
    chartWrapper.innerHTML = `<div class="chart-error">${window.t(
      "dashboard.chart.error",
      "Error loading chart data"
    )}</div>`;
  }
}

// Update sales chart with real data
async function updateSalesChart() {
  try {
    if (!salesChart) {
      createAndUpdateChart();
      return;
    }

    // Use cached invoices if available, otherwise fetch
    const invoices = cachedInvoices || (await window.api.getInvoices()) || [];

    if (!invoices.length) {
      // No data available
      salesChart.data.labels = [
        window.t("dashboard.chart.noData", "No data available"),
      ];
      salesChart.data.datasets[0].data = [0];
      salesChart.update();
      return;
    }

    // Process data
    const { labels, data } = processChartData(invoices);

    // Update chart data
    salesChart.data.labels = labels;
    salesChart.data.datasets[0].label = getCurrentViewLabel();
    salesChart.data.datasets[0].data = data;
    salesChart.data.datasets[0].backgroundColor = getCurrentViewColor(0.6);
    salesChart.data.datasets[0].borderColor = getCurrentViewColor(1);

    // Update chart
    salesChart.update();
    console.log(
      `Updated sales chart: ${currentChartPeriod} / ${currentChartView}`
    );
  } catch (error) {
    console.error("Error updating sales chart:", error);
  }
}

if (!window.api) {
  window.api = {};
}

// Add the logActivity function to the API
window.api.logActivity = logActivity;
