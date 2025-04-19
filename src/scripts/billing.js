// // Global variables
// let products = [];
// let cart = [];
// const TAX_RATE = 0;
// let currentPage = 1;
// const productsPerPage = 1; // Adjust this number based on your UI
// // DOM Elements
// const productsListEl = document.getElementById("products-list");
// const productSearchEl = document.getElementById("product-search");
// const cartItemsEl = document.getElementById("cart-items");
// const subtotalEl = document.getElementById("subtotal");
// const taxEl = document.getElementById("tax");
// const totalEl = document.getElementById("total");
// const invoiceDateEl = document.getElementById("invoice-date");
// const customerNameEl = document.getElementById("customer-name");
// const completeSaleBtn = document.getElementById("complete-sale");
// const clearInvoiceBtn = document.getElementById("clear-invoice");

// // Modal elements
// const receiptModal = document.getElementById("receipt-modal");
// const closeModalBtn = document.querySelector(".close");
// const receiptContainerEl = document.getElementById("receipt-container");
// const printReceiptBtn = document.getElementById("print-receipt");
// const emailReceiptBtn = document.getElementById("email-receipt");
// const newSaleBtn = document.getElementById("new-sale");
// // Add this to your renderer JS files (e.g., inventory.js, billing.js)

// // // Create or find sync status element
// // let syncStatusEl = document.getElementById("sync-status");
// // if (!syncStatusEl) {
// //   syncStatusEl = document.createElement("div");
// //   syncStatusEl.id = "sync-status";
// //   syncStatusEl.classList.add("sync-status");
// //   document.body.appendChild(syncStatusEl);
// // }

// // // Listen for sync events
// // window.api.onBackgroundSyncStarted(() => {
// //   syncStatusEl.textContent = "Syncing data...";
// //   syncStatusEl.classList.remove("hidden", "success", "error");
// //   syncStatusEl.classList.add("active");
// // });

// // window.api.onBackgroundSyncCompleted((data) => {
// //   if (data.success) {
// //     syncStatusEl.textContent = `Sync completed at ${new Date(
// //       data.timestamp
// //     ).toLocaleTimeString()}`;
// //     syncStatusEl.classList.remove("active", "error");
// //     syncStatusEl.classList.add("success");

// //     // Hide after a few seconds
// //     setTimeout(() => {
// //       syncStatusEl.classList.add("hidden");
// //     }, 3000);
// //   } else {
// //     syncStatusEl.textContent = "Sync failed. Will retry later.";
// //     syncStatusEl.classList.remove("active", "success");
// //     syncStatusEl.classList.add("error");
// //   }
// // });

// // window.api.onBackgroundSyncProgress((data) => {
// //   syncStatusEl.textContent = `Syncing ${data.collection}: ${data.processed}/${data.total}`;
// // });
// // Initialize the page

// // Add this near the beginning of your billing.js initialization
// if (window.api.subscribeToCollection) {
//   // Subscribe to invoice changes
//   window.api.subscribeToCollection("invoices", (changes) => {
//     // Refresh all invoices when changes occur
//     loadAllInvoices();
//   });
// }

// // Add this to the end of your JavaScript file or just before initPage()
// function fixKeyboardShortcuts() {
//   // Create a global listener that comes before other handlers
//   document.addEventListener(
//     "keydown",
//     function (event) {
//       // Map of function keys to their handler functions
//       const functionKeyHandlers = {
//         F1: function () {
//           addMiscellaneousItem();
//         },
//         F2: function () {
//           processReturn();
//         },
//         F3: function () {
//           if (!document.getElementById("complete-sale").disabled) {
//             completeSale();
//           }
//         },
//         F5: function () {
//           removeSelectedItem();
//         },
//         F6: function () {
//           showProductDetails();
//         },
//         F7: function () {
//           clearCart();
//         },
//         F8: function () {
//           if (receiptModal.style.display === "block") {
//             printReceipt();
//           }
//         },
//         F9: function () {
//           increaseQuantity();
//         },
//         F10: function () {
//           decreaseQuantity();
//         },
//         F11: function () {
//           showPreviousInvoice();
//         },
//         F12: function () {
//           showNextInvoice();
//         },
//       };

//       // Special handling for non-function keys
//       const specialKeyHandlers = {
//         Delete: function () {
//           clearCart();
//         },
//         "/": function () {
//           document.getElementById("product-search").focus();
//         },
//         d: function () {
//           if (!event.ctrlKey && !event.altKey && !event.shiftKey) {
//             showDiscountModal();
//           }
//         },
//         b: function () {
//           if (!event.ctrlKey && !event.altKey && !event.shiftKey) {
//             const barcodeInput = document.getElementById("barcode-input");
//             if (barcodeInput) barcodeInput.focus();
//           }
//         },
//       };

//       // Check if it's a function key or special key we handle
//       const handler =
//         functionKeyHandlers[event.key] ||
//         specialKeyHandlers[event.key.toLowerCase()];

//       if (handler) {
//         // Skip text inputs except for function keys
//         if (
//           event.key.startsWith("F") ||
//           !(
//             event.target.tagName === "INPUT" ||
//             event.target.tagName === "TEXTAREA"
//           )
//         ) {
//           // Check for view mode restrictions
//           if (isViewingInvoice && !isEditingInvoice) {
//             // ONLY allow these specific shortcuts in view mode
//             if (
//               event.key === "F11" ||
//               event.key === "F12" ||
//               event.key === "F6" ||
//               event.key === "F8" ||
//               event.key === "/" ||
//               event.key.toLowerCase() === "b"
//             ) {
//               event.preventDefault();
//               handler();
//             } else {
//               // Block all other shortcuts in view mode
//               event.preventDefault();
//               alert("Please click 'Edit' first before making changes.");
//             }
//           } else {
//             // Not in view mode or in edit mode - all shortcuts work
//             event.preventDefault();
//             handler();
//           }
//         }
//       }
//     },
//     true
//   ); // Use capturing phase to ensure this runs first

//   console.log("Keyboard shortcuts fixed");
// }

// async function initPage() {
//   const hasPermission = await checkPermission();
//   if (!hasPermission) return;
//   // Set current date
//   const today = new Date();
//   invoiceDateEl.textContent = today.toLocaleDateString();

//   document.getElementById("current-date").textContent =
//     today.toLocaleDateString();
//   // Update connection status
//   updateConnectionStatus();

//   // Load products
//   await loadProducts();

//   // Add event listeners
//   productSearchEl.addEventListener("input", filterProducts);
//   clearInvoiceBtn.addEventListener("click", clearCart);
//   completeSaleBtn.addEventListener("click", completeSale);

//   // Modal event listeners
//   closeModalBtn.addEventListener("click", () => {
//     receiptModal.style.display = "none";
//   });

//   printReceiptBtn.addEventListener("click", printReceipt);
//   emailReceiptBtn.addEventListener("click", emailReceipt);
//   newSaleBtn.addEventListener("click", () => {
//     receiptModal.style.display = "none";
//     clearCart();

//     // Update navigation status
//     isViewingInvoice = false;
//     isEditingInvoice = false;

//     // Remove invoice view indicator if it exists
//     const indicator = document.getElementById("invoice-view-indicator");
//     if (indicator) {
//       indicator.remove();
//     }
//   });

//   // Close modal when clicking outside
//   window.addEventListener("click", (event) => {
//     if (event.target === receiptModal) {
//       receiptModal.style.display = "none";
//     }
//   });
// }
// // Add this to billing.js, inventory.js, and reports.js
// async function handleLogout() {
//   try {
//     await window.api.logoutUser();
//     window.location.href = "login.html"; // Same directory path
//   } catch (error) {
//     console.error("Logout error:", error);
//   }
// }

// // Load products from database
// async function loadProducts() {
//   try {
//     products = await window.api.getProducts();
//     renderProducts(products);
//   } catch (error) {
//     console.error("Error loading products:", error);
//     productsListEl.innerHTML =
//       '<div class="error">Failed to load products. Please try again.</div>';
//   }
// }
// function fixProductCards() {
//   // Function to wrap product details
//   function wrapProductDetails(productItem) {
//     // Skip if already processed
//     if (productItem.querySelector(".product-details")) return;

//     // Get all child elements except the button
//     const button = productItem.querySelector(".add-to-cart");
//     if (!button) return; // Skip if no button found

//     const otherElements = Array.from(productItem.children).filter(
//       (el) => el !== button
//     );

//     // Create a details container
//     const detailsContainer = document.createElement("div");
//     detailsContainer.className = "product-details";

//     // Move other elements into the container
//     otherElements.forEach((el) => {
//       productItem.removeChild(el);
//       detailsContainer.appendChild(el);
//     });

//     // Insert the container at the beginning
//     productItem.insertBefore(detailsContainer, button);
//   }

//   // Process existing product items
//   document.querySelectorAll(".product-item").forEach(wrapProductDetails);

//   // Set up an observer to watch for new product items
//   const observer = new MutationObserver((mutations) => {
//     mutations.forEach((mutation) => {
//       mutation.addedNodes.forEach((node) => {
//         if (node.nodeType === 1 && node.classList.contains("product-item")) {
//           wrapProductDetails(node);
//         }

//         // Check for product items added within the node
//         if (node.nodeType === 1) {
//           node.querySelectorAll(".product-item").forEach(wrapProductDetails);
//         }
//       });
//     });
//   });

//   // Start observing the products list
//   const productsListEl = document.getElementById("products-list");
//   if (productsListEl) {
//     observer.observe(productsListEl, { childList: true, subtree: true });
//   }
// }

// // Render products to the products grid
// function renderProducts(productsToRender) {
//   if (!productsListEl) return;
//   productsListEl.innerHTML = "";

//   if (productsToRender.length === 0) {
//     productsListEl.innerHTML =
//       '<div class="no-products">No products found</div>';
//     return;
//   }

//   // Calculate pagination values
//   const totalPages = Math.ceil(productsToRender.length / productsPerPage);

//   // Make sure currentPage is within bounds
//   if (currentPage < 1) currentPage = 1;
//   if (currentPage > totalPages) currentPage = totalPages;

//   // Calculate start and end indices for the current page
//   const startIndex = (currentPage - 1) * productsPerPage;
//   const endIndex = Math.min(
//     startIndex + productsPerPage,
//     productsToRender.length
//   );

//   // Only render products for the current page
//   const productsForCurrentPage = productsToRender.slice(startIndex, endIndex);

//   // Render the product cards
//   productsForCurrentPage.forEach((product) => {
//     const productEl = document.createElement("div");
//     productEl.className = "product-item";
//     productEl.innerHTML = `
//       <div class="product-name">${product.name}</div>
//       <div class="product-price">$${product.price.toFixed(2)}</div>
//       <div class="product-stock">In stock: ${product.stock}</div>
//       <button class="btn add-to-cart" data-id="${
//         product.id
//       }">Add to Cart</button>
//     `;

//     productEl.querySelector(".add-to-cart").addEventListener("click", () => {
//       addToCart(product);
//     });

//     productsListEl.appendChild(productEl);
//   });

//   // Create and append pagination controls
//   createPaginationControls(productsToRender.length, totalPages);
// }

// // Add this new function to create pagination controls
// function createPaginationControls(totalProducts, totalPages) {
//   // Check if pagination already exists and remove it
//   const existingPagination = document.querySelector(".pagination-controls");
//   if (existingPagination) {
//     existingPagination.remove();
//   }

//   // Create pagination container
//   const paginationEl = document.createElement("div");
//   paginationEl.className = "pagination-controls";

//   // Add product count information
//   const productCountEl = document.createElement("div");
//   productCountEl.className = "product-count";
//   productCountEl.textContent = `Showing ${Math.min(
//     productsPerPage,
//     totalProducts
//   )} of ${totalProducts} products`;
//   paginationEl.appendChild(productCountEl);

//   // Create page controls
//   const pageControlsEl = document.createElement("div");
//   pageControlsEl.className = "page-controls";

//   // Previous button
//   const prevBtn = document.createElement("button");
//   prevBtn.className = "btn page-btn prev-btn";
//   prevBtn.textContent = "← Previous";
//   prevBtn.disabled = currentPage === 1;
//   prevBtn.addEventListener("click", () => {
//     if (currentPage > 1) {
//       currentPage--;
//       renderProducts(products); // Re-render with the same products but on a new page
//     }
//   });
//   pageControlsEl.appendChild(prevBtn);

//   // Page indicator
//   const pageIndicator = document.createElement("span");
//   pageIndicator.className = "page-indicator";
//   pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
//   pageControlsEl.appendChild(pageIndicator);

//   // Next button
//   const nextBtn = document.createElement("button");
//   nextBtn.className = "btn page-btn next-btn";
//   nextBtn.textContent = "Next →";
//   nextBtn.disabled = currentPage === totalPages;
//   nextBtn.addEventListener("click", () => {
//     if (currentPage < totalPages) {
//       currentPage++;
//       renderProducts(products); // Re-render with the same products but on a new page
//     }
//   });
//   pageControlsEl.appendChild(nextBtn);

//   paginationEl.appendChild(pageControlsEl);

//   // Insert pagination controls after the products list
//   if (productsListEl && productsListEl.parentNode) {
//     productsListEl.parentNode.insertBefore(
//       paginationEl,
//       productsListEl.nextSibling
//     );
//   }
// }

// // Add these styles to your CSS
// function addPaginationStyles() {
//   const styleElement = document.createElement("style");
//   styleElement.textContent = `
//     .pagination-controls {
//       display: flex;
//       flex-direction: column;
//       align-items: center;
//       margin-top: 20px;
//       padding: 10px;
//       background-color: #f8f8f8;
//       border-radius: 8px;
//       border: 1px solid #ddd;
//     }

//     .product-count {
//       margin-bottom: 10px;
//       color: #666;
//       font-size: 0.9em;
//     }

//     .page-controls {
//       display: flex;
//       align-items: center;
//       gap: 15px;
//     }

//     .page-btn {
//       padding: 6px 12px;
//       background-color: #fff;
//       border: 1px solid #ccc;
//       border-radius: 4px;
//       cursor: pointer;
//       transition: background-color 0.2s;
//     }

//     .page-btn:hover:not([disabled]) {
//       background-color: var(--primary-color);
//       color: white;
//     }

//     .page-btn:disabled {
//       opacity: 0.5;
//       cursor: not-allowed;
//     }

//     .page-indicator {
//       font-weight: bold;
//     }

//   `;
//   document.head.appendChild(styleElement);
// }

// function enhanceProductGrid() {
//   // Add enhanced styling for product grid
//   const styleElement = document.createElement("style");
//   styleElement.textContent = `
//     .products-grid {
//       display: grid;
//       grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
//       gap: 20px;
//       padding: 20px;
//       overflow-y: auto;
//       max-height: 65vh;
//     }

//     .product-item {
//       display: flex;
//       flex-direction: column;
//       height: 100%;
//       background-color: white;
//       border-radius: 12px;
//       box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
//       padding: 15px;
//       transition: transform 0.2s, box-shadow 0.2s;
//       position: relative;
//       border: 1px solid #e0e0e0;
//     }

//     .product-item:hover {
//       transform: translateY(-5px);
//       box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
//       border-color: var(--primary-color);
//     }

//     .product-details {
//       flex: 1;
//       display: flex;
//       flex-direction: column;
//       margin-bottom: 10px;
//     }

//     .product-name {
//       font-weight: 600;
//       font-size: 1.1rem;
//       margin-bottom: 8px;
//       color: var(--dark-color);
//     }

//     .product-price {
//       font-weight: 700;
//       font-size: 1.2rem;
//       color: var(--primary-color);
//       margin-bottom: 5px;
//     }

//     .product-stock {
//       font-size: 0.85rem;
//       color: var(--mid-gray);
//       margin-bottom: auto;
//     }

//     .add-to-cart {
//       width: 100%;
//       padding: 8px;
//       background-color: var(--primary-light);
//       color: var(--primary-dark);
//       font-weight: 500;
//       border: none;
//       border-radius: 6px;
//       cursor: pointer;
//       transition: background-color 0.2s;
//       margin-top: auto;
//     }

//     .add-to-cart:hover {
//       background-color: var(--primary-color);
//       color: white;
//     }

//     @media (max-width: 768px) {
//       .products-grid {
//         grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
//         gap: 15px;
//         padding: 15px;
//       }
//     }
//   `;
//   document.head.appendChild(styleElement);
// }

// function initProductPagination() {
//   addPaginationStyles();
//   // Reset to page 1 when doing a new search
//   productSearchEl.addEventListener("input", () => {
//     currentPage = 1;
//   });
// }

// // Filter products based on search input
// function filterProducts() {
//   const searchTerm = productSearchEl.value.toLowerCase();
//   currentPage = 1; // Reset to first page on search

//   if (!searchTerm) {
//     renderProducts(products);
//     return;
//   }

//   const filteredProducts = products.filter(
//     (product) =>
//       product.name.toLowerCase().includes(searchTerm) ||
//       (product.sku && product.sku.toLowerCase().includes(searchTerm)) ||
//       (product.category && product.category.toLowerCase().includes(searchTerm))
//   );

//   renderProducts(filteredProducts);
// }

// // Add product to cart
// function addToCart(product) {
//   // Check if product is already in cart
//   const existingItem = cart.find((item) => item.id === product.id);

//   if (existingItem) {
//     existingItem.quantity += 1;
//   } else {
//     cart.push({
//       id: product.id,
//       name: product.name,
//       price: product.price,
//       cost: product.cost || 0,
//       quantity: 1,
//       total: product.price,
//     });
//   }

//   renderCart();
//   updateTotals();
// }
// let selectedItems = []; // Array to track selected item indices

// // Render cart items
// function renderCart() {
//   if (cart.length === 0) {
//     cartItemsEl.innerHTML =
//       '<tr class="empty-cart"><td colspan="6">No items added yet</td></tr>';
//     completeSaleBtn.disabled = true;
//     return;
//   }

//   cartItemsEl.innerHTML = "";
//   completeSaleBtn.disabled = false;

//   cart.forEach((item, index) => {
//     const cartItemRow = document.createElement("tr");

//     // Add selected class if this item is selected
//     if (selectedItems.includes(index) || index === selectedCartIndex) {
//       cartItemRow.classList.add("selected-row");
//     }

//     // Calculate display details as before...
//     let displayPrice = Math.abs(item.price);
//     let displayTotal = Math.abs(item.price * item.quantity);
//     let discountInfo = "";

//     if (item.discount) {
//       // Discount calculations here...
//     } else {
//       discountInfo = `$${displayPrice.toFixed(2)}`;
//     }

//     const isRefund = item.price < 0;

//     // Add checkbox column and refund indicator
//     cartItemRow.innerHTML = `
//       <td>
//         <input type="checkbox" class="item-select" data-index="${index}" ${
//       selectedItems.includes(index) ? "checked" : ""
//     }>
//       </td>
//       <td>${item.name}${isRefund ? " (Refund)" : ""}${
//       item.isMiscellaneous ? " (Misc)" : ""
//     }</td>
//       <td>${discountInfo}</td>
//       <td>
//         <button class="btn quantity-btn" data-action="decrease" data-index="${index}">-</button>
//         <span class="quantity">${item.quantity}</span>
//         <button class="btn quantity-btn" data-action="increase" data-index="${index}">+</button>
//       </td>
//       <td>$${Math.abs(displayTotal).toFixed(2)}</td>
//       <td>
//         <button class="btn remove-btn" data-index="${index}">Remove</button>
//       </td>
//     `;

//     cartItemsEl.appendChild(cartItemRow);
//   });

