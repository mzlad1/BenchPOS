// Globals for discount tracking
let cartDiscount = {
  type: "none", // 'none', 'percentage', 'fixed'
  value: 0, // percentage or fixed amount
  amount: 0, // calculated amount
};

// Add discount button to the invoice summary
function initDiscountFeature() {
  // Get the invoice summary element
  const invoiceSummary = document.querySelector(".invoice-summary");

  // Check if invoice summary exists
  if (!invoiceSummary) {
    console.error("Invoice summary element not found");
    return;
  }

  // Check if total row exists
  const totalRow = document.querySelector(".summary-row.total");
  if (!totalRow) {
    console.error("Total row element not found");
    return;
  }

  // Add discount row before the total row
  const discountRow = document.createElement("div");
  discountRow.className = "summary-row";
  discountRow.innerHTML = `
    <span>Discount:</span>
    <span id="discount-value">$0.00</span>
  `;

  // Insert before the total row
  invoiceSummary.insertBefore(discountRow, totalRow);

  // Add discount button
  const discountButtonRow = document.createElement("div");
  discountButtonRow.className = "summary-row discount-actions";
  discountButtonRow.innerHTML = `
    <button id="add-discount-btn" class="btn secondary-btn">Add Discount</button>
  `;

  // Insert after the discount row
  invoiceSummary.insertBefore(discountButtonRow, totalRow);

  // Find the button element after it has been added to the DOM
  const addDiscountBtn = document.getElementById("add-discount-btn");

  // Check if button exists before adding event listener
  if (addDiscountBtn) {
    addDiscountBtn.addEventListener("click", showDiscountModal);

    // Add shortcut indicator
    addShortcutIndicator("add-discount-btn", "D");
  } else {
    console.error("Discount button element not found after insertion");
  }

  // Add keyboard shortcut (D)
  document.addEventListener("keydown", function (event) {
    if (
      event.key === "d" &&
      !(event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")
    ) {
      // First check if we're viewing an invoice without being in edit mode
      if (isViewingInvoice && !isEditingInvoice) {
        event.preventDefault();
        alert("Please click 'Edit' first before making changes.");
        return;
      }

      // Otherwise proceed normally
      event.preventDefault();
      showDiscountModal();
    }
  });
}

// Show discount modal
// Show discount modal
// Modify the showDiscountModal function to handle multi-selection
function showDiscountModal() {
  console.log("Opening discount modal");

  try {
    // Calculate current subtotal to use for suggestions
    const currentSubtotal = parseFloat(subtotalEl.textContent.replace("$", ""));

    // Create modal for applying discounts
    const discountModal = document.createElement("div");
    discountModal.className = "modal";
    discountModal.id = "discount-modal";

    let currentType = cartDiscount.type;
    let currentValue = cartDiscount.value;

    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    // Check if multiple items are selected
    const hasMultipleSelected = selectedItems.length > 0;
    const selectedItemsCount = selectedItems.length;

    modalContent.innerHTML = `
      <div class="modal-header">
        <h2>Apply Discount</h2>
        <span class="close">&times;</span>
      </div>
      <div class="modal-body">
        <div class="discount-options">
          <div class="discount-section">
            <h3>Cart Discount</h3>
            <form id="cart-discount-form">
              <div class="form-group">
                <label>Discount Type</label>
                <div class="radio-group">
                  <label>
                    <input type="radio" name="cart-discount-type" value="none" ${
                      currentType === "none" ? "checked" : ""
                    }>
                    No Discount
                  </label>
                  <label>
                    <input type="radio" name="cart-discount-type" value="percentage" ${
                      currentType === "percentage" ? "checked" : ""
                    }>
                    Percentage (%)
                  </label>
                  <label>
                    <input type="radio" name="cart-discount-type" value="fixed" ${
                      currentType === "fixed" ? "checked" : ""
                    }>
                    Fixed Amount ($)
                  </label>
                </div>
              </div>
              
              <div class="form-group" id="cart-discount-value-group" ${
                currentType === "none" ? 'style="display: none;"' : ""
              }>
                <label for="cart-discount-value">Discount Value</label>
                <input type="number" id="cart-discount-value" min="0" step="0.01" value="${currentValue.toFixed(
                  2
                )}" ${
      currentType === "fixed" ? `max="${currentSubtotal.toFixed(2)}"` : ""
    }>
                <small class="hint">Enter percentage or dollar amount</small>
                
                <!-- Percentage suggestions -->
                <div id="percentage-suggestions" class="suggestion-buttons" ${
                  currentType === "percentage" ? "" : 'style="display: none;"'
                }>
                  <span>Quick select: </span>
                  <button type="button" class="btn suggestion-btn" data-value="5">5%</button>
                  <button type="button" class="btn suggestion-btn" data-value="10">10%</button>
                  <button type="button" class="btn suggestion-btn" data-value="15">15%</button>
                  <button type="button" class="btn suggestion-btn" data-value="20">20%</button>
                  <button type="button" class="btn suggestion-btn" data-value="25">25%</button>
                  <button type="button" class="btn suggestion-btn" data-value="50">50%</button>
                </div>
                
                <!-- Fixed amount suggestions -->
                <div id="fixed-suggestions" class="suggestion-buttons" ${
                  currentType === "fixed" ? "" : 'style="display: none;"'
                }>
                  <span>Quick select: </span>
                  <button type="button" class="btn suggestion-btn" data-value="5">$5</button>
                  <button type="button" class="btn suggestion-btn" data-value="10">$10</button>
                  <button type="button" class="btn suggestion-btn" data-value="20">$20</button>
                  <button type="button" class="btn suggestion-btn" data-value="50">$50</button>
                  <button type="button" class="btn suggestion-btn" data-value="${(
                    currentSubtotal * 0.1
                  ).toFixed(2)}">10% ($${(currentSubtotal * 0.1).toFixed(
      2
    )})</button>
                  <button type="button" class="btn suggestion-btn" data-value="${(
                    currentSubtotal * 0.2
                  ).toFixed(2)}">20% ($${(currentSubtotal * 0.2).toFixed(
      2
    )})</button>
                </div>
              </div>
            </form>
          </div>
          
          <div class="discount-section">
            <h3>Item Discount</h3>
            ${
              hasMultipleSelected
                ? `<p>You have <strong>${selectedItemsCount}</strong> items selected. Apply discount to all selected items.</p>`
                : `<p>Select an item in the cart first, then apply discount to that item.</p>`
            }
            <button id="apply-item-discount" class="btn secondary-btn" ${
              hasMultipleSelected || selectedCartIndex >= 0 ? "" : "disabled"
            }>
              Apply to ${
                hasMultipleSelected
                  ? `${selectedItemsCount} Selected Items`
                  : "Selected Item"
              }
            </button>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn secondary-btn" id="remove-all-discounts">Remove All Discounts</button>
          <button type="button" class="btn primary-btn" id="apply-cart-discount">Apply Discount</button>
        </div>
      </div>
    `;

    // First append content to modal
    discountModal.appendChild(modalContent);

    // Then append modal to body
    document.body.appendChild(discountModal);

    // Show the modal
    discountModal.style.display = "block";

    // Event handlers with null checks
    const closeBtn = discountModal.querySelector(".close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        document.body.removeChild(discountModal);
      });
    }

    // Toggle discount value input and suggestion buttons
    const discountTypeInputs = discountModal.querySelectorAll(
      'input[name="cart-discount-type"]'
    );
    const discountValueGroup = discountModal.querySelector(
      "#cart-discount-value-group"
    );
    const percentageSuggestions = discountModal.querySelector(
      "#percentage-suggestions"
    );
    const fixedSuggestions = discountModal.querySelector("#fixed-suggestions");
    const discountValueInput = discountModal.querySelector(
      "#cart-discount-value"
    );

    if (
      discountTypeInputs &&
      discountTypeInputs.length > 0 &&
      discountValueGroup
    ) {
      discountTypeInputs.forEach((input) => {
        input.addEventListener("change", () => {
          // Show/hide value input group
          if (input.value === "none") {
            discountValueGroup.style.display = "none";
          } else {
            discountValueGroup.style.display = "block";

            // Show/hide appropriate suggestion buttons
            if (input.value === "percentage") {
              percentageSuggestions.style.display = "flex";
              fixedSuggestions.style.display = "none";
              discountValueInput.removeAttribute("max"); // Remove max constraint
            } else if (input.value === "fixed") {
              percentageSuggestions.style.display = "none";
              fixedSuggestions.style.display = "flex";
              discountValueInput.setAttribute(
                "max",
                currentSubtotal.toFixed(2)
              ); // Set max to subtotal
            }
          }
        });
      });
    }

    // Add event listeners to suggestion buttons
    const suggestionBtns = discountModal.querySelectorAll(".suggestion-btn");
    if (suggestionBtns) {
      suggestionBtns.forEach((btn) => {
        btn.addEventListener("click", (event) => {
          event.preventDefault(); // Prevent form submission
          const value = parseFloat(btn.dataset.value);
          if (discountValueInput) {
            discountValueInput.value = value;
          }
        });
      });
    }

    // Apply cart discount
    const applyCartDiscountBtn = discountModal.querySelector(
      "#apply-cart-discount"
    );
    if (applyCartDiscountBtn) {
      applyCartDiscountBtn.addEventListener("click", () => {
        const selectedTypeElement = discountModal.querySelector(
          'input[name="cart-discount-type"]:checked'
        );

        if (!selectedTypeElement) {
          console.error("No discount type selected");
          return;
        }

        const selectedType = selectedTypeElement.value;

        if (selectedType === "none") {
          cartDiscount = { type: "none", value: 0, amount: 0 };
        } else {
          const discountValueElement = discountModal.querySelector(
            "#cart-discount-value"
          );
          if (!discountValueElement) {
            console.error("Discount value element not found");
            return;
          }

          const discountValue = parseFloat(discountValueElement.value) || 0;

          if (discountValue <= 0) {
            alert("Please enter a valid discount value greater than 0.");
            return;
          }

          // For fixed discount, make sure it's not greater than subtotal
          if (selectedType === "fixed" && discountValue > currentSubtotal) {
            alert(
              `Discount amount cannot exceed the subtotal ($${currentSubtotal.toFixed(
                2
              )})`
            );
            return;
          }

          cartDiscount = {
            type: selectedType,
            value: discountValue,
            amount: 0, // Will be calculated in updateTotals()
          };
        }

        updateTotals();
        document.body.removeChild(discountModal);
      });
    }

    // Apply item discount - MODIFIED TO HANDLE MULTIPLE ITEMS
    const applyItemDiscountBtn = discountModal.querySelector(
      "#apply-item-discount"
    );
    if (applyItemDiscountBtn) {
      applyItemDiscountBtn.addEventListener("click", () => {
        if (selectedItems.length > 0) {
          // Multiple items selected - show multi-item discount modal
          showMultiItemDiscountModal(selectedItems);
          document.body.removeChild(discountModal);
        } else if (selectedCartIndex >= 0 && selectedCartIndex < cart.length) {
          // Single item selected
          showItemDiscountModal(selectedCartIndex);
          document.body.removeChild(discountModal);
        } else {
          alert("Please select at least one item from the cart first");
        }
      });
    }

    // Remove all discounts
    const removeAllDiscountsBtn = discountModal.querySelector(
      "#remove-all-discounts"
    );
    if (removeAllDiscountsBtn) {
      removeAllDiscountsBtn.addEventListener("click", () => {
        // Remove cart discount
        cartDiscount = { type: "none", value: 0, amount: 0 };

        // Remove all item discounts
        cart.forEach((item) => {
          if (item.discount) {
            delete item.discount;
          }
        });

        updateTotals();
        renderCart();
        document.body.removeChild(discountModal);
      });
    }

    // Close when clicking outside
    window.addEventListener("click", (event) => {
      if (event.target === discountModal) {
        document.body.removeChild(discountModal);
      }
    });
  } catch (error) {
    console.error("Error in showDiscountModal:", error);
    alert("There was an error showing the discount modal. Please try again.");
  }
}

