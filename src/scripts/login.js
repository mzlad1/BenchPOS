/**
 * MZLAD Premium Login Experience
 * Advanced JavaScript with enhanced functionality
 */

// Global variables
let isOnline = false;
let validationTimers = {};
let isLoggingIn = false;

// Initialize page when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Force logout and clean storage
  forceLogoutAndCleanStorage();

  // Initialize page elements and state
  initPage();

  // Set up all event listeners
  setupEventListeners();

  // Initialize feature animations
  initFeatureAnimations();

  // Initialize form validations
  initFormValidation();
});

/**
 * Setup all event listeners for the page
 */
function setupEventListeners() {
  // Login form submission
  document.getElementById("login-form").addEventListener("submit", handleLogin);

  // Password visibility toggle
  document
    .getElementById("password-toggle")
    .addEventListener("click", togglePasswordVisibility);

  // Theme switch
  document
    .getElementById("theme-switch")
    .addEventListener("change", toggleTheme);

  // "Create Account" link handler
  document.getElementById("create-account")?.addEventListener("click", (e) => {
    e.preventDefault();
    showNotification("Account creation is currently disabled in this version.");
  });

  // "Forgot password" link handler
  document.getElementById("forgot-password")?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "../views/forgot-password.html";
  });

  // Social login buttons
  document.querySelectorAll(".social-btn").forEach((btn) => {
    btn.addEventListener("click", handleSocialLogin);
  });

  // Input focus/blur effects
  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("focus", handleInputFocus);
    input.addEventListener("blur", handleInputBlur);
    input.addEventListener("input", () => validateInput(input));
  });
}

/**
 * Handles social login button clicks
 * @param {Event} e - The click event
 */
function handleSocialLogin(e) {
  e.preventDefault();
  const provider = this.classList.contains("google")
    ? "Google"
    : this.classList.contains("microsoft")
    ? "Microsoft"
    : "Apple";

  showNotification(`${provider} login will be available in the next release.`);
}

/**
 * Shows a notification toast
 * @param {string} message - The message to display
 */
function showNotification(message) {
  // Create notification element if it doesn't exist
  let notification = document.querySelector(".notification");
  if (!notification) {
    notification = document.createElement("div");
    notification.className = "notification";
    document.body.appendChild(notification);

    // Add styles dynamically
    const style = document.createElement("style");
    style.textContent = `
      .notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 25px;
        background-color: var(--primary-color);
        color: white;
        border-radius: 8px;
        box-shadow: var(--shadow);
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 1000;
        font-weight: 500;
      }
      .notification.show {
        transform: translateY(0);
        opacity: 1;
      }
      .dark-mode .notification {
        background-color: var(--accent-color);
      }
    `;
    document.head.appendChild(style);
  }

  // Set message and show notification
  notification.textContent = message;
  notification.classList.add("show");

  // Hide after 4 seconds
  setTimeout(() => {
    notification.classList.remove("show");
  }, 4000);
}

/**
 * Initialize feature list animations
 */
function initFeatureAnimations() {
  const features = document.querySelectorAll(".feature-list li");

  features.forEach((feature) => {
    const delay = parseFloat(feature.getAttribute("data-delay") || "0");

    setTimeout(() => {
      feature.style.opacity = "1";
    }, delay * 1000);
  });
}

/**
 * Toggles dark/light theme
 */
function toggleTheme() {
  document.body.classList.toggle("dark-mode");

  // Save preference to localStorage
  if (document.body.classList.contains("dark-mode")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
}

/**
 * Check and apply saved theme preference
 */
function applySavedTheme() {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    document.getElementById("theme-switch").checked = true;
  }
}

/**
 * Handle input focus animation
 */
function handleInputFocus() {
  const inputContainer = this.parentElement;
  inputContainer.style.transform = "translateY(-3px)";
  this.parentElement.querySelector("i.icon-main")?.classList.add("focused");
}

/**
 * Handle input blur animation
 */
function handleInputBlur() {
  const inputContainer = this.parentElement;
  inputContainer.style.transform = "translateY(0)";
  this.parentElement.querySelector("i.icon-main")?.classList.remove("focused");
}