//   // Add event listeners for checkboxes
//   document.querySelectorAll(".item-select").forEach((checkbox) => {
//     checkbox.addEventListener("change", (event) => {
//       const index = parseInt(event.target.dataset.index);
//       if (event.target.checked) {
//         if (!selectedItems.includes(index)) {
//           selectedItems.push(index);
//         }
//       } else {
//         selectedItems = selectedItems.filter((i) => i !== index);
//       }

//       // Update UI to show selected items
//       document.querySelectorAll("#cart-items tr").forEach((row, idx) => {
//         if (selectedItems.includes(idx)) {
//           row.classList.add("selected-row");
//         } else if (idx !== selectedCartIndex) {
//           row.classList.remove("selected-row");
//         }
//       });
//     });
//   });
// }

// // Handle quantity change
// function handleQuantityChange(event) {
//   const index = parseInt(event.target.dataset.index);
//   const action = event.target.dataset.action;

//   if (action === "increase") {
//     cart[index].quantity += 1;
//   } else if (action === "decrease" && cart[index].quantity > 1) {
//     cart[index].quantity -= 1;
//   }

//   renderCart();
//   updateTotals();
// }

// // Handle remove item
// function handleRemoveItem(event) {
//   const index = parseInt(event.target.dataset.index);
//   cart.splice(index, 1);

//   renderCart();
//   updateTotals();
// }

// // Update totals (subtotal, tax, total)
// function updateTotals() {
//   const subtotal = cart.reduce(
//     (sum, item) => sum + item.price * item.quantity,
//     0
//   );
//   const totalCost = cart.reduce(
//     (sum, item) => sum + item.cost * item.quantity,
//     0
//   );
//   const profit = subtotal - totalCost;
//   const tax = subtotal * TAX_RATE;
//   const total = subtotal + tax;

//   subtotalEl.textContent = `${subtotal.toFixed(2)}`;
//   taxEl.textContent = `${tax.toFixed(2)}`;
//   totalEl.textContent = `${total.toFixed(2)}`;
// }

// // Clear cart
// function clearCart() {
//   cart = [];
//   renderCart();
//   updateTotals();
//   customerNameEl.value = "";
//   document.getElementById("complete-sale").textContent = "Complete Sale";
// }

// // Complete sale
// // Fix for the completeSale function to update the invoices array
// async function completeSale() {
//   if (cart.length === 0) return;

//   try {
//     const invoiceData = {
//       items: cart,
//       customer: customerNameEl.value || "Guest Customer",
//       subtotal: parseFloat(subtotalEl.textContent.replace("$", "")),
//       tax: parseFloat(taxEl.textContent.replace("$", "")),
//       total: parseFloat(totalEl.textContent.replace("$", "")),
//       date: new Date().toISOString(),
//     };

//     // Save invoice to database
//     const invoiceId = await window.api.createInvoice(invoiceData);

//     // *** Add this code to update the in-memory invoices array ***
//     const newInvoice = {
//       ...invoiceData,
//       id: invoiceId,
//       createdAt: new Date().toISOString(),
//     };

//     // Add the new invoice to the allInvoices array
//     allInvoices.unshift(newInvoice); // Add to beginning (newest first)

//     // Reset the current index to point to the new invoice
//     currentInvoiceIndex = 0;
//     // *** End of new code ***

//     // Generate receipt HTML
//     const receiptHtml = generateReceiptHtml({
//       ...invoiceData,
//       id: invoiceId,
//     });

//     // Display receipt in modal
//     receiptContainerEl.innerHTML = receiptHtml;
//     receiptModal.style.display = "block";
//   } catch (error) {
//     console.error("Error completing sale:", error);
//     alert("Failed to complete sale. Please try again.");
//   }
// }

// // Generate receipt HTML
// function generateReceiptHtml(invoice) {
//   const itemsHtml = invoice.items
//     .map(
//       (item) => `
//     <tr>
//       <td>${item.name}</td>
//       <td>${item.quantity}</td>
//       <td>$${item.price.toFixed(2)}</td>
//       <td>$${(item.price * item.quantity).toFixed(2)}</td>
//     </tr>
//   `
//     )
//     .join("");

//   return `
//     <div class="receipt-header">
//       <h2>BenchPOS</h2>
//       <p>123 Main Street, Anytown, USA</p>
//       <p>Tel: (555) 123-4567</p>
//     </div>

//     <div class="receipt-info">
//       <p><strong>Receipt #:</strong> ${invoice.id}</p>
//       <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleString()}</p>
//       <p><strong>Customer:</strong> ${invoice.customer}</p>
//     </div>

//     <table class="receipt-items">
//       <thead>
//         <tr>
//           <th>Item</th>
//           <th>Qty</th>
//           <th>Price</th>
//           <th>Total</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${itemsHtml}
//       </tbody>
//       <tfoot>
//         <tr>
//           <td colspan="3">Subtotal</td>
//           <td>$${invoice.subtotal.toFixed(2)}</td>
//         </tr>
//         <tr>
//           <td colspan="3">Tax (0)</td>
//           <td>$${invoice.tax.toFixed(2)}</td>
//         </tr>
//         <tr class="total-row">
//           <td colspan="3">Total</td>
//           <td>$${invoice.total.toFixed(2)}</td>
//         </tr>
//       </tfoot>
//     </table>

//     <div class="receipt-footer">
//       <p>Thank you for your purchase!</p>
//     </div>
//   `;
// }

// // Add this to billing.js, inventory.js, reports.js files
// async function checkPermission() {
//   try {
//     const user = await window.api.getCurrentUser();
//     if (!user) {
//       // Not logged in - redirect to login
//       window.location.href = "login.html";
//       return false;
//     }

//     const userNameElement = document.getElementById("current-user-name");
//     if (userNameElement) {
//       userNameElement.textContent = user.name || "User";
//     }
//     // Check role-based permissions
//     if (window.location.pathname.includes("billing.html")) {
//       // All roles can access billing (new sales)
//       return true;
//     } else if (window.location.pathname.includes("inventory.html")) {
//       // Only managers and admins can access inventory
//       if (user.role === "cashier") {
//         alert("You don't have permission to access the inventory page.");
//         window.location.href = "billing.html"; // Redirect cashiers to billing
//         return false;
//       }
//     } else if (window.location.pathname.includes("reports.html")) {
//       // Only admins can access reports
//       if (user.role !== "admin") {
//         alert("You don't have permission to access the reports page.");
//         window.location.href = "billing.html"; // Redirect to billing
//         return false;
//       }
//     }

//     return true;
//   } catch (error) {
//     console.error("Permission check error:", error);
//     window.location.href = "login.html";
//     return false;
//   }
// }
// function initBarcodeFeature() {
//   // Create a barcode entry area
//   const searchBar = document.querySelector(".search-bar");
//   const barcodeForm = document.createElement("div");
//   barcodeForm.className = "barcode-form";
//   barcodeForm.innerHTML = `
//     <h3>Barcode Entry <span class="shortcut-indicator">(B)</span></h3>
//     <div class="barcode-input-container">
//       <input type="text" id="barcode-input" placeholder="Scan or type barcode..." autofocus>
//       <button type="button" id="barcode-submit" class="btn primary-btn">Add Item</button>
//     </div>
//     <div id="barcode-status"></div>
//   `;

//   // Insert the form before the products list
//   productsListEl.parentNode.insertBefore(barcodeForm, productsListEl);

//   // Get the barcode input element
//   const barcodeInput = document.getElementById("barcode-input");
//   const barcodeSubmit = document.getElementById("barcode-submit");

//   // Set up global barcode capture that works anywhere on the page
//   setupGlobalBarcodeCapture(barcodeInput);

//   // Focus the barcode input on page load
//   setTimeout(() => {
//     if (barcodeInput) {
//       barcodeInput.focus();
//       console.log("Barcode input field focused on page load");
//     }
//   }, 500);

//   // Listen for Enter key or submit button
//   barcodeInput.addEventListener("keydown", function (event) {
//     if (event.key === "Enter") {
//       processBarcodeInput();
//       // Keep focus after processing
//       setTimeout(() => barcodeInput.focus(), 10);
//     }

//     // Allow F11 and F12 to pass through even when focused
//     if (event.key === "F11" || event.key === "F12") {
//       // Pass the event to the global handler
//       handleKeyboardShortcut(event);
//     }
//   });

//   barcodeSubmit.addEventListener("click", function () {
//     processBarcodeInput();
//     // Refocus on the input after processing
//     setTimeout(() => barcodeInput.focus(), 10);
//   });

//   // Add keyboard shortcut for focusing barcode input (B key)
//   document.addEventListener("keydown", function (event) {
//     // B key to focus the barcode input (from anywhere)
//     if (
//       event.key === "b" &&
//       !event.ctrlKey &&
//       !event.altKey &&
//       !event.shiftKey
//     ) {
//       // Only if not already in an input
//       if (
//         document.activeElement.tagName !== "INPUT" &&
//         document.activeElement.tagName !== "TEXTAREA"
//       ) {
//         event.preventDefault();
//         barcodeInput.focus();
//       }
//     }
//   });

//   // Also make sure to refocus after adding an item to cart
//   const originalAddToCart = addToCart;
//   addToCart = function (product) {
//     // Call the original function
//     originalAddToCart(product);

//     // Refocus the barcode input after adding to cart
//     setTimeout(() => {
//       if (barcodeInput) barcodeInput.focus();
//     }, 100);
//   };

//   // Add CSS for the barcode form
//   const styleElement = document.createElement("style");
//   styleElement.textContent = `
//     .barcode-form {
//       margin-bottom: 20px;
//       padding: 15px;
//       background-color: #f8f8f8;
//       border-radius: 8px;
//       border: 1px solid #ddd;
//     }

//     .barcode-form h3 {
//       margin-top: 0;
//       margin-bottom: 10px;
//       color: var(--primary-color);
//       font-size: 16px;
//     }

//     .barcode-input-container {
//       display: flex;
//       gap: 10px;
//     }

//     #barcode-input {
//       flex: 1;
//       padding: 10px;
//       border: 2px solid var(--primary-color);
//       border-radius: 4px;
//       font-size: 16px;
//       background-color: #fff;
//     }

//     #barcode-input:focus {
//       outline: none;
//       box-shadow: 0 0 0 3px rgba(var(--primary-rgb, 0, 123, 255), 0.25);
//     }

//     #barcode-status {
//       margin-top: 10px;
//       font-weight: bold;
//     }

//     /* Highlight the barcode input when active to make it obvious where the focus is */
//     #barcode-input:focus {
//       background-color: #fff8e0;
//     }

//     /* Style for the barcode capturing notification */
//     .barcode-capture {
//       position: fixed;
//       bottom: 20px;
//       left: 50%;
//       transform: translateX(-50%);
//       background-color: rgba(0, 0, 0, 0.8);
//       color: white;
//       padding: 10px 20px;
//       border-radius: 30px;
//       z-index: 1000;
//       display: none;
//       font-weight: bold;
//       animation: fadeInOut 0.5s ease;
//     }

//     @keyframes fadeInOut {
//       0% { opacity: 0; }
//       100% { opacity: 1; }
//     }
//   `;
//   document.head.appendChild(styleElement);
// }
// function fixProductCardHeight() {
//   const styleElement = document.createElement("style");
//   styleElement.textContent = `
//     /* Fix for products grid container */
//     .products-grid {
//       display: grid;
//       grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
//       gap: 20px;
//       align-items: start; /* Prevent stretching */
//       height: auto; /* Don't force a specific height */
//       max-height: 65vh; /* Limit maximum height */
//     }

//     /* Fix for product cards */
//     .product-item {
//       height: auto; /* Don't stretch */
//       min-height: 180px; /* Minimum reasonable height */
//       max-height: 250px; /* Maximum reasonable height */
//       display: flex;
//       flex-direction: column;
//     }

//     /* Structure the content inside product cards */
//     .product-details {
//       flex: 0 1 auto; /* Don't grow, but can shrink */
//       margin-bottom: 15px;
//     }

//     /* Keep the add to cart button at the bottom */
//     .add-to-cart {
//       margin-top: auto; /* Push to bottom of container */
//     }

//     /* For single product view case */
//     @media (min-width: 768px) {
//       /* When only one product is visible */
//       .products-grid:only-child {
//         height: auto;
//         align-content: start;
//       }
//     }
//   `;
//   document.head.appendChild(styleElement);

//   console.log("Applied product card height fix");
// }
// // Set up global barcode capture that works anywhere on the page
// // Set up global barcode capture that works anywhere on the page
// function setupGlobalBarcodeCapture(barcodeInput) {
//   // Create a hidden input that will act as our "catch-all" for barcode input
//   const catchAllInput = document.createElement("input");
//   catchAllInput.type = "text";
//   catchAllInput.style.position = "absolute";
//   catchAllInput.style.top = "-100px"; // Hide it off-screen
//   catchAllInput.style.left = "-100px";
//   catchAllInput.style.opacity = "0";
//   document.body.appendChild(catchAllInput);

//   // The hidden input always has focus unless specifically interacting with another input
//   catchAllInput.focus();

//   // When anything other than form controls gets clicked, refocus the hidden input
//   document.addEventListener("click", (event) => {
//     if (
//       event.target.tagName !== "INPUT" &&
//       event.target.tagName !== "TEXTAREA" &&
//       event.target.tagName !== "SELECT" &&
//       event.target.tagName !== "BUTTON"
//     ) {
//       setTimeout(() => catchAllInput.focus(), 10);
//     }
//   });

//   // Create notification element
//   const captureNotification = document.createElement("div");
//   captureNotification.className = "barcode-capture";
//   captureNotification.textContent = "Scanning barcode...";
//   captureNotification.style.display = "none";
//   document.body.appendChild(captureNotification);

//   // Variables to track barcode scanner state
//   let lastKeyTime = 0;
//   let scanInProgress = false;
//   let scanTimeout;

//   // Monitor input on the hidden field
//   catchAllInput.addEventListener("input", () => {
//     const currentTime = new Date().getTime();
//     const timeSinceLastKey = currentTime - lastKeyTime;
//     lastKeyTime = currentTime;

//     // Fast input (less than 50ms) is likely from a scanner
//     if (timeSinceLastKey < 50) {
//       if (!scanInProgress) {
//         // Start of scan detected!
//         scanInProgress = true;
//         captureNotification.style.display = "block";
//       }

//       // Extend the timeout
//       clearTimeout(scanTimeout);
//       scanTimeout = setTimeout(finishScan, 200);
//     }
//   });

//   // Also handle keypresses separately to catch Enter key
//   catchAllInput.addEventListener("keydown", (event) => {
//     if (event.key === "Enter" && scanInProgress) {
//       event.preventDefault();
//       clearTimeout(scanTimeout);
//       finishScan();
//     }
//   });

//   // Handle scan completion
//   function finishScan() {
//     if (!scanInProgress) return;

//     scanInProgress = false;
//     captureNotification.style.display = "none";

//     // Get the scanned barcode from our hidden input
//     const barcode = catchAllInput.value.trim();

//     if (barcode.length >= 3) {
//       // Minimum valid barcode length
//       // Transfer the value to the visible barcode input
//       barcodeInput.value = barcode;

//       // Focus the visible input briefly
//       barcodeInput.focus();

//       // Process the barcode
//       processBarcodeInput();

//       // Clear and refocus the hidden input
//       catchAllInput.value = "";
//       setTimeout(() => catchAllInput.focus(), 100);
//     } else {
//       // Not a valid barcode, just clear the catchall
//       catchAllInput.value = "";
//     }
//   }

//   // When user explicitly focuses the visible barcode input
//   barcodeInput.addEventListener("focus", () => {
//     // Allow normal usage of the visible input when focused
//   });

//   barcodeInput.addEventListener("blur", () => {
//     // When leaving the visible input, refocus our hidden catcher
//     setTimeout(() => catchAllInput.focus(), 100);
//   });

//   // Handle the B keyboard shortcut
//   document.addEventListener("keydown", (event) => {
//     if (
//       event.key.toLowerCase() === "b" &&
//       !event.ctrlKey &&
//       !event.altKey &&
//       !event.shiftKey
//     ) {
//       // Only if not already in an input field
//       if (
//         document.activeElement.tagName !== "INPUT" &&
//         document.activeElement.tagName !== "TEXTAREA"
//       ) {
//         event.preventDefault();
//         barcodeInput.focus();
//       }
//     }
//   });

//   // Initialize by focusing the hidden input
//   setTimeout(() => catchAllInput.focus(), 100);
// }

// // Process barcode input
// // Process barcode input
// function processBarcodeInput() {
//   const barcodeInput = document.getElementById("barcode-input");
//   const barcodeStatus = document.getElementById("barcode-status");
//   const barcode = barcodeInput.value.trim();

//   if (!barcode) {
//     barcodeStatus.textContent = "Please enter a barcode";
//     barcodeStatus.style.color = "red";
//     return;
//   }

//   // Try to find matching product
//   const exactMatch = products.find(
//     (p) => p.id === barcode || p.sku === barcode
//   );

//   if (exactMatch) {
//     // Play a success beep (optional)
//     try {
//       const beepSound = new Audio("../Audio/beep.mp3"); // Adjust path to where you place your MP3 file
//       beepSound.volume = 0.3;
//       beepSound.play().catch((e) => console.log("Could not play sound:", e));
//     } catch (e) {
//       console.error("Error playing sound:", e);
//     }

//     // Add product to cart
//     addToCart(exactMatch);

//     // Success message
//     barcodeStatus.textContent = `Added: ${exactMatch.name}`;
//     barcodeStatus.style.color = "green";

//     // Clear input for next scan
//     barcodeInput.value = "";
//   } else {
//     // Filter products to see if we have partial matches
//     const matchingProducts = products.filter(
//       (p) =>
//         (p.id && p.id.includes(barcode)) || (p.sku && p.sku.includes(barcode))
//     );

//     if (matchingProducts.length > 0) {
//       // NEW BEHAVIOR: Add the first matching product to cart instead of just displaying matches
//       const firstMatch = matchingProducts[0];

//       // Play a success beep (optional)
//       try {
//         const beepSound = new Audio("../Audio/beep.mp3"); // Adjust path to where you place your MP3 file
//         beepSound.volume = 0.3;
//         beepSound.play().catch((e) => console.log("Could not play sound:", e));
//       } catch (e) {
//         console.error("Error playing sound:", e);
//       }

//       // Add the first matching product to cart
//       addToCart(firstMatch);

//       // Success message with additional info for partial match
//       barcodeStatus.textContent = `Added: ${firstMatch.name} (best match for barcode)`;
//       barcodeStatus.style.color = "green";

//       // Display matching products in case user wants to see alternatives
//       renderProducts(matchingProducts);

//       // Clear input for next scan
//       barcodeInput.value = "";
//     } else {
//       // No matches found
//       barcodeStatus.textContent = "No product found with this barcode";
//       barcodeStatus.style.color = "red";

//       // Show all products
//       renderProducts(products);
//     }
//   }

//   // Refocus input for next scan
//   barcodeInput.focus();
// }
// // Global variable to track selected cart item
// let selectedCartIndex = -1;

// // Initialize keyboard shortcuts
// function initKeyboardShortcuts() {
//   console.log("Initializing keyboard shortcuts");
//   document.addEventListener("keydown", handleKeyboardShortcut);

//   // Add help button for shortcuts
//   const actionsContainer = document.querySelector(".payment-actions");
//   const helpButton = document.createElement("button");
//   helpButton.id = "shortcuts-help-btn";
//   helpButton.className = "btn secondary-btn";
//   helpButton.textContent = "Shortcuts (?)";
//   helpButton.addEventListener("click", showShortcutsHelp);
//   actionsContainer.appendChild(helpButton);

