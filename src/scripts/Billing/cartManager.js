let selectedItems = []; // Array to track selected item indices

// Add product to cart
function addToCart(product) {
  // CHECK FOR VIEW-ONLY MODE - Add this at the beginning of the function
  if (isViewingInvoice && !isEditingInvoice) {
    showToastNotification(window.t("billing.cart.editFirst"), true);

    return; // Exit the function, don't add to cart
  }

  // Rest of the original function remains the same
  // Check if product is already in cart
  const existingItem = cart.find((item) => item.id === product.id);

  // Determine current quantity in cart (0 if not in cart yet)
  const currentQuantityInCart = existingItem ? existingItem.quantity : 0;

  // Check if product has any stock
  if (product.stock <= 0) {
    // Show notification that product is out of stock
    showToastNotification(
      window.t("billing.cart.outOfStock", { name: product.name }),
      true
    );
    return; // Exit the function, don't add to cart
  }

  // Check if adding one more would exceed available stock
  if (currentQuantityInCart + 1 > product.stock) {
    // Show notification about stock limit
    showToastNotification(
      window.t("billing.cart.limitedStock", {
        stock: product.stock,
        name: product.name,
      }),
      true
    );

    return; // Exit the function, don't increase quantity
  }

  // If we get here, we have enough stock to proceed
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      cost: product.cost || 0,
      quantity: 1,
      total: product.price,
    });
  }

  renderCart();
  updateTotals();
}

// Improved cart rendering function that updates elements instead of recreating them
function renderCart() {
  if (!cartItemsEl) return;

  // Clear selection
  selectedItems = [];

  if (cart.length === 0) {
    cartItemsEl.innerHTML = `<tr class="empty-cart"><td colspan="5">${window.t(
      "billing.cart.empty"
    )}</td></tr>`;
    return;
  }

  // Check if we need to create a new table or update existing one
  const existingRows = cartItemsEl.querySelectorAll("tr:not(.empty-cart)");
  const needsRebuild = existingRows.length !== cart.length;

  if (needsRebuild) {
    // Clear and rebuild when item count changes
    cartItemsEl.innerHTML = "";

    // Create all rows from scratch
    cart.forEach((item, index) => {
      const row = document.createElement("tr");
      row.dataset.index = index;
      row.innerHTML = createCartRowHTML(item, index);
      cartItemsEl.appendChild(row);
    });

    // Add event listeners to new elements
    attachCartEventListeners();
  } else {
    // Update existing rows in place
    cart.forEach((item, index) => {
      const row = existingRows[index];
      if (row) {
        // Only update the content that changes
        updateCartRowContent(row, item, index);
      }
    });
  }

  // Ensure cart scrolls appropriately
  if (typeof forceCartScrolling === "function") {
    forceCartScrolling();
  }
}

// Extract HTML creation to a separate function
function createCartRowHTML(item, index) {
  return `
    <td>${index + 1}</td>
    <td>${item.name}</td>
    <td>${formatCurrency(item.price)}</td>
    <td>
      <div class="quantity-control">
        <button class="quantity-btn" data-action="decrease" data-index="${index}">-</button>
        <span class="quantity">${item.quantity}</span>
        <button class="quantity-btn" data-action="increase" data-index="${index}">+</button>
      </div>
    </td>
    <td>${formatCurrency(item.price * item.quantity)}</td>
    <td>
      <button class="remove-btn" data-index="${index}">×</button>
    </td>
  `;
}

// Only update parts that change in existing rows
function updateCartRowContent(row, item, index) {
  // Update quantity
  const quantitySpan = row.querySelector(".quantity");
  if (quantitySpan) quantitySpan.textContent = item.quantity;

  // Update total price
  const cells = row.querySelectorAll("td");
  if (cells.length >= 5) {
    cells[4].textContent = formatCurrency(item.price * item.quantity);
  }
}

// Attach event listeners separately
function attachCartEventListeners() {
  document.querySelectorAll(".quantity-btn").forEach((button) => {
    button.addEventListener("click", handleQuantityChange);
  });

  document.querySelectorAll(".remove-btn").forEach((button) => {
    button.addEventListener("click", handleRemoveItem);
  });
}

// Handle quantity change
function handleQuantityChange(event) {
  const index = parseInt(event.target.dataset.index);
  const action = event.target.dataset.action;

  if (action === "increase") {
    // Get the cart item
    const cartItem = cart[index];

    // Find the product in the products array to check its stock
    const product = products.find((p) => p.id === cartItem.id);

    // Check if we have enough stock before increasing
    if (product && cartItem.quantity + 1 > product.stock) {
      // Show notification about stock limit
      showToastNotification(
        window.t("billing.cart.limitedStock", {
          stock: product.stock,
          name: product.name,
        }),
        true
      );

      return; // Exit without changing quantity
    }

    cart[index].quantity += 1;
  } else if (action === "decrease" && cart[index].quantity > 1) {
    cart[index].quantity -= 1;
  }

  renderCart();
  updateTotals();
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

// Handle remove item
function handleRemoveItem(event) {
  const index = parseInt(event.target.dataset.index);
  cart.splice(index, 1);

  renderCart();
  updateTotals();
}

// Update totals (subtotal, tax, total)
function updateTotals() {
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const totalCost = cart.reduce(
    (sum, item) => sum + item.cost * item.quantity,
    0
  );
  const profit = subtotal - totalCost;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  subtotalEl.textContent = `${subtotal.toFixed(2)}`;
  taxEl.textContent = `${tax.toFixed(2)}`;
  totalEl.textContent = `${total.toFixed(2)}`;
}

// Clear cart
function clearCart() {
  cart = [];
  renderCart();
  updateTotals();
  customerNameEl.value = "";
  document.getElementById("complete-sale").textContent = "Complete Sale";
}

// Format currency based on user settings
function formatCurrency(amount) {
  const currency = localStorage.getItem("currency") || "USD";
  const symbol =
    currency === "ILS"
      ? window.t("billing.currency.ils")
      : window.t("billing.currency.usd");
  return `${symbol}${parseFloat(amount).toFixed(2)}`;
}
