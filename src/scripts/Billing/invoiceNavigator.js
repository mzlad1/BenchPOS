// Invoice Navigation functionality with translations
// Add this to billing.js

// Initialize translation helper
const t = window.t;

// Global variables for invoice navigation
let allInvoices = [];
let currentInvoiceIndex = -1;
let isViewingInvoice = false;
let isEditingInvoice = false;

// Add invoice navigation buttons to the page
function initInvoiceNavigation() {
  // Create a navigation bar for invoice browsing with shortcut indicators
  const navBar = document.createElement("div");
  navBar.className = "invoice-nav";
  navBar.innerHTML = `
    <button id="previous-invoice-btn" class="btn secondary-btn" title="${t(
      "invoiceNav.buttons.previousTitle"
    )}">
      <span class="nav-icon">◀</span> ${t(
        "invoiceNav.buttons.previous"
      )} <span class="shortcut-indicator">${t(
    "invoiceNav.shortcuts.previousKey"
  )}</span>
    </button>
    <button id="view-invoices-btn" class="btn secondary-btn" title="${t(
      "invoiceNav.buttons.browseTitle"
    )}">
      <span class="nav-icon">📋</span> ${t("invoiceNav.buttons.browse")}
    </button>
    <button id="next-invoice-btn" class="btn secondary-btn" title="${t(
      "invoiceNav.buttons.nextTitle"
    )}">
      ${t("invoiceNav.buttons.next")} <span class="shortcut-indicator">${t(
    "invoiceNav.shortcuts.nextKey"
  )}</span> <span class="nav-icon">▶</span>
    </button>
  `;

  // Find the search bar to insert the navigation bar before it
  const searchBar = document.querySelector(".product-selection .search-bar");
  if (searchBar) {
    // Insert before the search bar
    searchBar.parentNode.insertBefore(navBar, searchBar);
  } else {
    // Fallback to original position if search bar not found
    const billingContainer = document.querySelector(".billing-container");
    billingContainer.parentNode.insertBefore(navBar, billingContainer);
  }

  // Add event listeners
  document
    .getElementById("previous-invoice-btn")
    .addEventListener("click", showPreviousInvoice);
  document
    .getElementById("next-invoice-btn")
    .addEventListener("click", showNextInvoice);
  document
    .getElementById("view-invoices-btn")
    .addEventListener("click", showInvoiceBrowser);

  // Add keyboard shortcuts
  document.addEventListener("keydown", function (event) {
    // Don't trigger if in text input
    if (
      event.target.tagName === "INPUT" ||
      event.target.tagName === "TEXTAREA"
    ) {
      return;
    }

    switch (event.key) {
      case "F11":
        event.preventDefault();
        showPreviousInvoice();
        break;
      case "F12":
        event.preventDefault();
        showNextInvoice();
        break;
    }
  });

  // Load invoices initially
  loadAllInvoices();
}

// Load all invoices from the database
async function loadAllInvoices() {
  try {
    allInvoices = await window.api.getInvoices();
    console.log(
      t("invoiceNav.messages.loadedInvoices", { count: allInvoices.length })
    );

    // Sort by date (newest first)
    allInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Update UI buttons based on available invoices
    updateNavigationButtons();
  } catch (error) {
    console.error(t("invoiceNav.messages.errorLoading"), error);
  }
}

// Update navigation buttons state
function updateNavigationButtons() {
  const prevBtn = document.getElementById("previous-invoice-btn");
  const nextBtn = document.getElementById("next-invoice-btn");

  if (allInvoices.length === 0) {
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    return;
  }

  if (isViewingInvoice) {
    prevBtn.disabled = currentInvoiceIndex <= 0;
    nextBtn.disabled = currentInvoiceIndex >= allInvoices.length - 1;
  } else {
    prevBtn.disabled = allInvoices.length === 0;
    nextBtn.disabled = allInvoices.length === 0;
  }
}