//   // Add selection highlighting to cart items
//   // Add selection highlighting to cart items
//   cartItemsEl.addEventListener("click", function (event) {
//     const row = event.target.closest("tr");
//     if (!row) return;

//     // Remove selection from other rows
//     document.querySelectorAll("#cart-items tr").forEach((r) => {
//       r.classList.remove("selected-row");
//     });

//     // Add selection to clicked row
//     row.classList.add("selected-row");

//     // Fix for the null parent issue - add safety check
//     if (row.parentNode) {
//       selectedCartIndex = Array.from(row.parentNode.children).indexOf(row);
//     } else {
//       console.warn("Row parent not found, cannot determine index");
//       selectedCartIndex = -1;
//     }
//   });

//   // Add shortcut indicator to buttons
//   addShortcutIndicator("complete-sale", "F3");
//   addShortcutIndicator("clear-invoice", "F7");
// }

// // Handle keyboard shortcuts
// // Handle keyboard shortcuts
// // Handle keyboard shortcuts
// function handleKeyboardShortcut(event) {
//   // Special case for F11 and F12 (invoice navigation) - these always work
//   if (event.key === "F11" || event.key === "F12") {
//     event.preventDefault();
//     if (event.key === "F11") {
//       showPreviousInvoice();
//     } else {
//       showNextInvoice();
//     }
//     return;
//   }

//   // Skip other shortcuts if in input field
//   if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
//     return;
//   }

//   console.log("Key pressed:", event.key, event.code);

//   // Check if viewing (but not editing) an invoice - block action shortcuts
//   if (isViewingInvoice && !isEditingInvoice) {
//     // Allow F6 (show product details) as it's read-only
//     if (event.key === "F6") {
//       event.preventDefault();
//       showProductDetails();
//       return;
//     }

//     // For all other shortcuts that modify the invoice, show alert
//     switch (event.key) {
//       case "F1":
//       case "F2":
//       case "F3":
//       case "F5":
//       case "F7":
//       case "F9":
//       case "F10":
//       case "Delete":
//       case "d":
//         event.preventDefault();
//         // Stop event propagation to prevent other handlers from running
//         event.stopImmediatePropagation();
//         alert("Please click 'Edit' first before making changes.");
//         return false; // Explicitly return false to prevent default
//     }

//     return; // Exit early if viewing but not editing
//   }

//   // Process shortcuts normally if not viewing or if in edit mode
//   switch (event.key) {
//     case "F1":
//       event.preventDefault();
//       addMiscellaneousItem();
//       break;

//     case "F2":
//       event.preventDefault();
//       processReturn();
//       break;

//     case "F3":
//       event.preventDefault();
//       if (!document.getElementById("complete-sale").disabled) {
//         completeSale();
//       }
//       break;

//     case "F5":
//       event.preventDefault();
//       removeSelectedItem();
//       break;

//     case "F6":
//       event.preventDefault();
//       showProductDetails();
//       break;

//     case "F7":
//       event.preventDefault();
//       clearCart();
//       break;

//     case "F8":
//       event.preventDefault();
//       // Only trigger if receipt modal is visible
//       if (receiptModal.style.display === "block") {
//         printReceipt();
//       }
//       break;

//     case "F9":
//       event.preventDefault();
//       increaseQuantity();
//       break;

//     case "F10":
//       event.preventDefault();
//       decreaseQuantity();
//       break;

//     case "Delete":
//       event.preventDefault();
//       clearCart();
//       break;

//     case "/":
//       event.preventDefault();
//       document.getElementById("product-search").focus();
//       break;

//     case "d":
//       if (!event.ctrlKey && !event.altKey && !event.shiftKey) {
//         event.preventDefault();
//         showDiscountModal();
//       }
//       break;
//   }
// }

// // Add shortcut indicator to buttons
// function addShortcutIndicator(buttonId, shortcut) {
//   const button = document.getElementById(buttonId);
//   if (button) {
//     const shortcutSpan = document.createElement("span");
//     shortcutSpan.className = "shortcut-indicator";
//     shortcutSpan.textContent = ` (${shortcut})`;
//     button.appendChild(shortcutSpan);
//   }
// }

// // Show shortcuts help modal
// // Show shortcuts help modal
// function showShortcutsHelp() {
//   // Create modal if it doesn't exist
//   let shortcutsModal = document.getElementById("shortcuts-modal");

//   if (!shortcutsModal) {
//     shortcutsModal = document.createElement("div");
//     shortcutsModal.id = "shortcuts-modal";
//     shortcutsModal.className = "modal";

//     const modalContent = document.createElement("div");
//     modalContent.className = "modal-content";

//     const modalHeader = document.createElement("div");
//     modalHeader.className = "modal-header";
//     modalHeader.innerHTML = `
//       <h2>Keyboard Shortcuts</h2>
//       <span class="close">&times;</span>
//     `;

//     const modalBody = document.createElement("div");
//     modalBody.className = "modal-body";
//     modalBody.innerHTML = `
//       <table class="shortcuts-table">
//         <tr><th>Key</th><th>Action</th></tr>
//         <tr><td>F1</td><td>Add miscellaneous item</td></tr>
//         <tr><td>F2</td><td>Process return/refund</td></tr>
//         <tr><td>F3</td><td>Complete sale</td></tr>
//         <tr><td>F5</td><td>Remove selected item</td></tr>
//         <tr><td>F6</td><td>Show product details</td></tr>
//         <tr><td>F7</td><td>Clear cart</td></tr>
//         <tr><td>F8</td><td>Print receipt</td></tr>
//         <tr><td>F9</td><td>Increase quantity</td></tr>
//         <tr><td>F10</td><td>Decrease quantity</td></tr>
//         <tr><td>F11</td><td>Show previous invoice</td></tr>
//         <tr><td>F12</td><td>Show next invoice</td></tr>
//         <tr><td>Delete</td><td>Clear cart</td></tr>
//         <tr><td>/</td><td>Focus search box</td></tr>
//         <tr><td>B</td><td>Focus barcode input</td></tr>
//         <tr><td>D</td><td>Add discount</td></tr>
//       </table>
//     `;

//     modalContent.appendChild(modalHeader);
//     modalContent.appendChild(modalBody);
//     shortcutsModal.appendChild(modalContent);
//     document.body.appendChild(shortcutsModal);

//     // Add close button functionality
//     const closeBtn = shortcutsModal.querySelector(".close");
//     closeBtn.addEventListener("click", () => {
//       shortcutsModal.style.display = "none";
//     });

//     // Close modal when clicking outside
//     window.addEventListener("click", (event) => {
//       if (event.target === shortcutsModal) {
//         shortcutsModal.style.display = "none";
//       }
//     });
//   }

//   // Show the modal
//   shortcutsModal.style.display = "block";
// }

// // F1: Add miscellaneous item
// function addMiscellaneousItem() {
//   console.log("Opening miscellaneous item modal");

//   try {
//     // Create a modal dialog for entering miscellaneous item
//     const miscModal = document.createElement("div");
//     miscModal.className = "modal";
//     miscModal.id = "misc-item-modal";

//     const modalContent = document.createElement("div");
//     modalContent.className = "modal-content";

//     modalContent.innerHTML = `
//       <div class="modal-header">
//         <h2>Add Miscellaneous Item</h2>
//         <span class="close">&times;</span>
//       </div>
//       <div class="modal-body">
//         <form id="misc-item-form">
//           <div class="form-group">
//             <label for="misc-name">Item Description</label>
//             <input type="text" id="misc-name" placeholder="Item description" required>
//           </div>
//           <div class="form-group">
//             <label for="misc-price">Price </label>
//             <input type="number" id="misc-price" step="0.01" min="0" value="0.00" required>
//           </div>
//           <div class="form-actions">
//             <button type="button" class="btn secondary-btn" id="cancel-misc">Cancel</button>
//             <button type="submit" class="btn primary-btn">Add Item</button>
//           </div>
//         </form>
//       </div>
//     `;

//     // First add content to modal
//     miscModal.appendChild(modalContent);

//     // Then add modal to document
//     document.body.appendChild(miscModal);

//     // Show the modal
//     miscModal.style.display = "block";

//     // Set up event listeners - USING querySelector ON THE MODAL
//     const closeBtn = miscModal.querySelector(".close");
//     if (closeBtn) {
//       closeBtn.addEventListener("click", () => {
//         document.body.removeChild(miscModal);
//       });
//     } else {
//       console.error("Close button not found in misc modal");
//     }

//     const cancelBtn = miscModal.querySelector("#cancel-misc");
//     if (cancelBtn) {
//       cancelBtn.addEventListener("click", () => {
//         document.body.removeChild(miscModal);
//       });
//     } else {
//       console.error("Cancel button not found in misc modal");
//     }

//     const miscForm = miscModal.querySelector("#misc-item-form");
//     if (miscForm) {
//       // Handle form submission
//       miscForm.addEventListener("submit", (event) => {
//         event.preventDefault();

//         const nameInput = miscModal.querySelector("#misc-name");
//         const priceInput = miscModal.querySelector("#misc-price");

//         if (!nameInput || !priceInput) {
//           console.error("Name or price input not found");
//           return;
//         }

//         const itemName = nameInput.value;
//         const itemPrice = parseFloat(priceInput.value);

//         // Add to cart
//         const miscItem = {
//           id: `misc-${Date.now()}`,
//           name: `Misc: ${itemName}`,
//           price: itemPrice,
//           cost: 0,
//           quantity: 1,
//           total: itemPrice,
//           isMiscellaneous: true,
//         };

//         cart.push(miscItem);
//         renderCart();
//         updateTotals();

//         // Close modal
//         document.body.removeChild(miscModal);
//       });

//       // Focus on name field
//       const nameField = miscModal.querySelector("#misc-name");
//       if (nameField) {
//         nameField.focus();
//       }
//     } else {
//       console.error("Misc form not found");
//     }

//     // Close when clicking outside
//     window.addEventListener("click", (event) => {
//       if (event.target === miscModal) {
//         document.body.removeChild(miscModal);
//       }
//     });
//   } catch (error) {
//     console.error("Error in addMiscellaneousItem:", error);
//     alert("There was an error adding a miscellaneous item. Please try again.");
//   }
// }

// // F2: Process return/refund
// function processReturn() {
//   if (isViewingInvoice && !isEditingInvoice) {
//     alert("Please click 'Edit' first before processing a refund.");
//     return;
//   }
//   if (cart.length === 0) {
//     alert("Cart is empty. Add items to process a refund.");
//     return;
//   }

//   // Check if there are selected items
//   if (selectedItems.length === 0 && selectedCartIndex === -1) {
//     alert("Please select items to refund by checking the boxes next to them.");
//     return;
//   }

//   // Determine which items to refund
//   const itemsToRefund =
//     selectedItems.length > 0
//       ? selectedItems
//       : selectedCartIndex >= 0
//       ? [selectedCartIndex]
//       : [];

//   // Ask for confirmation
//   const message =
//     itemsToRefund.length === cart.length
//       ? "Process this as a complete return/refund? This will make all prices negative."
//       : `Process a partial refund for ${itemsToRefund.length} selected item(s)?`;

//   if (confirm(message)) {
//     // Convert only selected items to refunds
//     itemsToRefund.forEach((index) => {
//       if (index >= 0 && index < cart.length) {
//         cart[index].price = -Math.abs(cart[index].price);
//         cart[index].total = cart[index].price * cart[index].quantity;
//         cart[index].isRefund = true;
//       }
//     });

//     // Update UI
//     renderCart();
//     updateTotals();

//     // Change the complete sale button text
//     document.getElementById("complete-sale").textContent =
//       itemsToRefund.length === cart.length
//         ? "Complete Refund"
//         : "Complete Partial Refund";

//     // Clear selection after processing
//     selectedItems = [];
//   }
// }

// function addRefundButton() {
//   const actionsContainer = document.querySelector(".payment-actions");
//   if (!actionsContainer) return;

//   const refundButton = document.createElement("button");
//   refundButton.id = "refund-selected";
//   refundButton.className = "btn secondary-btn";
//   refundButton.textContent = "Refund Selected";
//   refundButton.addEventListener("click", processReturn);

//   // Add shortcut indicator
//   const shortcutSpan = document.createElement("span");
//   shortcutSpan.className = "shortcut-indicator";
//   shortcutSpan.textContent = " (F2)";
//   refundButton.appendChild(shortcutSpan);

//   actionsContainer.appendChild(refundButton);
// }

// function addMultiSelectStyles() {
//   const styleElement = document.createElement("style");
//   styleElement.textContent = `
//     .item-select {
//       cursor: pointer;
//       width: 18px;
//       height: 18px;
//       margin-right: 8px;
//     }

//     #cart-table th:first-child,
//     #cart-table td:first-child {
//       width: 30px;
//       text-align: center;
//     }
//   `;
//   document.head.appendChild(styleElement);
// }

// // F5: Remove selected item
// function removeSelectedItem() {
//   if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
//     cart.splice(selectedCartIndex, 1);
//     renderCart();
//     updateTotals();
//     selectedCartIndex = -1;
//   } else {
//     alert("Please select an item from the cart first");
//   }
// }

// // F6: Show product details
// function showProductDetails() {
//   if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
//     const item = cart[selectedCartIndex];

//     try {
//       // Create modal to show details
//       const detailsModal = document.createElement("div");
//       detailsModal.className = "modal";
//       detailsModal.id = "details-modal";

//       const modalContent = document.createElement("div");
//       modalContent.className = "modal-content";

//       modalContent.innerHTML = `
//         <div class="modal-header">
//           <h2>Product Details</h2>
//           <span class="close">&times;</span>
//         </div>
//         <div class="modal-body">
//           <table class="details-table">
//             <tr>
//               <th>Product ID:</th>
//               <td>${item.id || "N/A"}</td>
//             </tr>
//             <tr>
//               <th>Name:</th>
//               <td>${item.name || "N/A"}</td>
//             </tr>
//             <tr>
//               <th>Unit Price:</th>
//               <td>$${Math.abs(item.price).toFixed(2)}</td>
//             </tr>
//             <tr>
//               <th>Quantity:</th>
//               <td>${item.quantity}</td>
//             </tr>
//             <tr>
//               <th>Total:</th>
//               <td>$${Math.abs(item.price * item.quantity).toFixed(2)}</td>
//             </tr>
//             ${
//               item.isRefund ? "<tr><th>Type:</th><td>Refund Item</td></tr>" : ""
//             }
//             ${
//               item.isMiscellaneous
//                 ? "<tr><th>Type:</th><td>Miscellaneous Item</td></tr>"
//                 : ""
//             }
//             ${
//               item.discount
//                 ? `<tr><th>Discount:</th><td>${
//                     item.discount.type === "percentage"
//                       ? item.discount.value + "%"
//                       : "$" + item.discount.amount.toFixed(2)
//                   }</td></tr>`
//                 : ""
//             }
//           </table>
//         </div>
//         <div class="modal-footer">
//           <button id="close-details-btn" class="btn secondary-btn">Close</button>
//         </div>
//       `;

//       // First append content to modal
//       detailsModal.appendChild(modalContent);

//       // Then append modal to document
//       document.body.appendChild(detailsModal);

//       // Show the modal
//       detailsModal.style.display = "block";

//       // Set up close button event listeners - with null checks
//       const closeBtn = detailsModal.querySelector(".close");
//       if (closeBtn) {
//         closeBtn.addEventListener("click", () => {
//           document.body.removeChild(detailsModal);
//         });
//       }

//       const closeDetailsBtn = detailsModal.querySelector("#close-details-btn");
//       if (closeDetailsBtn) {
//         closeDetailsBtn.addEventListener("click", () => {
//           document.body.removeChild(detailsModal);
//         });
//       }

//       // Close when clicking outside
//       window.addEventListener("click", (event) => {
//         if (event.target === detailsModal) {
//           document.body.removeChild(detailsModal);
//         }
//       });
//     } catch (error) {
//       console.error("Error displaying product details:", error);
//       alert("There was an error displaying product details. Please try again.");
//     }
//   } else {
//     alert("Please select an item from the cart first");
//   }
// }

// // F9: Increase quantity
// function increaseQuantity() {
//   if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
//     cart[selectedCartIndex].quantity += 1;
//     cart[selectedCartIndex].total =
//       cart[selectedCartIndex].price * cart[selectedCartIndex].quantity;
//     renderCart();
//     updateTotals();
//   } else {
//     alert("Please select an item from the cart first");
//   }
// }

// // F10: Decrease quantity
// function decreaseQuantity() {
//   if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
//     if (cart[selectedCartIndex].quantity > 1) {
//       cart[selectedCartIndex].quantity -= 1;
//       cart[selectedCartIndex].total =
//         cart[selectedCartIndex].price * cart[selectedCartIndex].quantity;
//       renderCart();
//       updateTotals();
//     } else {
//       alert("Quantity cannot be less than 1. Use F5 to remove the item.");
//     }
//   } else {
//     alert("Please select an item from the cart first");
//   }
// }

// // Add CSS for cart item selection
// function addShortcutStyles() {
//   const styleElement = document.createElement("style");
//   styleElement.textContent = `
//     .selected-row {
//       background-color: #e9f5ff;
//       outline: 2px solid var(--primary-color);
//     }

//     .shortcut-indicator {
//       font-size: 0.8em;
//       opacity: 0.7;
//     }

//     .shortcuts-table {
//       width: 100%;
//       border-collapse: collapse;
//     }

//     .shortcuts-table th, .shortcuts-table td {
//       padding: 8px;
//       text-align: left;
//       border-bottom: 1px solid #ddd;
//     }

//     .shortcuts-table th {
//       background-color: #f2f2f2;
//     }

//     .details-table {
//       width: 100%;
//       border-collapse: collapse;
//       margin: 10px 0;
//     }

//     .details-table th, .details-table td {
//       padding: 8px;
//       text-align: left;
//       border-bottom: 1px solid #ddd;
//     }

//     .details-table th {
//       width: 40%;
//       background-color: #f2f2f2;
//     }
//   `;
//   document.head.appendChild(styleElement);
// }

// // Print receipt
// // Completely revised print receipt function that bypasses the API
// async function printReceipt() {
//   try {
//     // Check if receipt container exists
//     if (!receiptContainerEl) {
//       console.error("Receipt container element not found");
//       alert("Error: Receipt container not found. Please try again.");
//       return;
//     }

//     const receiptHtml = receiptContainerEl.innerHTML;

//     // Generate a timestamp-based ID if we can't extract one from the receipt
//     let invoiceId = "receipt-" + new Date().toISOString().replace(/[:.]/g, "-");

//     // Try to extract the invoice ID if possible, but don't worry if it fails
//     try {
//       const idMatch = receiptHtml.match(/Receipt #:\s*([a-zA-Z0-9-]+)/);
//       if (idMatch && idMatch[1]) {
//         invoiceId = idMatch[1];
//       }
//     } catch (err) {
//       console.log("Couldn't extract invoice ID, using generated one instead");
//     }

//     // Skip the API call and use the direct download method
//     downloadReceiptAsHTML(receiptHtml, invoiceId);
//   } catch (error) {
//     console.error("Error handling receipt:", error);
//     alert("There was an error preparing the receipt. Please try again.");
//   }
// }

