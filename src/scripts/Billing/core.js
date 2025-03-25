// Global variables
let products = [];
let cart = [];
const TAX_RATE = 0;
let currentPage = 1;
const productsPerPage = 1; // Adjust this number based on your UI

// DOM Elements
const productsListEl = document.getElementById("products-list");
const productSearchEl = document.getElementById("product-search");
const cartItemsEl = document.getElementById("cart-items");
const subtotalEl = document.getElementById("subtotal");
const taxEl = document.getElementById("tax");
const totalEl = document.getElementById("total");
const invoiceDateEl = document.getElementById("invoice-date");
const customerNameEl = document.getElementById("customer-name");
const completeSaleBtn = document.getElementById("complete-sale");
const clearInvoiceBtn = document.getElementById("clear-invoice");

// Modal elements
const receiptModal = document.getElementById("receipt-modal");
const closeModalBtn = document.querySelector(".close");
const receiptContainerEl = document.getElementById("receipt-container");
const printReceiptBtn = document.getElementById("print-receipt");
const emailReceiptBtn = document.getElementById("email-receipt");
const newSaleBtn = document.getElementById("new-sale");
function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        return 'Invalid date';
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
}
// Initialize the page
async function initPage() {
    const hasPermission = await checkPermission();
    if (!hasPermission) return;
    // Set current date
    const today = new Date();
    invoiceDateEl.textContent = formatDate(today);

    document.getElementById("current-date").textContent =
        today.toLocaleDateString();
    // Update connection status
    updateConnectionStatus();

    // Load products
    await loadProducts();

    // Add event listeners
    productSearchEl.addEventListener("input", filterProducts);
    clearInvoiceBtn.addEventListener("click", clearCart);
    completeSaleBtn.addEventListener("click", completeSale);

    // Modal event listeners
    closeModalBtn.addEventListener("click", () => {
        receiptModal.style.display = "none";
    });

    printReceiptBtn.addEventListener("click", printReceipt);
    emailReceiptBtn.addEventListener("click", emailReceipt);
    newSaleBtn.addEventListener("click", () => {
        receiptModal.style.display = "none";
        clearCart();

        // Update navigation status
        isViewingInvoice = false;
        isEditingInvoice = false;

        // Remove invoice view indicator if it exists
        const indicator = document.getElementById("invoice-view-indicator");
        if (indicator) {
            indicator.remove();
        }
    });

    // Close modal when clicking outside
    window.addEventListener("click", (event) => {
        if (event.target === receiptModal) {
            receiptModal.style.display = "none";
        }
    });
}

// Add this to billing.js, inventory.js, and reports.js
async function handleLogout() {
    try {
        await window.api.logoutUser();
        window.location.href = "login.html"; // Same directory path
    } catch (error) {
        console.error("Logout error:", error);
    }
}

// Add this to billing.js, inventory.js, reports.js files
async function checkPermission() {
    try {
        const user = await window.api.getCurrentUser();
        if (!user) {
            // Not logged in - redirect to login
            window.location.href = "login.html";
            return false;
        }

        const userNameElement = document.getElementById("current-user-name");
        if (userNameElement) {
            userNameElement.textContent = user.name || "User";
        }
        // Check role-based permissions
        if (window.location.pathname.includes("billing.html")) {
            // All roles can access billing (new sales)
            return true;
        } else if (window.location.pathname.includes("inventory.html")) {
            // Only managers and admins can access inventory
            if (user.role === "cashier") {
                alert("You don't have permission to access the inventory page.");
                window.location.href = "billing.html"; // Redirect cashiers to billing
                return false;
            }
        } else if (window.location.pathname.includes("reports.html")) {
            // Only admins can access reports
            if (user.role !== "admin") {
                alert("You don't have permission to access the reports page.");
                window.location.href = "billing.html"; // Redirect to billing
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error("Permission check error:", error);
        window.location.href = "login.html";
        return false;
    }
}

// Update connection status
async function updateConnectionStatus() {
    const indicator = document.getElementById("connection-indicator");
    const statusText = document.getElementById("connection-text");

    try {
        // Use the API if available
        let isOnline = navigator.onLine; // Default fallback
        if (window.api && typeof window.api.getOnlineStatus === "function") {
            isOnline = await window.api.getOnlineStatus();
        }

        if (isOnline) {
            indicator.classList.remove("offline");
            indicator.classList.add("online");
            statusText.textContent = "Online Mode";
        } else {
            indicator.classList.remove("online");
            indicator.classList.add("offline");
            statusText.textContent = "Offline Mode";
        }
    } catch (error) {
        console.error("Error checking online status:", error);
        // Fallback to offline if there's an error
        indicator.classList.remove("online");
        indicator.classList.add("offline");
        statusText.textContent = "Offline Mode";
    }
}