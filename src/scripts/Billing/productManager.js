// Add this near the beginning of your billing.js initialization
if (window.api.subscribeToCollection) {
  // Subscribe to invoice changes
  window.api.subscribeToCollection("invoices", (changes) => {
    // Refresh all invoices when changes occur
    loadAllInvoices();
  });
}

// Load products from database
async function loadProducts() {
  try {
    products = await window.api.getProducts();
    renderProducts(products);
  } catch (error) {
    console.error("Error loading products:", error);
    productsListEl.innerHTML =
      '<div class="error">Failed to load products. Please try again.</div>';
  }
}

function fixProductCards() {
  // Function to wrap product details
  function wrapProductDetails(productItem) {
    // Skip if already processed
    if (productItem.querySelector(".product-details")) return;

    // Get all child elements except the button
    const button = productItem.querySelector(".add-to-cart");
    if (!button) return; // Skip if no button found

    const otherElements = Array.from(productItem.children).filter(
      (el) => el !== button
    );

    // Create a details container
    const detailsContainer = document.createElement("div");
    detailsContainer.className = "product-details";

    // Move other elements into the container
    otherElements.forEach((el) => {
      productItem.removeChild(el);
      detailsContainer.appendChild(el);
    });

    // Insert the container at the beginning
    productItem.insertBefore(detailsContainer, button);
  }

  // Process existing product items
  document.querySelectorAll(".product-item").forEach(wrapProductDetails);

  // Set up an observer to watch for new product items
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.classList.contains("product-item")) {
          wrapProductDetails(node);
        }

        // Check for product items added within the node
        if (node.nodeType === 1) {
          node.querySelectorAll(".product-item").forEach(wrapProductDetails);
        }
      });
    });
  });

  // Start observing the products list
  const productsListEl = document.getElementById("products-list");
  if (productsListEl) {
    observer.observe(productsListEl, { childList: true, subtree: true });
  }
}
// Format currency based on user settings
function formatCurrency(amount) {
  const currency = localStorage.getItem("currency") || "USD";
  const symbol = currency === "ILS" ? "₪" : "$";
  return `${symbol}${parseFloat(amount).toFixed(2)}`;
}
// Render products to the products grid
function renderProducts(productsToRender) {
  if (!productsListEl) return;
  productsListEl.innerHTML = "";

  if (productsToRender.length === 0) {
    productsListEl.innerHTML =
      '<div class="no-products">No products found</div>';
    return;
  }

  // Calculate pagination values
  const totalPages = Math.ceil(productsToRender.length / productsPerPage);

  // Make sure currentPage is within bounds
  if (currentPage < 1) currentPage = 1;
  if (currentPage > totalPages) currentPage = totalPages;

  // Calculate start and end indices for the current page
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = Math.min(
    startIndex + productsPerPage,
    productsToRender.length
  );

  // Only render products for the current page
  const productsForCurrentPage = productsToRender.slice(startIndex, endIndex);

  // Render the product cards
  productsForCurrentPage.forEach((product) => {
    const productEl = document.createElement("div");
    productEl.className = "product-item";
    productEl.innerHTML = `
      <div class="product-name">${product.name}</div>
      <div class="product-price">${formatCurrency(product.price)}</div>
      <div class="product-stock">In stock: ${product.stock}</div>
      <button class="btn add-to-cart" data-id="${
        product.id
      }">Add to Cart</button>
    `;

    productEl.querySelector(".add-to-cart").addEventListener("click", () => {
      addToCart(product);
    });

    productsListEl.appendChild(productEl);
  });

  // Create and append pagination controls
  createPaginationControls(productsToRender.length, totalPages);
}

// Add this new function to create pagination controls
function createPaginationControls(totalProducts, totalPages) {
  // Check if pagination already exists and remove it
  const existingPagination = document.querySelector(".pagination-controls");
  if (existingPagination) {
    existingPagination.remove();
  }

  // Create pagination container
  const paginationEl = document.createElement("div");
  paginationEl.className = "pagination-controls";

  // Add product count information
  const productCountEl = document.createElement("div");
  productCountEl.className = "product-count";
  productCountEl.textContent = `Showing ${Math.min(
    productsPerPage,
    totalProducts
  )} of ${totalProducts} products`;
  paginationEl.appendChild(productCountEl);

  // Create page controls
  const pageControlsEl = document.createElement("div");
  pageControlsEl.className = "page-controls";

  // Previous button
  const prevBtn = document.createElement("button");
  prevBtn.className = "btn page-btn prev-btn";
  prevBtn.textContent = "← Previous";
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderProducts(products); // Re-render with the same products but on a new page
    }
  });
  pageControlsEl.appendChild(prevBtn);

  // Page indicator
  const pageIndicator = document.createElement("span");
  pageIndicator.className = "page-indicator";
  pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
  pageControlsEl.appendChild(pageIndicator);

  // Next button
  const nextBtn = document.createElement("button");
  nextBtn.className = "btn page-btn next-btn";
  nextBtn.textContent = "Next →";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderProducts(products); // Re-render with the same products but on a new page
    }
  });
  pageControlsEl.appendChild(nextBtn);

  paginationEl.appendChild(pageControlsEl);

  // Insert pagination controls after the products list
  if (productsListEl && productsListEl.parentNode) {
    productsListEl.parentNode.insertBefore(
      paginationEl,
      productsListEl.nextSibling
    );
  }
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
// Filter products based on search input
function filterProducts() {
  const searchTerm = productSearchEl.value.toLowerCase();
  currentPage = 1; // Reset to first page on search

  if (!searchTerm) {
    renderProducts(products);
    return;
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm)) ||
      (product.category && product.category.toLowerCase().includes(searchTerm))
  );

  renderProducts(filteredProducts);
}

