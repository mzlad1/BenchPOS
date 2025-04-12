// Enhanced version of generateReceiptHtmlWithDiscount function
function generateProfessionalReceipt(invoice) {
  // Get custom settings from localStorage
  const companyName = localStorage.getItem("companyName") || "ShopSmart";
  const companyTagline =
    localStorage.getItem("companyTagline") || "Retail Solutions";
  const companyAddress =
    localStorage.getItem("companyAddress") ||
    "123 Main Street, Anytown, USA 12345";
  const companyPhone = localStorage.getItem("companyPhone") || "(555) 123-4567";
  const companyEmail =
    localStorage.getItem("companyEmail") || "info@shopsmart.com";
  const companyWebsite =
    localStorage.getItem("companyWebsite") || "www.shopsmart.com";
  const receiptFooter =
    localStorage.getItem("receiptFooter") ||
    "Thank you for shopping at ShopSmart!";
  const returnPolicy =
    localStorage.getItem("returnPolicy") ||
    "Items can be returned within 30 days with receipt.";
  const themeColor = localStorage.getItem("receiptTheme") || "#3d5a80";
  const customLogo = localStorage.getItem("companyLogo");

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

  // Prepare logo - either custom or SVG
  let logoHtml;
  if (customLogo) {
    // Use the custom uploaded logo
    logoHtml = `<img src="${customLogo}" alt="${companyName}" style="max-width: 180px; max-height: 60px;" />`;
  } else {
    // Company logo as inline SVG using the theme color from settings
    logoHtml = `
      <svg width="180" height="60" viewBox="0 0 180 60" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="40" height="40" rx="5" fill="${themeColor}"/>
        <text x="60" y="35" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="${themeColor}">${companyName}</text>
        <text x="60" y="48" font-family="Arial, sans-serif" font-size="12" fill="#666">${companyTagline}</text>
      </svg>
    `;
  }

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
            <div>${formatCurrency(finalPrice)}</div>
            <div class="strikethrough">${formatCurrency(originalPrice)}</div>
          </td>
          <td class="text-right">${formatCurrency(lineTotal)}</td>
        </tr>
      `;
    } else {
      itemsHtml += `
        <tr>
          <td>${item.name}</td>
          <td class="text-center">${quantity}</td>
          <td class="text-right">${formatCurrency(originalPrice)}</td>
          <td class="text-right">${formatCurrency(lineTotal)}</td>
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
        <td class="text-right discount-value">-${formatCurrency(
          invoice.discount
        )}</td>
      </tr>
    `;
  }

  // Get the currency setting if available
  const currencySymbol = localStorage.getItem("currency") === "ILS" ? "₪" : "$";
  // Format currency based on user settings
  function formatCurrency(amount) {
    const currency = localStorage.getItem("currency") || "USD";
    const symbol = currency === "ILS" ? "₪" : "$";
    return `${symbol}${parseFloat(amount).toFixed(2)}`;
  }
  // Build the complete receipt HTML
  return `
    <div class="professional-receipt ${transactionClass}">
      <div class="receipt-header">
        <div class="logo-container">
          ${logoHtml}
        </div>
        
        <div class="company-info">
          <p>${companyAddress}</p>
          <p>Tel: ${companyPhone} | Email: ${companyEmail}</p>
          <p>${companyWebsite}</p>
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
            <td class="text-right">${currencySymbol}${invoice.subtotal.toFixed(
    2
  )}</td>
          </tr>
          ${discountRow}
          <tr class="receipt-summary-row">
            <td colspan="3" class="text-right">Tax (${(
              (invoice.tax / invoice.subtotal) *
              100
            ).toFixed(1)}%):</td>
            <td class="text-right">${currencySymbol}${invoice.tax.toFixed(
    2
  )}</td>
          </tr>
          <tr class="receipt-summary-row total-row">
            <td colspan="3" class="text-right bold">TOTAL:</td>
            <td class="text-right bold">${currencySymbol}${invoice.total.toFixed(
    2
  )}</td>
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
          <div class="payment-value">${currencySymbol}${(
    Math.ceil(invoice.total / 5) * 5
  ).toFixed(2)}</div>
        </div>
        <div class="payment-row">
          <div class="payment-label">Change:</div>
          <div class="payment-value">${currencySymbol}${(
    Math.ceil(invoice.total / 5) * 5 -
    invoice.total
  ).toFixed(2)}</div>
        </div>
      </div>
      
      <div class="receipt-divider"></div>
      
      <div class="receipt-footer">
        <p class="thank-you">${receiptFooter}</p>
        <p class="return-policy">${returnPolicy}</p>
        <p class="support">Customer support: ${companyEmail}</p>
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
        <p class="software-credit">Powered by MZLAD Billing System v2.1</p>
      </div>
    </div>
  `;
}

// Helper function to adjust color brightness
function adjustColorBrightness(hex, percent) {
  // Convert hex to RGB
  let r = parseInt(hex.substring(1, 3), 16);
  let g = parseInt(hex.substring(3, 5), 16);
  let b = parseInt(hex.substring(5, 7), 16);

  // Adjust brightness
  r = Math.max(0, Math.min(255, r + percent));
  g = Math.max(0, Math.min(255, g + percent));
  b = Math.max(0, Math.min(255, b + percent));

  // Convert back to hex
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Function to update the receipt styles based on settings
function updateReceiptStyles() {
  // Get theme color from localStorage
  const themeColor = localStorage.getItem("receiptTheme") || "#3d5a80";
  const darkThemeColor = adjustColorBrightness(themeColor, -20); // Slightly darker for hover effects

  return `
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
    border-bottom: 1px solid ${themeColor};
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
    color: ${themeColor};
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
    color: ${themeColor};
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
}

// IMPORTANT: Define professionalReceiptStyles in global scope for unified-print.js compatibility
window.professionalReceiptStyles = updateReceiptStyles();

// Function to update the receipt styles when settings change
function updateReceiptStylesFromSettings() {
  // Update the global variable used by unified-print.js
  window.professionalReceiptStyles = updateReceiptStyles();

  // Find existing style tag or create new one
  let styleEl = document.getElementById("professional-receipt-styles");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "professional-receipt-styles";
    document.head.appendChild(styleEl);
  }

  // Update the styles
  styleEl.textContent = window.professionalReceiptStyles;
}

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

  // Add styles to document using settings
  updateReceiptStylesFromSettings();

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

// Update the completeSale function to use the professional receipt
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
        styleEl.textContent = window.professionalReceiptStyles;
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

// Apply the changes when loaded
document.addEventListener("DOMContentLoaded", function () {
  // Add the professional receipt styles to the document
  const styleEl = document.createElement("style");
  styleEl.id = "professional-receipt-styles";
  styleEl.textContent = window.professionalReceiptStyles; // Use the global variable
  document.head.appendChild(styleEl);

  // Update the completeSale function to use the professional receipt
  if (typeof completeSale === "function") {
    updateCompleteSaleForProfessionalReceipt();
  }

  // If in a test/demo environment, initialize with sample data
  if (
    document.getElementById("receipt-container") &&
    !window.location.pathname.includes("billing.html")
  ) {
    initializeProfessionalReceipt();
  }
});

// Add a settings change listener
window.addEventListener("storage", function (e) {
  if (
    e.key &&
    (e.key.startsWith("company") ||
      e.key === "receiptTheme" ||
      e.key === "receiptFooter" ||
      e.key === "returnPolicy")
  ) {
    // Update receipt styles if any receipt-related setting changed
    updateReceiptStylesFromSettings();
  }
});
