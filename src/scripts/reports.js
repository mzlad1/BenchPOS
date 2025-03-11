// Global variables
let invoices = [];
let products = [];
// Add this to your renderer JS files (e.g., inventory.js, billing.js)

// Create or find sync status element
// let syncStatusEl = document.getElementById("sync-status");
// if (!syncStatusEl) {
//   syncStatusEl = document.createElement("div");
//   syncStatusEl.id = "sync-status";
//   syncStatusEl.classList.add("sync-status");
//   document.body.appendChild(syncStatusEl);
// }

// // Listen for sync events
// window.api.onBackgroundSyncStarted(() => {
//   syncStatusEl.textContent = "Syncing data...";
//   syncStatusEl.classList.remove("hidden", "success", "error");
//   syncStatusEl.classList.add("active");
// });

// window.api.onBackgroundSyncCompleted((data) => {
//   if (data.success) {
//     syncStatusEl.textContent = `Sync completed at ${new Date(
//       data.timestamp
//     ).toLocaleTimeString()}`;
//     syncStatusEl.classList.remove("active", "error");
//     syncStatusEl.classList.add("success");

//     // Hide after a few seconds
//     setTimeout(() => {
//       syncStatusEl.classList.add("hidden");
//     }, 3000);
//   } else {
//     syncStatusEl.textContent = "Sync failed. Will retry later.";
//     syncStatusEl.classList.remove("active", "success");
//     syncStatusEl.classList.add("error");
//   }
// });
// window.api.onBackgroundSyncStarted(() => {
//   // Show sync indicator (small spinner in corner of screen)
//   const syncIndicator =
//     document.getElementById("sync-indicator") || document.createElement("div");

//   syncIndicator.id = "sync-indicator";
//   syncIndicator.innerHTML = `
//     <div class="spinner"></div>
//     <div class="sync-text">Syncing data...</div>
//   `;

//   if (!syncIndicator.parentNode) {
//     syncIndicator.style.position = "fixed";
//     syncIndicator.style.bottom = "10px";
//     syncIndicator.style.right = "10px";
//     syncIndicator.style.background = "rgba(0,0,0,0.7)";
//     syncIndicator.style.color = "white";
//     syncIndicator.style.padding = "8px 12px";
//     syncIndicator.style.borderRadius = "4px";
//     syncIndicator.style.fontSize = "12px";
//     syncIndicator.style.zIndex = "9999";
//     document.body.appendChild(syncIndicator);
//   }
// });

// window.api.onBackgroundSyncCompleted((data) => {
//   // Update or hide the indicator when sync completes
//   const syncIndicator = document.getElementById("sync-indicator");
//   if (syncIndicator) {
//     if (data.success) {
//       syncIndicator.innerHTML = `<div class="sync-text">Sync completed ✓</div>`;
//       setTimeout(() => {
//         syncIndicator.style.opacity = "0";
//         setTimeout(() => {
//           if (syncIndicator.parentNode) {
//             syncIndicator.parentNode.removeChild(syncIndicator);
//           }
//         }, 300);
//       }, 2000);
//     } else {
//       syncIndicator.innerHTML = `<div class="sync-text">Sync failed ✗</div>`;
//     }
//   }
// });
// window.api.onBackgroundSyncProgress((data) => {
//   syncStatusEl.textContent = `Syncing ${data.collection}: ${data.processed}/${data.total}`;
// });

// Add this to billing.js, inventory.js, and reports.js

// In each page's initialization
document.addEventListener("DOMContentLoaded", () => {
  initPage();
  if (typeof window.initSyncUI === "function") {
    window.initSyncUI();
  }
});
// Initialize the page
async function initPage() {
  const hasPermission = await checkPermission();
  if (!hasPermission) return;
  // Set current date
  const today = new Date();
  document.getElementById("current-date").textContent =
    today.toLocaleDateString();

  // Update connection status
  updateConnectionStatus();

  // Load data
  await Promise.all([loadInvoices(), loadProducts()]);

  // Generate reports
  generateSalesReport();
  generateProductReport();
}

// Load invoices from database
async function loadInvoices() {
  try {
    invoices = await window.api.getInvoices();
  } catch (error) {
    console.error("Error loading invoices:", error);
    document.getElementById("sales-report").innerHTML =
      '<div class="error">Failed to load sales data. Please try again.</div>';
  }
}

// Load products from database
async function loadProducts() {
  try {
    products = await window.api.getProducts();
  } catch (error) {
    console.error("Error loading products:", error);
    document.getElementById("product-report").innerHTML =
      '<div class="error">Failed to load product data. Please try again.</div>';
  }
}

