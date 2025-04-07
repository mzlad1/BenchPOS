// Enhanced version of generateReceiptHtmlWithDiscount function
function generateProfessionalReceipt(invoice) {
  // Format the date nicely
  const receiptDate = new Date(invoice.date);
  const formattedDate = receiptDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = receiptDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Company logo as inline SVG - simple modern design
  const logoSvg = `
    <svg width="180" height="60" viewBox="0 0 180 60" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="40" height="40" rx="5" fill="#3d5a80"/>
      <text x="60" y="35" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#3d5a80">ShopSmart</text>
      <text x="60" y="48" font-family="Arial, sans-serif" font-size="12" fill="#666">Retail Solutions</text>
    </svg>
  `;

  // Generate receipt items HTML with support for discounts
  let itemsHtml = "";
  let subtotal = 0;

  invoice.items.forEach((item) => {
    const quantity = item.quantity;
    const originalPrice = Math.abs(item.originalPrice || item.price);
    const finalPrice = Math.abs(item.finalPrice || item.price);
    const hasDiscount = originalPrice !== finalPrice;
    const lineTotal = Math.abs(finalPrice * quantity);
    subtotal += lineTotal;

    if (hasDiscount) {
      itemsHtml += `
        <tr>
          <td>${item.name}</td>
          <td class="text-center">${quantity}</td>
          <td class="text-right">
            <div>$${finalPrice.toFixed(2)}</div>
            <div class="strikethrough">$${originalPrice.toFixed(2)}</div>
          </td>
          <td class="text-right">$${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    } else {
      itemsHtml += `
        <tr>
          <td>${item.name}</td>
          <td class="text-center">${quantity}</td>
          <td class="text-right">$${originalPrice.toFixed(2)}</td>
          <td class="text-right">$${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    }
  });

  // Transaction type label (Sale or Refund)
  const transactionType = invoice.isRefund ? "REFUND" : "SALE";
  const transactionClass = invoice.isRefund ? "refund-receipt" : "";

  // Discount row in footer
  let discountRow = "";
  if (invoice.discount && invoice.discount > 0) {
    discountRow = `
      <tr class="receipt-summary-row">
        <td colspan="3" class="text-right">Discount:</td>
        <td class="text-right discount-value">-$${invoice.discount.toFixed(
          2
        )}</td>
      </tr>
    `;
  }

  // Build the complete receipt HTML
  return `
    <div class="professional-receipt ${transactionClass}">
      <div class="receipt-header">
        <div class="logo-container">
          ${logoSvg}
        </div>
        
        <div class="company-info">
          <p>123 Main Street, Anytown, USA 12345</p>
          <p>Tel: (555) 123-4567 | Email: info@shopsmart.com</p>
          <p>www.shopsmart.com</p>
        </div>
        
        <div class="receipt-type ${invoice.isRefund ? "refund" : ""}">
          ${transactionType}
        </div>
      </div>
      
      <div class="receipt-info">
        <div class="receipt-row">
          <div class="receipt-label">Receipt #:</div>
          <div class="receipt-value">${invoice.id}</div>
        </div>
        <div class="receipt-row">
          <div class="receipt-label">Date:</div>
          <div class="receipt-value">${formattedDate}</div>
        </div>
        <div class="receipt-row">
          <div class="receipt-label">Time:</div>
          <div class="receipt-value">${formattedTime}</div>
        </div>
        <div class="receipt-row">
          <div class="receipt-label">Customer:</div>
          <div class="receipt-value">${invoice.customer}</div>
        </div>
        <div class="receipt-row">
          <div class="receipt-label">Cashier:</div>
          <div class="receipt-value">Store Staff</div>
        </div>
      </div>
      
      <div class="receipt-divider"></div>
      
      <table class="receipt-items">
        <thead>
          <tr>
            <th>Item</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr class="receipt-summary-row">
            <td colspan="3" class="text-right">Subtotal:</td>
            <td class="text-right">$${invoice.subtotal.toFixed(2)}</td>
          </tr>
          ${discountRow}
          <tr class="receipt-summary-row">
            <td colspan="3" class="text-right">Tax (${(
              (invoice.tax / invoice.subtotal) *
              100
            ).toFixed(1)}%):</td>
            <td class="text-right">$${invoice.tax.toFixed(2)}</td>
          </tr>
          <tr class="receipt-summary-row total-row">
            <td colspan="3" class="text-right bold">TOTAL:</td>
            <td class="text-right bold">$${invoice.total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      
      <div class="receipt-divider"></div>
      
      <div class="payment-info">
        <div class="payment-row">
          <div class="payment-label">Payment Method:</div>
          <div class="payment-value">Cash</div>
        </div>
        <div class="payment-row">
          <div class="payment-label">Amount Tendered:</div>
          <div class="payment-value">$${(
            Math.ceil(invoice.total / 5) * 5
          ).toFixed(2)}</div>
        </div>
        <div class="payment-row">
          <div class="payment-label">Change:</div>
          <div class="payment-value">$${(
            Math.ceil(invoice.total / 5) * 5 -
            invoice.total
          ).toFixed(2)}</div>
        </div>
      </div>
      
      <div class="receipt-divider"></div>
      
      <div class="receipt-footer">
        <p class="thank-you">Thank you for shopping at ShopSmart!</p>
        <p class="return-policy">Return policy: Items can be returned within 30 days with receipt.</p>
        <p class="support">Customer support: support@shopsmart.com</p>
        <div class="barcode">
          <svg viewBox="0 0 200 30">
            <!-- Simple barcode representation -->
            <g fill="black">
              ${Array(30)
                .fill()
                .map(
                  (_, i) =>
                    `<rect x="${i * 3}" y="0" width="${
                      Math.random() > 0.5 ? 2 : 1
                    }" height="30"/>`
                )
                .join("")}
            </g>
          </svg>
          <div class="barcode-text">${invoice.id}</div>
        </div>
        <p class="software-credit">Powered by ShopSmart Billing System v2.1</p>
      </div>
    </div>
  `;
}

// CSS styles for the professional receipt
const professionalReceiptStyles = `
  .professional-receipt {
    font-family: 'Helvetica', 'Arial', sans-serif;
    max-width: 80mm;
    margin: 0 auto;
    padding: 10px;
    font-size: 12px;
    color: #333;
    background-color: white;
  }
  
  /* Header Section */
  .receipt-header {
    text-align: center;
    margin-bottom: 15px;
  }
  
  .logo-container {
    margin-bottom: 10px;
  }
  
  .company-info p {
    margin: 2px 0;
    font-size: 11px;
  }
  
  .receipt-type {
    font-size: 14px;
    font-weight: bold;
    margin: 8px 0;
    padding: 3px;
    border-radius: 4px;
    background-color: #f0f0f0;
  }
  
  .receipt-type.refund {
    background-color: #ffeeee;
    color: #d32f2f;
  }
  
  /* Info Section */
  .receipt-info {
    margin-bottom: 15px;
  }
  
  .receipt-row {
    display: flex;
    justify-content: space-between;
    margin: 3px 0;
  }
  
  .receipt-label {
    font-weight: bold;
    flex: 1;
  }
  
  .receipt-value {
    flex: 2;
    text-align: right;
  }
  
  .receipt-divider {
    border-bottom: 1px dashed #aaa;
    margin: 10px 0;
  }
  
  /* Items Table */
  .receipt-items {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
  }
  
  .receipt-items th, .receipt-items td {
    padding: 4px 2px;
  }
  
  .receipt-items th {
    border-bottom: 1px solid #aaa;
    font-size: 11px;
  }
  
  .receipt-items tbody tr:last-child td {
    border-bottom: 1px dashed #aaa;
    padding-bottom: 8px;
  }
  
  .text-center {
    text-align: center;
  }
  
  .text-right {
    text-align: right;
  }
  
  .strikethrough {
    text-decoration: line-through;
    font-size: 10px;
    color: #777;
  }
  
  /* Summary Section */
  .receipt-summary-row td {
    padding-top: 5px;
    padding-bottom: 5px;
  }
  
  .total-row td {
    font-weight: bold;
    font-size: 14px;
    padding-top: 8px;
    padding-bottom: 8px;
  }
  
  .discount-value {
    color: #d32f2f;
  }
  
  .bold {
    font-weight: bold;
  }
  
  /* Payment Section */
  .payment-info {
    margin-bottom: 15px;
  }
  
  .payment-row {
    display: flex;
    justify-content: space-between;
    margin: 3px 0;
  }
  
  .payment-label {
    font-weight: bold;
    flex: 1;
  }
  
  .payment-value {
    flex: 1;
    text-align: right;
  }
  
  /* Footer Section */
  .receipt-footer {
    text-align: center;
    font-size: 10px;
  }
  
  .thank-you {
    font-size: 12px;
    font-weight: bold;
    margin: 10px 0 5px;
  }
  
  .return-policy, .support {
    margin: 5px 0;
  }
  
  .barcode {
    margin: 15px auto;
    max-width: 200px;
  }
  
  .barcode-text {
    margin-top: 5px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
  }
  
  .software-credit {
    margin-top: 15px;
    font-size: 9px;
    color: #999;
  }
  
  /* Refund Receipt */
  .refund-receipt {
    background-color: #fff9f9;
  }
  
  .refund-receipt .receipt-divider {
    border-color: #ffcccc;
  }
  
  @media print {
    .professional-receipt {
      max-width: 100%;
    }
    
    body {
      margin: 0;
      padding: 0;
    }
  }
