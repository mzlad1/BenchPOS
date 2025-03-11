// Global variables
let products = [];
let editingProductId = null;
let isOnline = false;
let currentPage = 1;
const pageSize = 10; // Number of products per page
let totalPages = 1;
let selectedProductIds = [];
// Add this to your renderer JS files (e.g., inventory.js, billing.js)

// Create or find sync status element
// let syncStatusEl = document.getElementById("sync-status");
// if (!syncStatusEl) {
//   syncStatusEl = document.createElement("div");
//   syncStatusEl.id = "sync-status";
//   syncStatusEl.classList.add("sync-status");
//   document.body.appendChild(syncStatusEl);
// }

// // Listen for sync events
// window.api.onBackgroundSyncStarted(() => {
//   syncStatusEl.textContent = "Syncing data...";
//   syncStatusEl.classList.remove("hidden", "success", "error");
//   syncStatusEl.classList.add("active");
// });

// window.api.onBackgroundSyncCompleted((data) => {
//   if (data.success) {
//     syncStatusEl.textContent = `Sync completed at ${new Date(
//       data.timestamp
//     ).toLocaleTimeString()}`;
//     syncStatusEl.classList.remove("active", "error");
//     syncStatusEl.classList.add("success");

//     // Hide after a few seconds
//     setTimeout(() => {
//       syncStatusEl.classList.add("hidden");
//     }, 3000);
//   } else {
//     syncStatusEl.textContent = "Sync failed. Will retry later.";
//     syncStatusEl.classList.remove("active", "success");
//     syncStatusEl.classList.add("error");
//   }
// });
// window.api.onBackgroundSyncStarted(() => {
//   // Show sync indicator (small spinner in corner of screen)
//   const syncIndicator =
//     document.getElementById("sync-indicator") || document.createElement("div");

//   syncIndicator.id = "sync-indicator";
//   syncIndicator.innerHTML = `
//     <div class="spinner"></div>
//     <div class="sync-text">Syncing data...</div>
//   `;

//   if (!syncIndicator.parentNode) {
//     syncIndicator.style.position = "fixed";
//     syncIndicator.style.bottom = "10px";
//     syncIndicator.style.right = "10px";
//     syncIndicator.style.background = "rgba(0,0,0,0.7)";
//     syncIndicator.style.color = "white";
//     syncIndicator.style.padding = "8px 12px";
//     syncIndicator.style.borderRadius = "4px";
//     syncIndicator.style.fontSize = "12px";
//     syncIndicator.style.zIndex = "9999";
//     document.body.appendChild(syncIndicator);
//   }
// });

// window.api.onBackgroundSyncCompleted((data) => {
//   // Update or hide the indicator when sync completes
//   const syncIndicator = document.getElementById("sync-indicator");
//   if (syncIndicator) {
//     if (data.success) {
//       syncIndicator.innerHTML = `<div class="sync-text">Sync completed ✓</div>`;
//       setTimeout(() => {
//         syncIndicator.style.opacity = "0";
//         setTimeout(() => {
//           if (syncIndicator.parentNode) {
//             syncIndicator.parentNode.removeChild(syncIndicator);
//           }
//         }, 300);
//       }, 2000);
//     } else {
//       syncIndicator.innerHTML = `<div class="sync-text">Sync failed ✗</div>`;
//     }
//   }
// });

// window.api.onBackgroundSyncProgress((data) => {
//   syncStatusEl.textContent = `Syncing ${data.collection}: ${data.processed}/${data.total}`;
// });
// DOM Elements
document.addEventListener("DOMContentLoaded", () => {
  // Initialize page
  initPage();
  if (typeof window.initSyncUI === "function") {
    window.initSyncUI();
  }
  // Event listeners
  document
    .getElementById("add-product-form")
    .addEventListener("submit", handleAddProduct);
  document.getElementById("add-new-btn").addEventListener("click", () => {
    document.getElementById("product-form-title").textContent =
      "Add New Product";
    document.getElementById("add-product-form").reset();
    document.getElementById("product-modal").style.display = "block";
    editingProductId = null;
  });

  document.querySelector(".close").addEventListener("click", () => {
    document.getElementById("product-modal").style.display = "none";
  });

  document
    .getElementById("product-search")
    .addEventListener("input", filterProducts);

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === document.getElementById("product-modal")) {
      document.getElementById("product-modal").style.display = "none";
    }
  });
});

// Initialize the page
async function initPage() {
  const hasPermission = await checkPermission();
  if (!hasPermission) return;

  // Make sure elements exist before trying to use them
  const dateElement = document.getElementById("current-date");
  if (dateElement) {
    const today = new Date();
    dateElement.textContent = today.toLocaleDateString();
  }

  // Check online status
  await checkConnectionStatus();

  // Setup components in a safe order
  // Try/catch each setup to prevent one failure from breaking everything
  try {
    enhanceSearchBar();
  } catch (e) {
    console.error("Error setting up search bar:", e);
  }

  try {
    setupBulkActionsToolbar();
  } catch (e) {
    console.error("Error setting up bulk actions:", e);
  }

  try {
    setupExportImportButtons();
  } catch (e) {
    console.error("Error setting up export/import:", e);
  }

  // Load products last - this way the UI is ready
  await loadProducts();
}

// Check connection status
async function checkConnectionStatus() {
  try {
    if (window.api && typeof window.api.getOnlineStatus === "function") {
      isOnline = await window.api.getOnlineStatus();
    } else {
      isOnline = navigator.onLine;
    }
    updateConnectionUI(isOnline);
  } catch (error) {
    console.error("Error checking online status:", error);
    isOnline = navigator.onLine;
    updateConnectionUI(isOnline);
  }
}

