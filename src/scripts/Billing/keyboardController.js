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
                F4: function () {  // Add this new handler
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
                            alert("Please click 'Edit' first before making changes.");
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

    console.log("Keyboard shortcuts fixed");
}

// Initialize keyboard shortcuts
function initKeyboardShortcuts() {
    console.log("Initializing keyboard shortcuts");
    document.addEventListener("keydown", handleKeyboardShortcut);

    // Add help button for shortcuts
    const actionsContainer = document.querySelector(".payment-actions");
    const helpButton = document.createElement("button");
    helpButton.id = "shortcuts-help-btn";
    helpButton.className = "btn secondary-btn";
    helpButton.textContent = "Shortcuts (?)";
    helpButton.addEventListener("click", showShortcutsHelp);
    actionsContainer.appendChild(helpButton);

    // Add selection highlighting to cart items
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
            console.warn("Row parent not found, cannot determine index");
            selectedCartIndex = -1;
        }
    });

    // Add shortcut indicator to buttons
    addShortcutIndicator("complete-sale", "F3");
    addShortcutIndicator("clear-invoice", "F7");
}

// Handle keyboard shortcuts
// Handle keyboard shortcuts
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

    console.log("Key pressed:", event.key, event.code);

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
            case "F4":  // Changed from "d" to "F4"
            case "F5":
            case "F7":
            case "F9":
            case "F10":
            case "Delete":
                event.preventDefault();
                // Stop event propagation to prevent other handlers from running
                event.stopImmediatePropagation();
                alert("Please click 'Edit' first before making changes.");
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