`;

// Function to initialize the receipt with sample data for testing
function initializeProfessionalReceipt() {
  // Sample invoice data
  const sampleInvoice = {
    id: "INV-12345",
    date: new Date().toISOString(),
    customer: "John Smith",
    items: [
      {
        name: "Premium Coffee Blend",
        price: 12.99,
        quantity: 1,
        originalPrice: 14.99,
        finalPrice: 12.99,
      },
      {
        name: "Organic Apples (1kg)",
        price: 4.99,
        quantity: 2,
      },
      {
        name: "Whole Grain Bread",
        price: 3.49,
        quantity: 1,
      },
    ],
    subtotal: 26.46,
    discount: 2.0,
    tax: 1.95,
    total: 26.41,
    isRefund: false,
  };

  // Add styles to document
  const styleEl = document.createElement("style");
  styleEl.textContent = professionalReceiptStyles;
  document.head.appendChild(styleEl);

  // Generate receipt HTML and add to container
  const container = document.getElementById("receipt-container");
  if (container) {
    container.innerHTML = generateProfessionalReceipt(sampleInvoice);
  }
}
// Function to play a sound
function playCompletionSound() {
  try {
    const completionSound = new Audio("../Audio/completed.mp3"); // Same path format as beep sound
    completionSound.volume = 0.3;
    completionSound
      .play()
      .catch((e) => console.log("Could not play completion sound:", e));
  } catch (e) {
    console.error("Error playing completion sound:", e);
  }
}
// Generate actual receipt from invoice data
function updateCompleteSaleForProfessionalReceipt() {
  const originalCompleteSale = completeSale;

  completeSale = async function () {
    if (cart.length === 0) return;

    try {
      // Process items to include discount info
      const processedItems = cart.map((item) => {
        const basePrice = item.price;
        let finalPrice = basePrice;
        let itemDiscount = 0;

        // Apply item-level discount
        if (item.discount) {
          itemDiscount = item.discount.amount * item.quantity;
          finalPrice = basePrice - item.discount.amount;
        }

        return {
          ...item,
          originalPrice: basePrice,
          finalPrice: finalPrice,
          itemDiscount: itemDiscount,
        };
      });

      const subtotal = parseFloat(subtotalEl.textContent.replace("$", ""));
      const discount = parseFloat(
        document.getElementById("discount-value").textContent.replace("$", "")
      );
      const tax = parseFloat(taxEl.textContent.replace("$", ""));
      const total = parseFloat(totalEl.textContent.replace("$", ""));

      const invoiceData = {
        items: processedItems,
        customer: customerNameEl.value || "Guest Customer",
        subtotal: subtotal,
        discount: discount,
        discountDetails: cartDiscount,
        tax: tax,
        total: total,
        date: new Date().toISOString(),
        isRefund: cart.some((item) => item.price < 0),
      };

      // Save invoice to database
      const invoiceId = await window.api.createInvoice(invoiceData);

      // Generate professional receipt HTML
      const receiptHtml = generateProfessionalReceipt({
        ...invoiceData,
        id: invoiceId,
      });

      // Add the styles if they don't exist yet
      if (!document.getElementById("professional-receipt-styles")) {
        const styleEl = document.createElement("style");
        styleEl.id = "professional-receipt-styles";
        styleEl.textContent = professionalReceiptStyles;
        document.head.appendChild(styleEl);
      }

      // Store the receipt HTML for later printing, but DON'T show the modal
      receiptContainerEl.innerHTML = receiptHtml;
      // receiptModal.style.display = "block"; // REMOVE THIS LINE

      // Add a toast notification
      showToastNotification(
        "Sale completed successfully. Press F8 to print receipt."
      );

      playCompletionSound();

      // Clear the cart
      clearCart();
    } catch (error) {
      console.error("Error completing sale:", error);
      alert("Failed to complete sale. Please try again.");
    }
  };
}

// Add a toast notification function
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

// Update the print receipt function to print directly
// function updatePrintReceiptFunction() {
//   // First, add a download button to the receipt modal when it's first created
//   function addDownloadButton() {
//     // Check if we already added the download button
//     if (document.getElementById("download-receipt")) return;

//     // Create download button
//     const downloadBtn = document.createElement("button");
//     downloadBtn.id = "download-receipt";
//     downloadBtn.textContent = "Download Receipt";
//     downloadBtn.className = "btn secondary-btn";
//     downloadBtn.style.marginLeft = "10px";

//     // Find the print receipt button and insert the download button after it
//     const printBtn = document.getElementById("print-receipt");
//     if (printBtn && printBtn.parentNode) {
//       printBtn.parentNode.insertBefore(downloadBtn, printBtn.nextSibling);

//       // Add click event to download
//       downloadBtn.addEventListener("click", function () {
//         const receiptHtml = receiptContainerEl.innerHTML;
//         downloadReceiptAsHTML(receiptHtml, professionalReceiptStyles);
//       });
//     }
//   }

//   // Call this when receipt modal is shown
//   const originalCompleteSale = completeSale;
//   completeSale = async function () {
//     // Call the original completeSale function
//     await originalCompleteSale.apply(this, arguments);

//     // Add download button after modal is shown
//     setTimeout(addDownloadButton, 500);
//   };

//   // Replace the printReceipt function
//   printReceipt = function () {
//     try {
//       if (!receiptContainerEl) {
//         console.error("Receipt container element not found");
//         alert("Error: Receipt container not found. Please try again.");
//         return;
//       }

//       const receiptHtml = receiptContainerEl.innerHTML;
//       const styles = professionalReceiptStyles;

//       // Print the receipt directly
//       printReceiptDirectly(receiptHtml, styles);
//     } catch (error) {
//       console.error("Error handling receipt:", error);
//       alert("There was an error preparing the receipt. Please try again.");
//     }
//   };

//   // Function to print receipt directly to printer
//   function printReceiptDirectly(html, styles) {
//     try {
//       // Remove any existing print frames
//       const existingFrame = document.getElementById("receipt-print-frame");
//       if (existingFrame) {
//         document.body.removeChild(existingFrame);
//       }

//       // Create an iframe (hidden) to contain our receipt for printing
//       const printFrame = document.createElement("iframe");
//       printFrame.id = "receipt-print-frame";
//       printFrame.style.position = "fixed";
//       printFrame.style.right = "0";
//       printFrame.style.bottom = "0";
//       printFrame.style.width = "0";
//       printFrame.style.height = "0";
//       printFrame.style.border = "0";

//       document.body.appendChild(printFrame);

//       // Get the iframe document and write our receipt HTML
//       const frameDoc =
//         printFrame.contentDocument || printFrame.contentWindow.document;

//       frameDoc.open();
//       frameDoc.write(`
//         <!DOCTYPE html>
//         <html>
//         <head>
//           <title>Print Receipt</title>
//           <style>
//             body {
//               font-family: 'Helvetica', 'Arial', sans-serif;
//               max-width: 80mm;
//               margin: 0 auto;
//               padding: 0;
//             }

