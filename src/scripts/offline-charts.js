// offline-charts.js
// A self-contained chart module for the MZLAD Billing System
// This module doesn't require external CDN connections

// Constants for chart colors - using CSS variables for theme consistency
const CHART_COLORS = {
  primary: "var(--primary, #4353FF)",
  primaryLight: "var(--primary-light, rgba(67, 83, 255, 0.2))",
  secondary: "var(--secondary, #F59E0B)",
  secondaryLight: "var(--secondary-light, rgba(245, 158, 11, 0.2))",
  success: "var(--success, #10B981)",
  successLight: "var(--success-light, rgba(16, 185, 129, 0.2))",
  danger: "var(--danger, #EF4444)",
  dangerLight: "var(--danger-light, rgba(239, 68, 68, 0.2))",
};

// Main Chart Controller Class
class OfflineChartController {
  constructor() {
    this.charts = new Map(); // Store all chart instances
    this.chartModules = {}; // Will store Chart.js when loaded
  }

  // Initialize and load chart library
  async initialize() {
    try {
      // In Electron context, we can get Chart from the preload script
      if (window.api && window.api.getChartLibrary) {
        // If preload exposes Chart.js
        this.chartModules = await window.api.getChartLibrary();
        console.log("Chart library loaded from preload");
        return true;
      } else {
        // Fallback - look for Chart global
        if (typeof Chart !== "undefined") {
          this.chartModules = { Chart };
          console.log("Chart library found in global scope");
          return true;
        }

        console.error(
          "Chart library not found. Make sure you have Chart.js in your Electron dependencies."
        );
        return false;
      }
    } catch (error) {
      console.error("Failed to initialize chart library:", error);
      this.showChartError("Chart initialization failed");
      return false;
    }
  }

  // Create or update a chart
  createChart(containerId, config) {
    try {
      if (!this.chartModules.Chart) {
        throw new Error(
          "Chart library not initialized. Call initialize() first."
        );
      }

      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`Chart container with ID "${containerId}" not found.`);
      }

      // Clear the container
      container.innerHTML = "";

      // Create canvas element
      const canvas = document.createElement("canvas");
      canvas.id = `${containerId}-canvas`;
      container.appendChild(canvas);

      // Create the chart
      const ctx = canvas.getContext("2d");

      // If a chart already exists with this id, destroy it
      if (this.charts.has(containerId)) {
        this.charts.get(containerId).destroy();
      }

      // Create new chart instance
      const chartInstance = new this.chartModules.Chart(ctx, config);
      this.charts.set(containerId, chartInstance);

