/**
 * Installation instructions for the enhanced receipt system:
 *
 * 1. Replace your entire payment-and-receipts.js file with this code
 * 2. This will ensure all receipt printing uses the professional template
 * 3. Old invoices will be properly formatted with the professional template
 */

// ================ HELPER FUNCTIONS ================

/**
 * Parse a currency value from text, handling different formats
 * @param {string} text - The currency text to parse
 * @return {number} The parsed value as a number
 */
function parseCurrencyValue(text) {
  if (!text || typeof text !== "string") return 0;

  // First handle if it's already a number
  if (!isNaN(parseFloat(text))) {
    return parseFloat(text);
  }

  try {
    // Convert text to string and trim it
    const trimmed = text.toString().trim();

    // Remove all currency symbols and non-numeric characters except for decimal point and minus
    const numericString = trimmed.replace(/[^\d.-]/g, "");

    // Parse as float
    const value = parseFloat(numericString);

    // Check if we got a valid number, otherwise return 0
    return !isNaN(value) ? value : 0;
  } catch (error) {
    console.error("Error parsing currency value:", error, "for text:", text);
    return 0; // Return 0 as fallback on error
  }
}

/**
 * Format a number as currency with proper symbol based on user settings
 * @param {number} amount - The amount to format
 * @return {string} Formatted currency string
 */
function formatCurrency(amount) {
  const currency = localStorage.getItem("currency") || "USD";
  const symbol = currency === "ILS" ? "₪" : "$";
  return `${symbol}${parseFloat(amount).toFixed(2)}`;
}

/**
 * Plays a sound when a sale is completed
 */
function playCompletionSound() {
  try {
    const completionSound = new Audio("../Audio/completed.mp3");
    completionSound.volume = 0.3;
    completionSound
      .play()
      .catch((e) => console.log("Could not play completion sound:", e));
  } catch (e) {
    console.error("Error playing completion sound:", e);
  }
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether this is an error notification
 * @param {number} duration - How long to show notification (ms)
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

  // Add close button
  const messageSpan = document.createElement("span");
  messageSpan.textContent = message;
  notification.appendChild(messageSpan);

  const closeBtn = document.createElement("span");
  closeBtn.textContent = "×";
  closeBtn.style.marginLeft = "15px";
  closeBtn.style.cursor = "pointer";
  closeBtn.style.fontWeight = "bold";
  closeBtn.onclick = function () {
    removeNotification(notification);
  };
  notification.appendChild(closeBtn);

  document.body.appendChild(notification);

  // Store the timeout ID so we can clear it if needed
  notification.showTimeoutId = setTimeout(() => {
    notification.style.opacity = "1";
    notification.style.transform = "translateY(0)";
  }, 10);

  // Store the hide timeout ID
  notification.hideTimeoutId = setTimeout(() => {
    removeNotification(notification);
  }, duration);

  function removeNotification(notif) {
    // Clear any pending timeouts
    clearTimeout(notif.showTimeoutId);
    clearTimeout(notif.hideTimeoutId);
    clearTimeout(notif.removeTimeoutId);

    // Hide the notification
    notif.style.opacity = "0";
    notif.style.transform = "translateY(20px)";

    // Remove from DOM after transition
    notif.removeTimeoutId = setTimeout(() => {
      if (notif.parentNode) {
        notif.parentNode.removeChild(notif);
      }
    }, 300);
  }
}

/**
 * Adjusts the brightness of a hex color by a percentage
 * @param {string} hex - The hex color code
 * @param {number} percent - The percentage to adjust (-255 to 255)
 * @return {string} The adjusted hex color
 */
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

/**
 * Safe translation function that won't cause recursion issues
 * @param {string} key - Translation key
 * @param {string} defaultText - Default text to use if translation not found
 * @return {string} Translated text or default text
 */
function getTranslation(key, defaultText) {
  // If there is a global translation function, use it
  if (typeof window.t === "function" && window.t !== getTranslation) {
    try {
      return window.t(key) || defaultText;
    } catch (e) {
      console.warn("Translation error:", e);
      return defaultText;
    }
  }
  return defaultText;
}

// ================ RECEIPT GENERATION ================