// Show previous invoice
function showPreviousInvoice() {
  if (allInvoices.length === 0) {
    alert(t("invoiceNav.messages.noInvoices"));
    return;
  }

  if (!isViewingInvoice) {
    // If not already viewing an invoice, load the most recent one
    currentInvoiceIndex = 0;
  } else if (currentInvoiceIndex > 0) {
    // Move to previous invoice
    currentInvoiceIndex--;
  } else {
    alert(t("invoiceNav.messages.viewingOldest"));
    return;
  }

  loadInvoice(allInvoices[currentInvoiceIndex]);
}

// Show next invoice
function showNextInvoice() {
  if (allInvoices.length === 0) {
    alert(t("invoiceNav.messages.noInvoices"));
    return;
  }

  if (!isViewingInvoice) {
    // If not already viewing an invoice, load the most recent one
    currentInvoiceIndex = 0;
  } else if (currentInvoiceIndex < allInvoices.length - 1) {
    // Move to next invoice
    currentInvoiceIndex++;
  } else {
    alert(t("invoiceNav.messages.viewingNewest"));
    return;
  }

  loadInvoice(allInvoices[currentInvoiceIndex]);
}

// Load a specific invoice
function loadInvoice(invoice) {
  // Clear current cart first
  if (cart.length > 0 && !isViewingInvoice) {
    if (!confirm(t("invoiceNav.messages.clearCartConfirm"))) {
      return;
    }
  }

  // Set viewing flag
  isViewingInvoice = true;
  isEditingInvoice = false; // Ensure we start in view mode, not edit mode

  // Clear current cart
  cart = [];

  // Convert invoice items to cart format
  invoice.items.forEach((item) => {
    cart.push({
      id: item.id,
      name: item.name,
      price: item.price || item.finalPrice,
      cost: item.cost || 0,
      quantity: item.quantity,
      total: item.total || item.price * item.quantity,
      isRefund: item.price < 0 || false,
      isMiscellaneous: item.isMiscellaneous || false,
      discount: item.discount,
    });
  });

  // Set customer info
  customerNameEl.value = invoice.customer || "Guest Customer";

  // Apply cart-level discount if any
  if (invoice.discountDetails && invoice.discountDetails.type !== "none") {
    cartDiscount = invoice.discountDetails;
  } else {
    cartDiscount = { type: "none", value: 0, amount: 0 };
  }

  // Update UI - this now has built-in handling for view mode
  renderCart();
  updateTotals();

  // Generate and update receipt HTML for the loaded invoice
  if (typeof generateProfessionalReceipt === "function") {
    receiptContainerEl.innerHTML = generateProfessionalReceipt(invoice);
  } else if (typeof generateReceiptHtmlWithDiscount === "function") {
    receiptContainerEl.innerHTML = generateReceiptHtmlWithDiscount(invoice);
  } else if (typeof generateReceiptHtml === "function") {
    receiptContainerEl.innerHTML = generateReceiptHtml(invoice);
  }

  // Add an invoice view indicator
  const invoicePanel = document.querySelector(".invoice-panel h2");

  // Remove previous indicators if any
  const existingIndicator = document.getElementById("invoice-view-indicator");
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // Add new indicator
  const indicator = document.createElement("div");
  indicator.id = "invoice-view-indicator";
  indicator.className = "invoice-indicator";
  indicator.style.position = "relative";
  indicator.style.zIndex = "999";
  indicator.innerHTML = `
    <span>${t("invoiceNav.messages.viewingInvoice")}${invoice.id}</span>
    <div class="invoice-actions">
      <button id="edit-invoice-btn" class="btn primary-btn" style="background-color: #4CAF50; color: white; font-weight: bold; position: relative; z-index: 1000;">${t(
        "invoiceNav.buttons.edit"
      )}</button>
      <button id="new-invoice-btn" class="btn secondary-btn" style="position: relative; z-index: 1000;">${t(
        "invoiceNav.buttons.newInvoice"
      )}</button>
    </div>
  `;

  invoicePanel.after(indicator);

  // Add event listeners for new buttons
  document
    .getElementById("edit-invoice-btn")
    .addEventListener("click", () => toggleEditMode(invoice));
  document
    .getElementById("new-invoice-btn")
    .addEventListener("click", startNewInvoice);

  // Disable the regular cart buttons
  toggleCartButtons(false);

  // Extra safety: explicitly disable all quantity buttons
  setTimeout(() => {
    document.querySelectorAll(".quantity-btn, .remove-btn").forEach((btn) => {
      btn.disabled = true;
      btn.style.opacity = "0.5";
      btn.style.cursor = "not-allowed";

      // Remove event listeners by cloning and replacing
      const newBtn = btn.cloneNode(true);
      if (btn.parentNode) {
        btn.parentNode.replaceChild(newBtn, btn);
      }
    });

    // Disable checkboxes
    document.querySelectorAll(".item-select").forEach((checkbox) => {
      checkbox.disabled = true;
    });
  }, 50);

  // Update navigation buttons
  updateNavigationButtons();
}

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

