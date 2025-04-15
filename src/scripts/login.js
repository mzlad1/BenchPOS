/**
 * MZLAD Premium Login Experience
 * Advanced JavaScript with enhanced functionality
 */

// Global variables
let isOnline = false;
let validationTimers = {};
let isLoggingIn = false;

// Define translation function (used before i18n is fully loaded)
const t = function(key, args) {
  // Get the current selected language
  const lang = localStorage.getItem("language") || "en";

  // Helper function to process template variables
  const processTemplate = (text, args) => {
    if (!args || typeof args !== "object" || typeof text !== "string")
      return text;
    return text.replace(/{(\w+)}/g, (match, name) => {
      return args[name] !== undefined ? args[name] : match;
    });
  };

  // First check if i18n is fully initialized and has this key
  if (
      window.i18n &&
      window.i18n.translations &&
      window.i18n.translations[lang] &&
      window.i18n.translations[lang][key]
  ) {
    return processTemplate(window.i18n.translations[lang][key], args);
  }

  // If no translation found, return the key itself
  return key;
};

// Wrap your code in DOMContentLoaded event to ensure elements exist
document.addEventListener("DOMContentLoaded", () => {
  // Initialize i18n if available
  if (window.i18n && typeof window.i18n.init === 'function') {
    window.i18n.init().then(() => {
      console.log('i18n initialized successfully');
    }).catch(err => {
      console.error('Error initializing i18n:', err);
    });
  } else {
    console.warn('i18n not available, using fallback translation function');
  }

  // Initialize language switcher
  initLanguageSwitcher();

  // Apply saved language preference (RTL for Arabic)
  applyLanguageDirection();

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

  // Check remembered user
  checkRememberedUser();
});

/**
 * Initialize language switcher
 */
function initLanguageSwitcher() {
  const toggleBtn = document.getElementById('language-toggle-btn');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    // Get current language
    const currentLang = localStorage.getItem('language') || 'en';
    // Set new language
    const newLang = currentLang === 'en' ? 'ar' : 'en';

    if (window.i18n && typeof window.i18n.changeLanguage === 'function') {
      // Use the i18n system if available
      window.i18n.changeLanguage(newLang).then(() => {
        console.log(`Language changed to ${newLang}`);
      });
    } else {
      // Fallback - just save preference and reload
      localStorage.setItem('language', newLang);
      window.location.reload();
    }
  });
}

/**
 * Apply language direction (RTL for Arabic, LTR for others)
 */
function applyLanguageDirection() {
  const lang = localStorage.getItem("language") || "en";
  const rtlLanguages = ["ar", "he", "fa", "ur"];
  const isRtl = rtlLanguages.includes(lang);

  // Set direction attribute
  document.documentElement.dir = isRtl ? "rtl" : "ltr";

  // Apply RTL class
  if (isRtl) {
    document.documentElement.classList.add("rtl");
    document.documentElement.classList.remove("ltr");
    document.body.classList.add("rtl-layout");
  } else {
    document.documentElement.classList.add("ltr");
    document.documentElement.classList.remove("rtl");
    document.body.classList.remove("rtl-layout");
  }
}

/**
 * Setup all event listeners for the page
 */