// Update UI based on connection status
function updateConnectionUI(online) {
  const indicator = document.getElementById("connection-indicator");
  const statusText = document.getElementById("connection-text");

  if (online) {
    indicator.classList.remove("offline");
    indicator.classList.add("online");
    statusText.textContent = "Online Mode";
  } else {
    indicator.classList.remove("online");
    indicator.classList.add("offline");
    statusText.textContent = "Offline Mode";
  }
}

// Sync data with server (when coming back online)
async function syncData() {
  try {
    console.log("Syncing inventory data with cloud...");
    const result = await window.api.syncData();
    console.log("Sync result:", result);

    if (result) {
      // Reload products after sync
      await loadProducts();
      console.log("Products reloaded after sync");
    }
  } catch (error) {
    console.error("Error syncing data:", error);
  }
}

// Load products from database
async function loadProducts() {
  try {
    console.log("Loading products...");
    products = await window.api.getProducts();
    console.log(`Loaded ${products ? products.length : 0} products`);

    // Make sure products is always an array, even if the API returns null
    if (!products || !Array.isArray(products)) {
      console.warn(
        "Products is null or not an array, initializing empty array"
      );
      products = [];
    }

    renderProducts(products);
    updateProductStats();
  } catch (error) {
    console.error("Error loading products:", error);
    document.getElementById("products-table-body").innerHTML =
      '<tr><td colspan="9">Failed to load products. Please try again.</td></tr>';
    // Initialize empty products array to prevent further errors
    products = [];
  }
}

// Render products to the table
function renderProducts(productsToRender) {
  const tableBody = document.getElementById("products-table-body");
  tableBody.innerHTML = "";

  // Get search element safely (handling case where it might not exist yet)
  const searchElement = document.getElementById("product-search");
  const searchTerm = searchElement
    ? searchElement.value.toLowerCase().trim()
    : "";

  // Get filter element safely
  const filterElement = document.getElementById("search-filter");
  const filterField = filterElement ? filterElement.value : "all";

  if (!productsToRender || productsToRender.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="9">No products found</td></tr>';
    // Reset pagination when no products
    currentPage = 1;
    setupPagination();
    return;
  }

  // Calculate pagination
  totalPages = Math.ceil(productsToRender.length / pageSize);
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  // Get current page products
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, productsToRender.length);
  const currentPageProducts = productsToRender.slice(startIndex, endIndex);

  // Render the current page products
  currentPageProducts.forEach((product) => {
    const row = document.createElement("tr");

    // Determine stock status class
    let stockStatusClass = "";
    if (product.stock <= 5) {
      stockStatusClass = "low-stock";
    } else if (product.stock <= 15) {
      stockStatusClass = "medium-stock";
    }

    // Add checkbox cell
    const checkboxCell = document.createElement("td");
    checkboxCell.className = "checkbox-cell";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "product-select";
    checkbox.dataset.id = product.id;
    checkbox.checked = selectedProductIds.includes(product.id);
    checkboxCell.appendChild(checkbox);
    row.appendChild(checkboxCell);

    // Highlight search terms based on filter field
    let skuText = product.sku || "N/A";
    let nameText = product.name;
    let categoryText = product.category || "Uncategorized";

    if (searchTerm) {
      if (filterField === "all" || filterField === "sku") {
        skuText = highlightSearchTerms(skuText, searchTerm);
      }
      if (filterField === "all" || filterField === "name") {
        nameText = highlightSearchTerms(nameText, searchTerm);
      }
      if (filterField === "all" || filterField === "category") {
        categoryText = highlightSearchTerms(categoryText, searchTerm);
      }
    }

    // Add the rest of the row content with highlighted text
    row.innerHTML += `
      <td>${skuText}</td>
      <td>${nameText}</td>
      <td>${categoryText}</td>
      <td>$${product.price.toFixed(2)}</td>
      <td>$${product.cost ? product.cost.toFixed(2) : "0.00"}</td>
      <td>$${calculateProfit(product).toFixed(2)}</td>
      <td class="${stockStatusClass}">${product.stock}</td>
      <td>
        <button class="btn edit-btn" data-id="${product.id}">Edit</button>
        <button class="btn delete-btn" data-id="${product.id}">Delete</button>
      </td>
    `;

    tableBody.appendChild(row);
  });

  // Set up checkbox event listeners
  document.querySelectorAll(".product-select").forEach((checkbox) => {
    checkbox.addEventListener("change", function () {
      const productId = this.dataset.id;

      if (this.checked && !selectedProductIds.includes(productId)) {
        selectedProductIds.push(productId);
      } else if (!this.checked && selectedProductIds.includes(productId)) {
        selectedProductIds = selectedProductIds.filter(
          (id) => id !== productId
        );
      }

      // Update UI based on selection
      updateBulkActionsUI();
    });
  });

  // Setup pagination controls
  setupPagination();

  // Add event listeners to edit and delete buttons
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", handleEditProduct);
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", handleDeleteProduct);
  });

  // Reset select all checkbox state
  const selectAllCheckbox = document.getElementById("select-all-checkbox");
  if (selectAllCheckbox) {
    const allSelected =
      currentPageProducts.length > 0 &&
      currentPageProducts.every((p) => selectedProductIds.includes(p.id));
    selectAllCheckbox.checked = allSelected;
    selectAllCheckbox.indeterminate =
      !allSelected &&
      currentPageProducts.some((p) => selectedProductIds.includes(p.id));
  }

  // Update bulk actions UI
  updateBulkActionsUI();
}