/**
 * Toggle password visibility
 */
function togglePasswordVisibility() {
  const passwordInput = document.getElementById("password");
  const toggleIcon = this.querySelector("i");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleIcon.classList.remove("fa-eye");
    toggleIcon.classList.add("fa-eye-slash");
  } else {
    passwordInput.type = "password";
    toggleIcon.classList.remove("fa-eye-slash");
    toggleIcon.classList.add("fa-eye");
  }

  // Nice animation
  toggleIcon.classList.add("animate-icon");
  setTimeout(() => {
    toggleIcon.classList.remove("animate-icon");
  }, 300);
}

/**
 * Initialize form validation
 */
function initFormValidation() {
  const inputs = document.querySelectorAll("input");

  inputs.forEach((input) => {
    // Initial validation state
    validateInput(input);

    // Set up input event for real-time validation
    input.addEventListener("input", () => {
      // Clear any existing timers for this input
      if (validationTimers[input.id]) {
        clearTimeout(validationTimers[input.id]);
      }

      // Set debounce timer to avoid too frequent validation
      validationTimers[input.id] = setTimeout(() => {
        validateInput(input);
      }, 500);
    });
  });
}

/**
 * Validate a single input field
 * @param {HTMLInputElement} input - The input element to validate
 * @returns {boolean} - Whether the input is valid
 */
function validateInput(input) {
  const inputContainer = input.parentElement;
  const helperText = document.getElementById(`${input.id}-helper`);
  const value = input.value.trim();

  // Remove previous validation states
  inputContainer.classList.remove("valid", "invalid");

  // Check if helperText exists before trying to modify it
  if (helperText) {
    helperText.textContent = "";
    helperText.classList.remove("error");
  }

  // Skip validation if empty (will be caught by required attribute)
  if (!value) return false;

  // Validate based on input type or data-validate attribute
  const validateType =
    inputContainer.getAttribute("data-validate") || input.type;

  switch (validateType) {
    case "email":
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        inputContainer.classList.add("invalid");
        helperText.textContent = "Please enter a valid email address";
        helperText.classList.add("error");
        return false;
      }
      break;

    case "password":
      if (value.length < 8) {
        inputContainer.classList.add("invalid");
        helperText.textContent = "Password must be at least 8 characters";
        helperText.classList.add("error");
        return false;
      }
      break;
  }

  // If we got here, validation passed
  inputContainer.classList.add("valid");
  return true;
}

/**
 * Function to force logout and clean all potential storage mechanisms
 */
function forceLogoutAndCleanStorage() {
  console.log("Forcing logout and cleaning storage");

  try {
    // 1. Clear localStorage (except theme preference)
    const savedTheme = localStorage.getItem("theme");

    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("auth");
    localStorage.removeItem("session");
    // Clear any other potential auth items but preserve theme

    if (savedTheme) {
      localStorage.setItem("theme", savedTheme);
    }

    // 2. Clear sessionStorage
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("auth");
    sessionStorage.removeItem("session");

    // 3. Clear cookies related to authentication
    document.cookie.split(";").forEach(function (c) {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // 4. Set a local flag to indicate this is a fresh start
    sessionStorage.setItem("forcedLogout", "true");

    // 5. Call API logout if available
    if (window.api && typeof window.api.logoutUser === "function") {
      console.log("Calling API logout");
      window.api
        .logoutUser()
        .catch((e) => console.error("Error during API logout:", e));
    }
  } catch (error) {
    console.error("Error during forced logout:", error);
  }
}

/**
 * Initialize the page
 */
async function initPage() {
  // Apply saved theme preference
  applySavedTheme();

  // Check connection status
  console.log("Checking connection status");
  await checkConnectionStatus();
}

/**
 * Check the connection status
 */
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

    // Also listen for browser online/offline events as fallback
    window.addEventListener("online", () => {
      console.log("Browser reports online");
      if (!window.api || typeof window.api.getOnlineStatus !== "function") {
        isOnline = true;
        updateConnectionUI(true);
      }
    });

    window.addEventListener("offline", () => {
      console.log("Browser reports offline");
      if (!window.api || typeof window.api.getOnlineStatus !== "function") {
        isOnline = false;
        updateConnectionUI(false);
      }
    });
  } catch (error) {
    console.error("Error checking connection status:", error);
    updateConnectionUI(false);
  }
}

