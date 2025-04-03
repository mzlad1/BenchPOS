/**
 * DIRECT CART PRINTING SYSTEM
 *
 * This script completely overrides the receipt workflow:
 * - Completes sales without showing receipt modal
 * - Prints ONLY current cart contents when F8 is pressed
 * - Shows notification instead of modal
 *
 * Place this script at the end of your HTML file, after all other scripts.
 */

// ======== OVERRIDE COMPLETE SALE FUNCTION ========
// This completely replaces the original completeSale function
window.completeSale = async function () {
  console.log("Direct cart printing: completeSale called");
  if (cart.length === 0) return;

  try {
    // Build invoice data based on cart contents
    const invoiceData = {
      items: cart.map((item) => ({
        ...item,
        originalPrice: item.price,
        finalPrice: item.price,
      })),
      customer: customerNameEl.value || "Guest Customer",
      subtotal: parseFloat(subtotalEl.textContent.replace("$", "")),
      tax: parseFloat(taxEl.textContent.replace("$", "")),
      total: parseFloat(totalEl.textContent.replace("$", "")),
      date: new Date().toISOString(),
      isRefund: cart.some((item) => item.price < 0),
    };

    // Apply discount if available
    if (
      typeof document.getElementById("discount-value") !== "undefined" &&
      document.getElementById("discount-value") !== null
    ) {
      invoiceData.discount = parseFloat(
        document.getElementById("discount-value").textContent.replace("$", "")
      );
    }

    console.log("Saving invoice to database...");
    // Save invoice to database
    const invoiceId = await window.api.createInvoice(invoiceData);
    console.log("Invoice saved with ID:", invoiceId);

    // Update the in-memory invoices array if it exists
    if (typeof allInvoices !== "undefined") {
      const newInvoice = {
        ...invoiceData,
        id: invoiceId,
        createdAt: new Date().toISOString(),
      };
      allInvoices.unshift(newInvoice); // Add to beginning (newest first)
      currentInvoiceIndex = 0;
    }

    // Generate receipt HTML based on available generator function
    let receiptHtml;
    if (typeof generateProfessionalReceipt === "function") {
      receiptHtml = generateProfessionalReceipt({
        ...invoiceData,
        id: invoiceId,
      });
    } else {
      receiptHtml = generateReceiptHtml({
        ...invoiceData,
        id: invoiceId,
      });
    }

    // Store receipt in hidden container
    if (!document.getElementById("hidden-receipt-container")) {
      const hiddenContainer = document.createElement("div");
      hiddenContainer.id = "hidden-receipt-container";
      hiddenContainer.style.display = "none";
      document.body.appendChild(hiddenContainer);
    }

    document.getElementById("hidden-receipt-container").innerHTML = receiptHtml;

    // IMPORTANT: DO NOT show receipt modal
    // receiptContainerEl.innerHTML = receiptHtml;
    // receiptModal.style.display = "block";

    // Clear the cart and reset UI
    clearCart();

    // Show notification
    showToastNotification(
      `${
        invoiceData.isRefund ? "Return" : "Sale"
      } completed successfully. Press F8 to print receipt.`
    );
  } catch (error) {
    console.error("Error completing sale:", error);
    alert("Failed to complete sale. Please try again.");
  }
};