// New function to handle discount for multiple items
function showMultiItemDiscountModal(itemIndices) {
  try {
    if (itemIndices.length === 0) {
      console.error("No items selected for discount");
      return;
    }

    // Get the selected items
    const selectedCartItems = itemIndices
      .map((index) => cart[index])
      .filter(Boolean);

    // Calculate total price of selected items
    const totalPrice = selectedCartItems.reduce(
      (sum, item) => sum + Math.abs(item.price) * item.quantity,
      0
    );

    // Create modal for applying item discount
    const discountModal = document.createElement("div");
    discountModal.className = "modal";
    discountModal.id = "multi-item-discount-modal";

    // Check if all selected items have the same discount
    let initialDiscountType = "none";
    let initialDiscountValue = 0;
    let isConsistentDiscount = true;

    if (selectedCartItems.length > 0 && selectedCartItems[0].discount) {
      initialDiscountType = selectedCartItems[0].discount.type;
      initialDiscountValue = selectedCartItems[0].discount.value;

      // Check if all items have the same discount
      isConsistentDiscount = selectedCartItems.every(
        (item) =>
          item.discount &&
          item.discount.type === initialDiscountType &&
          item.discount.value === initialDiscountValue
      );
    }

    // If discounts are inconsistent, default to none
    if (!isConsistentDiscount) {
      initialDiscountType = "none";
      initialDiscountValue = 0;
    }

    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    modalContent.innerHTML = `
      <div class="modal-header">
        <h2>Apply Discount to ${selectedCartItems.length} Items</h2>
        <span class="close">&times;</span>
      </div>
      <div class="modal-body">
        <div class="item-info">
          <p><strong>Selected Items:</strong> ${selectedCartItems.length}</p>
          <p><strong>Total Price:</strong> $${totalPrice.toFixed(2)}</p>
        </div>
        <form id="multi-item-discount-form">
          <div class="form-group">
            <label>Discount Type</label>
            <div class="radio-group">
              <label>
                <input type="radio" name="multi-item-discount-type" value="none" ${
                  initialDiscountType === "none" ? "checked" : ""
                }>
                No Discount
              </label>
              <label>
                <input type="radio" name="multi-item-discount-type" value="percentage" ${
                  initialDiscountType === "percentage" ? "checked" : ""
                }>
                Percentage (%)
              </label>
              <label>
                <input type="radio" name="multi-item-discount-type" value="fixed" ${
                  initialDiscountType === "fixed" ? "checked" : ""
                }>
                Fixed Amount ($) per item
              </label>
            </div>
          </div>
          
          <div class="form-group" id="multi-item-discount-value-group" ${
            initialDiscountType === "none" ? 'style="display: none;"' : ""
          }>
            <label for="multi-item-discount-value">Discount Value</label>
            <input type="number" id="multi-item-discount-value" min="0" step="0.01" value="${initialDiscountValue.toFixed(
              2
            )}">
            <small class="hint">Enter percentage or dollar amount per item</small>
            
            <!-- Discount preview -->
            <div id="multi-discount-preview" class="discount-preview" ${
              initialDiscountType === "none" ? 'style="display: none;"' : ""
            }>
              <span>Estimated total savings: <strong id="savings-display">$0.00</strong></span>
            </div>
            
            <!-- Percentage suggestions -->
            <div id="multi-percentage-suggestions" class="suggestion-buttons" ${
              initialDiscountType === "percentage"
                ? ""
                : 'style="display: none;"'
            }>
              <span>Quick select: </span>
              <button type="button" class="btn suggestion-btn" data-value="5">5%</button>
              <button type="button" class="btn suggestion-btn" data-value="10">10%</button>
              <button type="button" class="btn suggestion-btn" data-value="15">15%</button>
              <button type="button" class="btn suggestion-btn" data-value="20">20%</button>
              <button type="button" class="btn suggestion-btn" data-value="25">25%</button>
              <button type="button" class="btn suggestion-btn" data-value="50">50%</button>
            </div>
            
            <!-- Fixed amount suggestions -->
            <div id="multi-fixed-suggestions" class="suggestion-buttons" ${
              initialDiscountType === "fixed" ? "" : 'style="display: none;"'
            }>
              <span>Quick select: </span>
              <button type="button" class="btn suggestion-btn" data-value="1">$1</button>
              <button type="button" class="btn suggestion-btn" data-value="2">$2</button>
              <button type="button" class="btn suggestion-btn" data-value="5">$5</button>
            </div>
          </div>
          
         <div class="form-actions">
            <button type="button" class="btn secondary-btn" id="cancel-multi-discount">Cancel</button>
            <button type="button" class="btn primary-btn" id="apply-multi-discount-btn">Apply to All Selected Items</button>
          </div>
        </form>
      </div>
    `;

    // Append content to modal first
    discountModal.appendChild(modalContent);

    // Then append modal to body
    document.body.appendChild(discountModal);

    // Show the modal
    discountModal.style.display = "block";

    // Event handlers with null checks
    const closeBtn = discountModal.querySelector(".close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        document.body.removeChild(discountModal);
      });
    }

    // Toggle discount value input and suggestion buttons
    const discountTypeInputs = discountModal.querySelectorAll(
      'input[name="multi-item-discount-type"]'
    );
    const discountValueGroup = discountModal.querySelector(
      "#multi-item-discount-value-group"
    );
    const percentageSuggestions = discountModal.querySelector(
      "#multi-percentage-suggestions"
    );
    const fixedSuggestions = discountModal.querySelector(
      "#multi-fixed-suggestions"
    );
    const discountValueInput = discountModal.querySelector(
      "#multi-item-discount-value"
    );
    const discountPreview = discountModal.querySelector(
      "#multi-discount-preview"
    );
    const savingsDisplay = discountModal.querySelector("#savings-display");

    if (
      discountTypeInputs &&
      discountTypeInputs.length > 0 &&
      discountValueGroup
    ) {
      discountTypeInputs.forEach((input) => {
        input.addEventListener("change", () => {
          // Show/hide value input group
          if (input.value === "none") {
            discountValueGroup.style.display = "none";
            discountPreview.style.display = "none";
          } else {
            discountValueGroup.style.display = "block";
            discountPreview.style.display = "block";

            // Show/hide appropriate suggestion buttons
            if (input.value === "percentage") {
              percentageSuggestions.style.display = "flex";
              fixedSuggestions.style.display = "none";
              discountValueInput.removeAttribute("max"); // Remove max constraint
              updateMultiSavingsPreview(
                selectedCartItems,
                "percentage",
                parseFloat(discountValueInput.value) || 0
              );
            } else if (input.value === "fixed") {
              percentageSuggestions.style.display = "none";
              fixedSuggestions.style.display = "flex";
              updateMultiSavingsPreview(
                selectedCartItems,
                "fixed",
                parseFloat(discountValueInput.value) || 0
              );
            }
          }
        });
      });
    }

    // Update savings preview when discount value changes
    if (discountValueInput) {
      discountValueInput.addEventListener("input", () => {
        const selectedType = discountModal.querySelector(
          'input[name="multi-item-discount-type"]:checked'
        ).value;
        if (selectedType !== "none") {
          updateMultiSavingsPreview(
            selectedCartItems,
            selectedType,
            parseFloat(discountValueInput.value) || 0
          );
        }
      });
    }

    // Function to update the savings preview
    function updateMultiSavingsPreview(items, discountType, discountValue) {
      let totalSavings = 0;

      items.forEach((item) => {
        const itemPrice = Math.abs(item.price);
        let discountAmount = 0;

        if (discountType === "percentage") {
          discountAmount = itemPrice * (discountValue / 100);
        } else if (discountType === "fixed") {
          discountAmount = Math.min(discountValue, itemPrice);
        }

        totalSavings += discountAmount * item.quantity;
      });

      if (savingsDisplay) {
        savingsDisplay.textContent = `$${totalSavings.toFixed(2)}`;
      }
    }

    // Add event listeners to suggestion buttons
    const suggestionBtns = discountModal.querySelectorAll(".suggestion-btn");
    if (suggestionBtns) {
      suggestionBtns.forEach((btn) => {
        btn.addEventListener("click", (event) => {
          event.preventDefault(); // Prevent form submission
          const value = parseFloat(btn.dataset.value);
          if (discountValueInput) {
            discountValueInput.value = value;

            // Update preview
            const selectedType = discountModal.querySelector(
              'input[name="multi-item-discount-type"]:checked'
            ).value;
            updateMultiSavingsPreview(selectedCartItems, selectedType, value);
          }
        });
      });
    }

    // Apply discount to all selected items
    const applyMultiDiscountBtn = discountModal.querySelector(
      "#apply-multi-discount-btn"
    );
    if (applyMultiDiscountBtn) {
      applyMultiDiscountBtn.addEventListener("click", () => {
        const selectedTypeElement = discountModal.querySelector(
          'input[name="multi-item-discount-type"]:checked'
        );

        if (!selectedTypeElement) {
          console.error("No discount type selected for items");
          return;
        }

        const selectedType = selectedTypeElement.value;

        // Apply to all selected items
        itemIndices.forEach((index) => {
          if (index >= 0 && index < cart.length) {
            const item = cart[index];

            if (selectedType === "none") {
              // Remove discount if exists
              if (item.discount) {
                delete item.discount;
              }
            } else {
              const discountValueElement = discountModal.querySelector(
                "#multi-item-discount-value"
              );
              if (!discountValueElement) {
                console.error("Item discount value element not found");
                return;
              }

              const discountValue = parseFloat(discountValueElement.value) || 0;

              if (discountValue <= 0) {
                alert("Please enter a valid discount value greater than 0.");
                return;
              }

              // Calculate discounted price for this item
              let discountAmount = 0;
              const basePrice = Math.abs(item.price);

              if (selectedType === "percentage") {
                discountAmount = basePrice * (discountValue / 100);
                if (discountAmount > basePrice) discountAmount = basePrice;
              } else {
                discountAmount = discountValue;
                if (discountAmount > basePrice) discountAmount = basePrice;
              }

              // Apply discount to this item
              item.discount = {
                type: selectedType,
                value: discountValue,
                amount: discountAmount,
              };
            }
          }
        });

        // Update UI
        renderCart();
        updateTotals();
        document.body.removeChild(discountModal);

        // Clear selection after applying
        selectedItems = [];
      });
    }

    // Cancel button
    const cancelBtn = discountModal.querySelector("#cancel-multi-discount");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        document.body.removeChild(discountModal);
      });
    }

    // Close when clicking outside
    window.addEventListener("click", (event) => {
      if (event.target === discountModal) {
        document.body.removeChild(discountModal);
      }
    });

    // Initialize savings preview if there's already a discount type selected
    if (initialDiscountType !== "none") {
      updateMultiSavingsPreview(
        selectedCartItems,
        initialDiscountType,
        initialDiscountValue
      );
    }
  } catch (error) {
    console.error("Error in showMultiItemDiscountModal:", error);
    alert(
      "There was an error showing the multi-item discount modal. Please try again."
    );
  }
}