// Generate sales report
function generateSalesReport() {
  const salesReportEl = document.getElementById("sales-report");

  if (invoices.length === 0) {
    salesReportEl.innerHTML =
      '<div class="no-data">No sales data available</div>';
    return;
  }

  // Calculate total sales
  const totalSales = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const totalCost = invoices.reduce(
    (sum, invoice) => sum + (invoice.totalCost || 0),
    0
  );
  const totalProfit = invoices.reduce(
    (sum, invoice) =>
      sum + (invoice.profit || invoice.total - (invoice.totalCost || 0)),
    0
  );
  const totalItems = invoices.reduce((sum, invoice) => {
    return (
      sum + invoice.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
    );
  }, 0);

  // Group sales by date
  const salesByDate = {};

  invoices.forEach((invoice) => {
    const date = new Date(invoice.date).toLocaleDateString();

    if (!salesByDate[date]) {
      salesByDate[date] = {
        total: 0,
        invoices: 0,
      };
    }

    salesByDate[date].total += invoice.total;
    salesByDate[date].invoices += 1;
  });

  // Create sales summary
  let salesSummaryHtml = `
    <div class="report-summary">
      <div class="summary-item">
        <h3>Total Sales</h3>
        <p>${totalSales.toFixed(2)}</p>
      </div>
      <div class="summary-item">
        <h3>Total Cost</h3>
        <p>${totalCost.toFixed(2)}</p>
      </div>
      <div class="summary-item">
        <h3>Total Profit</h3>
        <p>${totalProfit.toFixed(2)}</p>
      </div>
      <div class="summary-item">
        <h3>Profit Margin</h3>
        <p>${((totalProfit / totalSales) * 100).toFixed(2)}%</p>
      </div>
    </div>
    
    <h3>Sales by Date</h3>
    <div class="table-container">
      <table class="report-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Invoices</th>
            <th>Sales</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Add rows for each date
  Object.keys(salesByDate)
    .sort()
    .forEach((date) => {
      const data = salesByDate[date];

      salesSummaryHtml += `
      <tr>
        <td>${date}</td>
        <td>${data.invoices}</td>
        <td>$${data.total.toFixed(2)}</td>
      </tr>
    `;
    });

  salesSummaryHtml += `
        </tbody>
      </table>
    </div>
  `;

  salesReportEl.innerHTML = salesSummaryHtml;
}

// Generate product report
function generateProductReport() {
  const productReportEl = document.getElementById("product-report");

  if (products.length === 0) {
    productReportEl.innerHTML =
      '<div class="no-data">No product data available</div>';
    return;
  }

  // Calculate inventory stats
  const totalProducts = products.length;
  const totalValue = products.reduce(
    (sum, product) => sum + product.price * product.stock,
    0
  );
  const totalCost = products.reduce(
    (sum, product) => sum + (product.cost || 0) * product.stock,
    0
  );
  const totalProfit = totalValue - totalCost;
  const lowStockItems = products.filter((product) => product.stock <= 5).length;

  // Create product summary
  let productSummaryHtml = `
    <div class="report-summary">
      <div class="summary-item">
        <h3>Total Products</h3>
        <p>${totalProducts}</p>
      </div>
      <div class="summary-item">
        <h3>Inventory Value</h3>
        <p>${totalValue.toFixed(2)}</p>
      </div>
      <div class="summary-item">
        <h3>Total Cost</h3>
        <p>${totalCost.toFixed(2)}</p>
      </div>
      <div class="summary-item">
        <h3>Potential Profit</h3>
        <p>${totalProfit.toFixed(2)}</p>
      </div>
    </div>
    
    <h3>Most Profitable Products</h3>
    <div class="table-container">
      <table class="report-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Cost</th>
            <th>Profit Margin</th>
            <th>Stock</th>
            <th>Potential Profit</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Sort products by profit margin and take top 5
  const mostProfitableProducts = [...products]
    .filter((product) => product.cost && product.cost > 0)
    .sort((a, b) => (b.price - b.cost) / b.cost - (a.price - a.cost) / a.cost)
    .slice(0, 5);

  // Add rows for each product
  mostProfitableProducts.forEach((product) => {
    const profit = product.price - (product.cost || 0);
    const profitMargin = ((profit / product.cost) * 100).toFixed(2);
    const totalProfit = profit * product.stock;

    productSummaryHtml += `
      <tr>
        <td>${product.name}</td>
        <td>${product.price.toFixed(2)}</td>
        <td>${(product.cost || 0).toFixed(2)}</td>
        <td>${profitMargin}%</td>
        <td>${product.stock}</td>
        <td>${totalProfit.toFixed(2)}</td>
      </tr>
    `;
  });

  productSummaryHtml += `
        </tbody>
      </table>
    </div>
    
    <h3>Low Stock Products</h3>
    <div class="table-container">
      <table class="report-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Price</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Filter products with low stock (5 or less)
  const lowStockProducts = products
    .filter((product) => product.stock <= 5)
    .sort((a, b) => a.stock - b.stock);

  if (lowStockProducts.length === 0) {
    productSummaryHtml += `
      <tr>
        <td colspan="3" class="centered">No low stock products</td>
      </tr>
    `;
  } else {
    // Add rows for each low stock product
    lowStockProducts.forEach((product) => {
      productSummaryHtml += `
        <tr>
          <td>${product.name}</td>
          <td>$${product.price.toFixed(2)}</td>
          <td class="low-stock">${product.stock}</td>
        </tr>
      `;
    });
  }

  productSummaryHtml += `
        </tbody>
      </table>
    </div>
  `;

  productReportEl.innerHTML = productSummaryHtml;
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

// Listen for online/offline events
window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);
// After the window event listeners, add:
if (window.api && typeof window.api.onOnlineStatusChanged === "function") {
  window.api.onOnlineStatusChanged((online) => {
    console.log(`Connection status changed: ${online ? "Online" : "Offline"}`);
    updateConnectionStatus();
  });
}