// Add this function to update the bulk actions UI based on selection
function updateBulkActionsUI() {
  const selectedCount = document.getElementById("selected-count");
  const bulkActionSelect = document.getElementById("bulk-action-select");
  const applyButton = document.getElementById("apply-bulk-action");
  const bulkActionsContainer = document.getElementById(
    "bulk-actions-container"
  );

  if (selectedCount) {
    selectedCount.textContent = `${selectedProductIds.length} item${
      selectedProductIds.length !== 1 ? "s" : ""
    } selected`;
  }

  if (bulkActionSelect) {
    bulkActionSelect.disabled = selectedProductIds.length === 0;
  }

  if (applyButton) {
    applyButton.disabled =
      selectedProductIds.length === 0 || !bulkActionSelect.value;
  }

  // Show/hide the bulk actions container based on selection
  if (bulkActionsContainer) {
    if (selectedProductIds.length > 0) {
      bulkActionsContainer.classList.add("active");
    } else {
      bulkActionsContainer.classList.remove("active");
    }
  }
}

// Add this function to render the current page
function renderCurrentPage() {
  // If filtering is active, use filtered products, otherwise use all products
  const searchTerm = document
    .getElementById("product-search")
    .value.toLowerCase();

  if (!searchTerm) {
    renderProducts(products);
  } else {
    const filteredProducts = products.filter(
      (product) =>
        (product.name && product.name.toLowerCase().includes(searchTerm)) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm)) ||
        (product.category &&
          product.category.toLowerCase().includes(searchTerm))
    );
    renderProducts(filteredProducts);
  }
}

// Filter products based on search input
function filterProducts() {
  currentPage = 1; // Reset to first page when filtering
  const searchTerm = document
    .getElementById("product-search")
    .value.toLowerCase();

  if (!searchTerm) {
    renderProducts(products);
    return;
  }

  const filteredProducts = products.filter(
    (product) =>
      (product.name && product.name.toLowerCase().includes(searchTerm)) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm)) ||
      (product.category && product.category.toLowerCase().includes(searchTerm))
  );

  renderProducts(filteredProducts);
}

// Handle add/edit product form submission
async function handleAddProduct(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  // Validate form data
  const name = formData.get("product-name");
  if (!name || name.trim() === "") {
    alert("Product name is required");
    return;
  }

  const priceStr = formData.get("product-price");
  const costStr = formData.get("product-cost");
  const stockStr = formData.get("product-stock");

  const price = parseFloat(priceStr);
  const cost = parseFloat(costStr);
  const stock = parseInt(stockStr);

  if (isNaN(price) || price < 0) {
    alert("Please enter a valid price");
    return;
  }

  if (isNaN(cost) || cost < 0) {
    alert("Please enter a valid cost");
    return;
  }

  if (isNaN(stock) || stock < 0) {
    alert("Please enter a valid stock quantity");
    return;
  }

  const productData = {
    name: name.trim(),
    sku: formData.get("product-sku"),
    category: formData.get("product-category"),
    price: price,
    cost: cost,
    stock: stock,
  };

  try {
    console.log("Saving product data:", productData);

    if (editingProductId) {
      // Update existing product
      console.log(`Updating product with ID: ${editingProductId}`);
      await window.api.updateProduct({
        ...productData,
        id: editingProductId,
      });

      // Update local products array
      const index = products.findIndex((p) => p.id === editingProductId);
      if (index !== -1) {
        products[index] = {
          ...products[index],
          ...productData,
        };
      }

      alert("Product updated successfully!");
    } else {
      // Add new product
      console.log("Adding new product");
      const newProductId = await window.api.addProduct(productData);
      console.log(`New product added with ID: ${newProductId}`);

      // Add to local products array
      products.push({
        ...productData,
        id: newProductId,
      });

      alert("Product added successfully!");
    }

    // Reset form and close modal
    form.reset();
    document.getElementById("product-modal").style.display = "none";

    // Re-render products
    renderProducts(products);
    updateProductStats();

    // If we're online, try to sync immediately
    if (isOnline && window.api.syncData) {
      console.log("Online - syncing data after product save");
      syncData();
    }
  } catch (error) {
    console.error("Error saving product:", error);
    alert("Failed to save product. Please try again.");
  }
}

// Handle edit product button click
function handleEditProduct(event) {
  const productId = event.target.dataset.id;
  const product = products.find((p) => p.id === productId);

  if (!product) return;

  // Set form values
  const form = document.getElementById("add-product-form");
  form.elements["product-name"].value = product.name || "";
  form.elements["product-sku"].value = product.sku || "";
  form.elements["product-category"].value = product.category || "";
  form.elements["product-price"].value = product.price || "";
  form.elements["product-cost"].value = product.cost || "";
  form.elements["product-stock"].value = product.stock || "";

  // Set editing mode
  editingProductId = productId;
  document.getElementById("product-form-title").textContent = "Edit Product";

  // Show modal
  document.getElementById("product-modal").style.display = "block";
}

