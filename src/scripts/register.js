// register.js - Handles user registration functionality within the main app

let isOnline = false;

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
    return;
  }

  // Otherwise wait for the i18nReady event or try to manually initialize
  return new Promise((resolve) => {
    const checkI18n = () => {
      if (window.i18n && window.i18n.layoutIntegrated) {
        console.log("i18n is now initialized and integrated");
        resolve();
      } else if (window.i18n) {
        // Try to manually initialize if present but not ready
        console.log("Trying to manually initialize i18n");
        window.i18n.init().then(() => {
          console.log("i18n manually initialized");
          resolve();
        });
      } else {
        // Check again in 100ms
        console.log("i18n not found, checking again soon");
        setTimeout(checkI18n, 100);
      }
    };

    // Start checking
    checkI18n();

    // Also listen for the ready event as a backup
    window.addEventListener('i18nReady', () => {
      console.log("i18nReady event received");
      resolve();
    }, { once: true });

    // Set a timeout to resolve anyway after 3 seconds to prevent hanging
    setTimeout(() => {
      console.warn("i18n initialization timed out, continuing anyway");
      resolve();
    }, 3000);
  });
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