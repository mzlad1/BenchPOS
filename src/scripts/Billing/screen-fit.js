/**
 * Screen Fit Optimizer
 * Makes billing interface elements fit the screen without scaling
 */
document.addEventListener("DOMContentLoaded", function () {
  // Create toggle button
  const fitScreenButton = document.createElement("button");
  fitScreenButton.id = "fit-screen-toggle";
  fitScreenButton.textContent = "Fit to Screen";
  fitScreenButton.style.cssText = `
    position: fixed;
    bottom: 15px;
    right: 15px;
    z-index: 1000;
    background-color: #6366f1;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;
  document.body.appendChild(fitScreenButton);

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
      }
      fitScreenButton.textContent = "Normal View";
      fitScreenButton.style.backgroundColor = "#64748b";
    } else {
      // If the style element exists, remove it
      if (styleEl) {
        styleEl.remove();
      }
      fitScreenButton.textContent = "Fit to Screen";
      fitScreenButton.style.backgroundColor = "#6366f1";
    }

    // Save preference
    localStorage.setItem("billingOptimized", enable ? "true" : "false");
  }

  // Toggle button click handler
  let isOptimized = false;
  fitScreenButton.addEventListener("click", function () {
    isOptimized = !isOptimized;
    optimizeScreenSpace(isOptimized);
  });

  // Check for saved preference
  window.addEventListener("load", function () {
    const savedPreference = localStorage.getItem("billingOptimized");
    if (savedPreference === "true") {
      isOptimized = true;
      optimizeScreenSpace(true);
    }
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
});
