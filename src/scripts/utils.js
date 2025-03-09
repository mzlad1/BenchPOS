// scripts/utils.js
function getCurrentPageName() {
  // Extract the page name from the URL
  const path = window.location.pathname;
  const pageName = path.substring(path.lastIndexOf("/") + 1);
  return pageName;
}

async function handleLogout() {
  try {
    await window.api.logoutUser();

    // Determine redirect path based on current page
    if (getCurrentPageName() === "index.html" || getCurrentPageName() === "") {
      window.location.href = "views/login.html";
    } else {
      window.location.href = "login.html";
    }
  } catch (error) {
    console.error("Logout error:", error);
  }
}

// Export if you're using a module system
if (typeof module !== "undefined" && module.exports) {
  module.exports = { handleLogout };
} else {
  // Make it global for direct script inclusion
  window.appUtils = { handleLogout };
}
