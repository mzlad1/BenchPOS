function initBarcodeFeature() {
  // Create a barcode entry area
  const searchBar = document.querySelector(".search-bar");
  const barcodeForm = document.createElement("div");
  barcodeForm.className = "barcode-form";
  barcodeForm.innerHTML = `
    <h3>${window.t(
      "billing.barcode.title"
    )} <span class="shortcut-indicator">(B)</span></h3>
    <div class="barcode-input-container">
      <input type="text" id="barcode-input" placeholder="${window.t(
        "billing.barcode.placeholder"
      )}" autofocus>
      <button type="button" id="barcode-submit" class="btn primary-btn">${window.t(
        "billing.barcode.addItem"
      )}</button>
    </div>
    <div id="barcode-status"></div>
  `;

  // Insert the form before the products list
  productsListEl.parentNode.insertBefore(barcodeForm, productsListEl);

  // Get the barcode input element
  const barcodeInput = document.getElementById("barcode-input");
  const barcodeSubmit = document.getElementById("barcode-submit");

  // Set up global barcode capture that works anywhere on the page
  setupGlobalBarcodeCapture(barcodeInput);

  // Focus the barcode input on page load
  setTimeout(() => {
    if (barcodeInput) {
      barcodeInput.focus();
      console.log("Barcode input field focused on page load");
    }
  }, 500);

  // Listen for Enter key or submit button
  barcodeInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      processBarcodeInput();
      // Keep focus after processing
      setTimeout(() => barcodeInput.focus(), 10);
    }

    // Allow F11 and F12 to pass through even when focused
    if (event.key === "F11" || event.key === "F12") {
      // Pass the event to the global handler
      handleKeyboardShortcut(event);
    }
  });

  barcodeSubmit.addEventListener("click", function () {
    processBarcodeInput();
    // Refocus on the input after processing
    setTimeout(() => barcodeInput.focus(), 10);
  });

  // Add keyboard shortcut for focusing barcode input (B key)
  document.addEventListener("keydown", function (event) {
    // B key to focus the barcode input (from anywhere)
    if (
      event.key === "b" &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      // Only if not already in an input
      if (
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA"
      ) {
        event.preventDefault();
        barcodeInput.focus();
      }
    }
  });

  // Also make sure to refocus after adding an item to cart
  const originalAddToCart = addToCart;
  addToCart = function (product) {
    // Call the original function
    originalAddToCart(product);

    // Refocus the barcode input after adding to cart
    setTimeout(() => {
      if (barcodeInput) barcodeInput.focus();
    }, 100);
  };

  // Add CSS for the barcode form
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    .barcode-form {
      margin-bottom: 20px;
      padding: 15px;
      background-color: #f8f8f8;
      border-radius: 8px;
      border: 1px solid #ddd;
    }
    
    .barcode-form h3 {
      margin-top: 0;
      margin-bottom: 10px;
      color: var(--primary-color);
      font-size: 16px;
    }
    
    .barcode-input-container {
      display: flex;
      gap: 10px;
    }
    
    #barcode-input {
      flex: 1;
      padding: 10px;
      border: 2px solid var(--primary-color);
      border-radius: 4px;
      font-size: 16px;
      background-color: #fff;
    }
    
    #barcode-input:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(var(--primary-rgb, 0, 123, 255), 0.25);
    }
    
    #barcode-status {
      margin-top: 10px;
      font-weight: bold;
    }
    
    /* Highlight the barcode input when active to make it obvious where the focus is */
    #barcode-input:focus {
      background-color: #fff8e0;
    }

    /* Style for the barcode capturing notification */
    .barcode-capture {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 30px;
      z-index: 1000;
      display: none;
      font-weight: bold;
      animation: fadeInOut 0.5s ease;
    }

    @keyframes fadeInOut {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
  `;
  document.head.appendChild(styleElement);
}

// Set up global barcode capture that works anywhere on the page
// Set up global barcode capture that works anywhere on the page
function setupGlobalBarcodeCapture(barcodeInput) {
  // Create a hidden input that will act as our "catch-all" for barcode input
  const catchAllInput = document.createElement("input");
  catchAllInput.type = "text";
  catchAllInput.style.position = "absolute";
  catchAllInput.style.top = "-100px"; // Hide it off-screen
  catchAllInput.style.left = "-100px";
  catchAllInput.style.opacity = "0";
  document.body.appendChild(catchAllInput);

  // The hidden input always has focus unless specifically interacting with another input
  catchAllInput.focus();

  // When anything other than form controls gets clicked, refocus the hidden input
  document.addEventListener("click", (event) => {
    if (
      event.target.tagName !== "INPUT" &&
      event.target.tagName !== "TEXTAREA" &&
      event.target.tagName !== "SELECT" &&
      event.target.tagName !== "BUTTON"
    ) {
      setTimeout(() => catchAllInput.focus(), 10);
    }
  });

  // Create notification element
  const captureNotification = document.createElement("div");
  captureNotification.className = "barcode-capture";
  captureNotification.textContent = window.t("billing.barcode.scanning");
  captureNotification.style.display = "none";
  document.body.appendChild(captureNotification);

  // Variables to track barcode scanner state
  let lastKeyTime = 0;
  let scanInProgress = false;
  let scanTimeout;

  // Monitor input on the hidden field
  catchAllInput.addEventListener("input", () => {
    const currentTime = new Date().getTime();
    const timeSinceLastKey = currentTime - lastKeyTime;
    lastKeyTime = currentTime;

    // Fast input (less than 50ms) is likely from a scanner
    if (timeSinceLastKey < 50) {
      if (!scanInProgress) {
        // Start of scan detected!
        scanInProgress = true;
        captureNotification.style.display = "block";
      }

      // Extend the timeout
      clearTimeout(scanTimeout);
      scanTimeout = setTimeout(finishScan, 200);
    }
  });

  // Also handle keypresses separately to catch Enter key
  catchAllInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && scanInProgress) {
      event.preventDefault();
      clearTimeout(scanTimeout);
      finishScan();
    }
  });

  // Handle scan completion
  function finishScan() {
    if (!scanInProgress) return;

    scanInProgress = false;
    captureNotification.style.display = "none";

    // Get the scanned barcode from our hidden input
    const barcode = catchAllInput.value.trim();

    if (barcode.length >= 3) {
      // Minimum valid barcode length
      // Transfer the value to the visible barcode input
      barcodeInput.value = barcode;

      // Focus the visible input briefly
      barcodeInput.focus();

      // Process the barcode
      processBarcodeInput();

      // Clear and refocus the hidden input
      catchAllInput.value = "";
      setTimeout(() => catchAllInput.focus(), 100);
    } else {
      // Not a valid barcode, just clear the catchall
      catchAllInput.value = "";
    }
  }

  // When user explicitly focuses the visible barcode input
  barcodeInput.addEventListener("focus", () => {
    // Allow normal usage of the visible input when focused
  });

  barcodeInput.addEventListener("blur", () => {
    // When leaving the visible input, refocus our hidden catcher
    setTimeout(() => catchAllInput.focus(), 100);
  });

  // Handle the B keyboard shortcut
  document.addEventListener("keydown", (event) => {
    if (
      event.key.toLowerCase() === "b" &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      // Only if not already in an input field
      if (
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA"
      ) {
        event.preventDefault();
        barcodeInput.focus();
      }
    }
  });

  // Initialize by focusing the hidden input
  setTimeout(() => catchAllInput.focus(), 100);
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
// Process barcode input
// Process barcode input
function processBarcodeInput() {
  const barcodeInput = document.getElementById("barcode-input");
  const barcodeStatus = document.getElementById("barcode-status");
  const barcode = barcodeInput.value.trim();

  // CHECK FOR VIEW-ONLY MODE - Add this at the beginning of the function
  if (isViewingInvoice && !isEditingInvoice) {
    barcodeStatus.textContent = window.t("billing.barcode.editFirst");
    barcodeStatus.style.color = "red";
    return; // Exit the function, don't process barcode
  }

  if (!barcode) {
    barcodeStatus.textContent = window.t("billing.barcode.enterBarcode");
    barcodeStatus.style.color = "red";
    return;
  }

  // Try to find matching product
  const exactMatch = products.find(
    (p) => p.id === barcode || p.sku === barcode
  );

  if (exactMatch) {
    // Check if product is in stock
    if (exactMatch.stock <= 0) {
      // Show error for out of stock
      barcodeStatus.textContent = window.t("billing.barcode.outOfStock", {
        name: exactMatch.name,
      });
      barcodeStatus.style.color = "red";

      // Show toast notification
      showToastNotification(
        window.t("notifications.productOutOfStock", { name: exactMatch.name }),
        true
      );

      return;
    }

    // Check if adding would exceed stock
    const existingItem = cart.find((item) => item.id === exactMatch.id);
    const currentQuantity = existingItem ? existingItem.quantity : 0;

    if (currentQuantity + 1 > exactMatch.stock) {
      // Show error for exceeding stock
      barcodeStatus.textContent = window.t("billing.barcode.limitedStock", {
        stock: exactMatch.stock,
        name: exactMatch.name,
      });
      barcodeStatus.style.color = "red";

      // Show toast notification
      showToastNotification(
        window.t("notifications.limitedStock", {
          stock: exactMatch.stock,
          name: exactMatch.name,
        }),
        true
      );
      return;
    }

    // Play a success beep (optional)
    try {
      const beepSound = new Audio("../Audio/beep.mp3");
      beepSound.volume = 0.3;
      beepSound.play().catch((e) => console.log("Could not play sound:", e));
    } catch (e) {
      console.error("Error playing sound:", e);
    }

    // Add product to cart
    addToCart(exactMatch);

    // Success message
    barcodeStatus.textContent = window.t("billing.barcode.added", {
      name: exactMatch.name,
    });
    barcodeStatus.style.color = "green";

    // Clear input for next scan
    barcodeInput.value = "";
  } else {
    // Filter products to see if we have partial matches
    const matchingProducts = products.filter(
      (p) =>
        (p.id && p.id.includes(barcode)) || (p.sku && p.sku.includes(barcode))
    );

    if (matchingProducts.length > 0) {
      // NEW BEHAVIOR: Add the first matching product to cart instead of just displaying matches
      const firstMatch = matchingProducts[0];

      // Check if in stock
      if (firstMatch.stock <= 0) {
        // Show error for out of stock
        barcodeStatus.textContent = window.t("billing.barcode.outOfStock", {
          name: exactMatch.name,
        });
        barcodeStatus.style.color = "red";

        // Show toast notification
        showToastNotification(
          window.t("notifications.productOutOfStock", {
            name: exactMatch.name,
          }),
          true
        );

        return;
      }

      // Check if adding would exceed stock
      const existingItem = cart.find((item) => item.id === firstMatch.id);
      const currentQuantity = existingItem ? existingItem.quantity : 0;

      if (currentQuantity + 1 > firstMatch.stock) {
        // Show error for exceeding stock
        barcodeStatus.textContent = window.t("billing.barcode.limitedStock", {
          stock: exactMatch.stock,
          name: exactMatch.name,
        });
        barcodeStatus.style.color = "red";

        // Show toast notification
        showToastNotification(
          window.t("notifications.limitedStock", {
            stock: exactMatch.stock,
            name: exactMatch.name,
          }),
          true
        );

        return;
      }

      // Play a success beep (optional)
      try {
        const beepSound = new Audio("../Audio/beep.mp3");
        beepSound.volume = 0.3;
        beepSound.play().catch((e) => console.log("Could not play sound:", e));
      } catch (e) {
        console.error("Error playing sound:", e);
      }

      // Add the first matching product to cart
      addToCart(firstMatch);

      // Success message with additional info for partial match
      barcodeStatus.textContent = window.t("billing.barcode.addedBestMatch", {
        name: firstMatch.name,
      });
      barcodeStatus.style.color = "green";

      // Display matching products in case user wants to see alternatives
      renderProducts(matchingProducts);

      // Clear input for next scan
      barcodeInput.value = "";
    } else {
      // No matches found
      barcodeStatus.textContent = window.t("billing.barcode.noProductFound");
      barcodeStatus.style.color = "red";

      // Show all products
      renderProducts(products);
    }
  }

  // Refocus input for next scan
  barcodeInput.focus();
}