// Handle delete product button click
async function handleDeleteProduct(event) {
  if (!confirm("Are you sure you want to delete this product?")) return;

  const productId = event.target.dataset.id;

  try {
    console.log(`Deleting product with ID: ${productId}`);
    await window.api.deleteProduct(productId);
    console.log("Product deleted successfully");

    // Remove from local products array
    products = products.filter((p) => p.id !== productId);

    // Re-render products
    renderProducts(products);
    updateProductStats();

    // If we're online, try to sync immediately
    if (isOnline && window.api.syncData) {
      console.log("Online - syncing data after product delete");
      syncData();
    }

    alert("Product deleted successfully!");
  } catch (error) {
    console.error("Error deleting product:", error);
    alert("Failed to delete product. Please try again.");
  }
}
function initMultiUserFeatures() {
  const userBadgeContainer = document.createElement("div");
  userBadgeContainer.className = "active-users";
  document.querySelector(".header-right").prepend(userBadgeContainer);

  // Set up the current user
  const currentUser = {
    id: localStorage.getItem("user_id") || `user_${Date.now()}`,
    name:
      prompt("Enter your name for this session:") ||
      "User " + Math.floor(Math.random() * 1000),
    device:
      localStorage.getItem("device_name") ||
      "Device " + Math.floor(Math.random() * 100),
  };

  window.api.setCurrentUser(currentUser);

  // Subscribe to active users
  if (window.api.subscribeToUpdates) {
    window.api.subscribeToUpdates("active_users", (changes) => {
      updateActiveUsersList(changes);
    });

    // Add self to active users
    window.api.addActiveUser(currentUser);

    // Set up heartbeat interval
    setInterval(() => window.api.updateUserHeartbeat(), 30000);
  }
}

// Add this to billing.js, inventory.js, reports.js files
async function checkPermission() {
  try {
    const user = await window.api.getCurrentUser();
    if (!user) {
      // Not logged in - redirect to login
      window.location.href = "login.html";
      return false;
    }

    const userNameElement = document.getElementById("current-user-name");
    if (userNameElement) {
      userNameElement.textContent = user.name || "User";
    }

    // Check role-based permissions
    if (window.location.pathname.includes("billing.html")) {
      // All roles can access billing (new sales)
      return true;
    } else if (window.location.pathname.includes("inventory.html")) {
      // Only managers and admins can access inventory
      if (user.role === "cashier") {
        alert("You don't have permission to access the inventory page.");
        window.location.href = "billing.html"; // Redirect cashiers to billing
        return false;
      }
    } else if (window.location.pathname.includes("reports.html")) {
      // Only admins can access reports
      if (user.role !== "admin") {
        alert("You don't have permission to access the reports page.");
        window.location.href = "billing.html"; // Redirect to billing
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Permission check error:", error);
    window.location.href = "login.html";
    return false;
  }
}
// Calculate profit for a product
function calculateProfit(product) {
  if (!product.cost || product.cost <= 0) {
    return product.price || 0;
  }
  return (product.price || 0) - (product.cost || 0);
}

// Update product statistics
function updateProductStats() {
  const totalProducts = products.length;
  const totalValue = products.reduce(
    (sum, product) => sum + product.price * product.stock,
    0
  );
  const lowStockCount = products.filter((product) => product.stock <= 5).length;

  document.getElementById("total-products").textContent = totalProducts;
  document.getElementById(
    "inventory-value"
  ).textContent = `$${totalValue.toFixed(2)}`;
  document.getElementById("low-stock-count").textContent = lowStockCount;
}
// Add this function to implement pagination
function setupPagination() {
  // Calculate total pages
  totalPages = Math.ceil(products.length / pageSize);

  // Get pagination container (or create it if it doesn't exist)
  let paginationContainer = document.getElementById("pagination-container");
  if (!paginationContainer) {
    paginationContainer = document.createElement("div");
    paginationContainer.id = "pagination-container";
    paginationContainer.className = "pagination";

    // Add it after the table-container
    const tableContainer = document.querySelector(".table-container");
    tableContainer.parentNode.insertBefore(
      paginationContainer,
      tableContainer.nextSibling
    );
  }

  // Clear any existing pagination controls
  paginationContainer.innerHTML = "";

  // Create pagination controls
  const paginationControls = document.createElement("div");
  paginationControls.className = "pagination-controls";

  // Previous button
  const prevButton = document.createElement("button");
  prevButton.className = "btn pagination-btn";
  prevButton.textContent = "« Previous";
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderCurrentPage();
    }
  });

  // Next button
  const nextButton = document.createElement("button");
  nextButton.className = "btn pagination-btn";
  nextButton.textContent = "Next »";
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderCurrentPage();
    }
  });

  // Page info
  const pageInfo = document.createElement("span");
  pageInfo.className = "page-info";
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

  // Add page selector for larger data sets
  const pageSelector = document.createElement("select");
  pageSelector.className = "page-selector";
  pageSelector.addEventListener("change", (e) => {
    currentPage = parseInt(e.target.value);
    renderCurrentPage();
  });

  for (let i = 1; i <= totalPages; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `Page ${i}`;
    option.selected = i === currentPage;
    pageSelector.appendChild(option);
  }

  // Assemble pagination controls
  paginationControls.appendChild(prevButton);
  paginationControls.appendChild(pageInfo);
  if (totalPages > 2) {
    paginationControls.appendChild(pageSelector);
  }
  paginationControls.appendChild(nextButton);

  paginationContainer.appendChild(paginationControls);
}
function setupBulkActionsToolbar() {
  // Get the actions area or create it if it doesn't exist
  let bulkActionsContainer = document.querySelector(".bulk-actions-container");
  if (!bulkActionsContainer) {
    // Create container for bulk actions
    bulkActionsContainer = document.createElement("div");
    bulkActionsContainer.className = "bulk-actions-container";

    // Add it to the inventory actions area
    const inventoryActions = document.querySelector(".inventory-actions");
    inventoryActions.appendChild(bulkActionsContainer);
  }

  // Clear existing content
  bulkActionsContainer.innerHTML = "";

  // Create bulk actions toolbar
  bulkActionsContainer.innerHTML = `
    <div class="bulk-actions" id="bulk-actions">
      <span id="selected-count">0 items selected</span>
      <select id="bulk-action-select" disabled>
        <option value="">-- Select Action --</option>
        <option value="delete">Delete Selected</option>
        <option value="category">Change Category</option>
        <option value="stock">Update Stock</option>
      </select>
      <button id="apply-bulk-action" class="btn" disabled>Apply</button>
    </div>
  `;

  // Add event listeners for bulk actions
  document
    .getElementById("bulk-action-select")
    .addEventListener("change", function () {
      const applyButton = document.getElementById("apply-bulk-action");
      applyButton.disabled = !this.value;
    });

  document
    .getElementById("apply-bulk-action")
    .addEventListener("click", handleBulkAction);
}

