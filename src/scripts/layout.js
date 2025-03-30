// layout.js - Handles loading shared components (header, sidebar)

// Layout Manager for MZLAD Billing System
const LayoutManager = {
    // Current page identifier
    currentPage: 'dashboard',

    // User information (will be populated later)
    user: null,

    // Initialize layout components
    async init(pageName) {
        this.currentPage = pageName || 'dashboard';

        try {
            // Fetch current user (if available)
            if (window.api && typeof window.api.getCurrentUser === 'function') {
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

            console.log(`Layout initialized for page: ${this.currentPage}`);
        } catch (error) {
            console.error('Error initializing layout:', error);
        }
    },

    // Load sidebar component
    async loadSidebar() {
        const sidebarContainer = document.getElementById('sidebar-container');
        if (!sidebarContainer) return;

        try {
            // Create sidebar structure
            sidebarContainer.innerHTML = `
        <div class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <div class="logo">
              <div class="logo-icon">M</div>
              <span class="logo-text">MZLAD</span>
            </div>
            <div class="menu-toggle" id="menu-toggle">◀</div>
          </div>
  
          <div class="nav-menu">
            <div class="menu-section">
              <a href="../index.html" class="menu-item" id="nav-dashboard">
                <div class="menu-icon">📊</div>
                <span class="menu-text">Dashboard</span>
              </a>
  
              <a href="../views/billing.html" class="menu-item" id="nav-billing">
                <div class="menu-icon">💵</div>
                <span class="menu-text">New Sale</span>
              </a>
  
              <a href="../views/inventory.html" class="menu-item" id="nav-inventory">
                <div class="menu-icon">📦</div>
                <span class="menu-text">Inventory</span>
                <span class="badge" id="inventory-badge">0</span>
              </a>
  
              <a href="../views/reports.html" class="menu-item" id="nav-reports">
                <div class="menu-icon">📈</div>
                <span class="menu-text">Reports</span>
              </a>
              <a href="../views/register.html" class="menu-item" id="nav-register">
                <div class="menu-icon">🔑</div>
                <span class="menu-text">Register new User</span>
                </a> 
            </div>
            
  
            <div class="menu-section">
              <div class="menu-label">System</div>
  
              <div class="menu-item">
                <div class="menu-icon">⚙️</div>
                <span class="menu-text">Settings</span>
              </div>
  
              <div class="menu-item">
                <div class="menu-icon">❓</div>
                <span class="menu-text">Help Center</span>
              </div>
            </div>
          </div>
  
          <div class="user-profile">
            <div class="avatar" id="user-avatar">U</div>
            <div class="user-details">
              <div class="user-name" id="current-user-name">Not logged in</div>
              <div class="user-role" id="current-user-role">No role</div>
            </div>
            <button id="logout-btn" class="logout-btn">⇥</button>
          </div>
        </div>
      `;

            // Set active menu item
            this.setActiveMenuItem();

            // Update user profile in sidebar
            this.updateUserProfile();
        } catch (error) {
            console.error('Error loading sidebar:', error);
        }
    },

    // Load header component
    async loadHeader() {
        const headerContainer = document.getElementById('header-container');
        if (!headerContainer) return;

        try {
            // Get page title
            const pageTitle = this.getPageTitle();

            // Create header structure
            headerContainer.innerHTML = `
        <div class="header">
          <div class="page-title">${pageTitle}</div>
  
          <div class="header-actions">
            <div class="search-bare">
              <div class="search-icon">🔍</div>
              <input type="text" class="search-input" placeholder="Search...">
            </div>
  
            <div class="connection-status">
              <div class="status-indicator offline" id="connection-indicator"></div>
              <span id="connection-text">Offline Mode</span>
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
            console.error('Error loading header:', error);
        }
    },

    // Get page title based on current page
    getPageTitle() {
        switch (this.currentPage) {
            case 'dashboard': return 'Dashboard';
            case 'inventory': return 'Inventory Management';
            case 'billing': return 'New Sale';
            case 'reports': return 'Reports & Analytics';
            case 'register': return 'Register new User';
            default: return 'MZLAD Billing System';
        }
    },

    // Set active menu item
    setActiveMenuItem() {
        // Remove active class from all menu items
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to current page
        const activeNavItem = document.getElementById(`nav-${this.currentPage}`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }
    },

    // Update user profile information
    updateUserProfile() {
        if (!this.user) return;

        const userNameEl = document.getElementById('current-user-name');
        const userRoleEl = document.getElementById('current-user-role');
        const userAvatarEl = document.getElementById('user-avatar');

        if (userNameEl) userNameEl.textContent = this.user.name || 'User';
        if (userRoleEl) userRoleEl.textContent = this.user.role || 'Guest';
        if (userAvatarEl) userAvatarEl.textContent = (this.user.name || 'U').charAt(0).toUpperCase();
    },

    // Set up event listeners for interactive elements
    setupEventListeners() {
        // Toggle sidebar
        const menuToggle = document.getElementById('menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // Theme switcher
        const themeSwitcher = document.getElementById('theme-switcher');
        if (themeSwitcher) {
            themeSwitcher.addEventListener('click', () => this.toggleTheme());
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Setup connection status listeners
        this.setupOnlineListeners();
    },

    // Toggle sidebar expanded/collapsed state
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');

            // Save preference
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarCollapsed', isCollapsed);
        }
    },

    // Toggle between light and dark theme
    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('light-mode');

        // Save preference
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
    },

    // Load theme preference from localStorage
    loadThemePreference() {
        const darkMode = localStorage.getItem('darkMode') === 'true';
        if (darkMode) {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
        }

        // Load sidebar state preference
        const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebarCollapsed) {
            sidebar.classList.add('collapsed');
        }
    },

    // Handle user logout
    async handleLogout() {
        try {
            console.log('Logging out...');

            if (window.api && typeof window.api.logoutUser === 'function') {
                const result = await window.api.logoutUser();

                if (result && result.success) {
                    window.location.href = '../views/login.html';
                } else {
                    console.error('Logout failed:', result);
                    alert('Logout failed. Please try again.');
                }
            } else {
                // Fallback for when API is not available
                window.location.href = '/views/login.html';
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('An error occurred during logout.');
        }
    },

    // Check connection status
    async checkConnectionStatus() {
        try {
            let isOnline = navigator.onLine;

            if (window.api && typeof window.api.getOnlineStatus === 'function') {
                isOnline = await window.api.getOnlineStatus();
            }

            this.updateConnectionUI(isOnline);
        } catch (error) {
            console.error('Error checking online status:', error);
            this.updateConnectionUI(navigator.onLine);
        }
    },

    // Update UI based on connection status
    updateConnectionUI(isOnline) {
        const indicator = document.getElementById('connection-indicator');
        const statusText = document.getElementById('connection-text');

        if (indicator) {
            if (isOnline) {
                indicator.classList.remove('offline');
                indicator.classList.add('online');
            } else {
                indicator.classList.remove('online');
                indicator.classList.add('offline');
            }
        }

        if (statusText) {
            statusText.textContent = isOnline ? 'Online Mode' : 'Offline Mode';
        }
    },

    // Set up listeners for online status changes
    setupOnlineListeners() {
        if (window.api && typeof window.api.onOnlineStatusChanged === 'function') {
            window.api.onOnlineStatusChanged((isOnline) => {
                this.updateConnectionUI(isOnline);
            });
        } else {
            window.addEventListener('online', () => this.updateConnectionUI(true));
            window.addEventListener('offline', () => this.updateConnectionUI(false));
        }
    },

    // Apply role-based access restrictions
    applyRoleBasedAccess(user) {
        if (!user || !user.role) return;

        const inventoryLink = document.getElementById('nav-inventory');
        const reportsLink = document.getElementById('nav-reports');
        const registerLink = document.getElementById('nav-register');
        const dashboardLink = document.getElementById('nav-dashboard');

        if (user.role === 'cashier') {
            // Cashiers can only access billing
            if (inventoryLink) {
                inventoryLink.style.display = 'none';
            }
            if (reportsLink) {
                reportsLink.style.display = 'none';
            }
            if (registerLink) {
                registerLink.style.display = 'none';
            }
            if (dashboardLink) {
                dashboardLink.style.display = 'none';
            }
        } else if (user.role === 'manager') {
            // Managers can access billing and inventory but not reports
            if (reportsLink) {
                reportsLink.style.display = 'none';
            }
            if (registerLink) {
                registerLink.style.display = 'none';
            }
            if (dashboardLink) {
                dashboardLink.style.display = 'none';
            }
        }
        // Admins can access everything (no restrictions)
    },

    // Update inventory badge count
    updateInventoryBadge(count) {
        const badge = document.getElementById('inventory-badge');
        if (badge) {
            badge.textContent = count > 0 ? count : '';
            badge.style.display = count > 0 ? 'block' : 'none';
        }
    }
};

// Export for use in other modules
window.LayoutManager = LayoutManager;