// Add these styles to your CSS
function addPaginationStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    .pagination-controls {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 20px;
      padding: 10px;
      background-color: #f8f8f8;
      border-radius: 8px;
      border: 1px solid #ddd;
    }
    
    .product-count {
      margin-bottom: 10px;
      color: #666;
      font-size: 0.9em;
    }
    
    .page-controls {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .page-btn {
      padding: 6px 12px;
      background-color: #fff;
      border: 1px solid #ccc;
      border-radius: 4px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .page-btn:hover:not([disabled]) {
      background-color: var(--primary-color);
      color: white;
    }
    
    .page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .page-indicator {
      font-weight: bold;
    }
    
  `;
  document.head.appendChild(styleElement);
}

function enhanceProductGrid() {
  // Add enhanced styling for product grid
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
      padding: 20px;
      overflow-y: auto;
      max-height: 65vh;
    }
    
    .product-item {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
      padding: 15px;
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
      border: 1px solid #e0e0e0;
    }
    
    .product-item:hover {
      transform: translateY(-5px);
      box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
      border-color: var(--primary-color);
    }
    
    .product-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      margin-bottom: 10px;
    }
    
    .product-name {
      font-weight: 600;
      font-size: 1.1rem;
      margin-bottom: 8px;
      color: var(--dark-color);
    }
    
    .product-price {
      font-weight: 700;
      font-size: 1.2rem;
      color: var(--primary-color);
      margin-bottom: 5px;
    }
    
    .product-stock {
      font-size: 0.85rem;
      color: var(--mid-gray);
      margin-bottom: auto;
    }
    
    .add-to-cart {
      width: 100%;
      padding: 8px;
      background-color: var(--primary-light);
      color: var(--primary-dark);
      font-weight: 500;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-top: auto;
    }
    
    .add-to-cart:hover {
      background-color: var(--primary-color);
      color: white;
    }
    
    @media (max-width: 768px) {
      .products-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 15px;
        padding: 15px;
      }
    }
  `;
  document.head.appendChild(styleElement);
}

function initProductPagination() {
  addPaginationStyles();
  // Reset to page 1 when doing a new search
  productSearchEl.addEventListener("input", () => {
    currentPage = 1;
  });
}

function fixProductCardHeight() {
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    /* Fix for products grid container */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
      align-items: start; /* Prevent stretching */
      height: auto; /* Don't force a specific height */
      max-height: 65vh; /* Limit maximum height */
    }
    
    /* Fix for product cards */
    .product-item {
      height: auto; /* Don't stretch */
      min-height: 180px; /* Minimum reasonable height */
      max-height: 250px; /* Maximum reasonable height */
      display: flex;
      flex-direction: column;
    }
    
    /* Structure the content inside product cards */
    .product-details {
      flex: 0 1 auto; /* Don't grow, but can shrink */
      margin-bottom: 15px;
    }
    
    /* Keep the add to cart button at the bottom */
    .add-to-cart {
      margin-top: auto; /* Push to bottom of container */
    }
    
    /* For single product view case */
    @media (min-width: 768px) {
      /* When only one product is visible */
      .products-grid:only-child {
        height: auto;
        align-content: start;
      }
    }
  `;
  document.head.appendChild(styleElement);

  console.log("Applied product card height fix");
}

function fixProductPageSpacing() {
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    /* Main container adjustments */
    .product-selection {
      display: flex;
      flex-direction: column;
      height: auto;
      padding-bottom: 0;
    }
    
    /* Products grid container */
    .products-grid {
      flex: 0 1 auto; /* Don't allow excessive growth */
      margin-bottom: 20px; /* Consistent spacing to pagination */
      min-height: 200px; /* Ensure minimum reasonable height */
      max-height: 60vh; /* Limit maximum height */
    }
    
    /* Pagination section */
    .pagination-controls {
      margin-top: 10px; /* Reduced top margin */
      margin-bottom: 10px; /* Add bottom margin */
    }
    
    /* Product count text */
    .showing-products-count {
      margin: 5px 0; /* Tighten up margins */
      padding: 5px;
      color: #666;
      font-size: 0.9em;
      text-align: center;
    }
    
    /* Page navigation row */
    .page-navigation {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 5px 0;
    }
    
    /* When only a few products are shown */
    @media (min-height: 768px) {
      .product-selection {
        justify-content: flex-start; /* Align content to top */
      }
      
      /* When few products are visible, don't push pagination to bottom of screen */
      .products-grid:only-child + .pagination-controls,
      .products-grid:nth-last-child(2) + .pagination-controls {
        margin-top: 15px;
      }
    }
  `;
  document.head.appendChild(styleElement);

  console.log("Applied product page spacing fix");
}