/**
 * Generate a text-based logo for receipts
 * @param {string} companyName - The company name
 * @param {string} tagline - Company tagline
 * @param {string} themeColor - Theme color in hex
 * @return {string} HTML for the text-based logo
 */
function generateTextLogo(companyName, tagline, themeColor) {
  return `
    <div style="text-align: center; margin-bottom: 10px;">
      <div style="font-size: 24px; font-weight: bold; color: ${themeColor};">${companyName}</div>
      <div style="font-size: 12px; color: #666;">${
        tagline || "Retail Solutions"
      }</div>
    </div>
  `;
}

/**
 * Updates receipt styles based on user settings
 * @return {string} CSS styles for receipts
 */
function updateReceiptStyles() {
  // Get theme color and language from localStorage
  const themeColor = localStorage.getItem("receiptTheme") || "#3d5a80";
  const language = localStorage.getItem("language") || "en";
  const isRTL = language === "ar";

  // Base styles
  let styles = `
  .professional-receipt {
    font-family: ${
      isRTL
        ? "'Amiri', 'Arial', sans-serif"
        : "'Helvetica', 'Arial', sans-serif"
    };
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
    text-align: ${isRTL ? "left" : "right"};
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
    text-align: ${isRTL ? "left" : "right"};
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
    text-align: ${isRTL ? "left" : "right"};
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
  
  /* RTL specific adjustments */
  [dir="rtl"] .receipt-items th:first-child,
  [dir="rtl"] .receipt-items td:first-child {
    text-align: right;
  }
  
  [dir="rtl"] .receipt-items th:last-child,
  [dir="rtl"] .receipt-items td:last-child {
    text-align: left;
  }
  
  @media print {
    .professional-receipt {
      max-width: 100%;
    }
    
    body {
      margin: 0;
      padding: 0;
    }
    
    /* Add Amiri font for Arabic printing */
    @font-face {
      font-family: 'Amiri';
      src: url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
    }
  }
`;

  return styles;
}

/**
 * Apply updated receipt styles to the document
 */
function updateReceiptStylesFromSettings() {
  // Update the global variable used for printing
  window.professionalReceiptStyles = updateReceiptStyles();

  // Find existing style tag or create new one
  let styleEl = document.getElementById("professional-receipt-styles");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "professional-receipt-styles";
    document.head.appendChild(styleEl);
  }

  // Add Amiri font for Arabic support if needed
  if (localStorage.getItem("language") === "ar") {
    const fontLink = document.getElementById("arabic-font-link");
    if (!fontLink) {
      const link = document.createElement("link");
      link.id = "arabic-font-link";
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap";
      document.head.appendChild(link);
    }
  }

  // Update the styles
  styleEl.textContent = window.professionalReceiptStyles;
}

/**
 * Generate a professional receipt with custom styling
 * @param {object} invoice - The invoice data
 * @return {string} HTML for the receipt
 */
