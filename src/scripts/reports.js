// reports.js - Advanced Reports Implementation

// Global variables for data storage
let invoices = [];
let products = [];
let filteredInvoices = [];
let dateRange = {
  from: null,
  to: null,
};
let salesChart = null;
let currentChartView = "daily"; // Tracks the current chart view (daily, weekly, monthly)

// Use the global translation function instead of redefining it
const getTranslation = function(key, params = {}) {
  return window.t ? window.t(key, params) : key;
};

// Initialize the page
document.addEventListener("DOMContentLoaded", async function () {
  try {
    console.log("Initializing reports page...");

    // First validate user access
    const user = await window.api.getCurrentUser();
    console.log("Current user:", user);
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    // Check role-based access
    if (user.role !== "admin") {
      alert(getTranslation("reports.messages.permissionDenied"));
      window.location.href = "../index.html";
      return;
    }

    // Initialize layout with current page identifier
    if (window.LayoutManager) {
      await window.LayoutManager.init("reports");
      console.log("Layout manager initialized");
    } else {
      console.warn("Layout manager not available");
    }

    // Check if RTL is enabled
    const isRTL = (localStorage.getItem('language') || 'en') === 'ar';
    console.log("Is RTL layout:", isRTL);
    if (isRTL) {
      // Force RTL for entire page if not already set
      document.documentElement.dir = 'rtl';
      document.body.classList.add('rtl-layout');
      console.log("RTL classes applied to document");
    }

    // Initialize i18n if available
    if (window.i18n) {
      const language = localStorage.getItem("language") || "en";
      console.log("Initializing i18n with language:", language);

      // Initialize with current language and wait for it to complete
      await window.i18n.init(language).then(() => {
        // Apply translations to the page
        window.i18n.updatePageContent();
        console.log("Translations applied for language:", language);
      }).catch(error => {
        console.error("Error initializing i18n:", error);
      });
    } else {
      console.warn("i18n module not available");
    }

    // Initialize sync UI (if exists)
    if (typeof window.initSyncUI === "function") {
      window.initSyncUI();
    }

    // Set up event listeners for tab switching
    setupTabNavigation();

    // Set up date filters
    setupDateFilters();

    // Initialize our reports data
    await loadInitialData();

    console.log("Reports page initialized successfully");
  } catch (error) {
    console.error("Error initializing reports page:", error);
    showError(getTranslation("reports.messages.initError"));
  }
});

// Load all data required for reports
async function loadInitialData() {
  try {
    console.log("Loading initial data...");
    showLoading();

    // Load invoices and products in parallel
    const [allInvoices, allProducts] = await Promise.all([
      window.api.getInvoices(),
      window.api.getProducts(),
    ]);

    // Store data in global variables
    invoices = allInvoices || [];
    products = allProducts || [];

    console.log(`Loaded ${invoices.length} invoices and ${products.length} products`);

    // Update inventory badge in sidebar if LayoutManager is available
    if (window.LayoutManager) {
      const lowStockCount = products.filter(
          (product) => product.stock <= 5
      ).length;
      window.LayoutManager.updateInventoryBadge(lowStockCount);
    }

    // Calculate costs and profits for all invoices
    calculateInvoiceCosts();

    // Set default date range (current month)
    const today = new Date();
    dateRange.from = new Date(today.getFullYear(), today.getMonth(), 1);
    dateRange.to = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59
    );

    // Update date inputs
    const dateFrom = document.getElementById("date-from");
    const dateTo = document.getElementById("date-to");

    if (dateFrom && dateTo) {
      dateFrom.valueAsDate = dateRange.from;
      dateTo.valueAsDate = dateRange.to;
    }

    // Filter invoices for current date range
    applyDateFilter();
  } catch (error) {
    console.error("Error loading initial data:", error);
    showError(getTranslation("reports.messages.dataLoadError"));
  }
}

// Apply date filter to invoices
function applyDateFilter() {
  console.log("Applying date filter:", dateRange.from, "to", dateRange.to);

  // Filter invoices by date range
  filteredInvoices = invoices.filter((invoice) => {
    const invoiceDate = new Date(invoice.date || invoice.createdAt);
    return invoiceDate >= dateRange.from && invoiceDate <= dateRange.to;
  });

  console.log(`Filtered invoices: ${filteredInvoices.length} of ${invoices.length}`);

  // Generate all reports with filtered data
  generateAllReports();

  // Update the chart with the new data
  if (salesChart) {
    updateChart();
  }
}

// Generate all report sections
function generateAllReports() {
  try {
    console.log("Generating all reports");

    // Generate summary stats
    generateSalesSummary();

    // Generate detailed reports
    generateDailySalesReport();
    generateProductSalesReport();
    generateCategorySalesReport();
    generateInventoryReport();

    // Create sales chart
    createSalesChart();
  } catch (error) {
    console.error("Error generating reports:", error);
    showError(getTranslation("reports.messages.reportGenerationError"));
  }
}

