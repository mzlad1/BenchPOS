// Invoice Navigation functionality
// Add this to billing.js

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
    <button id="previous-invoice-btn" class="btn secondary-btn" title="Previous Invoice">
      <span class="nav-icon">◀</span> Previous <span class="shortcut-indicator">(F11)</span>
    </button>
    <button id="view-invoices-btn" class="btn secondary-btn" title="Browse Invoices">
      <span class="nav-icon">📋</span> Browse Invoices
    </button>
    <button id="next-invoice-btn" class="btn secondary-btn" title="Next Invoice">
      Next <span class="shortcut-indicator">(F12)</span> <span class="nav-icon">▶</span>
    </button>
  `;

  // Find the search bar to insert the navigation bar before it
  const searchBar = document.querySelector(".product-selection .search-bar");
  if (searchBar) {
    // Insert before the search bar
    searchBar.parentNode.insertBefore(navBar, searchBar);

    // Add styles for better spacing
    const styleElement = document.createElement("style");
    styleElement.textContent = `
      .invoice-nav {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 15px;
        margin-top: 10px;
      }
      
      .nav-icon {
        font-size: 0.8em;
      }
      
      .shortcut-indicator {
        font-size: 0.8em;
        opacity: 0.7;
        font-weight: normal;
      }
      
      .product-selection h2 {
        margin-bottom: 10px;
      }
      
      /* Make the buttons take equal width */
      .invoice-nav button {
        flex: 1;
        white-space: nowrap;
        font-size: 0.9rem;
        text-align: center;
        justify-content: center;
      }
      
      /* Keep the buttons visible on smaller screens */
      @media (max-width: 768px) {
        .invoice-nav {
          flex-wrap: wrap;
        }
        
        .invoice-nav button {
          flex: 1 1 auto;
          padding: 8px 10px;
          font-size: 0.85rem;
        }
        
        .shortcut-indicator {
          display: none; /* Hide shortcuts on mobile */
        }
      }
    `;
    document.head.appendChild(styleElement);
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
    console.log(`Loaded ${allInvoices.length} invoices`);

    // Sort by date (newest first)
    allInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Update UI buttons based on available invoices
    updateNavigationButtons();
  } catch (error) {
    console.error("Error loading invoices:", error);
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
    alert("No invoices available");
    return;
  }

  if (!isViewingInvoice) {
    // If not already viewing an invoice, load the most recent one
    currentInvoiceIndex = 0;
  } else if (currentInvoiceIndex > 0) {
    // Move to previous invoice
    currentInvoiceIndex--;
  } else {
    alert("You are viewing the oldest invoice");
    return;
  }

  loadInvoice(allInvoices[currentInvoiceIndex]);
}

// Show next invoice
function showNextInvoice() {
  if (allInvoices.length === 0) {
    alert("No invoices available");
    return;
  }

  if (!isViewingInvoice) {
    // If not already viewing an invoice, load the most recent one
    currentInvoiceIndex = 0;
  } else if (currentInvoiceIndex < allInvoices.length - 1) {
    // Move to next invoice
    currentInvoiceIndex++;
  } else {
    alert("You are viewing the most recent invoice");
    return;
  }

  loadInvoice(allInvoices[currentInvoiceIndex]);
}

// Load a specific invoice
function loadInvoice(invoice) {
  // Clear current cart first
  if (cart.length > 0 && !isViewingInvoice) {
    if (
      !confirm("Loading an invoice will clear your current cart. Continue?")
    ) {
      return;
    }
  }

  // Set viewing flag
  isViewingInvoice = true;

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

  // Update UI
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
  indicator.innerHTML = `
    <span>Viewing Invoice #${invoice.id}</span>
    <div class="invoice-actions">
      <button id="edit-invoice-btn" class="btn secondary-btn">Edit</button>
      <button id="new-invoice-btn" class="btn secondary-btn">New Invoice</button>
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

  // Disable the regular cart buttons if not in edit mode
  toggleCartButtons(false);

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
    editBtn.textContent = "Save Changes";
    editBtn.classList.add("primary-btn");
    toggleCartButtons(true);
  } else {
    // Save changes
    if (confirm("Save changes to this invoice?")) {
      saveInvoiceChanges(invoice);
    } else {
      // Reload the original invoice to discard changes
      loadInvoice(invoice);
      return;
    }

    // Update UI
    indicator.classList.remove("editing");
    editBtn.textContent = "Edit";
    editBtn.classList.remove("primary-btn");
    toggleCartButtons(false);
  }
}