// ======== OVERRIDE PRINT RECEIPT FUNCTION ========
// This completely replaces the original printReceipt function - CART ONLY!
window.printReceipt = function () {
  console.log("Direct cart printing: printReceipt called");
  const debugInfo = {
    isViewingInvoice: window.isViewingInvoice,
    currentInvoiceIndex: window.currentInvoiceIndex,
    hasAllInvoices: typeof window.allInvoices !== "undefined",
    allInvoicesLength:
      typeof window.allInvoices !== "undefined" ? window.allInvoices.length : 0,
    hasCart: typeof window.cart !== "undefined",
    cartLength: typeof window.cart !== "undefined" ? window.cart.length : 0,
  };
  console.log("Print context:", debugInfo);

  try {
    let receiptHtml;
    let styles = "";

    // Check if professional styles are available
    if (typeof professionalReceiptStyles !== "undefined") {
      styles = professionalReceiptStyles;
    }

    // FIRST CASE: Check if we are viewing a specific invoice (with strict conditions)
    if (
      window.isViewingInvoice === true &&
      typeof window.currentInvoiceIndex === "number" &&
      window.currentInvoiceIndex >= 0 &&
      typeof window.allInvoices === "object" &&
      Array.isArray(window.allInvoices) &&
      window.allInvoices.length > 0 &&
      window.currentInvoiceIndex < window.allInvoices.length
    ) {
      console.log("Printing specific invoice:", window.currentInvoiceIndex);
      const invoiceData = window.allInvoices[window.currentInvoiceIndex];
      console.log("Invoice being printed:", invoiceData.id);

      // Generate receipt HTML for the specific invoice
      if (typeof generateProfessionalReceipt === "function") {
        receiptHtml = generateProfessionalReceipt(invoiceData);
      } else {
        receiptHtml = generateReceiptHtml(invoiceData);
      }

      // Print receipt directly to printer
      printReceiptDirectly(receiptHtml, styles);

      // Show notification
      showToastNotification("Printing invoice #" + invoiceData.id);
      return;
    }

    // SECOND CASE: Check if cart exists and has items (with strict conditions)
    if (
      typeof window.cart === "object" &&
      Array.isArray(window.cart) &&
      window.cart.length > 0
    ) {
      console.log(
        "Generating receipt from current cart items:",
        window.cart.length,
        "items"
      );

      // Create invoice data from current cart
      const invoiceData = {
        items: window.cart.map((item) => ({
          ...item,
          originalPrice: item.price,
          finalPrice: item.price,
        })),
        customer:
          typeof window.customerNameEl !== "undefined" && window.customerNameEl
            ? window.customerNameEl.value || "Guest Customer"
            : "Guest Customer",
        subtotal:
          typeof window.subtotalEl !== "undefined" && window.subtotalEl
            ? parseFloat(window.subtotalEl.textContent.replace("$", ""))
            : window.cart.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
              ),
        tax:
          typeof window.taxEl !== "undefined" && window.taxEl
            ? parseFloat(window.taxEl.textContent.replace("$", ""))
            : 0,
        total:
          typeof window.totalEl !== "undefined" && window.totalEl
            ? parseFloat(window.totalEl.textContent.replace("$", ""))
            : window.cart.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
              ),
        date: new Date().toISOString(),
        id: "CART-" + new Date().getTime(),
        isRefund: window.cart.some((item) => item.price < 0),
      };

      // Generate receipt HTML
      if (typeof generateProfessionalReceipt === "function") {
        receiptHtml = generateProfessionalReceipt(invoiceData);
      } else {
        receiptHtml = generateReceiptHtml(invoiceData);
      }

      // Print receipt directly to printer
      printReceiptDirectly(receiptHtml, styles);

      // Show notification
      showToastNotification("Printing current cart items...");
      return;
    }

    // THIRD CASE: Check if there's a receipt in the container
    const receiptContainer = document.getElementById("receipt-container");
    if (receiptContainer && receiptContainer.innerHTML.trim() !== "") {
      console.log("Using receipt from container");
      receiptHtml = receiptContainer.innerHTML;
      printReceiptDirectly(receiptHtml, styles);
      showToastNotification("Printing receipt from container...");
      return;
    }

    // FOURTH CASE: Check if there's a receipt in the hidden container
    const hiddenContainer = document.getElementById("hidden-receipt-container");
    if (hiddenContainer && hiddenContainer.innerHTML.trim() !== "") {
      console.log("Using receipt from hidden container");
      receiptHtml = hiddenContainer.innerHTML;
      printReceiptDirectly(receiptHtml, styles);
      showToastNotification("Printing last completed sale...");
      return;
    }

    // If we get here, there's nothing to print
    console.warn(
      "Nothing to print: No invoice being viewed, empty cart, and no receipt container"
    );
    showToastNotification("Nothing to print. Add items to cart first.", true);
  } catch (error) {
    console.error("Error printing receipt:", error);
    showToastNotification("Error printing receipt: " + error.message, true);

    // Try fallback method - download instead
    try {
      if (typeof downloadReceiptAsHTML === "function") {
        console.log("Attempting fallback download method");

        // If we're viewing an invoice, use that data
        if (
          window.isViewingInvoice === true &&
          typeof window.currentInvoiceIndex === "number" &&
          window.currentInvoiceIndex >= 0 &&
          typeof window.allInvoices === "object" &&
          Array.isArray(window.allInvoices) &&
          window.allInvoices.length > 0
        ) {
          const invoiceData = window.allInvoices[window.currentInvoiceIndex];

          // Generate receipt HTML
          let receiptHtml;
          if (typeof generateProfessionalReceipt === "function") {
            receiptHtml = generateProfessionalReceipt(invoiceData);
          } else {
            receiptHtml = generateReceiptHtml(invoiceData);
          }

          // Download as HTML
          downloadReceiptAsHTML(receiptHtml, styles, invoiceData.id);
          return;
        }

        // Otherwise if we have cart items, use those
        if (
          typeof window.cart === "object" &&
          Array.isArray(window.cart) &&
          window.cart.length > 0
        ) {
          const invoiceData = {
            items: window.cart.map((item) => ({
              ...item,
              originalPrice: item.price,
              finalPrice: item.price,
            })),
            customer:
              typeof window.customerNameEl !== "undefined" &&
              window.customerNameEl
                ? window.customerNameEl.value || "Guest Customer"
                : "Guest Customer",
            subtotal:
              typeof window.subtotalEl !== "undefined" && window.subtotalEl
                ? parseFloat(window.subtotalEl.textContent.replace("$", ""))
                : window.cart.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                  ),
            tax:
              typeof window.taxEl !== "undefined" && window.taxEl
                ? parseFloat(window.taxEl.textContent.replace("$", ""))
                : 0,
            total:
              typeof window.totalEl !== "undefined" && window.totalEl
                ? parseFloat(window.totalEl.textContent.replace("$", ""))
                : window.cart.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                  ),
            date: new Date().toISOString(),
            id: "CART-" + new Date().getTime(),
          };

          // Generate receipt HTML
          let receiptHtml;
          if (typeof generateProfessionalReceipt === "function") {
            receiptHtml = generateProfessionalReceipt(invoiceData);
          } else {
            receiptHtml = generateReceiptHtml(invoiceData);
          }

          // Download as HTML
          downloadReceiptAsHTML(receiptHtml, styles, invoiceData.id);
          return;
        }

        // Try receipt containers
        const receiptContainer = document.getElementById("receipt-container");
        if (receiptContainer && receiptContainer.innerHTML.trim() !== "") {
          downloadReceiptAsHTML(
            receiptContainer.innerHTML,
            styles,
            "receipt-" + new Date().getTime()
          );
          return;
        }

        const hiddenContainer = document.getElementById(
          "hidden-receipt-container"
        );
        if (hiddenContainer && hiddenContainer.innerHTML.trim() !== "") {
          downloadReceiptAsHTML(
            hiddenContainer.innerHTML,
            styles,
            "receipt-" + new Date().getTime()
          );
          return;
        }

        alert("No content to print. Please add items to the cart first.");
      } else {
        alert(
          "Printing failed and fallback download not available. Please try again later."
        );
      }
    } catch (fallbackError) {
      console.error("Fallback printing also failed:", fallbackError);
      alert(
        "Unable to print or download receipt. Please check your system configuration."
      );
    }
  }
};
function fixInvoiceNavigation() {
  // Fix loadInvoice function
  if (typeof window.loadInvoice === "function") {
    const originalLoadInvoice = window.loadInvoice;
    window.loadInvoice = function (invoice) {
      // Explicitly set the viewing flag
      window.isViewingInvoice = true;
      console.log("Loading invoice, setting isViewingInvoice=true");
      return originalLoadInvoice.apply(this, arguments);
    };
  }

  // Fix startNewInvoice function
  if (typeof window.startNewInvoice === "function") {
    const originalStartNewInvoice = window.startNewInvoice;
    window.startNewInvoice = function () {
      // Explicitly set the viewing flag
      window.isViewingInvoice = false;
      console.log("Starting new invoice, setting isViewingInvoice=false");
      return originalStartNewInvoice.apply(this, arguments);
    };
  }

  console.log("Invoice navigation fixes applied");
}
// ======== PRINT DIRECTLY TO PRINTER ========
function printReceiptDirectly(html, styles) {
  try {
    console.log("Printing receipt directly...");

    // Remove any existing print frames
    const existingFrame = document.getElementById("receipt-print-frame");
    if (existingFrame) {
      document.body.removeChild(existingFrame);
    }

    // Create hidden iframe for printing
    const printFrame = document.createElement("iframe");
    printFrame.id = "receipt-print-frame";
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.style.zIndex = "-1000";

    document.body.appendChild(printFrame);

    // Get the iframe document
    const frameDoc =
      printFrame.contentDocument || printFrame.contentWindow.document;

    // Write print-ready HTML to the iframe
    frameDoc.open();
    frameDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Receipt</title>
                <style>
                    body {
                        font-family: 'Helvetica', 'Arial', sans-serif;
                        max-width: 80mm;
                        margin: 0 auto;
                        padding: 0;
                    }
                    
                    /* Receipt Styles */
                    ${styles}
                    
                    /* Default receipt styles */
                    .receipt-header {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .receipt-info {
                        margin-bottom: 20px;
                    }
                    .receipt-items {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .receipt-items th, .receipt-items td {
                        padding: 8px;
                        text-align: left;
                        border-bottom: 1px solid #ddd;
                    }
                    .total-row {
                        font-weight: bold;
                    }
                    .receipt-footer {
                        margin-top: 20px;
                        text-align: center;
                        font-style: italic;
                    }
                    
                    /* Print-specific styles */
                    @media print {
                        body {
                            width: 80mm; /* Standard receipt width */
                            margin: 0;
                            padding: 0;
                        }
                        
                        .professional-receipt {
                            width: 100%;
                            max-width: none;
                            border: none;
                            box-shadow: none;
                        }
                    }
                </style>
            </head>
            <body onload="setTimeout(function() { window.print(); }, 200);">
                <div class="receipt-content">
                    ${html}
                </div>
            </body>
            </html>
        `);
    frameDoc.close();

    // Wait for iframe to load before printing
    setTimeout(function () {
      try {
        // Focus the iframe window
        printFrame.contentWindow.focus();

        // Print (this opens the system print dialog)
        printFrame.contentWindow.print();
      } catch (e) {
        console.error("Printing failed:", e);
        throw new Error("Printing failed. Please check printer connection.");
      }
    }, 500);
  } catch (error) {
    console.error("Error setting up print:", error);
    throw new Error("Failed to print receipt.");
  }
}

function downloadReceiptAsHTML(html, styles, invoiceId) {
  try {
    // Generate invoice ID if not provided
    if (!invoiceId) {
      invoiceId = "receipt-" + new Date().getTime();
      // Try to extract the invoice ID if possible
      try {
        const idMatch = html.match(/Receipt #:\s*([a-zA-Z0-9-]+)/);
        if (idMatch && idMatch[1]) {
          invoiceId = idMatch[1];
        }
      } catch (err) {
        console.log("Couldn't extract invoice ID, using generated one instead");
      }
    }

    // Create a styled HTML document
    const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt ${invoiceId}</title>
                <style>
                    body {
                        font-family: 'Helvetica', 'Arial', sans-serif;
                        max-width: 80mm;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    
                    ${styles}
                    
                    @media print {
                        body {
                            padding: 0;
                            width: 100%;
                        }
                        button, .no-print {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="receipt-content">
                    ${html}
                </div>
                <div class="no-print" style="margin-top: 30px; text-align: center;">
                    <button onclick="window.print();" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Print this receipt
                    </button>
                </div>
            </body>
            </html>
        `;

    // Create a Blob containing the HTML
    const blob = new Blob([fullHtml], { type: "text/html" });

    // Create a link element to download the file
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `receipt-${invoiceId}.html`;

    // Append to body, click to download, then remove
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToastNotification(
      `Receipt downloaded as HTML file: receipt-${invoiceId}.html`
    );
  } catch (error) {
    console.error("Error creating downloadable receipt:", error);
    alert("Failed to create downloadable receipt. Please try again.");
  }
}
// ======== NOTIFICATION FUNCTIONS ========
function showToastNotification(message, isError = false, duration = 5000) {
  // Create notification element if it doesn't exist
  let notification = document.getElementById("toast-notification");

  if (!notification) {
    notification = document.createElement("div");
    notification.id = "toast-notification";
    notification.style.position = "fixed";
    notification.style.bottom = "20px";
    notification.style.right = "20px";
    notification.style.padding = "16px 24px";
    notification.style.borderRadius = "4px";
    notification.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    notification.style.zIndex = "10000";
    notification.style.transition = "opacity 0.3s, transform 0.3s";
    notification.style.opacity = "0";
    notification.style.transform = "translateY(20px)";
    notification.style.fontSize = "14px";
    document.body.appendChild(notification);
  }

  // Set color based on message type
  notification.style.backgroundColor = isError ? "#F44336" : "#4CAF50";
  notification.style.color = "white";

  // Update content
  notification.textContent = message;

  // Show with animation
  setTimeout(() => {
    notification.style.opacity = "1";
    notification.style.transform = "translateY(0)";
  }, 10);

  // Hide after duration
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateY(20px)";
  }, duration);
}

