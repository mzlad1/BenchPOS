// settings.js - Manages application settings functionality
// Update management in settings.js
let updateAvailable = false;
let updateDownloaded = false;

// Initialize update section
async function initUpdateSection() {
  // Get current version
  if (window.updates && window.updates.getCurrentVersion) {
    const version = await window.updates.getCurrentVersion();
    document.getElementById("current-version").textContent = version;
  }

  // Set up update status listener
  if (window.updates && window.updates.onUpdateStatus) {
    window.updates.onUpdateStatus(handleUpdateStatus);
  }

  // Set up button event listeners
  const checkButton = document.getElementById("check-updates-btn");
  const downloadButton = document.getElementById("download-update-btn");
  const installButton = document.getElementById("install-update-btn");

  if (checkButton) {
    checkButton.addEventListener("click", checkForUpdates);
  }

  if (downloadButton) {
    downloadButton.addEventListener("click", downloadUpdate);
  }

  if (installButton) {
    installButton.addEventListener("click", installUpdate);
  }
}

// Check for updates
async function checkForUpdates() {
  const statusMessage = document.getElementById("update-status-message");

  try {
    statusMessage.textContent = window.t
      ? window.t("settings.updates.checking")
      : "Checking for updates...";
    statusMessage.className = "info-message";

    if (window.updates && window.updates.checkForUpdates) {
      await window.updates.checkForUpdates();
    }
  } catch (error) {
    console.error("Error checking for updates:", error);
    statusMessage.textContent = error.message || "Error checking for updates";
    statusMessage.className = "error-message";
  }
}

// Download the update
async function downloadUpdate() {
  if (!updateAvailable) return;

  try {
    if (window.updates && window.updates.downloadUpdate) {
      await window.updates.downloadUpdate();

      // Show progress container
      const progressContainer = document.getElementById(
        "update-progress-container"
      );
      if (progressContainer) {
        progressContainer.style.display = "block";
      }
    }
  } catch (error) {
    console.error("Error downloading update:", error);
    const statusMessage = document.getElementById("update-status-message");
    statusMessage.textContent = error.message || "Error downloading update";
    statusMessage.className = "error-message";
  }
}

// Install the update
function installUpdate() {
  if (!updateDownloaded) return;

  try {
    if (window.updates && window.updates.quitAndInstall) {
      window.updates.quitAndInstall();
    }
  } catch (error) {
    console.error("Error installing update:", error);
    const statusMessage = document.getElementById("update-status-message");
    statusMessage.textContent = error.message || "Error installing update";
    statusMessage.className = "error-message";
  }
}