/**
 * Update the connection UI based on status
 * @param {boolean} online - Whether the connection is online
 */
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

/**
 * Handle form submission for login
 * @param {Event} event - The submit event
 */
async function handleLogin(event) {
  event.preventDefault();

  // Prevent multiple submissions
  if (isLoggingIn) return;

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const loginButton = document.getElementById("login-button");
  const rememberMe = document.getElementById("remember").checked;

  // Validate inputs
  const emailValid = validateInput(document.getElementById("email"));
  const passwordValid = validateInput(document.getElementById("password"));

  if (!email || !password) {
    showError("Please enter both email and password");
    return;
  }

  if (!emailValid || !passwordValid) {
    showError("Please fix the errors before logging in");
    return;
  }

  try {
    isLoggingIn = true;
    loginButton.disabled = true;

    // Store original button content
    const originalButtonHtml = loginButton.innerHTML;

    // Update button text
    loginButton.innerHTML = '<span class="btn-text">Processing</span>';

    // Show loader overlay
    const loaderOverlay = document.getElementById("loader-overlay");
    loaderOverlay.classList.add("active");

    // Add loading text with dots animation
    const loadingText = document.querySelector(".loading-text");
    loadingText.textContent = "Authenticating";

    setTimeout(() => {
      loadingText.textContent = "Checking permissions";
    }, 1500);

    // Debugging
    console.log("Attempting login with:", {
      email,
      online: isOnline,
      rememberMe,
    });

    let result;
    try {
      // Pass online status to login function
      result = await window.api.loginUser({
        email,
        password,
        isOnline,
        remember: rememberMe,
      });
      console.log("Login result:", result);
    } catch (loginError) {
      console.error("Error from loginUser:", loginError);
      throw loginError;
    }

    // Simulate a slight delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 1800));

    // Update loading text
    loadingText.textContent = "Almost there";

    // Add another small delay
    await new Promise((resolve) => setTimeout(resolve, 700));

    // Add null/undefined check before accessing properties
    if (result && result.success) {
      // Success - show success message in loading overlay
      loadingText.textContent = "Success!";
      loadingText.style.color = "var(--success-color)";

      // Update the loading spinner to a checkmark
      const spinner = document.querySelector(".spinner");
      spinner.innerHTML =
        '<i class="fas fa-check" style="font-size: 24px; color: var(--success-color);"></i>';
      spinner.style.border = "none";
      spinner.style.animation = "none";

      // Redirect based on user role after a short delay
      setTimeout(() => {
        if (result.user && result.user.role === "admin") {
          window.location.href = "../index.html";
        } else if (result.user && result.user.role === "manager") {
          window.location.href = "inventory.html";
        } else {
          window.location.href = "billing.html";
        }
      }, 1000);
    } else {
      // Hide loader
      loaderOverlay.classList.remove("active");

      // Reset button
      loginButton.innerHTML = originalButtonHtml;

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

    // Hide loader
    document.getElementById("loader-overlay").classList.remove("active");
  } finally {
    loginButton.disabled = false;
    isLoggingIn = false;
  }
}

/**
 * Show error message
 * @param {string} message - The error message to display
 */
function showError(message) {
  const errorEl = document.getElementById("error-message");
  const errorText = document.getElementById("error-text");

  errorText.textContent = message;
  errorEl.style.display = "flex";

  // Add shake animation
  errorEl.classList.add("shake");

  // Remove shake class after animation completes
  setTimeout(() => {
    errorEl.classList.remove("shake");
  }, 500);

  // Hide error after 5 seconds
  setTimeout(() => {
    errorEl.style.opacity = "0";

    setTimeout(() => {
      errorEl.style.display = "none";
      errorEl.style.opacity = "1";
    }, 300);
  }, 5000);
}
