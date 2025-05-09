// Global variable to track selected cart item
let selectedCartIndex = -1;

// Add this to the end of your JavaScript file or just before initPage()
function fixKeyboardShortcuts() {
  // Create a global listener that comes before other handlers
  document.addEventListener(
      "keydown",
      function (event) {
        // Map of function keys to their handler functions
        const functionKeyHandlers = {
          F1: function () {
            addMiscellaneousItem();
          },
          F2: function () {
            processReturn();
          },
          F3: function () {
            if (!document.getElementById("complete-sale").disabled) {
              completeSale();
            }
          },
          F4: function () {
            // Add this new handler
            showDiscountModal();
          },
          F5: function () {
            removeSelectedItem();
          },
          F6: function () {
            showProductDetails();
          },
          F7: function () {
            clearCart();
          },
          F8: function () {
            if (receiptModal.style.display === "block") {
              printReceipt();
            }
          },
          F9: function () {
            increaseQuantity();
          },
          F10: function () {
            decreaseQuantity();
          },
          F11: function () {
            showPreviousInvoice();
          },
          F12: function () {
            showNextInvoice();
          },
        };

        // Special handling for non-function keys
        const specialKeyHandlers = {
          Delete: function () {
            clearCart();
          },
          "/": function () {
            document.getElementById("product-search").focus();
          },
          b: function () {
            if (!event.ctrlKey && !event.altKey && !event.shiftKey) {
              const barcodeInput = document.getElementById("barcode-input");
              if (barcodeInput) barcodeInput.focus();
            }
          },
        };

        // Check if it's a function key or special key we handle
        const handler =
            functionKeyHandlers[event.key] ||
            specialKeyHandlers[event.key.toLowerCase()];

        if (handler) {
          // Skip text inputs except for function keys
          if (
              event.key.startsWith("F") ||
              !(
                  event.target.tagName === "INPUT" ||
                  event.target.tagName === "TEXTAREA"
              )
          ) {
            // Check for view mode restrictions
            if (isViewingInvoice && !isEditingInvoice) {
              // ONLY allow these specific shortcuts in view mode
              if (
                  event.key === "F11" ||
                  event.key === "F12" ||
                  event.key === "F6" ||
                  event.key === "F8" ||
                  event.key === "/" ||
                  event.key.toLowerCase() === "b"
              ) {
                event.preventDefault();
                handler();
              } else {
                // Block all other shortcuts in view mode
                event.preventDefault();
                alert(t('billing.cart.editFirst'));
              }
            } else {
              // Not in view mode or in edit mode - all shortcuts work
              event.preventDefault();
              handler();
            }
          }
        }
      },
      true
  ); // Use capturing phase to ensure this runs first

  console.log(t('shortcuts.fixed'));
}

// Initialize keyboard shortcuts
function initKeyboardShortcuts() {
  console.log(t('shortcuts.initializing'));
  document.addEventListener("keydown", handleKeyboardShortcut);

  // Add help button for shortcuts
  const actionsContainer = document.querySelector(".payment-actions");
  const helpButton = document.createElement("button");
  helpButton.id = "shortcuts-help-btn";
  helpButton.className = "btn secondary-btn";
  helpButton.textContent = t('shortcuts.helpButton');
  helpButton.addEventListener("click", showShortcutsHelp);
  actionsContainer.appendChild(helpButton);

  // Add selection highlighting to cart items
  cartItemsEl.addEventListener("click", function (event) {
    const row = event.target.closest("tr");
    if (!row) return;

    // Remove selection from other rows
    document.querySelectorAll("#cart-items tr").forEach((r) => {
      r.classList.remove("selected-row");
    });

    // Add selection to clicked row
    row.classList.add("selected-row");

    // Fix for the null parent issue - add safety check
    if (row.parentNode) {
      selectedCartIndex = Array.from(row.parentNode.children).indexOf(row);
    } else {
      console.warn(t('shortcuts.rowParentNotFound'));
      selectedCartIndex = -1;
    }
  });

  // Add shortcut indicator to buttons
  addShortcutIndicator("complete-sale", "F3");
  addShortcutIndicator("clear-invoice", "F7");
}