// Handle update status changes
function handleUpdateStatus(status) {
  const statusMessage = document.getElementById("update-status-message");
  const downloadButton = document.getElementById("download-update-btn");
  const installButton = document.getElementById("install-update-btn");
  const progressBar = document.getElementById("update-progress-bar");
  const progressText = document.getElementById("update-progress-text");
  const progressContainer = document.getElementById(
    "update-progress-container"
  );

  switch (status.status) {
    case "checking":
      statusMessage.textContent = window.t
        ? window.t("settings.updates.checking")
        : "Checking for updates...";
      statusMessage.className = "info-message";
      break;

    case "available":
      updateAvailable = true;
      statusMessage.textContent = window.t
        ? window.t("settings.updates.available", { version: status.version })
        : `Update available (v${status.version})`;
      statusMessage.className = "success-message";

      if (downloadButton) {
        downloadButton.style.display = "inline-block";
      }
      break;

    case "not-available":
      updateAvailable = false;
      statusMessage.textContent = window.t
        ? window.t("settings.updates.notAvailable")
        : "You are using the latest version";
      statusMessage.className = "info-message";

      if (downloadButton) {
        downloadButton.style.display = "none";
      }
      break;

    case "downloading":
      if (progressBar && status.progress) {
        const percent = Math.round(status.progress.percent);
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${percent}%`;
      }

      if (progressContainer) {
        progressContainer.style.display = "block";
      }

      statusMessage.textContent = window.t
        ? window.t("settings.updates.downloading")
        : "Downloading update...";
      break;

    case "downloaded":
      updateDownloaded = true;

      if (progressContainer) {
        progressContainer.style.display = "none";
      }

      if (downloadButton) {
        downloadButton.style.display = "none";
      }

      if (installButton) {
        installButton.style.display = "inline-block";
      }

      statusMessage.textContent = window.t
        ? window.t("settings.updates.downloaded")
        : "Update downloaded. Ready to install.";
      statusMessage.className = "success-message";
      break;

    case "error":
      statusMessage.textContent = status.message || "Update error";
      statusMessage.className = "error-message";
      break;
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Initialize layout
    await window.LayoutManager.init("settings");

    // Check if user is logged in
    const user = await window.api.getCurrentUser();
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    // Initialize i18n if available
    if (window.i18n) {
      const languageSelect = document.getElementById("language-select");
      const currentLanguage = languageSelect
        ? languageSelect.value
        : localStorage.getItem("language") || "en";
      await window.i18n.init(currentLanguage);
    }

    // Explicitly mark this page's nav item as active
    const settingsLink = document.getElementById("nav-settings");
    if (settingsLink) {
      document.querySelectorAll(".menu-item").forEach((item) => {
        item.classList.remove("active");
      });
      settingsLink.classList.add("active");
    }

    // Load saved settings
    loadSettings();

    // Set up event listeners
    setupEventListeners();

    // Initialize receipt preview
    setTimeout(updateReceiptPreview, 500);

    // Apply translations to the page
    if (window.i18n) {
      window.i18n.updatePageContent();

      // Also ensure our dynamic content has translations applied
      updateI18nForDynamicContent();
    }
    initialLoadTranslations();
    initUpdateSection();
    console.log("Settings page initialized");
  } catch (error) {
    console.error("Error initializing settings page:", error);
    alert(
      window.t
        ? window.t("settings.initError")
        : "An error occurred while loading settings. Please try again."
    );
  }
});

function updateI18nForDynamicContent() {
  if (window.i18n && window.i18n.updatePageContent) {
    // Update all elements with data-i18n attributes
    window.i18n.updatePageContent();

    // Specifically handle any elements that might need special processing
    const tabButtons = document.querySelectorAll(".tab-btn");
    tabButtons.forEach((button) => {
      const key = button.getAttribute("data-i18n");
      if (key && window.t) {
        button.textContent = window.t(key);
      }
    });

    // Update card headers
    const cardHeaders = document.querySelectorAll(".receipt-card-header h4");
    cardHeaders.forEach((header) => {
      const key = header.getAttribute("data-i18n");
      if (key && window.t) {
        header.textContent = window.t(key);
      }
    });
  }
}
// Format currency based on user settings
function formatCurrency(amount) {
  const currency = localStorage.getItem("currency") || "USD";
  const symbol = currency === "ILS" ? "₪" : "$";
  return `${symbol}${parseFloat(amount).toFixed(2)}`;
}
// Load all saved settings
function loadSettings() {
  try {
    // Theme settings
    const darkMode = localStorage.getItem("darkMode") === "true";
    const themeSelect = document.getElementById("theme-select");
    if (themeSelect) {
      if (localStorage.getItem("themePreference") === "system") {
        themeSelect.value = "system";
      } else {
        themeSelect.value = darkMode ? "dark" : "light";
      }
    }

    // Load logo if exists
    const logoPreview = document.getElementById("logo-preview");
    if (logoPreview) {
      const savedLogo = localStorage.getItem("companyLogo");
      if (savedLogo) {
        logoPreview.innerHTML = `<img src="${savedLogo}" alt="Company Logo">`;
      } else {
        const noLogoText = window.t
          ? window.t("settings.receipt.noLogo")
          : "No logo uploaded";
        logoPreview.innerHTML = `<div class="default-logo-text">${noLogoText}</div>`;
      }
    }

    // Sidebar settings
    const sidebarCollapsed =
      localStorage.getItem("sidebarCollapsed") === "true";
    const sidebarCheckbox = document.getElementById("sidebar-collapsed");
    if (sidebarCheckbox) {
      sidebarCheckbox.checked = sidebarCollapsed;
    }

    // Regional settings
    const languageSelect = document.getElementById("language-select");
    if (languageSelect) {
      const savedLanguage = localStorage.getItem("language") || "en";
      languageSelect.value = savedLanguage;

      // Add change event listener for language switching
      languageSelect.addEventListener("change", async function () {
        const newLanguage = this.value;

        // Change language immediately
        if (window.i18n) {
          await window.i18n.changeLanguage(newLanguage, true);
        }

        // Update direction if needed
        if (window.LayoutManager) {
          window.LayoutManager.applyLanguageDirection();
        }
      });
    }

    const currencySelect = document.getElementById("currency-select");
    if (currencySelect) {
      currencySelect.value = localStorage.getItem("currency") || "USD";
    }

    const dateFormatSelect = document.getElementById("date-format-select");
    if (dateFormatSelect) {
      dateFormatSelect.value =
        localStorage.getItem("dateFormat") || "MM/DD/YYYY";
    }

    // Data management settings
    const autoSync = localStorage.getItem("autoSync") === "true";
    const autoSyncCheckbox = document.getElementById("auto-sync");
    if (autoSyncCheckbox) {
      autoSyncCheckbox.checked = autoSync;
    }

    const syncIntervalSelect = document.getElementById("sync-interval-select");
    if (syncIntervalSelect) {
      syncIntervalSelect.value = localStorage.getItem("syncInterval") || "30";
    }

    const dataStoragePath = document.getElementById("data-storage-path");
    if (dataStoragePath) {
      dataStoragePath.value =
        localStorage.getItem("dataStoragePath") || "Default Location";
    }

    // Receipt settings
    const companyName = document.getElementById("company-name");
    if (companyName) {
      companyName.value = localStorage.getItem("companyName") || "";
    }

    const companyTagline = document.getElementById("company-tagline");
    if (companyTagline) {
      companyTagline.value =
        localStorage.getItem("companyTagline") || "Retail Solutions";
    }

    const companyAddress = document.getElementById("company-address");
    if (companyAddress) {
      companyAddress.value = localStorage.getItem("companyAddress") || "";
    }

    const companyPhone = document.getElementById("company-phone");
    if (companyPhone) {
      companyPhone.value = localStorage.getItem("companyPhone") || "";
    }

    const companyEmail = document.getElementById("company-email");
    if (companyEmail) {
      companyEmail.value = localStorage.getItem("companyEmail") || "";
    }

    const companyWebsite = document.getElementById("company-website");
    if (companyWebsite) {
      companyWebsite.value = localStorage.getItem("companyWebsite") || "";
    }

    const receiptFooter = document.getElementById("receipt-footer");
    if (receiptFooter) {
      receiptFooter.value =
        localStorage.getItem("receiptFooter") || "Thank you for your business!";
    }

    const returnPolicy = document.getElementById("return-policy");
    if (returnPolicy) {
      returnPolicy.value =
        localStorage.getItem("returnPolicy") ||
        "Items can be returned within 30 days with receipt.";
    }

    const receiptTheme = document.getElementById("receipt-theme");
    if (receiptTheme) {
      receiptTheme.value = localStorage.getItem("receiptTheme") || "#3d5a80";
    }

    const autoPrint = localStorage.getItem("autoPrint") === "true";
    const autoPrintCheckbox = document.getElementById("auto-print");
    if (autoPrintCheckbox) {
      autoPrintCheckbox.checked = autoPrint;
    }

    console.log("Settings loaded successfully");
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

/* Additional event listener in settings.js */
document
  .getElementById("update-preview")
  .addEventListener("click", updateReceiptPreview);

function handleLogoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Check file type
  const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/svg+xml"];
  if (!validTypes.includes(file.type)) {
    showToast("notifications.invalidType", "error");
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    const logoData = e.target.result;

    // Preview the logo
    const logoPreview = document.getElementById("logo-preview");
    logoPreview.innerHTML = `<img src="${logoData}" alt="Company Logo">`;

    // Store in localStorage
    localStorage.setItem("companyLogo", logoData);

    showToast("notifications.logoUploaded", "success");
  };

  reader.onerror = function () {
    showToast("notifications.logoError", "error");
  };

  reader.readAsDataURL(file);
}

function removeLogo() {
  // Remove from preview
  const logoPreview = document.getElementById("logo-preview");
  const noLogoText = window.t
    ? window.t("settings.receipt.noLogo")
    : "No logo uploaded";
  logoPreview.innerHTML = `<div class="default-logo-text">${noLogoText}</div>`;

  // Remove from storage
  localStorage.removeItem("companyLogo");

  // Clear file input
  const fileInput = document.getElementById("logo-file");
  if (fileInput) {
    fileInput.value = "";
  }

  showToast("notifications.logoRemoved", "success");
}

// Save all settings
function saveSettings() {
  try {
    // Theme settings
    const themeSelect = document.getElementById("theme-select");
    if (themeSelect) {
      localStorage.setItem("themePreference", themeSelect.value);

      if (themeSelect.value === "system") {
        // Use system preference (check media query)
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        localStorage.setItem("darkMode", prefersDark);

        // Apply theme
        document.body.classList.toggle("dark-mode", prefersDark);
        document.body.classList.toggle("light-mode", !prefersDark);
      } else {
        // Use selected theme
        const isDarkMode = themeSelect.value === "dark";
        localStorage.setItem("darkMode", isDarkMode);

        // Apply theme
        document.body.classList.toggle("dark-mode", isDarkMode);
        document.body.classList.toggle("light-mode", !isDarkMode);
      }
    }

    // Sidebar settings
    const sidebarCheckbox = document.getElementById("sidebar-collapsed");
    if (sidebarCheckbox) {
      localStorage.setItem("sidebarCollapsed", sidebarCheckbox.checked);

      // Apply sidebar state
      const sidebar = document.getElementById("sidebar");
      if (sidebar) {
        if (sidebarCheckbox.checked) {
          sidebar.classList.add("collapsed");
        } else {
          sidebar.classList.remove("collapsed");
        }
      }
    }

    // Regional settings
    const languageSelect = document.getElementById("language-select");
    if (languageSelect) {
      const newLanguage = languageSelect.value;
      const oldLanguage = localStorage.getItem("language") || "en";

      // Only update if language changed
      if (newLanguage !== oldLanguage) {
        localStorage.setItem("language", newLanguage);

        // Use i18n change language function if available
        if (window.i18n) {
          window.i18n.changeLanguage(newLanguage, false); // Don't refresh yet
        }
      }
    }

    const currencySelect = document.getElementById("currency-select");
    if (currencySelect) {
      localStorage.setItem("currency", currencySelect.value);
    }

    const dateFormatSelect = document.getElementById("date-format-select");
    if (dateFormatSelect) {
      localStorage.setItem("dateFormat", dateFormatSelect.value);
    }

    // Data management settings
    const autoSyncCheckbox = document.getElementById("auto-sync");
    if (autoSyncCheckbox) {
      localStorage.setItem("autoSync", autoSyncCheckbox.checked);
    }

    const syncIntervalSelect = document.getElementById("sync-interval-select");
    if (syncIntervalSelect) {
      localStorage.setItem("syncInterval", syncIntervalSelect.value);
    }

    const dataStoragePath = document.getElementById("data-storage-path");
    if (dataStoragePath) {
      localStorage.setItem("dataStoragePath", dataStoragePath.value);
    }

    // Receipt settings
    const companyName = document.getElementById("company-name");
    if (companyName) {
      localStorage.setItem("companyName", companyName.value);
    }

    const companyTagline = document.getElementById("company-tagline");
    if (companyTagline) {
      localStorage.setItem("companyTagline", companyTagline.value);
    }

    const companyAddress = document.getElementById("company-address");
    if (companyAddress) {
      localStorage.setItem("companyAddress", companyAddress.value);
    }

    const companyPhone = document.getElementById("company-phone");
    if (companyPhone) {
      localStorage.setItem("companyPhone", companyPhone.value);
    }

    const companyEmail = document.getElementById("company-email");
    if (companyEmail) {
      localStorage.setItem("companyEmail", companyEmail.value);
    }

    const companyWebsite = document.getElementById("company-website");
    if (companyWebsite) {
      localStorage.setItem("companyWebsite", companyWebsite.value);
    }

    const receiptFooter = document.getElementById("receipt-footer");
    if (receiptFooter) {
      localStorage.setItem("receiptFooter", receiptFooter.value);
    }

    const returnPolicy = document.getElementById("return-policy");
    if (returnPolicy) {
      localStorage.setItem("returnPolicy", returnPolicy.value);
    }

    const receiptTheme = document.getElementById("receipt-theme");
    if (receiptTheme) {
      localStorage.setItem("receiptTheme", receiptTheme.value);
    }

    const autoPrintCheckbox = document.getElementById("auto-print");
    if (autoPrintCheckbox) {
      localStorage.setItem("autoPrint", autoPrintCheckbox.checked);
    }

    // Add receipt preview functionality
    updateReceiptPreview();

    // Log the save activity
    if (window.api && window.api.logActivity) {
      window.api.logActivity("update", "settings", "System Settings", {
        text: window.t
          ? window.t("settings.saveSuccess")
          : "System settings updated",
        icon: "⚙️",
        badge: window.t ? window.t("settings.title") : "Settings",
        badgeClass: "badge-info",
      });
    }

    // Show success message
    showToast("settings.saveSuccess", "success");
    console.log("Settings saved successfully");
  } catch (error) {
    console.error("Error saving settings:", error);
    showToast("settings.saveError", "error");
  }
}

// Reset settings to defaults
function resetSettings() {
  try {
    // Ask for confirmation
    const confirmMessage = window.t
      ? window.t("settings.confirmReset")
      : "Are you sure you want to reset all settings to default values?";
    if (!confirm(confirmMessage)) {
      return;
    }

    // Default values
    const defaults = {
      // Previous defaults...
      themePreference: "light",
      darkMode: false,
      sidebarCollapsed: false,
      language: "en",
      currency: "USD",
      dateFormat: "MM/DD/YYYY",
      autoSync: true,
      syncInterval: "30",
      dataStoragePath: "Default Location",

      // Receipt defaults
      companyName: "ShopSmart",
      companyTagline: "Retail Solutions",
      companyAddress: "123 Main Street, Anytown, USA 12345",
      companyPhone: "(555) 123-4567",
      companyEmail: "info@shopsmart.com",
      companyWebsite: "www.shopsmart.com",
      receiptFooter: "Thank you for shopping at ShopSmart!",
      returnPolicy: "Items can be returned within 30 days with receipt.",
      receiptTheme: "#3d5a80",
      autoPrint: false,
    };

    // Clear all existing settings
    for (const key in defaults) {
      localStorage.setItem(key, defaults[key]);
    }

    // If language changed, update i18n
    const currentLanguage = localStorage.getItem("language") || "en";
    if (window.i18n && currentLanguage !== "en") {
      window.i18n.changeLanguage("en", true);
    }

    // Reload settings in the UI
    loadSettings();

    // Update receipt preview
    updateReceiptPreview();

    // Log the reset activity
    if (window.api && window.api.logActivity) {
      window.api.logActivity("update", "settings", "System Settings", {
        text: window.t
          ? window.t("settings.resetSuccess")
          : "System settings reset to defaults",
        icon: "⚙️",
        badge: window.t ? window.t("common.reset") : "Reset",
        badgeClass: "badge-warning",
      });
    }

    // Reset logo
    localStorage.removeItem("companyLogo");
    const logoPreview = document.getElementById("logo-preview");
    if (logoPreview) {
      const noLogoText = window.t
        ? window.t("settings.receipt.noLogo")
        : "No logo uploaded";
      logoPreview.innerHTML = `<div class="default-logo-text">${noLogoText}</div>`;
    }

    // Show success message
    showToast("settings.resetSuccess", "success");
    console.log("Settings reset to defaults");
  } catch (error) {
    console.error("Error resetting settings:", error);
    showToast("settings.resetError", "error");
  }
}

// Add this to settings.js
// Add this to settings.js
function previewReceiptTemplate(invoice) {
  // Get language setting
  const language = localStorage.getItem("language") || "en";
  const isRTL = language === "ar";

  // Get custom settings from localStorage
  const companyName = localStorage.getItem("companyName") || "ShopSmart";
  const companyTagline =
    localStorage.getItem("companyTagline") || "Retail Solutions";
  const companyAddress =
    localStorage.getItem("companyAddress") ||
    "123 Main Street, Anytown, USA 12345";
  const companyPhone = localStorage.getItem("companyPhone") || "(555) 123-4567";
  const companyEmail =
    localStorage.getItem("companyEmail") || "info@shopsmart.com";
  const companyWebsite =
    localStorage.getItem("companyWebsite") || "www.shopsmart.com";
  const receiptFooter =
    localStorage.getItem("receiptFooter") ||
    "Thank you for shopping at ShopSmart!";
  const returnPolicy =
    localStorage.getItem("returnPolicy") ||
    "Items can be returned within 30 days with receipt.";
  const themeColor = localStorage.getItem("receiptTheme") || "#3d5a80";
  const customLogo = localStorage.getItem("companyLogo");

  // Format the date
  const receiptDate = new Date(invoice.date);
  const dateOptions = { year: "numeric", month: "long", day: "numeric" };
  const timeOptions = { hour: "2-digit", minute: "2-digit" };

  // Format date based on language
  const formattedDate = isRTL
    ? receiptDate.toLocaleDateString("ar-SA", dateOptions)
    : receiptDate.toLocaleDateString("en-US", dateOptions);

  const formattedTime = isRTL
    ? receiptDate.toLocaleTimeString("ar-SA", timeOptions)
    : receiptDate.toLocaleTimeString("en-US", timeOptions);

  // Prepare logo - either custom or text
  let logoHtml;
  if (customLogo) {
    // Use the custom uploaded logo
    logoHtml = `<img src="${customLogo}" alt="${companyName}" style="max-width: 180px; max-height: 60px;" />`;
  } else {
    // Use text as fallback
    logoHtml = `<div style="font-size: 24px; font-weight: bold; color: ${themeColor};">${companyName}</div>
                <div style="font-size: 12px; color: #666;">${companyTagline}</div>`;
  }

  // Apply RTL direction for Arabic
  const rtlStyle = isRTL ? "direction: rtl; text-align: right;" : "";
  const textAlignEnd = isRTL ? "text-align: left;" : "text-align: right;";
  const textAlignStart = isRTL ? "text-align: right;" : "text-align: left;";

  // Generate receipt items HTML with translations
  const itemsHtml = invoice.items
    .map(
      (item) => `
      <tr>
        <td style="${textAlignStart}">${item.name}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="${textAlignEnd}">${formatCurrency(item.price)}</td>
        <td style="${textAlignEnd}">${formatCurrency(
        item.price * item.quantity
      )}</td>
      </tr>
    `
    )
    .join("");

  // Translate static text using t() function
  const receiptLabel = window.t ? window.t("billing.receipt.sale") : "RECEIPT";
  const receiptNumberLabel = window.t
    ? window.t("billing.receipt.receiptNumber")
    : "Receipt #:";
  const dateLabel = window.t ? window.t("billing.receipt.date") : "Date:";
  const timeLabel = window.t ? window.t("billing.receipt.time") : "Time:";
  const customerLabel = window.t
    ? window.t("billing.receipt.customer")
    : "Customer:";
  const itemLabel = window.t ? window.t("billing.receipt.item") : "Item";
  const qtyLabel = window.t ? window.t("billing.receipt.qty") : "Qty";
  const priceLabel = window.t ? window.t("billing.receipt.price") : "Price";
  const totalLabel = window.t ? window.t("billing.receipt.total") : "Total";
  const subtotalLabel = window.t
    ? window.t("billing.receipt.subtotal")
    : "Subtotal:";
  const discountLabel = window.t
    ? window.t("billing.receipt.discount")
    : "Discount:";
  const taxLabel = window.t ? window.t("billing.receipt.tax") : "Tax:";
  const totalLabelBold = window.t
    ? window.t("billing.receipt.total")
    : "TOTAL:";
  const paymentMethodLabel = window.t
    ? window.t("billing.receipt.paymentMethod")
    : "Payment Method:";
  const cashLabel = window.t ? window.t("billing.receipt.cash") : "Cash";
  const amountTenderedLabel = window.t
    ? window.t("billing.receipt.amountTendered")
    : "Amount Tendered:";
  const changeLabel = window.t ? window.t("billing.receipt.change") : "Change:";
  const customerSupportLabel = window.t
    ? window.t("billing.receipt.customerSupport")
    : "Customer support:";
  const poweredByLabel = window.t
    ? window.t("billing.receipt.poweredBy")
    : "Powered by MZLAD Billing System v2.1";
  const phoneLabel = window.t ? window.t("billing.receipt.phone") : "Tel:";
  const emailLabel = window.t ? window.t("billing.receipt.email") : "Email:";

  // Generate receipt HTML with proper RTL support
  return `
    <div class="professional-receipt" style="font-family: ${
      isRTL ? "Amiri, Arial" : "Arial"
    }, sans-serif; max-width: 300px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; ${rtlStyle}">
      <div style="text-align: center; margin-bottom: 15px;">
        ${logoHtml}
      </div>
      
      <div style="text-align: center; margin-bottom: 10px; font-size: 11px;">
        <p style="margin: 2px 0;">${companyAddress}</p>
        <p style="margin: 2px 0;">${phoneLabel} ${companyPhone} | ${emailLabel} ${companyEmail}</p>
        <p style="margin: 2px 0;">${companyWebsite}</p>
      </div>
      
      <div style="background-color: #f0f0f0; padding: 3px; text-align: center; font-weight: bold; border-radius: 4px; margin: 8px 0;">
        ${receiptLabel}
      </div>
      
      <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; margin: 3px 0;">
          <div style="font-weight: bold;">${receiptNumberLabel}</div>
          <div>${invoice.id}</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 3px 0;">
          <div style="font-weight: bold;">${dateLabel}</div>
          <div>${formattedDate}</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 3px 0;">
          <div style="font-weight: bold;">${timeLabel}</div>
          <div>${formattedTime}</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 3px 0;">
          <div style="font-weight: bold;">${customerLabel}</div>
          <div>${invoice.customer}</div>
        </div>
      </div>
      
      <div style="border-bottom: 1px dashed #aaa; margin: 10px 0;"></div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        <tr>
          <th style="${textAlignStart} padding-bottom: 5px; border-bottom: 1px solid ${themeColor};">${itemLabel}</th>
          <th style="text-align: center; padding-bottom: 5px; border-bottom: 1px solid ${themeColor};">${qtyLabel}</th>
          <th style="${textAlignEnd} padding-bottom: 5px; border-bottom: 1px solid ${themeColor};">${priceLabel}</th>
          <th style="${textAlignEnd} padding-bottom: 5px; border-bottom: 1px solid ${themeColor};">${totalLabel}</th>
        </tr>
        
        ${itemsHtml}
        
        <tr>
          <td colspan="3" style="${textAlignEnd} padding-top: 5px;">${subtotalLabel}</td>
          <td style="${textAlignEnd} padding-top: 5px;">${formatCurrency(
    invoice.subtotal
  )}</td>
        </tr>
        
        ${
          invoice.discount
            ? `
        <tr>
          <td colspan="3" style="${textAlignEnd} padding-top: 5px;">${discountLabel}</td>
          <td style="${textAlignEnd} padding-top: 5px; color: #d32f2f;">-${formatCurrency(
                invoice.discount
              )}</td>
        </tr>
        `
            : ""
        }
        
        <tr>
          <td colspan="3" style="${textAlignEnd} padding-top: 5px;">${taxLabel}</td>
          <td style="${textAlignEnd} padding-top: 5px;">${formatCurrency(
    invoice.tax
  )}</td>
        </tr>
        
        <tr>
          <td colspan="3" style="${textAlignEnd} padding-top: 8px; font-weight: bold;">${totalLabelBold}</td>
          <td style="${textAlignEnd} padding-top: 8px; font-weight: bold; color: ${themeColor};">${formatCurrency(
    invoice.total
  )}</td>
        </tr>
      </table>
      
      <div style="border-bottom: 1px dashed #aaa; margin: 10px 0;"></div>
      
      <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; margin: 3px 0;">
          <div style="font-weight: bold;">${paymentMethodLabel}</div>
          <div>${cashLabel}</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 3px 0;">
          <div style="font-weight: bold;">${amountTenderedLabel}</div>
          <div>${formatCurrency(Math.ceil(invoice.total / 5) * 5)}</div>
        </div>
        <div style="display: flex; justify-content: space-between; margin: 3px 0;">
          <div style="font-weight: bold;">${changeLabel}</div>
          <div>${formatCurrency(
            Math.ceil(invoice.total / 5) * 5 - invoice.total
          )}</div>
        </div>
      </div>
      
      <div style="border-bottom: 1px dashed #aaa; margin: 10px 0;"></div>
      
      <div style="text-align: center; font-size: 10px;">
        <p style="font-size: 12px; font-weight: bold; margin: 10px 0 5px; color: ${themeColor};">${receiptFooter}</p>
        <p style="margin: 5px 0;">${returnPolicy}</p>
        <p style="margin: 5px 0;">${customerSupportLabel} ${companyEmail}</p>
        <p style="margin-top: 15px; font-size: 9px; color: #999;">${poweredByLabel}</p>
      </div>
    </div>
  `;
}

// Update function to load Arabic font if needed
function updateReceiptPreview() {
  const previewContainer = document.getElementById("receipt-preview-container");
  if (!previewContainer) return;

  // Add Arabic font if language is Arabic
  const language = localStorage.getItem("language") || "en";
  if (language === "ar") {
    // Check if Arabic font is already loaded
    const fontLink = document.getElementById("arabic-font-link-preview");
    if (!fontLink) {
      const link = document.createElement("link");
      link.id = "arabic-font-link-preview";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap";
      document.head.appendChild(link);
    }
  }

  // Create sample invoice data for preview
  const sampleInvoice = {
    id: "PREVIEW-1234",
    date: new Date().toISOString(),
    customer: "Sample Customer",
    items: [
      {
        name: "Product Sample",
        price: 19.99,
        quantity: 1,
      },
      {
        name: "Second Item",
        price: 9.99,
        quantity: 2,
      },
    ],
    subtotal: 39.97,
    discount: 10.0,
    tax: 3.0,
    total: 32.97,
  };

  // Use our enhanced preview function
  try {
    const receiptHtml = previewReceiptTemplate(sampleInvoice);
    previewContainer.innerHTML = receiptHtml;
  } catch (error) {
    console.error("Error generating receipt preview:", error);
    previewContainer.innerHTML =
      "<div style='padding: 20px; color: red;'>" +
      (window.t
        ? window.t("receipt.previewError")
        : "Could not generate receipt preview") +
      "</div>";
  }
}
function formatCurrency(amount) {
  const currency = localStorage.getItem("currency") || "USD";
  const symbol = currency === "ILS" ? "₪" : "$";
  return `${symbol}${parseFloat(amount).toFixed(2)}`;
}
// Update the updateReceiptPreview function
// function updateReceiptPreview() {
//   const previewContainer = document.getElementById("receipt-preview-container");
//   if (!previewContainer) return;

//   // Create sample invoice data for preview
//   const sampleInvoice = {
//     id: "PREVIEW-1234",
//     date: new Date().toISOString(),
//     customer: "Sample Customer",
//     items: [
//       {
//         name: "Product Sample",
//         price: 19.99,
//         quantity: 1,
//       },
//       {
//         name: "Second Item",
//         price: 9.99,
//         quantity: 2,
//       },
//     ],
//     subtotal: 39.97,
//     discount: 10.0,
//     tax: 3.0,
//     total: 32.97,
//   };

//   // Use our simplified preview function
//   try {
//     const receiptHtml = previewReceiptTemplate(sampleInvoice);
//     previewContainer.innerHTML = receiptHtml;
//   } catch (error) {
//     console.error("Error generating receipt preview:", error);
//     previewContainer.innerHTML =
//       "<div style='padding: 20px; color: red;'>" +
//       (window.t
//         ? window.t("receipt.previewError")
//         : "Could not generate receipt preview") +
//       "</div>";
//   }
// }
function setupTabsNavigation() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons and contents
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));

      // Add active class to clicked button
      button.classList.add("active");

      // Show the corresponding tab content
      const tabId = button.getAttribute("data-tab");
      document.getElementById(tabId).classList.add("active");

      // If it's the receipt tab, update the preview
      if (tabId === "receipt-tab") {
        setTimeout(updateReceiptPreview, 100);
      }
    });
  });
}
// Setup all event listeners
function setupEventListeners() {
  // Add language change listener for receipt preview
  const languageSelect = document.getElementById("language-select");
  if (languageSelect) {
    languageSelect.addEventListener("change", function () {
      // Update receipt preview after language change
      setTimeout(updateReceiptPreview, 300);
    });
  }
  // Logo upload handlers
  // Logo upload handlers
  const browseLogoButton = document.getElementById("browse-logo");
  if (browseLogoButton) {
    browseLogoButton.addEventListener("click", function () {
      document.getElementById("logo-file").click();
    });
  }

  const logoFileInput = document.getElementById("logo-file");
  if (logoFileInput) {
    logoFileInput.addEventListener("change", handleLogoUpload);
  }

  const removeLogoButton = document.getElementById("remove-logo");
  if (removeLogoButton) {
    removeLogoButton.addEventListener("click", removeLogo);
  }

  // Save settings button
  const saveButton = document.getElementById("save-settings");
  if (saveButton) {
    saveButton.addEventListener("click", saveSettings);
  }

  // Reset settings button
  const resetButton = document.getElementById("reset-settings");
  if (resetButton) {
    resetButton.addEventListener("click", resetSettings);
  }

  // Browse for data storage path
  const browseButton = document.getElementById("browse-data-path");
  if (browseButton) {
    browseButton.addEventListener("click", browseFolderPath);
  }

  // Theme select preview
  const themeSelect = document.getElementById("theme-select");
  if (themeSelect) {
    themeSelect.addEventListener("change", previewTheme);
  }

  // Add real-time updating for receipt preview
  const receiptInputs = document.querySelectorAll(
    "#receipt-tab input, #receipt-tab textarea, #receipt-tab select"
  );
  receiptInputs.forEach((input) => {
    input.addEventListener("change", updateReceiptPreview);
    input.addEventListener("input", debounce(updateReceiptPreview, 500));
  });

  // Setup tabs navigation
  setupTabsNavigation();
}
function initialLoadTranslations() {
  // Force reload all translations
  if (window.i18n && window.i18n.reloadResources) {
    const lang = localStorage.getItem("language") || "en";
    window.i18n.reloadResources(lang).then(() => {
      window.i18n.updatePageContent();
    });
  }
}
function debounce(func, delay) {
  let timeout;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}
// Preview theme before saving
function previewTheme() {
  const themeSelect = document.getElementById("theme-select");

  if (themeSelect.value === "system") {
    // Use system preference (check media query)
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    // Apply theme
    document.body.classList.toggle("dark-mode", prefersDark);
    document.body.classList.toggle("light-mode", !prefersDark);
  } else {
    // Use selected theme
    const isDarkMode = themeSelect.value === "dark";

    // Apply theme
    document.body.classList.toggle("dark-mode", isDarkMode);
    document.body.classList.toggle("light-mode", !isDarkMode);
  }
}

// Browse for folder path
async function browseFolderPath() {
  try {
    // Check if the dialog API is available
    if (window.api && window.api.showFolderDialog) {
      const result = await window.api.showFolderDialog();

      if (result && result.filePaths && result.filePaths.length > 0) {
        const pathInput = document.getElementById("data-storage-path");
        if (pathInput) {
          pathInput.value = result.filePaths[0];
        }
      }
    } else {
      // Fallback for when the API is not available
      alert(
        window.t
          ? window.t("settings.folderSelectNotAvailable")
          : "Folder selection is not available in this version."
      );
    }
  } catch (error) {
    console.error("Error selecting folder:", error);
    alert(
      window.t
        ? window.t("settings.folderSelectError")
        : "An error occurred while selecting a folder."
    );
  }
}

// Show toast notification
function showToast(messageKey, type = "info", params = {}) {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  // Get translated message if i18n is available
  let message = messageKey;
  if (window.t) {
    message = window.t(messageKey, params);
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Add toast to container
  toastContainer.appendChild(toast);

  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.classList.add("toast-hiding");
    setTimeout(() => {
      if (toast.parentNode === toastContainer) {
        toastContainer.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

// Add some CSS for toast notifications
const toastStyles = document.createElement("style");
toastStyles.textContent = `
.toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.toast {
    padding: 12px 20px;
    border-radius: 4px;
    background-color: var(--base-100);
    color: var(--text-primary);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    opacity: 1;
    transition: opacity 0.3s ease;
    max-width: 300px;
}

.toast-success {
    border-left: 4px solid var(--success);
    background-color: rgba(16, 185, 129, 0.1);
}

.toast-error {
    border-left: 4px solid var(--danger);
    background-color: rgba(239, 68, 68, 0.1);
}

.toast-warning {
    border-left: 4px solid var(--warning);
    background-color: rgba(245, 158, 11, 0.1);
}

.toast-info {
    border-left: 4px solid var(--info);
    background-color: rgba(59, 130, 246, 0.1);
}

.toast-hiding {
    opacity: 0;
}

/* Settings page styling */
.settings-container {
    padding: 1.5rem;
}

.settings-header {
    margin-bottom: 1.5rem;
}

.settings-header h2 {
    margin: 0 0 0.5rem 0;
    color: var(--text-primary);
}

.settings-header p {
    color: var(--text-secondary);
    margin: 0;
}

.settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 1.5rem;
}

.settings-section {
    background-color: var(--base-100);
    border-radius: 0.5rem;
    padding: 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.settings-section-header {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
    gap: 0.75rem;
}

.settings-icon {
    font-size: 1.5rem;
}

.settings-section-header h3 {
    margin: 0;
    font-size: 1.25rem;
}

.settings-option {
    margin-bottom: 1rem;
}

.settings-option label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
    font-weight: 500;
}

.settings-option input[type="text"],
.settings-option textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.25rem;
    background-color: var(--base-200);
    color: var(--text-primary);
}

