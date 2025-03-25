// This function applies a much stronger fix to force the cart to be scrollable
function forceCartScrolling() {
    const styleElement = document.createElement("style");
    styleElement.textContent = `
    /* Force fixed height for cart container with !important to override existing styles */
    .cart-items {
      height: 250px !important; /* Fixed height - adjust if needed */
      max-height: 250px !important;
      overflow-y: auto !important;
      border: 1px solid var(--border-color) !important;
      border-radius: 8px !important;
      position: relative !important;
      display: block !important; /* Override any flex display */
    }
    
    /* Force table to take full width and proper layout */
    #cart-table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 0 !important;
    }
    
    /* Make header sticky with higher z-index to ensure it stays on top */
    #cart-table thead {
      position: sticky !important;
      top: 0 !important;
      z-index: 100 !important;
      background-color: var(--primary-light) !important;
    }
    
    #cart-table th {
      position: sticky !important;
      top: 0 !important;
      background-color: var(--primary-light) !important;
      box-shadow: 0 1px 0 0 var(--border-color) !important;
    }
    
    /* Set explicit height for the invoice details to prevent page overflow */
    .invoice-details {
      display: flex !important;
      flex-direction: column !important;
      height: auto !important;
    }
    
    /* Make sure invoice panel has proper constraints */
    .invoice-panel {
      display: flex !important;
      flex-direction: column !important;
      height: auto !important;
      overflow: visible !important;
    }
    
    /* Ensure the scrollbar is visible and functioning */
    .cart-items::-webkit-scrollbar {
      width: 8px !important;
      display: block !important;
    }
    
    .cart-items::-webkit-scrollbar-track {
      background: #f1f1f1 !important;
      border-radius: 8px !important;
    }
    
    .cart-items::-webkit-scrollbar-thumb {
      background: var(--primary-color) !important;
      border-radius: 8px !important;
    }
    
  `;
    document.head.appendChild(styleElement);

    console.log("Applied forced cart scrolling styles");

    // Add an additional function to ensure proper initialization
    function ensureCartScrolling() {
        const cartItemsContainer = document.querySelector(".cart-items");
        if (cartItemsContainer) {
            // Force the height and scrolling behavior through direct style modification
            cartItemsContainer.style.height = "250px";
            cartItemsContainer.style.maxHeight = "250px";
            cartItemsContainer.style.overflowY = "auto";

            // Force table headers to be sticky
            const tableHeaders = document.querySelectorAll("#cart-table th");
            tableHeaders.forEach((th) => {
                th.style.position = "sticky";
                th.style.top = "0";
                th.style.zIndex = "100";
            });

            console.log("Applied direct style modifications to cart container");
        }
    }

    // Execute immediately and also set up for later execution
    ensureCartScrolling();

    // Set a mutation observer to ensure scrolling behavior persists
    // even if the DOM changes (like when items are added)
    const observer = new MutationObserver((mutations) => {
        ensureCartScrolling();
    });

    const cartItemsContainer = document.querySelector(".cart-items");
    if (cartItemsContainer) {
        observer.observe(cartItemsContainer, {
            childList: true,
            subtree: true,
        });
    }

    // Also handle window resize events
    window.addEventListener("resize", ensureCartScrolling);
}

// Listen for online/offline events
window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);

// Initialize the page when DOM is loaded
// Initialize the page when DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
    await initPage();

    // Add logout button listener if it exists
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }

    // Set up online status change listeners
    if (window.api && typeof window.api.onOnlineStatusChanged === "function") {
        window.api.onOnlineStatusChanged((online) => {
            console.log(
                `Connection status changed: ${online ? "Online" : "Offline"}`
            );
            updateConnectionStatus();
        });
    }
    initializeCartTable();
    addShortcutStyles();
    initKeyboardShortcuts();
    addDiscountStyles();
    addMultiSelectStyles();
    updateRenderCartForDiscounts();
    updateUpdateTotalsForDiscounts();
    updateCompleteSaleForDiscounts();
    initProductPagination();
    addInvoiceNavigationStyles();
    addRefundButton();
    updateCartTableHeader();
    enhanceProductGrid();
    fixProductCardHeight();
    fixProductPageSpacing();
    setTimeout(fixKeyboardShortcuts, 500);
    setTimeout(forceCartScrolling, 300); // Slight delay to ensure DOM is ready

    // Check for API support
    checkInvoiceUpdateSupport();
    if (typeof window.initSyncUI === "function") {
        window.initSyncUI();
    }

    // Focus barcode input after all initialization is complete
    setTimeout(() => {
        const barcodeInput = document.getElementById("barcode-input");
        if (barcodeInput) {
            barcodeInput.focus();
            console.log("Focused barcode input on page fully loaded");
        }
    }, 1000);

    setTimeout(fixProductCards, 300);
    // Initialize after page has loaded completely
    setTimeout(() => {
        initInvoiceNavigation();
    }, 300);

    // Initialize after page has loaded completely to avoid conflicts
    setTimeout(() => {
        initBarcodeFeature();
    }, 200);

    // Initialize after page has loaded completely
    setTimeout(() => {
        console.log(
            "Summary element exists:",
            !!document.querySelector(".invoice-summary")
        );
        console.log(
            "Total row exists:",
            !!document.querySelector(".summary-row.total")
        );
        initDiscountFeature();
    }, 100);
});

// Remove the other DOMContentLoaded event listeners
// After the window event listeners, add:
if (window.api && typeof window.api.onOnlineStatusChanged === "function") {
    window.api.onOnlineStatusChanged((online) => {
        console.log(`Connection status changed: ${online ? "Online" : "Offline"}`);
        updateConnectionStatus();
    });
}