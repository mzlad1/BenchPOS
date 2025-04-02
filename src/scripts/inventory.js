// inventory.js - Inventory Management Script
// Updated to work with the component system

// Global variables
let products = [];
let editingProductId = null;
let isOnline = false;
let currentPage = 1;
const pageSize = 10; // Number of products per page
let totalPages = 1;
let selectedProductIds = [];

// DOM Elements initialization
document.addEventListener("DOMContentLoaded", () => {
  // Initialize page
  initPage();

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
  // Add this to your DOMContentLoaded event listener
  document
    .getElementById("products-table-body")
    .addEventListener("click", (event) => {
      if (event.target.classList.contains("edit-btn")) {
        handleEditProduct(event);
      } else if (event.target.classList.contains("delete-btn")) {
        handleDeleteProduct(event);
      }
    });
  document
    .getElementById("product-search")
    .addEventListener("input", filterProducts);

  document
    .getElementById("clear-search")
    .addEventListener("click", clearSearch);

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === document.getElementById("product-modal")) {
      document.getElementById("product-modal").style.display = "none";
    }

    if (event.target === document.getElementById("category-modal")) {
      document.getElementById("category-modal").style.display = "none";
    }

    if (event.target === document.getElementById("stock-modal")) {
      document.getElementById("stock-modal").style.display = "none";
    }

    if (event.target === document.getElementById("import-modal")) {
      document.getElementById("import-modal").style.display = "none";
    }
  });

  // Set up select all checkbox
  const selectAllCheckbox = document.getElementById("select-all-checkbox");
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", function () {
      const checkboxes = document.querySelectorAll(".product-select");
      checkboxes.forEach((checkbox) => {
        checkbox.checked = this.checked;
        const productId = checkbox.dataset.id;

        if (this.checked && !selectedProductIds.includes(productId)) {
          selectedProductIds.push(productId);
        } else if (!this.checked) {
          selectedProductIds = selectedProductIds.filter(
            (id) => id !== productId
          );
        }
      });

      updateBulkActionsUI();
    });
  }

  // Set up bulk action event listeners
  document
    .getElementById("bulk-action-select")
    .addEventListener("change", function () {
      const applyButton = document.getElementById("apply-bulk-action");
      applyButton.disabled = !this.value || selectedProductIds.length === 0;
    });

  document
    .getElementById("apply-bulk-action")
    .addEventListener("click", handleBulkAction);

  // Set up export/import listeners
  document
    .getElementById("export-csv-btn")
    .addEventListener("click", exportProductsToCSV);
  document
    .getElementById("import-csv-btn")
    .addEventListener("click", showImportModal);

  // Category modal listeners
  if (document.getElementById("new-category")) {
    document.getElementById("new-category").addEventListener("change", (e) => {
      const newCategoryInput = document.getElementById("new-category-input");
      if (e.target.value === "new") {
        newCategoryInput.style.display = "block";
      } else {
        newCategoryInput.style.display = "none";
      }
    });
  }

  if (document.getElementById("cancel-category")) {
    document.getElementById("cancel-category").addEventListener("click", () => {
      document.getElementById("category-modal").style.display = "none";
    });
  }

  // Stock modal listeners
  if (document.getElementById("cancel-stock")) {
    document.getElementById("cancel-stock").addEventListener("click", () => {
      document.getElementById("stock-modal").style.display = "none";
    });
  }

  // Import modal listeners
  if (document.getElementById("cancel-import")) {
    document.getElementById("cancel-import").addEventListener("click", () => {
      document.getElementById("import-modal").style.display = "none";
    });
  }

  if (document.getElementById("csv-file")) {
    document
      .getElementById("csv-file")
      .addEventListener("change", handleFileSelect);
  }
});

