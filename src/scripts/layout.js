// layout.js - Handles loading shared components (header, sidebar)

// Layout Manager for MZLAD Billing System
const LayoutManager = {
  // Current page identifier
  currentPage: "dashboard",

  // User information (will be populated later)
  user: null,

  // Initialize layout components
  async init(pageName) {
    this.currentPage = pageName || "dashboard";

    try {
      // Fetch current user (if available)
      if (window.api && typeof window.api.getCurrentUser === "function") {
        this.user = await window.api.getCurrentUser();
      }

      // Load components
      await this.loadSidebar();
      await this.loadHeader();

      // Set up event listeners
      this.setupEventListeners();

      // Apply theme preference
      this.loadThemePreference();

      // Check connection status
      this.checkConnectionStatus();

      // Apply role-based access
      if (this.user) {
        this.applyRoleBasedAccess(this.user);
      }

      // Apply language direction based on selected language
      this.applyLanguageDirection();

      // Update inventory badge
      this.refreshInventoryBadge();

      // Update page with translations if i18n is available
      if (window.i18n) {
        window.i18n.updatePageContent();
      }

      console.log(`Layout initialized for page: ${this.currentPage}`);
    } catch (error) {
      console.error("Error initializing layout:", error);
    }
  },

  // Determine if we're on the dashboard (root) or in a subpage
  isDashboard() {
    return this.currentPage === "dashboard";
  },

  // Get appropriate path prefix based on current location
  getPathPrefix() {
    return this.isDashboard() ? "views/" : "../views/";
  },

  // Get path to root
  getRootPath() {
    return this.isDashboard() ? "" : "../";
  },

  // Load sidebar component
  async loadSidebar() {
    const sidebarContainer = document.getElementById("sidebar-container");
    if (!sidebarContainer) return;

    try {
      // Get the appropriate path prefixes
      const viewsPath = this.getPathPrefix();
      const rootPath = this.getRootPath();

      // Create sidebar structure
      sidebarContainer.innerHTML = `
        <div class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <div class="logo">
              <div class="logo-icon">M</div>
              <span class="logo-text" data-i18n="app.name">MZLAD</span>
            </div>
            <div class="menu-toggle" id="menu-toggle">◀</div>
          </div>
  
          <div class="nav-menu">
            <div class="menu-section">
              <a href="${rootPath}index.html" class="menu-item" id="nav-dashboard">
                <div class="menu-icon">📊</div>
                <span class="menu-text" data-i18n="sidebar.dashboard">Dashboard</span>
              </a>
  
              <a href="${viewsPath}billing.html" class="menu-item" id="nav-billing">
                <div class="menu-icon">💵</div>
                <span class="menu-text" data-i18n="sidebar.newSale">New Sale</span>
              </a>
  
              <a href="${viewsPath}inventory.html" class="menu-item" id="nav-inventory">
                <div class="menu-icon">📦</div>
                <span class="menu-text" data-i18n="sidebar.inventory">Inventory</span>
                <span class="badge" id="inventory-badge">0</span>
              </a>
  
              <a href="${viewsPath}reports.html" class="menu-item" id="nav-reports">
                <div class="menu-icon">📈</div>
                <span class="menu-text" data-i18n="sidebar.reports">Reports</span>
              </a>
              <a href="${viewsPath}register.html" class="menu-item" id="nav-register">
                <div class="menu-icon">🔑</div>
                <span class="menu-text" data-i18n="sidebar.registerUser">Register new User</span>
                </a> 
                <a href="${viewsPath}user-manager.html" class="menu-item" id="nav-user-manager">
                <div class="menu-icon">👥</div>     
                <span class="menu-text" data-i18n="sidebar.userManager">User Manager</span>
                </a>
                
            </div>
            
  
            <div class="menu-section">
              <div class="menu-label" data-i18n="sidebar.system">System</div>
  
              <a href="${viewsPath}settings.html" class="menu-item" id="nav-settings">
                <div class="menu-icon">⚙️</div>
                <span class="menu-text" data-i18n="sidebar.settings">Settings</span>
              </a>
  
              <a href="${viewsPath}help.html" class="menu-item" id="nav-help">
                <div class="menu-icon">❓</div>
                <span class="menu-text" data-i18n="sidebar.helpCenter">Help Center</span>
              </a>
            </div>
          </div>
  
          <div class="user-profile">
            <div class="avatar" id="user-avatar">U</div>
            <div class="user-details">
              <div class="user-name" id="current-user-name">Not logged in</div>
              <div class="user-role" id="current-user-role">No role</div>
            </div>
            <button id="logout-btn" class="logout-btn" data-i18n-title="user.logout">⇥</button>
          </div>
        </div>
      `;

      // Set active menu item
      this.setActiveMenuItem();

      // Update user profile in sidebar
      this.updateUserProfile();
    } catch (error) {
      console.error("Error loading sidebar:", error);
    }
  },

  // Load header component
  async loadHeader() {
    const headerContainer = document.getElementById("header-container");
    if (!headerContainer) return;

    try {
      // Get page title
      const pageTitle = this.getPageTitle();

      // Create header structure
      headerContainer.innerHTML = `
        <div class="header">
          <div class="page-title" id="page-title">${pageTitle}</div>
  
          <div class="header-actions">
            <div class="search-bare">
              <div class="search-icon">🔍</div>
              <input type="text" class="search-input" data-i18n-placeholder="header.searchPlaceholder" placeholder="Search...">
            </div>
  
            <div class="connection-status">
              <div class="status-indicator offline" id="connection-indicator"></div>
              <span id="connection-text" data-i18n="header.offlineMode">Offline Mode</span>
            </div>
  
            <div class="header-btn">
              <span>🔔</span>
              <div class="notification-indicator"></div>
            </div>
  
            <div class="theme-switcher" id="theme-switcher">
              <div class="theme-option light">☀️</div>
              <div class="theme-option dark">🌙</div>
              <div class="theme-indicator"></div>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Error loading header:", error);
    }
  },

  async refreshInventoryBadge() {
    try {
      if (window.api && typeof window.api.getProducts === "function") {
        const products = await window.api.getProducts();
        if (Array.isArray(products)) {
          const lowStockCount = products.filter(
              (product) => product.stock <= 5
          ).length;
          this.updateInventoryBadge(lowStockCount);
        }
      }
    } catch (error) {
      console.error("Error refreshing inventory badge:", error);
    }
  },

  // Get page title based on current page
  getPageTitle() {
    if (window.t) {
      switch (this.currentPage) {
        case "dashboard": return window.t("sidebar.dashboard");
        case "inventory": return window.t("sidebar.inventory");
        case "billing": return window.t("sidebar.newSale");
        case "reports": return window.t("sidebar.reports");
        case "register": return window.t("sidebar.registerUser");
        case "user-manager": return window.t("sidebar.userManager");
        case "settings": return window.t("sidebar.settings");
        case "help": return window.t("sidebar.helpCenter");
        default: return window.t("app.name");
      }
    } else {
      // Fallback to English if translations are not available
      switch (this.currentPage) {
        case "dashboard":
          return "Dashboard";
        case "inventory":
          return "Inventory Management";
        case "billing":
          return "New Sale";
        case "reports":
          return "Reports & Analytics";
        case "register":
          return "Register new User";
        case "user-manager":
          return "User Manager";
        case "settings":
          return "Settings";
        case "help":
          return "Help Center";
        default:
          return "MZLAD Billing System";
      }
    }
  },

  // Set active menu item
  setActiveMenuItem() {
    // Remove active class from all menu items
    document.querySelectorAll(".menu-item").forEach((item) => {
      item.classList.remove("active");
    });

    // Add active class to current page
    const activeNavItem = document.getElementById(`nav-${this.currentPage}`);
    if (activeNavItem) {
      activeNavItem.classList.add("active");
    }
  },

  // Update user profile information
  updateUserProfile() {
    if (!this.user) return;

    const userNameEl = document.getElementById("current-user-name");
    const userRoleEl = document.getElementById("current-user-role");
    const userAvatarEl = document.getElementById("user-avatar");

    if (userNameEl) userNameEl.textContent = this.user.name || "User";

    if (userRoleEl) {
      // Translate role if i18n is available
      if (window.t && this.user.role) {
        userRoleEl.textContent = window.t(`user.roles.${this.user.role.toLowerCase()}`) || this.user.role;
      } else {
        userRoleEl.textContent = this.user.role || "Guest";
      }
    }

    if (userAvatarEl)
      userAvatarEl.textContent = (this.user.name || "U")
          .charAt(0)
          .toUpperCase();
  },

  // Set up event listeners for interactive elements
  setupEventListeners() {
    // Toggle sidebar
    const menuToggle = document.getElementById("menu-toggle");
    if (menuToggle) {
      menuToggle.addEventListener("click", () => this.toggleSidebar());
    }

    // Theme switcher
    const themeSwitcher = document.getElementById("theme-switcher");
    if (themeSwitcher) {
      themeSwitcher.addEventListener("click", () => this.toggleTheme());
    }

    // Logout button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.handleLogout());
    }

    // Setup connection status listeners
    this.setupOnlineListeners();

    // Setup language change listener
    window.addEventListener('languageChanged', () => {
      // Update page title with new language
      const pageTitleEl = document.getElementById('page-title');
      if (pageTitleEl) {
        pageTitleEl.textContent = this.getPageTitle();
      }

      // Update user role with new language
      this.updateUserProfile();
    });
  },

  // Toggle sidebar expanded/collapsed state
  toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
      sidebar.classList.toggle("collapsed");

      // Save preference
      const isCollapsed = sidebar.classList.contains("collapsed");
      localStorage.setItem("sidebarCollapsed", isCollapsed);
    }
  },

  // Toggle between light and dark theme
  toggleTheme() {
    document.body.classList.toggle("dark-mode");
    document.body.classList.toggle("light-mode");

    // Save preference
    const isDarkMode = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDarkMode);
  },

  // Load theme preference from localStorage
  loadThemePreference() {
    const themePreference = localStorage.getItem("themePreference");
    const darkMode = localStorage.getItem("darkMode") === "true";

    if (themePreference === "system") {
      // Use system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.body.classList.toggle("dark-mode", prefersDark);
      document.body.classList.toggle("light-mode", !prefersDark);
    } else {
      // Use saved preference
      if (darkMode) {
        document.body.classList.remove("light-mode");
        document.body.classList.add("dark-mode");
      } else {
        document.body.classList.remove("dark-mode");
        document.body.classList.add("light-mode");
      }
    }

    // Load sidebar state preference
    const sidebarCollapsed =
        localStorage.getItem("sidebarCollapsed") === "true";
    const sidebar = document.getElementById("sidebar");
    if (sidebar && sidebarCollapsed) {
      sidebar.classList.add("collapsed");
    }
  },

  // Handle user logout
  async handleLogout() {
    try {
      console.log("Logging out...");

      // Create confirm message with translation if available
      const confirmMessage = window.t ? window.t("user.confirmLogout") : "Are you sure you want to log out?";

      if (confirm(confirmMessage)) {
        if (window.api && typeof window.api.logoutUser === "function") {
          const result = await window.api.logoutUser();

          // Use the correct path based on current location
          const loginPath = this.isDashboard() ? "views/login.html" : "../views/login.html";

          if (result && result.success) {
            window.location.href = loginPath;
          } else {
            console.error("Logout failed:", result);
            const errorMessage = window.t ? window.t("user.logoutFailed") : "Logout failed. Please try again.";
            alert(errorMessage);
          }
        } else {
          // Fallback for when API is not available
          const loginPath = this.isDashboard() ? "views/login.html" : "../views/login.html";
          window.location.href = loginPath;
        }
      }
    } catch (error) {
      console.error("Logout error:", error);
      const errorMessage = window.t ? window.t("user.logoutError") : "An error occurred during logout.";
      alert(errorMessage);
    }
  },

  // Check connection status
  async checkConnectionStatus() {
    try {
      let isOnline = navigator.onLine;

      if (window.api && typeof window.api.getOnlineStatus === "function") {
        isOnline = await window.api.getOnlineStatus();
      }

      this.updateConnectionUI(isOnline);
    } catch (error) {
      console.error("Error checking online status:", error);
      this.updateConnectionUI(navigator.onLine);
    }
  },

  // Update UI based on connection status
  updateConnectionUI(isOnline) {
    const indicator = document.getElementById("connection-indicator");
    const statusText = document.getElementById("connection-text");

    if (indicator) {
      if (isOnline) {
        indicator.classList.remove("offline");
        indicator.classList.add("online");
      } else {
        indicator.classList.remove("online");
        indicator.classList.add("offline");
      }
    }

    if (statusText) {
      // Use translations if available
      if (window.t) {
        statusText.textContent = isOnline ? window.t("header.onlineMode") : window.t("header.offlineMode");
      } else {
        statusText.textContent = isOnline ? "Online Mode" : "Offline Mode";
      }

      // Update data-i18n attribute for future translations
      statusText.setAttribute("data-i18n", isOnline ? "header.onlineMode" : "header.offlineMode");
    }
  },

  // Set up listeners for online status changes
  setupOnlineListeners() {
    if (window.api && typeof window.api.onOnlineStatusChanged === "function") {
      window.api.onOnlineStatusChanged((isOnline) => {
        this.updateConnectionUI(isOnline);
      });
    } else {
      window.addEventListener("online", () => this.updateConnectionUI(true));
      window.addEventListener("offline", () => this.updateConnectionUI(false));
    }
  },

  // Apply role-based access restrictions
  applyRoleBasedAccess(user) {
    if (!user || !user.role) return;

    const inventoryLink = document.getElementById("nav-inventory");
    const reportsLink = document.getElementById("nav-reports");
    const registerLink = document.getElementById("nav-register");
    const dashboardLink = document.getElementById("nav-dashboard");
    const usermanagerLink = document.getElementById("nav-user-manager");

    if (user.role === "cashier") {
      // Cashiers can only access billing
      if (inventoryLink) {
        inventoryLink.style.display = "none";
      }
      if (reportsLink) {
        reportsLink.style.display = "none";
      }
      if (registerLink) {
        registerLink.style.display = "none";
      }
      if (dashboardLink) {
        dashboardLink.style.display = "none";
      }
      if (usermanagerLink) {
        usermanagerLink.style.display = "none";
      }
    } else if (user.role === "manager") {
      // Managers can access billing and inventory but not reports
      if (reportsLink) {
        reportsLink.style.display = "none";
      }
      if (registerLink) {
        registerLink.style.display = "none";
      }
      if (dashboardLink) {
        dashboardLink.style.display = "none";
      }
      if (usermanagerLink) {
        usermanagerLink.style.display = "none";
      }
    }
    // Admins can access everything (no restrictions)
  },

  applyLanguageDirection() {
    try {
      // Get the language setting from localStorage
      const language = localStorage.getItem("language") || "en";

      // List of RTL (Right-to-Left) languages
      const rtlLanguages = ["ar", "he", "fa", "ur"];

      // Check if the selected language is RTL
      const isRtl = rtlLanguages.includes(language);

      // Apply the direction to the HTML document
      document.documentElement.dir = isRtl ? "rtl" : "ltr";

      // Add or remove RTL class from body
      if (isRtl) {
        document.body.classList.add("rtl-layout");
      } else {
        document.body.classList.remove("rtl-layout");
      }

      console.log(`Language direction applied: ${isRtl ? "RTL" : "LTR"}`);
    } catch (error) {
      console.error("Error applying language direction:", error);
    }
  },

  // Update inventory badge count
  updateInventoryBadge(count) {
    const badge = document.getElementById("inventory-badge");
    if (badge) {
      badge.textContent = count > 0 ? count : "";
      badge.style.display = count > 0 ? "block" : "none";
    }
  },
};

// Export for use in other modules
window.LayoutManager = LayoutManager;