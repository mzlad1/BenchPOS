/**
 * UNIFIED PRINTING SYSTEM
 *
 * This script provides a single consolidated printing solution that:
 * 1. When viewing a new cart: completes the sale and then prints the receipt
 * 2. When viewing an old invoice: just prints the receipt
 *
 * Place this script AFTER all other scripts in your HTML file.
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

      // Debug the current state
      console.log("Current state:", {
        isViewingInvoice: window.isViewingInvoice,
        currentInvoiceIndex: window.currentInvoiceIndex,
        hasAllInvoices: typeof window.allInvoices !== "undefined",
        allInvoicesLength:
          typeof window.allInvoices !== "undefined"
            ? window.allInvoices.length
            : 0,
        hasCart: typeof window.cart !== "undefined",
        cartLength: typeof window.cart !== "undefined" ? window.cart.length : 0,
        receipt: document.getElementById("receipt-container")
          ? document.getElementById("receipt-container").innerHTML.length > 0
          : false,
      });

      // Case 0: Check if there's a VALID receipt in the container first
      const receiptContainer = document.getElementById("receipt-container");
      if (receiptContainer && receiptContainer.innerHTML.trim() !== "") {
        // Check if the receipt container has actual content, not just placeholders
        const content = receiptContainer.innerHTML.trim();
        const isPlaceholderOnly =
          content.includes("Receipt content will be generated here") ||
          content.length < 100; // Too small to be a real receipt

        if (!isPlaceholderOnly) {
          console.log("Found valid receipt in container - printing directly");
          const receiptHtml = receiptContainer.innerHTML;
          const styles =
            typeof professionalReceiptStyles !== "undefined"
              ? professionalReceiptStyles
              : "";
          printReceiptDirectly({ receiptHtml, isDirect: true });
          showToastNotification("Printing receipt...");
          return;
        } else {
          console.log("Found placeholder or empty receipt - ignoring");
        }
      }

      // Try to access cart from global variables or from DOM
      let cart = window.cart;

      // First method: Check window.cart
      if (!cart || !Array.isArray(cart) || cart.length === 0) {
        console.log("Window.cart not available or empty, trying DOM detection");

        // Second method: Try to get cart items from the DOM as fallback
        const cartItemsEl = document.getElementById("cart-items");
        if (
          cartItemsEl &&
          cartItemsEl.children.length > 0 &&
          !cartItemsEl.querySelector(".empty-cart")
        ) {
          console.log(
            "Cart found from DOM:",
            cartItemsEl.children.length,
            "items"
          );
          cart = { length: cartItemsEl.children.length, fromDOM: true };
        } else {
          console.log("Trying to find cart items through table rows");

          // Third method: Look for table rows in the cart
          const cartRows = document.querySelectorAll(
            "#cart-table tbody tr:not(.empty-cart)"
          );
          if (cartRows && cartRows.length > 0) {
            console.log(
              "Cart found from table rows:",
              cartRows.length,
              "items"
            );
            cart = { length: cartRows.length, fromDOM: true };
          }
        }
      } else {
        console.log("Found window.cart with", cart.length, "items");
      }

      // Case 1: Viewing an old invoice - just print it
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
        console.log("Invoice being printed:", invoiceData.id);

        // Generate and print receipt
        printReceiptDirectly(invoiceData);
        showToastNotification("Printing invoice #" + invoiceData.id);
        return;
      }

      // Case 2: New cart - complete sale first, then print
      if (cart && cart.length > 0) {
        console.log("Cart detected with", cart.length, "items");

        // Always try to use the complete sale button for maximum reliability
        const completeSaleBtn = document.getElementById("complete-sale");

        // Check if button is available and not disabled
        if (completeSaleBtn && !completeSaleBtn.disabled) {
          console.log("Found active Complete Sale button - clicking it");

          // Click the button to complete the sale
          completeSaleBtn.click();

          // Show notification immediately
          showToastNotification("Processing sale...");

          // Longer wait for receipt modal to appear and be populated
          setTimeout(() => {
            // Check for receipt in modal
            const receiptContainer =
              document.getElementById("receipt-container");
            if (receiptContainer) {
              const content = receiptContainer.innerHTML.trim();
              const isValidReceipt =
                content.length > 100 &&
                !content.includes("Receipt content will be generated here");

              if (isValidReceipt) {
                console.log("Found valid receipt after sale completion");
                printReceiptDirectly({ receiptHtml: content, isDirect: true });
                showToastNotification("Sale completed and receipt printed.");
              } else {
                console.log("Receipt not found or invalid after waiting");

                // Try fallback method using completeSale function directly
                if (typeof window.completeSale === "function") {
                  console.log(
                    "Trying fallback with direct completeSale function"
                  );

                  setTimeout(async () => {
                    try {
                      await window.completeSale();

                      // Check again for receipt
                      setTimeout(() => {
                        const receiptContainer =
                          document.getElementById("receipt-container");
                        if (receiptContainer) {
                          const content = receiptContainer.innerHTML.trim();
                          if (
                            content.length > 100 &&
                            !content.includes(
                              "Receipt content will be generated here"
                            )
                          ) {
                            printReceiptDirectly({
                              receiptHtml: content,
                              isDirect: true,
                            });
                            showToastNotification(
                              "Sale completed and receipt printed."
                            );
                          } else {
                            showToastNotification(
                              "Sale completed. Could not find receipt to print.",
                              true
                            );
                          }
                        }
                      }, 500);
                    } catch (error) {
                      console.error("Error in fallback completeSale:", error);
                      showToastNotification(
                        "Error completing sale: " + error.message,
                        true
                      );
                    }
                  }, 100);
                } else {
                  showToastNotification(
                    "Sale may have completed. Receipt not available to print.",
                    true
                  );
                }
              }
            } else {
              showToastNotification(
                "Receipt container not found after sale.",
                true
              );
            }
          }, 800); // Increased timeout for receipt generation
        }
        // Try using the direct function as fallback
        else if (typeof window.completeSale === "function") {
          console.log(
            "Complete sale button not available, using function directly"
          );

          try {
            // Call the completeSale function
            await window.completeSale();
            showToastNotification("Processing sale...");

            // Check for receipt
            setTimeout(() => {
              const receiptContainer =
                document.getElementById("receipt-container");
              if (receiptContainer) {
                const content = receiptContainer.innerHTML.trim();
                if (
                  content.length > 100 &&
                  !content.includes("Receipt content will be generated here")
                ) {
                  printReceiptDirectly({
                    receiptHtml: content,
                    isDirect: true,
                  });
                  showToastNotification("Sale completed and receipt printed.");
                } else {
                  showToastNotification(
                    "Sale completed. Receipt not available to print.",
                    true
                  );
                }
              }
            }, 800);
          } catch (error) {
            console.error("Error calling completeSale function:", error);
            showToastNotification(
              "Error completing sale: " + error.message,
              true
            );
          }
        } else {
          showToastNotification(
            "Cannot complete sale: no method available",
            true
          );
        }
        return;
      }

      // Case 3: Empty cart or other state - show message
      showToastNotification(
        "No items to print. Add items to cart first.",
        true
      );
    } catch (error) {
      console.error("Error in unified print function:", error);
      showToastNotification("Error printing receipt: " + error.message, true);
    }
  };

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
        } else if (typeof generateReceiptHtmlWithDiscount === "function") {
          receiptHtml = generateReceiptHtmlWithDiscount(invoiceData);
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
        <body onload="setTimeout(function() { window.print(); }, 200);">
          <div class="receipt-content">
            ${receiptHtml}
          </div>
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
  function showToastNotification(message, isError = false, duration = 3000) {
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