// // Function to download receipt as HTML
// function downloadReceiptAsHTML(html, invoiceId) {
//   try {
//     // Create a styled HTML document
//     const fullHtml = `
//       <!DOCTYPE html>
//       <html>
//       <head>
//         <title>Receipt ${invoiceId}</title>
//         <style>
//           body {
//             font-family: Arial, sans-serif;
//             max-width: 800px;
//             margin: 0 auto;
//             padding: 20px;
//           }
//           .receipt-header {
//             text-align: center;
//             margin-bottom: 20px;
//           }
//           .receipt-info {
//             margin-bottom: 20px;
//           }
//           .receipt-items {
//             width: 100%;
//             border-collapse: collapse;
//           }
//           .receipt-items th, .receipt-items td {
//             padding: 8px;
//             text-align: left;
//             border-bottom: 1px solid #ddd;
//           }
//           .total-row {
//             font-weight: bold;
//           }
//           .receipt-footer {
//             margin-top: 20px;
//             text-align: center;
//             font-style: italic;
//           }
//           @media print {
//             body {
//               padding: 0;
//               width: 100%;
//             }
//             button, .no-print {
//               display: none;
//             }
//           }
//         </style>
//       </head>
//       <body>
//         <div class="receipt-content">
//           ${html}
//         </div>
//         <div class="no-print" style="margin-top: 30px; text-align: center;">
//           <button onclick="window.print();" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
//             Print this receipt
//           </button>
//         </div>
//       </body>
//       </html>
//     `;

//     // Create a Blob containing the HTML
//     const blob = new Blob([fullHtml], { type: "text/html" });

//     // Create a link element to download the file
//     const a = document.createElement("a");
//     a.href = URL.createObjectURL(blob);
//     a.download = `receipt-${invoiceId}.html`;

//     // Append to body, click to download, then remove
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);

//     alert(
//       `Receipt downloaded as HTML file: receipt-${invoiceId}.html\n\nOpen the file in your browser and use your browser's print function to print it.`
//     );
//   } catch (error) {
//     console.error("Error creating downloadable receipt:", error);
//     alert("Failed to create downloadable receipt. Please try again.");
//   }
// }

// // This is a replacement for the emailReceipt function
// // that offers to download the receipt instead
// function emailReceipt() {
//   if (
//     confirm(
//       "Email functionality would be implemented in a real app. Would you like to download the receipt instead?"
//     )
//   ) {
//     printReceipt();
//   }
// }

// // Update connection status
// // Update connection status
// async function updateConnectionStatus() {
//   const indicator = document.getElementById("connection-indicator");
//   const statusText = document.getElementById("connection-text");

//   try {
//     // Use the API if available
//     let isOnline = navigator.onLine; // Default fallback
//     if (window.api && typeof window.api.getOnlineStatus === "function") {
//       isOnline = await window.api.getOnlineStatus();
//     }

//     if (isOnline) {
//       indicator.classList.remove("offline");
//       indicator.classList.add("online");
//       statusText.textContent = "Online Mode";
//     } else {
//       indicator.classList.remove("online");
//       indicator.classList.add("offline");
//       statusText.textContent = "Offline Mode";
//     }
//   } catch (error) {
//     console.error("Error checking online status:", error);
//     // Fallback to offline if there's an error
//     indicator.classList.remove("online");
//     indicator.classList.add("offline");
//     statusText.textContent = "Offline Mode";
//   }
// }

// // Globals for discount tracking
// let cartDiscount = {
//   type: "none", // 'none', 'percentage', 'fixed'
//   value: 0, // percentage or fixed amount
//   amount: 0, // calculated amount
// };

// // Add discount button to the invoice summary
// function initDiscountFeature() {
//   // Get the invoice summary element
//   const invoiceSummary = document.querySelector(".invoice-summary");

//   // Check if invoice summary exists
//   if (!invoiceSummary) {
//     console.error("Invoice summary element not found");
//     return;
//   }

//   // Check if total row exists
//   const totalRow = document.querySelector(".summary-row.total");
//   if (!totalRow) {
//     console.error("Total row element not found");
//     return;
//   }

//   // Add discount row before the total row
//   const discountRow = document.createElement("div");
//   discountRow.className = "summary-row";
//   discountRow.innerHTML = `
//     <span>Discount:</span>
//     <span id="discount-value">$0.00</span>
//   `;

//   // Insert before the total row
//   invoiceSummary.insertBefore(discountRow, totalRow);

//   // Add discount button
//   const discountButtonRow = document.createElement("div");
//   discountButtonRow.className = "summary-row discount-actions";
//   discountButtonRow.innerHTML = `
//     <button id="add-discount-btn" class="btn secondary-btn">Add Discount</button>
//   `;

//   // Insert after the discount row
//   invoiceSummary.insertBefore(discountButtonRow, totalRow);

//   // Find the button element after it has been added to the DOM
//   const addDiscountBtn = document.getElementById("add-discount-btn");

//   // Check if button exists before adding event listener
//   if (addDiscountBtn) {
//     addDiscountBtn.addEventListener("click", showDiscountModal);

//     // Add shortcut indicator
//     addShortcutIndicator("add-discount-btn", "D");
//   } else {
//     console.error("Discount button element not found after insertion");
//   }

//   // Add keyboard shortcut (D)
//   document.addEventListener("keydown", function (event) {
//     if (
//       event.key === "d" &&
//       !(event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")
//     ) {
//       // First check if we're viewing an invoice without being in edit mode
//       if (isViewingInvoice && !isEditingInvoice) {
//         event.preventDefault();
//         alert("Please click 'Edit' first before making changes.");
//         return;
//       }

//       // Otherwise proceed normally
//       event.preventDefault();
//       showDiscountModal();
//     }
//   });
// }

// // Show discount modal
// // Show discount modal
// // Modify the showDiscountModal function to handle multi-selection
// function showDiscountModal() {
//   console.log("Opening discount modal");

//   try {
//     // Calculate current subtotal to use for suggestions
//     const currentSubtotal = parseFloat(subtotalEl.textContent.replace("$", ""));

//     // Create modal for applying discounts
//     const discountModal = document.createElement("div");
//     discountModal.className = "modal";
//     discountModal.id = "discount-modal";

//     let currentType = cartDiscount.type;
//     let currentValue = cartDiscount.value;

//     const modalContent = document.createElement("div");
//     modalContent.className = "modal-content";

//     // Check if multiple items are selected
//     const hasMultipleSelected = selectedItems.length > 0;
//     const selectedItemsCount = selectedItems.length;

//     modalContent.innerHTML = `
//       <div class="modal-header">
//         <h2>Apply Discount</h2>
//         <span class="close">&times;</span>
//       </div>
//       <div class="modal-body">
//         <div class="discount-options">
//           <div class="discount-section">
//             <h3>Cart Discount</h3>
//             <form id="cart-discount-form">
//               <div class="form-group">
//                 <label>Discount Type</label>
//                 <div class="radio-group">
//                   <label>
//                     <input type="radio" name="cart-discount-type" value="none" ${
//                       currentType === "none" ? "checked" : ""
//                     }>
//                     No Discount
//                   </label>
//                   <label>
//                     <input type="radio" name="cart-discount-type" value="percentage" ${
//                       currentType === "percentage" ? "checked" : ""
//                     }>
//                     Percentage (%)
//                   </label>
//                   <label>
//                     <input type="radio" name="cart-discount-type" value="fixed" ${
//                       currentType === "fixed" ? "checked" : ""
//                     }>
//                     Fixed Amount
//                   </label>
//                 </div>
//               </div>

//               <div class="form-group" id="cart-discount-value-group" ${
//                 currentType === "none" ? 'style="display: none;"' : ""
//               }>
//                 <label for="cart-discount-value">Discount Value</label>
//                 <input type="number" id="cart-discount-value" min="0" step="0.01" value="${currentValue.toFixed(
//                   2
//                 )}" ${
//       currentType === "fixed" ? `max="${currentSubtotal.toFixed(2)}"` : ""
//     }>
//                 <small class="hint">Enter percentage or dollar amount</small>

//                 <!-- Percentage suggestions -->
//                 <div id="percentage-suggestions" class="suggestion-buttons" ${
//                   currentType === "percentage" ? "" : 'style="display: none;"'
//                 }>
//                   <span>Quick select: </span>
//                   <button type="button" class="btn suggestion-btn" data-value="5">5%</button>
//                   <button type="button" class="btn suggestion-btn" data-value="10">10%</button>
//                   <button type="button" class="btn suggestion-btn" data-value="15">15%</button>
//                   <button type="button" class="btn suggestion-btn" data-value="20">20%</button>
//                   <button type="button" class="btn suggestion-btn" data-value="25">25%</button>
//                   <button type="button" class="btn suggestion-btn" data-value="50">50%</button>
//                 </div>

//                 <!-- Fixed amount suggestions -->
//                 <div id="fixed-suggestions" class="suggestion-buttons" ${
//                   currentType === "fixed" ? "" : 'style="display: none;"'
//                 }>
//                   <span>Quick select: </span>
//                   <button type="button" class="btn suggestion-btn" data-value="5">$5</button>
//                   <button type="button" class="btn suggestion-btn" data-value="10">$10</button>
//                   <button type="button" class="btn suggestion-btn" data-value="20">$20</button>
//                   <button type="button" class="btn suggestion-btn" data-value="50">$50</button>
//                   <button type="button" class="btn suggestion-btn" data-value="${(
//                     currentSubtotal * 0.1
//                   ).toFixed(2)}">10% ($${(currentSubtotal * 0.1).toFixed(
//       2
//     )})</button>
//                   <button type="button" class="btn suggestion-btn" data-value="${(
//                     currentSubtotal * 0.2
//                   ).toFixed(2)}">20% ($${(currentSubtotal * 0.2).toFixed(
//       2
//     )})</button>
//                 </div>
//               </div>
//             </form>
//           </div>

//           <div class="discount-section">
//             <h3>Item Discount</h3>
//             ${
//               hasMultipleSelected
//                 ? `<p>You have <strong>${selectedItemsCount}</strong> items selected. Apply discount to all selected items.</p>`
//                 : `<p>Select an item in the cart first, then apply discount to that item.</p>`
//             }
//             <button id="apply-item-discount" class="btn secondary-btn" ${
//               hasMultipleSelected || selectedCartIndex >= 0 ? "" : "disabled"
//             }>
//               Apply to ${
//                 hasMultipleSelected
//                   ? `${selectedItemsCount} Selected Items`
//                   : "Selected Item"
//               }
//             </button>
//           </div>
//         </div>

//         <div class="form-actions">
//           <button type="button" class="btn secondary-btn" id="remove-all-discounts">Remove All Discounts</button>
//           <button type="button" class="btn primary-btn" id="apply-cart-discount">Apply Discount</button>
//         </div>
//       </div>
//     `;

//     // First append content to modal
//     discountModal.appendChild(modalContent);

//     // Then append modal to body
//     document.body.appendChild(discountModal);

//     // Show the modal
//     discountModal.style.display = "block";

//     // Event handlers with null checks
//     const closeBtn = discountModal.querySelector(".close");
//     if (closeBtn) {
//       closeBtn.addEventListener("click", () => {
//         document.body.removeChild(discountModal);
//       });
//     }

//     // Toggle discount value input and suggestion buttons
//     const discountTypeInputs = discountModal.querySelectorAll(
//       'input[name="cart-discount-type"]'
//     );
//     const discountValueGroup = discountModal.querySelector(
//       "#cart-discount-value-group"
//     );
//     const percentageSuggestions = discountModal.querySelector(
//       "#percentage-suggestions"
//     );
//     const fixedSuggestions = discountModal.querySelector("#fixed-suggestions");
//     const discountValueInput = discountModal.querySelector(
//       "#cart-discount-value"
//     );

//     if (
//       discountTypeInputs &&
//       discountTypeInputs.length > 0 &&
//       discountValueGroup
//     ) {
//       discountTypeInputs.forEach((input) => {
//         input.addEventListener("change", () => {
//           // Show/hide value input group
//           if (input.value === "none") {
//             discountValueGroup.style.display = "none";
//           } else {
//             discountValueGroup.style.display = "block";

//             // Show/hide appropriate suggestion buttons
//             if (input.value === "percentage") {
//               percentageSuggestions.style.display = "block";
//               fixedSuggestions.style.display = "none";
//               discountValueInput.removeAttribute("max"); // Remove max constraint
//             } else if (input.value === "fixed") {
//               percentageSuggestions.style.display = "none";
//               fixedSuggestions.style.display = "block";
//               discountValueInput.setAttribute(
//                 "max",
//                 currentSubtotal.toFixed(2)
//               ); // Set max to subtotal
//             }
//           }
//         });
//       });
//     }

//     // Add event listeners to suggestion buttons
//     const suggestionBtns = discountModal.querySelectorAll(".suggestion-btn");
//     if (suggestionBtns) {
//       suggestionBtns.forEach((btn) => {
//         btn.addEventListener("click", (event) => {
//           event.preventDefault(); // Prevent form submission
//           const value = parseFloat(btn.dataset.value);
//           if (discountValueInput) {
//             discountValueInput.value = value;
//           }
//         });
//       });
//     }

//     // Apply cart discount
//     const applyCartDiscountBtn = discountModal.querySelector(
//       "#apply-cart-discount"
//     );
//     if (applyCartDiscountBtn) {
//       applyCartDiscountBtn.addEventListener("click", () => {
//         const selectedTypeElement = discountModal.querySelector(
//           'input[name="cart-discount-type"]:checked'
//         );

//         if (!selectedTypeElement) {
//           console.error("No discount type selected");
//           return;
//         }

//         const selectedType = selectedTypeElement.value;

//         if (selectedType === "none") {
//           cartDiscount = { type: "none", value: 0, amount: 0 };
//         } else {
//           const discountValueElement = discountModal.querySelector(
//             "#cart-discount-value"
//           );
//           if (!discountValueElement) {
//             console.error("Discount value element not found");
//             return;
//           }

//           const discountValue = parseFloat(discountValueElement.value) || 0;

//           if (discountValue <= 0) {
//             alert("Please enter a valid discount value greater than 0.");
//             return;
//           }

//           // For fixed discount, make sure it's not greater than subtotal
//           if (selectedType === "fixed" && discountValue > currentSubtotal) {
//             alert(
//               `Discount amount cannot exceed the subtotal ($${currentSubtotal.toFixed(
//                 2
//               )})`
//             );
//             return;
//           }

//           cartDiscount = {
//             type: selectedType,
//             value: discountValue,
//             amount: 0, // Will be calculated in updateTotals()
//           };
//         }

//         updateTotals();
//         document.body.removeChild(discountModal);
//       });
//     }

//     // Apply item discount - MODIFIED TO HANDLE MULTIPLE ITEMS
//     const applyItemDiscountBtn = discountModal.querySelector(
//       "#apply-item-discount"
//     );
//     if (applyItemDiscountBtn) {
//       applyItemDiscountBtn.addEventListener("click", () => {
//         if (selectedItems.length > 0) {
//           // Multiple items selected - show multi-item discount modal
//           showMultiItemDiscountModal(selectedItems);
//           document.body.removeChild(discountModal);
//         } else if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
//           // Single item selected
//           showItemDiscountModal(selectedCartIndex);
//           document.body.removeChild(discountModal);
//         } else {
//           alert("Please select at least one item from the cart first");
//         }
//       });
//     }

//     // Remove all discounts
//     const removeAllDiscountsBtn = discountModal.querySelector(
//       "#remove-all-discounts"
//     );
//     if (removeAllDiscountsBtn) {
//       removeAllDiscountsBtn.addEventListener("click", () => {
//         // Remove cart discount
//         cartDiscount = { type: "none", value: 0, amount: 0 };

//         // Remove all item discounts
//         cart.forEach((item) => {
//           if (item.discount) {
//             delete item.discount;
//           }
//         });

//         updateTotals();
//         renderCart();
//         document.body.removeChild(discountModal);
//       });
//     }

//     // Close when clicking outside
//     window.addEventListener("click", (event) => {
//       if (event.target === discountModal) {
//         document.body.removeChild(discountModal);
//       }
//     });
//   } catch (error) {
//     console.error("Error in showDiscountModal:", error);
//     alert("There was an error showing the discount modal. Please try again.");
//   }
// }

// // New function to handle discount for multiple items
// function showMultiItemDiscountModal(itemIndices) {
//   try {
//     if (itemIndices.length === 0) {
//       console.error("No items selected for discount");
//       return;
//     }

//     // Get the selected items
//     const selectedCartItems = itemIndices
//       .map((index) => cart[index])
//       .filter(Boolean);

//     // Calculate total price of selected items
//     const totalPrice = selectedCartItems.reduce(
//       (sum, item) => sum + Math.abs(item.price) * item.quantity,
//       0
//     );

//     // Create modal for applying item discount
//     const discountModal = document.createElement("div");
//     discountModal.className = "modal";
//     discountModal.id = "multi-item-discount-modal";

//     // Check if all selected items have the same discount
//     let initialDiscountType = "none";
//     let initialDiscountValue = 0;
//     let isConsistentDiscount = true;

//     if (selectedCartItems.length > 0 && selectedCartItems[0].discount) {
//       initialDiscountType = selectedCartItems[0].discount.type;
//       initialDiscountValue = selectedCartItems[0].discount.value;

//       // Check if all items have the same discount
//       isConsistentDiscount = selectedCartItems.every(
//         (item) =>
//           item.discount &&
//           item.discount.type === initialDiscountType &&
//           item.discount.value === initialDiscountValue
//       );
//     }

//     // If discounts are inconsistent, default to none
//     if (!isConsistentDiscount) {
//       initialDiscountType = "none";
//       initialDiscountValue = 0;
//     }

//     const modalContent = document.createElement("div");
//     modalContent.className = "modal-content";

//     modalContent.innerHTML = `
//       <div class="modal-header">
//         <h2>Apply Discount to ${selectedCartItems.length} Items</h2>
//         <span class="close">&times;</span>
//       </div>
//       <div class="modal-body">
//         <div class="item-info">
//           <p><strong>Selected Items:</strong> ${selectedCartItems.length}</p>
//           <p><strong>Total Price:</strong> $${totalPrice.toFixed(2)}</p>
//         </div>
//         <form id="multi-item-discount-form">
//           <div class="form-group">
//             <label>Discount Type</label>
//             <div class="radio-group">
//               <label>
//                 <input type="radio" name="multi-item-discount-type" value="none" ${
//                   initialDiscountType === "none" ? "checked" : ""
//                 }>
//                 No Discount
//               </label>
//               <label>
//                 <input type="radio" name="multi-item-discount-type" value="percentage" ${
//                   initialDiscountType === "percentage" ? "checked" : ""
//                 }>
//                 Percentage (%)
//               </label>
//               <label>
//                 <input type="radio" name="multi-item-discount-type" value="fixed" ${
//                   initialDiscountType === "fixed" ? "checked" : ""
//                 }>
//                 Fixed Amount  per item
//               </label>
//             </div>
//           </div>

//           <div class="form-group" id="multi-item-discount-value-group" ${
//             initialDiscountType === "none" ? 'style="display: none;"' : ""
//           }>
//             <label for="multi-item-discount-value">Discount Value</label>
//             <input type="number" id="multi-item-discount-value" min="0" step="0.01" value="${initialDiscountValue.toFixed(
//               2
//             )}">
//             <small class="hint">Enter percentage or dollar amount per item</small>

//             <!-- Discount preview -->
//             <div id="multi-discount-preview" class="discount-preview" ${
//               initialDiscountType === "none" ? 'style="display: none;"' : ""
//             }>
//               <span>Estimated total savings: <strong id="savings-display">$0.00</strong></span>
//             </div>

//             <!-- Percentage suggestions -->
//             <div id="multi-percentage-suggestions" class="suggestion-buttons" ${
//               initialDiscountType === "percentage"
//                 ? ""
//                 : 'style="display: none;"'
//             }>
//               <span>Quick select: </span>
//               <button type="button" class="btn suggestion-btn" data-value="5">5%</button>
//               <button type="button" class="btn suggestion-btn" data-value="10">10%</button>
//               <button type="button" class="btn suggestion-btn" data-value="15">15%</button>
//               <button type="button" class="btn suggestion-btn" data-value="20">20%</button>
//               <button type="button" class="btn suggestion-btn" data-value="25">25%</button>
//               <button type="button" class="btn suggestion-btn" data-value="50">50%</button>
//             </div>