// Setup tab navigation
function setupTabNavigation() {
  const tabs = document.querySelectorAll(".report-tab");
  const tabContents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs and contents
      tabs.forEach((t) => t.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      // Add active class to clicked tab
      tab.classList.add("active");

      // Show corresponding content
      const tabContentId = tab.dataset.tab;
      const content = document.getElementById(tabContentId);
      if (content) {
        content.classList.add("active");
      }
    });
  });

  console.log("Tab navigation setup complete");
}

// Setup date filter controls
function setupDateFilters() {
  const periodSelect = document.getElementById("report-period");
  const customDateRange = document.getElementById("custom-date-range");
  const dateFrom = document.getElementById("date-from");
  const dateTo = document.getElementById("date-to");

  if (!periodSelect || !customDateRange || !dateFrom || !dateTo) {
    console.error("Date filter elements not found");
    return;
  }

  // Show/hide custom date range based on selection
  periodSelect.addEventListener("change", function () {
    if (this.value === "custom") {
      customDateRange.style.display = "flex";
    } else {
      customDateRange.style.display = "none";

      // Set date range based on selection
      const dates = getDateRangeFromPeriod(this.value);
      if (dates) {
        dateFrom.valueAsDate = dates.from;
        dateTo.valueAsDate = dates.to;
      }
    }
  });

  // Apply filters button
  document
      .getElementById("apply-filters")
      .addEventListener("click", function () {
        // Update date range from inputs
        const from = dateFrom.valueAsDate;
        const to = dateTo.valueAsDate;

        if (!from || !to) {
          alert(getTranslation("reports.messages.invalidDates"));
          return;
        }

        if (from > to) {
          alert(getTranslation("reports.messages.startDateBeforeEnd"));
          return;
        }

        // Set global date range
        dateRange.from = new Date(from);
        dateRange.to = new Date(to);
        // Set time to end of day for the end date
        dateRange.to.setHours(23, 59, 59);

        // Apply filter
        applyDateFilter();
      });

  // Export button
  document
      .getElementById("export-report")
      .addEventListener("click", function () {
        exportReportData();
      });

  // Print button
  document
      .getElementById("print-report")
      .addEventListener("click", function () {
        window.print();
      });

  console.log("Date filters setup complete");
}

// Helper function to get date range from period selection
function getDateRangeFromPeriod(period) {
  const today = new Date();
  let from, to;

  switch (period) {
    case "today":
      from = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      to = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          23,
          59,
          59
      );
      break;

    case "yesterday":
      from = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - 1
      );
      to = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - 1,
          23,
          59,
          59
      );
      break;

    case "this-week":
      // Start of week (Sunday)
      const dayOfWeek = today.getDay();
      from = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - dayOfWeek
      );
      to = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + (6 - dayOfWeek),
          23,
          59,
          59
      );
      break;

    case "last-week":
      const lastWeekDay = today.getDay();
      from = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - lastWeekDay - 7
      );
      to = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - lastWeekDay - 1,
          23,
          59,
          59
      );
      break;

    case "this-month":
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      to = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      break;

    case "last-month":
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
      break;

    case "this-year":
      from = new Date(today.getFullYear(), 0, 1);
      to = new Date(today.getFullYear(), 11, 31, 23, 59, 59);
      break;

    default:
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      to = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
  }

  return { from, to };
}

// Show loading state in all report sections
function showLoading() {
  const loadingHTML = `<tr><td colspan="7" class="loading">${getTranslation("reports.messages.loading")}</td></tr>`;
  const elements = [
    "daily-sales-table",
    "product-sales-table",
    "category-sales-table",
    "top-selling-table",
    "low-stock-table",
  ];

  elements.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = loadingHTML;
    }
  });
}

// Show error message
function showError(message) {
  const errorHTML = `<tr><td colspan="7" class="error">${message}</td></tr>`;
  const elements = [
    "daily-sales-table",
    "product-sales-table",
    "category-sales-table",
    "top-selling-table",
    "low-stock-table",
  ];

  elements.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = errorHTML;
    }
  });
}

