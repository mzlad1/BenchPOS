/**
 * Screen Fit Optimizer
 * Makes billing interface elements fit the screen without scaling
 */
document.addEventListener("DOMContentLoaded", function () {
  // Create toggle button
  const fitScreenButton = document.createElement("button");
  fitScreenButton.id = "fit-screen-toggle";
  fitScreenButton.textContent = "↔️";

  // Apply initial base styles
  fitScreenButton.style.position = "fixed";
  fitScreenButton.style.bottom = "15px";
  fitScreenButton.style.zIndex = "9999"; // Higher z-index to ensure visibility
  fitScreenButton.style.backgroundColor = "#6366f1";
  fitScreenButton.style.color = "white";
  fitScreenButton.style.border = "none";
  fitScreenButton.style.borderRadius = "8px";
  fitScreenButton.style.padding = "8px 16px";
  fitScreenButton.style.fontWeight = "600";
  fitScreenButton.style.cursor = "pointer";
  fitScreenButton.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
  fitScreenButton.style.fontFamily = "inherit"; // Use the site's font

  // Add to body first
  document.body.appendChild(fitScreenButton);

  // Debug info
  console.log("Screen Fit button created with ID: fit-screen-toggle");

  // Function to update button position based on RTL/LTR
  function updateButtonPosition() {
    const isRTL = document.documentElement.dir === "rtl";
    console.log("RTL detection:", isRTL);

    if (isRTL) {
      // For RTL (Arabic)
      fitScreenButton.style.left = "15px";
      fitScreenButton.style.right = "auto";

      // Make more visible in RTL mode
      fitScreenButton.style.backgroundColor = "#8c52ff"; // Different color in RTL mode
      console.log("Button positioned on LEFT for RTL");
    } else {
      // For LTR (English)
      fitScreenButton.style.right = "15px";
      fitScreenButton.style.left = "auto";
      console.log("Button positioned on RIGHT for LTR");
    }

    // Ensure button is visible
    fitScreenButton.style.display = "block";

    // Log button position
    const buttonRect = fitScreenButton.getBoundingClientRect();
    console.log("Button position:", {
      left: buttonRect.left,
      right: window.innerWidth - buttonRect.right,
      visible: buttonRect.left >= 0 && buttonRect.right <= window.innerWidth,
    });
  }

  // Call position update initially
  updateButtonPosition();

  // Function to optimize the screen space
  function optimizeScreenSpace(enable) {
    // These are the style changes we'll make when optimized mode is enabled
    const optimizedStyles = `
      /* Reduce overall spacing */
      .billing-container {
        gap: 12px !important;
        padding: 8px !important;
      }
      
      /* Adjust product tiles to be more compact */
      .products-grid {
        gap: 8px !important;
        padding: 8px !important;
        max-height: 230px !important;
      }
      
      /* Make the product cards shorter */
      .product-item {
        padding: 8px !important;
        min-height: auto !important;
      }
      
      /* Reduce heights of various sections */
      .cart-items {
        height: 180px !important;
        max-height: 180px !important;
      }
      
      /* Adjust table padding */
      #cart-table th, #cart-table td {
        padding: 4px 8px !important;
      }
      
      /* Make buttons more compact */
      .payment-actions button {
        padding: 8px !important;
      }
      
      /* Reduce other padding */
      .search-bar, .invoice-details, .summary-row {
        padding: 8px !important;
      }
      
      /* Reduce margins */
      .invoice-summary, .customer-info {
        margin-bottom: 8px !important;
      }
    `;

    // Add or remove the style element
    let styleEl = document.getElementById("optimize-screen-styles");

    if (enable) {
      // If the style element doesn't exist, create it
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "optimize-screen-styles";
        styleEl.textContent = optimizedStyles;
        document.head.appendChild(styleEl);
        console.log("Screen fit optimization ENABLED");
      }
      fitScreenButton.textContent = t("screenFit.normalView");
      fitScreenButton.style.backgroundColor =
        document.documentElement.dir === "rtl" ? "#5d4a7e" : "#64748b";
    } else {
      // If the style element exists, remove it
      if (styleEl) {
        styleEl.remove();
        console.log("Screen fit optimization DISABLED");
      }
      fitScreenButton.textContent = t("screenFit.fitToScreen");
      fitScreenButton.style.backgroundColor =
        document.documentElement.dir === "rtl" ? "#8c52ff" : "#6366f1";
    }

    // Save preference
    localStorage.setItem("billingOptimized", enable ? "true" : "false");
  }

  // Toggle button click handler
  let isOptimized = false;
  fitScreenButton.addEventListener("click", function () {
    console.log("Screen fit button clicked");
    isOptimized = !isOptimized;
    optimizeScreenSpace(isOptimized);
  });

  // Check for saved preference
  window.addEventListener("load", function () {
    console.log("Page fully loaded - checking preferences");
    const savedPreference = localStorage.getItem("billingOptimized");
    if (savedPreference === "true") {
      isOptimized = true;
      optimizeScreenSpace(true);
    }

    // Update position again when page is fully loaded
    updateButtonPosition();

    // Make sure button is visible by forcing a reflow
    setTimeout(() => {
      fitScreenButton.style.opacity = "0.99";
      setTimeout(() => (fitScreenButton.style.opacity = "1"), 50);
      updateButtonPosition();
    }, 100);
  });

  // Listen for language/direction changes
  window.addEventListener("languageChanged", function () {
    console.log("Language changed event detected");
    updateButtonPosition();
  });

  // Listen to RTL/LTR changes through dir attribute
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.attributeName === "dir") {
        console.log("DIR attribute changed:", document.documentElement.dir);
        updateButtonPosition();
      }
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["dir"],
  });

  // Automatically optimize on smaller screens
  function checkScreenAndOptimize() {
    const viewportHeight = window.innerHeight;

    // If screen height is smaller than 768px and user hasn't set preference
    if (
      viewportHeight < 768 &&
      localStorage.getItem("billingOptimized") === null
    ) {
      isOptimized = true;
      optimizeScreenSpace(true);
    }
  }

  // Run screen check after a short delay
  setTimeout(checkScreenAndOptimize, 500);

  // One final position check after a longer delay
  setTimeout(updateButtonPosition, 1500);
});