//             <!-- Fixed amount suggestions -->
//             <div id="multi-fixed-suggestions" class="suggestion-buttons" ${
//               initialDiscountType === "fixed" ? "" : 'style="display: none;"'
//             }>
//               <span>Quick select: </span>
//               <button type="button" class="btn suggestion-btn" data-value="1">$1</button>
//               <button type="button" class="btn suggestion-btn" data-value="2">$2</button>
//               <button type="button" class="btn suggestion-btn" data-value="5">$5</button>
//             </div>
//           </div>

//           <div class="form-actions">
//             <button type="button" class="btn secondary-btn" id="cancel-multi-discount">Cancel</button>
//             <button type="button" class="btn primary-btn" id="apply-multi-discount-btn">Apply to All Selected Items</button>
//           </div>
//         </form>
//       </div>
//     `;

//     // Append content to modal first
//     discountModal.appendChild(modalContent);

//     // Then append modal to body
//     document.body.appendChild(discountModal);

//     // Show the modal
//     discountModal.style.display = "block";

//     // Event handlers with null checks
//     const closeBtn = discountModal.querySelector(".close");
//     if (closeBtn) {
//       closeBtn.addEventListener("click", () => {
//         document.body.removeChild(discountModal);
//       });
//     }

//     // Toggle discount value input and suggestion buttons
//     const discountTypeInputs = discountModal.querySelectorAll(
//       'input[name="multi-item-discount-type"]'
//     );
//     const discountValueGroup = discountModal.querySelector(
//       "#multi-item-discount-value-group"
//     );
//     const percentageSuggestions = discountModal.querySelector(
//       "#multi-percentage-suggestions"
//     );
//     const fixedSuggestions = discountModal.querySelector(
//       "#multi-fixed-suggestions"
//     );
//     const discountValueInput = discountModal.querySelector(
//       "#multi-item-discount-value"
//     );
//     const discountPreview = discountModal.querySelector(
//       "#multi-discount-preview"
//     );
//     const savingsDisplay = discountModal.querySelector("#savings-display");

//     if (
//       discountTypeInputs &&
//       discountTypeInputs.length > 0 &&
//       discountValueGroup
//     ) {
//       discountTypeInputs.forEach((input) => {
//         input.addEventListener("change", () => {
//           // Show/hide value input group
//           if (input.value === "none") {
//             discountValueGroup.style.display = "none";
//             discountPreview.style.display = "none";
//           } else {
//             discountValueGroup.style.display = "block";
//             discountPreview.style.display = "block";

//             // Show/hide appropriate suggestion buttons
//             if (input.value === "percentage") {
//               percentageSuggestions.style.display = "block";
//               fixedSuggestions.style.display = "none";
//               discountValueInput.removeAttribute("max"); // Remove max constraint
//               updateMultiSavingsPreview(
//                 selectedCartItems,
//                 "percentage",
//                 parseFloat(discountValueInput.value) || 0
//               );
//             } else if (input.value === "fixed") {
//               percentageSuggestions.style.display = "none";
//               fixedSuggestions.style.display = "block";
//               updateMultiSavingsPreview(
//                 selectedCartItems,
//                 "fixed",
//                 parseFloat(discountValueInput.value) || 0
//               );
//             }
//           }
//         });
//       });
//     }

//     // Update savings preview when discount value changes
//     if (discountValueInput) {
//       discountValueInput.addEventListener("input", () => {
//         const selectedType = discountModal.querySelector(
//           'input[name="multi-item-discount-type"]:checked'
//         ).value;
//         if (selectedType !== "none") {
//           updateMultiSavingsPreview(
//             selectedCartItems,
//             selectedType,
//             parseFloat(discountValueInput.value) || 0
//           );
//         }
//       });
//     }

//     // Function to update the savings preview
//     function updateMultiSavingsPreview(items, discountType, discountValue) {
//       let totalSavings = 0;

//       items.forEach((item) => {
//         const itemPrice = Math.abs(item.price);
//         let discountAmount = 0;

//         if (discountType === "percentage") {
//           discountAmount = itemPrice * (discountValue / 100);
//         } else if (discountType === "fixed") {
//           discountAmount = Math.min(discountValue, itemPrice);
//         }

//         totalSavings += discountAmount * item.quantity;
//       });

//       if (savingsDisplay) {
//         savingsDisplay.textContent = `$${totalSavings.toFixed(2)}`;
//       }
//     }

//     // Add event listeners to suggestion buttons
//     const suggestionBtns = discountModal.querySelectorAll(".suggestion-btn");
//     if (suggestionBtns) {
//       suggestionBtns.forEach((btn) => {
//         btn.addEventListener("click", (event) => {
//           event.preventDefault(); // Prevent form submission
//           const value = parseFloat(btn.dataset.value);
//           if (discountValueInput) {
//             discountValueInput.value = value;

//             // Update preview
//             const selectedType = discountModal.querySelector(
//               'input[name="multi-item-discount-type"]:checked'
//             ).value;
//             updateMultiSavingsPreview(selectedCartItems, selectedType, value);
//           }
//         });
//       });
//     }

//     // Apply discount to all selected items
//     const applyMultiDiscountBtn = discountModal.querySelector(
//       "#apply-multi-discount-btn"
//     );
//     if (applyMultiDiscountBtn) {
//       applyMultiDiscountBtn.addEventListener("click", () => {
//         const selectedTypeElement = discountModal.querySelector(
//           'input[name="multi-item-discount-type"]:checked'
//         );

//         if (!selectedTypeElement) {
//           console.error("No discount type selected for items");
//           return;
//         }

//         const selectedType = selectedTypeElement.value;

//         // Apply to all selected items
//         itemIndices.forEach((index) => {
//           if (index >= 0 && index < cart.length) {
//             const item = cart[index];

//             if (selectedType === "none") {
//               // Remove discount if exists
//               if (item.discount) {
//                 delete item.discount;
//               }
//             } else {
//               const discountValueElement = discountModal.querySelector(
//                 "#multi-item-discount-value"
//               );
//               if (!discountValueElement) {
//                 console.error("Item discount value element not found");
//                 return;
//               }

//               const discountValue = parseFloat(discountValueElement.value) || 0;

//               if (discountValue <= 0) {
//                 alert("Please enter a valid discount value greater than 0.");
//                 return;
//               }

//               // Calculate discounted price for this item
//               let discountAmount = 0;
//               const basePrice = Math.abs(item.price);

//               if (selectedType === "percentage") {
//                 discountAmount = basePrice * (discountValue / 100);
//                 if (discountAmount > basePrice) discountAmount = basePrice;
//               } else {
//                 discountAmount = discountValue;
//                 if (discountAmount > basePrice) discountAmount = basePrice;
//               }

//               // Apply discount to this item
//               item.discount = {
//                 type: selectedType,
//                 value: discountValue,
//                 amount: discountAmount,
//               };
//             }
//           }
//         });

//         // Update UI
//         renderCart();
//         updateTotals();
//         document.body.removeChild(discountModal);

//         // Clear selection after applying
//         selectedItems = [];
//       });
//     }

//     // Cancel button
//     const cancelBtn = discountModal.querySelector("#cancel-multi-discount");
//     if (cancelBtn) {
//       cancelBtn.addEventListener("click", () => {
//         document.body.removeChild(discountModal);
//       });
//     }

//     // Close when clicking outside
//     window.addEventListener("click", (event) => {
//       if (event.target === discountModal) {
//         document.body.removeChild(discountModal);
//       }
//     });

//     // Initialize savings preview if there's already a discount type selected
//     if (initialDiscountType !== "none") {
//       updateMultiSavingsPreview(
//         selectedCartItems,
//         initialDiscountType,
//         initialDiscountValue
//       );
//     }
//   } catch (error) {
//     console.error("Error in showMultiItemDiscountModal:", error);
//     alert(
//       "There was an error showing the multi-item discount modal. Please try again."
//     );
//   }
// }

// // Show item discount modal
// // Show item discount modal
// // Show item discount modal with suggestions
// function showItemDiscountModal(itemIndex) {
//   console.log("Opening item discount modal for index:", itemIndex);

//   try {
//     const item = cart[itemIndex];
//     if (!item) {
//       console.error("Item not found at index:", itemIndex);
//       return;
//     }

//     // Calculate item total price for validations
//     const itemTotalPrice = Math.abs(item.price) * item.quantity;

//     // Create modal for applying item discount
//     const discountModal = document.createElement("div");
//     discountModal.className = "modal";
//     discountModal.id = "item-discount-modal";

//     let currentType = item.discount ? item.discount.type : "none";
//     let currentValue = item.discount ? item.discount.value : 0;

//     const modalContent = document.createElement("div");
//     modalContent.className = "modal-content";

//     modalContent.innerHTML = `
//       <div class="modal-header">
//         <h2>Item Discount: ${item.name}</h2>
//         <span class="close">&times;</span>
//       </div>
//       <div class="modal-body">
//         <div class="item-info">
//           <p><strong>Price:</strong> $${Math.abs(item.price).toFixed(2)} × ${
//       item.quantity
//     } = $${itemTotalPrice.toFixed(2)}</p>
//         </div>
//         <form id="item-discount-form">
//           <div class="form-group">
//             <label>Discount Type</label>
//             <div class="radio-group">
//               <label>
//                 <input type="radio" name="item-discount-type" value="none" ${
//                   currentType === "none" ? "checked" : ""
//                 }>
//                 No Discount
//               </label>
//               <label>
//                 <input type="radio" name="item-discount-type" value="percentage" ${
//                   currentType === "percentage" ? "checked" : ""
//                 }>
//                 Percentage (%)
//               </label>
//               <label>
//                 <input type="radio" name="item-discount-type" value="fixed" ${
//                   currentType === "fixed" ? "checked" : ""
//                 }>
//                 Fixed Amount
//               </label>
//             </div>
//           </div>

//           <div class="form-group" id="item-discount-value-group" ${
//             currentType === "none" ? 'style="display: none;"' : ""
//           }>
//             <label for="item-discount-value">Discount Value</label>
//             <input type="number" id="item-discount-value" min="0" step="0.01" value="${currentValue.toFixed(
//               2
//             )}" ${
//       currentType === "fixed" ? `max="${Math.abs(item.price).toFixed(2)}"` : ""
//     }>
//             <small class="hint">Enter percentage or dollar amount</small>

//             <!-- Discount preview -->
//             <div id="discount-preview" class="discount-preview" ${
//               currentType === "none" ? 'style="display: none;"' : ""
//             }>
//               <span>New price after discount: <strong id="new-price-display">$${Math.abs(
//                 item.price
//               ).toFixed(2)}</strong></span>
//             </div>

//             <!-- Percentage suggestions -->
//             <div id="item-percentage-suggestions" class="suggestion-buttons" ${
//               currentType === "percentage" ? "" : 'style="display: none;"'
//             }>
//               <span>Quick select: </span>
//               <button type="button" class="btn suggestion-btn" data-value="5">5%</button>
//               <button type="button" class="btn suggestion-btn" data-value="10">10%</button>
//               <button type="button" class="btn suggestion-btn" data-value="15">15%</button>
//               <button type="button" class="btn suggestion-btn" data-value="20">20%</button>
//               <button type="button" class="btn suggestion-btn" data-value="25">25%</button>
//               <button type="button" class="btn suggestion-btn" data-value="50">50%</button>
//               <button type="button" class="btn suggestion-btn" data-value="100">100% (Free)</button>
//             </div>

//             <!-- Fixed amount suggestions -->
//             <div id="item-fixed-suggestions" class="suggestion-buttons" ${
//               currentType === "fixed" ? "" : 'style="display: none;"'
//             }>
//               <span>Quick select: </span>
//               <button type="button" class="btn suggestion-btn" data-value="1">$1</button>
//               <button type="button" class="btn suggestion-btn" data-value="2">$2</button>
//               <button type="button" class="btn suggestion-btn" data-value="5">$5</button>
//               <button type="button" class="btn suggestion-btn" data-value="${(
//                 Math.abs(item.price) * 0.1
//               ).toFixed(2)}">10% ($${(Math.abs(item.price) * 0.1).toFixed(
//       2
//     )})</button>
//               <button type="button" class="btn suggestion-btn" data-value="${(
//                 Math.abs(item.price) * 0.25
//               ).toFixed(2)}">25% ($${(Math.abs(item.price) * 0.25).toFixed(
//       2
//     )})</button>
//               <button type="button" class="btn suggestion-btn" data-value="${Math.abs(
//                 item.price
//               ).toFixed(2)}">Full price ($${Math.abs(item.price).toFixed(
//       2
//     )})</button>
//             </div>
//           </div>

//           <div class="form-actions">
//             <button type="button" class="btn secondary-btn" id="cancel-item-discount">Cancel</button>
//             <button type="button" class="btn primary-btn" id="apply-item-discount-btn">Apply Discount</button>
//           </div>
//         </form>
//       </div>
//     `;

//     // Append content to modal first
//     discountModal.appendChild(modalContent);

//     // Then append modal to body
//     document.body.appendChild(discountModal);

//     // Show the modal
//     discountModal.style.display = "block";

//     // Event handlers with null checks
//     const closeBtn = discountModal.querySelector(".close");
//     if (closeBtn) {
//       closeBtn.addEventListener("click", () => {
//         document.body.removeChild(discountModal);
//       });
//     }

//     // Toggle discount value input and suggestion buttons
//     const discountTypeInputs = discountModal.querySelectorAll(
//       'input[name="item-discount-type"]'
//     );
//     const discountValueGroup = discountModal.querySelector(
//       "#item-discount-value-group"
//     );
//     const percentageSuggestions = discountModal.querySelector(
//       "#item-percentage-suggestions"
//     );
//     const fixedSuggestions = discountModal.querySelector(
//       "#item-fixed-suggestions"
//     );
//     const discountValueInput = discountModal.querySelector(
//       "#item-discount-value"
//     );
//     const discountPreview = discountModal.querySelector("#discount-preview");
//     const newPriceDisplay = discountModal.querySelector("#new-price-display");

//     if (
//       discountTypeInputs &&
//       discountTypeInputs.length > 0 &&
//       discountValueGroup
//     ) {
//       discountTypeInputs.forEach((input) => {
//         input.addEventListener("change", () => {
//           // Show/hide value input group
//           if (input.value === "none") {
//             discountValueGroup.style.display = "none";
//             discountPreview.style.display = "none";
//           } else {
//             discountValueGroup.style.display = "block";
//             discountPreview.style.display = "block";

//             // Show/hide appropriate suggestion buttons
//             if (input.value === "percentage") {
//               percentageSuggestions.style.display = "block";
//               fixedSuggestions.style.display = "none";
//               discountValueInput.removeAttribute("max"); // Remove max constraint
//               updatePricePreview(
//                 item,
//                 "percentage",
//                 parseFloat(discountValueInput.value) || 0
//               );
//             } else if (input.value === "fixed") {
//               percentageSuggestions.style.display = "none";
//               fixedSuggestions.style.display = "block";
//               discountValueInput.setAttribute(
//                 "max",
//                 Math.abs(item.price).toFixed(2)
//               ); // Set max to item price
//               updatePricePreview(
//                 item,
//                 "fixed",
//                 parseFloat(discountValueInput.value) || 0
//               );
//             }
//           }
//         });
//       });
//     }

//     // Update price preview when discount value changes
//     if (discountValueInput) {
//       discountValueInput.addEventListener("input", () => {
//         const selectedType = discountModal.querySelector(
//           'input[name="item-discount-type"]:checked'
//         ).value;
//         if (selectedType !== "none") {
//           updatePricePreview(
//             item,
//             selectedType,
//             parseFloat(discountValueInput.value) || 0
//           );
//         }
//       });
//     }

//     // Function to update the price preview
//     function updatePricePreview(item, discountType, discountValue) {
//       const itemPrice = Math.abs(item.price);
//       let discountAmount = 0;

//       if (discountType === "percentage") {
//         discountAmount = itemPrice * (discountValue / 100);
//         if (discountAmount > itemPrice) discountAmount = itemPrice;
//       } else if (discountType === "fixed") {
//         discountAmount = discountValue;
//         if (discountAmount > itemPrice) discountAmount = itemPrice;
//       }

//       const newPrice = itemPrice - discountAmount;
//       newPriceDisplay.textContent = `$${newPrice.toFixed(2)}`;

//       // Highlight as free if fully discounted
//       if (newPrice <= 0) {
//         newPriceDisplay.classList.add("free-item");
//         newPriceDisplay.textContent = "FREE";
//       } else {
//         newPriceDisplay.classList.remove("free-item");
//       }
//     }

//     // Add event listeners to suggestion buttons
//     const suggestionBtns = discountModal.querySelectorAll(".suggestion-btn");
//     if (suggestionBtns) {
//       suggestionBtns.forEach((btn) => {
//         btn.addEventListener("click", (event) => {
//           event.preventDefault(); // Prevent form submission
//           const value = parseFloat(btn.dataset.value);
//           if (discountValueInput) {
//             discountValueInput.value = value;

//             // Update preview
//             const selectedType = discountModal.querySelector(
//               'input[name="item-discount-type"]:checked'
//             ).value;
//             updatePricePreview(item, selectedType, value);
//           }
//         });
//       });
//     }

//     // Apply item discount
//     const applyItemDiscountBtn = discountModal.querySelector(
//       "#apply-item-discount-btn"
//     );
//     if (applyItemDiscountBtn) {
//       applyItemDiscountBtn.addEventListener("click", () => {
//         const selectedTypeElement = discountModal.querySelector(
//           'input[name="item-discount-type"]:checked'
//         );

//         if (!selectedTypeElement) {
//           console.error("No discount type selected for item");
//           return;
//         }

//         const selectedType = selectedTypeElement.value;

//         if (selectedType === "none") {
//           if (item.discount) {
//             delete item.discount;
//           }
//         } else {
//           const discountValueElement = discountModal.querySelector(
//             "#item-discount-value"
//           );
//           if (!discountValueElement) {
//             console.error("Item discount value element not found");
//             return;
//           }

//           const discountValue = parseFloat(discountValueElement.value) || 0;

//           if (discountValue <= 0) {
//             alert("Please enter a valid discount value greater than 0.");
//             return;
//           }

//           // Validate discount amount
//           if (
//             selectedType === "fixed" &&
//             discountValue > Math.abs(item.price)
//           ) {
//             alert(
//               `Fixed discount cannot exceed item price ($${Math.abs(
//                 item.price
//               ).toFixed(2)})`
//             );
//             return;
//           }

//           // Calculate discounted price
//           let discountAmount = 0;
//           const basePrice = Math.abs(item.price);

//           if (selectedType === "percentage") {
//             discountAmount = basePrice * (discountValue / 100);
//             if (discountAmount > basePrice) discountAmount = basePrice;
//           } else {
//             discountAmount = discountValue;
//             if (discountAmount > basePrice) discountAmount = basePrice;
//           }

//           // Apply discount
//           item.discount = {
//             type: selectedType,
//             value: discountValue,
//             amount: discountAmount,
//           };
//         }

//         renderCart();
//         updateTotals();
//         document.body.removeChild(discountModal);
//       });
//     }

//     // Cancel button
//     const cancelItemDiscountBtn = discountModal.querySelector(
//       "#cancel-item-discount"
//     );
//     if (cancelItemDiscountBtn) {
//       cancelItemDiscountBtn.addEventListener("click", () => {
//         document.body.removeChild(discountModal);
//       });
//     }