// Generate sales summary statistics
function generateSalesSummary() {
  console.log("Generating sales summary");

  // Current period totals
  const totalSales = filteredInvoices.reduce(
      (sum, invoice) => sum + (invoice.total || 0),
      0
  );
  const totalTransactions = filteredInvoices.length;
  const averageSale =
      totalTransactions > 0 ? totalSales / totalTransactions : 0;
  const totalProfit = filteredInvoices.reduce((sum, invoice) => {
    const profit = invoice.profit || invoice.total - (invoice.totalCost || 0);
    return sum + profit;
  }, 0);

  // Calculate previous period for comparison
  const periodLength = dateRange.to - dateRange.from;
  const prevPeriodFrom = new Date(dateRange.from.getTime() - periodLength);
  const prevPeriodTo = new Date(dateRange.to.getTime() - periodLength);

  // Get previous period invoices
  const prevPeriodInvoices = invoices.filter((invoice) => {
    const invoiceDate = new Date(invoice.date || invoice.createdAt);
    return invoiceDate >= prevPeriodFrom && invoiceDate <= prevPeriodTo;
  });

  // Previous period totals
  const prevTotalSales = prevPeriodInvoices.reduce(
      (sum, invoice) => sum + (invoice.total || 0),
      0
  );
  const prevTotalTransactions = prevPeriodInvoices.length;
  const prevAverageSale =
      prevTotalTransactions > 0 ? prevTotalSales / prevTotalTransactions : 0;
  const prevTotalProfit = prevPeriodInvoices.reduce((sum, invoice) => {
    const profit = invoice.profit || invoice.total - (invoice.totalCost || 0);
    return sum + profit;
  }, 0);

  // Calculate trends
  const salesTrend =
      prevTotalSales > 0
          ? ((totalSales - prevTotalSales) / prevTotalSales) * 100
          : 0;
  const transactionsTrend =
      prevTotalTransactions > 0
          ? ((totalTransactions - prevTotalTransactions) / prevTotalTransactions) *
          100
          : 0;
  const averageTrend =
      prevAverageSale > 0
          ? ((averageSale - prevAverageSale) / prevAverageSale) * 100
          : 0;
  const profitTrend =
      prevTotalProfit > 0
          ? ((totalProfit - prevTotalProfit) / prevTotalProfit) * 100
          : 0;

  // Update UI
  document.getElementById("total-sales").textContent = `$${totalSales.toFixed(
      2
  )}`;
  document.getElementById("total-transactions").textContent = totalTransactions;
  document.getElementById("average-sale").textContent = `$${averageSale.toFixed(
      2
  )}`;
  document.getElementById("total-profit").textContent = `$${totalProfit.toFixed(
      2
  )}`;

  // Update trends with formatting
  const formatTrend = (trend, element) => {
    const el = document.getElementById(element);
    if (!el) return;

    const vsPeriodText = getTranslation("reports.summary.vsPreviousPeriod");

    if (trend > 0) {
      el.className = "trend-up";
      el.innerHTML = `+${trend.toFixed(1)}% <span data-i18n="reports.summary.vsPreviousPeriod">${vsPeriodText}</span>`;
    } else if (trend < 0) {
      el.className = "trend-down";
      el.innerHTML = `${trend.toFixed(1)}% <span data-i18n="reports.summary.vsPreviousPeriod">${vsPeriodText}</span>`;
    } else {
      el.className = "";
      el.innerHTML = `0% <span data-i18n="reports.summary.vsPreviousPeriod">${vsPeriodText}</span>`;
    }
  };

  formatTrend(salesTrend, "sales-trend");
  formatTrend(transactionsTrend, "transactions-trend");
  formatTrend(averageTrend, "average-trend");
  formatTrend(profitTrend, "profit-trend");
}

