let selectedItems = []; // Array to track selected item indices

// Add product to cart
// Add product to cart
function addToCart(product) {
  // CHECK FOR VIEW-ONLY MODE - Add this at the beginning of the function
  if (isViewingInvoice && !isEditingInvoice) {
    showToastNotification(
      "Please click 'Edit' first before making changes.",
      true
    );
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
// Render cart items
// Render cart items - properly handling edit vs view mode
function renderCart() {
  if (cart.length === 0) {
    cartItemsEl.innerHTML =
      '<tr class="empty-cart"><td colspan="6">No items added yet</td></tr>';
    completeSaleBtn.disabled = true;
    return;
  }

  cartItemsEl.innerHTML = "";
  completeSaleBtn.disabled = isViewingInvoice && !isEditingInvoice;

  // Add info row when in view mode
  if (isViewingInvoice && !isEditingInvoice) {
    const infoRow = document.createElement("tr");
    infoRow.className = "view-mode-info-row";
    infoRow.innerHTML = `
      <td colspan="6" style="text-align: center; padding: 10px; background-color: #f8f8f8; color: #333; font-weight: bold;">
        Please click "Edit" to modify this invoice
      </td>
    `;
    cartItemsEl.appendChild(infoRow);
  }

  cart.forEach((item, index) => {
    const cartItemRow = document.createElement("tr");

    // Add selected class if this item is selected
    if (selectedItems.includes(index) || index === selectedCartIndex) {
      cartItemRow.classList.add("selected-row");
    }

    // Calculate display details
    let displayPrice = Math.abs(item.price);
    let displayTotal = Math.abs(item.price * item.quantity);
    let discountInfo = "";

    if (item.discount) {
      const discountAmount = item.discount.amount;
      const discountedPrice = displayPrice - discountAmount;

      discountInfo = `
        <div class="discounted-price">${formatCurrency(discountedPrice)}</div>
        <div class="original-price">${formatCurrency(displayPrice)}</div>
      `;

      displayTotal = discountedPrice * item.quantity;
    } else {
      discountInfo = `${formatCurrency(displayPrice)}`;
    }

    const isRefund = item.price < 0;

    // ONLY disable buttons in view mode, NOT in edit mode
    const isDisabled = isViewingInvoice && !isEditingInvoice ? "disabled" : "";
    const disabledStyle =
      isViewingInvoice && !isEditingInvoice
        ? "opacity:0.5; cursor:not-allowed;"
        : "";

    // Add checkbox column and refund indicator
    cartItemRow.innerHTML = `
      <td>
        <input type="checkbox" class="item-select" data-index="${index}" ${
      selectedItems.includes(index) ? "checked" : ""
    } ${isDisabled}>
      </td>
      <td>${item.name}${isRefund ? " (Refund)" : ""}${
      item.isMiscellaneous ? " (Misc)" : ""
    }</td>
      <td>${discountInfo}</td>
      <td>
        <button class="btn quantity-btn" data-action="decrease" data-index="${index}" ${isDisabled} style="${disabledStyle}">-</button>
        <span class="quantity">${item.quantity}</span>
        <button class="btn quantity-btn" data-action="increase" data-index="${index}" ${isDisabled} style="${disabledStyle}">+</button>
      </td>
      <td>${formatCurrency(Math.abs(displayTotal))}</td>
      <td>
        <button class="btn remove-btn" data-index="${index}" ${isDisabled} style="${disabledStyle}">Remove</button>
      </td>
    `;

    cartItemsEl.appendChild(cartItemRow);
  });

  // Always add event listeners, but they'll only work when buttons aren't disabled
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

  document.querySelectorAll(".quantity-btn").forEach((btn) => {
    btn.addEventListener("click", handleQuantityChange);
  });

  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", handleRemoveItem);
  });

  // Add click event to select rows
  document.querySelectorAll("#cart-items tr").forEach((row, index) => {
    row.addEventListener("click", (event) => {
      // Skip the info row
      if (row.classList.contains("view-mode-info-row")) return;

      // Ignore clicks on buttons and checkboxes
      if (event.target.tagName === "BUTTON" || event.target.tagName === "INPUT")
        return;

      // Don't allow selection in view mode
      if (isViewingInvoice && !isEditingInvoice) return;

      // Remove selection from other rows unless Ctrl key is pressed
      if (!event.ctrlKey) {
        document.querySelectorAll("#cart-items tr").forEach((r) => {
          r.classList.remove("selected-row");
        });
      }

      // Add selection to clicked row
      row.classList.add("selected-row");
      selectedCartIndex = index;
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
