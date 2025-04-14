function playCompletionSound() {
  try {
    const completionSound = new Audio("../Audio/completed.mp3"); // Same path format as beep sound
    completionSound.volume = 0.3;
    completionSound
        .play()
        .catch((e) => console.log(t('sale.sound.couldNotPlay'), e));
  } catch (e) {
    console.error(t('sale.sound.error'), e);
  }
}

// Complete sale
// Fix for the completeSale function to update the invoices array
async function completeSale() {
  if (cart.length === 0) return;

  try {
    const invoiceData = {
      items: cart,
      customer: customerNameEl.value || t('billing.labels.guest'),
      subtotal: parseFloat(subtotalEl.textContent.replace("$", "")),
      tax: parseFloat(taxEl.textContent.replace("$", "")),
      total: parseFloat(totalEl.textContent.replace("$", "")),
      date: new Date().toISOString(),
    };

    // Save invoice to database
    const invoiceId = await window.api.createInvoice(invoiceData);

    // *** Add this code to update the in-memory invoices array ***
    const newInvoice = {
      ...invoiceData,
      id: invoiceId,
      createdAt: new Date().toISOString(),
    };

    // Add the new invoice to the allInvoices array
    allInvoices.unshift(newInvoice); // Add to beginning (newest first)

    // Reset the current index to point to the new invoice
    currentInvoiceIndex = 0;
    // *** End of new code ***

    // Generate receipt HTML (store it but don't show modal)
    const receiptHtml = generateReceiptHtml({
      ...invoiceData,
      id: invoiceId,
    });

    // Still store the receipt HTML for F8 printing, but don't show the modal
    receiptContainerEl.innerHTML = receiptHtml;
    // receiptModal.style.display = "block"; // REMOVED THIS LINE

    // Show a notification instead
    showToastNotification(t('sale.completedSuccess'));
    // Play the completion sound
    playCompletionSound();
    // Clear the cart
    clearCart();
  } catch (error) {
    console.error(t('sale.error'), error);
    alert(t('sale.failed'));
  }
}

// Format currency based on user settings
function formatCurrency(amount) {
  const currency = localStorage.getItem("currency") || "USD";
  const symbol = currency === "ILS" ? "₪" : "$";
  return `${symbol}${parseFloat(amount).toFixed(2)}`;
}

// Add a toast notification function if it doesn't exist yet
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

// Generate receipt HTML
function generateReceiptHtml(invoice) {
  const itemsHtml = invoice.items
      .map(
          (item) => `
    <tr>
      <td>${item.name}</td>
      <td>${item.quantity}</td>
      <td>${formatCurrency(item.price)}</td>
      <td>${formatCurrency(item.price * item.quantity)}</td>
    </tr>
  `
      )
      .join("");

  return `
    <div class="receipt-header">
      <h2>${t('billing.receipt.header')}</h2>
      <p>${t('billing.receipt.address')}</p>
      <p>${t('billing.receipt.phone')}</p>
    </div>
    
    <div class="receipt-info">
      <p><strong>${t('billing.receipt.receiptNumber')}</strong> ${invoice.id}</p>
      <p><strong>${t('billing.receipt.date')}</strong> ${new Date(invoice.date).toLocaleString()}</p>
      <p><strong>${t('billing.receipt.customer')}</strong> ${invoice.customer}</p>
    </div>
    
    <table class="receipt-items">
      <thead>
        <tr>
          <th>${t('billing.receipt.item')}</th>
          <th>${t('billing.receipt.qty')}</th>
          <th>${t('billing.receipt.price')}</th>
          <th>${t('billing.receipt.total')}</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3">${t('billing.receipt.subtotal')}</td>
          <td>${formatCurrency(invoice.subtotal)}</td>
        </tr>
        <tr>
          <td colspan="3">${t('billing.receipt.tax')}</td>
          <td>${formatCurrency(invoice.tax)}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3">${t('billing.receipt.total')}</td>
          <td>${formatCurrency(invoice.total)}</td>
        </tr>
      </tfoot>
    </table>
    
    <div class="receipt-footer">
      <p>${t('billing.receipt.thankYou')}</p>
    </div>
  `;
}

// Print receipt
// Completely revised print receipt function that bypasses the API
async function printReceipt() {
  try {
    // Check if receipt container exists
    if (!receiptContainerEl) {
      console.error(t('receipt.errors.containerNotFound'));
      alert(t('receipt.errors.containerAlert'));
      return;
    }

    const receiptHtml = receiptContainerEl.innerHTML;

    // Generate a timestamp-based ID if we can't extract one from the receipt
    let invoiceId = "receipt-" + new Date().toISOString().replace(/[:.]/g, "-");

    // Try to extract the invoice ID if possible, but don't worry if it fails
    try {
      const idMatch = receiptHtml.match(/Receipt #:\s*([a-zA-Z0-9-]+)/);
      if (idMatch && idMatch[1]) {
        invoiceId = idMatch[1];
      }
    } catch (err) {
      console.log(t('receipt.errors.extractId'));
    }

    // Skip the API call and use the direct download method
    downloadReceiptAsHTML(receiptHtml, invoiceId);
  } catch (error) {
    console.error(t('receipt.errors.handling'), error);
    alert(t('receipt.errors.preparing'));
  }
}

// Function to download receipt as HTML
function downloadReceiptAsHTML(html, invoiceId) {
  try {
    // Create a styled HTML document
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${t('receipt.title')} ${invoiceId}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
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
            ${t('receipt.printButton')}
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
        `${t('receipt.downloadSuccess')} receipt-${invoiceId}.html\n\n${t('receipt.openInBrowser')}`
    );
  } catch (error) {
    console.error(t('receipt.errors.creating'), error);
    alert(t('receipt.errors.downloadFailed'));
  }
}

// This is a replacement for the emailReceipt function
// that offers to download the receipt instead
function emailReceipt() {
  if (
      confirm(t('receipt.emailNotImplemented'))
  ) {
    printReceipt();
  }
}