// Generate daily sales report
function generateDailySalesReport() {
  const tableElement = document.getElementById("daily-sales-table");
  if (!tableElement) return;

  console.log("Generating daily sales report");

  // Check if we're using RTL
  const isRTL = (localStorage.getItem('language') || 'en') === 'ar';

  if (filteredInvoices.length === 0) {
    tableElement.innerHTML =
        `<tr><td colspan="7" class="centered">${getTranslation("reports.messages.noSalesData")}</td></tr>`;
    return;
  }

  // Group sales by date
  const salesByDate = {};

  filteredInvoices.forEach((invoice) => {
    const date = new Date(invoice.date || invoice.createdAt);
    // Use YYYY-MM-DD format as the key for proper sorting
    const dateKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const formattedDate = formatDate(date); // Use our custom formatter

    if (!salesByDate[dateKey]) {
      salesByDate[dateKey] = {
        date: date,
        dateStr: formattedDate, // Store the formatted date
        transactions: 0,
        itemsSold: 0,
        sales: 0,
        cost: 0,
        profit: 0,
      };
    }

    // Sum values
    salesByDate[dateKey].transactions += 1;
    salesByDate[dateKey].itemsSold += invoice.items.reduce(
        (sum, item) => sum + item.quantity,
        0
    );
    salesByDate[dateKey].sales += invoice.total || 0;
    salesByDate[dateKey].cost += invoice.totalCost || 0;

    // Calculate profit if not already available
    const profit = invoice.profit || invoice.total - (invoice.totalCost || 0);
    salesByDate[dateKey].profit += profit;
  });

  // Convert to array and sort by date
  const salesData = Object.values(salesByDate).sort((a, b) => a.date - b.date);

  // Generate table rows
  let tableHTML = "";

  salesData.forEach((day) => {
    const margin = day.sales > 0 ? (day.profit / day.sales) * 100 : 0;

    tableHTML += `
      <tr>
        <td>${day.dateStr}</td>
        <td>${day.transactions}</td>
        <td>${day.itemsSold}</td>
        <td>$${day.sales.toFixed(2)}</td>
        <td>$${day.cost.toFixed(2)}</td>
        <td>$${day.profit.toFixed(2)}</td>
        <td>${margin.toFixed(2)}%</td>
      </tr>
    `;
  });

  // Add totals row
  const totalTransactions = salesData.reduce(
      (sum, day) => sum + day.transactions,
      0
  );
  const totalItems = salesData.reduce((sum, day) => sum + day.itemsSold, 0);
  const totalSales = salesData.reduce((sum, day) => sum + day.sales, 0);
  const totalCost = salesData.reduce((sum, day) => sum + day.cost, 0);
  const totalProfit = salesData.reduce((sum, day) => sum + day.profit, 0);
  const totalMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  tableHTML += `
    <tr style="font-weight: bold; background-color: var(--base-200);">
      <td>${getTranslation("reports.messages.totalLabel")}</td>
      <td>${totalTransactions}</td>
      <td>${totalItems}</td>
      <td>$${totalSales.toFixed(2)}</td>
      <td>$${totalCost.toFixed(2)}</td>
      <td>$${totalProfit.toFixed(2)}</td>
      <td>${totalMargin.toFixed(2)}%</td>
    </tr>
  `;

  // Update table with RTL attribute if needed
  tableElement.innerHTML = tableHTML;

  // Set RTL attributes if in Arabic
  if (isRTL) {
    tableElement.setAttribute('dir', 'rtl');
  }
}

// Generate product sales report
function generateProductSalesReport() {
  const tableElement = document.getElementById("product-sales-table");
  if (!tableElement) return;

  console.log("Generating product sales report");

  // Check if we're using RTL
  const isRTL = (localStorage.getItem('language') || 'en') === 'ar';

  if (filteredInvoices.length === 0) {
    tableElement.innerHTML =
        `<tr><td colspan="7" class="centered">${getTranslation("reports.messages.noSalesData")}</td></tr>`;
    return;
  }

  // Create a product map for quick lookups
  const productMap = {};
  products.forEach((product) => {
    productMap[product.id] = product;
  });

  // Aggregate sales by product
  const productSales = {};

  filteredInvoices.forEach((invoice) => {
    invoice.items.forEach((item) => {
      const productId = item.id;

      if (!productSales[productId]) {
        const product = productMap[productId] || {
          name: item.name,
          sku: item.sku || "N/A",
          category: item.category || "Uncategorized",
        };

        productSales[productId] = {
          id: productId,
          name: product.name || item.name,
          sku: product.sku || item.sku || "N/A",
          category: product.category || item.category || "Uncategorized",
          quantity: 0,
          revenue: 0,
          profit: 0,
        };
      }

      // Add item data
      productSales[productId].quantity += item.quantity;
      const itemTotal = item.price * item.quantity;
      productSales[productId].revenue += itemTotal;

      // Calculate profit if cost is available
      const itemCost =
          (item.cost ||
              (productMap[productId] ? productMap[productId].cost : 0)) *
          item.quantity;
      const itemProfit = itemTotal - itemCost;
      productSales[productId].profit += itemProfit;
    });
  });

  // Convert to array and sort by revenue (highest first)
  const productData = Object.values(productSales).sort(
      (a, b) => b.revenue - a.revenue
  );

  // Generate table rows
  let tableHTML = "";

  productData.forEach((product) => {
    const margin =
        product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;

    tableHTML += `
      <tr>
        <td>${product.name}</td>
        <td>${product.sku}</td>
        <td>${product.category}</td>
        <td>${product.quantity}</td>
        <td>$${product.revenue.toFixed(2)}</td>
        <td>$${product.profit.toFixed(2)}</td>
        <td>${margin.toFixed(2)}%</td>
      </tr>
    `;
  });

  // Add totals row
  const totalQuantity = productData.reduce(
      (sum, product) => sum + product.quantity,
      0
  );
  const totalRevenue = productData.reduce(
      (sum, product) => sum + product.revenue,
      0
  );
  const totalProfit = productData.reduce(
      (sum, product) => sum + product.profit,
      0
  );
  const totalMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  tableHTML += `
    <tr style="font-weight: bold; background-color: var(--base-200);">
      <td colspan="3">${getTranslation("reports.messages.totalLabel")}</td>
      <td>${totalQuantity}</td>
      <td>$${totalRevenue.toFixed(2)}</td>
      <td>$${totalProfit.toFixed(2)}</td>
      <td>${totalMargin.toFixed(2)}%</td>
    </tr>
  `;

  // Update table
  tableElement.innerHTML = tableHTML;

  // Set RTL attributes if in Arabic
  if (isRTL) {
    tableElement.setAttribute('dir', 'rtl');
  }
}