      return chartInstance;
    } catch (error) {
      console.error("Error creating chart:", error);
      this.showChartError(error.message, containerId);
      return null;
    }
  }

  // Process data for charts with different time periods
  processChartData(
    data,
    period = "week",
    metrics = ["revenue", "orders", "products"]
  ) {
    // Default data structure if no data available
    if (!data || !data.length) {
      const result = { labels: ["No Data"] };
      metrics.forEach((metric) => {
        result[metric] = [0];
      });
      return result;
    }

    // Sort data by date
    const sortedData = [...data].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Group data based on period
    const groupedData = {};

    sortedData.forEach((item) => {
      const date = new Date(item.date);
      let key;

      if (period === "day") {
        // Format as hours: "1 AM", "2 PM", etc.
        key = date.toLocaleTimeString("en-US", { hour: "numeric" });
      } else if (period === "week") {
        // Format as "Mon", "Tue", etc.
        key = date.toLocaleDateString("en-US", { weekday: "short" });
      } else if (period === "month") {
        // Format as "Week 1", "Week 2", etc.
        const weekNum = Math.ceil(date.getDate() / 7);
        key = `Week ${weekNum}`;
      } else if (period === "year") {
        // Format as "Jan", "Feb", etc.
        key = date.toLocaleDateString("en-US", { month: "short" });
      }

      if (!groupedData[key]) {
        // Initialize all metrics to 0
        groupedData[key] = {};
        metrics.forEach((metric) => {
          groupedData[key][metric] = 0;
        });
      }

      // Accumulate data
      if (metrics.includes("revenue")) {
        groupedData[key].revenue += item.total || 0;
      }

      if (metrics.includes("orders")) {
        groupedData[key].orders += 1;
      }

      if (metrics.includes("products")) {
        groupedData[key].products += item.items ? item.items.length : 0;
      }

      if (metrics.includes("profit") && item.profit !== undefined) {
        groupedData[key].profit += item.profit || 0;
      }

      if (metrics.includes("cost") && item.cost !== undefined) {
        groupedData[key].cost += item.cost || 0;
      }
    });

    // Convert to arrays for chart.js
    const keys = Object.keys(groupedData);

    // For week view, ensure days are in correct order
    if (period === "week") {
      const daysOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      keys.sort((a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b));
    }

    // Prepare result object
    const result = { labels: keys };

    // Add each metric's data array
    metrics.forEach((metric) => {
      result[metric] = keys.map((key) => groupedData[key][metric]);
    });

    return result;
  }

  // Update an existing chart
  updateChart(chartId, newData, newOptions = {}) {
    if (!this.charts.has(chartId)) {
      console.error(`Chart with ID "${chartId}" not found`);
      return false;
    }

    const chart = this.charts.get(chartId);

    if (newData && newData.labels) {
      chart.data.labels = newData.labels;
    }

    if (newData && newData.datasets) {
      chart.data.datasets = newData.datasets;
    }

    // Update options
    if (newOptions && Object.keys(newOptions).length > 0) {
      Object.assign(chart.options, newOptions);
    }

    chart.update();
    return true;
  }

  // Destroy a chart
  destroyChart(chartId) {
    if (this.charts.has(chartId)) {
      this.charts.get(chartId).destroy();
      this.charts.delete(chartId);
      return true;
    }
    return false;
  }

  // Show error in chart container
  showChartError(message, containerId = null) {
    const containers = containerId
      ? [document.getElementById(containerId)]
      : document.querySelectorAll(".chart-container");

    containers.forEach((container) => {
      if (container) {
        container.innerHTML = `
          <div class="chart-error">
            <div class="chart-error-icon">⚠️</div>
            <div class="chart-error-message">${message}</div>
            <div class="chart-error-help">Check the console for more details.</div>
          </div>
        `;
      }
    });
  }

  // Create a sales performance chart
  createSalesPerformanceChart(containerId, data, options = {}) {
    const defaultOptions = {
      period: "week",
      metric: "revenue",
      title: "Sales Performance",
      currency: localStorage.getItem("currency") || "USD",
      showLegend: false,
    };

    const chartOptions = { ...defaultOptions, ...options };

    // Process data based on period
    const processedData = this.processChartData(data, chartOptions.period, [
      chartOptions.metric,
    ]);

    // Get currency symbol
    const currencySymbol = chartOptions.currency === "ILS" ? "₪" : "$";

    // Chart configuration
    const config = {
      type: "line",
      data: {
        labels: processedData.labels,
        datasets: [
          {
            label:
              chartOptions.metric.charAt(0).toUpperCase() +
              chartOptions.metric.slice(1),
            data: processedData[chartOptions.metric],
            borderColor: CHART_COLORS.primary,
            backgroundColor: CHART_COLORS.primaryLight,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: CHART_COLORS.primary,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: !!chartOptions.title,
            text: chartOptions.title,
            font: {
              size: 16,
              weight: "bold",
            },
          },
          legend: {
            display: chartOptions.showLegend,
          },
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              label: function (context) {
                const label = context.dataset.label || "";
                const value = context.parsed.y;
                if (
                  chartOptions.metric === "revenue" ||
                  chartOptions.metric === "profit"
                ) {
                  return `${label}: ${currencySymbol}${value.toFixed(2)}`;
                }
                return `${label}: ${value}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                if (
                  chartOptions.metric === "revenue" ||
                  chartOptions.metric === "profit"
                ) {
                  return `${currencySymbol}${value}`;
                }
                return value;
              },
            },
          },
        },
      },
    };

    return this.createChart(containerId, config);
  }

  // Create a comparison chart (bar chart with multiple datasets)
  createComparisonChart(containerId, data, options = {}) {
    const defaultOptions = {
      period: "week",
      metrics: ["revenue", "profit"],
      title: "Financial Comparison",
      currency: localStorage.getItem("currency") || "USD",
      showLegend: true,
    };

    const chartOptions = { ...defaultOptions, ...options };

    // Process data based on period
    const processedData = this.processChartData(
      data,
      chartOptions.period,
      chartOptions.metrics
    );

    // Get currency symbol
    const currencySymbol = chartOptions.currency === "ILS" ? "₪" : "$";

    // Dataset colors
    const colorSets = [
      { main: CHART_COLORS.primary, light: CHART_COLORS.primaryLight },
      { main: CHART_COLORS.secondary, light: CHART_COLORS.secondaryLight },
      { main: CHART_COLORS.success, light: CHART_COLORS.successLight },
      { main: CHART_COLORS.danger, light: CHART_COLORS.dangerLight },
    ];

    // Create datasets
    const datasets = chartOptions.metrics.map((metric, index) => {
      const colorSet = colorSets[index % colorSets.length];
      return {
        label: metric.charAt(0).toUpperCase() + metric.slice(1),
        data: processedData[metric],
        backgroundColor: colorSet.light,
        borderColor: colorSet.main,
        borderWidth: 1,
      };
    });

    // Chart configuration
    const config = {
      type: "bar",
      data: {
        labels: processedData.labels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: !!chartOptions.title,
            text: chartOptions.title,
            font: {
              size: 16,
              weight: "bold",
            },
          },
          legend: {
            display: chartOptions.showLegend,
          },
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              label: function (context) {
                const label = context.dataset.label || "";
                const value = context.parsed.y;
                const metric = chartOptions.metrics[context.datasetIndex];
                if (
                  metric === "revenue" ||
                  metric === "profit" ||
                  metric === "cost"
                ) {
                  return `${label}: ${currencySymbol}${value.toFixed(2)}`;
                }
                return `${label}: ${value}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                // Check if any of the metrics are financial
                const hasFinancialMetrics = chartOptions.metrics.some(
                  (m) => m === "revenue" || m === "profit" || m === "cost"
                );

                if (hasFinancialMetrics) {
                  return `${currencySymbol}${value}`;
                }
                return value;
              },
            },
          },
        },
      },
    };

    return this.createChart(containerId, config);
  }

  // Create a pie/doughnut chart for category distribution
  createDistributionChart(containerId, data, options = {}) {
    const defaultOptions = {
      type: "doughnut", // 'pie' or 'doughnut'
      metric: "revenue",
      categoryField: "category",
      title: "Distribution by Category",
      currency: localStorage.getItem("currency") || "USD",
      showLegend: true,
      cutout: "50%", // for doughnut charts
    };

    const chartOptions = { ...defaultOptions, ...options };

    // Get currency symbol
    const currencySymbol = chartOptions.currency === "ILS" ? "₪" : "$";

    // Group data by category
    const groupedData = {};
    data.forEach((item) => {
      const category = item[chartOptions.categoryField] || "Uncategorized";

      if (!groupedData[category]) {
        groupedData[category] = 0;
      }

      // Increase value based on the metric
      if (chartOptions.metric === "revenue") {
        groupedData[category] += item.total || 0;
      } else if (chartOptions.metric === "orders") {
        groupedData[category] += 1;
      } else if (chartOptions.metric === "products") {
        groupedData[category] += item.items ? item.items.length : 0;
      } else if (
        chartOptions.metric === "profit" &&
        item.profit !== undefined
      ) {
        groupedData[category] += item.profit || 0;
      }
    });

    // Generate colors
    const backgroundColors = Object.keys(groupedData).map((_, index) => {
      const hue = (index * 137) % 360; // Use golden angle to generate well-distributed colors
      return `hsl(${hue}, 70%, 60%)`;
    });

    // Chart configuration
    const config = {
      type: chartOptions.type,
      data: {
        labels: Object.keys(groupedData),
        datasets: [
          {
            data: Object.values(groupedData),
            backgroundColor: backgroundColors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: chartOptions.cutout,
        plugins: {
          title: {
            display: !!chartOptions.title,
            text: chartOptions.title,
            font: {
              size: 16,
              weight: "bold",
            },
          },
          legend: {
            display: chartOptions.showLegend,
            position: "right",
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.raw;

                // Format financial values with currency symbol
                if (
                  chartOptions.metric === "revenue" ||
                  chartOptions.metric === "profit"
                ) {
                  return `${label}: ${currencySymbol}${value.toFixed(2)}`;
                }
                return `${label}: ${value}`;
              },
            },
          },
        },
      },
    };

    return this.createChart(containerId, config);
  }
}

// Export the controller
window.OfflineChartController = new OfflineChartController();
