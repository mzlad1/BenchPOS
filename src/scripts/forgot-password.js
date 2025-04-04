/**
 * MZLAD Forgot Password Page
 * Firebase Authentication Integration
 */

// Global variables
let isOnline = false;
let validationTimers = {};
let isProcessing = false;

// Import Firebase auth directly
// These imports need to be available in your project
// If they're not, you'll need to add them to your dependencies
let auth;
let sendPasswordResetEmail;

// Initialize page when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  // Try to import Firebase auth dynamically
  try {
    // Import Firebase auth modules
    const firebaseApp = await import("firebase/app");
    const firebaseAuth = await import("firebase/auth");

    // Get the auth instance
    auth = firebaseAuth.getAuth();
    sendPasswordResetEmail = firebaseAuth.sendPasswordResetEmail;

    console.log("Firebase Auth loaded successfully");
  } catch (error) {
    console.error("Error loading Firebase Auth:", error);
  }

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
  // Reset form submission
  document
    .getElementById("reset-form")
    .addEventListener("submit", handleResetPassword);

  // Theme switch
  document
    .getElementById("theme-switch")
    .addEventListener("change", toggleTheme);

  // Back to login link
  document.getElementById("back-to-login")?.addEventListener("click", (e) => {
    // No need for preventDefault as we want the default navigation behavior
  });

  // Input focus/blur effects
  document.querySelectorAll("input").forEach((input) => {
    input.addEventListener("focus", handleInputFocus);
    input.addEventListener("blur", handleInputBlur);
    input.addEventListener("input", () => validateInput(input));
  });
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
        if (helperText) {
          helperText.textContent = "Please enter a valid email address";
          helperText.classList.add("error");
        }
        return false;
      }
      break;
  }

  // If we got here, validation passed
  inputContainer.classList.add("valid");
  return true;
}

/**
 * Initialize the page
 */
async function initPage() {
  // Apply saved theme preference
  applySavedTheme();

  // Check connection status through IPC
  if (window.api && typeof window.api.getOnlineStatus === "function") {
    isOnline = await window.api.getOnlineStatus();
    updateConnectionUI(isOnline);

    // Register for status updates
    if (window.api.onOnlineStatusChanged) {
      window.api.onOnlineStatusChanged((status) => {
        isOnline = status;
        updateConnectionUI(status);
      });
    }
  } else {
    // Fallback to browser's online status
    isOnline = navigator.onLine;
    updateConnectionUI(isOnline);
    window.addEventListener("online", () => {
      isOnline = true;
      updateConnectionUI(true);
    });
    window.addEventListener("offline", () => {
      isOnline = false;
      updateConnectionUI(false);
    });
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
 * Handle form submission for password reset
 * @param {Event} event - The submit event
 */
async function handleResetPassword(event) {
  event.preventDefault();

  // Prevent multiple submissions
  if (isProcessing) return;

  // Hide any previous messages
  hideMessages();

  const email = document.getElementById("email").value;
  const resetButton = document.getElementById("reset-button");

  // Validate inputs
  const emailValid = validateInput(document.getElementById("email"));

  if (!email) {
    showError("Please enter your email address");
    return;
  }

  if (!emailValid) {
    showError("Please enter a valid email address");
    return;
  }

  // Check if online
  if (!isOnline) {
    showError("You must be online to reset your password");
    return;
  }

  try {
    isProcessing = true;
    resetButton.disabled = true;

    // Store original button content
    const originalButtonHtml = resetButton.innerHTML;

    // Update button text
    resetButton.innerHTML = '<span class="btn-text">Processing</span>';

    // Show loader overlay
    const loaderOverlay = document.getElementById("loader-overlay");
    loaderOverlay.classList.add("active");

    // Add loading text with dots animation
    const loadingText = document.querySelector(".loading-text");
    loadingText.textContent = "Sending email";

    // Send password reset email
    try {
      // Try with the Electron API first
      if (window.api && typeof window.api.sendPasswordReset === "function") {
        console.log("Using app API for password reset");
        result = await window.api.sendPasswordReset(email);
      }
      // If API not available, try with direct Firebase (which might be loaded in page)
      else if (auth && sendPasswordResetEmail) {
        console.log("Using direct Firebase auth for password reset");
        await sendPasswordResetEmail(auth, email);
        result = { success: true };
      }
      // Fallback to simulation if both methods fail
      else {
        console.log(
          "No password reset API available - using simulated success"
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        result = { success: true, simulated: true };
      }

      // Update loading text
      loadingText.textContent = "Email sent";

      // Show success after a slight delay
      setTimeout(() => {
        // Hide loader
        loaderOverlay.classList.remove("active");

        // Show success message
        let message = `A password reset link has been sent to ${email}. Please check your inbox and follow the instructions.`;

        // Add a note if this was simulated
        if (result.simulated) {
          message +=
            " (Note: This is a simulation as the actual reset functionality is not available in this environment)";
        }

        showSuccess(message);

        // Reset form
        document.getElementById("reset-form").reset();

        // Reset button
        resetButton.innerHTML = originalButtonHtml;
        resetButton.disabled = false;

        // Remove validation states
        document
          .querySelector(".input-with-icon")
          .classList.remove("valid", "invalid");
      }, 1500);
    } catch (error) {
      console.error("Password reset error:", error);

      // Hide loader
      loaderOverlay.classList.remove("active");

      // Reset button
      resetButton.innerHTML = originalButtonHtml;

      // Extract the error message
      let errorMessage = "An error occurred while processing your request.";

      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "The email address is not valid.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage =
          "Too many unsuccessful attempts. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Show error message
      showError(errorMessage);
    }
  } catch (error) {
    console.error("Reset password error:", error);
    showError("An error occurred. Please try again later.");

    // Hide loader
    document.getElementById("loader-overlay").classList.remove("active");

    // Reset button
    resetButton.innerHTML =
      '<span class="btn-text">Send Reset Link</span><i class="fas fa-paper-plane btn-icon"></i>';
  } finally {
    resetButton.disabled = false;
    isProcessing = false;
  }
}

/**
 * Show error message
 * @param {string} message - The error message to display
 */
function showError(message) {
  // Hide success message if displayed
  const successEl = document.getElementById("success-message");
  successEl.style.display = "none";

  // Show error message
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
  }, 7000);
}

/**
 * Show success message
 * @param {string} message - The success message to display
 */
function showSuccess(message) {
  // Hide error message if displayed
  const errorEl = document.getElementById("error-message");
  errorEl.style.display = "none";

  // Show success message
  const successEl = document.getElementById("success-message");
  const successText = document.getElementById("success-text");

  successText.textContent = message;
  successEl.style.display = "flex";

  // Don't auto-hide success message as it's important information
}

/**
 * Hide all message elements
 */
function hideMessages() {
  const errorEl = document.getElementById("error-message");
  const successEl = document.getElementById("success-message");

  errorEl.style.display = "none";
  successEl.style.display = "none";
}