// Generate category sales report
function generateCategorySalesReport() {
  const tableElement = document.getElementById("category-sales-table");
  if (!tableElement) return;

  console.log("Generating category sales report");

  // Check if we're using RTL
  const isRTL = (localStorage.getItem('language') || 'en') === 'ar';

  if (filteredInvoices.length === 0) {
    tableElement.innerHTML =
        `<tr><td colspan="5" class="centered">${getTranslation("reports.messages.noSalesData")}</td></tr>`;
    return;
  }

  // Aggregate sales by category
  const categorySales = {};

  filteredInvoices.forEach((invoice) => {
    invoice.items.forEach((item) => {
      const category = item.category || "Uncategorized";

      if (!categorySales[category]) {
        categorySales[category] = {
          category,
          quantity: 0,
          revenue: 0,
          profit: 0,
        };
      }

      // Add item data
      categorySales[category].quantity += item.quantity;
      const itemTotal = item.price * item.quantity;
      categorySales[category].revenue += itemTotal;

      // Calculate profit if cost is available
      const itemCost = (item.cost || 0) * item.quantity;
      const itemProfit = itemTotal - itemCost;
      categorySales[category].profit += itemProfit;
    });
  });

  // Convert to array and sort by revenue (highest first)
  const categoryData = Object.values(categorySales).sort(
      (a, b) => b.revenue - a.revenue
  );

  // Generate table rows
  let tableHTML = "";

  categoryData.forEach((category) => {
    const margin =
        category.revenue > 0 ? (category.profit / category.revenue) * 100 : 0;

    tableHTML += `
      <tr>
        <td>${category.category}</td>
        <td>${category.quantity}</td>
        <td>$${category.revenue.toFixed(2)}</td>
        <td>$${category.profit.toFixed(2)}</td>
        <td>${margin.toFixed(2)}%</td>
      </tr>
    `;
  });

  // Add totals row
  const totalQuantity = categoryData.reduce(
      (sum, category) => sum + category.quantity,
      0
  );
  const totalRevenue = categoryData.reduce(
      (sum, category) => sum + category.revenue,
      0
  );
  const totalProfit = categoryData.reduce(
      (sum, category) => sum + category.profit,
      0
  );
  const totalMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  tableHTML += `
    <tr style="font-weight: bold; background-color: var(--base-200);">
      <td>${getTranslation("reports.messages.totalLabel")}</td>
      <td>${totalQuantity}</td>
      <td>$${totalRevenue.toFixed(2)}</td>
      <td>$${totalProfit.toFixed(2)}</td>
      <td>${totalMargin.toFixed(2)}%</td>
    </tr>
  `;

  // Update table
  tableElement.innerHTML = tableHTML;

  // Set RTL attributes if in Arabic
  if (isRTL) {
    tableElement.setAttribute('dir', 'rtl');
  }
}