// ======== ENHANCED KEYBOARD SHORTCUTS ========
// Add F8 key handler with highest priority
function enhanceF8ShortcutHandler() {
  document.addEventListener(
    "keydown",
    function (event) {
      // F8 for printing receipts should ALWAYS work
      if (event.key === "F8") {
        console.log("F8 key intercepted for direct printing");
        event.preventDefault();
        event.stopPropagation();

        // Print receipt
        window.printReceipt();

        return false;
      }
    },
    true
  ); // true = capturing phase, ensures this runs first

  // Update existing keyboard handlers if available
  if (typeof window.handleKeyboardShortcut === "function") {
    const originalHandleKeyboardShortcut = window.handleKeyboardShortcut;
    window.handleKeyboardShortcut = function (event) {
      if (event.key === "F8") {
        event.preventDefault();
        window.printReceipt();
        return false;
      }
      return originalHandleKeyboardShortcut.apply(this, arguments);
    };
  }

  // Fix F8 handler in functionKeyHandlers if it exists
  if (
    typeof window.functionKeyHandlers !== "undefined" &&
    window.functionKeyHandlers.F8
  ) {
    window.functionKeyHandlers.F8 = function () {
      window.printReceipt();
    };
  }

  console.log("F8 shortcut enhanced for direct cart printing");
}

