let selectedItems = []; // Array to track selected item indices

// Add product to cart
function addToCart(product) {
  // Check if product is already in cart
  const existingItem = cart.find((item) => item.id === product.id);

  // Determine current quantity in cart (0 if not in cart yet)
  const currentQuantityInCart = existingItem ? existingItem.quantity : 0;

  // Check if product has any stock
  if (product.stock <= 0) {
    // Show notification that product is out of stock
    showToastNotification(`Sorry, "${product.name}" is out of stock.`, true);
    return; // Exit the function, don't add to cart
  }

  // Check if adding one more would exceed available stock
  if (currentQuantityInCart + 1 > product.stock) {
    // Show notification about stock limit
    showToastNotification(
      `Can't add more. Only ${product.stock} units of "${product.name}" available.`,
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

// Render cart items
function renderCart() {
  if (cart.length === 0) {
    cartItemsEl.innerHTML =
      '<tr class="empty-cart"><td colspan="6">No items added yet</td></tr>';
    completeSaleBtn.disabled = true;
    return;
  }

  cartItemsEl.innerHTML = "";
  completeSaleBtn.disabled = false;

  cart.forEach((item, index) => {
    const cartItemRow = document.createElement("tr");

    // Add selected class if this item is selected
    if (selectedItems.includes(index) || index === selectedCartIndex) {
      cartItemRow.classList.add("selected-row");
    }

    // Calculate display details as before...
    let displayPrice = Math.abs(item.price);
    let displayTotal = Math.abs(item.price * item.quantity);
    let discountInfo = "";

    if (item.discount) {
      // Discount calculations here...
    } else {
      discountInfo = `${formatCurrency(displayPrice)}`;
    }

    const isRefund = item.price < 0;

    // Add checkbox column and refund indicator
    cartItemRow.innerHTML = `
      <td>
        <input type="checkbox" class="item-select" data-index="${index}" ${
      selectedItems.includes(index) ? "checked" : ""
    }>
      </td>
      <td>${item.name}${isRefund ? " (Refund)" : ""}${
      item.isMiscellaneous ? " (Misc)" : ""
    }</td>
      <td>${discountInfo}</td>
      <td>
        <button class="btn quantity-btn" data-action="decrease" data-index="${index}">-</button>
        <span class="quantity">${item.quantity}</span>
        <button class="btn quantity-btn" data-action="increase" data-index="${index}">+</button>
      </td>
      <td>${formatCurrency(Math.abs(displayTotal))}</td>
      <td>
        <button class="btn remove-btn" data-index="${index}">Remove</button>
      </td>
    `;

    cartItemsEl.appendChild(cartItemRow);
  });

  // Add event listeners for checkboxes
  document.querySelectorAll(".item-select").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const index = parseInt(event.target.dataset.index);
      if (event.target.checked) {
        if (!selectedItems.includes(index)) {
          selectedItems.push(index);
        }
      } else {
        selectedItems = selectedItems.filter((i) => i !== index);
      }

      // Update UI to show selected items
      document.querySelectorAll("#cart-items tr").forEach((row, idx) => {
        if (selectedItems.includes(idx)) {
          row.classList.add("selected-row");
        } else if (idx !== selectedCartIndex) {
          row.classList.remove("selected-row");
        }
      });
    });
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
        `Can't add more. Only ${product.stock} units of "${cartItem.name}" available.`,
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
  const symbol = currency === "ILS" ? "₪" : "$";
  return `${symbol}${parseFloat(amount).toFixed(2)}`;
}