// Generate inventory report
function generateInventoryReport() {
  console.log("Generating inventory report");

  // Check if we're using RTL
  const isRTL = (localStorage.getItem('language') || 'en') === 'ar';

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
  const lowStockItems = products.filter((product) => product.stock <= 5).length;

  // Update inventory summary
  document.getElementById("total-products").textContent = totalProducts;
  document.getElementById(
      "inventory-value"
  ).textContent = `$${totalValue.toFixed(2)}`;
  document.getElementById("inventory-cost").textContent = `$${totalCost.toFixed(
      2
  )}`;
  document.getElementById("low-stock-count").textContent = lowStockItems;

  // Calculate product sales quantities
  const productSales = {};

  filteredInvoices.forEach((invoice) => {
    invoice.items.forEach((item) => {
      const productId = item.id;

      if (!productSales[productId]) {
        productSales[productId] = {
          id: productId,
          name: item.name,
          quantity: 0,
          revenue: 0,
        };
      }

      productSales[productId].quantity += item.quantity;
      productSales[productId].revenue += item.price * item.quantity;
    });
  });

  // Generate top selling products table
  const topSellingTable = document.getElementById("top-selling-table");
  if (topSellingTable) {
    let topSellingHTML = "";

    // Convert to array and sort by quantity sold (highest first)
    const topProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5); // Top 5

    if (topProducts.length === 0) {
      topSellingHTML =
          `<tr><td colspan="5" class="centered">${getTranslation("reports.messages.noSalesDataAvailable")}</td></tr>`;
    } else {
      topProducts.forEach((item) => {
        // Find product details
        const product = products.find((p) => p.id === item.id) || {};

        topSellingHTML += `
          <tr>
            <td>${item.name}</td>
            <td>$${(product.price || 0).toFixed(2)}</td>
            <td>${item.quantity}</td>
            <td>$${item.revenue.toFixed(2)}</td>
            <td>${product.stock || 0}</td>
          </tr>
        `;
      });
    }

    // Update table
    topSellingTable.innerHTML = topSellingHTML;

    // Set RTL attributes if in Arabic
    if (isRTL) {
      topSellingTable.setAttribute('dir', 'rtl');
    }
  }

  // Generate low stock products table
  const lowStockTable = document.getElementById("low-stock-table");
  if (lowStockTable) {
    let lowStockHTML = "";

    // Get products with low stock and sort by stock level (lowest first)
    const lowStockProducts = products
        .filter((product) => product.stock <= 5)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 10); // Top 10 lowest stock

    if (lowStockProducts.length === 0) {
      lowStockHTML =
          `<tr><td colspan="4" class="centered">${getTranslation("reports.messages.noLowStockProducts")}</td></tr>`;
    } else {
      lowStockProducts.forEach((product) => {
        lowStockHTML += `
          <tr>
            <td>${product.name}</td>
            <td>${product.sku || "N/A"}</td>
            <td>$${product.price.toFixed(2)}</td>
            <td class="low-stock">${product.stock}</td>
          </tr>
        `;
      });
    }

    // Update table
    lowStockTable.innerHTML = lowStockHTML;

    // Set RTL attributes if in Arabic
    if (isRTL) {
      lowStockTable.setAttribute('dir', 'rtl');
    }
  }
}

// Create sales chart (placeholder for now)
function createSalesChart() {
  const chartContainer = document.getElementById("sales-chart");
  if (!chartContainer) return;

  console.log("Creating sales chart");

  // Check if we're using RTL
  const isRTL = (localStorage.getItem('language') || 'en') === 'ar';

  // Always make chart containers LTR (charts don't render well in RTL)
  chartContainer.style.direction = 'ltr';

  // Clear previous chart if it exists
  chartContainer.innerHTML = "";

  // Create canvas element for the chart
  const canvas = document.createElement("canvas");
  canvas.id = "sales-performance-chart";
  chartContainer.appendChild(canvas);

  // Get the context for Chart.js
  const ctx = canvas.getContext("2d");

  // Set up chart data based on current view
  const chartData = processChartData();

  // Set initial button states
  updateChartViewButtons();

  // Create the chart
  salesChart = new Chart(ctx, {
    type: "bar", // Use bar chart for better performance
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: getTranslation("reports.chart.revenue"),
          data: chartData.revenue,
          backgroundColor: "rgba(99, 102, 241, 0.7)",
          borderColor: "rgb(99, 102, 241)",
          borderWidth: 1,
        },
        {
          label: getTranslation("reports.chart.profit"),
          data: chartData.profit,
          backgroundColor: "rgba(16, 185, 129, 0.7)",
          borderColor: "rgb(16, 185, 129)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500, // Shorter animations for better performance
      },
      // Add RTL support
      rtl: isRTL,
      // Extra padding for RTL layouts
      layout: {
        padding: {
          right: isRTL ? 10 : 0,
          left: isRTL ? 0 : 10
        }
      },
      plugins: {
        legend: {
          position: 'top',
          align: isRTL ? 'end' : 'start',
          labels: {
            color: getComputedStyle(document.body).getPropertyValue(
                "--text-primary"
            ),
            textAlign: isRTL ? 'right' : 'left'
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: getComputedStyle(document.body).getPropertyValue(
              "--base-100"
          ),
          titleColor: getComputedStyle(document.body).getPropertyValue(
              "--text-primary"
          ),
          bodyColor: getComputedStyle(document.body).getPropertyValue(
              "--text-secondary"
          ),
          borderColor: getComputedStyle(document.body).getPropertyValue(
              "--primary"
          ),
          borderWidth: 1,
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed.y !== null) {
                label += "$" + context.parsed.y.toFixed(2);
              }
              return label;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false, // Hide grid for better performance
          },
          ticks: {
            color: getComputedStyle(document.body).getPropertyValue(
                "--text-secondary"
            ),
            align: isRTL ? 'end' : 'center'
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
            lineWidth: 0.5, // Thinner lines for better performance
          },
          position: isRTL ? 'right' : 'left',
          ticks: {
            color: getComputedStyle(document.body).getPropertyValue(
                "--text-secondary"
            ),
            callback: function (value) {
              return "$" + value.toFixed(0);
            },
          },
        },
      },
    },
  });

  // Set up chart view buttons
  const dailyBtn = document.getElementById("view-daily");
  const weeklyBtn = document.getElementById("view-weekly");
  const monthlyBtn = document.getElementById("view-monthly");

  if (dailyBtn) {
    dailyBtn.addEventListener("click", () => {
      if (currentChartView !== "daily") {
        currentChartView = "daily";
        updateChartViewButtons();
        updateChart();
      }
    });
  }

  if (weeklyBtn) {
    weeklyBtn.addEventListener("click", () => {
      if (currentChartView !== "weekly") {
        currentChartView = "weekly";
        updateChartViewButtons();
        updateChart();
      }
    });
  }

  if (monthlyBtn) {
    monthlyBtn.addEventListener("click", () => {
      if (currentChartView !== "monthly") {
        currentChartView = "monthly";
        updateChartViewButtons();
        updateChart();
      }
    });
  }
}