// Handle keyboard shortcuts
function handleKeyboardShortcut(event) {
  // Special case for F11 and F12 (invoice navigation) - these always work
  if (event.key === "F11" || event.key === "F12") {
    event.preventDefault();
    if (event.key === "F11") {
      showPreviousInvoice();
    } else {
      showNextInvoice();
    }
    return;
  }

  // Skip other shortcuts if in input field
  if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
    return;
  }

  console.log(t('shortcuts.keyPressed'), event.key, event.code);

  // Check if viewing (but not editing) an invoice - block action shortcuts
  if (isViewingInvoice && !isEditingInvoice) {
    // Allow F6 (show product details) as it's read-only
    if (event.key === "F6") {
      event.preventDefault();
      showProductDetails();
      return;
    }

    // For all other shortcuts that modify the invoice, show alert
    switch (event.key) {
      case "F1":
      case "F2":
      case "F3":
      case "F4": // Changed from "d" to "F4"
      case "F5":
      case "F7":
      case "F9":
      case "F10":
      case "Delete":
        event.preventDefault();
        // Stop event propagation to prevent other handlers from running
        event.stopImmediatePropagation();
        alert(t('billing.cart.editFirst'));
        return false; // Explicitly return false to prevent default
    }

    return; // Exit early if viewing but not editing
  }

  // Process shortcuts normally if not viewing or if in edit mode
  switch (event.key) {
    case "F1":
      event.preventDefault();
      addMiscellaneousItem();
      break;

    case "F2":
      event.preventDefault();
      processReturn();
      break;

    case "F3":
      event.preventDefault();
      if (!document.getElementById("complete-sale").disabled) {
        completeSale();
      }
      break;

    case "F5":
      event.preventDefault();
      removeSelectedItem();
      break;

    case "F6":
      event.preventDefault();
      showProductDetails();
      break;

    case "F7":
      event.preventDefault();
      clearCart();
      break;

    case "F8":
      event.preventDefault();
      // Only trigger if receipt modal is visible
      if (receiptModal.style.display === "block") {
        printReceipt();
      }
      break;

    case "F9":
      event.preventDefault();
      increaseQuantity();
      break;

    case "F10":
      event.preventDefault();
      decreaseQuantity();
      break;

    case "Delete":
      event.preventDefault();
      clearCart();
      break;

    case "/":
      event.preventDefault();
      document.getElementById("product-search").focus();
      break;

    case "F4":
      if (!event.ctrlKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        showDiscountModal();
      }
      break;
  }
}