.settings-option textarea {
    resize: vertical;
}

.select-wrapper {
    position: relative;
}

.select-wrapper select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 0.25rem;
    background-color: var(--base-200);
    color: var(--text-primary);
    appearance: none;
}

.select-wrapper::after {
    content: '▼';
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
    pointer-events: none;
}

.toggle-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.toggle {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 20px;
}

.toggle input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--base-300);
    transition: .4s;
    border-radius: 34px;
}

.toggle-slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 2px;
    bottom: 2px;
    background-color: var(--base-100);
    transition: .4s;
    border-radius: 50%;
}

input:checked + .toggle-slider {
    background-color: var(--primary);
}

input:checked + .toggle-slider:before {
    transform: translateX(20px);
}

.input-action {
    display: flex;
    gap: 0.5rem;
}

.input-action input {
    flex: 1;
}

.settings-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
}

/* Custom Scrollbar Styles */

/* For WebKit browsers (Chrome, Safari) */
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: var(--base-200, rgba(0, 0, 0, 0.05));
  border-radius: 8px;
}

::-webkit-scrollbar-thumb {
  background: var(--primary-light, rgba(99, 102, 241, 0.3));
  border-radius: 8px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--primary, #6366f1);
  border: 2px solid transparent;
  background-clip: padding-box;
}