// Initialize the page
async function initPage() {
  // Check permissions (this is now handled in the main HTML by LayoutManager)

  // Make sure elements exist before trying to use them
  const currentDate = document.getElementById("current-date");
  if (currentDate) {
    const today = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    currentDate.textContent = today.toLocaleDateString("en-US", options);
  }

  // Check online status (now handled by LayoutManager, but we'll keep this for inventory-specific functionality)
  await checkConnectionStatus();

  // Load products
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

    // LayoutManager now handles the connection UI

    // Enable/disable certain buttons based on connection
    const syncButtons = document.querySelectorAll(
      "#sync-button, #sync-button-bottom"
    );
    if (syncButtons) {
      syncButtons.forEach((btn) => {
        btn.disabled = !isOnline;
      });
    }
  } catch (error) {
    console.error("Error checking online status:", error);
    isOnline = navigator.onLine;
  }
}

// Sync data with server (when coming back online)
async function syncData() {
  try {
    console.log("Syncing inventory data with cloud...");

    // Disable sync buttons during sync
    const syncButtons = document.querySelectorAll(
      "#sync-button, #sync-button-bottom"
    );
    if (syncButtons) {
      syncButtons.forEach((btn) => {
        btn.disabled = true;
        btn.innerHTML =
          '<div class="btn-icon" style="animation: rotate 1s linear infinite;">🔄</div><span>Syncing...</span>';
      });
    }

    const result = await window.api.syncData();
    console.log("Sync result:", result);

    if (result) {
      // Reload products after sync
      await loadProducts();
      console.log("Products reloaded after sync");

      // Show success message
      showNotification("Data synced successfully", "success");
    } else {
      showNotification("Sync failed. Please try again later.", "error");
    }

    // Re-enable sync buttons
    if (syncButtons) {
      syncButtons.forEach((btn) => {
        btn.disabled = false;
        btn.innerHTML = '<div class="btn-icon">🔄</div><span>Sync Data</span>';
      });
    }
  } catch (error) {
    console.error("Error syncing data:", error);
    showNotification("Error syncing data: " + error.message, "error");

    // Re-enable sync buttons
    const syncButtons = document.querySelectorAll(
      "#sync-button, #sync-button-bottom"
    );
    if (syncButtons) {
      syncButtons.forEach((btn) => {
        btn.disabled = false;
        btn.innerHTML = '<div class="btn-icon">🔄</div><span>Sync Data</span>';
      });
    }
  }
}