// Show item discount modal
// Show item discount modal
// Show item discount modal with suggestions
function showItemDiscountModal(itemIndex) {
  console.log("Opening item discount modal for index:", itemIndex);

  try {
    const item = cart[itemIndex];
    if (!item) {
      console.error("Item not found at index:", itemIndex);
      return;
    }

    // Calculate item total price for validations
    const itemTotalPrice = Math.abs(item.price) * item.quantity;

    // Create modal for applying item discount
    const discountModal = document.createElement("div");
    discountModal.className = "modal";
    discountModal.id = "item-discount-modal";

    let currentType = item.discount ? item.discount.type : "none";
    let currentValue = item.discount ? item.discount.value : 0;

    const modalContent = document.createElement("div");
    modalContent.className = "modal-content";

    modalContent.innerHTML = `
      <div class="modal-header">
        <h2>Item Discount: ${item.name}</h2>
        <span class="close">&times;</span>
      </div>
      <div class="modal-body">
        <div class="item-info">
          <p><strong>Price:</strong> $${Math.abs(item.price).toFixed(2)} × ${
      item.quantity
    } = $${itemTotalPrice.toFixed(2)}</p>
        </div>
        <form id="item-discount-form">
          <div class="form-group">
            <label>Discount Type</label>
            <div class="radio-group">
              <label>
                <input type="radio" name="item-discount-type" value="none" ${
                  currentType === "none" ? "checked" : ""
                }>
                No Discount
              </label>
              <label>
                <input type="radio" name="item-discount-type" value="percentage" ${
                  currentType === "percentage" ? "checked" : ""
                }>
                Percentage (%)
              </label>
              <label>
                <input type="radio" name="item-discount-type" value="fixed" ${
                  currentType === "fixed" ? "checked" : ""
                }>
                Fixed Amount ($)
              </label>
            </div>
          </div>
          
          <div class="form-group" id="item-discount-value-group" ${
            currentType === "none" ? 'style="display: none;"' : ""
          }>
            <label for="item-discount-value">Discount Value</label>
            <input type="number" id="item-discount-value" min="0" step="0.01" value="${currentValue.toFixed(
              2
            )}" ${
      currentType === "fixed" ? `max="${Math.abs(item.price).toFixed(2)}"` : ""
    }>
            <small class="hint">Enter percentage or dollar amount</small>
            
            <!-- Discount preview -->
            <div id="discount-preview" class="discount-preview" ${
              currentType === "none" ? 'style="display: none;"' : ""
            }>
              <span>New price after discount: <strong id="new-price-display">$${Math.abs(
                item.price
              ).toFixed(2)}</strong></span>
            </div>
            
            <!-- Percentage suggestions -->
            <div id="item-percentage-suggestions" class="suggestion-buttons" ${
              currentType === "percentage" ? "" : 'style="display: none;"'
            }>
              <span>Quick select: </span>
              <button type="button" class="btn suggestion-btn" data-value="5">5%</button>
              <button type="button" class="btn suggestion-btn" data-value="10">10%</button>
              <button type="button" class="btn suggestion-btn" data-value="15">15%</button>
              <button type="button" class="btn suggestion-btn" data-value="20">20%</button>
              <button type="button" class="btn suggestion-btn" data-value="25">25%</button>
              <button type="button" class="btn suggestion-btn" data-value="50">50%</button>
              <button type="button" class="btn suggestion-btn" data-value="100">100% (Free)</button>
            </div>
            
            <!-- Fixed amount suggestions -->
            <div id="item-fixed-suggestions" class="suggestion-buttons" ${
              currentType === "fixed" ? "" : 'style="display: none;"'
            }>
              <span>Quick select: </span>
              <button type="button" class="btn suggestion-btn" data-value="1">$1</button>
              <button type="button" class="btn suggestion-btn" data-value="2">$2</button>
              <button type="button" class="btn suggestion-btn" data-value="5">$5</button>
              <button type="button" class="btn suggestion-btn" data-value="${(
                Math.abs(item.price) * 0.1
              ).toFixed(2)}">10% ($${(Math.abs(item.price) * 0.1).toFixed(
      2
    )})</button>
              <button type="button" class="btn suggestion-btn" data-value="${(
                Math.abs(item.price) * 0.25
              ).toFixed(2)}">25% ($${(Math.abs(item.price) * 0.25).toFixed(
      2
    )})</button>
              <button type="button" class="btn suggestion-btn" data-value="${Math.abs(
                item.price
              ).toFixed(2)}">Full price ($${Math.abs(item.price).toFixed(
      2
    )})</button>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn secondary-btn" id="cancel-item-discount">Cancel</button>
            <button type="button" class="btn primary-btn" id="apply-item-discount-btn">Apply Discount</button>
          </div>
        </form>
      </div>
    `;

    // Append content to modal first
    discountModal.appendChild(modalContent);

    // Then append modal to body
    document.body.appendChild(discountModal);

    // Show the modal
    discountModal.style.display = "block";

    // Event handlers with null checks
    const closeBtn = discountModal.querySelector(".close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        document.body.removeChild(discountModal);
      });
    }

    // Toggle discount value input and suggestion buttons
    const discountTypeInputs = discountModal.querySelectorAll(
      'input[name="item-discount-type"]'
    );
    const discountValueGroup = discountModal.querySelector(
      "#item-discount-value-group"
    );
    const percentageSuggestions = discountModal.querySelector(
      "#item-percentage-suggestions"
    );
    const fixedSuggestions = discountModal.querySelector(
      "#item-fixed-suggestions"
    );
    const discountValueInput = discountModal.querySelector(
      "#item-discount-value"
    );
    const discountPreview = discountModal.querySelector("#discount-preview");
    const newPriceDisplay = discountModal.querySelector("#new-price-display");

    if (
      discountTypeInputs &&
      discountTypeInputs.length > 0 &&
      discountValueGroup
    ) {
      discountTypeInputs.forEach((input) => {
        input.addEventListener("change", () => {
          // Show/hide value input group
          if (input.value === "none") {
            discountValueGroup.style.display = "none";
            discountPreview.style.display = "none";
          } else {
            discountValueGroup.style.display = "block";
            discountPreview.style.display = "block";

            // Show/hide appropriate suggestion buttons
            if (input.value === "percentage") {
              percentageSuggestions.style.display = "flex";
              fixedSuggestions.style.display = "none";
              discountValueInput.removeAttribute("max"); // Remove max constraint
              updatePricePreview(
                item,
                "percentage",
                parseFloat(discountValueInput.value) || 0
              );
            } else if (input.value === "fixed") {
              percentageSuggestions.style.display = "none";
              fixedSuggestions.style.display = "flex";
              discountValueInput.setAttribute(
                "max",
                Math.abs(item.price).toFixed(2)
              ); // Set max to item price
              updatePricePreview(
                item,
                "fixed",
                parseFloat(discountValueInput.value) || 0
              );
            }
          }
        });
      });
    }

    // Update price preview when discount value changes
    if (discountValueInput) {
      discountValueInput.addEventListener("input", () => {
        const selectedType = discountModal.querySelector(
          'input[name="item-discount-type"]:checked'
        ).value;
        if (selectedType !== "none") {
          updatePricePreview(
            item,
            selectedType,
            parseFloat(discountValueInput.value) || 0
          );
        }
      });
    }

    // Function to update the price preview
    function updatePricePreview(item, discountType, discountValue) {
      const itemPrice = Math.abs(item.price);
      let discountAmount = 0;

      if (discountType === "percentage") {
        discountAmount = itemPrice * (discountValue / 100);
        if (discountAmount > itemPrice) discountAmount = itemPrice;
      } else if (discountType === "fixed") {
        discountAmount = discountValue;
        if (discountAmount > itemPrice) discountAmount = itemPrice;
      }

      const newPrice = itemPrice - discountAmount;
      newPriceDisplay.textContent = `$${newPrice.toFixed(2)}`;

      // Highlight as free if fully discounted
      if (newPrice <= 0) {
        newPriceDisplay.classList.add("free-item");
        newPriceDisplay.textContent = "FREE";
      } else {
        newPriceDisplay.classList.remove("free-item");
      }
    }

    // Add event listeners to suggestion buttons
    const suggestionBtns = discountModal.querySelectorAll(".suggestion-btn");
    if (suggestionBtns) {
      suggestionBtns.forEach((btn) => {
        btn.addEventListener("click", (event) => {
          event.preventDefault(); // Prevent form submission
          const value = parseFloat(btn.dataset.value);
          if (discountValueInput) {
            discountValueInput.value = value;

            // Update preview
            const selectedType = discountModal.querySelector(
              'input[name="item-discount-type"]:checked'
            ).value;
            updatePricePreview(item, selectedType, value);
          }
        });
      });
    }

    // Apply item discount
    const applyItemDiscountBtn = discountModal.querySelector(
      "#apply-item-discount-btn"
    );
    if (applyItemDiscountBtn) {
      applyItemDiscountBtn.addEventListener("click", () => {
        const selectedTypeElement = discountModal.querySelector(
          'input[name="item-discount-type"]:checked'
        );

        if (!selectedTypeElement) {
          console.error("No discount type selected for item");
          return;
        }

        const selectedType = selectedTypeElement.value;

        if (selectedType === "none") {
          if (item.discount) {
            delete item.discount;
          }
        } else {
          const discountValueElement = discountModal.querySelector(
            "#item-discount-value"
          );
          if (!discountValueElement) {
            console.error("Item discount value element not found");
            return;
          }

          const discountValue = parseFloat(discountValueElement.value) || 0;

          if (discountValue <= 0) {
            alert("Please enter a valid discount value greater than 0.");
            return;
          }

          // Validate discount amount
          if (
            selectedType === "fixed" &&
            discountValue > Math.abs(item.price)
          ) {
            alert(
              `Fixed discount cannot exceed item price ($${Math.abs(
                item.price
              ).toFixed(2)})`
            );
            return;
          }

          // Calculate discounted price
          let discountAmount = 0;
          const basePrice = Math.abs(item.price);

          if (selectedType === "percentage") {
            discountAmount = basePrice * (discountValue / 100);
            if (discountAmount > basePrice) discountAmount = basePrice;
          } else {
            discountAmount = discountValue;
            if (discountAmount > basePrice) discountAmount = basePrice;
          }

          // Apply discount
          item.discount = {
            type: selectedType,
            value: discountValue,
            amount: discountAmount,
          };
        }

        renderCart();
        updateTotals();
        document.body.removeChild(discountModal);
      });
    }

    // Cancel button
    const cancelItemDiscountBtn = discountModal.querySelector(
      "#cancel-item-discount"
    );
    if (cancelItemDiscountBtn) {
      cancelItemDiscountBtn.addEventListener("click", () => {
        document.body.removeChild(discountModal);
      });
    }

    // Close when clicking outside
    window.addEventListener("click", (event) => {
      if (event.target === discountModal) {
        document.body.removeChild(discountModal);
      }
    });

    // Initialize price preview if there's already a discount type selected
    if (currentType !== "none") {
      updatePricePreview(item, currentType, currentValue);
    }
  } catch (error) {
    console.error("Error in showItemDiscountModal:", error);
    alert(
      "There was an error showing the item discount modal. Please try again."
    );
  }
}

