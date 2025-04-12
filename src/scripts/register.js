// register.js - Handles user registration functionality within the main app

let isOnline = false;
let translationsApplied = false;

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("register-button").disabled = true;

  // Wait for i18n to initialize and make sure translations are applied
  await waitForI18n();

  // Make sure translations are applied to the page
  if (window.i18n) {
    console.log("Updating page content with translations");
    window.i18n.updatePageContent();
  }

  // Wait for connection check to complete
  await checkConnectionStatus();

  // Now set up event listeners
  document
      .getElementById("register-form")
      .addEventListener("submit", handleRegister);

  // Update inventory badge in sidebar if LayoutManager is available
  if (window.LayoutManager) {
    try {
      const products = window.LayoutManager.getProducts || [];
      const lowStockCount = products?.filter(
          (product) => product?.stock <= 5
      )?.length || 0;
      window.LayoutManager.updateInventoryBadge(lowStockCount);
    } catch (e) {
      console.warn("Could not update inventory badge:", e);
    }
  }
});

// Function to wait for i18n to be ready
async function waitForI18n() {
  console.log("Waiting for i18n to initialize...");

  // If i18n is already initialized and integrated with layout, return immediately
  if (window.i18n && window.i18n.layoutIntegrated) {
    console.log("i18n already initialized and integrated");
    await forceApplyTranslations();
    return;
  }

  // Otherwise wait for the i18nReady event or try to manually initialize
  return new Promise((resolve) => {
    const checkI18n = async () => {
      if (window.i18n && window.i18n.layoutIntegrated) {
        console.log("i18n is now initialized and integrated");
        await forceApplyTranslations();
        resolve();
      } else if (window.i18n) {
        // Try to manually initialize if present but not ready
        console.log("Trying to manually initialize i18n");
        await window.i18n.init();
        console.log("i18n manually initialized");
        await forceApplyTranslations();
        resolve();
      } else {
        // Check again in 100ms
        console.log("i18n not found, checking again soon");
        setTimeout(checkI18n, 100);
      }
    };

    // Start checking
    checkI18n();

    // Also listen for the ready event as a backup
    window.addEventListener('i18nReady', async () => {
      console.log("i18nReady event received");
      await forceApplyTranslations();
      resolve();
    }, { once: true });

    // Set a timeout to resolve anyway after 3 seconds to prevent hanging
    setTimeout(async () => {
      console.warn("i18n initialization timed out, trying one more translation update");
      await forceApplyTranslations();
      resolve();
    }, 3000);
  });
}
async function forceApplyTranslations() {
  if (translationsApplied) {
    console.log("Translations already applied, skipping");
    return;
  }

  try {
    console.log("Force applying translations to all elements");

    // Get current language
    const lang = localStorage.getItem('language') || 'en';
    console.log(`Current language: ${lang}`);

    // First ensure translations are loaded
    if (window.i18n) {
      // Try to directly load the translation file for current language
      try {
        // Try absolute paths - this might work better in Electron
        const possiblePaths = [
          `/locales/${lang}.json`,
          `./locales/${lang}.json`,
          `../locales/${lang}.json`,
          `${lang}.json`
        ];

        console.log("Trying to load translations from paths:", possiblePaths);

        let translationsLoaded = false;

        for (const path of possiblePaths) {
          try {
            const response = await fetch(path);
            if (response.ok) {
              const data = await response.json();
              console.log(`Successfully loaded translations from ${path}`);

              // Flatten and apply translations
              if (typeof window.i18n.flattenTranslations === 'function') {
                const flattened = window.i18n.flattenTranslations(data);

                // Merge with existing translations
                window.i18n.translations[lang] = {
                  ...(window.i18n.translations[lang] || {}),
                  ...flattened
                };

                console.log(`Added ${Object.keys(flattened).length} translations`);
                translationsLoaded = true;
                break;
              }
            }
          } catch (e) {
            console.warn(`Failed loading from ${path}:`, e);
          }
        }

        if (!translationsLoaded) {
          console.warn(`Could not load translations for ${lang} from files`);
        }
      } catch (e) {
        console.error("Error loading translation file:", e);
      }

      // Log available translations before applying
      if (window.i18n.translations && window.i18n.translations[lang]) {
        console.log(`Available translation keys: ${Object.keys(window.i18n.translations[lang]).length}`);

        // Debug: Log some specific keys
        const keysToCheck = [
          'register.title',
          'register.fullName',
          'register.email',
          'register.password',
          'register.button'
        ];

        keysToCheck.forEach(key => {
          console.log(`Translation for "${key}": ${window.i18n.translations[lang][key] || "NOT FOUND"}`);
        });
      } else {
        console.warn(`No translations available for ${lang}`);
      }

      // Now manually apply translations to all elements with data-i18n
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        console.log(`Translating element with key: ${key}`);

        let translated = window.t(key);
        if (translated === key) {
          console.warn(`Translation not found for key: ${key}`);
        } else {
          console.log(`Translated "${key}" to "${translated}"`);
        }

        el.textContent = translated;
      });

      // Update placeholders
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const translated = window.t(key);
        console.log(`Setting placeholder for key: ${key} to "${translated}"`);
        el.setAttribute('placeholder', translated);
      });

      // After manual translation, call the official update method
      if (typeof window.i18n.updatePageContent === 'function') {
        window.i18n.updatePageContent();
      }

      translationsApplied = true;
    }
  } catch (error) {
    console.error("Error in forceApplyTranslations:", error);
  }
}
async function checkConnectionStatus() {
  try {
    console.log("Checking connection status");

    // Try a direct network test
    if (window.api && typeof window.api.getOnlineStatus === "function") {
      isOnline = await window.api.getOnlineStatus();
      console.log("Online status from API:", isOnline);
    } else {
      isOnline = navigator.onLine;
      console.log("API not available, using navigator.onLine:", isOnline);
    }

    // Update UI with whatever we determined
    updateConnectionUI(isOnline);

    // Register for status updates
    if (window.api && typeof window.api.onOnlineStatusChanged === "function") {
      console.log("Setting up online status listener");
      window.api.onOnlineStatusChanged((status) => {
        console.log("Online status update received:", status);
        isOnline = status;
        updateConnectionUI(status);
      });
    }

    // Check if we're online for registration
    if (!isOnline) {
      showError(window.t("common.offline.error", "Account creation requires internet connection. Please connect and try again."));
      document.getElementById("register-button").disabled = true;
    } else {
      document.getElementById("register-button").disabled = false;
    }
  } catch (error) {
    console.error("Error checking connection status:", error);
    updateConnectionUI(false);
  }
}

