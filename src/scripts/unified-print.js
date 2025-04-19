/**
 * UNIFIED PRINTING SYSTEM
 * This script provides a single consolidated printing solution that:
 * 1. When viewing a new cart: completes the sale and then prints the receipt
 * 2. When viewing an old invoice: just prints the receipt
 */

(function () {
  console.log("Initializing unified print system...");

  // Store original functions for later use
  const originalPrintReceipt = window.printReceipt;
  const originalCompleteSale = window.completeSale;

  // Unified print function that handles both scenarios
  window.printReceipt = async function () {
    try {
      console.log("Unified print function called");

      // Get cart items either from window.cart or by scanning the DOM
      let cartItems = getCartItems();
      console.log("Detected cart items:", cartItems);

      // Debug the current state
      console.log("Current state:", {
        isViewingInvoice: window.isViewingInvoice,
        currentInvoiceIndex: window.currentInvoiceIndex,
        hasAllInvoices: typeof window.allInvoices !== "undefined",
        allInvoicesLength:
          typeof window.allInvoices !== "undefined"
            ? window.allInvoices.length
            : 0,
        hasCart: cartItems.length > 0,
        cartLength: cartItems.length,
        receipt: document.getElementById("receipt-container")
          ? document.getElementById("receipt-container").innerHTML.length > 0
          : false,
      });

      // Case 1: If we have cart items and not viewing an invoice, process the sale
      if (cartItems.length > 0 && window.isViewingInvoice !== true) {
        console.log("Detected active cart with items - processing sale");

        // Clear any existing receipt content
        const receiptContainer = document.getElementById("receipt-container");
        if (receiptContainer) {
          receiptContainer.innerHTML = "";
        }

        // Try to use the Complete Sale button
        const completeSaleBtn = document.getElementById("complete-sale");

        if (completeSaleBtn && !completeSaleBtn.disabled) {
          console.log("Clicking Complete Sale button");
          completeSaleBtn.click();
          showToastNotification("Processing sale...");

          // Wait for receipt generation
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Check if receipt was generated
          if (receiptContainer) {
            const content = receiptContainer.innerHTML.trim();
            if (
              content.length > 100 &&
              !content.includes("Receipt content will be generated here")
            ) {
              printReceiptDirectly({ receiptHtml: content, isDirect: true });
              showToastNotification("Sale completed and receipt printed");
              return;
            } else {
              // Generate manual receipt
              const receipt = generateManualReceipt(cartItems);
              if (receipt) {
                printReceiptDirectly({ receiptHtml: receipt, isDirect: true });
                showToastNotification("Sale completed and receipt printed");
                return;
              }
            }
          }
        } else if (typeof window.completeSale === "function") {
          console.log("Using completeSale function directly");
          try {
            await window.completeSale();
            showToastNotification("Processing sale...");

            // Wait for receipt generation
            await new Promise((resolve) => setTimeout(resolve, 1500));

            const receiptContainer =
              document.getElementById("receipt-container");
            if (receiptContainer) {
              const content = receiptContainer.innerHTML.trim();
              if (content.length > 100) {
                printReceiptDirectly({ receiptHtml: content, isDirect: true });
                showToastNotification("Sale completed and receipt printed");
                return;
              } else {
                // Generate manual receipt
                const receipt = generateManualReceipt(cartItems);
                if (receipt) {
                  printReceiptDirectly({
                    receiptHtml: receipt,
                    isDirect: true,
                  });
                  showToastNotification("Sale completed and receipt printed");
                  return;
                }
              }
            }
          } catch (error) {
            console.error("Error completing sale:", error);
          }
        } else {
          // No button or function, create a manual receipt directly
          const receipt = generateManualReceipt(cartItems);
          if (receipt) {
            printReceiptDirectly({ receiptHtml: receipt, isDirect: true });
            showToastNotification("Receipt printed");
            return;
          }
        }
      }

      // Case 2: Viewing an old invoice - just print it
      if (
        window.isViewingInvoice === true &&
        typeof window.currentInvoiceIndex === "number" &&
        window.currentInvoiceIndex >= 0 &&
        typeof window.allInvoices === "object" &&
        window.allInvoices &&
        window.allInvoices.length > 0
      ) {
        console.log("Printing existing invoice:", window.currentInvoiceIndex);
        const invoiceData = window.allInvoices[window.currentInvoiceIndex];
        printReceiptDirectly(invoiceData);
        showToastNotification("Printing invoice #" + invoiceData.id);
        return;
      }

      // Case 3: Check if there's a valid receipt in the container
      const receiptContainer = document.getElementById("receipt-container");
      if (receiptContainer && receiptContainer.innerHTML.trim() !== "") {
        const content = receiptContainer.innerHTML.trim();
        const isPlaceholderOnly =
          content.includes("Receipt content will be generated here") ||
          content.length < 100;

        if (!isPlaceholderOnly) {
          console.log("Found valid receipt in container - printing directly");
          printReceiptDirectly({ receiptHtml: content, isDirect: true });
          showToastNotification("Printing receipt...");
          return;
        }
      }

      // If we still have cart items but didn't find a receipt, generate one manually
      if (cartItems.length > 0) {
        const receipt = generateManualReceipt(cartItems);
        if (receipt) {
          printReceiptDirectly({ receiptHtml: receipt, isDirect: true });
          showToastNotification("Receipt printed");
          return;
        }
      }

      // Case 4: Nothing to print
      showToastNotification(
        "No items to print. Add items to cart first.",
        true
      );
    } catch (error) {
      console.error("Error in unified print function:", error);
      showToastNotification("Error printing receipt: " + error.message, true);
    }
  };

  // NEW FUNCTION: Get cart items from various sources
  function getCartItems() {
    // Try to get from window.cart first
    if (window.cart && Array.isArray(window.cart) && window.cart.length > 0) {
      return window.cart;
    }

    console.log("window.cart not available, scanning DOM for cart items");

    // Scan the DOM for cart items
    const items = [];
    const rows = document.querySelectorAll("#cart-items tr:not(.empty-cart)");

    if (rows && rows.length > 0) {
      rows.forEach((row, index) => {
        // Skip any rows that are messages or informational
        if (
          row.classList.contains("edit-mode-message-row") ||
          row.classList.contains("view-mode-info-row")
        ) {
          return;
        }

        try {
          // Extract item data from the row cells
          const nameCell = row.cells[1]; // Name should be in the second column
          const priceCell = row.cells[2]; // Price should be in the third column
          const qtyCell = row.cells[3]; // Quantity should be in the fourth column

          if (nameCell && priceCell) {
            const name = nameCell.textContent.trim();
            // Remove any currency symbols and parse as float
            const price = parseFloat(
              priceCell.textContent.replace(/[^\d.-]/g, "")
            );
            const quantity = qtyCell ? parseInt(qtyCell.textContent) || 1 : 1;

            items.push({
              id: "dom-item-" + index,
              name: name,
              price: price,
              quantity: quantity,
              total: price * quantity,
            });
          }
        } catch (error) {
          console.error("Error parsing cart row:", error);
        }
      });
    }

    // If we didn't find items by rows, try looking for specific price elements
    if (items.length === 0) {
      const subtotalElement = document.getElementById("subtotal");
      const totalElement = document.getElementById("total");

      if (subtotalElement && totalElement) {
        const subtotal = parseFloat(
          subtotalElement.textContent.replace(/[^\d.-]/g, "")
        );
        const total = parseFloat(
          totalElement.textContent.replace(/[^\d.-]/g, "")
        );

        if (!isNaN(total) && total > 0) {
          // We at least know there's a total, create a generic item
          items.push({
            id: "cart-total-item",
            name: "Cart Item",
            price: total,
            quantity: 1,
            total: total,
          });
        }
      }
    }

    return items;
  }

  // Function to generate a manual receipt when normal generation fails
  function generateManualReceipt(cartItems) {
    try {
      console.log("Generating manual receipt for", cartItems.length, "items");

      if (!cartItems || cartItems.length === 0) {
        return null;
      }

      // Calculate totals
      let subtotal = 0;
      cartItems.forEach((item) => {
        subtotal += item.price * item.quantity;
      });

      // Get data from UI elements if possible
      const subtotalEl = document.getElementById("subtotal");
      const taxEl = document.getElementById("tax");
      const totalEl = document.getElementById("total");
      const customerNameEl = document.getElementById("customer-name");

      // Use values from DOM if available, otherwise calculate
      const calculatedSubtotal = subtotalEl
        ? parseFloat(subtotalEl.textContent.replace(/[^\d.-]/g, ""))
        : subtotal;
      const tax = taxEl
        ? parseFloat(taxEl.textContent.replace(/[^\d.-]/g, ""))
        : 0;
      const calculatedTotal = totalEl
        ? parseFloat(totalEl.textContent.replace(/[^\d.-]/g, ""))
        : calculatedSubtotal + tax;

      const invoiceData = {
        id: "INV-" + Date.now(),
        items: cartItems,
        customer: customerNameEl
          ? customerNameEl.value || "Guest Customer"
          : "Guest Customer",
        subtotal: calculatedSubtotal,
        tax: tax,
        total: calculatedTotal,
        date: new Date().toISOString(),
      };

      // Try to use available receipt generators
      if (typeof generateProfessionalReceipt === "function") {
        return generateProfessionalReceipt(invoiceData);
      } else if (typeof generateReceiptHtml === "function") {
        return generateReceiptHtml(invoiceData);
      } else {
        // Create basic receipt as fallback
        return generateBasicReceipt(invoiceData);
      }
    } catch (error) {
      console.error("Error generating manual receipt:", error);
      return null;
    }
  }
  const currencySymbol = localStorage.getItem("currency") === "ILS" ? "₪" : "$";

  // Basic receipt generator for last resort fallback
  function generateBasicReceipt(invoice) {
    try {
      const itemsHtml = invoice.items
        .map(
          (item) => `
        <tr>
          <td>${item.name}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">$${parseFloat(item.price).toFixed(
            2
          )}</td>
          <td style="text-align:right">$${(
            parseFloat(item.price) * item.quantity
          ).toFixed(2)}</td>
        </tr>
      `
        )
        .join("");

      return `
        <div style="font-family: Arial, sans-serif; max-width: 300px; padding: 10px;">
          <div style="text-align: center; margin-bottom: 15px;">
            <h2 style="margin: 0;">BenchPOS</h2>
            <p style="margin: 5px 0;">Receipt #${invoice.id}</p>
            <p style="margin: 5px 0;">${new Date(
              invoice.date
            ).toLocaleString()}</p>
          </div>
          
          <div style="margin-bottom: 15px;">
            <p><strong>Customer:</strong> ${invoice.customer}</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: left;">Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
            ${itemsHtml}
            <tr style="border-top: 1px solid #ddd;">
              <td colspan="3" style="text-align: right; padding-top: 10px;">Subtotal:</td>
              <td style="text-align: right; padding-top: 10px;">${currencySymbol}${invoice.subtotal.toFixed(
        2
      )}</td>
            </tr>
            <tr>
              <td colspan="3" style="text-align: right;">Tax:</td>
              <td style="text-align: right;">${currencySymbol}${invoice.tax.toFixed(
        2
      )}</td>
            </tr>
            <tr style="font-weight: bold;">
              <td colspan="3" style="text-align: right;">Total:</td>
              <td style="text-align: right;">${currencySymbol}${invoice.total.toFixed(
        2
      )}</td>
            </tr>
          </table>
          
          <div style="text-align: center; margin-top: 20px;">
            <p>Thank you for your purchase!</p>
            <p style="font-size: 0.8em;">Powered by BenchPOS</p>
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Error in basic receipt generation:", error);
      return "<div>Receipt generation failed</div>";
    }
  }

  // Helper function to print receipt
  function printReceiptDirectly(invoiceData) {
    try {
      console.log("Printing receipt directly...", invoiceData);
      let receiptHtml;
      let styles = "";

      // Check if professional styles are available
      if (typeof professionalReceiptStyles !== "undefined") {
        styles = professionalReceiptStyles;
      }

      // Get logo data directly from localStorage
      const customLogo = localStorage.getItem("companyLogo");

      // If the HTML was passed directly, use it (from receipt container)
      if (invoiceData.isDirect && invoiceData.receiptHtml) {
        console.log("Using directly provided receipt HTML");
        receiptHtml = invoiceData.receiptHtml;
      }
      // Otherwise generate receipt HTML from invoice data
      else if (!invoiceData.isDirect) {
        console.log("Generating receipt HTML from invoice data");
        // Generate receipt HTML
        if (typeof generateProfessionalReceipt === "function") {
          receiptHtml = generateProfessionalReceipt(invoiceData);
        } else if (typeof generateReceiptHtml === "function") {
          receiptHtml = generateReceiptHtml(invoiceData);
        } else {
          console.error("No receipt generation function found");
          throw new Error("Cannot generate receipt: function not found");
        }
      }

      // Create hidden iframe for printing
      const existingFrame = document.getElementById("receipt-print-frame");
      if (existingFrame) {
        document.body.removeChild(existingFrame);
      }

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
      <body>
        <div class="receipt-content" id="receipt-content">
          ${receiptHtml}
        </div>
        <script>
          // We're using the CSP with 'img-src data:' allowed, so we can directly manipulate the images
          const logoData = ${customLogo ? JSON.stringify(customLogo) : "null"};
          
          if (logoData) {
            const logoImages = document.querySelectorAll('img[alt="ShopSmart"], img[alt="Company Logo"]');
            logoImages.forEach(img => {
              img.src = logoData;
            });
          }
          
          // Allow time for the logo to load
          setTimeout(function() {
            window.print();
          }, 500);
        </script>
      </body>
      </html>
    `);
      frameDoc.close();
    } catch (error) {
      console.error("Error printing receipt:", error);
      showToastNotification("Error printing receipt", true);
    }
  }

  // Helper function to show toast notifications
  /**
   * Shows a toast notification that properly disappears after the specified duration
   * @param {string} message - The message to display
   * @param {boolean} isError - Whether this is an error message (red) or success (green)
   * @param {number} duration - How long to show the notification in milliseconds
   */
  function showToastNotification(message, isError = false, duration = 3000) {
    // Remove any existing notifications first
    const existingNotification = document.getElementById("toast-notification");
    if (existingNotification) {
      document.body.removeChild(existingNotification);
    }

    // Create new notification
    const notification = document.createElement("div");
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
    notification.style.backgroundColor = isError ? "#F44336" : "#4CAF50";
    notification.style.color = "white";
    notification.textContent = message;

    document.body.appendChild(notification);

    // Show with animation (after a tiny delay to ensure DOM update)
    setTimeout(() => {
      notification.style.opacity = "1";
      notification.style.transform = "translateY(0)";
    }, 10);

    // Hide after duration
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateY(20px)";

      // Wait for transition to complete, then remove from DOM
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300); // Wait for transition (300ms matches the CSS transition time)
    }, duration);
  }

  // Enhance F8 shortcut handler with highest priority
  function enhanceF8ShortcutHandler() {
    document.addEventListener(
      "keydown",
      function (event) {
        // F8 for printing receipts should ALWAYS work
        if (event.key === "F8") {
          console.log("F8 key intercepted for unified printing");
          event.preventDefault();
          event.stopPropagation();

          // Print receipt
          window.printReceipt();

          return false;
        }
      },
      true
    ); // true = capturing phase, ensures this runs first

    console.log("F8 shortcut enhanced for unified printing");
  }

  // Initialize
  enhanceF8ShortcutHandler();
  console.log("Unified print system initialized");
})();
