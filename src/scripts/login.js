/**
 * MZLAD Premium Login Experience
 * Advanced JavaScript with enhanced functionality
 */

// Global variables
let isOnline = false;
let validationTimers = {};
let isLoggingIn = false;

// Wrap your code in DOMContentLoaded event to ensure elements exist
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

  // Check remembered user
  checkRememberedUser();

  // initDiagnosticTools();
});
// Create and inject the diagnostic UI
// function injectDiagnosticTool() {
//   // Only inject in development mode or when diagnostic parameter is present
//   const isDev =
//     localStorage.getItem("devMode") === "true" ||
//     window.location.search.includes("diagnostic");

//   if (!isDev) return;

//   // Create diagnostic panel
//   const panel = document.createElement("div");
//   panel.id = "firebase-diagnostic";
//   panel.style.cssText = `
//     position: fixed;
//     bottom: 10px;
//     right: 10px;
//     background: #f8f9fa;
//     border: 1px solid #dee2e6;
//     border-radius: 4px;
//     padding: 10px;
//     width: 300px;
//     box-shadow: 0 2px 5px rgba(0,0,0,0.1);
//     font-family: monospace;
//     font-size: 12px;
//     z-index: 9999;
//     max-height: 400px;
//     overflow-y: auto;
//   `;

//   // Create header with title and minimize button
//   const header = document.createElement("div");
//   header.style.cssText = `
//     display: flex;
//     justify-content: space-between;
//     align-items: center;
//     border-bottom: 1px solid #dee2e6;
//     padding-bottom: 8px;
//     margin-bottom: 8px;
//   `;

//   const title = document.createElement("div");
//   title.textContent = "Firebase Diagnostic";
//   title.style.fontWeight = "bold";

//   const minimizeBtn = document.createElement("button");
//   minimizeBtn.textContent = "-";
//   minimizeBtn.style.cssText = `
//     border: none;
//     background: #e9ecef;
//     border-radius: 4px;
//     cursor: pointer;
//     width: 24px;
//     height: 24px;
//   `;

//   header.appendChild(title);
//   header.appendChild(minimizeBtn);
//   panel.appendChild(header);

//   // Create content area
//   const content = document.createElement("div");
//   content.id = "diagnostic-content";
//   panel.appendChild(content);

//   // Create actions
//   const actions = document.createElement("div");
//   actions.style.cssText = `
//     display: flex;
//     gap: 8px;
//     margin-top: 10px;
//   `;

//   const testAuthBtn = document.createElement("button");
//   testAuthBtn.textContent = "Test Auth";
//   testAuthBtn.style.cssText = `
//     padding: 5px 10px;
//     border: none;
//     background: #007bff;
//     color: white;
//     border-radius: 4px;
//     cursor: pointer;
//   `;

//   const checkConfigBtn = document.createElement("button");
//   checkConfigBtn.textContent = "Check Config";
//   checkConfigBtn.style.cssText = `
//     padding: 5px 10px;
//     border: none;
//     background: #28a745;
//     color: white;
//     border-radius: 4px;
//     cursor: pointer;
//   `;

//   const clearBtn = document.createElement("button");
//   clearBtn.textContent = "Clear";
//   clearBtn.style.cssText = `
//     padding: 5px 10px;
//     border: none;
//     background: #6c757d;
//     color: white;
//     border-radius: 4px;
//     cursor: pointer;
//   `;

//   actions.appendChild(testAuthBtn);
//   actions.appendChild(checkConfigBtn);
//   actions.appendChild(clearBtn);
//   panel.appendChild(actions);

//   // Append panel to document
//   document.body.appendChild(panel);

//   // Add event listeners
//   minimizeBtn.addEventListener("click", () => {
//     if (content.style.display !== "none") {
//       content.style.display = "none";
//       actions.style.display = "none";
//       minimizeBtn.textContent = "+";
//       panel.style.width = "auto";
//     } else {
//       content.style.display = "block";
//       actions.style.display = "flex";
//       minimizeBtn.textContent = "-";
//       panel.style.width = "300px";
//     }
//   });

//   testAuthBtn.addEventListener("click", testFirebaseAuthWithDiagnostic);
//   checkConfigBtn.addEventListener("click", checkFirebaseConfig);
//   clearBtn.addEventListener("click", () => {
//     content.innerHTML = "";
//   });

//   // Print initial info
//   logDiagnostic("Diagnostic tool ready", "info");
//   logDiagnostic(`Online: ${navigator.onLine}`, "info");

//   return panel;
// }

// // Log diagnostic message
// function logDiagnostic(message, type = "info") {
//   const content = document.getElementById("diagnostic-content");
//   if (!content) return;

//   const entry = document.createElement("div");
//   entry.style.cssText = `
//     padding: 4px 0;
//     border-bottom: 1px solid #f0f0f0;
//     word-break: break-all;
//   `;