// Show notification
function showNotification(message, type = "info") {
  // Create element if it doesn't exist
  let notification = document.getElementById("notification");

  if (!notification) {
    notification = document.createElement("div");
    notification.id = "notification";
    notification.style.position = "fixed";
    notification.style.top = "20px";
    notification.style.right = "20px";
    notification.style.padding = "12px 16px";
    notification.style.borderRadius = "var(--border-radius)";
    notification.style.boxShadow = "var(--shadow-md)";
    notification.style.zIndex = "9999";
    notification.style.maxWidth = "300px";
    notification.style.transition = "all 0.3s ease";
    notification.style.transform = "translateY(-20px)";
    notification.style.opacity = "0";
    notification.style.borderLeft = "4px solid var(--primary-color)";
    document.body.appendChild(notification);
  }

  // Check if dark mode is active
  const isDarkMode =
    document.body.classList.contains("dark-mode") ||
    document.documentElement.classList.contains("dark-mode") ||
    document.body.classList.contains("dark");

  // Set base styles based on theme
  if (isDarkMode) {
    notification.style.backgroundColor = "#1a2234";
    notification.style.color = "#e2e8f0";
    notification.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.4)";
  } else {
    notification.style.backgroundColor = "white";
    notification.style.color = "var(--text-primary)";
    notification.style.boxShadow = "var(--shadow-md)";
  }

  // Set type styling with different colors for dark/light mode
  if (type === "success") {
    notification.style.borderLeftColor = isDarkMode
      ? "#34d399"
      : "var(--success-color)";
  } else if (type === "error") {
    notification.style.borderLeftColor = isDarkMode
      ? "#f87171"
      : "var(--danger-color)";
  } else if (type === "warning") {
    notification.style.borderLeftColor = isDarkMode
      ? "#fbbf24"
      : "var(--warning-color)";
  } else {
    // Default info style
    notification.style.borderLeftColor = isDarkMode
      ? "#6366f1"
      : "var(--primary-color)";
  }

  // Set content and show
  notification.textContent = message;
  notification.style.transform = "translateY(0)";
  notification.style.opacity = "1";

  // Hide after delay
  setTimeout(() => {
    notification.style.transform = "translateY(-20px)";
    notification.style.opacity = "0";
  }, 5000);
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

    // Update inventory badge in sidebar if LayoutManager is available
    if (window.LayoutManager) {
      const lowStockCount = products.filter(
        (product) => product.stock <= 5
      ).length;
      window.LayoutManager.updateInventoryBadge(lowStockCount);
    }
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

  // Get search element safely
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
  // REPLACE THIS PART in renderProducts function
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

    // Get search element safely
    const searchElement = document.getElementById("product-search");
    const searchTerm = searchElement
      ? searchElement.value.toLowerCase().trim()
      : "";

    // Get filter element safely
    const filterElement = document.getElementById("search-filter");
    const filterField = filterElement ? filterElement.value : "all";

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

    // Add data cells
    const dataCells = [
      { content: skuText },
      { content: nameText },
      { content: categoryText },
      { content: `$${product.price.toFixed(2)}` },
      { content: `$${product.cost ? product.cost.toFixed(2) : "0.00"}` },
      { content: `$${calculateProfit(product).toFixed(2)}` },
      { content: product.stock, className: stockStatusClass },
    ];

    dataCells.forEach((cell) => {
      const td = document.createElement("td");
      td.innerHTML = cell.content;
      if (cell.className) td.className = cell.className;
      row.appendChild(td);
    });

    // Create actions cell with buttons
    const actionsCell = document.createElement("td");

    const editBtn = document.createElement("button");
    editBtn.className = "btn edit-btn";
    editBtn.textContent = "Edit";
    editBtn.dataset.id = product.id;
    // editBtn.addEventListener("click", handleEditProduct);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.dataset.id = product.id;
    // deleteBtn.addEventListener("click", handleDeleteProduct);

    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(document.createTextNode(" "));
    actionsCell.appendChild(deleteBtn);

    row.appendChild(actionsCell);
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

  // // Add event listeners to edit and delete buttons
  // document.querySelectorAll(".edit-btn").forEach((btn) => {
  //   btn.addEventListener("click", handleEditProduct);
  // });

  // document.querySelectorAll(".delete-btn").forEach((btn) => {
  //   btn.addEventListener("click", handleDeleteProduct);
  // });

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

// Update the bulk actions UI based on selection
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

// Function to render the current page
function renderCurrentPage() {
  // If filtering is active, use filtered products, otherwise use all products
  const searchTerm = document
    .getElementById("product-search")
    .value.toLowerCase();

  if (!searchTerm) {
    renderProducts(products);
  } else {
    filterProducts();
  }
}