// Add this function to handle bulk actions
async function handleBulkAction() {
  const action = document.getElementById("bulk-action-select").value;
  if (!action || selectedProductIds.length === 0) return;

  switch (action) {
    case "delete":
      if (
        confirm(
          `Are you sure you want to delete ${selectedProductIds.length} products?`
        )
      ) {
        await bulkDeleteProducts();
      }
      break;
    case "category":
      showCategoryChangeModal();
      break;
    case "stock":
      showStockUpdateModal();
      break;
  }
}

// Add this function to bulk delete products
async function bulkDeleteProducts() {
  try {
    // Show loading indicator
    const applyButton = document.getElementById("apply-bulk-action");
    const originalText = applyButton.textContent;
    applyButton.textContent = "Deleting...";
    applyButton.disabled = true;

    // Delete each product
    for (const productId of selectedProductIds) {
      await window.api.deleteProduct(productId);
    }

    // Update the products array
    products = products.filter((p) => !selectedProductIds.includes(p.id));

    // Clear selection and render products
    selectedProductIds = [];
    currentPage = 1; // Reset to first page
    renderProducts(products);
    updateProductStats();

    // Reset the bulk actions
    document.getElementById("bulk-action-select").value = "";
    applyButton.disabled = true;
    applyButton.textContent = originalText;

    // If we're online, try to sync
    if (isOnline && window.api.syncData) {
      syncData();
    }

    alert(`Successfully deleted ${selectedProductIds.length} products.`);
  } catch (error) {
    console.error("Error in bulk delete:", error);
    alert("An error occurred while deleting products.");
  }
}