// Show shortcuts help modal
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
      <h2>Keyboard Shortcuts</h2>
      <span class="close">&times;</span>
    `;

        const modalBody = document.createElement("div");
        modalBody.className = "modal-body";
        modalBody.innerHTML = `
      <table class="shortcuts-table">
        <tr><th>Key</th><th>Action</th></tr>
        <tr><td>F1</td><td>Add miscellaneous item</td></tr>
        <tr><td>F2</td><td>Process return/refund</td></tr>
        <tr><td>F3</td><td>Complete sale</td></tr>
        <tr><td>F5</td><td>Remove selected item</td></tr>
        <tr><td>F6</td><td>Show product details</td></tr>
        <tr><td>F7</td><td>Clear cart</td></tr>
        <tr><td>F8</td><td>Print receipt</td></tr>
        <tr><td>F9</td><td>Increase quantity</td></tr>
        <tr><td>F10</td><td>Decrease quantity</td></tr>
        <tr><td>F11</td><td>Show previous invoice</td></tr>
        <tr><td>F12</td><td>Show next invoice</td></tr>
        <tr><td>Delete</td><td>Clear cart</td></tr>
        <tr><td>/</td><td>Focus search box</td></tr>
        <tr><td>B</td><td>Focus barcode input</td></tr>
        <tr><td>F4</td><td>Add discount</td></tr>
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
    console.log("Opening miscellaneous item modal");

    try {
        // Create a modal dialog for entering miscellaneous item
        const miscModal = document.createElement("div");
        miscModal.className = "modal";
        miscModal.id = "misc-item-modal";

        const modalContent = document.createElement("div");
        modalContent.className = "modal-content";

        modalContent.innerHTML = `
      <div class="modal-header">
        <h2>Add Miscellaneous Item</h2>
        <span class="close">&times;</span>
      </div>
      <div class="modal-body">
        <form id="misc-item-form">
          <div class="form-group">
            <label for="misc-name">Item Description</label>
            <input type="text" id="misc-name" placeholder="Item description" required>
          </div>
          <div class="form-group">
            <label for="misc-price">Price ($)</label>
            <input type="number" id="misc-price" step="0.01" min="0" value="0.00" required>
          </div>
          <div class="form-actions">
            <button type="button" class="btn secondary-btn" id="cancel-misc">Cancel</button>
            <button type="submit" class="btn primary-btn">Add Item</button>
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
            console.error("Close button not found in misc modal");
        }

        const cancelBtn = miscModal.querySelector("#cancel-misc");
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => {
                document.body.removeChild(miscModal);
            });
        } else {
            console.error("Cancel button not found in misc modal");
        }

        const miscForm = miscModal.querySelector("#misc-item-form");
        if (miscForm) {
            // Handle form submission
            miscForm.addEventListener("submit", (event) => {
                event.preventDefault();

                const nameInput = miscModal.querySelector("#misc-name");
                const priceInput = miscModal.querySelector("#misc-price");

                if (!nameInput || !priceInput) {
                    console.error("Name or price input not found");
                    return;
                }

                const itemName = nameInput.value;
                const itemPrice = parseFloat(priceInput.value);

                // Add to cart
                const miscItem = {
                    id: `misc-${Date.now()}`,
                    name: `Misc: ${itemName}`,
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
            console.error("Misc form not found");
        }

        // Close when clicking outside
        window.addEventListener("click", (event) => {
            if (event.target === miscModal) {
                document.body.removeChild(miscModal);
            }
        });
    } catch (error) {
        console.error("Error in addMiscellaneousItem:", error);
        alert("There was an error adding a miscellaneous item. Please try again.");
    }
}

// F2: Process return/refund
function processReturn() {
    if (isViewingInvoice && !isEditingInvoice) {
        alert("Please click 'Edit' first before processing a refund.");
        return;
    }
    if (cart.length === 0) {
        alert("Cart is empty. Add items to process a refund.");
        return;
    }

    // Check if there are selected items
    if (selectedItems.length === 0 && selectedCartIndex === -1) {
        alert("Please select items to refund by checking the boxes next to them.");
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
            ? "Process this as a complete return/refund? This will make all prices negative."
            : `Process a partial refund for ${itemsToRefund.length} selected item(s)?`;

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
                ? "Complete Refund"
                : "Complete Partial Refund";

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
    refundButton.textContent = "Refund Selected";
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
        alert("Please select an item from the cart first");
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
          <h2>Product Details</h2>
          <span class="close">&times;</span>
        </div>
        <div class="modal-body">
          <table class="details-table">
            <tr>
              <th>Product ID:</th>
              <td>${item.id || "N/A"}</td>
            </tr>
            <tr>
              <th>Name:</th>
              <td>${item.name || "N/A"}</td>
            </tr>
            <tr>
              <th>Unit Price:</th>
              <td>$${Math.abs(item.price).toFixed(2)}</td>
            </tr>
            <tr>
              <th>Quantity:</th>
              <td>${item.quantity}</td>
            </tr>
            <tr>
              <th>Total:</th>
              <td>$${Math.abs(item.price * item.quantity).toFixed(2)}</td>
            </tr>
            ${
                item.isRefund ? "<tr><th>Type:</th><td>Refund Item</td></tr>" : ""
            }
            ${
                item.isMiscellaneous
                    ? "<tr><th>Type:</th><td>Miscellaneous Item</td></tr>"
                    : ""
            }
            ${
                item.discount
                    ? `<tr><th>Discount:</th><td>${
                        item.discount.type === "percentage"
                            ? item.discount.value + "%"
                            : "$" + item.discount.amount.toFixed(2)
                    }</td></tr>`
                    : ""
            }
          </table>
        </div>
        <div class="modal-footer">
          <button id="close-details-btn" class="btn secondary-btn">Close</button>
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
            console.error("Error displaying product details:", error);
            alert("There was an error displaying product details. Please try again.");
        }
    } else {
        alert("Please select an item from the cart first");
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
        alert("Please select an item from the cart first");
    }
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
            alert("Quantity cannot be less than 1. Use F5 to remove the item.");
        }
    } else {
        alert("Please select an item from the cart first");
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