// Filter products based on search input
function filterProducts() {
  currentPage = 1; // Reset to first page when filtering
  const searchTerm = document
    .getElementById("product-search")
    .value.toLowerCase();
  const filterField = document.getElementById("search-filter").value;
  const searchStatus = document.getElementById("search-status");

  if (!searchTerm) {
    if (searchStatus) searchStatus.textContent = "";
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
  if (searchStatus) {
    searchStatus.textContent = `${filteredProducts.length} product${
      filteredProducts.length !== 1 ? "s" : ""
    } found`;

    // If no products found, show a message with reset option
    if (filteredProducts.length === 0) {
      searchStatus.innerHTML =
        'No products found. <a href="#" id="reset-search">Reset search</a>';
      document.getElementById("reset-search").addEventListener("click", (e) => {
        e.preventDefault();
        clearSearch();
      });
    }
  }

  renderProducts(filteredProducts);
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

// Handle add/edit product form submission
async function handleAddProduct(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  // Validate form data
  const name = formData.get("product-name");
  if (!name || name.trim() === "") {
    showNotification("Product name is required", "error");
    return;
  }

  const priceStr = formData.get("product-price");
  const costStr = formData.get("product-cost");
  const stockStr = formData.get("product-stock");

  const price = parseFloat(priceStr);
  const cost = parseFloat(costStr);
  const stock = parseInt(stockStr);

  if (isNaN(price) || price < 0) {
    showNotification("Please enter a valid price", "error");
    return;
  }

  if (isNaN(cost) || cost < 0) {
    showNotification("Please enter a valid cost", "error");
    return;
  }

  if (isNaN(stock) || stock < 0) {
    showNotification("Please enter a valid stock quantity", "error");
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
      const success = await window.api.updateProduct({
        ...productData,
        id: editingProductId,
      });

      if (success) {
        // Update local products array
        const index = products.findIndex((p) => p.id === editingProductId);
        if (index !== -1) {
          products[index] = {
            ...products[index],
            ...productData,
          };
        }

        // Log the update activity
        try {
          logActivity("update", "product", productData.name, {
            text: `Updated product <strong>${productData.name}</strong>`,
            icon: "✏️",
            badge: "Update",
            badgeClass: "badge-info",
          });
        } catch (error) {
          console.error("Error logging activity for update:", error);
        }

        showNotification("Product updated successfully!", "success");
      } else {
        showNotification(
          "Failed to update product. Please try again.",
          "error"
        );
      }
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

      // Log the add activity
      logActivity("add", "product", productData.name, {
        text: `Added new product <strong>${productData.name}</strong>`,
        icon: "✚",
        badge: "New",
        badgeClass: "badge-success",
      });

      showNotification("Product added successfully!", "success");
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
    showNotification("Failed to save product. Please try again.", "error");
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

  // Get the product name before deletion for logging
  const productToDelete = products.find((p) => p.id === productId);
  if (!productToDelete) return;

  try {
    console.log(`Deleting product with ID: ${productId}`);
    const success = await window.api.deleteProduct(productId);

    if (success) {
      console.log("Product deleted successfully");

      // Log the deletion activity
      logActivity("delete", "product", productToDelete.name, {
        text: `Deleted product <strong>${productToDelete.name}</strong>`,
        icon: "🗑️",
        badge: "Delete",
        badgeClass: "badge-danger",
      });

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

      showNotification("Product deleted successfully!", "success");
    } else {
      showNotification("Failed to delete product. Please try again.", "error");
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    showNotification("Failed to delete product. Please try again.", "error");
  }
}

// Handle bulk actions
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

// Bulk delete products
async function bulkDeleteProducts() {
  try {
    // Show loading indicator
    const applyButton = document.getElementById("apply-bulk-action");
    const originalText = applyButton.textContent;
    applyButton.textContent = "Deleting...";
    applyButton.disabled = true;

    // Get product names for logging before deletion
    const productsToDelete = products.filter((p) =>
      selectedProductIds.includes(p.id)
    );
    const productNames = productsToDelete.map((p) => p.name).join(", ");

    // Delete each product
    for (const productId of selectedProductIds) {
      await window.api.deleteProduct(productId);
    }

    // Log the bulk deletion activity
    logActivity("delete", "products", "Multiple products", {
      text: `Deleted ${selectedProductIds.length} products: <strong>${productNames}</strong>`,
      icon: "🗑️",
      badge: "Bulk Delete",
      badgeClass: "badge-danger",
    });

    // Update the products array
    products = products.filter((p) => !selectedProductIds.includes(p.id));

    // Clear selection and render products
    const previousLength = selectedProductIds.length;
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

    showNotification(
      `Successfully deleted ${previousLength} products.`,
      "success"
    );
  } catch (error) {
    console.error("Error in bulk delete:", error);
    showNotification("An error occurred while deleting products.", "error");
  }
}

// Show the category change modal
function showCategoryChangeModal() {
  // Get unique categories from products
  const uniqueCategories = [
    ...new Set(products.map((p) => p.category || "Uncategorized")),
  ];

  // Create sorted categories list without duplicates
  const categories = uniqueCategories.sort();

  // Get the modal
  const modal = document.getElementById("category-modal");
  const categorySelect = document.getElementById("new-category");

  // Clear previous options
  categorySelect.innerHTML = "";

  // Add categories to select
  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });

  // Add "new category" option
  const newOption = document.createElement("option");
  newOption.value = "new";
  newOption.textContent = "+ Add New Category";
  categorySelect.appendChild(newOption);

  // Hide the "new category" input
  document.getElementById("new-category-input").style.display = "none";

  // Set up the save button
  document.getElementById("save-category").addEventListener(
    "click",
    async () => {
      let newCategory = document.getElementById("new-category").value;
      if (newCategory === "new") {
        newCategory = document.getElementById("new-category-name").value.trim();
        if (!newCategory) {
          showNotification("Please enter a category name", "error");
          return;
        }
      }

      try {
        // Show loading state
        const saveButton = document.getElementById("save-category");
        saveButton.textContent = "Updating...";
        saveButton.disabled = true;

        // Get product names for logging
        const productsToUpdate = products.filter((p) =>
          selectedProductIds.includes(p.id)
        );
        const productNames = productsToUpdate.map((p) => p.name).join(", ");

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

        // Log the category update activity
        logActivity("update", "products", "Multiple products", {
          text: `Updated category to <strong>${newCategory}</strong> for ${selectedProductIds.length} products`,
          icon: "📂",
          badge: "Category",
          badgeClass: "badge-info",
        });

        // Close modal
        modal.style.display = "none";

        // Re-render products
        renderProducts(products);

        // If we're online, try to sync
        if (isOnline && window.api.syncData) {
          syncData();
        }

        showNotification(
          `Successfully updated category for ${selectedProductIds.length} products.`,
          "success"
        );
      } catch (error) {
        console.error("Error updating categories:", error);
        showNotification(
          "An error occurred while updating categories.",
          "error"
        );
      } finally {
        // Reset save button
        const saveButton = document.getElementById("save-category");
        saveButton.textContent = "Apply";
        saveButton.disabled = false;
      }
    },
    { once: true }
  );

  // Show the modal
  modal.style.display = "block";
}

// Show the stock update modal
function showStockUpdateModal() {
  // Get the modal
  const modal = document.getElementById("stock-modal");

  // Reset fields
  document.getElementById("stock-update-method").value = "set";
  document.getElementById("stock-value").value = "0";

  // Set up the save button
  document.getElementById("save-stock").addEventListener(
    "click",
    async () => {
      const method = document.getElementById("stock-update-method").value;
      const value = parseInt(document.getElementById("stock-value").value) || 0;

      if (value < 0) {
        showNotification("Please enter a non-negative value", "error");
        return;
      }

      try {
        // Show loading state
        const saveButton = document.getElementById("save-stock");
        saveButton.textContent = "Updating...";
        saveButton.disabled = true;

        // Get product names for logging
        const productsToUpdate = products.filter((p) =>
          selectedProductIds.includes(p.id)
        );
        const productNames = productsToUpdate.map((p) => p.name).join(", ");

        // Get action text for the log
        let actionText = "";
        switch (method) {
          case "set":
            actionText = `set to ${value}`;
            break;
          case "add":
            actionText = `increased by ${value}`;
            break;
          case "subtract":
            actionText = `decreased by ${value}`;
            break;
        }

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

        // Log the stock update activity
        logActivity("update", "products", "Multiple products", {
          text: `Stock ${actionText} for ${selectedProductIds.length} products`,
          icon: "📦",
          badge: "Stock",
          badgeClass: "badge-info",
        });

        // Close modal
        modal.style.display = "none";

        // Re-render products
        renderProducts(products);
        updateProductStats();

        // If we're online, try to sync
        if (isOnline && window.api.syncData) {
          syncData();
        }

        showNotification(
          `Successfully updated stock for ${selectedProductIds.length} products.`,
          "success"
        );
      } catch (error) {
        console.error("Error updating stock:", error);
        showNotification("An error occurred while updating stock.", "error");
      } finally {
        // Reset save button
        const saveButton = document.getElementById("save-stock");
        saveButton.textContent = "Apply";
        saveButton.disabled = false;
      }
    },
    { once: true }
  );

  // Show modal
  modal.style.display = "block";
}

// Export products to CSV
function exportProductsToCSV() {
  try {
    if (products.length === 0) {
      showNotification("No products to export", "warning");
      return;
    }

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
    showNotification(
      `Exported ${products.length} products to CSV successfully!`,
      "success"
    );
  } catch (error) {
    console.error("Error exporting to CSV:", error);
    showNotification("Error exporting to CSV. Please try again.", "error");
  }
}

// Show import modal
function showImportModal() {
  // Get the modal
  const modal = document.getElementById("import-modal");

  // Reset file input and preview
  document.getElementById("csv-file").value = "";
  document.getElementById("preview-content").innerHTML = "";
  document.getElementById("process-import").disabled = true;

  // Reset checkboxes to checked state
  document.getElementById("override-existing").checked = true;
  document.getElementById("add-new-products").checked = true;

  // Show modal
  modal.style.display = "block";
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
      document.getElementById("process-import").addEventListener(
        "click",
        () => {
          processCSVImport(csvData);
        },
        { once: true }
      );
    } catch (error) {
      console.error("Error reading CSV:", error);
      showNotification(
        "Error reading CSV file. Please check the file format.",
        "error"
      );
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
  let tableHTML =
    '<table class="preview-table" style="width:100%; border-collapse:collapse; font-size:0.8rem;"><thead><tr>';

  // Add headers
  headers.forEach((header) => {
    tableHTML += `<th style="text-align:left; padding:0.5rem; border-bottom:1px solid var(--border-color);">${header.trim()}</th>`;
  });
  tableHTML += "</tr></thead><tbody>";

  // Add up to 5 rows of data
  const maxPreviewRows = Math.min(lines.length - 1, 5);
  for (let i = 1; i <= maxPreviewRows; i++) {
    if (lines[i].trim()) {
      tableHTML += "<tr>";
      const cells = parseCSVLine(lines[i]);
      cells.forEach((cell) => {
        tableHTML += `<td style="padding:0.5rem; border-bottom:1px solid var(--border-color);">${cell}</td>`;
      });
      tableHTML += "</tr>";
    }
  }

  tableHTML += "</tbody></table>";

  // Show total rows
  const totalDataRows = lines.filter(
    (line, index) => index > 0 && line.trim()
  ).length;
  tableHTML += `<p style="margin-top:0.5rem; font-size:0.8rem; color:var(--text-secondary);">Total rows: ${totalDataRows}</p>`;

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
      showNotification(
        `Missing required columns: ${missingHeaders.join(", ")}`,
        "error"
      );
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
    showNotification(
      `Import complete: Added: ${addedCount}, Updated: ${updatedCount}, Errors: ${errorCount}`,
      errorCount > 0 ? "warning" : "success"
    );
  } catch (error) {
    console.error("Error importing CSV:", error);
    showNotification("Error importing CSV. Please try again.", "error");
  } finally {
    // Reset button
    const processButton = document.getElementById("process-import");
    if (processButton) {
      processButton.textContent = "Import Products";
      processButton.disabled = false;
    }
  }
}

// Add pagination
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
  nextButton.disabled = currentPage === totalPages || totalPages === 0;
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

  // Update badge in sidebar if LayoutManager is available
  if (window.LayoutManager) {
    window.LayoutManager.updateInventoryBadge(lowStockCount);
  }
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

function logActivity(action, itemType, itemName, additionalInfo = {}) {
  try {
    // Create new activity log entry
    const activity = {
      action, // 'update', 'delete', 'sync', etc.
      itemType, // 'product', 'invoice', etc.
      itemName, // Name of the item
      timestamp: new Date().toISOString(),
      ...additionalInfo, // Any additional info like badge, text, icon, etc.
    };

    // Get existing logs
    let activityLogs = [];
    const storedLogs = localStorage.getItem("mzlad_activity_logs");
    if (storedLogs) {
      activityLogs = JSON.parse(storedLogs);
    }

    // Add new log
    activityLogs.unshift(activity);

    // Keep only the most recent logs (e.g., last 50)
    if (activityLogs.length > 50) {
      activityLogs = activityLogs.slice(0, 50);
    }

    // Save back to storage
    localStorage.setItem("mzlad_activity_logs", JSON.stringify(activityLogs));

    // If API method exists, also save there
    if (window.api && window.api.saveActivityLog) {
      window.api.saveActivityLog(activity).catch((error) => {
        console.error("Error saving to API:", error);
      });
    }

    console.log(`Logged activity: ${action} - ${itemType} - ${itemName}`);
    return true;
  } catch (error) {
    console.error("Error logging activity:", error);
    return false;
  }
}