// Add this function to show the category change modal
function showCategoryChangeModal() {
  // Get unique categories from products
  const categories = [
    ...new Set(products.map((p) => p.category || "Uncategorized")),
  ];

  // Create or get the modal
  let modal = document.getElementById("category-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "category-modal";
    modal.className = "modal";
    document.body.appendChild(modal);
  }

  // Set the modal content
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Change Category</h2>
        <span class="close">&times;</span>
      </div>
      <div class="modal-body">
        <p>Select a new category for ${selectedProductIds.length} products:</p>
        <div class="form-group">
          <select id="new-category">
            ${categories
              .map((cat) => `<option value="${cat}">${cat}</option>`)
              .join("")}
            <option value="new">+ Add New Category</option>
          </select>
        </div>
        <div id="new-category-input" class="form-group" style="display:none;">
          <input type="text" id="new-category-name" placeholder="Enter new category name">
        </div>
        <div class="form-actions">
          <button type="button" class="btn secondary-btn" id="cancel-category">Cancel</button>
          <button type="button" class="btn primary-btn" id="save-category">Apply</button>
        </div>
      </div>
    </div>
  `;

  // Show the modal
  modal.style.display = "block";

  // Set up event listeners
  document
    .querySelector("#category-modal .close")
    .addEventListener("click", () => {
      modal.style.display = "none";
    });

  document.getElementById("cancel-category").addEventListener("click", () => {
    modal.style.display = "none";
  });

  document.getElementById("new-category").addEventListener("change", (e) => {
    const newCategoryInput = document.getElementById("new-category-input");
    if (e.target.value === "new") {
      newCategoryInput.style.display = "block";
    } else {
      newCategoryInput.style.display = "none";
    }
  });

  document
    .getElementById("save-category")
    .addEventListener("click", async () => {
      let newCategory = document.getElementById("new-category").value;
      if (newCategory === "new") {
        newCategory = document.getElementById("new-category-name").value.trim();
        if (!newCategory) {
          alert("Please enter a category name");
          return;
        }
      }

      try {
        // Show loading state
        const saveButton = document.getElementById("save-category");
        saveButton.textContent = "Updating...";
        saveButton.disabled = true;

        // Update each product
        for (const productId of selectedProductIds) {
          const product = products.find((p) => p.id === productId);
          if (product) {
            await window.api.updateProduct({
              ...product,
              category: newCategory,
            });

            // Update in local array
            product.category = newCategory;
          }
        }

        // Close modal
        modal.style.display = "none";

        // Re-render products
        renderProducts(products);

        // If we're online, try to sync
        if (isOnline && window.api.syncData) {
          syncData();
        }

        alert(
          `Successfully updated category for ${selectedProductIds.length} products.`
        );
      } catch (error) {
        console.error("Error updating categories:", error);
        alert("An error occurred while updating categories.");
      }
    });

  // Close if clicked outside
  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
}

// Add this function to show the stock update modal
function showStockUpdateModal() {
  // Create or get the modal
  let modal = document.getElementById("stock-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "stock-modal";
    modal.className = "modal";
    document.body.appendChild(modal);
  }

  // Set the modal content
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Update Stock</h2>
        <span class="close">&times;</span>
      </div>
      <div class="modal-body">
        <p>Update stock for ${selectedProductIds.length} products:</p>
        <div class="form-group">
          <label>Update Method:</label>
          <select id="stock-update-method">
            <option value="set">Set to value</option>
            <option value="add">Add to current stock</option>
            <option value="subtract">Subtract from current stock</option>
          </select>
        </div>
        <div class="form-group">
          <label>Value:</label>
          <input type="number" id="stock-value" min="0" value="0">
        </div>
        <div class="form-actions">
          <button type="button" class="btn secondary-btn" id="cancel-stock">Cancel</button>
          <button type="button" class="btn primary-btn" id="save-stock">Apply</button>
        </div>
      </div>
    </div>
  `;

  // Show the modal
  modal.style.display = "block";

  // Set up event listeners
  document
    .querySelector("#stock-modal .close")
    .addEventListener("click", () => {
      modal.style.display = "none";
    });

  document.getElementById("cancel-stock").addEventListener("click", () => {
    modal.style.display = "none";
  });

  document.getElementById("save-stock").addEventListener("click", async () => {
    const method = document.getElementById("stock-update-method").value;
    const value = parseInt(document.getElementById("stock-value").value) || 0;

    if (value < 0) {
      alert("Please enter a non-negative value");
      return;
    }

    try {
      // Show loading state
      const saveButton = document.getElementById("save-stock");
      saveButton.textContent = "Updating...";
      saveButton.disabled = true;

      // Update each product
      for (const productId of selectedProductIds) {
        const product = products.find((p) => p.id === productId);
        if (product) {
          let newStock = product.stock;

          switch (method) {
            case "set":
              newStock = value;
              break;
            case "add":
              newStock += value;
              break;
            case "subtract":
              newStock = Math.max(0, newStock - value);
              break;
          }

          await window.api.updateProduct({
            ...product,
            stock: newStock,
          });

          // Update in local array
          product.stock = newStock;
        }
      }

      // Close modal
      modal.style.display = "none";

      // Re-render products
      renderProducts(products);
      updateProductStats();

      // If we're online, try to sync
      if (isOnline && window.api.syncData) {
        syncData();
      }

      alert(
        `Successfully updated stock for ${selectedProductIds.length} products.`
      );
    } catch (error) {
      console.error("Error updating stock:", error);
      alert("An error occurred while updating stock.");
    }
  });

  // Close if clicked outside
  window.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  });
}
function setupExportImportButtons() {
  // Add event listeners to the export and import buttons
  const exportButton = document.getElementById("export-csv-btn");
  const importButton = document.getElementById("import-csv-btn");

  if (exportButton) {
    exportButton.addEventListener("click", exportProductsToCSV);
  }

  if (importButton) {
    importButton.addEventListener("click", showImportModal);
  }
}

// Function to export products to CSV
function exportProductsToCSV() {
  try {
    // Create CSV content
    let csvContent = "id,sku,name,category,price,cost,stock\n";

    // Add data rows
    products.forEach((product) => {
      // Escape fields with commas
      const formatCSVField = (field) => {
        if (field === null || field === undefined) return "";
        const stringField = String(field);
        return stringField.includes(",") ? `"${stringField}"` : stringField;
      };

      csvContent +=
        [
          formatCSVField(product.id),
          formatCSVField(product.sku),
          formatCSVField(product.name),
          formatCSVField(product.category),
          formatCSVField(product.price),
          formatCSVField(product.cost),
          formatCSVField(product.stock),
        ].join(",") + "\n";
    });

    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    link.style.visibility = "hidden";

    // Append to document, trigger download and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show success message
    alert(`Exported ${products.length} products to CSV successfully!`);
  } catch (error) {
    console.error("Error exporting to CSV:", error);
    alert("Error exporting to CSV. Please try again.");
  }
}