//     // Close when clicking outside
//     window.addEventListener("click", (event) => {
//       if (event.target === discountModal) {
//         document.body.removeChild(discountModal);
//       }
//     });

//     // Initialize price preview if there's already a discount type selected
//     if (currentType !== "none") {
//       updatePricePreview(item, currentType, currentValue);
//     }
//   } catch (error) {
//     console.error("Error in showItemDiscountModal:", error);
//     alert(
//       "There was an error showing the item discount modal. Please try again."
//     );
//   }
// }

// // Add CSS for discount features
// // Add these styles to the existing addDiscountStyles function
// function addDiscountStyles() {
//   const styleElement = document.createElement("style");
//   styleElement.textContent = `
//     .discount-actions {
//       justify-content: center;
//       border-bottom: none;
//     }

//     .radio-group {
//       display: flex;
//       gap: 10px;
//       margin: 10px 0;
//     }

//     .radio-group label {
//       display: flex;
//       align-items: center;
//       gap: 5px;
//       cursor: pointer;
//     }

//     .discount-section {
//       background-color: #f9f9f9;
//       padding: 15px;
//       border-radius: 5px;
//       margin-bottom: 20px;
//     }

//     .discount-section h3 {
//       margin-top: 0;
//       margin-bottom: 10px;
//       color: var(--primary-color);
//     }

//     .hint {
//       display: block;
//       font-size: 0.8em;
//       color: #666;
//       margin-top: 5px;
//     }

//     .discounted-price {
//       color: var(--success-color);
//       font-weight: bold;
//     }

//     .original-price {
//       text-decoration: line-through;
//       font-size: 0.8em;
//       color: #777;
//     }

//     /* New styles for suggestion buttons */
//     .suggestion-buttons {
//       margin-top: 12px;
//       display: flex;
//       flex-wrap: wrap;
//       gap: 8px;
//       align-items: center;
//     }

//     .suggestion-buttons span {
//       font-size: 0.85em;
//       color: #666;
//       margin-right: 5px;
//     }

//     .suggestion-btn {
//       padding: 5px 10px;
//       font-size: 0.85em;
//       background-color: #f0f0f0;
//       border: 1px solid #ddd;
//       border-radius: 4px;
//       cursor: pointer;
//       transition: all 0.2s ease;
//     }

//     .suggestion-btn:hover {
//       background-color: var(--primary-color);
//       color: white;
//       border-color: var(--primary-color);
//     }

//     /* Item discount preview */
//     .item-info {
//       background-color: #f0f8ff;
//       padding: 10px;
//       border-radius: 4px;
//       margin-bottom: 15px;
//       border-left: 3px solid var(--primary-color);
//     }

//     .discount-preview {
//       margin-top: 12px;
//       padding: 8px;
//       background-color: #f0fff0;
//       border-radius: 4px;
//       border: 1px dashed #acacac;
//     }

//     .free-item {
//       color: #ff5722;
//       font-weight: bold;
//     }

//     /* Modal improvements */
//     .modal-content {
//       max-height: 85vh;
//       overflow-y: auto;
//     }
//   `;
//   document.head.appendChild(styleElement);
// }

// // Add this at the beginning of the updateRenderCartForDiscounts() function
// function updateRenderCartForDiscounts() {
//   // Save the original function to extend it
//   const originalRenderCart = renderCart;

//   // Override the renderCart function
//   renderCart = function () {
//     if (cart.length === 0) {
//       cartItemsEl.innerHTML =
//         '<tr class="empty-cart"><td colspan="6">No items added yet</td></tr>'; // Change to 6 columns
//       completeSaleBtn.disabled = true;
//       return;
//     }

//     cartItemsEl.innerHTML = "";
//     completeSaleBtn.disabled = false;

//     cart.forEach((item, index) => {
//       const cartItemRow = document.createElement("tr");

//       // Check if this is the selected item
//       if (index === selectedCartIndex) {
//         cartItemRow.classList.add("selected-row");
//       }

//       // Calculate the display price based on discounts
//       let displayPrice = Math.abs(item.price);
//       let displayTotal = Math.abs(item.price * item.quantity);
//       let discountInfo = "";

//       if (item.discount) {
//         const discountAmount = item.discount.amount;
//         const discountedPrice = displayPrice - discountAmount;

//         discountInfo = `
//           <div class="discounted-price">$${discountedPrice.toFixed(2)}</div>
//           <div class="original-price">$${displayPrice.toFixed(2)}</div>
//         `;

//         displayTotal = discountedPrice * item.quantity;
//       } else {
//         discountInfo = `$${displayPrice.toFixed(2)}`;
//       }

//       // If this is a refund, show negative values
//       const isRefund = item.price < 0;
//       if (isRefund) {
//         displayTotal = -displayTotal;
//       }

//       // Add checkbox column
//       cartItemRow.innerHTML = `
//         <td>
//           <input type="checkbox" class="item-select" data-index="${index}" ${
//         selectedItems.includes(index) ? "checked" : ""
//       }>
//         </td>
//         <td>${item.name}${isRefund ? " (Refund)" : ""}${
//         item.isMiscellaneous ? " (Misc)" : ""
//       }</td>
//         <td>${discountInfo}</td>
//         <td>
//           <button class="btn quantity-btn" data-action="decrease" data-index="${index}">-</button>
//           <span class="quantity">${item.quantity}</span>
//           <button class="btn quantity-btn" data-action="increase" data-index="${index}">+</button>
//         </td>
//         <td>$${Math.abs(displayTotal).toFixed(2)}</td>
//         <td>
//           <button class="btn remove-btn" data-index="${index}">Remove</button>
//         </td>
//       `;

//       cartItemsEl.appendChild(cartItemRow);
//     });

//     // Add checkbox event listeners
//     document.querySelectorAll(".item-select").forEach((checkbox) => {
//       checkbox.addEventListener("change", (event) => {
//         const index = parseInt(event.target.dataset.index);
//         if (event.target.checked) {
//           if (!selectedItems.includes(index)) {
//             selectedItems.push(index);
//           }
//         } else {
//           selectedItems = selectedItems.filter((i) => i !== index);
//         }

//         // Update UI to show selected items
//         document.querySelectorAll("#cart-items tr").forEach((row, idx) => {
//           if (selectedItems.includes(idx)) {
//             row.classList.add("selected-row");
//           } else if (idx !== selectedCartIndex) {
//             row.classList.remove("selected-row");
//           }
//         });
//       });
//     });

//     // Add event listeners to quantity and remove buttons
//     document.querySelectorAll(".quantity-btn").forEach((btn) => {
//       btn.addEventListener("click", handleQuantityChange);
//     });

//     document.querySelectorAll(".remove-btn").forEach((btn) => {
//       btn.addEventListener("click", handleRemoveItem);
//     });

//     // Add click event to select rows
//     document.querySelectorAll("#cart-items tr").forEach((row, index) => {
//       row.addEventListener("click", (event) => {
//         // Ignore clicks on buttons and checkboxes
//         if (
//           event.target.tagName === "BUTTON" ||
//           event.target.tagName === "INPUT"
//         )
//           return;

//         // Remove selection from other rows unless Ctrl key is pressed
//         if (!event.ctrlKey) {
//           document.querySelectorAll("#cart-items tr").forEach((r) => {
//             r.classList.remove("selected-row");
//           });
//         }

//         // Add selection to clicked row
//         row.classList.add("selected-row");
//         selectedCartIndex = index;
//       });
//     });
//   };
// }

// function initializeCartTable() {
//   const headerRow = document.querySelector("#cart-table thead tr");
//   if (headerRow) {
//     // Check if the checkbox column already exists
//     if (!headerRow.querySelector("th:first-child").textContent.trim() === "") {
//       // Create a new header cell for checkboxes
//       const checkboxHeader = document.createElement("th");
//       checkboxHeader.textContent = ""; // Empty header for checkboxes

//       // Insert it as the first column
//       headerRow.insertBefore(checkboxHeader, headerRow.firstChild);

//       // Update the colspan of the empty cart message
//       const emptyCart = document.querySelector(".empty-cart td");
//       if (emptyCart) {
//         emptyCart.setAttribute("colspan", "6");
//       }
//     }
//   }
// }

// // Update the updateTotals function to include discounts
// function updateUpdateTotalsForDiscounts() {
//   // Save the original function
//   const originalUpdateTotals = updateTotals;

//   // Override the updateTotals function
//   updateTotals = function () {
//     // Calculate subtotal with item-level discounts
//     let subtotal = 0;
//     let totalCost = 0;

//     cart.forEach((item) => {
//       const baseAmount = item.price * item.quantity;
//       let itemTotal = baseAmount;

//       // Apply item-level discount if any
//       if (item.discount) {
//         const discountPerUnit = item.discount.amount;
//         const totalDiscount = discountPerUnit * item.quantity;
//         itemTotal = baseAmount - totalDiscount;
//       }

//       subtotal += itemTotal;
//       totalCost += (item.cost || 0) * item.quantity;
//     });

//     // Apply cart-level discount
//     let discountAmount = 0;
//     if (cartDiscount.type !== "none") {
//       if (cartDiscount.type === "percentage") {
//         discountAmount = subtotal * (cartDiscount.value / 100);
//       } else {
//         // fixed amount
//         discountAmount = cartDiscount.value;
//         // Don't allow discount larger than subtotal
//         if (discountAmount > subtotal) {
//           discountAmount = subtotal;
//         }
//       }

//       // Update cart discount amount
//       cartDiscount.amount = discountAmount;
//     }

//     // Calculate final subtotal after cart discount
//     const finalSubtotal = subtotal - discountAmount;

//     // Calculate tax and total
//     const profit = finalSubtotal - totalCost;
//     const tax = finalSubtotal * TAX_RATE;
//     const total = finalSubtotal + tax;

//     // Update display
//     subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
//     document.getElementById(
//       "discount-value"
//     ).textContent = `$${discountAmount.toFixed(2)}`;
//     taxEl.textContent = `$${tax.toFixed(2)}`;
//     totalEl.textContent = `$${total.toFixed(2)}`;
//   };
// }

// // Adjust completeSale function to include discounts in the invoice
// function updateCompleteSaleForDiscounts() {
//   // Save original function
//   const originalCompleteSale = completeSale;

//   // Override completeSale
//   completeSale = async function () {
//     if (cart.length === 0) return;

//     try {
//       // Process items to include discount info
//       const processedItems = cart.map((item) => {
//         const basePrice = item.price;
//         let finalPrice = basePrice;
//         let itemDiscount = 0;

//         // Apply item-level discount
//         if (item.discount) {
//           itemDiscount = item.discount.amount * item.quantity;
//           finalPrice = basePrice - item.discount.amount;
//         }

//         return {
//           ...item,
//           originalPrice: basePrice,
//           finalPrice: finalPrice,
//           itemDiscount: itemDiscount,
//         };
//       });

//       const subtotal = parseFloat(subtotalEl.textContent.replace("$", ""));
//       const discount = parseFloat(
//         document.getElementById("discount-value").textContent.replace("$", "")
//       );
//       const tax = parseFloat(taxEl.textContent.replace("$", ""));
//       const total = parseFloat(totalEl.textContent.replace("$", ""));

//       const invoiceData = {
//         items: processedItems,
//         customer: customerNameEl.value || "Guest Customer",
//         subtotal: subtotal,
//         discount: discount,
//         discountDetails: cartDiscount,
//         tax: tax,
//         total: total,
//         date: new Date().toISOString(),
//         isRefund: cart.some((item) => item.price < 0),
//       };

//       // Save invoice to database
//       const invoiceId = await window.api.createInvoice(invoiceData);

//       // Generate receipt HTML
//       const receiptHtml = generateReceiptHtmlWithDiscount({
//         ...invoiceData,
//         id: invoiceId,
//       });

//       // Display receipt in modal
//       receiptContainerEl.innerHTML = receiptHtml;
//       receiptModal.style.display = "block";
//     } catch (error) {
//       console.error("Error completing sale:", error);
//       alert("Failed to complete sale. Please try again.");
//     }
//   };
// }

// // Updated receipt HTML generation to include discounts
// function generateReceiptHtmlWithDiscount(invoice) {
//   let itemsHtml = "";

//   invoice.items.forEach((item) => {
//     const quantity = item.quantity;
//     const originalPrice = Math.abs(item.originalPrice);
//     const finalPrice = Math.abs(item.finalPrice);
//     const hasDiscount = originalPrice !== finalPrice;
//     const lineTotal = Math.abs(item.finalPrice * quantity);

//     if (hasDiscount) {
//       itemsHtml += `
//         <tr>
//           <td>${item.name}</td>
//           <td>${quantity}</td>
//           <td>
//             <div>$${finalPrice.toFixed(2)}</div>
//             <div><small><s>$${originalPrice.toFixed(2)}</s></small></div>
//           </td>
//           <td>$${lineTotal.toFixed(2)}</td>
//         </tr>
//       `;
//     } else {
//       itemsHtml += `
//         <tr>
//           <td>${item.name}</td>
//           <td>${quantity}</td>
//           <td>$${originalPrice.toFixed(2)}</td>
//           <td>$${lineTotal.toFixed(2)}</td>
//         </tr>
//       `;
//     }
//   });

//   // Transaction type label (Sale or Refund)
//   const transactionType = invoice.isRefund ? "REFUND" : "SALE";

//   // Discount row in footer
//   let discountRow = "";
//   if (invoice.discount > 0) {
//     discountRow = `
//       <tr>
//         <td colspan="3">Discount</td>
//         <td>-$${invoice.discount.toFixed(2)}</td>
//       </tr>
//     `;
//   }

//   return `
//     <div class="receipt-header">
//       <h2>BenchPOS</h2>
//       <p>123 Main Street, Anytown, USA</p>
//       <p>Tel: (555) 123-4567</p>
//       <h3>${transactionType}</h3>
//     </div>

//     <div class="receipt-info">
//       <p><strong>Receipt #:</strong> ${invoice.id}</p>
//       <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleString()}</p>
//       <p><strong>Customer:</strong> ${invoice.customer}</p>
//     </div>

//     <table class="receipt-items">
//       <thead>
//         <tr>
//           <th>Item</th>
//           <th>Qty</th>
//           <th>Price</th>
//           <th>Total</th>
//         </tr>
//       </thead>
//       <tbody>
//         ${itemsHtml}
//       </tbody>
//       <tfoot>
//         <tr>
//           <td colspan="3">Subtotal</td>
//           <td>$${invoice.subtotal.toFixed(2)}</td>
//         </tr>
//         ${discountRow}
//         <tr>
//           <td colspan="3">Tax (0)</td>
//           <td>$${invoice.tax.toFixed(2)}</td>
//         </tr>
//         <tr class="total-row">
//           <td colspan="3">Total</td>
//           <td>$${invoice.total.toFixed(2)}</td>
//         </tr>
//       </tfoot>
//     </table>

//     <div class="receipt-footer">
//       <p>Thank you for your purchase!</p>
//     </div>
//   `;
// }

// // Global variables for barcode scanning
// // let scannerActive = false;
// // let videoElement = null;
// // let scannerStream = null;
// // let scanner = null;

// // // Load QuaggaJS library
// // // Replace the loadQuaggaJSLibrary function with this version
// // function loadQuaggaJSLibrary() {
// //   // Check if QuaggaJS is already loaded
// //   if (window.Quagga) {
// //     console.log("QuaggaJS already loaded");
// //     return;
// //   }

// //   // Create script element to load QuaggaJS locally
// //   const script = document.createElement("script");
// //   script.src = "../scripts/quagga.min.js"; // Path to your local copy
// //   script.async = true;

// //   // Add error handling
// //   script.onerror = function () {
// //     console.error("Failed to load QuaggaJS library");
// //     alert(
// //       "Barcode scanning is not available. Failed to load required library."
// //     );
// //   };

// //   // Add to document
// //   document.head.appendChild(script);

// //   console.log("QuaggaJS loading from local file...");
// // }

// // // Toggle barcode scanner
// // function toggleBarcodeScanner() {
// //   if (scannerActive) {
// //     stopBarcodeScanner();
// //   } else {
// //     startBarcodeScanner();
// //   }
// // }

// // // Start barcode scanner
// // // Modify startBarcodeScanner to work with the persistent scanner
// // function startBarcodeScanner() {
// //   if (scannerActive) return;

// //   // Check if QuaggaJS is loaded
// //   if (!window.Quagga) {
// //     document.getElementById("scanner-status").textContent =
// //       "Scanner loading...";
// //     return;
// //   }

// //   // Get video element
// //   videoElement = document.getElementById("scanner-video");

// //   // Initialize Quagga
// //   initQuagga();

// //   // Set flag
// //   scannerActive = true;
// //   document.getElementById("scanner-status").textContent = "Scanner active";
// // }

// // // Modify stopBarcodeScanner to work with the persistent scanner
// // function stopBarcodeScanner() {
// //   if (!scannerActive) return;

// //   if (Quagga) {
// //     Quagga.stop();
// //   }

// //   // Clean up camera stream
// //   if (scannerStream && typeof scannerStream.stop === "function") {
// //     scannerStream.stop();
// //   }

// //   scannerActive = false;
// //   videoElement = null;
// //   scannerStream = null;

// //   document.getElementById("scanner-status").textContent = "Scanner paused";
// // }

// // // Initialize Quagga barcode scanner
// // function initQuagga() {
// //   Quagga.init(
// //     {
// //       inputStream: {
// //         name: "Live",
// //         type: "LiveStream",
// //         target: videoElement,
// //         constraints: {
// //           width: 640,
// //           height: 480,
// //           facingMode: "environment", // Use back camera on mobile
// //         },
// //       },
// //       locator: {
// //         patchSize: "medium",
// //         halfSample: true,
// //       },
// //       numOfWorkers: navigator.hardwareConcurrency || 4,
// //       decoder: {
// //         readers: [
// //           "ean_reader",
// //           "ean_8_reader",
// //           "code_128_reader",
// //           "code_39_reader",
// //           "upc_reader",
// //         ],
// //       },
// //       locate: true,
// //     },
// //     function (err) {
// //       if (err) {
// //         console.error("Quagga initialization error:", err);
// //         document.getElementById("scanner-status").textContent =
// //           "Camera error: " + err.message;
// //         return;
// //       }

// //       console.log("Quagga initialization complete");
// //       Quagga.start();

// //       // Store stream reference for later cleanup
// //       scannerStream = Quagga.CameraAccess.getActiveTrack();

// //       // Set up event listeners
// //       setupQuaggaListeners();
// //     }
// //   );
// // }

// // // Set up Quagga event listeners
// // function setupQuaggaListeners() {
// //   // Process detected barcodes
// //   Quagga.onDetected(function (result) {
// //     const code = result.codeResult.code;
// //     const format = result.codeResult.format;

// //     console.log("Barcode detected:", code, "Format:", format);

// //     // Display the detected code
// //     document.getElementById("scanner-status").textContent = `Detected: ${code}`;

// //     // Validate the code (basic check for reasonable length)
// //     if (code && code.length >= 6) {
// //       // Play success sound
// //       const beepSound = new Audio(
// //         "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU..."
// //       );
// //       beepSound.play().catch((e) => console.log("Audio play failed:", e));

// //       // Look up the product
// //       stopBarcodeScanner();
// //       findProductByBarcode(code);
// //     }
// //   });

// //   // Visualize detection process (optional)
// //   Quagga.onProcessed(function (result) {
// //     const canvas = document.getElementById("scanner-canvas");
// //     const ctx = canvas.getContext("2d");

// //     if (result) {
// //       // Draw detection result if available
// //       if (result.boxes) {
// //         ctx.clearRect(0, 0, canvas.width, canvas.height);
// //         const hasResult = result.boxes.filter((box) => box !== result.box);