function generateProfessionalReceipt(invoice) {
  // Get language preference from localStorage
  const language = localStorage.getItem("language") || "en";
  const isRTL = language === "ar";

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

  // Format the date nicely according to the language
  const receiptDate = new Date(invoice.date);
  const dateOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };

  // Format date based on language - always using Western numerals
  const formattedDate = receiptDate.toLocaleDateString("en-US", dateOptions);
  const formattedTime = receiptDate.toLocaleTimeString("en-US", timeOptions);

  // Text-based logo
  let logoHtml;
  const customLogo = localStorage.getItem("companyLogo");
  if (customLogo) {
    // Use the custom uploaded logo
    logoHtml = `<img src="${customLogo}" alt="${companyName}" style="max-width: 180px; max-height: 60px;" />`;
  } else {
    // Fall back to text-based logo
    logoHtml = generateTextLogo(companyName, companyTagline, themeColor);
  }

  // Generate receipt items HTML with support for discounts
  let itemsHtml = "";
  let subtotal = 0;

  // Ensure invoice.items is an array
  const items = Array.isArray(invoice.items) ? invoice.items : [];

  items.forEach((item) => {
    // Ensure all properties exist
    const quantity = item.quantity || 1;
    const originalPrice = Math.abs(item.originalPrice || item.price || 0);
    const finalPrice = Math.abs(item.finalPrice || item.price || 0);
    const hasDiscount = originalPrice !== finalPrice;
    const lineTotal = Math.abs(finalPrice * quantity);
    subtotal += lineTotal;

    if (hasDiscount) {
      itemsHtml += `
        <tr>
          <td>${item.name || "Item"}</td>
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
          <td>${item.name || "Item"}</td>
          <td class="text-center">${quantity}</td>
          <td class="text-right">${formatCurrency(originalPrice)}</td>
          <td class="text-right">${formatCurrency(lineTotal)}</td>
        </tr>
      `;
    }
  });

  // Use calculated subtotal if invoice.subtotal is missing
  const invoiceSubtotal =
    invoice.subtotal !== undefined ? invoice.subtotal : subtotal;

  // Transaction type label (Sale or Refund)
  const transactionType = invoice.isRefund
    ? getTranslation("billing.receipt.refund", "Refund")
    : getTranslation("billing.receipt.sale", "Sale");
  const transactionClass = invoice.isRefund ? "refund-receipt" : "";

  // Discount row in footer
  let discountRow = "";
  if (invoice.discount && invoice.discount > 0) {
    discountRow = `
      <tr class="receipt-summary-row">
        <td colspan="3" class="text-right">${getTranslation(
          "billing.receipt.discount",
          "Discount"
        )}:</td>
        <td class="text-right discount-value">-${formatCurrency(
          invoice.discount
        )}</td>
      </tr>
    `;
  }

  // Get the currency setting if available
  const currencySymbol = localStorage.getItem("currency") === "ILS" ? "₪" : "$";

  // Tax percentage calculation (ensure we don't divide by zero)
  const taxPercentage =
    invoiceSubtotal > 0
      ? ((invoice.tax / invoiceSubtotal) * 100).toFixed(1)
      : "0";

  // Build the complete receipt HTML with RTL support when needed
  return `
    <div class="professional-receipt ${transactionClass}" ${
    isRTL ? 'dir="rtl"' : ""
  }>
      <div class="receipt-header">
        <div class="logo-container">
          ${logoHtml}
        </div>
        
        <div class="company-info">
          <p>${companyAddress}</p>
          <p>${getTranslation(
            "billing.receipt.phone",
            "Phone"
          )}: ${companyPhone} | ${getTranslation(
    "billing.receipt.email",
    "Email"
  )}: ${companyEmail}</p>
          <p>${companyWebsite}</p>
        </div>
        
        <div class="receipt-type ${invoice.isRefund ? "refund" : ""}">
          ${transactionType}
        </div>
      </div>
      
      <div class="receipt-info">
        <div class="receipt-row">
          <div class="receipt-label">${getTranslation(
            "billing.receipt.receiptNumber",
            "Receipt #"
          )}:</div>
          <div class="receipt-value">${invoice.id || "INV-" + Date.now()}</div>
        </div>
        <div class="receipt-row">
          <div class="receipt-label">${getTranslation(
            "billing.receipt.date",
            "Date"
          )}:</div>
          <div class="receipt-value">${formattedDate}</div>
        </div>
        <div class="receipt-row">
          <div class="receipt-label">${getTranslation(
            "billing.receipt.time",
            "Time"
          )}:</div>
          <div class="receipt-value">${formattedTime}</div>
        </div>
        <div class="receipt-row">
          <div class="receipt-label">${getTranslation(
            "billing.receipt.customer",
            "Customer"
          )}:</div>
          <div class="receipt-value">${
            invoice.customer ||
            getTranslation("billing.labels.guest", "Guest Customer")
          }</div>
        </div>
        <div class="receipt-row">
          <div class="receipt-label">${getTranslation(
            "billing.receipt.cashier",
            "Cashier"
          )}:</div>
          <div class="receipt-value">${getTranslation(
            "billing.receipt.storeStaff",
            "Store Staff"
          )}</div>
        </div>
      </div>
      
      <div class="receipt-divider"></div>
      
      <table class="receipt-items">
        <thead>
          <tr>
            <th>${getTranslation("billing.receipt.item", "Item")}</th>
            <th class="text-center">${getTranslation(
              "billing.receipt.qty",
              "Qty"
            )}</th>
            <th class="text-right">${getTranslation(
              "billing.receipt.price",
              "Price"
            )}</th>
            <th class="text-right">${getTranslation(
              "billing.receipt.total",
              "Total"
            )}</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        <tfoot>
          <tr class="receipt-summary-row">
            <td colspan="3" class="text-right">${getTranslation(
              "billing.receipt.subtotal",
              "Subtotal"
            )}:</td>
            <td class="text-right">${currencySymbol}${invoiceSubtotal.toFixed(
    2
  )}</td>
          </tr>
          ${discountRow}
          <tr class="receipt-summary-row">
            <td colspan="3" class="text-right">${getTranslation(
              "billing.receipt.tax",
              "Tax"
            )} (${taxPercentage}%):</td>
            <td class="text-right">${currencySymbol}${(
    invoice.tax || 0
  ).toFixed(2)}</td>
          </tr>
          <tr class="receipt-summary-row total-row">
            <td colspan="3" class="text-right bold">${getTranslation(
              "billing.receipt.total",
              "Total"
            )}:</td>
            <td class="text-right bold">${currencySymbol}${(
    invoice.total || 0
  ).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
      
      <div class="receipt-divider"></div>
      
      <div class="payment-info">
        <div class="payment-row">
          <div class="payment-label">${getTranslation(
            "billing.receipt.paymentMethod",
            "Payment Method"
          )}:</div>
          <div class="payment-value">${getTranslation(
            "billing.receipt.cash",
            "Cash"
          )}</div>
        </div>
        <div class="payment-row">
          <div class="payment-label">${getTranslation(
            "billing.receipt.amountTendered",
            "Amount Tendered"
          )}:</div>
          <div class="payment-value">${currencySymbol}${(
    Math.ceil((invoice.total || 0) / 5) * 5
  ).toFixed(2)}</div>
        </div>
        <div class="payment-row">
          <div class="payment-label">${getTranslation(
            "billing.receipt.change",
            "Change"
          )}:</div>
          <div class="payment-value">${currencySymbol}${(
    Math.ceil((invoice.total || 0) / 5) * 5 -
    (invoice.total || 0)
  ).toFixed(2)}</div>
        </div>
      </div>
      
      <div class="receipt-divider"></div>
      
      <div class="receipt-footer">
        <p class="thank-you">${receiptFooter}</p>
        <p class="return-policy">${returnPolicy}</p>
        <p class="support">${getTranslation(
          "billing.receipt.customerSupport",
          "Customer Support"
        )}: ${companyEmail}</p>
        <div class="barcode">
          <!-- Simple text-based barcode representation -->
          <div style="font-family: monospace; letter-spacing: -0.2em; font-size: 16px; line-height: 0.8em; overflow: hidden; text-align: center; padding: 10px 0;">
            |||||| |||| | |||||| || |||||
          </div>
          <div class="barcode-text">${invoice.id || "INV-" + Date.now()}</div>
        </div>
        <p class="software-credit">${getTranslation(
          "billing.receipt.poweredBy",
          "Powered by"
        )} BenchPOS</p>
      </div>
    </div>
  `;
}