//   // Timestamp
//   const time = new Date().toTimeString().split(" ")[0];
//   const timestamp = document.createElement("span");
//   timestamp.textContent = `[${time}] `;
//   timestamp.style.color = "#6c757d";
//   entry.appendChild(timestamp);

//   // Message with type-based styling
//   const text = document.createElement("span");
//   switch (type) {
//     case "error":
//       text.style.color = "#dc3545";
//       break;
//     case "success":
//       text.style.color = "#28a745";
//       break;
//     case "warning":
//       text.style.color = "#ffc107";
//       break;
//     default:
//       text.style.color = "#000";
//   }

//   // Format message
//   if (typeof message === "object") {
//     try {
//       text.textContent = JSON.stringify(message);
//     } catch (e) {
//       text.textContent = "Object: " + Object.keys(message).join(", ");
//     }
//   } else {
//     text.textContent = message;
//   }

//   entry.appendChild(text);
//   content.appendChild(entry);
//   content.scrollTop = content.scrollHeight;
// }

// // Enhanced Firebase auth testing with diagnostic
// async function testFirebaseAuthWithDiagnostic() {
//   const email = document.getElementById("email").value;
//   const password = document.getElementById("password").value;

//   if (!email || !password) {
//     logDiagnostic("Please enter both email and password", "error");
//     return;
//   }

//   logDiagnostic(`Testing Firebase auth for: ${email}`, "info");

//   try {
//     // Check connection first
//     if (!navigator.onLine) {
//       logDiagnostic("Device is offline! Check internet connection", "error");
//       return;
//     }

//     logDiagnostic("Checking if user exists in Firebase...", "info");

//     // Call the API (if window.api exists)
//     if (window.api && typeof window.api.testFirebaseAuth === "function") {
//       logDiagnostic("Calling API test function...", "info");

//       // Try diagnostic check first if available
//       if (window.api.diagnoseFBAuth) {
//         try {
//           const diagResult = await window.api.diagnoseFBAuth(email);
//           logDiagnostic("Firebase Diagnostic Result:", "info");
//           logDiagnostic(diagResult, "info");

//           if (!diagResult.configured) {
//             logDiagnostic("Firebase is not properly configured!", "error");
//           }

//           if (!diagResult.initialized) {
//             logDiagnostic("Firebase auth is not initialized!", "error");
//           }

//           if (diagResult.userExists === false) {
//             logDiagnostic(
//               `User ${email} does not exist in Firestore!`,
//               "warning"
//             );
//           }
//         } catch (diagError) {
//           logDiagnostic("Diagnostic check failed", "error");
//           logDiagnostic(diagError.message || diagError, "error");
//         }
//       }

//       // Now try actual authentication
//       try {
//         const result = await window.api.testFirebaseAuth({ email, password });

//         if (result.success) {
//           logDiagnostic("✅ Authentication succeeded!", "success");
//           logDiagnostic(`User ID: ${result.user?.uid || "unknown"}`, "success");
//           logDiagnostic(`Email: ${result.user?.email || email}`, "success");
//           logDiagnostic(
//             `Display Name: ${result.user?.displayName || "Not set"}`,
//             "success"
//           );
//         } else {
//           logDiagnostic("❌ Authentication failed!", "error");
//           logDiagnostic(`Error code: ${result.code || "unknown"}`, "error");
//           logDiagnostic(`Message: ${result.message}`, "error");
//         }
//       } catch (authError) {
//         logDiagnostic("❌ Authentication error!", "error");
//         logDiagnostic(authError.message || String(authError), "error");
//       }
//     } else {
//       logDiagnostic("API access not available!", "error");
//       logDiagnostic("This tool requires Electron API access", "error");
//     }
//   } catch (error) {
//     logDiagnostic("❌ Test failed with error!", "error");
//     logDiagnostic(error.message || String(error), "error");
//   }
// }

// // Check Firebase configuration
// async function checkFirebaseConfig() {
//   logDiagnostic("Checking Firebase configuration...", "info");

//   try {
//     if (window.api && typeof window.api.getFirebaseConfig === "function") {
//       const config = await window.api.getFirebaseConfig();

//       logDiagnostic("Firebase Configuration:", "info");
//       for (const [key, value] of Object.entries(config)) {
//         const isApiKey = key.toLowerCase().includes("key");
//         const displayValue = isApiKey && value ? "**********" : value;
//         logDiagnostic(`${key}: ${displayValue}`, "info");
//       }

//       if (config.isConfigured) {
//         logDiagnostic("✅ Firebase is properly configured", "success");
//       } else {
//         logDiagnostic("❌ Firebase is NOT properly configured", "error");
//       }
//     } else {
//       // Try to check Firebase configuration from the browser
//       logDiagnostic("API access not available for config check", "warning");