// Export report data to CSV
function exportReportData() {
  console.log("Exporting report data");

  const activeTabs = document.querySelectorAll(".report-tab");
  let activeTab = "";

  for (const tab of activeTabs) {
    if (tab.classList.contains("active")) {
      activeTab = tab.dataset.tab;
      break;
    }
  }

  let data, filename;

  // Get data based on active tab
  switch (activeTab) {
    case "daily-sales":
      data = exportTableToCSV("daily-sales-table");
      filename = `daily_sales_report_${formatDateForFilename(
          dateRange.from
      )}_to_${formatDateForFilename(dateRange.to)}.csv`;
      break;
    case "product-sales":
      data = exportTableToCSV("product-sales-table");
      filename = `product_sales_report_${formatDateForFilename(
          dateRange.from
      )}_to_${formatDateForFilename(dateRange.to)}.csv`;
      break;
    case "category-sales":
      data = exportTableToCSV("category-sales-table");
      filename = `category_sales_report_${formatDateForFilename(
          dateRange.from
      )}_to_${formatDateForFilename(dateRange.to)}.csv`;
      break;
    default:
      alert("No data to export");
      return;
  }

  // Create download
  if (data) {
    const blob = new Blob([data], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Helper function to export table data to CSV
function exportTableToCSV(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return null;

  const rows = table.querySelectorAll("tr");
  if (rows.length === 0) return null;

  let csv = [];

  for (let i = 0; i < rows.length; i++) {
    const row = [];
    const cols = rows[i].querySelectorAll("td, th");

    for (let j = 0; j < cols.length; j++) {
      // Get text and clean it
      let data = cols[j].innerText;
      data = data.replace(/(\r\n|\n|\r)/gm, "").replace(/(\s\s)/gm, " ");
      data = data.replace(/"/g, '""'); // Escape double quotes

      // Wrap in quotes if contains comma
      row.push(data.includes(",") ? `"${data}"` : data);
    }

    csv.push(row.join(","));
  }

  return csv.join("\n");
}

// Helper function to format date for filenames
function formatDateForFilename(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

// Calculate costs for each invoice
function calculateInvoiceCosts() {
  console.log("Calculating invoice costs");

  // Create a map of products for quick lookup
  const productMap = {};
  products.forEach((product) => {
    productMap[product.id] = product;
  });

  // Calculate cost for each invoice if not already set
  invoices.forEach((invoice) => {
    if (!invoice.totalCost || invoice.totalCost === 0) {
      let totalCost = 0;

      // Sum the cost of each item
      invoice.items.forEach((item) => {
        // Get cost either from the item itself or from the product catalog
        const itemCost =
            item.cost || (productMap[item.id] ? productMap[item.id].cost : 0);
        totalCost += itemCost * item.quantity;
      });

      invoice.totalCost = totalCost;
      // Update profit as well
      invoice.profit = invoice.total - totalCost;
    }
  });

  console.log("Invoice costs calculated");
}

// Format date with language awareness
function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    return "Invalid date";
  }

  // Get the current language
  const language = localStorage.getItem("language") || "en";

  // Use locale-specific date formatting
  try {
    if (language === "ar") {
      // Format for Arabic
      const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
      return date.toLocaleDateString('ar-SA', options);
    } else {
      // Default format for English and other languages
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    }
  } catch (error) {
    console.error("Error formatting date:", error);
    // Fallback to basic format
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }
}

// Process data for the chart based on current view
function processChartData() {
  console.log("Processing chart data for view:", currentChartView);

  // Default empty data
  const emptyData = {
    labels: [getTranslation("reports.messages.noSalesData")],
    revenue: [0],
    profit: [0],
  };

  if (!filteredInvoices || filteredInvoices.length === 0) {
    return emptyData;
  }

  // Create a data structure for grouping
  let groupedData = {};

  // Sort invoices by date first
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    return new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt);
  });

  // Group data based on view type
  sortedInvoices.forEach((invoice) => {
    const date = new Date(invoice.date || invoice.createdAt);
    let key;

    if (currentChartView === "daily") {
      // Group by day - use YYYY-MM-DD format
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
      )}-${String(date.getDate()).padStart(2, "0")}`;
    } else if (currentChartView === "weekly") {
      // Group by week - calculate week number
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
      const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
      const weekNum = Math.ceil(
          (pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7
      );
      key = `Week ${weekNum}, ${date.getFullYear()}`;
    } else {
      // Group by month - use YYYY-MM format
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
          2,
          "0"
      )}`;
    }

    if (!groupedData[key]) {
      groupedData[key] = {
        key,
        date, // Store a date for sorting
        revenue: 0,
        profit: 0,
      };
    }

    groupedData[key].revenue += invoice.total || 0;

    // Calculate profit
    const profit = invoice.profit || invoice.total - (invoice.totalCost || 0);
    groupedData[key].profit += profit;
  });

  // Convert to array for processing
  const dataArray = Object.values(groupedData);

  // Sort by date
  dataArray.sort((a, b) => a.date - b.date);

  // Get current language
  const language = localStorage.getItem("language") || "en";

  // Format labels based on view type and language
  const labels = dataArray.map((item) => {
    if (currentChartView === "daily") {
      // Format as MM/DD
      const date = item.date;
      if (language === "ar") {
        // Format for Arabic
        return date.toLocaleDateString('ar-SA', { month: 'numeric', day: 'numeric' });
      } else {
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }
    } else if (currentChartView === "weekly") {
      if (language === "ar") {
        const weekNumber = item.key.split(",")[0].replace("Week", "").trim();
        const year = item.key.split(",")[1].trim();
        return `الأسبوع ${weekNumber}، ${year}`;
      } else {
        return item.key; // Already formatted as "Week X, YYYY"
      }
    } else {
      // Format as Month YYYY
      const date = item.date;
      if (language === "ar") {
        return date.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' });
      } else {
        return date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
      }
    }
  });

  // Create datasets
  const revenue = dataArray.map((item) => item.revenue);
  const profit = dataArray.map((item) => item.profit);

  // If we have too many data points, reduce the number
  if (labels.length > 15) {
    const step = Math.ceil(labels.length / 15);
    const reducedLabels = [];
    const reducedRevenue = [];
    const reducedProfit = [];

    for (let i = 0; i < labels.length; i += step) {
      reducedLabels.push(labels[i]);

      // Aggregate data for the step
      let revSum = 0;
      let profitSum = 0;
      for (let j = i; j < i + step && j < revenue.length; j++) {
        revSum += revenue[j];
        profitSum += profit[j];
      }

      reducedRevenue.push(revSum);
      reducedProfit.push(profitSum);
    }

    return {
      labels: reducedLabels,
      revenue: reducedRevenue,
      profit: reducedProfit,
    };
  }

  return {
    labels,
    revenue,
    profit,
  };
}