/* For Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--primary-light, rgba(99, 102, 241, 0.3)) var(--base-200, rgba(0, 0, 0, 0.05));
}

/* Specific scrollable elements */
.help-container,
.settings-container,
.chat-messages,
.activity-list,
.topic-content-container,
.search-results-container,
.support-modal-body,
.faq-answer,
.nav-menu {
  scrollbar-width: thin;
  scrollbar-color: var(--primary-light, rgba(99, 102, 241, 0.3)) var(--base-200, rgba(0, 0, 0, 0.05));
  overflow-y: auto;
}

/* Dark mode adjustments */
.dark-mode ::-webkit-scrollbar-track {
  background: var(--base-300, rgba(0, 0, 0, 0.1));
}

.dark-mode ::-webkit-scrollbar-thumb {
  background: var(--primary-dark, rgba(99, 102, 241, 0.5));
}

.dark-mode ::-webkit-scrollbar-thumb:hover {
  background: var(--primary, #6366f1);
}

.dark-mode * {
  scrollbar-color: var(--primary-dark, rgba(99, 102, 241, 0.5)) var(--base-300, rgba(0, 0, 0, 0.1));
}

/* Custom scrollable areas */
.scrollable-area {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 5px; /* Add some space for the scrollbar */
}

/* Remove outline on scrollable elements when focused */
.scrollable-area:focus {
  outline: none;
}

/* Smooth scrolling for whole page */
html {
  scroll-behavior: smooth;
}
`;

document.head.appendChild(toastStyles);