// //         Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, ctx, {
// //           color: "blue",
// //           lineWidth: 2,
// //         });
// //       }
// //     }
// //   });
// // }

// // // Stop barcode scanner
// // function stopBarcodeScanner() {
// //   if (Quagga) {
// //     Quagga.stop();
// //   }

// //   // Clean up camera stream
// //   if (scannerStream && typeof scannerStream.stop === "function") {
// //     scannerStream.stop();
// //   }

// //   // Remove scanner modal
// //   const scannerModal = document.getElementById("scanner-modal");
// //   if (scannerModal) {
// //     document.body.removeChild(scannerModal);
// //   }

// //   scannerActive = false;
// //   videoElement = null;
// //   scannerStream = null;
// // }

// // // Find product by barcode
// // function findProductByBarcode(barcode) {
// //   console.log("Looking up barcode:", barcode);

// //   // Clear search field and set the barcode
// //   const searchField = document.getElementById("product-search");
// //   searchField.value = barcode;

// //   // Try to find matching product by ID (exact match) or search
// //   const exactMatch = products.find(
// //     (p) => p.id === barcode || p.sku === barcode
// //   );

// //   if (exactMatch) {
// //     // Add product to cart
// //     addToCart(exactMatch);

// //     // Clear search field
// //     searchField.value = "";

// //     // Provide feedback
// //     showBarcodeMessage(`Added: ${exactMatch.name}`);
// //   } else {
// //     // Filter products to see if we have partial matches
// //     const matchingProducts = products.filter(
// //       (p) =>
// //         (p.id && p.id.includes(barcode)) || (p.sku && p.sku.includes(barcode))
// //     );

// //     if (matchingProducts.length > 0) {
// //       // Display matching products
// //       renderProducts(matchingProducts);

// //       // Provide feedback
// //       showBarcodeMessage(`Found ${matchingProducts.length} matching products`);
// //     } else {
// //       // No matches found
// //       showBarcodeMessage("No product found with this barcode", true);

// //       // Show all products
// //       renderProducts(products);
// //     }
// //   }
// // }

// // // Show barcode message as a temporary notification
// // function showBarcodeMessage(message, isError = false) {
// //   // Create notification element if it doesn't exist
// //   let notification = document.getElementById("barcode-notification");

// //   if (!notification) {
// //     notification = document.createElement("div");
// //     notification.id = "barcode-notification";
// //     notification.className = "notification";
// //     document.body.appendChild(notification);
// //   }

// //   // Set message and style
// //   notification.textContent = message;
// //   notification.className = "notification " + (isError ? "error" : "success");

// //   // Show notification
// //   notification.style.display = "block";

// //   // Hide after a delay
// //   setTimeout(() => {
// //     notification.style.display = "none";
// //   }, 3000);
// // }

// // // Add CSS for barcode scanning features
// // function addBarcodeScannerStyles() {
// //   const styleElement = document.createElement("style");
// //   styleElement.textContent = `
// //     .search-container {
// //       display: flex;
// //       gap: 10px;
// //     }

// //     .search-container input {
// //       flex: 1;
// //     }

// //     #barcode-scan-btn {
// //       display: flex;
// //       align-items: center;
// //       gap: 5px;
// //     }

// //     .scan-icon {
// //       font-size: 1.2em;
// //     }

// //     #scanner-modal .modal-content {
// //       width: 90%;
// //       max-width: 640px;
// //       padding: 0;
// //       background-color: #000;
// //     }

// //     .scanner-content {
// //       display: flex;
// //       flex-direction: column;
// //       width: 100%;
// //       height: 100%;
// //       color: white;
// //     }

// //     .scanner-header {
// //       display: flex;
// //       justify-content: space-between;
// //       align-items: center;
// //       padding: 15px;
// //       background-color: #333;
// //     }

// //     .scanner-header h3 {
// //       margin: 0;
// //       color: white;
// //     }

// //     #close-scanner {
// //       background: none;
// //       border: none;
// //       color: white;
// //       font-size: 1.5em;
// //       cursor: pointer;
// //     }

// //     .viewport {
// //       position: relative;
// //       width: 100%;
// //       height: 300px;
// //       overflow: hidden;
// //       background-color: #000;
// //     }

// //     #scanner-video {
// //       width: 100%;
// //       height: 100%;
// //       object-fit: cover;
// //     }

// //     #scanner-canvas {
// //       position: absolute;
// //       top: 0;
// //       left: 0;
// //       width: 100%;
// //       height: 100%;
// //       z-index: 1;
// //     }

// //     .scanner-overlay {
// //       position: absolute;
// //       top: 0;
// //       left: 0;
// //       width: 100%;
// //       height: 100%;
// //       z-index: 2;
// //       pointer-events: none;
// //     }

// //     .scanner-guide {
// //       position: absolute;
// //       top: 50%;
// //       left: 50%;
// //       transform: translate(-50%, -50%);
// //       width: 70%;
// //       height: 150px;
// //       border: 2px solid rgba(0, 255, 0, 0.5);
// //       border-radius: 10px;
// //       box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.5);
// //     }

// //     .scanner-laser {
// //       position: absolute;
// //       top: 50%;
// //       left: 0;
// //       right: 0;
// //       height: 2px;
// //       background: red;
// //       z-index: 3;
// //       animation: scan 2s infinite linear;
// //     }

// //     @keyframes scan {
// //       0% { top: 40%; }
// //       50% { top: 60%; }
// //       100% { top: 40%; }
// //     }

// //     .scanner-footer {
// //       padding: 15px;
// //       text-align: center;
// //       background-color: #333;
// //     }

// //     #scanner-status {
// //       font-weight: bold;
// //       margin-top: 10px;
// //       color: #4dff4d;
// //     }

// //     .notification {
// //       position: fixed;
// //       top: 20px;
// //       right: 20px;
// //       padding: 15px 20px;
// //       border-radius: 5px;
// //       z-index: 1000;
// //       animation: fadeInOut 3s forwards;
// //       box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
// //       display: none;
// //     }

// //     .notification.success {
// //       background-color: var(--success-color);
// //       color: white;
// //     }

// //     .notification.error {
// //       background-color: var(--danger-color);
// //       color: white;
// //     }

// //     @keyframes fadeInOut {
// //       0% { opacity: 0; transform: translateY(-20px); }
// //       10% { opacity: 1; transform: translateY(0); }
// //       90% { opacity: 1; transform: translateY(0); }
// //       100% { opacity: 0; transform: translateY(-20px); }
// //     }
// //   `;
// //   document.head.appendChild(styleElement);
// // }

// // Invoice Navigation functionality
// // Add this to billing.js

// // Global variables for invoice navigation
// let allInvoices = [];
// let currentInvoiceIndex = -1;
// let isViewingInvoice = false;
// let isEditingInvoice = false;

// // Add invoice navigation buttons to the page
// function initInvoiceNavigation() {
//   // Create a navigation bar for invoice browsing with shortcut indicators
//   const navBar = document.createElement("div");
//   navBar.className = "invoice-nav";
//   navBar.innerHTML = `
//     <button id="previous-invoice-btn" class="btn secondary-btn" title="Previous Invoice">
//       <span class="nav-icon">◀</span> Previous <span class="shortcut-indicator">(F11)</span>
//     </button>
//     <button id="view-invoices-btn" class="btn secondary-btn" title="Browse Invoices">
//       <span class="nav-icon">📋</span> Browse Invoices
//     </button>
//     <button id="next-invoice-btn" class="btn secondary-btn" title="Next Invoice">
//       Next <span class="shortcut-indicator">(F12)</span> <span class="nav-icon">▶</span>
//     </button>
//   `;

//   // Find the search bar to insert the navigation bar before it
//   const searchBar = document.querySelector(".product-selection .search-bar");
//   if (searchBar) {
//     // Insert before the search bar
//     searchBar.parentNode.insertBefore(navBar, searchBar);

//     // Add styles for better spacing
//     const styleElement = document.createElement("style");
//     styleElement.textContent = `
//       .invoice-nav {
//         display: flex;
//         justify-content: space-between;
//         gap: 10px;
//         margin-bottom: 15px;
//         margin-top: 10px;
//       }

//       .nav-icon {
//         font-size: 0.8em;
//       }

//       .shortcut-indicator {
//         font-size: 0.8em;
//         opacity: 0.7;
//         font-weight: normal;
//       }

//       .product-selection h2 {
//         margin-bottom: 10px;
//       }

//       /* Make the buttons take equal width */
//       .invoice-nav button {
//         flex: 1;
//         white-space: nowrap;
//         font-size: 0.9rem;
//         text-align: center;
//         justify-content: center;
//       }

//       /* Keep the buttons visible on smaller screens */
//       @media (max-width: 768px) {
//         .invoice-nav {
//           flex-wrap: wrap;
//         }

//         .invoice-nav button {
//           flex: 1 1 auto;
//           padding: 8px 10px;
//           font-size: 0.85rem;
//         }

//         .shortcut-indicator {
//           display: none; /* Hide shortcuts on mobile */
//         }
//       }
//     `;
//     document.head.appendChild(styleElement);
//   } else {
//     // Fallback to original position if search bar not found
//     const billingContainer = document.querySelector(".billing-container");
//     billingContainer.parentNode.insertBefore(navBar, billingContainer);
//   }

//   // Add event listeners
//   document
//     .getElementById("previous-invoice-btn")
//     .addEventListener("click", showPreviousInvoice);
//   document
//     .getElementById("next-invoice-btn")
//     .addEventListener("click", showNextInvoice);
//   document
//     .getElementById("view-invoices-btn")
//     .addEventListener("click", showInvoiceBrowser);

//   // Add keyboard shortcuts
//   document.addEventListener("keydown", function (event) {
//     // Don't trigger if in text input
//     if (
//       event.target.tagName === "INPUT" ||
//       event.target.tagName === "TEXTAREA"
//     ) {
//       return;
//     }

//     switch (event.key) {
//       case "F11":
//         event.preventDefault();
//         showPreviousInvoice();
//         break;
//       case "F12":
//         event.preventDefault();
//         showNextInvoice();
//         break;
//     }
//   });

//   // Load invoices initially
//   loadAllInvoices();
// }
// // This function applies a much stronger fix to force the cart to be scrollable
// function forceCartScrolling() {
//   const styleElement = document.createElement("style");
//   styleElement.textContent = `
//     /* Force fixed height for cart container with !important to override existing styles */
//     .cart-items {
//       height: 250px !important; /* Fixed height - adjust if needed */
//       max-height: 250px !important;
//       overflow-y: auto !important;
//       border: 1px solid var(--border-color) !important;
//       border-radius: 8px !important;
//       position: relative !important;
//       display: block !important; /* Override any flex display */
//     }

//     /* Force table to take full width and proper layout */
//     #cart-table {
//       width: 100% !important;
//       border-collapse: collapse !important;
//       margin: 0 !important;
//     }

//     /* Make header sticky with higher z-index to ensure it stays on top */
//     #cart-table thead {
//       position: sticky !important;
//       top: 0 !important;
//       z-index: 100 !important;
//       background-color: var(--primary-light) !important;
//     }

//     #cart-table th {
//       position: sticky !important;
//       top: 0 !important;
//       background-color: var(--primary-light) !important;
//       box-shadow: 0 1px 0 0 var(--border-color) !important;
//     }

//     /* Set explicit height for the invoice details to prevent page overflow */
//     .invoice-details {
//       display: flex !important;
//       flex-direction: column !important;
//       height: auto !important;
//     }

//     /* Make sure invoice panel has proper constraints */
//     .invoice-panel {
//       display: flex !important;
//       flex-direction: column !important;
//       height: auto !important;
//       overflow: visible !important;
//     }

//     /* Ensure the scrollbar is visible and functioning */
//     .cart-items::-webkit-scrollbar {
//       width: 8px !important;
//       display: block !important;
//     }

//     .cart-items::-webkit-scrollbar-track {
//       background: #f1f1f1 !important;
//       border-radius: 8px !important;
//     }

//     .cart-items::-webkit-scrollbar-thumb {
//       background: var(--primary-color) !important;
//       border-radius: 8px !important;
//     }
//   `;
//   document.head.appendChild(styleElement);

//   console.log("Applied forced cart scrolling styles");

//   // Add an additional function to ensure proper initialization
//   function ensureCartScrolling() {
//     const cartItemsContainer = document.querySelector(".cart-items");
//     if (cartItemsContainer) {
//       // Force the height and scrolling behavior through direct style modification
//       cartItemsContainer.style.height = "250px";
//       cartItemsContainer.style.maxHeight = "250px";
//       cartItemsContainer.style.overflowY = "auto";

//       // Force table headers to be sticky
//       const tableHeaders = document.querySelectorAll("#cart-table th");
//       tableHeaders.forEach((th) => {
//         th.style.position = "sticky";
//         th.style.top = "0";
//         th.style.zIndex = "100";
//       });

//       console.log("Applied direct style modifications to cart container");
//     }
//   }

//   // Execute immediately and also set up for later execution
//   ensureCartScrolling();

//   // Set a mutation observer to ensure scrolling behavior persists
//   // even if the DOM changes (like when items are added)
//   const observer = new MutationObserver((mutations) => {
//     ensureCartScrolling();
//   });

//   const cartItemsContainer = document.querySelector(".cart-items");
//   if (cartItemsContainer) {
//     observer.observe(cartItemsContainer, {
//       childList: true,
//       subtree: true,
//     });
//   }

//   // Also handle window resize events
//   window.addEventListener("resize", ensureCartScrolling);
// }
// // Load all invoices from the database
// async function loadAllInvoices() {
//   try {
//     allInvoices = await window.api.getInvoices();
//     console.log(`Loaded ${allInvoices.length} invoices`);

//     // Sort by date (newest first)
//     allInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));

//     // Update UI buttons based on available invoices
//     updateNavigationButtons();
//   } catch (error) {
//     console.error("Error loading invoices:", error);
//   }
// }

// // Update navigation buttons state
// function updateNavigationButtons() {
//   const prevBtn = document.getElementById("previous-invoice-btn");
//   const nextBtn = document.getElementById("next-invoice-btn");

//   if (allInvoices.length === 0) {
//     prevBtn.disabled = true;
//     nextBtn.disabled = true;
//     return;
//   }

//   if (isViewingInvoice) {
//     prevBtn.disabled = currentInvoiceIndex <= 0;
//     nextBtn.disabled = currentInvoiceIndex >= allInvoices.length - 1;
//   } else {
//     prevBtn.disabled = allInvoices.length === 0;
//     nextBtn.disabled = allInvoices.length === 0;
//   }
// }

// // Show previous invoice
// function showPreviousInvoice() {
//   if (allInvoices.length === 0) {
//     alert("No invoices available");
//     return;
//   }

//   if (!isViewingInvoice) {
//     // If not already viewing an invoice, load the most recent one
//     currentInvoiceIndex = 0;
//   } else if (currentInvoiceIndex > 0) {
//     // Move to previous invoice
//     currentInvoiceIndex--;
//   } else {
//     alert("You are viewing the oldest invoice");
//     return;
//   }

//   loadInvoice(allInvoices[currentInvoiceIndex]);
// }

// // Show next invoice
// function showNextInvoice() {
//   if (allInvoices.length === 0) {
//     alert("No invoices available");
//     return;
//   }

//   if (!isViewingInvoice) {
//     // If not already viewing an invoice, load the most recent one
//     currentInvoiceIndex = 0;
//   } else if (currentInvoiceIndex < allInvoices.length - 1) {
//     // Move to next invoice
//     currentInvoiceIndex++;
//   } else {
//     alert("You are viewing the most recent invoice");
//     return;
//   }

//   loadInvoice(allInvoices[currentInvoiceIndex]);
// }

// // Load a specific invoice
// function loadInvoice(invoice) {
//   // Clear current cart first
//   if (cart.length > 0 && !isViewingInvoice) {
//     if (
//       !confirm("Loading an invoice will clear your current cart. Continue?")
//     ) {
//       return;
//     }
//   }

//   // Set viewing flag
//   isViewingInvoice = true;

//   // Clear current cart
//   cart = [];

//   // Convert invoice items to cart format
//   invoice.items.forEach((item) => {
//     cart.push({
//       id: item.id,
//       name: item.name,
//       price: item.price || item.finalPrice,
//       cost: item.cost || 0,
//       quantity: item.quantity,
//       total: item.total || item.price * item.quantity,
//       isRefund: item.price < 0 || false,
//       isMiscellaneous: item.isMiscellaneous || false,
//       discount: item.discount,
//     });
//   });

//   // Set customer info
//   customerNameEl.value = invoice.customer || "Guest Customer";

//   // Apply cart-level discount if any
//   if (invoice.discountDetails && invoice.discountDetails.type !== "none") {
//     cartDiscount = invoice.discountDetails;
//   } else {
//     cartDiscount = { type: "none", value: 0, amount: 0 };
//   }

//   // Update UI
//   renderCart();
//   updateTotals();

//   // Add an invoice view indicator
//   const invoicePanel = document.querySelector(".invoice-panel h2");

//   // Remove previous indicators if any
//   const existingIndicator = document.getElementById("invoice-view-indicator");
//   if (existingIndicator) {
//     existingIndicator.remove();
//   }

//   // Add new indicator
//   const indicator = document.createElement("div");
//   indicator.id = "invoice-view-indicator";
//   indicator.className = "invoice-indicator";
//   indicator.innerHTML = `
//     <span>Viewing Invoice #${invoice.id}</span>
//     <div class="invoice-actions">
//       <button id="edit-invoice-btn" class="btn secondary-btn">Edit</button>
//       <button id="new-invoice-btn" class="btn secondary-btn">New Invoice</button>
//     </div>
//   `;

//   invoicePanel.after(indicator);

//   // Add event listeners for new buttons
//   document
//     .getElementById("edit-invoice-btn")
//     .addEventListener("click", () => toggleEditMode(invoice));
//   document
//     .getElementById("new-invoice-btn")
//     .addEventListener("click", startNewInvoice);

//   // Disable the regular cart buttons if not in edit mode
//   toggleCartButtons(false);

//   // Update navigation buttons
//   updateNavigationButtons();
// }

// // Toggle edit mode for an invoice
// function toggleEditMode(invoice) {
//   isEditingInvoice = !isEditingInvoice;

//   const indicator = document.getElementById("invoice-view-indicator");
//   const editBtn = document.getElementById("edit-invoice-btn");

//   if (isEditingInvoice) {
//     // Enable editing
//     indicator.classList.add("editing");
//     editBtn.textContent = "Save Changes";
//     editBtn.classList.add("primary-btn");
//     toggleCartButtons(true);
//   } else {
//     // Save changes
//     if (confirm("Save changes to this invoice?")) {
//       saveInvoiceChanges(invoice);
//     } else {
//       // Reload the original invoice to discard changes
//       loadInvoice(invoice);
//       return;
//     }

//     // Update UI
//     indicator.classList.remove("editing");
//     editBtn.textContent = "Edit";
//     editBtn.classList.remove("primary-btn");
//     toggleCartButtons(false);
//   }
// }

// // Save changes to an invoice
// async function saveInvoiceChanges(originalInvoice) {
//   try {
//     // Calculate totals
//     const subtotal = parseFloat(subtotalEl.textContent.replace("$", ""));
//     const discount = parseFloat(
//       document.getElementById("discount-value").textContent.replace("$", "")
//     );
//     const tax = parseFloat(taxEl.textContent.replace("$", ""));
//     const total = parseFloat(totalEl.textContent.replace("$", ""));

