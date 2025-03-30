let isOnline = false;

document.addEventListener("DOMContentLoaded", () => {
  // Force logout and clean all potential auth storage first
  forceLogoutAndCleanStorage();

  // Initialize the page
  initPage();

  // Initialize sync dialog if available
  if (typeof window.initLoginSyncDialog === "function") {
    window.initLoginSyncDialog();
  }

  // Set up event listeners
  document
      .getElementById("login-form")
      .addEventListener("submit", handleLogin);
});

// Function to force logout and clean all potential storage mechanisms
function forceLogoutAndCleanStorage() {
  console.log("Forcing logout and cleaning storage");

  try {
    // 1. Clear localStorage
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("auth");
    localStorage.removeItem("session");
    // Clear any other potential auth items

    // 2. Clear sessionStorage
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("auth");
    sessionStorage.removeItem("session");

    // 3. Clear cookies related to authentication
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // 4. Set a local flag to indicate this is a fresh start
    sessionStorage.setItem("forcedLogout", "true");

    // 5. Call API logout if available
    if (window.api && typeof window.api.logoutUser === "function") {
      console.log("Calling API logout");
      window.api.logoutUser().catch(e => console.error("Error during API logout:", e));
    }
  } catch (error) {
    console.error("Error during forced logout:", error);
  }
}

async function initPage() {
  // Skip user check entirely, go straight to connection check
  console.log("Skipping user check, requiring login");
  await checkConnectionStatus();
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
    if (
        window.api &&
        typeof window.api.onOnlineStatusChanged === "function"
    ) {
      console.log("Setting up online status listener");
      window.api.onOnlineStatusChanged((status) => {
        console.log("Online status update received:", status);
        isOnline = status;
        updateConnectionUI(status);
      });
    }
  } catch (error) {
    console.error("Error checking connection status:", error);
    updateConnectionUI(false);
  }
}

function updateConnectionUI(online) {
  const indicator = document.getElementById("connection-indicator");
  const statusText = document.getElementById("connection-text");
  const connectionStatus = document.getElementById("connection-status");

  if (online) {
    indicator.classList.remove("offline");
    indicator.classList.add("online");
    statusText.textContent = "Online Mode";
    connectionStatus.classList.remove("offline");
  } else {
    indicator.classList.remove("online");
    indicator.classList.add("offline");
    statusText.textContent = "Offline Mode";
    connectionStatus.classList.add("offline");
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const loginButton = document.getElementById("login-button");

  if (!email || !password) {
    showError("Please enter both email and password");
    return;
  }

  try {
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    // Add debugging
    console.log("Attempting login with:", { email, online: isOnline });

    let result;
    try {
      // Pass online status to login function
      result = await window.api.loginUser({ email, password, isOnline });
      console.log("Login result:", result);
    } catch (loginError) {
      console.error("Error from loginUser:", loginError);
      throw loginError;
    }

    // Add null/undefined check before accessing properties
    if (result && result.success) {
      // Redirect based on user role
      if (result.user && result.user.role === "admin") {
        window.location.href = "../index.html";
      } else if (result.user && result.user.role === "manager") {
        window.location.href = "inventory.html";
      } else {
        window.location.href = "billing.html";
      }
    } else {
      // Handle null or undefined result
      if (!result) {
        showError("Login failed - no response from server");
      } else {
        showError(
            result.message || "Login failed. Please check your credentials."
        );
      }
    }
  } catch (error) {
    console.error("Login error:", error);
    showError("An error occurred during login. Please try again.");
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Login";
  }
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