// ======== MODIFY RECEIPT MODAL BEHAVIOR ========
function modifyReceiptModalBehavior() {
  // If the modal already exists, modify its behavior
  const receiptModal = document.getElementById("receipt-modal");
  if (receiptModal) {
    // Hide the modal initially
    receiptModal.style.display = "none";

    // New Sale button should close modal
    const newSaleBtn = document.getElementById("new-sale");
    if (newSaleBtn) {
      newSaleBtn.addEventListener("click", function () {
        receiptModal.style.display = "none";
      });
    }

    // Print button should call our printReceipt function
    const printBtn = document.getElementById("print-receipt");
    if (printBtn) {
      printBtn.addEventListener("click", window.printReceipt);
    }

    // Close button should close modal
    const closeBtn = receiptModal.querySelector(".close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        receiptModal.style.display = "none";
      });
    }

    console.log("Receipt modal behavior modified");
  }
}

// ======== INITIALIZATION ========
function initDirectCartPrinting() {
  console.log("Initializing fixed receipt printing system...");

  // Enhance F8 shortcut handling
  enhanceF8ShortcutHandler();

  // Apply invoice navigation fixes
  fixInvoiceNavigation();

  console.log("Receipt printing system fixed and initialized");
  showToastNotification(
    "Receipt system improved. F8 will print the correct content."
  );
}

// Run initialization when the page is fully loaded
window.addEventListener("load", initDirectCartPrinting);

// Also run when DOM is ready as a fallback
document.addEventListener("DOMContentLoaded", function () {
  // Add a slight delay to ensure all other scripts have initialized
  setTimeout(initDirectCartPrinting, 1000);
});

// Initialize immediately if document is already loaded
if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  setTimeout(initDirectCartPrinting, 1000);
}
// Force hide the receipt modal at the beginning of the script
if (document.getElementById("receipt-modal")) {
  document.getElementById("receipt-modal").style.display = "none";
}
// Add this to your direct-receipt-system.js
setInterval(function () {
  const modal = document.getElementById("receipt-modal");
  if (modal && modal.style.display === "block") {
    console.log("Forcing modal to hide");
    modal.style.display = "none";
    // Clear the cart and reset UI
    clearCart();
  }
}, 10);
