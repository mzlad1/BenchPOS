// register.js - Handles user registration functionality within the main app

let isOnline = false;

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("register-button").disabled = true;

  // Wait for connection check to complete
  await checkConnectionStatus();

  // Now set up event listeners
  document
    .getElementById("register-form")
    .addEventListener("submit", handleRegister);
  // Update inventory badge in sidebar if LayoutManager is available
  if (window.LayoutManager) {
    const lowStockCount = products.filter(
      (product) => product.stock <= 5
    ).length;
    window.LayoutManager.updateInventoryBadge(lowStockCount);
  }
});

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
      showError(
        "Account creation requires internet connection. Please connect and try again."
      );
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
      showError(
        "Account creation requires internet connection. Please connect and try again."
      );
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
    statusText.textContent = online ? "Online Mode" : "Offline Mode";
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
    showError(
      "Account creation requires internet connection. Please connect and try again."
    );
    return;
  }

  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const role = document.getElementById("register-role").value;
  const status = document.getElementById("register-status").value;
  const registerButton = document.getElementById("register-button");

  if (!name || !email || !password) {
    showError("Please fill all required fields");
    return;
  }

  try {
    // Disable register button
    registerButton.disabled = true;
    registerButton.textContent = "Creating account...";

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
      showSuccess("Account created successfully!");

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
      showError(result.message || "Account creation failed. Please try again.");

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
    showError("An error occurred during account creation. Please try again.");

    // Log activity
    if (window.ActivityLogger) {
      window.ActivityLogger.log({
        type: "error",
        action: "register_error",
        details: { email, role, error: error.message },
      });
    }
  } finally {
    // Re-enable register button
    registerButton.disabled = false;
    registerButton.textContent = "Create Account";
  }
}