//             /* Receipt Styles */
//             ${styles}

//             /* Print-specific styles */
//             @media print {
//               body {
//                 width: 80mm; /* Standard receipt width */
//                 margin: 0;
//                 padding: 0;
//               }

//               .professional-receipt {
//                 width: 100%;
//                 max-width: none;
//                 border: none;
//                 box-shadow: none;
//               }
//             }
//           </style>
//         </head>
//         <body>
//           <div class="receipt-content">
//             ${html}
//           </div>
//         </body>
//         </html>
//       `);
//       frameDoc.close();

//       // Wait a moment for the iframe to load
//       setTimeout(function () {
//         try {
//           // Focus the iframe window for printing
//           printFrame.contentWindow.focus();

//           // Print the document (this opens the system print dialog)
//           printFrame.contentWindow.print();
//         } catch (e) {
//           console.error("Printing failed:", e);
//           alert("Printing failed. Please try the download option instead.");
//         }
//       }, 300);
//     } catch (error) {
//       console.error("Error printing receipt:", error);
//       alert("Failed to print receipt. Please try the download option.");
//     }
//   }

//   // Function to download receipt as HTML with styles (fallback method)
//   function downloadReceiptAsHTML(html, styles, invoiceId) {
//     try {
//       // Generate invoice ID if not provided
//       if (!invoiceId) {
//         invoiceId = "receipt-" + new Date().toISOString().replace(/[:.]/g, "-");

