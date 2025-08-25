// inventory.js - Inventory Management Script
// Updated to work with the component system and i18n

// Global variables
let products = [];
let editingProductId = null;
let isOnline = false;
let currentPage = 1;
const pageSize = 25; // Reduced for better performance
let totalPages = 1;
let selectedProductIds = [];
let searchTimeout;

// Enhanced pagination variables for inventory
let totalProducts = 0;
let isLoadingProducts = false;
let currentProductPageSize = 25; // Reduced default size

// Cache for inventory data with TTL
const inventoryCache = new Map();
const maxCacheSize = 50; // Reduced cache size
const cacheTimeout = 5 * 60 * 1000; // 5 minutes

// Performance optimization variables
let renderTimeout = null;
let isRendering = false;
const CHUNK_SIZE = 10; // Process products in chunks of 10

// Virtual scrolling for large datasets
let virtualScrollContainer = null;
let visibleStartIndex = 0;
let visibleEndIndex = 0;
const VISIBLE_BUFFER = 5; // Number of extra items to render outside viewport

// Performance monitoring for inventory
const inventoryPerformanceMonitor = {
  startTime: 0,
  endTime: 0,
  lastLoadTime: 0,

  start() {
    this.startTime = performance.now();
  },

  end(operation = "unknown") {
    this.endTime = performance.now();
    this.lastLoadTime = this.endTime - this.startTime;
    if (this.lastLoadTime > 100) { // Only log slow operations
      console.log(`Inventory ${operation} took ${this.lastLoadTime.toFixed(2)}ms`);
    }
    return this.lastLoadTime;
  },
};

// Debounced function to prevent excessive calls
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Cache management with TTL
function getCachedData(key) {
  const cached = inventoryCache.get(key);
  if (cached && Date.now() - cached.timestamp < cacheTimeout) {
    return cached.data;
  }
  inventoryCache.delete(key);
  return null;
}

function setCachedData(key, data) {
  // Clean old cache entries if we're at max size
  if (inventoryCache.size >= maxCacheSize) {
    const oldestKey = inventoryCache.keys().next().value;
    inventoryCache.delete(oldestKey);
  }

  inventoryCache.set(key, {
    data: data,
    timestamp: Date.now()
  });
}

document.addEventListener("pageCacheCleared", resetInventoryState);
function resetInventoryState() {
  console.log("Resetting inventory state variables");

  // Reset all inventory-specific global variables
  products = [];
  editingProductId = null;
  currentPage = 1;
  selectedProductIds = [];

  if (searchTimeout) {
    clearTimeout(searchTimeout);
    searchTimeout = null;
  }

  if (renderTimeout) {
    clearTimeout(renderTimeout);
    renderTimeout = null;
  }

  // Clear cache
  inventoryCache.clear();

  // Clear the search field and results
  const searchField = document.getElementById("product-search");
  if (searchField) searchField.value = "";

  const searchStatus = document.getElementById("search-status");
  if (searchStatus) searchStatus.textContent = "";

  // Reset the search filter to default
  const searchFilter = document.getElementById("search-filter");
  if (searchFilter) searchFilter.value = "all";

  // Clear selection checkboxes
  const selectAllCheckbox = document.getElementById("select-all-checkbox");
  if (selectAllCheckbox) selectAllCheckbox.checked = false;

  // Reset bulk actions UI
  updateBulkActionsUI();
}

// Loading screen functions
function showLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.style.display = 'flex';
    loadingScreen.classList.remove('fade-out');
    
    // Animate progress bar
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      if (progressFill) progressFill.style.width = `${progress}%`;
      if (progressText) progressText.textContent = `${progress}%`;
      
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 220); // 10 seconds total (100 steps * 200ms)
  }
}

function hideLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
    }, 1000); // Wait for fade-out animation to complete
  }
}
// DOM Elements initialization
document.addEventListener("DOMContentLoaded", () => {
  // Show loading screen immediately
  showLoadingScreen();

  // Initialize page
  initPage();

  // Event listeners
  document
      .getElementById("add-product-form")
      .addEventListener("submit", handleAddProduct);

  document.getElementById("add-new-btn").addEventListener("click", () => {
    document.getElementById("product-form-title").textContent = window.t(
        "inventory.productForm.addTitle"
    );
    document.getElementById("add-product-form").reset();
    document.getElementById("product-modal").style.display = "block";
    editingProductId = null;
  });

  document.querySelector(".close").addEventListener("click", () => {
    document.getElementById("product-modal").style.display = "none";
  });

  document.querySelectorAll(".close").forEach((closeBtn) => {
    closeBtn.addEventListener("click", () => {
      // Find the parent modal
      const modal = closeBtn.closest(".modal");
      if (modal) {
        modal.style.display = "none";
      }
    });
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
      .addEventListener("input", function () {
        clearTimeout(searchTimeout);
        document.getElementById("search-status").textContent =
            window.t("inventory.searching") || "Searching...";

        searchTimeout = setTimeout(() => {
          filterProducts();
        }, 300); // 300ms delay
      });

  // Add event listener for search filter dropdown
  document
      .getElementById("search-filter")
      .addEventListener("change", function () {
        // Reset to first page when filter type changes
        currentPage = 1;
        filterProducts();
      });

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

  // Listen for language changes
  window.addEventListener("languageChanged", function () {
    updateUITranslations();
  });
});

// Initialize the page
async function initPage() {
  try {
    // Check permissions (this is now handled in the main HTML by LayoutManager)
    resetInventoryState();
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

    window.LayoutManager.refreshInventoryBadge();
  } finally {
    // Hide loading screen after 11 seconds
    setTimeout(() => {
      hideLoadingScreen();
    }, 11000);
  }
}

// Update UI translations for dynamic elements
function updateUITranslations() {
  // Update page title if needed
  document.title = window.t("inventory.title") + " - " + window.t("app.name");

  // Update dynamically generated content that may not be handled by i18n.updatePageContent()
  setupPagination();
  updateBulkActionsUI();

  // Re-render products to update translated elements
  renderCurrentPage();
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
            '<div class="btn-icon" style="animation: rotate 1s linear infinite;">🔄</div><span>' +
            window.t("common.loading") +
            "</span>";
      });
    }

    const result = await window.api.syncData();
    console.log("Sync result:", result);

    if (result) {
      // Reload products after sync
      await loadProducts();
      console.log("Products reloaded after sync");

      // Show success message
      showNotification(window.t("inventory.notifications.dataSync"), "success");
    } else {
      showNotification(window.t("inventory.notifications.syncFailed"), "error");
    }

    // Re-enable sync buttons
    if (syncButtons) {
      syncButtons.forEach((btn) => {
        btn.disabled = false;
        btn.innerHTML =
            '<div class="btn-icon">🔄</div><span>' +
            window.t("common.sync") +
            "</span>";
      });
    }
  } catch (error) {
    console.error("Error syncing data:", error);
    showNotification(
        window.t("inventory.notifications.syncError", { message: error.message }),
        "error"
    );

    // Re-enable sync buttons
    const syncButtons = document.querySelectorAll(
        "#sync-button, #sync-button-bottom"
    );
    if (syncButtons) {
      syncButtons.forEach((btn) => {
        btn.disabled = false;
        btn.innerHTML =
            '<div class="btn-icon">🔄</div><span>' +
            window.t("common.sync") +
            "</span>";
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
// Modified section in the loadProducts function to ensure SKU sorting
async function loadProducts() {
  await loadProductsWithPagination(currentPage, currentProductPageSize || pageSize);
}

// Enhanced pagination functions for inventory handling large datasets

// Load products with advanced pagination
async function loadProductsWithPagination(page = 1, limit = 50, offset = 0, filters = {}) {
  if (isLoadingProducts) {
    console.log("Products already loading, skipping duplicate request");
    return;
  }

  isLoadingProducts = true;
  inventoryPerformanceMonitor.start();

  try {
    // Prepare pagination options with limit/offset
    const options = {
      page: page,
      pageSize: limit,
      offset: offset,
      filters: {
        ...filters,
      },
      sort: {
        field: "sku",
        order: "asc"
      }
    };

    // Get search term if any
    const searchElement = document.getElementById("product-search");
    const searchTerm = searchElement ? searchElement.value.toLowerCase().trim() : "";
    const filterElement = document.getElementById("search-filter");
    const filterField = filterElement ? filterElement.value : "all";

    // Add search filters if present
    if (searchTerm) {
      if (filterField === "all") {
        options.filters.search = searchTerm;
        console.log("Searching all fields for:", searchTerm);
      } else {
        options.filters[filterField] = searchTerm;
        console.log(`Searching ${filterField} field for:`, searchTerm);
      }
    }

    console.log("Search options being sent:", options);

    // Check cache AFTER applying all filters (only for non-search queries)
    let cacheKey = null;
    if (!searchTerm) {
      // Only cache non-search results
      cacheKey = `products_${page}_${limit}_${offset}_${JSON.stringify(options.filters)}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) {
        console.log("Loading products from cache with key:", cacheKey);
        products = cachedData.products;
        totalProducts = cachedData.totalProducts;
        totalPages = cachedData.totalPages;
        currentPage = page;
        currentProductPageSize = limit;
        renderProducts(products, true, totalProducts);
        setupEnhancedPagination();
        return;
      }
    } else {
      console.log("Search term detected, skipping cache for fresh results");
    }

    // Show loading state
    showProductsLoading();

    // Request paginated data from backend
    const result = await window.api.getProducts(options);

    // Handle response
    if (result && result.items) {
      // Server returned paginated format
      products = result.items;
      totalProducts = result.totalCount;
      totalPages = result.totalPages;
      currentPage = result.page;
      currentProductPageSize = limit;

      // Cache the result only for non-search queries
      if (cacheKey && !searchTerm) {
        setCachedData(cacheKey, {
          products: result.items,
          totalProducts: result.totalCount,
          totalPages: result.totalPages,
        });
      }

      renderProducts(products, true, totalProducts);
    } else {
      // Fallback for backward compatibility
      products = result || [];
      totalProducts = products.length;
      totalPages = Math.ceil(totalProducts / limit);
      currentPage = page;
      currentProductPageSize = limit;
      renderProducts(products);
    }

    setupEnhancedPagination();
    updateProductStats();
    inventoryPerformanceMonitor.end('load products with pagination');

    // Clear search status after successful load
    const searchStatusElement = document.getElementById("search-status");
    if (searchStatusElement) {
      const searchElement = document.getElementById("product-search");
      const searchTerm = searchElement ? searchElement.value.trim() : "";
      
      if (searchTerm) {
        // Show search results info
        searchStatusElement.textContent = 
          `${window.t("inventory.searchResults") || "Search results"}: ${totalProducts} ${window.t("inventory.products") || "products"} ${window.t("inventory.found") || "found"}`;
      } else {
        searchStatusElement.textContent = "";
      }
    }

  } catch (error) {
    console.error("Error loading products:", error);
    showProductsError(error.message);
  } finally {
    isLoadingProducts = false;
  }
}

// Show loading state for products table
function showProductsLoading() {
  const tableBody = document.getElementById("products-table-body");
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 24px;">
          <div class="loading-container">
            <div class="loading-spinner"></div>
            <span>${window.t("inventory.loading") || "Loading products..."}</span>
          </div>
        </td>
      </tr>
    `;
  }
}

// Show error state for products table
function showProductsError(message) {
  const tableBody = document.getElementById("products-table-body");
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 24px;">
          <div class="error-container">
            <span>${window.t("inventory.errors.loadFailed") || "Failed to load products"}: ${message}</span>
            <button onclick="loadProductsWithPagination(${currentPage}, ${currentProductPageSize})" class="btn btn-sm btn-primary" style="margin-top: 8px;">
              ${window.t("common.retry") || "Retry"}
            </button>
          </div>
        </td>
      </tr>
    `;
  }
}

// Enhanced pagination setup for inventory
function setupEnhancedPagination() {
  let paginationContainer = document.getElementById("pagination-container");
  if (!paginationContainer) {
    paginationContainer = document.createElement("div");
    paginationContainer.id = "pagination-container";
    paginationContainer.className = "enhanced-pagination";

    const tableContainer = document.querySelector(".table-container");
    if (tableContainer) {
      tableContainer.parentNode.insertBefore(paginationContainer, tableContainer.nextSibling);
    }
  }

  paginationContainer.innerHTML = "";

  if (totalPages <= 1) {
    return; // No pagination needed
  }

  // Create pagination controls container
  const paginationControls = document.createElement("div");
  paginationControls.className = "pagination-controls";

  // First page button
  const firstButton = document.createElement("button");
  firstButton.className = "btn pagination-btn";
  firstButton.textContent = "««";
  firstButton.title = window.t("pagination.first") || "First";
  firstButton.disabled = currentPage === 1;
  firstButton.addEventListener("click", () => {
    if (currentPage > 1) {
      loadProductsWithPagination(1, currentProductPageSize);
    }
  });

  // Previous button
  const prevButton = document.createElement("button");
  prevButton.className = "btn pagination-btn";
  prevButton.textContent = "‹";
  prevButton.title = window.t("pagination.previous") || "Previous";
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      loadProductsWithPagination(currentPage - 1, currentProductPageSize);
    }
  });

  // Page input for direct navigation
  const pageInput = document.createElement("input");
  pageInput.type = "number";
  pageInput.min = "1";
  pageInput.max = totalPages.toString();
  pageInput.value = currentPage.toString();
  pageInput.className = "page-input";
  pageInput.addEventListener("change", (e) => {
    const newPage = parseInt(e.target.value);
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      loadProductsWithPagination(newPage, currentProductPageSize);
    }
  });

  // Page info
  const pageInfo = document.createElement("span");
  pageInfo.className = "page-info";
  pageInfo.textContent = ` / ${totalPages}`;

  // Next button
  const nextButton = document.createElement("button");
  nextButton.className = "btn pagination-btn";
  nextButton.textContent = "›";
  nextButton.title = window.t("pagination.next") || "Next";
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      loadProductsWithPagination(currentPage + 1, currentProductPageSize);
    }
  });

  // Last page button
  const lastButton = document.createElement("button");
  lastButton.className = "btn pagination-btn";
  lastButton.textContent = "»»";
  lastButton.title = window.t("pagination.last") || "Last";
  lastButton.disabled = currentPage === totalPages;
  lastButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      loadProductsWithPagination(totalPages, currentProductPageSize);
    }
  });

  // Page size selector
  const pageSizeSelector = document.createElement("select");
  pageSizeSelector.className = "page-size-selector";
  pageSizeSelector.addEventListener("change", (e) => {
    const newPageSize = parseInt(e.target.value);
    // Recalculate current page to maintain position
    const currentItem = (currentPage - 1) * currentProductPageSize + 1;
    const newPage = Math.ceil(currentItem / newPageSize);
    currentProductPageSize = newPageSize;
    loadProductsWithPagination(newPage, newPageSize);
  });

  [25, 50, 100, 200].forEach(size => {
    const option = document.createElement("option");
    option.value = size;
    option.textContent = `${size} ${window.t("pagination.perPage") || "per page"}`;
    option.selected = size === currentProductPageSize;
    pageSizeSelector.appendChild(option);
  });

  // Assemble pagination controls
  paginationControls.appendChild(firstButton);
  paginationControls.appendChild(prevButton);
  paginationControls.appendChild(pageInput);
  paginationControls.appendChild(pageInfo);
  paginationControls.appendChild(nextButton);
  paginationControls.appendChild(lastButton);
  paginationControls.appendChild(pageSizeSelector);

  // Product count info
  const productCount = document.createElement("div");
  productCount.className = "product-count";
  const startProduct = (currentPage - 1) * currentProductPageSize + 1;
  const endProduct = Math.min(startProduct + currentProductPageSize - 1, totalProducts);
  productCount.textContent = window.t("pagination.showing", {
    shown: products.length,
    total: totalProducts,
    start: startProduct,
    end: endProduct
  }) || `Showing ${startProduct}-${endProduct} of ${totalProducts} products`;

  // Assemble final pagination
  paginationContainer.appendChild(paginationControls);
  paginationContainer.appendChild(productCount);
}

// Update selection state based on visible products
function updateSelectionState(visibleProducts) {
  const selectAllCheckbox = document.getElementById("select-all-checkbox");
  if (selectAllCheckbox) {
    const allSelected =
        visibleProducts.length > 0 &&
        visibleProducts.every((p) => selectedProductIds.includes(p.id));
    selectAllCheckbox.checked = allSelected;
    selectAllCheckbox.indeterminate =
        !allSelected &&
        visibleProducts.some((p) => selectedProductIds.includes(p.id));
  }
}

// Format currency based on user settings
function formatCurrency(amount) {
  const currency = localStorage.getItem("currency") || "USD";
  const symbol = currency === "ILS" ? "₪" : "$";
  return `${symbol}${parseFloat(amount).toFixed(2)}`;
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
    const text =
        window.t("inventory.bulkActions.selected", {
          count: selectedProductIds.length,
        }) ||
        `${selectedProductIds.length} item${
            selectedProductIds.length !== 1 ? "s" : ""
        } selected`;
    selectedCount.textContent = text;
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

  window.LayoutManager.refreshInventoryBadge();
}

// Function to render the current page
function renderCurrentPage() {
  loadProducts(); // Call loadProducts with the current page
}

// Filter products based on search input
function filterProducts() {
  currentPage = 1; // Reset to first page when filtering
  
  // Clear cache when searching to ensure fresh results
  inventoryCache.clear();
  console.log("Cache cleared for search");
  
  document.getElementById("search-status").textContent = 
    window.t("inventory.searching") || "Searching...";
  loadProductsWithPagination(currentPage, currentProductPageSize || pageSize);
}

// Clear the search field and reset the product list
function clearSearch() {
  document.getElementById("product-search").value = "";
  document.getElementById("search-filter").value = "all";
  document.getElementById("search-status").textContent = "";

  // Reset to first page and reload products
  currentPage = 1;
  loadProductsWithPagination(currentPage, currentProductPageSize || pageSize);
  window.LayoutManager.refreshInventoryBadge();
}

// Handle add/edit product form submission
async function handleAddProduct(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);

  // Validate form data
  const name = formData.get("product-name");
  if (!name || name.trim() === "") {
    showNotification(window.t("inventory.notifications.nameRequired"), "error");
    return;
  }

  const priceStr = formData.get("product-price");
  const costStr = formData.get("product-cost");
  const stockStr = formData.get("product-stock");

  const price = parseFloat(priceStr);
  const cost = parseFloat(costStr);
  const stock = parseInt(stockStr);

  if (isNaN(price) || price < 0) {
    showNotification(window.t("inventory.notifications.validPrice"), "error");
    return;
  }

  if (isNaN(cost) || cost < 0) {
    showNotification(window.t("inventory.notifications.validCost"), "error");
    return;
  }

  if (isNaN(stock) || stock < 0) {
    showNotification(window.t("inventory.notifications.validStock"), "error");
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
            text:
                window.t("inventory.notifications.productUpdated", {
                  name: productData.name,
                }) || `Updated product <strong>${productData.name}</strong>`,
            icon: "✏️",
            badge: "Update",
            badgeClass: "badge-info",
          });
        } catch (error) {
          console.error("Error logging activity for update:", error);
        }

        showNotification(
            window.t("inventory.notifications.productUpdated"),
            "success"
        );
      } else {
        showNotification(
            window.t("inventory.notifications.failedToUpdate"),
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
        text:
            window.t("inventory.notifications.productAdded", {
              name: productData.name,
            }) || `Added new product <strong>${productData.name}</strong>`,
        icon: "✚",
        badge: "New",
        badgeClass: "badge-success",
      });

      showNotification(
          window.t("inventory.notifications.productAdded"),
          "success"
      );
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
    showNotification(
        editingProductId
            ? window.t("inventory.notifications.failedToUpdate")
            : window.t("inventory.notifications.failedToAdd"),
        "error"
    );
  }

  window.LayoutManager.refreshInventoryBadge();
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
  document.getElementById("product-form-title").textContent = window.t(
      "inventory.productForm.editTitle"
  );

  // Show modal
  document.getElementById("product-modal").style.display = "block";
}

// Handle delete product button click
async function handleDeleteProduct(event) {
  if (!confirm(window.t("inventory.confirmations.deleteProduct"))) return;

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
        text:
            window.t("inventory.notifications.productDeleted", {
              name: productToDelete.name,
            }) || `Deleted product <strong>${productToDelete.name}</strong>`,
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

      showNotification(
          window.t("inventory.notifications.productDeleted"),
          "success"
      );
    } else {
      showNotification(
          window.t("inventory.notifications.failedToDelete"),
          "error"
      );
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    showNotification(
        window.t("inventory.notifications.failedToDelete"),
        "error"
    );
  }

  window.LayoutManager.refreshInventoryBadge();
}

// Handle bulk actions
async function handleBulkAction() {
  const action = document.getElementById("bulk-action-select").value;
  if (!action || selectedProductIds.length === 0) return;

  switch (action) {
    case "delete":
      if (
          confirm(
              window.t("inventory.confirmations.bulkDelete", {
                count: selectedProductIds.length,
              })
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

  window.LayoutManager.refreshInventoryBadge();
}

// Bulk delete products
async function bulkDeleteProducts() {
  try {
    // Show loading indicator
    const applyButton = document.getElementById("apply-bulk-action");
    const originalText = applyButton.textContent;
    applyButton.textContent = window.t("common.loading") || "Deleting...";
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
      text:
          window.t("inventory.notifications.bulkDeleteSuccess", {
            count: selectedProductIds.length,
            names: productNames,
          }) ||
          `Deleted ${selectedProductIds.length} products: <strong>${productNames}</strong>`,
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
        window.t("inventory.notifications.bulkDeleteSuccess", {
          count: previousLength,
        }),
        "success"
    );
  } catch (error) {
    console.error("Error in bulk delete:", error);
    showNotification(
        window.t("inventory.notifications.failedToDelete"),
        "error"
    );
  }

  window.LayoutManager.refreshInventoryBadge();
}

// Show the category change modal
function showCategoryChangeModal() {
  // Get unique categories from products
  const uniqueCategories = [
    ...new Set(
        products.map(
            (p) => p.category || window.t("common.none") || "Uncategorized"
        )
    ),
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
  newOption.textContent =
      window.t("inventory.categoryModal.addNew") || "+ Add New Category";
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
            showNotification(
                window.t("inventory.notifications.categoryRequired"),
                "error"
            );
            return;
          }
        }

        try {
          // Show loading state
          const saveButton = document.getElementById("save-category");
          saveButton.textContent = window.t("common.loading") || "Updating...";
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
            text:
                window.t("inventory.notifications.bulkCategorySuccess", {
                  count: selectedProductIds.length,
                  category: newCategory,
                }) ||
                `Updated category to <strong>${newCategory}</strong> for ${selectedProductIds.length} products`,
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
              window.t("inventory.notifications.bulkCategorySuccess", {
                count: selectedProductIds.length,
              }),
              "success"
          );
        } catch (error) {
          console.error("Error updating categories:", error);
          showNotification(
              window.t("inventory.notifications.failedToUpdate"),
              "error"
          );
        } finally {
          // Reset save button
          const saveButton = document.getElementById("save-category");
          saveButton.textContent =
              window.t("inventory.categoryModal.apply") || "Apply";
          saveButton.disabled = false;
        }
      },
      { once: true }
  );

  // Show the modal
  modal.style.display = "block";

  window.LayoutManager.refreshInventoryBadge();
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
          showNotification(
              window.t("inventory.notifications.nonnegativeValue"),
              "error"
          );
          return;
        }

        try {
          // Show loading state
          const saveButton = document.getElementById("save-stock");
          saveButton.textContent = window.t("common.loading") || "Updating...";
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
              actionText =
                  window.t("inventory.stockModal.methods.set") + " " + value;
              break;
            case "add":
              actionText =
                  window.t("inventory.stockModal.methods.add") + " " + value;
              break;
            case "subtract":
              actionText =
                  window.t("inventory.stockModal.methods.subtract") + " " + value;
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
            text:
                window.t("inventory.notifications.bulkStockSuccess", {
                  count: selectedProductIds.length,
                  action: actionText,
                }) ||
                `Stock ${actionText} for ${selectedProductIds.length} products`,
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
              window.t("inventory.notifications.bulkStockSuccess", {
                count: selectedProductIds.length,
              }),
              "success"
          );
        } catch (error) {
          console.error("Error updating stock:", error);
          showNotification(
              window.t("inventory.notifications.failedToUpdate"),
              "error"
          );
        } finally {
          // Reset save button
          const saveButton = document.getElementById("save-stock");
          saveButton.textContent =
              window.t("inventory.stockModal.apply") || "Apply";
          saveButton.disabled = false;
        }
      },
      { once: true }
  );

  // Show modal
  modal.style.display = "block";
  window.LayoutManager.refreshInventoryBadge();
}

// Export products to CSV
function exportProductsToCSV() {
  try {
    if (products.length === 0) {
      showNotification(
          window.t("inventory.notifications.noProductsExport"),
          "warning"
      );
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
        window.t("inventory.notifications.exportSuccess", {
          count: products.length,
        }),
        "success"
    );
  } catch (error) {
    console.error("Error exporting to CSV:", error);
    showNotification(window.t("common.error"), "error");
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
      showNotification(window.t("common.error"), "error");
      document.getElementById("process-import").disabled = true;
    }
  };

  reader.readAsText(file);
  window.LayoutManager.refreshInventoryBadge();
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
  tableHTML +=
      `<p style="margin-top:0.5rem; font-size:0.8rem; color:var(--text-secondary);">` +
      window.t("inventory.importModal.totalRows", { count: totalDataRows }) +
      `</p>`;

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
          window.t("inventory.notifications.missingColumns", {
            columns: missingHeaders.join(", "),
          }),
          "error"
      );
      return;
    }

    // Get import options
    const updateExisting = document.getElementById("override-existing").checked;
    const addNew = document.getElementById("add-new-products").checked;

    // Process data
    const processButton = document.getElementById("process-import");
    processButton.textContent = window.t("common.loading") || "Importing...";
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
        window.t("inventory.notifications.importComplete", {
          added: addedCount,
          updated: updatedCount,
          errors: errorCount,
        }),
        errorCount > 0 ? "warning" : "success"
    );
  } catch (error) {
    console.error("Error importing CSV:", error);
    showNotification(window.t("common.error"), "error");
  } finally {
    // Reset button
    const processButton = document.getElementById("process-import");
    if (processButton) {
      processButton.textContent =
          window.t("inventory.importModal.import") || "Import Products";
      processButton.disabled = false;
    }
  }

  window.LayoutManager.refreshInventoryBadge();
}

// Add pagination
function setupPagination(totalCount = 0) {
  // Update total counts if provided
  if (totalCount > 0) {
    totalProducts = totalCount;
    totalPages = Math.ceil(totalProducts / (currentProductPageSize || pageSize));
  }

  // Use the enhanced pagination
  setupEnhancedPagination();
}

// Utility function to compare SKUs for sorting
function compareSKU(a, b) {
  const skuA = (a.sku || "").toString().toLowerCase();
  const skuB = (b.sku || "").toString().toLowerCase();

  // Try to compare as numbers if both SKUs are numeric
  if (!isNaN(skuA) && !isNaN(skuB)) {
    return parseFloat(skuA) - parseFloat(skuB);
  }

  // Otherwise compare as strings
  return skuA.localeCompare(skuB);
}

async function getLowStockCount() {
  try {
    // This could be a specialized API call that just returns the count
    // For now, we'll make a request with a filter
    const options = {
      filters: {
        lowStock: true,
      },
    };

    const result = await window.api.getProducts(options);

    if (result && typeof result.totalCount === "number") {
      return result.totalCount;
    } else if (Array.isArray(result)) {
      return result.filter((product) => product.stock <= 5).length;
    }

    return 0;
  } catch (error) {
    console.error("Error getting low stock count:", error);
    return 0;
  }
}

// Extract the row rendering logic to a separate function
function renderProductRows(products, tableBody, searchTerm, filterField) {
  products.forEach((product) => {
    const row = document.createElement("tr");

    // Add checkbox column
    const checkboxCell = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "product-select";
    checkbox.dataset.id = product.id;
    checkbox.checked = selectedProductIds.includes(product.id);
    checkbox.addEventListener("change", function () {
      if (this.checked) {
        if (!selectedProductIds.includes(product.id)) {
          selectedProductIds.push(product.id);
        }
      } else {
        selectedProductIds = selectedProductIds.filter(
            (id) => id !== product.id
        );
      }
      updateBulkActionsUI();
    });
    checkboxCell.appendChild(checkbox);
    row.appendChild(checkboxCell);

    // SKU column - MOVED TO MATCH HTML ORDER
    const skuCell = document.createElement("td");
    skuCell.innerHTML = highlightSearchTerms(
        product.sku || "",
        filterField === "sku" || filterField === "all" ? searchTerm : ""
    );
    row.appendChild(skuCell);

    // Name column - MOVED TO MATCH HTML ORDER
    const nameCell = document.createElement("td");
    nameCell.innerHTML = highlightSearchTerms(
        product.name || "",
        filterField === "name" || filterField === "all" ? searchTerm : ""
    );
    row.appendChild(nameCell);

    // Category column
    const categoryCell = document.createElement("td");
    categoryCell.innerHTML = highlightSearchTerms(
        product.category || "",
        filterField === "category" || filterField === "all" ? searchTerm : ""
    );
    row.appendChild(categoryCell);

    // Price column
    const priceCell = document.createElement("td");
    priceCell.textContent = formatCurrency(product.price || 0);
    row.appendChild(priceCell);

    // Cost column
    const costCell = document.createElement("td");
    costCell.textContent = formatCurrency(product.cost || 0);
    row.appendChild(costCell);

    // ADDED: Profit column
    const profitCell = document.createElement("td");
    const profit = calculateProfit(product);
    profitCell.textContent = profit;
    row.appendChild(profitCell);

    // Stock column
    const stockCell = document.createElement("td");
    stockCell.textContent = product.stock || 0;
    if ((product.stock || 0) <= 5) {
      stockCell.className = "low-stock";
    }
    row.appendChild(stockCell);

    // Actions column
    const actionsCell = document.createElement("td");
    actionsCell.className = "actions";

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-sm edit-btn";
    editBtn.dataset.id = product.id;
    editBtn.textContent = window.t("common.edit") || "Edit";
    actionsCell.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-sm btn-danger delete-btn";
    deleteBtn.dataset.id = product.id;
    deleteBtn.textContent = window.t("common.delete") || "Delete";
    actionsCell.appendChild(deleteBtn);

    row.appendChild(actionsCell);

    // Add the completed row to the table
    tableBody.appendChild(row);
  });
}

// Calculate profit for a product
function calculateProfit(product) {
  if (!product.price || !product.cost) {
    return formatCurrency(0);
  }
  // Calculate the profit (selling price - cost)
  const profit = (product.price || 0) - (product.cost || 0);
  return formatCurrency(profit);
}

// Update product statistics
function updateProductStats() {
  // Use debouncing to avoid too many stats updates
  clearTimeout(window.statsUpdateTimeout);
  window.statsUpdateTimeout = setTimeout(async () => {
    try {
      console.log("Updating product stats...");
      const stats = await getTotalProductStats();
      
      // Update UI elements
      const totalProductsEl = document.getElementById("total-products");
      const inventoryValueEl = document.getElementById("inventory-value");
      const lowStockCountEl = document.getElementById("low-stock-count");

      if (totalProductsEl) totalProductsEl.textContent = stats.totalProducts;
      if (inventoryValueEl) inventoryValueEl.textContent = formatCurrency(stats.totalValue);
      if (lowStockCountEl) lowStockCountEl.textContent = stats.lowStockCount;

      // Update badge in sidebar if LayoutManager is available
      if (window.LayoutManager) {
        window.LayoutManager.updateInventoryBadge(stats.lowStockCount);
      }

      console.log("Stats updated successfully:", stats);
    } catch (error) {
      console.error("Error updating stats:", error);
      // Fallback to page-level stats
      const pageProducts = products.length;
      const pageValue = products.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0);
      const pageLowStock = products.filter((p) => (p.stock || 0) <= 5).length;

      const totalProductsEl = document.getElementById("total-products");
      const inventoryValueEl = document.getElementById("inventory-value");
      const lowStockCountEl = document.getElementById("low-stock-count");

      if (totalProductsEl) totalProductsEl.textContent = pageProducts;
      if (inventoryValueEl) inventoryValueEl.textContent = formatCurrency(pageValue);
      if (lowStockCountEl) lowStockCountEl.textContent = pageLowStock;
    }
  }, 300); // 300ms debounce
}
async function getTotalProductStats() {
  try {
    console.log("Getting product stats...");
    
    // First try to get stats using the dedicated stats API
    const statsResult = await window.api.getProducts({
      stats: true,
      statsOnly: true
    });

    if (statsResult && statsResult.stats) {
      console.log("Got stats from dedicated API:", statsResult.stats);
      return statsResult.stats;
    }

    // Second attempt: Try getting paginated results with stats
    const paginatedResult = await window.api.getProducts({
      page: 1,
      pageSize: 25, // Use reasonable page size
      stats: true
    });

    if (paginatedResult && paginatedResult.stats) {
      console.log("Got stats from paginated API:", paginatedResult.stats);
      return paginatedResult.stats;
    }

    // Final fallback: Use current loaded products for estimates
    console.log("Using current products for stats estimation");
    return {
      totalProducts: totalProducts || products.length,
      totalValue: products.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0),
      lowStockCount: products.filter((p) => (p.stock || 0) <= 5).length,
    };
  } catch (error) {
    console.error("Error getting product stats:", error);
    // Return safe default values
    return {
      totalProducts: totalProducts || products.length,
      totalValue: products.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0),
      lowStockCount: products.filter((p) => (p.stock || 0) <= 5).length,
    };
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

// Ensure any direct rendering also sorts by SKU first
function renderProducts(productsToRender, isPaginated = false, totalCount = 0) {
  const tableBody = document.getElementById("products-table-body");
  if (!tableBody) return;

  // Clear loading spinner if present
  tableBody.innerHTML = "";

  if (!productsToRender || productsToRender.length === 0) {
    // Empty state handling
    tableBody.innerHTML =
        '<tr><td colspan="9" style="text-align: center; padding: 24px;">' +
        (window.t("inventory.table.noProducts") || "No products found") +
        "</td></tr>";

    if (!isPaginated) {
      currentPage = 1;
      totalPages = 1;
      totalProducts = 0;
    }

    setupEnhancedPagination();
    return;
  }

  // Always sort by SKU before rendering
  productsToRender.sort(compareSKU);

  // Use total count from server if provided, otherwise use local length
  totalProducts = isPaginated ? totalCount : productsToRender.length;

  // If not paginated, calculate pagination locally
  if (!isPaginated) {
    totalPages = Math.ceil(totalProducts / (currentProductPageSize || pageSize));
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    // Get current page products for client-side pagination
    const startIndex = (currentPage - 1) * (currentProductPageSize || pageSize);
    const endIndex = Math.min(startIndex + (currentProductPageSize || pageSize), totalProducts);
    productsToRender = productsToRender.slice(startIndex, endIndex);
  } else {
    // For server-side pagination, recalculate totalPages
    totalPages = Math.ceil(totalProducts / (currentProductPageSize || pageSize));
  }

  // Get search term and filter for highlighting
  const searchElement = document.getElementById("product-search");
  const searchTerm = searchElement ? searchElement.value.toLowerCase().trim() : "";
  const filterElement = document.getElementById("search-filter");
  const filterField = filterElement ? filterElement.value : "all";

  // Display a loading indicator for large datasets
  if (totalProducts > 1000 && !tableBody.querySelector(".loading-indicator")) {
    const loadingRow = document.createElement("tr");
    loadingRow.className = "loading-indicator";
    loadingRow.innerHTML = `<td colspan="9" style="text-align: center; padding: 24px;">${
        window.t("inventory.loading") || "Loading products..."
    }</td>`;
    tableBody.appendChild(loadingRow);

    // Use setTimeout to prevent UI freezing
    setTimeout(() => {
      renderProductRows(productsToRender, tableBody, searchTerm, filterField);
      const loadingIndicator = tableBody.querySelector(".loading-indicator");
      if (loadingIndicator) {
        loadingIndicator.remove();
      }
      setupEnhancedPagination();
      updateSelectionState(productsToRender);
      updateBulkActionsUI();
    }, 10);
  } else {
    renderProductRows(productsToRender, tableBody, searchTerm, filterField);
    setupEnhancedPagination();
    updateSelectionState(productsToRender);
    updateBulkActionsUI();
  }

  window.LayoutManager.refreshInventoryBadge();
}
