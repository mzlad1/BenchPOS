/**
 * Utility functions for formatting numbers and dates in English
 * regardless of user's locale settings
 */

/**
 * Format a number to always use Western Arabic (Latin) numerals
 * @param {number} num - The number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
function formatNumberToEnglish(num, decimals = 2) {
  // Always use en-US locale which uses Western Arabic numerals
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
  });
}

/**
 * Format currency to always use Western Arabic (Latin) numerals
 * @param {number} amount - The currency amount
 * @param {string} currencyCode - Currency code (e.g., 'USD', 'ILS')
 * @returns {string} Formatted currency string
 */
function formatCurrencyToEnglish(amount, currencyCode = "USD") {
  const symbol = currencyCode === "ILS" ? "₪" : "$";
  return `${symbol}${formatNumberToEnglish(amount, 2)}`;
}

/**
 * Format a date to always use English format (MM/DD/YYYY)
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
function formatDateToEnglish(date) {
  if (!(date instanceof Date) || isNaN(date)) {
    return "Invalid Date";
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}

/**
 * Format time to always use English format (HH:MM:SS)
 * @param {Date} date - The date object containing the time
 * @param {boolean} includeSeconds - Whether to include seconds
 * @returns {string} Formatted time string
 */
function formatTimeToEnglish(date, includeSeconds = true) {
  if (!(date instanceof Date) || isNaN(date)) {
    return "Invalid Time";
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  if (includeSeconds) {
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  return `${hours}:${minutes}`;
}

// Export the utility functions
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    formatNumberToEnglish,
    formatCurrencyToEnglish,
    formatDateToEnglish,
    formatTimeToEnglish,
  };
} else {
  // Browser environment
  window.formatNumberToEnglish = formatNumberToEnglish;
  window.formatCurrencyToEnglish = formatCurrencyToEnglish;
  window.formatDateToEnglish = formatDateToEnglish;
  window.formatTimeToEnglish = formatTimeToEnglish;
}
