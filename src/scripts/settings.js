// settings.js - Manages application settings functionality

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

    console.log("Settings page initialized");
  } catch (error) {
    console.error("Error initializing settings page:", error);
    alert("An error occurred while loading settings. Please try again.");
  }
});

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
      languageSelect.value = localStorage.getItem("language") || "en";
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

    const companyAddress = document.getElementById("company-address");
    if (companyAddress) {
      companyAddress.value = localStorage.getItem("companyAddress") || "";
    }

    const receiptFooter = document.getElementById("receipt-footer");
    if (receiptFooter) {
      receiptFooter.value =
        localStorage.getItem("receiptFooter") || "Thank you for your business!";
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
      localStorage.setItem("language", languageSelect.value);
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

    const companyAddress = document.getElementById("company-address");
    if (companyAddress) {
      localStorage.setItem("companyAddress", companyAddress.value);
    }

    const receiptFooter = document.getElementById("receipt-footer");
    if (receiptFooter) {
      localStorage.setItem("receiptFooter", receiptFooter.value);
    }

    const autoPrintCheckbox = document.getElementById("auto-print");
    if (autoPrintCheckbox) {
      localStorage.setItem("autoPrint", autoPrintCheckbox.checked);
    }

    // Log the save activity
    if (window.api && window.api.logActivity) {
      window.api.logActivity("update", "settings", "System Settings", {
        text: "System settings updated",
        icon: "⚙️",
        badge: "Settings",
        badgeClass: "badge-info",
      });
    }

    // Show success message
    showToast("Settings saved successfully", "success");
    console.log("Settings saved successfully");
  } catch (error) {
    console.error("Error saving settings:", error);
    showToast("Error saving settings", "error");
  }
}

// Reset settings to defaults
function resetSettings() {
  try {
    // Ask for confirmation
    if (
      !confirm("Are you sure you want to reset all settings to default values?")
    ) {
      return;
    }

    // Default values
    const defaults = {
      themePreference: "light",
      darkMode: false,
      sidebarCollapsed: false,
      language: "en",
      currency: "USD",
      dateFormat: "MM/DD/YYYY",
      autoSync: true,
      syncInterval: "30",
      dataStoragePath: "Default Location",
      companyName: "",
      companyAddress: "",
      receiptFooter: "Thank you for your business!",
      autoPrint: false,
    };

    // Clear all existing settings
    for (const key in defaults) {
      localStorage.setItem(key, defaults[key]);
    }

    // Reload settings in the UI
    loadSettings();

    // Apply theme
    document.body.classList.remove("dark-mode");
    document.body.classList.add("light-mode");

    // Apply sidebar state
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
      sidebar.classList.remove("collapsed");
    }

    // Log the reset activity
    if (window.api && window.api.logActivity) {
      window.api.logActivity("update", "settings", "System Settings", {
        text: "System settings reset to defaults",
        icon: "⚙️",
        badge: "Reset",
        badgeClass: "badge-warning",
      });
    }

    // Show success message
    showToast("Settings reset to defaults", "success");
    console.log("Settings reset to defaults");
  } catch (error) {
    console.error("Error resetting settings:", error);
    showToast("Error resetting settings", "error");
  }
}

// Setup all event listeners
function setupEventListeners() {
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
      alert("Folder selection is not available in this version.");
    }
  } catch (error) {
    console.error("Error selecting folder:", error);
    alert("An error occurred while selecting a folder.");
  }
}

// Show toast notification
function showToast(message, type = "info") {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
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