function updateConnectionUI(online) {
  // First, enable/disable the register button regardless of UI updates
  const registerButton = document.getElementById("register-button");
  if (registerButton) {
    if (online) {
      registerButton.disabled = false;
      // You might want to clear any previous error messages
      const errorEl = document.getElementById("error-message");
      if (errorEl) errorEl.style.display = "none";
    } else {
      registerButton.disabled = true;
      // Show error if offline
      showError(window.t("common.offline.error", "Account creation requires internet connection. Please connect and try again."));
    }
  }

  // Now safely update connection indicators if they exist
  const indicator = document.getElementById("connection-indicator");
  const statusText = document.getElementById("connection-text");
  const connectionStatus = document.getElementById("connection-status");

  if (indicator) {
    if (online) {
      indicator.classList.remove("offline");
      indicator.classList.add("online");
    } else {
      indicator.classList.remove("online");
      indicator.classList.add("offline");
    }
  }

  if (statusText) {
    const onlineKey = "header.onlineMode";
    const offlineKey = "header.offlineMode";
    statusText.textContent = online ?
        window.t(onlineKey, "Online Mode") :
        window.t(offlineKey, "Offline Mode");

    // Update the i18n key for future language switches
    statusText.setAttribute("data-i18n", online ? onlineKey : offlineKey);
  }

  if (connectionStatus) {
    if (online) {
      connectionStatus.classList.remove("offline");
    } else {
      connectionStatus.classList.add("offline");
    }
  }

  // Important: Log the connection status for debugging
  console.log("Connection status updated:", online ? "Online" : "Offline");
}

function showError(message) {
  const errorEl = document.getElementById("error-message");
  errorEl.textContent = message;
  errorEl.style.display = "block";

  // Hide error after 5 seconds
  setTimeout(() => {
    errorEl.style.display = "none";
  }, 5000);
}

function showSuccess(message) {
  const errorEl = document.getElementById("error-message");
  errorEl.textContent = message;
  errorEl.style.display = "block";
  errorEl.style.backgroundColor = "#e7f9e7";
  errorEl.style.color = "#2ecc71";

  // Hide message after 5 seconds
  setTimeout(() => {
    errorEl.style.display = "none";
    errorEl.style.backgroundColor = ""; // Reset to default
    errorEl.style.color = ""; // Reset to default
  }, 5000);
}

async function handleRegister(event) {
  event.preventDefault();

  // Check online status again right before registration
  if (window.api && typeof window.api.getOnlineStatus === "function") {
    isOnline = await window.api.getOnlineStatus();
    console.log("Registration - current online status:", isOnline);
  }

  if (!isOnline) {
    showError(window.t("common.offline.error", "Account creation requires internet connection. Please connect and try again."));
    return;
  }

  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const role = document.getElementById("register-role").value;
  const status = document.getElementById("register-status").value;
  const registerButton = document.getElementById("register-button");

  if (!name || !email || !password) {
    showError(window.t("register.fillRequired", "Please fill all required fields"));
    return;
  }

  try {
    // Disable register button
    registerButton.disabled = true;
    registerButton.textContent = window.t("register.creatingAccount", "Creating account...");

    // Log activity
    if (window.ActivityLogger) {
      window.ActivityLogger.log({
        type: "user_action",
        action: "register_attempt",
        details: { email, role },
      });
    }

    // Try to register with status from dropdown
    // Make sure status is explicitly set and treated as a core field
    const userData = {
      name,
      email,
      password,
      role,
      status, // Use status selected from dropdown
    };

    console.log("Sending user data with status:", userData);
    const result = await window.api.registerUser(userData);

    if (result.success) {
      // Registration successful
      showSuccess(window.t("register.success", "Account created successfully!"));

      // Log activity
      if (window.ActivityLogger) {
        window.ActivityLogger.log({
          type: "user_action",
          action: "register_success",
          details: { email, role, userId: result.userId },
        });
      }

      // Clear form
      document.getElementById("register-form").reset();
    } else {
      // Registration failed
      showError(result.message || window.t("register.failed", "Account creation failed. Please try again."));

      // Log activity
      if (window.ActivityLogger) {
        window.ActivityLogger.log({
          type: "error",
          action: "register_failed",
          details: { email, role, error: result.message },
        });
      }
    }
  } catch (error) {
    console.error("Registration error:", error);
    showError(window.t("register.error", "An error occurred during account creation. Please try again."));

    // Log activity
    if (window.ActivityLogger) {
      window.ActivityLogger.log({
        type: "error",
        action: "register_error",
        details: { email, role, error: error.message },
      });
    }
  } finally {
    // Re-enable register button and restore original text
    registerButton.disabled = false;
    registerButton.textContent = window.t("register.button", "Create Account");
  }
}