// Save changes to an invoice
async function saveInvoiceChanges(originalInvoice) {
  try {
    // Calculate totals
    const subtotal = parseFloat(subtotalEl.textContent.replace("$", ""));
    const discount = parseFloat(
      document.getElementById("discount-value").textContent.replace("$", "")
    );
    const tax = parseFloat(taxEl.textContent.replace("$", ""));
    const total = parseFloat(totalEl.textContent.replace("$", ""));

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
      customer: customerNameEl.value || "Guest Customer",
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

    // Show confirmation
    showNotification("Invoice updated successfully", false);
  } catch (error) {
    console.error("Error saving invoice changes:", error);
    showNotification("Error saving changes", true);
  }

  isViewingInvoice = false;
  isEditingInvoice = false;
  toggleCartButtons(true);
  document.getElementById("barcode-input").disabled = false;
  document.getElementById("customer-name").disabled = false;
  document.getElementById("product-search").disabled = false;

  // Enable all input fields
  document.querySelectorAll("input").forEach((input) => {
    input.disabled = false;
  });
}

// Start a new invoice
function startNewInvoice() {
  if (confirm("Start a new invoice? This will clear the current view.")) {
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
  const refundBtn = document.getElementById("refund-selected"); // Add this line

  quantityBtns.forEach((btn) => (btn.disabled = !enabled));
  removeBtns.forEach((btn) => (btn.disabled = !enabled));

  clearBtn.disabled = !enabled;
  completeBtn.disabled = !enabled;

  if (discountBtn) {
    discountBtn.disabled = !enabled;
  }

  if (refundBtn) {
    // Add this check
    refundBtn.disabled = !enabled;
  }
}

// Show the invoice browser modal
function showInvoiceBrowser() {
  if (allInvoices.length === 0) {
    alert("No invoices available to browse");
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
      <h2>Browse Invoices</h2>
      <span class="close">&times;</span>
    </div>
    <div class="browser-filters">
      <div class="search-container">
        <input type="text" id="invoice-search" placeholder="Search by customer name, ID...">
        <button id="search-invoices-btn" class="btn secondary-btn">Search</button>
      </div>
      <div class="date-filters">
        <div class="form-group">
          <label for="date-from">From</label>
          <input type="date" id="date-from">
        </div>
        <div class="form-group">
          <label for="date-to">To</label>
          <input type="date" id="date-to">
        </div>
        <button id="apply-date-filter" class="btn secondary-btn">Apply Filter</button>
        <button id="reset-filters" class="btn secondary-btn">Reset</button>
      </div>
    </div>
  `;

  // Create table for invoices
  const tableHTML = `
    <div class="browser-table-container">
      <table id="invoices-table" class="browser-table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Action</th>
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
    return '<tr><td colspan="6" class="no-data">No invoices found</td></tr>';
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
        <td>${invoice.customer || "Guest"}</td>
        <td>${itemCount}</td>
        <td>$${Math.abs(invoice.total).toFixed(2)}${
        isRefund ? " (Refund)" : ""
      }</td>
        <td>
          <button class="btn secondary-btn view-invoice-btn" data-index="${index}">View</button>
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
      return "Invalid date";
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
      return "Invalid date format";
    }
  }

  return "Invalid date";
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
    .invoice-nav {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 20px;
    }
    
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