//     // Prepare updated invoice data
//     const updatedInvoice = {
//       ...originalInvoice,
//       items: cart.map((item) => ({
//         id: item.id,
//         name: item.name,
//         price: item.price,
//         cost: item.cost || 0,
//         quantity: item.quantity,
//         total: item.price * item.quantity,
//         discount: item.discount,
//         isRefund: item.isRefund || false,
//         isMiscellaneous: item.isMiscellaneous || false,
//       })),
//       customer: customerNameEl.value || "Guest Customer",
//       subtotal: subtotal,
//       discount: discount,
//       discountDetails: cartDiscount,
//       tax: tax,
//       total: total,
//       lastModified: new Date().toISOString(),
//     };

//     // Save to database
//     await window.api.updateInvoice(updatedInvoice);

//     // Update local copy
//     allInvoices[currentInvoiceIndex] = updatedInvoice;

//     // Show confirmation
//     showNotification("Invoice updated successfully", false);
//   } catch (error) {
//     console.error("Error saving invoice changes:", error);
//     showNotification("Error saving changes", true);
//   }

//   isViewingInvoice = false;
//   isEditingInvoice = false;
//   toggleCartButtons(true);
//   document.getElementById("barcode-input").disabled = false;
//   document.getElementById("customer-name").disabled = false;
//   document.getElementById("product-search").disabled = false;

//   // Enable all input fields
//   document.querySelectorAll("input").forEach((input) => {
//     input.disabled = false;
//   });
// }

// // Start a new invoice
// function startNewInvoice() {
//   if (confirm("Start a new invoice? This will clear the current view.")) {
//     isViewingInvoice = false;
//     isEditingInvoice = false;
//     currentInvoiceIndex = -1;

//     // Clear cart
//     cart = [];
//     renderCart();
//     updateTotals();

//     // Clear customer info
//     customerNameEl.value = "";

//     // Reset discount
//     cartDiscount = { type: "none", value: 0, amount: 0 };

//     // Remove invoice indicator
//     const indicator = document.getElementById("invoice-view-indicator");
//     if (indicator) {
//       indicator.remove();
//     }

//     // Enable cart buttons
//     toggleCartButtons(true);

//     // Update navigation buttons
//     updateNavigationButtons();
//   }

//   document.getElementById("barcode-input").disabled = false;
//   document.getElementById("customer-name").disabled = false;
//   document.getElementById("product-search").disabled = false;

//   // Enable all input fields
//   document.querySelectorAll("input").forEach((input) => {
//     input.disabled = false;
//   });
// }

// // Enable/disable cart interaction buttons
// function toggleCartButtons(enabled) {
//   const quantityBtns = document.querySelectorAll(".quantity-btn");
//   const removeBtns = document.querySelectorAll(".remove-btn");
//   const clearBtn = document.getElementById("clear-invoice");
//   const completeBtn = document.getElementById("complete-sale");
//   const discountBtn = document.getElementById("add-discount-btn");
//   const refundBtn = document.getElementById("refund-selected"); // Add this line

//   quantityBtns.forEach((btn) => (btn.disabled = !enabled));
//   removeBtns.forEach((btn) => (btn.disabled = !enabled));

//   clearBtn.disabled = !enabled;
//   completeBtn.disabled = !enabled;

//   if (discountBtn) {
//     discountBtn.disabled = !enabled;
//   }

//   if (refundBtn) {
//     // Add this check
//     refundBtn.disabled = !enabled;
//   }
// }

// // Show the invoice browser modal
// function showInvoiceBrowser() {
//   if (allInvoices.length === 0) {
//     alert("No invoices available to browse");
//     return;
//   }

//   // Create modal for invoice browsing
//   const browserModal = document.createElement("div");
//   browserModal.className = "modal";
//   browserModal.id = "invoice-browser-modal";

//   const modalContent = document.createElement("div");
//   modalContent.className = "modal-content browser-content";

//   // Create search and filter controls
//   const searchHTML = `
//     <div class="browser-header">
//       <h2>Browse Invoices</h2>
//       <span class="close">&times;</span>
//     </div>
//     <div class="browser-filters">
//       <div class="search-container">
//         <input type="text" id="invoice-search" placeholder="Search by customer name, ID...">
//         <button id="search-invoices-btn" class="btn secondary-btn">Search</button>
//       </div>
//       <div class="date-filters">
//         <div class="form-group">
//           <label for="date-from">From</label>
//           <input type="date" id="date-from">
//         </div>
//         <div class="form-group">
//           <label for="date-to">To</label>
//           <input type="date" id="date-to">
//         </div>
//         <button id="apply-date-filter" class="btn secondary-btn">Apply Filter</button>
//         <button id="reset-filters" class="btn secondary-btn">Reset</button>
//       </div>
//     </div>
//   `;

//   // Create table for invoices
//   const tableHTML = `
//     <div class="browser-table-container">
//       <table id="invoices-table" class="browser-table">
//         <thead>
//           <tr>
//             <th>Invoice #</th>
//             <th>Date</th>
//             <th>Customer</th>
//             <th>Items</th>
//             <th>Total</th>
//             <th>Action</th>
//           </tr>
//         </thead>
//         <tbody id="invoices-table-body">
//           ${generateInvoiceTableRows(allInvoices)}
//         </tbody>
//       </table>
//     </div>
//   `;

//   modalContent.innerHTML = searchHTML + tableHTML;
//   browserModal.appendChild(modalContent);
//   document.body.appendChild(browserModal);

//   // Show the modal
//   browserModal.style.display = "block";

//   // Add event listeners
//   document
//     .querySelector("#invoice-browser-modal .close")
//     .addEventListener("click", () => {
//       document.body.removeChild(browserModal);
//     });

//   // Search functionality
//   document
//     .getElementById("search-invoices-btn")
//     .addEventListener("click", () => {
//       const searchTerm = document
//         .getElementById("invoice-search")
//         .value.toLowerCase();
//       const filteredInvoices = allInvoices.filter(
//         (invoice) =>
//           (invoice.id && invoice.id.toLowerCase().includes(searchTerm)) ||
//           (invoice.customer &&
//             invoice.customer.toLowerCase().includes(searchTerm))
//       );

//       document.getElementById("invoices-table-body").innerHTML =
//         generateInvoiceTableRows(filteredInvoices);

//       // Reattach view buttons event listeners
//       attachViewButtonListeners();
//     });

//   // Date filter functionality
//   document.getElementById("apply-date-filter").addEventListener("click", () => {
//     const dateFrom = document.getElementById("date-from").value;
//     const dateTo = document.getElementById("date-to").value;

//     let filteredInvoices = [...allInvoices];

//     if (dateFrom) {
//       const fromDate = new Date(dateFrom);
//       filteredInvoices = filteredInvoices.filter(
//         (invoice) => new Date(invoice.date) >= fromDate
//       );
//     }

//     if (dateTo) {
//       const toDate = new Date(dateTo);
//       // Set time to end of day
//       toDate.setHours(23, 59, 59, 999);
//       filteredInvoices = filteredInvoices.filter(
//         (invoice) => new Date(invoice.date) <= toDate
//       );
//     }

//     document.getElementById("invoices-table-body").innerHTML =
//       generateInvoiceTableRows(filteredInvoices);

//     // Reattach view buttons event listeners
//     attachViewButtonListeners();
//   });

//   // Reset filters
//   document.getElementById("reset-filters").addEventListener("click", () => {
//     document.getElementById("invoice-search").value = "";
//     document.getElementById("date-from").value = "";
//     document.getElementById("date-to").value = "";

//     document.getElementById("invoices-table-body").innerHTML =
//       generateInvoiceTableRows(allInvoices);

//     // Reattach view buttons event listeners
//     attachViewButtonListeners();
//   });

//   // Close when clicking outside
//   browserModal.addEventListener("click", (event) => {
//     if (event.target === browserModal) {
//       document.body.removeChild(browserModal);
//     }
//   });

//   // Attach view button listeners
//   attachViewButtonListeners();

//   // Set current date as the default "to" date
//   const today = new Date().toISOString().split("T")[0];
//   document.getElementById("date-to").value = today;
// }

// // Generate HTML for invoice table rows
// function generateInvoiceTableRows(invoices) {
//   if (invoices.length === 0) {
//     return '<tr><td colspan="6" class="no-data">No invoices found</td></tr>';
//   }

//   return invoices
//     .map((invoice, index) => {
//       const date = new Date(invoice.date).toLocaleString();
//       const itemCount = invoice.items ? invoice.items.length : 0;
//       const isRefund =
//         invoice.isRefund ||
//         (invoice.items && invoice.items.some((item) => item.price < 0));

//       return `
//       <tr class="${isRefund ? "refund-row" : ""}">
//         <td>${invoice.id}</td>
//         <td>${date}</td>
//         <td>${invoice.customer || "Guest"}</td>
//         <td>${itemCount}</td>
//         <td>$${Math.abs(invoice.total).toFixed(2)}${
//         isRefund ? " (Refund)" : ""
//       }</td>
//         <td>
//           <button class="btn secondary-btn view-invoice-btn" data-index="${index}">View</button>
//         </td>
//       </tr>
//     `;
//     })
//     .join("");
// }

// // Attach event listeners to view buttons
// function attachViewButtonListeners() {
//   document.querySelectorAll(".view-invoice-btn").forEach((btn) => {
//     btn.addEventListener("click", (event) => {
//       const index = parseInt(event.target.dataset.index);

//       // Set current index and load the invoice
//       currentInvoiceIndex = index;
//       loadInvoice(allInvoices[index]);

//       // Close the browser modal
//       const browserModal = document.getElementById("invoice-browser-modal");
//       document.body.removeChild(browserModal);
//     });
//   });
// }

// // Show notification message
// function showNotification(message, isError = false) {
//   let notification = document.getElementById("notification");

//   if (!notification) {
//     notification = document.createElement("div");
//     notification.id = "notification";
//     notification.className = "notification";
//     document.body.appendChild(notification);
//   }

//   notification.textContent = message;
//   notification.className = "notification " + (isError ? "error" : "success");
//   notification.style.display = "block";

//   setTimeout(() => {
//     notification.style.display = "none";
//   }, 3000);
// }

// // Add CSS for invoice navigation
// function addInvoiceNavigationStyles() {
//   const styleElement = document.createElement("style");
//   styleElement.textContent = `
//     .invoice-nav {
//       display: flex;
//       justify-content: center;
//       gap: 10px;
//       margin-bottom: 20px;
//     }

//     .nav-icon {
//       font-size: 0.8em;
//     }

//     .invoice-indicator {
//       background-color: #f8f8f8;
//       border: 1px solid #ddd;
//       border-radius: 4px;
//       padding: 10px;
//       margin: 10px 0;
//       display: flex;
//       justify-content: space-between;
//       align-items: center;
//     }

//     .invoice-indicator.editing {
//       background-color: #fff8e1;
//       border-color: #ffecb3;
//     }

//     .invoice-actions {
//       display: flex;
//       gap: 10px;
//     }

//     .browser-content {
//       width: 90%;
//       max-width: 900px;
//       max-height: 80vh;
//     }

//     .browser-header {
//       display: flex;
//       justify-content: space-between;
//       align-items: center;
//       margin-bottom: 20px;
//     }

//     .browser-filters {
//       margin-bottom: 20px;
//       padding: 15px;
//       background-color: #f8f8f8;
//       border-radius: 4px;
//     }

//     .date-filters {
//       display: flex;
//       flex-wrap: wrap;
//       gap: 15px;
//       margin-top: 15px;
//       align-items: flex-end;
//     }

//     .date-filters .form-group {
//       margin: 0;
//     }

//     .browser-table-container {
//       max-height: 400px;
//       overflow-y: auto;
//     }

//     .browser-table {
//       width: 100%;
//       border-collapse: collapse;
//     }

//     .browser-table th {
//       position: sticky;
//       top: 0;
//       background-color: #f0f4f8;
//       z-index: 10;
//     }

//     .browser-table th, .browser-table td {
//       padding: 10px;
//       text-align: left;
//       border-bottom: 1px solid #ddd;
//     }

//     .refund-row {
//       background-color: #fff0f0;
//     }

//     .no-data {
//       text-align: center;
//       padding: 20px;
//       color: #777;
//     }
//   `;
//   document.head.appendChild(styleElement);
// }

// // Add function to check if API supports invoice updates
// async function checkInvoiceUpdateSupport() {
//   if (!window.api.updateInvoice) {
//     // Create a placeholder function if not supported
//     window.api.updateInvoice = async (invoice) => {
//       console.log("Invoice update not supported by API, using fallback");
//       // Find the invoice in local storage and update it
//       const invoices = await window.api.getInvoices();
//       const index = invoices.findIndex((inv) => inv.id === invoice.id);

//       if (index !== -1) {
//         invoices[index] = invoice;

//         // Store updated invoices via local storage
//         // This is just a fallback for demo purposes
//         localStorage.setItem("invoices", JSON.stringify(invoices));
//         return true;
//       }

//       return false;
//     };
//   }
// }

// // Update the cart table HTML to include a checkbox column
// function updateCartTableHeader() {
//   const headerRow = document.querySelector("#cart-table thead tr");
//   if (headerRow) {
//     // Create a new header cell for checkboxes
//     const checkboxHeader = document.createElement("th");
//     checkboxHeader.textContent = ""; // Empty header for checkboxes

//     // Insert it as the first column
//     headerRow.insertBefore(checkboxHeader, headerRow.firstChild);
//   }
// }

// function fixProductPageSpacing() {
//   const styleElement = document.createElement("style");
//   styleElement.textContent = `
//     /* Main container adjustments */
//     .product-selection {
//       display: flex;
//       flex-direction: column;
//       height: auto;
//       padding-bottom: 0;
//     }

//     /* Products grid container */
//     .products-grid {
//       flex: 0 1 auto; /* Don't allow excessive growth */
//       margin-bottom: 20px; /* Consistent spacing to pagination */
//       min-height: 200px; /* Ensure minimum reasonable height */
//       max-height: 60vh; /* Limit maximum height */
//     }

//     /* Pagination section */
//     .pagination-controls {
//       margin-top: 10px; /* Reduced top margin */
//       margin-bottom: 10px; /* Add bottom margin */
//     }

//     /* Product count text */
//     .showing-products-count {
//       margin: 5px 0; /* Tighten up margins */
//       padding: 5px;
//       color: #666;
//       font-size: 0.9em;
//       text-align: center;
//     }

//     /* Page navigation row */
//     .page-navigation {
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       gap: 10px;
//       padding: 5px 0;
//     }

//     /* When only a few products are shown */
//     @media (min-height: 768px) {
//       .product-selection {
//         justify-content: flex-start; /* Align content to top */
//       }

//       /* When few products are visible, don't push pagination to bottom of screen */
//       .products-grid:only-child + .pagination-controls,
//       .products-grid:nth-last-child(2) + .pagination-controls {
//         margin-top: 15px;
//       }
//     }
//   `;
//   document.head.appendChild(styleElement);

//   console.log("Applied product page spacing fix");
// }
// // Listen for online/offline events
// window.addEventListener("online", updateConnectionStatus);
// window.addEventListener("offline", updateConnectionStatus);

// // Initialize the page when DOM is loaded
// // Initialize the page when DOM is loaded
// document.addEventListener("DOMContentLoaded", async () => {
//   await initPage();

//   // Add logout button listener if it exists
//   const logoutBtn = document.getElementById("logout-btn");
//   if (logoutBtn) {
//     logoutBtn.addEventListener("click", handleLogout);
//   }

//   // Set up online status change listeners
//   if (window.api && typeof window.api.onOnlineStatusChanged === "function") {
//     window.api.onOnlineStatusChanged((online) => {
//       console.log(
//         `Connection status changed: ${online ? "Online" : "Offline"}`
//       );
//       updateConnectionStatus();
//     });
//   }
//   initializeCartTable();
//   addShortcutStyles();
//   initKeyboardShortcuts();
//   addDiscountStyles();
//   addMultiSelectStyles();
//   updateRenderCartForDiscounts();
//   updateUpdateTotalsForDiscounts();
//   updateCompleteSaleForDiscounts();
//   initProductPagination();
//   addInvoiceNavigationStyles();
//   addRefundButton();
//   updateCartTableHeader();
//   enhanceProductGrid();
//   fixProductCardHeight();
//   fixProductPageSpacing();
//   setTimeout(fixKeyboardShortcuts, 500);
//   setTimeout(forceCartScrolling, 300); // Slight delay to ensure DOM is ready

//   // Check for API support
//   checkInvoiceUpdateSupport();
//   if (typeof window.initSyncUI === "function") {
//     window.initSyncUI();
//   }

//   // Focus barcode input after all initialization is complete
//   setTimeout(() => {
//     const barcodeInput = document.getElementById("barcode-input");
//     if (barcodeInput) {
//       barcodeInput.focus();
//       console.log("Focused barcode input on page fully loaded");
//     }
//   }, 1000);

//   setTimeout(fixProductCards, 300);
//   // Initialize after page has loaded completely
//   setTimeout(() => {
//     initInvoiceNavigation();
//   }, 300);

//   // Initialize after page has loaded completely to avoid conflicts
//   setTimeout(() => {
//     initBarcodeFeature();
//   }, 200);

//   // Initialize after page has loaded completely
//   setTimeout(() => {
//     console.log(
//       "Summary element exists:",
//       !!document.querySelector(".invoice-summary")
//     );
//     console.log(
//       "Total row exists:",
//       !!document.querySelector(".summary-row.total")
//     );
//     initDiscountFeature();
//   }, 100);

//   //   window.api.onBackgroundSyncCompleted((data) => {
//   //     // Update or hide the indicator when sync completes
//   //     const syncIndicator = document.getElementById("sync-indicator");
//   //     if (syncIndicator) {
//   //       if (data.success) {
//   //         syncIndicator.innerHTML = `<div class="sync-text">Sync completed ✓</div>`;
//   //         setTimeout(() => {
//   //           syncIndicator.style.opacity = "0";
//   //           setTimeout(() => {
//   //             if (syncIndicator.parentNode) {
//   //               syncIndicator.parentNode.removeChild(syncIndicator);
//   //             }
//   //           }, 300);
//   //         }, 2000);
//   //       } else {
//   //         syncIndicator.innerHTML = `<div class="sync-text">Sync failed ✗</div>`;
//   //       }
//   //     }
//   //   });
//   // });
//   // window.api.onBackgroundSyncStarted(() => {
//   //   // Show sync indicator (small spinner in corner of screen)
//   //   const syncIndicator =
//   //     document.getElementById("sync-indicator") || document.createElement("div");

//   //   syncIndicator.id = "sync-indicator";
//   //   syncIndicator.innerHTML = `
//   //     <div class="spinner"></div>
//   //     <div class="sync-text">Syncing data...</div>
//   //   `;

//   //   if (!syncIndicator.parentNode) {
//   //     syncIndicator.style.position = "fixed";
//   //     syncIndicator.style.bottom = "10px";
//   //     syncIndicator.style.right = "10px";
//   //     syncIndicator.style.background = "rgba(0,0,0,0.7)";
//   //     syncIndicator.style.color = "white";
//   //     syncIndicator.style.padding = "8px 12px";
//   //     syncIndicator.style.borderRadius = "4px";
//   //     syncIndicator.style.fontSize = "12px";
//   //     syncIndicator.style.zIndex = "9999";
//   //     document.body.appendChild(syncIndicator);
//   //   }
// });

// // Remove the other DOMContentLoaded event listeners
// // After the window event listeners, add:
// if (window.api && typeof window.api.onOnlineStatusChanged === "function") {
//   window.api.onOnlineStatusChanged((online) => {
//     console.log(`Connection status changed: ${online ? "Online" : "Offline"}`);
//     updateConnectionStatus();
//   });
// }