function setupEventListeners() {
  // Login form submission
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Example of checking if an element exists before adding listeners
  const loginButton = document.getElementById("login-button");
  if (loginButton) {
    loginButton.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogin(e);
    });
  }

  // Password visibility toggle
  const passwordToggle = document.getElementById("password-toggle");
  if (passwordToggle) {
    passwordToggle.addEventListener("click", togglePasswordVisibility);
  }

  // Theme switch
  const themeSwitch = document.getElementById("theme-switch");
  if (themeSwitch) {
    themeSwitch.addEventListener("change", toggleTheme);
  }

  // "Create Account" link handler
  const createAccountLink = document.getElementById("create-account");
  if (createAccountLink) {
    createAccountLink.addEventListener("click", (e) => {
      e.preventDefault();
      showNotification(
          t("login.accountCreationDisabled", "Account creation is currently disabled in this version.")
      );
    });
  }

  // "Forgot password" link handler
  const forgotPasswordLink = document.getElementById("forgot-password");
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "../views/forgot-password.html";
    });
  }

  // Social login buttons
  document.querySelectorAll(".social-btn").forEach((btn) => {
    if (btn) {
      btn.addEventListener("click", handleSocialLogin);
    }
  });

  // Input focus/blur effects
  document.querySelectorAll("input").forEach((input) => {
    if (input) {
      input.addEventListener("focus", handleInputFocus);
      input.addEventListener("blur", handleInputBlur);
      input.addEventListener("input", () => validateInput(input));
    }
  });

  // Press Alt+F to test Firebase auth directly
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.key === "f") {
      testFirebaseAuth();
    }
  });

  // Listen for language changes
  window.addEventListener("languageChanged", () => {
    applyLanguageDirection();
    updateConnectionUI(isOnline);
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

  showNotification(t("login.providerAvailableLater", `${provider} login will be available in the next release.`));
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
      .rtl-layout .notification {
        right: auto;
        left: 20px;
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
        helperText.textContent = t("login.errors.invalidEmail", "Please enter a valid email address");
        helperText.classList.add("error");
        return false;
      }
      break;

    case "password":
      if (value.length < 8) {
        inputContainer.classList.add("invalid");
        helperText.textContent = t("login.errors.passwordLength", "Password must be at least 8 characters");
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
    // 1. Clear localStorage (except theme preference and language preference)
    const savedTheme = localStorage.getItem("theme");
    const savedLanguage = localStorage.getItem("language");

    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("auth");
    localStorage.removeItem("session");
    // Clear any other potential auth items but preserve theme and language

    if (savedTheme) {
      localStorage.setItem("theme", savedTheme);
    }

    if (savedLanguage) {
      localStorage.setItem("language", savedLanguage);
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
    statusText.textContent = t("header.onlineMode", "Online Mode");
    connectionStatus.classList.remove("offline");
  } else {
    indicator.classList.remove("online");
    indicator.classList.add("offline");
    statusText.textContent = t("header.offlineMode", "Offline Mode");
    connectionStatus.classList.add("offline");
  }
}

/**
 * Handle form submission for login
 * @param {Event} e - The submit event
 */
async function handleLogin(e) {
  e.preventDefault();

  if (isLoggingIn) return;
  isLoggingIn = true;

  // Show loading state
  const loginButton = document.getElementById("login-button");
  const originalText = loginButton.querySelector(".btn-text").textContent;
  loginButton.disabled = true;
  loginButton.querySelector(".btn-text").textContent = t("login.loggingIn", "Logging in...");

  try {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const rememberMeElem = document.getElementById("remember-me");
    const rememberMe = rememberMeElem ? rememberMeElem.checked : false;

    console.log(`Attempting login with: ${email}, remember: ${rememberMe}`);

    let onlineStatus;
    if (window.api && typeof window.api.getOnlineStatus === "function") {
      onlineStatus = await window.api.getOnlineStatus();
      console.log(`Online status from API: ${onlineStatus}`);
    } else {
      onlineStatus = navigator.onLine;
      console.log(
          "window.api not available, using navigator.onLine:",
          onlineStatus
      );
    }

    // Try direct Firebase auth if online
    if (onlineStatus) {
      try {
        console.log("Testing direct Firebase connection");
        const testResult = await window.api.testFirebaseAuth({
          email,
          password,
        });
        console.log("Firebase direct auth result:", testResult);
      } catch (firebaseError) {
        console.error("Firebase test error:", firebaseError);
      }
    }

    // Actual login attempt
    const result = await window.api.loginUser({
      email,
      password,
      rememberMe,
      online: onlineStatus,
    });

    console.log("Login result:", result);

    if (result.success) {
      if (rememberMe) {
        localStorage.setItem("remembered_email", email);
      }

      // Set flag to show sync dialog after login
      sessionStorage.setItem("justLoggedIn", "true");

      window.location.href = "../index.html";
    } else {
      showError(
          result.message || t("login.errors.checkCredentials", "Login failed. Please check your credentials.")
      );
    }
  } catch (error) {
    console.error("Login error:", error);
    showError(t("login.errors.loginError", "Login error:") + " " + (error.message || t("login.errors.unknown", "Unknown error")));
  } finally {
    loginButton.disabled = false;
    loginButton.querySelector(".btn-text").textContent = originalText;
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

/**
 * Test Firebase authentication directly
 */
function testFirebaseAuthDirectly() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showError(t("login.errors.enterBoth", "Please enter both email and password to test authentication"));
    return;
  }

  // Show loading state
  const testButton = document.createElement("button");
  testButton.id = "test-auth-button";
  testButton.textContent = t("login.testing", "Testing...");
  testButton.disabled = true;
  testButton.style.position = "fixed";
  testButton.style.bottom = "10px";
  testButton.style.right = "10px";
  testButton.style.padding = "8px 16px";
  testButton.style.backgroundColor = "#f1f1f1";
  testButton.style.border = "none";
  testButton.style.borderRadius = "4px";
  testButton.style.cursor = "not-allowed";
  document.body.appendChild(testButton);

  // Attempt to test Firebase auth directly
  window.api
      .testFirebaseAuth({ email, password })
      .then((result) => {
        console.log("Direct Firebase auth test result:", result);
        if (result.success) {
          testButton.textContent = t("login.authTestSuccess", "Auth Test: SUCCESS");
          testButton.style.backgroundColor = "#4CAF50";
          testButton.style.color = "white";

          // Show detailed success info
          showNotification(
              t("login.firebaseSuccess", "Firebase auth test succeeded! User:") + " " + result.user.email
          );
        } else {
          testButton.textContent = t("login.authTestFailed", "Auth Test: FAILED");
          testButton.style.backgroundColor = "#F44336";
          testButton.style.color = "white";

          // Show error details
          showError(
              t("login.firebaseError", "Firebase auth error:") + ` ${result.code || "unknown"} - ${
                  result.message || t("login.noMessage", "No message")
              }`
          );
        }
      })
      .catch((error) => {
        console.error("Error during Firebase auth test:", error);
        testButton.textContent = t("login.authTestError", "Auth Test: ERROR");
        testButton.style.backgroundColor = "#FF9800";
        testButton.style.color = "white";

        showError(t("login.testFailed", "Firebase test failed:") + " " + (error.message || t("login.errors.unknown", "Unknown error")));
      })
      .finally(() => {
        // Remove the button after 5 seconds
        setTimeout(() => {
          if (document.body.contains(testButton)) {
            document.body.removeChild(testButton);
          }
        }, 5000);
      });
}

/**
 * Check remembered user
 */
function checkRememberedUser() {
  const rememberedUser = localStorage.getItem("remembered_email");
  if (rememberedUser) {
    const emailInput = document.getElementById("email");
    if (emailInput) {
      emailInput.value = rememberedUser;
    }
  }
}