// Add shortcut indicator to buttons
function addShortcutIndicator(buttonId, shortcut) {
  const button = document.getElementById(buttonId);
  if (button) {
    const shortcutSpan = document.createElement("span");
    shortcutSpan.className = "shortcut-indicator";
    shortcutSpan.textContent = ` (${shortcut})`;
    button.appendChild(shortcutSpan);
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

// Show shortcuts help modal
function showShortcutsHelp() {
  // Create modal if it doesn't exist
  let shortcutsModal = document.getElementById("shortcuts-modal");

  if (!shortcutsModal) {
    shortcutsModal = document.createElement("div");
    shortcutsModal.id = "shortcuts-modal";
    shortcutsModal.className = "modal";

    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    const modalHeader = document.createElement("div");
    modalHeader.className = "modal-header";
    modalHeader.innerHTML = `
      <h2>${t('shortcuts.title')}</h2>
      <span class="close">&times;</span>
    `;

    const modalBody = document.createElement("div");
    modalBody.className = "modal-body";
    modalBody.innerHTML = `
      <table class="shortcuts-table">
        <tr><th>${t('shortcuts.key')}</th><th>${t('shortcuts.action')}</th></tr>
        <tr><td>F1</td><td>${t('shortcuts.actions.addMisc')}</td></tr>
        <tr><td>F2</td><td>${t('shortcuts.actions.processReturn')}</td></tr>
        <tr><td>F3</td><td>${t('shortcuts.actions.completeSale')}</td></tr>
        <tr><td>F5</td><td>${t('shortcuts.actions.removeItem')}</td></tr>
        <tr><td>F6</td><td>${t('shortcuts.actions.showDetails')}</td></tr>
        <tr><td>F7</td><td>${t('shortcuts.actions.clearCart')}</td></tr>
        <tr><td>F8</td><td>${t('shortcuts.actions.printReceipt')}</td></tr>
        <tr><td>F9</td><td>${t('shortcuts.actions.increaseQty')}</td></tr>
        <tr><td>F10</td><td>${t('shortcuts.actions.decreaseQty')}</td></tr>
        <tr><td>F11</td><td>${t('shortcuts.actions.prevInvoice')}</td></tr>
        <tr><td>F12</td><td>${t('shortcuts.actions.nextInvoice')}</td></tr>
        <tr><td>Delete</td><td>${t('shortcuts.actions.clearCart')}</td></tr>
        <tr><td>/</td><td>${t('shortcuts.actions.focusSearch')}</td></tr>
        <tr><td>B</td><td>${t('shortcuts.actions.focusBarcode')}</td></tr>
        <tr><td>F4</td><td>${t('shortcuts.actions.addDiscount')}</td></tr>
      </table>
    `;

    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    shortcutsModal.appendChild(modalContent);
    document.body.appendChild(shortcutsModal);

    // Add close button functionality
    const closeBtn = shortcutsModal.querySelector(".close");
    closeBtn.addEventListener("click", () => {
      shortcutsModal.style.display = "none";
    });

    // Close modal when clicking outside
    window.addEventListener("click", (event) => {
      if (event.target === shortcutsModal) {
        shortcutsModal.style.display = "none";
      }
    });
  }

  // Show the modal
  shortcutsModal.style.display = "block";
}

// F1: Add miscellaneous item
function addMiscellaneousItem() {
  console.log(t('misc.opening'));

  try {
    // Create a modal dialog for entering miscellaneous item
    const miscModal = document.createElement("div");
    miscModal.className = "modal";
    miscModal.id = "misc-item-modal";

    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    modalContent.innerHTML = `
      <div class="modal-header">
        <h2>${t('misc.title')}</h2>
        <span class="close">&times;</span>
      </div>
      <div class="modal-body">
        <form id="misc-item-form">
          <div class="form-group">
            <label for="misc-name">${t('misc.description')}</label>
            <input type="text" id="misc-name" placeholder="${t('misc.descriptionPlaceholder')}" required>
          </div>
          <div class="form-group">
            <label for="misc-price">${t('misc.price')}</label>
            <input type="number" id="misc-price" step="0.01" min="0" value="0.00" required>
          </div>
          <div class="form-actions">
            <button type="button" class="btn secondary-btn" id="cancel-misc">${t('common.cancel')}</button>
            <button type="submit" class="btn primary-btn">${t('misc.addButton')}</button>
          </div>
        </form>
      </div>
    `;

    // First add content to modal
    miscModal.appendChild(modalContent);

    // Then add modal to document
    document.body.appendChild(miscModal);

    // Show the modal
    miscModal.style.display = "block";

    // Set up event listeners - USING querySelector ON THE MODAL
    const closeBtn = miscModal.querySelector(".close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        document.body.removeChild(miscModal);
      });
    } else {
      console.error(t('misc.errors.closeButtonNotFound'));
    }

    const cancelBtn = miscModal.querySelector("#cancel-misc");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        document.body.removeChild(miscModal);
      });
    } else {
      console.error(t('misc.errors.cancelButtonNotFound'));
    }

    const miscForm = miscModal.querySelector("#misc-item-form");
    if (miscForm) {
      // Handle form submission
      miscForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const nameInput = miscModal.querySelector("#misc-name");
        const priceInput = miscModal.querySelector("#misc-price");

        if (!nameInput || !priceInput) {
          console.error(t('misc.errors.inputsNotFound'));
          return;
        }

        const itemName = nameInput.value;
        const itemPrice = parseFloat(priceInput.value);

        // Add to cart
        const miscItem = {
          id: `misc-${Date.now()}`,
          name: `${t('billing.cart.misc')}: ${itemName}`,
          price: itemPrice,
          cost: 0,
          quantity: 1,
          total: itemPrice,
          isMiscellaneous: true,
        };

        cart.push(miscItem);
        renderCart();
        updateTotals();

        // Close modal
        document.body.removeChild(miscModal);
      });

      // Focus on name field
      const nameField = miscModal.querySelector("#misc-name");
      if (nameField) {
        nameField.focus();
      }
    } else {
      console.error(t('misc.errors.formNotFound'));
    }

    // Close when clicking outside
    window.addEventListener("click", (event) => {
      if (event.target === miscModal) {
        document.body.removeChild(miscModal);
      }
    });
  } catch (error) {
    console.error(t('misc.errors.general'), error);
    alert(t('misc.errors.alert'));
  }
}