// Function to show import modal
function showImportModal() {
  // Create modal if it doesn't exist
  let importModal = document.getElementById("import-modal");
  if (!importModal) {
    importModal = document.createElement("div");
    importModal.id = "import-modal";
    importModal.className = "modal";
    document.body.appendChild(importModal);
  }

  // Set modal content
  importModal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Import Products from CSV</h2>
        <span class="close">&times;</span>
      </div>
      <div class="modal-body">
        <div class="import-instructions">
          <p>Upload a CSV file with the following columns:</p>
          <p><code>id,sku,name,category,price,cost,stock</code></p>
          <p>Leave the id column blank for new products.</p>
        </div>
        <div class="form-group">
          <label for="csv-file">Select CSV File:</label>
          <input type="file" id="csv-file" accept=".csv" />
        </div>
        <div class="import-options">
          <div class="form-group">
            <label>
              <input type="checkbox" id="override-existing" checked />
              Update existing products (matched by ID or SKU)
            </label>
          </div>
          <div class="form-group">
            <label>
              <input type="checkbox" id="add-new-products" checked />
              Add new products
            </label>
          </div>
        </div>
        <div id="csv-preview" class="csv-preview">
          <h3>Preview:</h3>
          <div id="preview-content"></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn secondary-btn" id="cancel-import">Cancel</button>
          <button type="button" class="btn primary-btn" id="process-import" disabled>Import Products</button>
        </div>
      </div>
    </div>
  `;

  // Show modal
  importModal.style.display = "block";

  // Set up event listeners
  document
    .querySelector("#import-modal .close")
    .addEventListener("click", () => {
      importModal.style.display = "none";
    });

  document.getElementById("cancel-import").addEventListener("click", () => {
    importModal.style.display = "none";
  });

  // Handle file selection and preview
  document
    .getElementById("csv-file")
    .addEventListener("change", handleFileSelect);

  // Close if clicked outside
  window.addEventListener("click", (event) => {
    if (event.target === importModal) {
      importModal.style.display = "none";
    }
  });
}

// Handle CSV file selection
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) {
    document.getElementById("process-import").disabled = true;
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const csvData = e.target.result;
      previewCSVData(csvData);

      // Enable import button
      document.getElementById("process-import").disabled = false;

      // Add event listener for import button
      document
        .getElementById("process-import")
        .addEventListener("click", () => {
          processCSVImport(csvData);
        });
    } catch (error) {
      console.error("Error reading CSV:", error);
      alert("Error reading CSV file. Please check the file format.");
      document.getElementById("process-import").disabled = true;
    }
  };

  reader.readAsText(file);
}

// Preview CSV data in the modal
function previewCSVData(csvData) {
  const previewEl = document.getElementById("preview-content");
  const lines = csvData.split("\n");

  // Get header row
  const headers = lines[0].split(",");

  // Create preview table
  let tableHTML = '<table class="preview-table"><thead><tr>';

  // Add headers
  headers.forEach((header) => {
    tableHTML += `<th>${header.trim()}</th>`;
  });
  tableHTML += "</tr></thead><tbody>";

  // Add up to 5 rows of data
  const maxPreviewRows = Math.min(lines.length - 1, 5);
  for (let i = 1; i <= maxPreviewRows; i++) {
    if (lines[i].trim()) {
      tableHTML += "<tr>";
      const cells = parseCSVLine(lines[i]);
      cells.forEach((cell) => {
        tableHTML += `<td>${cell}</td>`;
      });
      tableHTML += "</tr>";
    }
  }

  tableHTML += "</tbody></table>";

  // Show total rows
  const totalDataRows = lines.filter(
    (line, index) => index > 0 && line.trim()
  ).length;
  tableHTML += `<p>Total rows: ${totalDataRows}</p>`;

  previewEl.innerHTML = tableHTML;
}

// Parse a CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let startPos = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === "," && !inQuotes) {
      result.push(line.substring(startPos, i).replace(/^"|"$/g, ""));
      startPos = i + 1;
    }
  }

  // Add the last field
  result.push(line.substring(startPos).replace(/^"|"$/g, ""));

  return result;
}

// Process CSV import
async function processCSVImport(csvData) {
  try {
    const lines = csvData.split("\n");
    const headers = lines[0].toLowerCase().split(",");

    // Validate headers
    const requiredHeaders = ["name", "price", "stock"];
    const headerIndexes = {};

    // Get index of each header
    headers.forEach((header, index) => {
      headerIndexes[header.trim()] = index;
    });

    // Check required headers
    const missingHeaders = requiredHeaders.filter(
      (header) => !(header in headerIndexes)
    );
    if (missingHeaders.length > 0) {
      alert(`Missing required columns: ${missingHeaders.join(", ")}`);
      return;
    }

    // Get import options
    const updateExisting = document.getElementById("override-existing").checked;
    const addNew = document.getElementById("add-new-products").checked;

    // Process data
    const processButton = document.getElementById("process-import");
    processButton.textContent = "Importing...";
    processButton.disabled = true;

    let addedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);

      // Create product object from values
      const product = {};
      headers.forEach((header, index) => {
        const value = values[index]?.trim() || "";

        switch (header.trim()) {
          case "id":
            if (value) product.id = value;
            break;
          case "sku":
            product.sku = value;
            break;
          case "name":
            product.name = value;
            break;
          case "category":
            product.category = value;
            break;
          case "price":
            product.price = parseFloat(value) || 0;
            break;
          case "cost":
            product.cost = parseFloat(value) || 0;
            break;
          case "stock":
            product.stock = parseInt(value) || 0;
            break;
        }
      });

      // Skip if name is missing
      if (!product.name) {
        errorCount++;
        continue;
      }

      try {
        // Check if product exists (by ID or SKU)
        let existingProduct = null;

        if (product.id) {
          existingProduct = products.find((p) => p.id === product.id);
        } else if (product.sku) {
          existingProduct = products.find((p) => p.sku === product.sku);
        }

        if (existingProduct && updateExisting) {
          // Update existing product
          await window.api.updateProduct({
            ...existingProduct,
            ...product,
            id: existingProduct.id,
          });

          // Update local array
          const index = products.findIndex((p) => p.id === existingProduct.id);
          products[index] = {
            ...existingProduct,
            ...product,
            id: existingProduct.id,
          };

          updatedCount++;
        } else if (!existingProduct && addNew) {
          // Add new product
          const newId = await window.api.addProduct(product);

          // Add to local array
          products.push({
            ...product,
            id: newId,
          });

          addedCount++;
        }
      } catch (error) {
        console.error("Error processing product:", error, product);
        errorCount++;
      }
    }

    // Close modal
    document.getElementById("import-modal").style.display = "none";

    // Re-render products
    renderProducts(products);
    updateProductStats();

    // If we're online, try to sync
    if (isOnline && window.api.syncData) {
      syncData();
    }

    // Show result
    alert(
      `Import complete:\n- Added: ${addedCount}\n- Updated: ${updatedCount}\n- Errors: ${errorCount}`
    );
  } catch (error) {
    console.error("Error importing CSV:", error);
    alert("Error importing CSV. Please try again.");
  } finally {
    // Reset button
    const processButton = document.getElementById("process-import");
    if (processButton) {
      processButton.textContent = "Import Products";
      processButton.disabled = false;
    }
  }
}
// Update the enhanceSearchBar function to find the search bar in the new HTML structure
function enhanceSearchBar() {
  // This is the updated selector that works with the new HTML structure
  const searchBarContainer = document.querySelector(
    ".search-filter-row .search-bar"
  );

  // Fallback to try other possible locations if not found
  if (!searchBarContainer) {
    console.warn(
      "Search bar container not found with primary selector, trying alternatives"
    );

    // Try alternative selectors
    const alternativeSelectors = [
      ".inventory-controls .search-bar", // Another possible location
      ".inventory-actions .search-bar", // Original location (older HTML)
      ".search-bar", // Generic fallback
      "#product-search", // Direct input element as last resort
    ];

    for (const selector of alternativeSelectors) {
      const container = document.querySelector(selector);
      if (container) {
        console.log(`Found search bar using alternative selector: ${selector}`);

        // If we found the input directly, wrap it in a div
        if (selector === "#product-search") {
          const searchInput = container;
          const wrapperDiv = document.createElement("div");
          wrapperDiv.className = "search-bar";

          // Replace the input with our wrapper
          searchInput.parentNode.insertBefore(wrapperDiv, searchInput);
          wrapperDiv.appendChild(searchInput);

          // Now use this wrapper as our container
          enhanceSearchContainer(wrapperDiv);
          return;
        }

        enhanceSearchContainer(container);
        return;
      }
    }

    console.error("Could not find search bar container with any selector");
    return;
  }

  enhanceSearchContainer(searchBarContainer);
}

// New helper function to enhance the container once found
function enhanceSearchContainer(container) {
  // Clear existing content
  container.innerHTML = "";

  // Create enhanced search bar with filter options
  container.innerHTML = `
    <div class="enhanced-search">
      <div class="search-field">
        <select id="search-filter" class="search-filter">
          <option value="all">All Fields</option>
          <option value="sku">SKU</option>
          <option value="name">Name</option>
          <option value="category">Category</option>
        </select>
        <input type="text" id="product-search" placeholder="Search products...">
        <button id="clear-search" class="clear-search" title="Clear search">×</button>
      </div>
      <div id="search-status" class="search-status"></div>
    </div>
  `;

  // Add event listeners
  document
    .getElementById("product-search")
    .addEventListener("input", enhancedFilterProducts);
  document
    .getElementById("search-filter")
    .addEventListener("change", enhancedFilterProducts);
  document
    .getElementById("clear-search")
    .addEventListener("click", clearSearch);
}

// Clear the search field and reset the product list
function clearSearch() {
  document.getElementById("product-search").value = "";
  document.getElementById("search-filter").value = "all";
  document.getElementById("search-status").textContent = "";

  // Reset to first page
  currentPage = 1;
  renderProducts(products);
}

// Enhanced filter function that respects the selected filter field
function enhancedFilterProducts() {
  const searchTerm = document
    .getElementById("product-search")
    .value.toLowerCase()
    .trim();
  const filterField = document.getElementById("search-filter").value;
  const searchStatus = document.getElementById("search-status");

  // Reset to first page when filtering
  currentPage = 1;

  if (!searchTerm) {
    searchStatus.textContent = "";
    renderProducts(products);
    return;
  }

  let filteredProducts;

  switch (filterField) {
    case "sku":
      filteredProducts = products.filter(
        (product) =>
          product.sku && product.sku.toLowerCase().includes(searchTerm)
      );
      break;
    case "name":
      filteredProducts = products.filter(
        (product) =>
          product.name && product.name.toLowerCase().includes(searchTerm)
      );
      break;
    case "category":
      filteredProducts = products.filter(
        (product) =>
          product.category &&
          product.category.toLowerCase().includes(searchTerm)
      );
      break;
    default:
      // 'all' - search all fields
      filteredProducts = products.filter(
        (product) =>
          (product.name && product.name.toLowerCase().includes(searchTerm)) ||
          (product.sku && product.sku.toLowerCase().includes(searchTerm)) ||
          (product.category &&
            product.category.toLowerCase().includes(searchTerm))
      );
  }

  // Update search status
  searchStatus.textContent = `${filteredProducts.length} product${
    filteredProducts.length !== 1 ? "s" : ""
  } found`;

  // If no products found, show a message
  if (filteredProducts.length === 0) {
    searchStatus.innerHTML =
      'No products found. <a href="#" id="reset-search">Reset search</a>';
    document.getElementById("reset-search").addEventListener("click", (e) => {
      e.preventDefault();
      clearSearch();
    });
  }

  renderProducts(filteredProducts);
}

// Highlight search terms in the product table
function highlightSearchTerms(text, searchTerm) {
  if (!searchTerm || !text) return text;

  const lcText = String(text).toLowerCase();
  const lcSearchTerm = searchTerm.toLowerCase();

  if (!lcText.includes(lcSearchTerm)) return text;

  const startIndex = lcText.indexOf(lcSearchTerm);
  const endIndex = startIndex + lcSearchTerm.length;

  return (
    text.substring(0, startIndex) +
    `<span class="highlight">${text.substring(startIndex, endIndex)}</span>` +
    text.substring(endIndex)
  );
}