// Add CSS for discount features
// Add these styles to the existing addDiscountStyles function
function addDiscountStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    .discount-actions {
      justify-content: center;
      border-bottom: none;
    }
    
    .radio-group {
      display: flex;
      gap: 10px;
      margin: 10px 0;
    }
    
    .radio-group label {
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
    }
    
    .discount-section {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    
    .discount-section h3 {
      margin-top: 0;
      margin-bottom: 10px;
      color: var(--primary-color);
    }
    
    .hint {
      display: block;
      font-size: 0.8em;
      color: #666;
      margin-top: 5px;
    }
    
    .discounted-price {
      color: var(--success-color);
      font-weight: bold;
    }
    
    .original-price {
      text-decoration: line-through;
      font-size: 0.8em;
      color: #777;
    }
    
    /* New styles for suggestion buttons */
    .suggestion-buttons {
      margin-top: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    
    .suggestion-buttons span {
      font-size: 0.85em;
      color: #666;
      margin-right: 5px;
    }
    
    .suggestion-btn {
      padding: 5px 10px;
      font-size: 0.85em;
      background-color: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .suggestion-btn:hover {
      background-color: var(--primary-color);
      color: white;
      border-color: var(--primary-color);
    }
    
    /* Item discount preview */
    .item-info {
      background-color: #f0f8ff;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 15px;
      border-left: 3px solid var(--primary-color);
    }
    
    .discount-preview {
      margin-top: 12px;
      padding: 8px;
      background-color: #f0fff0;
      border-radius: 4px;
      border: 1px dashed #acacac;
    }
    
    .free-item {
      color: #ff5722;
      font-weight: bold;
    }
    
    /* Modal improvements */
    .modal-content {
      max-height: 85vh;
      overflow-y: auto;
    }
 
  `;
  document.head.appendChild(styleElement);
}

// Add this at the beginning of the updateRenderCartForDiscounts() function
function updateRenderCartForDiscounts() {
  // Save the original function to extend it
  const originalRenderCart = renderCart;

  // Override the renderCart function
  renderCart = function () {
    if (cart.length === 0) {
      cartItemsEl.innerHTML =
        '<tr class="empty-cart"><td colspan="6">No items added yet</td></tr>'; // Change to 6 columns
      completeSaleBtn.disabled = true;
      return;
    }

    cartItemsEl.innerHTML = "";
    completeSaleBtn.disabled = false;

    cart.forEach((item, index) => {
      const cartItemRow = document.createElement("tr");

      // Check if this is the selected item
      if (index === selectedCartIndex) {
        cartItemRow.classList.add("selected-row");
      }

      // Calculate the display price based on discounts
      let displayPrice = Math.abs(item.price);
      let displayTotal = Math.abs(item.price * item.quantity);
      let discountInfo = "";

      if (item.discount) {
        const discountAmount = item.discount.amount;
        const discountedPrice = displayPrice - discountAmount;

        discountInfo = `
          <div class="discounted-price">$${discountedPrice.toFixed(2)}</div>
          <div class="original-price">$${displayPrice.toFixed(2)}</div>
        `;

        displayTotal = discountedPrice * item.quantity;
      } else {
        discountInfo = `$${displayPrice.toFixed(2)}`;
      }

      // If this is a refund, show negative values
      const isRefund = item.price < 0;
      if (isRefund) {
        displayTotal = -displayTotal;
      }

      // Add checkbox column
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

    // Add checkbox event listeners
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

    // Add event listeners to quantity and remove buttons
    document.querySelectorAll(".quantity-btn").forEach((btn) => {
      btn.addEventListener("click", handleQuantityChange);
    });

    document.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", handleRemoveItem);
    });

    // Add click event to select rows
    document.querySelectorAll("#cart-items tr").forEach((row, index) => {
      row.addEventListener("click", (event) => {
        // Ignore clicks on buttons and checkboxes
        if (
          event.target.tagName === "BUTTON" ||
          event.target.tagName === "INPUT"
        )
          return;

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
  };
}

function initializeCartTable() {
  const headerRow = document.querySelector("#cart-table thead tr");
  if (headerRow) {
    // Check if the checkbox column already exists
    if (!headerRow.querySelector("th:first-child").textContent.trim() === "") {
      // Create a new header cell for checkboxes
      const checkboxHeader = document.createElement("th");
      checkboxHeader.textContent = ""; // Empty header for checkboxes

      // Insert it as the first column
      headerRow.insertBefore(checkboxHeader, headerRow.firstChild);

      // Update the colspan of the empty cart message
      const emptyCart = document.querySelector(".empty-cart td");
      if (emptyCart) {
        emptyCart.setAttribute("colspan", "6");
      }
    }
  }
}

// Update the updateTotals function to include discounts
function updateUpdateTotalsForDiscounts() {
  // Save the original function
  const originalUpdateTotals = updateTotals;

  // Override the updateTotals function
  updateTotals = function () {
    // Calculate subtotal with item-level discounts
    let subtotal = 0;
    let totalCost = 0;

    cart.forEach((item) => {
      const baseAmount = item.price * item.quantity;
      let itemTotal = baseAmount;

      // Apply item-level discount if any
      if (item.discount) {
        const discountPerUnit = item.discount.amount;
        const totalDiscount = discountPerUnit * item.quantity;
        itemTotal = baseAmount - totalDiscount;
      }

      subtotal += itemTotal;
      totalCost += (item.cost || 0) * item.quantity;
    });

    // Apply cart-level discount
    let discountAmount = 0;
    if (cartDiscount.type !== "none") {
      if (cartDiscount.type === "percentage") {
        discountAmount = subtotal * (cartDiscount.value / 100);
      } else {
        // fixed amount
        discountAmount = cartDiscount.value;
        // Don't allow discount larger than subtotal
        if (discountAmount > subtotal) {
          discountAmount = subtotal;
        }
      }

      // Update cart discount amount
      cartDiscount.amount = discountAmount;
    }

    // Calculate final subtotal after cart discount
    const finalSubtotal = subtotal - discountAmount;

    // Calculate tax and total
    const profit = finalSubtotal - totalCost;
    const tax = finalSubtotal * TAX_RATE;
    const total = finalSubtotal + tax;

    // Update display
    subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById(
      "discount-value"
    ).textContent = `$${discountAmount.toFixed(2)}`;
    taxEl.textContent = `$${tax.toFixed(2)}`;
    totalEl.textContent = `$${total.toFixed(2)}`;
  };
}

// Adjust completeSale function to include discounts in the invoice
function updateCompleteSaleForDiscounts() {
  // Save original function
  const originalCompleteSale = completeSale;

  // Override completeSale
  completeSale = async function () {
    if (cart.length === 0) return;

    try {
      // Process items to include discount info
      const processedItems = cart.map((item) => {
        const basePrice = item.price;
        let finalPrice = basePrice;
        let itemDiscount = 0;

        // Apply item-level discount
        if (item.discount) {
          itemDiscount = item.discount.amount * item.quantity;
          finalPrice = basePrice - item.discount.amount;
        }

        return {
          ...item,
          originalPrice: basePrice,
          finalPrice: finalPrice,
          itemDiscount: itemDiscount,
        };
      });

      const subtotal = parseFloat(subtotalEl.textContent.replace("$", ""));
      const discount = parseFloat(
        document.getElementById("discount-value").textContent.replace("$", "")
      );
      const tax = parseFloat(taxEl.textContent.replace("$", ""));
      const total = parseFloat(totalEl.textContent.replace("$", ""));

      const invoiceData = {
        items: processedItems,
        customer: customerNameEl.value || "Guest Customer",
        subtotal: subtotal,
        discount: discount,
        discountDetails: cartDiscount,
        tax: tax,
        total: total,
        date: new Date().toISOString(),
        isRefund: cart.some((item) => item.price < 0),
      };

      // Save invoice to database
      const invoiceId = await window.api.createInvoice(invoiceData);

      // Generate receipt HTML
      const receiptHtml = generateReceiptHtmlWithDiscount({
        ...invoiceData,
        id: invoiceId,
      });

      // Display receipt in modal
      receiptContainerEl.innerHTML = receiptHtml;
      receiptModal.style.display = "block";
    } catch (error) {
      console.error("Error completing sale:", error);
      alert("Failed to complete sale. Please try again.");
    }
  };
}

// Updated receipt HTML generation to include discounts
function generateReceiptHtmlWithDiscount(invoice) {
  let itemsHtml = "";

  invoice.items.forEach((item) => {
    const quantity = item.quantity;
    const originalPrice = Math.abs(item.originalPrice);
    const finalPrice = Math.abs(item.finalPrice);
    const hasDiscount = originalPrice !== finalPrice;
    const lineTotal = Math.abs(item.finalPrice * quantity);

    if (hasDiscount) {
      itemsHtml += `
        <tr>
          <td>${item.name}</td>
          <td>${quantity}</td>
          <td>
            <div>$${finalPrice.toFixed(2)}</div>
            <div><small><s>$${originalPrice.toFixed(2)}</s></small></div>
          </td>
          <td>$${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    } else {
      itemsHtml += `
        <tr>
          <td>${item.name}</td>
          <td>${quantity}</td>
          <td>$${originalPrice.toFixed(2)}</td>
          <td>$${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    }
  });

  // Transaction type label (Sale or Refund)
  const transactionType = invoice.isRefund ? "REFUND" : "SALE";

  // Discount row in footer
  let discountRow = "";
  if (invoice.discount > 0) {
    discountRow = `
      <tr>
        <td colspan="3">Discount</td>
        <td>-$${invoice.discount.toFixed(2)}</td>
      </tr>
    `;
  }

  return `
    <div class="receipt-header">
      <h2>MZLAD Billing System</h2>
      <p>123 Main Street, Anytown, USA</p>
      <p>Tel: (555) 123-4567</p>
      <h3>${transactionType}</h3>
    </div>
    
    <div class="receipt-info">
      <p><strong>Receipt #:</strong> ${invoice.id}</p>
      <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleString()}</p>
      <p><strong>Customer:</strong> ${invoice.customer}</p>
    </div>
    
    <table class="receipt-items">
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3">Subtotal</td>
          <td>$${invoice.subtotal.toFixed(2)}</td>
        </tr>
        ${discountRow}
        <tr>
          <td colspan="3">Tax (0)</td>
          <td>$${invoice.tax.toFixed(2)}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3">Total</td>
          <td>$${invoice.total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    
    <div class="receipt-footer">
      <p>Thank you for your purchase!</p>
    </div>
  `;
}