// Toggle edit mode for an invoice
function toggleEditMode(invoice) {
  isEditingInvoice = !isEditingInvoice;

  const indicator = document.getElementById("invoice-view-indicator");
  const editBtn = document.getElementById("edit-invoice-btn");

  if (isEditingInvoice) {
    // Enable editing
    indicator.classList.add("editing");
    editBtn.textContent = t("invoiceNav.buttons.saveChanges");
    editBtn.classList.add("primary-btn");
    editBtn.style.backgroundColor = "#FF9800"; // Orange for save mode

    // Enable buttons
    toggleCartButtons(true);

    // Re-render cart with enabled buttons
    renderCart();

    // Show a toast notification to confirm edit mode
    showToastNotification(t("invoiceNav.messages.editModeEnabled"));
  } else {
    // Save changes
    if (confirm(t("invoiceNav.messages.saveChangesConfirm"))) {
      saveInvoiceChanges(invoice);

      // Update UI
      indicator.classList.remove("editing");
      editBtn.textContent = t("invoiceNav.buttons.edit");
      editBtn.classList.remove("primary-btn");
      editBtn.style.backgroundColor = "#4CAF50"; // Green for edit button

      // Important: Set back to view mode explicitly
      isViewingInvoice = true;
      isEditingInvoice = false;

      // Re-render cart with disabled buttons
      renderCart();

      // Disable buttons
      toggleCartButtons(false);

      // Show confirmation
      showToastNotification(t("invoiceNav.messages.invoiceUpdated"), false);
    } else {
      // User cancelled - stay in edit mode
      isEditingInvoice = true; // Revert the toggle
      return;
    }
  }
}

// Save changes to an invoice
async function saveInvoiceChanges(originalInvoice) {
  try {
    // Calculate totals
    const subtotal = parseFloat(
      subtotalEl.textContent.replace(/[^0-9.-]+/g, "")
    );
    const discount = parseFloat(
      document
        .getElementById("discount-value")
        .textContent.replace(/[^0-9.-]+/g, "")
    );
    const tax = parseFloat(taxEl.textContent.replace(/[^0-9.-]+/g, ""));
    const total = parseFloat(totalEl.textContent.replace(/[^0-9.-]+/g, ""));

    // Prepare updated invoice data
    const updatedInvoice = {
      ...originalInvoice,
      items: cart.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        cost: item.cost || 0,
        quantity: item.quantity,
        total: item.price * item.quantity,
        discount: item.discount,
        isRefund: item.isRefund || false,
        isMiscellaneous: item.isMiscellaneous || false,
      })),
      customer: customerNameEl.value || t("invoiceNav.labels.guest"),
      subtotal: subtotal,
      discount: discount,
      discountDetails: cartDiscount,
      tax: tax,
      total: total,
      lastModified: new Date().toISOString(),
    };

    // Save to database
    await window.api.updateInvoice(updatedInvoice);

    // Update local copy
    allInvoices[currentInvoiceIndex] = updatedInvoice;

    // IMPORTANT: Set the flags explicitly for view mode
    isViewingInvoice = true;
    isEditingInvoice = false;

    // Update the UI to reflect view mode
    const indicator = document.getElementById("invoice-view-indicator");
    const editBtn = document.getElementById("edit-invoice-btn");

    if (indicator) indicator.classList.remove("editing");
    if (editBtn) {
      editBtn.textContent = t("invoiceNav.buttons.edit");
      editBtn.classList.remove("primary-btn");
    }

    // Disable interaction - ensure this happens AFTER rendering
    renderCart();
    updateTotals();

    // CRITICAL: Must call toggleCartButtons AFTER rendering
    // to ensure newly rendered buttons are disabled
    toggleCartButtons(false);

    // Extra safety: Directly disable all quantity buttons
    document.querySelectorAll(".quantity-btn").forEach((btn) => {
      btn.disabled = true;
      // Add visual indication
      btn.style.opacity = "0.5";
      btn.style.cursor = "not-allowed";
    });

    // Remove any event listeners for quantity buttons in view mode
    document.querySelectorAll(".quantity-btn").forEach((btn) => {
      // Clone and replace to remove event listeners
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });

    // Show confirmation
    showToastNotification(t("invoiceNav.messages.invoiceUpdated"), false);
  } catch (error) {
    console.error(t("invoiceNav.messages.errorSaving"), error);
    showToastNotification(t("invoiceNav.messages.errorSaving"), true);
  }
}