// ================ PAYMENT PROCESSING ================

/**
 * Complete a sale transaction
 * @return {Promise<void>}
 */
async function completeSale() {
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

    const subtotal = parseCurrencyValue(subtotalEl.textContent);
    const discount = parseCurrencyValue(
      document.getElementById("discount-value").textContent
    );
    const tax = parseCurrencyValue(taxEl.textContent);
    const total = parseCurrencyValue(totalEl.textContent);

    const invoiceData = {
      items: processedItems,
      customer:
        customerNameEl.value ||
        getTranslation("billing.labels.guest", "Guest Customer"),
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

    // Add the new invoice to the allInvoices array if it exists
    if (typeof window.allInvoices !== "undefined") {
      const newInvoice = {
        ...invoiceData,
        id: invoiceId,
        createdAt: new Date().toISOString(),
      };
      window.allInvoices.unshift(newInvoice);
      window.currentInvoiceIndex = 0;
    }

    // Generate professional receipt HTML
    const receiptHtml = generateProfessionalReceipt({
      ...invoiceData,
      id: invoiceId,
    });

    // Store the receipt HTML for later printing
    receiptContainerEl.innerHTML = receiptHtml;

    // Add a toast notification
    showToastNotification(
      getTranslation(
        "notifications.saleCompleted",
        "Sale completed successfully!"
      )
    );

    playCompletionSound();

    // Clear the cart
    clearCart();
  } catch (error) {
    console.error("Error completing sale:", error);
    alert(
      getTranslation(
        "sale.failed",
        "Failed to complete sale. Please try again."
      )
    );
  }
}