// F2: Process return/refund
function processReturn() {
  if (isViewingInvoice && !isEditingInvoice) {
    alert(t('return.editFirst'));
    return;
  }
  if (cart.length === 0) {
    alert(t('return.emptyCart'));
    return;
  }

  // Check if there are selected items
  if (selectedItems.length === 0 && selectedCartIndex === -1) {
    alert(t('return.selectItems'));
    return;
  }

  // Determine which items to refund
  const itemsToRefund =
      selectedItems.length > 0
          ? selectedItems
          : selectedCartIndex >= 0
              ? [selectedCartIndex]
              : [];

  // Ask for confirmation
  const message =
      itemsToRefund.length === cart.length
          ? t('return.confirmFull')
          : t('return.confirmPartial', { count: itemsToRefund.length });

  if (confirm(message)) {
    // Convert only selected items to refunds
    itemsToRefund.forEach((index) => {
      if (index >= 0 && index < cart.length) {
        cart[index].price = -Math.abs(cart[index].price);
        cart[index].total = cart[index].price * cart[index].quantity;
        cart[index].isRefund = true;
      }
    });

    // Update UI
    renderCart();
    updateTotals();

    // Change the complete sale button text
    document.getElementById("complete-sale").textContent =
        itemsToRefund.length === cart.length
            ? t('return.completeRefund')
            : t('return.completePartialRefund');

    // Clear selection after processing
    selectedItems = [];
  }
}

function addRefundButton() {
  const actionsContainer = document.querySelector(".payment-actions");
  if (!actionsContainer) return;

  const refundButton = document.createElement("button");
  refundButton.id = "refund-selected";
  refundButton.className = "btn secondary-btn";
  refundButton.textContent = t('return.refundSelected');
  refundButton.addEventListener("click", processReturn);

  // Add shortcut indicator
  const shortcutSpan = document.createElement("span");
  shortcutSpan.className = "shortcut-indicator";
  shortcutSpan.textContent = " (F2)";
  refundButton.appendChild(shortcutSpan);

  actionsContainer.appendChild(refundButton);
}

function addMultiSelectStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    .item-select {
      cursor: pointer;
      width: 18px;
      height: 18px;
      margin-right: 8px;
    }
    
    #cart-table th:first-child,
    #cart-table td:first-child {
      width: 30px;
      text-align: center;
    }
  `;
  document.head.appendChild(styleElement);
}

// F5: Remove selected item
function removeSelectedItem() {
  if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
    cart.splice(selectedCartIndex, 1);
    renderCart();
    updateTotals();
    selectedCartIndex = -1;
  } else {
    alert(t('cart.selectItemFirst'));
  }
}

// F6: Show product details
function showProductDetails() {
  if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
    const item = cart[selectedCartIndex];

    try {
      // Create modal to show details
      const detailsModal = document.createElement("div");
      detailsModal.className = "modal";
      detailsModal.id = "details-modal";

      const modalContent = document.createElement("div");
      modalContent.className = "modal-content";

      modalContent.innerHTML = `
        <div class="modal-header">
          <h2>${t('product.details')}</h2>
          <span class="close">&times;</span>
        </div>
        <div class="modal-body">
          <table class="details-table">
            <tr>
              <th>${t('product.id')}:</th>
              <td>${item.id || t('product.notAvailable')}</td>
            </tr>
            <tr>
              <th>${t('product.name')}:</th>
              <td>${item.name || t('product.notAvailable')}</td>
            </tr>
            <tr>
              <th>${t('product.unitPrice')}:</th>
              <td>${formatCurrency(Math.abs(item.price))}</td>
            </tr>
            <tr>
              <th>${t('product.quantity')}:</th>
              <td>${item.quantity}</td>
            </tr>
            <tr>
              <th>${t('product.total')}:</th>
              <td>${formatCurrency(Math.abs(item.price * item.quantity))}</td>
            </tr>
            ${
          item.isRefund ? `<tr><th>${t('product.type')}:</th><td>${t('product.refundItem')}</td></tr>` : ""
      }
            ${
          item.isMiscellaneous
              ? `<tr><th>${t('product.type')}:</th><td>${t('product.miscItem')}</td></tr>`
              : ""
      }
            ${
          item.discount
              ? `<tr><th>${t('product.discount')}:</th><td>${
                  item.discount.type === "percentage"
                      ? item.discount.value + "%"
                      : "$" + item.discount.amount.toFixed(2)
              }</td></tr>`
              : ""
      }
          </table>
        </div>
        <div class="modal-footer">
          <button id="close-details-btn" class="btn secondary-btn">${t('common.close')}</button>
        </div>
      `;

      // First append content to modal
      detailsModal.appendChild(modalContent);

      // Then append modal to document
      document.body.appendChild(detailsModal);

      // Show the modal
      detailsModal.style.display = "block";

      // Set up close button event listeners - with null checks
      const closeBtn = detailsModal.querySelector(".close");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          document.body.removeChild(detailsModal);
        });
      }

      const closeDetailsBtn = detailsModal.querySelector("#close-details-btn");
      if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener("click", () => {
          document.body.removeChild(detailsModal);
        });
      }

      // Close when clicking outside
      window.addEventListener("click", (event) => {
        if (event.target === detailsModal) {
          document.body.removeChild(detailsModal);
        }
      });
    } catch (error) {
      console.error(t('product.errors.display'), error);
      alert(t('product.errors.alert'));
    }
  } else {
    alert(t('cart.selectItemFirst'));
  }
}

// F9: Increase quantity
function increaseQuantity() {
  if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
    cart[selectedCartIndex].quantity += 1;
    cart[selectedCartIndex].total =
        cart[selectedCartIndex].price * cart[selectedCartIndex].quantity;
    renderCart();
    updateTotals();
  } else {
    alert(t('cart.selectItemFirst'));
  }
}

// Format currency based on user settings
function formatCurrency(amount) {
  const currency = localStorage.getItem("currency") || "USD";
  const symbol = currency === "ILS" ? "₪" : "$";
  return `${symbol}${parseFloat(amount).toFixed(2)}`;
}

// F10: Decrease quantity
function decreaseQuantity() {
  if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
    if (cart[selectedCartIndex].quantity > 1) {
      cart[selectedCartIndex].quantity -= 1;
      cart[selectedCartIndex].total =
          cart[selectedCartIndex].price * cart[selectedCartIndex].quantity;
      renderCart();
      updateTotals();
    } else {
      alert(t('cart.quantityMinError'));
    }
  } else {
    alert(t('cart.selectItemFirst'));
  }
}

// Add CSS for cart item selection
function addShortcutStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    .selected-row {
      background-color: #e9f5ff;
      outline: 2px solid var(--primary-color);
    }
    
    .shortcut-indicator {
      font-size: 0.8em;
      opacity: 0.7;
    }
    
    .shortcuts-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .shortcuts-table th, .shortcuts-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    
    .shortcuts-table th {
      background-color: #f2f2f2;
    }
    
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    
    .details-table th, .details-table td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    
    .details-table th {
      width: 40%;
      background-color: #f2f2f2;
    }
  `;
  document.head.appendChild(styleElement);
}