// Start a new invoice
function startNewInvoice() {
  if (confirm(t("invoiceNav.messages.startNewConfirm"))) {
    isViewingInvoice = false;
    isEditingInvoice = false;
    currentInvoiceIndex = -1;

    // Clear cart
    cart = [];
    renderCart();
    updateTotals();

    // Clear customer info
    customerNameEl.value = "";

    // Reset discount
    cartDiscount = { type: "none", value: 0, amount: 0 };

    // Remove invoice indicator
    const indicator = document.getElementById("invoice-view-indicator");
    if (indicator) {
      indicator.remove();
    }

    // Enable cart buttons
    toggleCartButtons(true);

    // Update navigation buttons
    updateNavigationButtons();
  }

  document.getElementById("barcode-input").disabled = false;
  document.getElementById("customer-name").disabled = false;
  document.getElementById("product-search").disabled = false;

  // Enable all input fields
  document.querySelectorAll("input").forEach((input) => {
    input.disabled = false;
  });
}

// Enable/disable cart interaction buttons
function toggleCartButtons(enabled) {
  const quantityBtns = document.querySelectorAll(".quantity-btn");
  const removeBtns = document.querySelectorAll(".remove-btn");
  const clearBtn = document.getElementById("clear-invoice");
  const completeBtn = document.getElementById("complete-sale");
  const discountBtn = document.getElementById("add-discount-btn");
  const refundBtn = document.getElementById("refund-selected");

  // Disable all interactive buttons
  quantityBtns.forEach((btn) => (btn.disabled = !enabled));
  removeBtns.forEach((btn) => (btn.disabled = !enabled));

  if (clearBtn) clearBtn.disabled = !enabled;
  if (completeBtn) completeBtn.disabled = !enabled;
  if (discountBtn) discountBtn.disabled = !enabled;
  if (refundBtn) refundBtn.disabled = !enabled;

  // Also disable "Add to Cart" buttons
  const addToCartBtns = document.querySelectorAll(".add-to-cart");
  addToCartBtns.forEach((btn) => (btn.disabled = !enabled));

  // Disable barcode input
  const barcodeInput = document.getElementById("barcode-input");
  if (barcodeInput) {
    barcodeInput.disabled = !enabled;
  }

  // Disable product search
  const productSearch = document.getElementById("product-search");
  if (productSearch) {
    productSearch.disabled = !enabled;
  }

  // IMPORTANT: Remove any full-screen overlays that block interaction
  const overlays = document.querySelectorAll(".view-only-overlay");
  overlays.forEach((overlay) => {
    overlay.parentNode.removeChild(overlay);
  });

  // Instead of overlays, add a clear message to the table
  const cartTable = document.querySelector("#cart-items");
  if (cartTable && !enabled) {
    // Check if we already have a message row
    let messageRow = document.querySelector(".edit-mode-message-row");
    if (!messageRow) {
      messageRow = document.createElement("tr");
      messageRow.className = "edit-mode-message-row";

      const messageCell = document.createElement("td");
      messageCell.setAttribute("colspan", "6"); // Span all columns
      messageCell.style.padding = "10px";
      messageCell.style.textAlign = "center";
      messageCell.style.backgroundColor = "#f8f8f8";
      messageCell.style.color = "#333";
      messageCell.innerHTML = t("invoiceNav.messages.clickEditPrompt");

      messageRow.appendChild(messageCell);

      // Insert as the first row
      if (cartTable.firstChild) {
        cartTable.insertBefore(messageRow, cartTable.firstChild);
      } else {
        cartTable.appendChild(messageRow);
      }
    }
  } else if (cartTable && enabled) {
    // Remove the message when in edit mode
    const messageRow = document.querySelector(".edit-mode-message-row");
    if (messageRow) {
      messageRow.parentNode.removeChild(messageRow);
    }
  }
}