// ================ PRINTING FUNCTIONALITY ================

/**
 * Print the current receipt
 * @return {Promise<void>}
 */
async function printReceipt() {
  try {
    console.log("Enhanced print receipt function called");
    // Check first if there's a completed receipt ready to print
    const receiptContainer = document.getElementById("receipt-container");
    if (receiptContainer && receiptContainer.innerHTML.trim() !== "") {
      const content = receiptContainer.innerHTML.trim();
      const isPlaceholderOnly =
        content.includes("Receipt content will be generated here") ||
        content.length < 100;

      if (!isPlaceholderOnly) {
        console.log("Using existing completed receipt");
        printReceiptDirectly({ receiptHtml: content, isDirect: true });
        showToastNotification(
          getTranslation("receipt.printing", "Printing receipt...")
        );
        return;
      }
    }
    // This will hold the invoice data to print
    let invoiceData = null;

    // CASE 1: Check if we're viewing an invoice in the invoice history
    if (
      (typeof window.isViewingInvoice === "boolean" &&
        window.isViewingInvoice === true) ||
      (typeof window.currentInvoiceIndex === "number" &&
        window.currentInvoiceIndex >= 0) ||
      (typeof window.allInvoices === "object" &&
        window.allInvoices &&
        window.allInvoices.length > 0)
    ) {
      try {
        console.log("Detected invoice viewing mode");

        // Get the current invoice data
        let index = window.currentInvoiceIndex || 0;
        if (index < 0 || index >= window.allInvoices.length) {
          index = 0;
        }

        invoiceData = window.allInvoices[index];
        console.log("Found invoice data:", invoiceData);

        // If we have valid invoice data, print it
        if (invoiceData && invoiceData.id) {
          console.log("Printing invoice:", invoiceData.id);

          // Always regenerate the receipt HTML using our professional template
          const receiptHtml = generateProfessionalReceipt(invoiceData);
          printReceiptDirectly({ receiptHtml: receiptHtml, isDirect: true });
          showToastNotification(
            getTranslation("receipt.printing", "Printing invoice #") +
              invoiceData.id
          );
          return;
        }
      } catch (e) {
        console.warn("Error handling invoice view:", e);
        // Continue to other detection methods if this fails
      }
    }

    // CASE 2: If we have an invoice visible on screen, try to extract its data
    try {
      console.log("Trying to detect invoice data from DOM");

      // Try to detect invoice data from various DOM elements
      const invoiceIdElement = document.querySelector(
        ".invoice-id, .receipt-value, #invoice-number"
      );
      const customerElement = document.querySelector(
        ".customer-name, #customer-name, .customer-info"
      );
      const dateElement = document.querySelector(
        ".invoice-date, .receipt-date"
      );

      // Extract items from table rows
      const itemRows = document.querySelectorAll(
        "table.receipt-items tr:not(:first-child), #cart-items tr:not(.empty-cart)"
      );

      if (invoiceIdElement || itemRows.length > 0) {
        console.log("Found DOM elements that look like an invoice");

        // Extract items
        const items = [];
        let subtotal = 0;

        itemRows.forEach((row, idx) => {
          try {
            const cells = row.cells;
            if (cells && cells.length >= 2) {
              // Skip header rows
              if (row.querySelector("th")) return;

              // Skip summary rows
              if (
                row.classList.contains("receipt-summary-row") ||
                row.textContent.includes("Subtotal") ||
                row.textContent.includes("Total")
              )
                return;

              // Try to extract item data
              const nameCell = cells[0];
              const qtyCell = cells.length >= 4 ? cells[1] : null;
              const priceCell = cells.length >= 4 ? cells[2] : cells[1];
              const totalCell = cells.length >= 4 ? cells[3] : cells[2];

              if (nameCell && (priceCell || totalCell)) {
                const name = nameCell.textContent.trim();
                const qty = qtyCell ? parseInt(qtyCell.textContent) || 1 : 1;

                // Try to parse price
                let price = 0;
                if (priceCell)
                  price = parseCurrencyValue(priceCell.textContent);

                // Try to parse total
                let total = 0;
                if (totalCell)
                  total = parseCurrencyValue(totalCell.textContent);

                // If we have total but no price, calculate price
                if (total > 0 && price === 0 && qty > 0) {
                  price = total / qty;
                }

                // If we have price but no total, calculate total
                if (price > 0 && total === 0) {
                  total = price * qty;
                }

                items.push({
                  name: name,
                  quantity: qty,
                  price: price,
                  total: total,
                });

                subtotal += total;
              }
            }
          } catch (e) {
            console.warn("Error parsing row:", e);
          }
        });

        // Extract totals from elements
        const subtotalElement = document.querySelector(
          "[data-value='subtotal'], #subtotal, .subtotal"
        );
        const taxElement = document.querySelector(
          "[data-value='tax'], #tax, .tax"
        );
        const discountElement = document.querySelector(
          "[data-value='discount'], #discount-value, .discount"
        );
        const totalElement = document.querySelector(
          "[data-value='total'], #total, .total, .grand-total"
        );

        const extractedSubtotal = subtotalElement
          ? parseCurrencyValue(subtotalElement.textContent)
          : subtotal;
        const extractedTax = taxElement
          ? parseCurrencyValue(taxElement.textContent)
          : 0;
        const extractedDiscount = discountElement
          ? parseCurrencyValue(discountElement.textContent)
          : 0;
        const extractedTotal = totalElement
          ? parseCurrencyValue(totalElement.textContent)
          : extractedSubtotal - extractedDiscount + extractedTax;

        // Create invoice data object
        invoiceData = {
          id: invoiceIdElement
            ? invoiceIdElement.textContent.trim()
            : "INV-" + Date.now(),
          customer: customerElement
            ? customerElement.textContent.trim()
            : getTranslation("billing.labels.guest", "Guest Customer"),
          date: dateElement
            ? dateElement.textContent.trim()
            : new Date().toISOString(),
          items: items,
          subtotal: extractedSubtotal,
          tax: extractedTax,
          discount: extractedDiscount,
          total: extractedTotal,
          isRefund: false, // Default to sale
        };

        console.log("Extracted invoice data:", invoiceData);

        // Verify we have essential data
        if (invoiceData.items.length > 0 && invoiceData.total > 0) {
          console.log("Using extracted invoice data");

          // Generate receipt HTML using our professional template
          const receiptHtml = generateProfessionalReceipt(invoiceData);
          printReceiptDirectly({ receiptHtml: receiptHtml, isDirect: true });
          showToastNotification(
            getTranslation("receipt.printing", "Printing receipt...")
          );
          return;
        }
      }
    } catch (e) {
      console.warn("Error extracting invoice from DOM:", e);
      // Continue to other methods if this fails
    }

    // CASE 3: Check if there's a valid receipt in the container

    if (receiptContainer && receiptContainer.innerHTML.trim() !== "") {
      const content = receiptContainer.innerHTML.trim();
      const isPlaceholderOnly =
        content.includes("Receipt content will be generated here") ||
        content.length < 100;

      if (!isPlaceholderOnly) {
        console.log("Using receipt from container");
        printReceiptDirectly({ receiptHtml: content, isDirect: true });
        showToastNotification(
          getTranslation("receipt.printing", "Printing receipt...")
        );
        return;
      }
    }

    // CASE 4: Check if we have cart items to print
    const cartItems = getCartItems();
    if (cartItems.length > 0) {
      console.log("Creating receipt from cart items:", cartItems);

      // Try to process the sale first
      if (typeof window.completeSale === "function") {
        try {
          await window.completeSale();
          showToastNotification(
            getTranslation("sale.processing", "Processing sale...")
          );

          // Wait for receipt generation
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Check if receipt was generated
          if (receiptContainer) {
            const content = receiptContainer.innerHTML.trim();
            if (content.length > 100) {
              printReceiptDirectly({ receiptHtml: content, isDirect: true });
              showToastNotification(
                getTranslation(
                  "sale.completedAndPrinted",
                  "Sale completed and receipt printed"
                )
              );
              return;
            }
          }
        } catch (e) {
          console.warn("Error during completeSale:", e);
          // Continue to manual generation if this fails
        }
      }

      // If completeSale didn't work, generate manually
      try {
        // Calculate values from cart items
        let subtotal = 0;
        cartItems.forEach((item) => {
          subtotal += item.price * item.quantity;
        });

        const subtotalEl = document.getElementById("subtotal");
        const taxEl = document.getElementById("tax");
        const totalEl = document.getElementById("total");
        const customerNameEl = document.getElementById("customer-name");
        const discountValueEl = document.getElementById("discount-value");

        const calculatedSubtotal = subtotalEl
          ? parseCurrencyValue(subtotalEl.textContent)
          : subtotal;
        const discount = discountValueEl
          ? parseCurrencyValue(discountValueEl.textContent)
          : 0;
        const tax = taxEl ? parseCurrencyValue(taxEl.textContent) : 0;
        const calculatedTotal = totalEl
          ? parseCurrencyValue(totalEl.textContent)
          : calculatedSubtotal - discount + tax;

        invoiceData = {
          id: "INV-" + Date.now(),
          items: cartItems,
          customer:
            customerNameEl && customerNameEl.value
              ? customerNameEl.value
              : getTranslation("billing.labels.guest", "Guest Customer"),
          subtotal: calculatedSubtotal,
          discount: discount,
          tax: tax,
          total: calculatedTotal,
          date: new Date().toISOString(),
        };

        // Generate and print a receipt
        const receiptHtml = generateProfessionalReceipt(invoiceData);
        printReceiptDirectly({ receiptHtml: receiptHtml, isDirect: true });
        showToastNotification(
          getTranslation("receipt.printing", "Printing receipt...")
        );
        return;
      } catch (e) {
        console.error("Error generating manual receipt:", e);
      }
    }

    // CASE 5: Nothing to print
    showToastNotification(
      getTranslation(
        "receipt.noItems",
        "No items to print. Add items to cart first."
      ),
      true
    );
  } catch (error) {
    console.error("Error in print function:", error);
    showToastNotification(
      getTranslation("receipt.errors.handling", "Error printing receipt: ") +
        error.message,
      true
    );
  }
}