//       // Check if Firebase is defined
//       if (typeof firebase !== "undefined") {
//         logDiagnostic("Firebase SDK is loaded in browser", "success");
//       } else {
//         logDiagnostic("Firebase SDK is not loaded in browser", "error");
//       }
//     }
//   } catch (error) {
//     logDiagnostic("Error checking Firebase config", "error");
//     logDiagnostic(error.message || String(error), "error");
//   }
// }

// // Add a button to toggle developer mode
// function addDevModeToggle() {
//   const toggleBtn = document.createElement("button");
//   toggleBtn.textContent = "🛠️";
//   toggleBtn.style.cssText = `
//     position: fixed;
//     top: 10px;
//     right: 10px;
//     width: 30px;
//     height: 30px;
//     border-radius: 50%;
//     background: rgba(240, 240, 240, 0.7);
//     border: 1px solid #ccc;
//     cursor: pointer;
//     font-size: 16px;
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     opacity: 0.5;
//     transition: opacity 0.3s;
//   `;

//   toggleBtn.addEventListener("mouseenter", () => {
//     toggleBtn.style.opacity = "1";
//   });

//   toggleBtn.addEventListener("mouseleave", () => {
//     toggleBtn.style.opacity = "0.5";
//   });

//   toggleBtn.addEventListener("click", () => {
//     const currentState = localStorage.getItem("devMode") === "true";
//     localStorage.setItem("devMode", (!currentState).toString());

//     if (!currentState) {
//       injectDiagnosticTool();
//       toggleBtn.textContent = "🔧";
//     } else {
//       const panel = document.getElementById("firebase-diagnostic");
//       if (panel) panel.remove();
//       toggleBtn.textContent = "🛠️";
//     }
//   });

//   document.body.appendChild(toggleBtn);
// }

// // Initialize the diagnostic tools
// function initDiagnosticTools() {
//   // Add developer mode toggle (always available)
//   addDevModeToggle();

//   // Check if dev mode is enabled
//   if (
//     localStorage.getItem("devMode") === "true" ||
//     window.location.search.includes("diagnostic")
//   ) {
//     injectDiagnosticTool();
//   }

//   // Secret keyboard shortcut to enable dev mode
//   document.addEventListener("keydown", (event) => {
//     // Ctrl+Shift+D to toggle dev mode
//     if (event.ctrlKey && event.shiftKey && event.key === "D") {
//       const currentState = localStorage.getItem("devMode") === "true";
//       localStorage.setItem("devMode", (!currentState).toString());

//       if (!currentState) {
//         injectDiagnosticTool();
//       } else {
//         const panel = document.getElementById("firebase-diagnostic");
//         if (panel) panel.remove();
//       }
//     }
//   });
// }
/**
 * Setup all event listeners for the page
 */
function setupEventListeners() {
  // Example of checking if an element exists before adding listeners
  const loginButton = document.getElementById("login-button");
  if (loginButton) {
    loginButton.addEventListener("click", handleLogin);
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
        "Account creation is currently disabled in this version."
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
 * @param {Event} e - The submit event
 */
async function handleLogin(e) {
  e.preventDefault();

  if (isLoggingIn) return;
  isLoggingIn = true;

  // Show loading state
  const loginButton = document.getElementById("login-button");
  const originalText = loginButton.textContent;
  loginButton.disabled = true;
  loginButton.textContent = "Logging in...";

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
        result.message || "Login failed. Please check your credentials."
      );
    }
  } catch (error) {
    console.error("Login error:", error);
    showError("Login error: " + (error.message || "Unknown error"));
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = originalText;
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
    showError("Please enter both email and password to test authentication");
    return;
  }

  // Show loading state
  const testButton = document.createElement("button");
  testButton.id = "test-auth-button";
  testButton.textContent = "Testing...";
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
        testButton.textContent = "Auth Test: SUCCESS";
        testButton.style.backgroundColor = "#4CAF50";
        testButton.style.color = "white";

        // Show detailed success info
        showNotification(
          "Firebase auth test succeeded! User: " + result.user.email
        );
      } else {
        testButton.textContent = "Auth Test: FAILED";
        testButton.style.backgroundColor = "#F44336";
        testButton.style.color = "white";

        // Show error details
        showError(
          `Firebase auth error: ${result.code || "unknown"} - ${
            result.message || "No message"
          }`
        );
      }
    })
    .catch((error) => {
      console.error("Error during Firebase auth test:", error);
      testButton.textContent = "Auth Test: ERROR";
      testButton.style.backgroundColor = "#FF9800";
      testButton.style.color = "white";

      showError("Firebase test failed: " + (error.message || "Unknown error"));
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
  const rememberedUser = localStorage.getItem("rememberedUser");
  if (rememberedUser) {
    const emailInput = document.getElementById("email");
    if (emailInput) {
      emailInput.value = rememberedUser;
    }
  }
}