// Show the invoice browser modal
function showInvoiceBrowser() {
  if (allInvoices.length === 0) {
    alert(t("invoiceNav.messages.noBrowseInvoices"));
    return;
  }

  // Create modal for invoice browsing
  const browserModal = document.createElement("div");
  browserModal.className = "modal";
  browserModal.id = "invoice-browser-modal";

  const modalContent = document.createElement("div");
  modalContent.className = "modal-content browser-content";

  // Create search and filter controls
  const searchHTML = `
    <div class="browser-header">
      <h2>${t("invoiceNav.modal.title")}</h2>
      <span class="close">&times;</span>
    </div>
    <div class="browser-filters">
      <div class="search-container">
        <input type="text" id="invoice-search" placeholder="${t(
          "invoiceNav.modal.searchPlaceholder"
        )}">
        <button id="search-invoices-btn" class="btn secondary-btn">${t(
          "invoiceNav.buttons.search"
        )}</button>
      </div>
      <div class="date-filters">
        <div class="form-group">
          <label for="date-from">${t("invoiceNav.labels.from")}</label>
          <input type="date" id="date-from">
        </div>
        <div class="form-group">
          <label for="date-to">${t("invoiceNav.labels.to")}</label>
          <input type="date" id="date-to">
        </div>
        <button id="apply-date-filter" class="btn secondary-btn">${t(
          "invoiceNav.buttons.applyFilter"
        )}</button>
        <button id="reset-filters" class="btn secondary-btn">${t(
          "invoiceNav.buttons.reset"
        )}</button>
      </div>
    </div>
  `;

  // Create table for invoices
  const tableHTML = `
    <div class="browser-table-container">
      <table id="invoices-table" class="browser-table">
        <thead>
          <tr>
            <th>${t("invoiceNav.labels.invoiceNumber")}</th>
            <th>${t("invoiceNav.labels.date")}</th>
            <th>${t("invoiceNav.labels.customer")}</th>
            <th>${t("invoiceNav.labels.items")}</th>
            <th>${t("invoiceNav.labels.total")}</th>
            <th>${t("invoiceNav.labels.action")}</th>
          </tr>
        </thead>
        <tbody id="invoices-table-body">
          ${generateInvoiceTableRows(allInvoices)}
        </tbody>
      </table>
    </div>
  `;

  modalContent.innerHTML = searchHTML + tableHTML;
  browserModal.appendChild(modalContent);
  document.body.appendChild(browserModal);

  // Show the modal
  browserModal.style.display = "block";

  // Add event listeners
  document
    .querySelector("#invoice-browser-modal .close")
    .addEventListener("click", () => {
      document.body.removeChild(browserModal);
    });

  // Search functionality
  document
    .getElementById("search-invoices-btn")
    .addEventListener("click", () => {
      const searchTerm = document
        .getElementById("invoice-search")
        .value.toLowerCase();
      const filteredInvoices = allInvoices.filter(
        (invoice) =>
          (invoice.id && invoice.id.toLowerCase().includes(searchTerm)) ||
          (invoice.customer &&
            invoice.customer.toLowerCase().includes(searchTerm))
      );

      document.getElementById("invoices-table-body").innerHTML =
        generateInvoiceTableRows(filteredInvoices);

      // Reattach view buttons event listeners
      attachViewButtonListeners();
    });

  // Date filter functionality
  document.getElementById("apply-date-filter").addEventListener("click", () => {
    const dateFrom = document.getElementById("date-from").value;
    const dateTo = document.getElementById("date-to").value;

    let filteredInvoices = [...allInvoices];

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filteredInvoices = filteredInvoices.filter(
        (invoice) => new Date(invoice.date) >= fromDate
      );
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      // Set time to end of day
      toDate.setHours(23, 59, 59, 999);
      filteredInvoices = filteredInvoices.filter(
        (invoice) => new Date(invoice.date) <= toDate
      );
    }

    document.getElementById("invoices-table-body").innerHTML =
      generateInvoiceTableRows(filteredInvoices);

    // Reattach view buttons event listeners
    attachViewButtonListeners();
  });

  // Reset filters
  document.getElementById("reset-filters").addEventListener("click", () => {
    document.getElementById("invoice-search").value = "";
    document.getElementById("date-from").value = "";
    document.getElementById("date-to").value = "";

    document.getElementById("invoices-table-body").innerHTML =
      generateInvoiceTableRows(allInvoices);

    // Reattach view buttons event listeners
    attachViewButtonListeners();
  });

  // Close when clicking outside
  browserModal.addEventListener("click", (event) => {
    if (event.target === browserModal) {
      document.body.removeChild(browserModal);
    }
  });

  // Attach view button listeners
  attachViewButtonListeners();

  // Set current date as the default "to" date
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("date-to").value = today;
}