/**
 * Get cart items from various possible sources
 * @return {Array} Array of cart items
 */
function getCartItems() {
  // Try to get from window.cart first
  if (window.cart && Array.isArray(window.cart) && window.cart.length > 0) {
    return window.cart;
  }

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

/**
 * Helper function to print receipt directly with improved formatting
 * @param {Object} invoiceData - Invoice data or object with receiptHtml
 */
function printReceiptDirectly(invoiceData) {
  try {
    let receiptHtml;
    let styles = "";

    // Check if professional styles are available
    if (typeof window.professionalReceiptStyles !== "undefined") {
      styles = window.professionalReceiptStyles;
    } else {
      // Regenerate styles if needed
      styles = updateReceiptStyles();
    }

    // Get logo data directly from localStorage
    const customLogo = localStorage.getItem("companyLogo");

    // If the HTML was passed directly, use it (from receipt container)
    if (invoiceData.isDirect && invoiceData.receiptHtml) {
      receiptHtml = invoiceData.receiptHtml;
    }
    // Otherwise generate receipt HTML from invoice data
    else if (!invoiceData.isDirect) {
      // Always use the professional template
      receiptHtml = generateProfessionalReceipt(invoiceData);
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
        <!-- Add Amiri font for Arabic support -->
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap">
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
    showToastNotification(
      getTranslation("receipt.errors.printing", "Error printing receipt"),
      true
    );
  }
}

/**
 * Save receipt as HTML file for download
 * @param {string} html - Receipt HTML content
 * @param {string} invoiceId - Invoice ID for filename
 */
function downloadReceiptAsHTML(html, invoiceId) {
  try {
    // Create a styled HTML document
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${getTranslation(
          "receipt.title",
          "Receipt"
        )} ${invoiceId}</title>
        <style>
          ${window.professionalReceiptStyles || ""}
          
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          
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
        <!-- Add Amiri font for Arabic support -->
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap">
      </head>
      <body>
        <div class="receipt-content">
          ${html}
        </div>
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print();" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            ${getTranslation("receipt.printButton", "Print Receipt")}
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

    alert(
      `${getTranslation(
        "receipt.downloadSuccess",
        "Receipt downloaded as"
      )} receipt-${invoiceId}.html\n\n${getTranslation(
        "receipt.openInBrowser",
        "You can open this file in your web browser to print it."
      )}`
    );
  } catch (error) {
    console.error(
      getTranslation("receipt.errors.creating", "Error creating receipt:"),
      error
    );
    alert(
      getTranslation(
        "receipt.errors.downloadFailed",
        "Failed to download receipt. Please try again."
      )
    );
  }
}

/**
 * Email receipt - currently offers download as alternative
 */
function emailReceipt() {
  if (
    confirm(
      getTranslation(
        "receipt.emailNotImplemented",
        "Email functionality is not available. Would you like to download the receipt instead?"
      )
    )
  ) {
    printReceipt();
  }
}

// ================ INITIALIZATION ================

/**
 * Initialize receipt system with sample data (for testing)
 */
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

/**
 * Enhanced F8 shortcut handler for printing
 */
function enhanceF8ShortcutHandler() {
  document.addEventListener(
    "keydown",
    function (event) {
      // F8 for printing receipts
      if (event.key === "F8") {
        event.preventDefault();
        event.stopPropagation();

        // Print receipt
        window.printReceipt();
        return false;
      }
    },
    true
  ); // true = capturing phase, ensures this runs first
}

/**
 * Ensure that our professional receipt functions override any others
 * This makes sure our versions are always used
 */
function ensureProfessionalReceiptFunctions() {
  // Store original functions if they exist
  const originalPrintReceipt = window.printReceipt;
  const originalGenerateReceiptHtml = window.generateReceiptHtml;

  // Override the functions
  window.printReceipt = printReceipt;
  window.generateReceiptHtml = generateProfessionalReceipt;

  console.log("Professional receipt functions installed");
}

// Document ready initialization
document.addEventListener("DOMContentLoaded", function () {
  // Add the professional receipt styles to the document
  updateReceiptStylesFromSettings();

  // Make sure our functions override any others
  ensureProfessionalReceiptFunctions();

  // If in a test/demo environment, initialize with sample data
  if (
    document.getElementById("receipt-container") &&
    !window.location.pathname.includes("billing.html")
  ) {
    initializeProfessionalReceipt();
  }

  // Add language change listeners
  window.addEventListener("languageChanged", function () {
    updateReceiptStylesFromSettings();
  });

  window.addEventListener("i18nReady", function () {
    updateReceiptStylesFromSettings();
  });

  // Listen for settings changes
  window.addEventListener("storage", function (e) {
    if (
      e.key &&
      (e.key.startsWith("company") ||
        e.key === "receiptTheme" ||
        e.key === "language" ||
        e.key === "receiptFooter" ||
        e.key === "returnPolicy")
    ) {
      // Update receipt styles if any receipt-related setting changed
      updateReceiptStylesFromSettings();
    }
  });

  // Enhance F8 shortcut for printing
  enhanceF8ShortcutHandler();
});

// Override the standard print function for direct printing
const originalWindowPrint = window.print;
window.print = function () {
  console.log("Window.print intercepted - using professional receipt printing");
  printReceipt();
};

// ================ EXPOSE FUNCTIONS GLOBALLY ================

// Make functions available globally
window.generateProfessionalReceipt = generateProfessionalReceipt;
window.updateReceiptStyles = updateReceiptStyles;
window.updateReceiptStylesFromSettings = updateReceiptStylesFromSettings;
window.formatCurrency = formatCurrency;
window.parseCurrencyValue = parseCurrencyValue;
window.showToastNotification = showToastNotification;
window.completeSale = completeSale;
window.printReceipt = printReceipt;
window.emailReceipt = emailReceipt;
window.professionalReceiptStyles = updateReceiptStyles();
window.getTranslation = getTranslation;

// In case other scripts use these legacy functions, map them to our new ones
window.generateReceiptHtml = generateProfessionalReceipt;
