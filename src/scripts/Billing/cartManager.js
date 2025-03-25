let selectedItems = []; // Array to track selected item indices

// Add product to cart
function addToCart(product) {
    // Check if product is already in cart
    const existingItem = cart.find((item) => item.id === product.id);

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
            discountInfo = `$${displayPrice.toFixed(2)}`;
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
      <td>$${Math.abs(displayTotal).toFixed(2)}</td>
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
        cart[index].quantity += 1;
    } else if (action === "decrease" && cart[index].quantity > 1) {
        cart[index].quantity -= 1;
    }

    renderCart();
    updateTotals();
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