//         // Try to extract the invoice ID if possible
//         try {
//           const idMatch = html.match(/Receipt #:\s*([a-zA-Z0-9-]+)/);
//           if (idMatch && idMatch[1]) {
//             invoiceId = idMatch[1];
//           }
//         } catch (err) {
//           console.log(
//             "Couldn't extract invoice ID, using generated one instead"
//           );
//         }
//       }

//       // Create a styled HTML document
//       const fullHtml = `
//         <!DOCTYPE html>
//         <html>
//         <head>
//           <title>Receipt ${invoiceId}</title>
//           <style>
//             body {
//               font-family: 'Helvetica', 'Arial', sans-serif;
//               max-width: 80mm;
//               margin: 0 auto;
//               padding: 20px;
//             }

//             ${styles}

//             @media print {
//               body {
//                 padding: 0;
//                 width: 100%;
//               }
//               button, .no-print {
//                 display: none;
//               }
//             }
//           </style>
//         </head>
//         <body>
//           <div class="receipt-content">
//             ${html}
//           </div>
//           <div class="no-print" style="margin-top: 30px; text-align: center;">
//             <button onclick="window.print();" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
//               Print this receipt
//             </button>
//           </div>
//         </body>
//         </html>
//       `;

//       // Create a Blob containing the HTML
//       const blob = new Blob([fullHtml], { type: "text/html" });

//       // Create a link element to download the file
//       const a = document.createElement("a");
//       a.href = URL.createObjectURL(blob);
//       a.download = `receipt-${invoiceId}.html`;

//       // Append to body, click to download, then remove
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);

//       alert(`Receipt downloaded as HTML file: receipt-${invoiceId}.html`);
//     } catch (error) {
//       console.error("Error creating downloadable receipt:", error);
//       alert("Failed to create downloadable receipt. Please try again.");
//     }
//   }
// }

// Apply the changes when loaded
document.addEventListener("DOMContentLoaded", function () {
  // Add the professional receipt styles to the document
  const styleEl = document.createElement("style");
  styleEl.id = "professional-receipt-styles";
  styleEl.textContent = professionalReceiptStyles;
  document.head.appendChild(styleEl);

  // Update the completeSale function to use the professional receipt
  if (typeof completeSale === "function") {
    updateCompleteSaleForProfessionalReceipt();
  }

  // Update the print receipt function
  if (typeof printReceipt === "function") {
    updatePrintReceiptFunction();
  }

  // If in a test/demo environment, initialize with sample data
  if (
    document.getElementById("receipt-container") &&
    !window.location.pathname.includes("billing.html")
  ) {
    initializeProfessionalReceipt();
  }
});