// Generate HTML for invoice table rows
function generateInvoiceTableRows(invoices) {
  if (invoices.length === 0) {
    return `<tr><td colspan="6" class="no-data">${t(
      "invoiceNav.messages.noInvoicesFound"
    )}</td></tr>`;
  }

  return invoices
    .map((invoice, index) => {
      const date = formatDate(new Date(invoice.date));

      const itemCount = invoice.items ? invoice.items.length : 0;
      const isRefund =
        invoice.isRefund ||
        (invoice.items && invoice.items.some((item) => item.price < 0));

      return `
      <tr class="${isRefund ? "refund-row" : ""}">
        <td>${invoice.id}</td>
        <td>${date}</td>
        <td>${invoice.customer || t("invoiceNav.labels.guest")}</td>
        <td>${itemCount}</td>
        <td>${formatCurrency(Math.abs(invoice.total))}${
        isRefund ? ` ${t("invoiceNav.labels.refund")}` : ""
      }</td>
        <td>
          <button class="btn secondary-btn view-invoice-btn" data-index="${index}">${t(
        "invoiceNav.buttons.view"
      )}</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

function formatDate(dateStr) {
  // Check if input is already a Date object
  if (dateStr instanceof Date) {
    if (isNaN(dateStr)) {
      return t("invoiceNav.messages.invalidDate");
    }
    const month = String(dateStr.getMonth() + 1).padStart(2, "0");
    const day = String(dateStr.getDate()).padStart(2, "0");
    const year = dateStr.getFullYear();
    return `${month}/${day}/${year}`;
  }

  // Handle string input in the format "24₂ 10:30:13 2025/3/"
  if (typeof dateStr === "string") {
    try {
      // Extract components - assuming format like "24₂ 10:30:13 2025/3/"
      const parts = dateStr.split(" ");
      if (parts.length >= 3) {
        // Extract day (removing any subscript)
        const day = parseInt(parts[0].replace(/[^\d]/g, ""));

        // Extract year and month from the last part
        const yearMonth = parts[2].split("/");
        const year = parseInt(yearMonth[0]);
        const month = parseInt(yearMonth[1]) || 1; // Default to 1 if month is missing

        // Create a new date and format it
        const date = new Date(year, month - 1, day);
        if (!isNaN(date)) {
          return `${String(month).padStart(2, "0")}/${String(day).padStart(
            2,
            "0"
          )}/${year}`;
        }
      }
    } catch (e) {
      return t("invoiceNav.messages.invalidDateFormat");
    }
  }

  return t("invoiceNav.messages.invalidDate");
}

// Attach event listeners to view buttons
function attachViewButtonListeners() {
  document.querySelectorAll(".view-invoice-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      const index = parseInt(event.target.dataset.index);

      // Set current index and load the invoice
      currentInvoiceIndex = index;
      loadInvoice(allInvoices[index]);

      // Close the browser modal
      const browserModal = document.getElementById("invoice-browser-modal");
      document.body.removeChild(browserModal);
    });
  });
}

// Format currency based on user settings
function formatCurrency(amount) {
  const currency = localStorage.getItem("currency") || "USD";
  const symbol = currency === "ILS" ? "₪" : "$";
  return `${symbol}${parseFloat(amount).toFixed(2)}`;
}

// Show notification message
function showNotification(message, isError = false) {
  let notification = document.getElementById("notification");

  if (!notification) {
    notification = document.createElement("div");
    notification.id = "notification";
    notification.className = "notification";
    document.body.appendChild(notification);
  }

  notification.textContent = message;
  notification.className = "notification " + (isError ? "error" : "success");
  notification.style.display = "block";

  setTimeout(() => {
    notification.style.display = "none";
  }, 3000);
}

// Add CSS for invoice navigation
function addInvoiceNavigationStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    .nav-icon {
      font-size: 0.8em;
    }
    
    .invoice-indicator {
      background-color: #f8f8f8;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      margin: 10px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .invoice-indicator.editing {
      background-color: #fff8e1;
      border-color: #ffecb3;
    }
    
    .invoice-actions {
      display: flex;
      gap: 10px;
    }
    
    .browser-content {
      width: 90%;
      max-width: 900px;
      max-height: 80vh;
    }
    
    .browser-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .browser-filters {
      margin-bottom: 20px;
      padding: 15px;
      background-color: #f8f8f8;
      border-radius: 4px;
    }
    
    .date-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-top: 15px;
      align-items: flex-end;
    }
    
    .date-filters .form-group {
      margin: 0;
    }
    
    .browser-table-container {
      max-height: 400px;
      overflow-y: auto;
    }
    
    .browser-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .browser-table th {
      position: sticky;
      top: 0;
      background-color: #f0f4f8;
      z-index: 10;
    }
    
    .browser-table th, .browser-table td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    
    .refund-row {
      background-color: #fff0f0;
    }
    
    .no-data {
      text-align: center;
      padding: 20px;
      color: #777;
    }
  `;
  document.head.appendChild(styleElement);
}

// Add function to check if API supports invoice updates
async function checkInvoiceUpdateSupport() {
  if (!window.api.updateInvoice) {
    // Create a placeholder function if not supported
    window.api.updateInvoice = async (invoice) => {
      console.log("Invoice update not supported by API, using fallback");
      // Find the invoice in local storage and update it
      const invoices = await window.api.getInvoices();
      const index = invoices.findIndex((inv) => inv.id === invoice.id);

      if (index !== -1) {
        invoices[index] = invoice;

        // Store updated invoices via local storage
        // This is just a fallback for demo purposes
        localStorage.setItem("invoices", JSON.stringify(invoices));
        return true;
      }

      return false;
    };
  }
}

// Update the cart table HTML to include a checkbox column
function updateCartTableHeader() {
  const headerRow = document.querySelector("#cart-table thead tr");
  if (headerRow) {
    // Create a new header cell for checkboxes
    const checkboxHeader = document.createElement("th");
    checkboxHeader.textContent = ""; // Empty header for checkboxes

    // Insert it as the first column
    headerRow.insertBefore(checkboxHeader, headerRow.firstChild);
  }
}