// Update chart when data or view changes
function updateChart() {
  if (!salesChart) return;

  console.log("Updating chart for view:", currentChartView);

  const chartData = processChartData();

  salesChart.data.labels = chartData.labels;
  salesChart.data.datasets[0].data = chartData.revenue;
  salesChart.data.datasets[1].data = chartData.profit;

  // Update dataset labels with translations
  salesChart.data.datasets[0].label = getTranslation("reports.chart.revenue");
  salesChart.data.datasets[1].label = getTranslation("reports.chart.profit");

  salesChart.update();
}

// Update button states based on current view
function updateChartViewButtons() {
  const dailyBtn = document.getElementById("view-daily");
  const weeklyBtn = document.getElementById("view-weekly");
  const monthlyBtn = document.getElementById("view-monthly");

  if (dailyBtn && weeklyBtn && monthlyBtn) {
    // Reset all buttons
    dailyBtn.className = "btn btn-ghost";
    weeklyBtn.className = "btn btn-ghost";
    monthlyBtn.className = "btn btn-ghost";

    // Set active button
    if (currentChartView === "daily") {
      dailyBtn.className = "btn btn-primary";
    } else if (currentChartView === "weekly") {
      weeklyBtn.className = "btn btn-primary";
    } else {
      monthlyBtn.className = "btn btn-primary";
    }
  }
}

// Handle language changes
if (window.addEventListener) {
  window.addEventListener('languageChanged', function(event) {
    console.log("Language changed event detected:", event.detail);

    // Force reset any RTL/LTR classes
    const isRTL = event.detail.language === 'ar';
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl-layout', isRTL);

    // Update chart labels and other dynamic content
    if (salesChart) {
      updateChart();
    }

    // Re-generate reports with new language
    generateAllReports();
  });
}