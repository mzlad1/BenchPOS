// User Manager JavaScript with i18n support
document.addEventListener("DOMContentLoaded", async function () {
  // Wait for i18n to initialize
  await waitForI18n();

  // Initialize the layout manager with the current page
  if (window.LayoutManager) {
    window.LayoutManager.init("user-manager");
  } else {
    console.error("LayoutManager not available");
  }

  // Once layout is initialized, proceed with initializing the user manager
  initUserManager();
});

let translationsApplied = false;

// Replace the waitForI18n function with this improved version
async function waitForI18n() {
  console.log("User Manager: Waiting for i18n to initialize...");

  // If i18n is already initialized and integrated with layout, return immediately
  if (window.i18n && window.i18n.layoutIntegrated) {
    console.log("User Manager: i18n already initialized and integrated");
    await forceApplyTranslations();
    return;
  }

  // Otherwise wait for the i18nReady event or try to manually initialize
  return new Promise((resolve) => {
    const checkI18n = async () => {
      if (window.i18n && window.i18n.layoutIntegrated) {
        console.log("User Manager: i18n is now initialized and integrated");
        await forceApplyTranslations();
        resolve();
      } else if (window.i18n) {
        // Try to manually initialize if present but not ready
        console.log("User Manager: Trying to manually initialize i18n");
        await window.i18n.init();
        console.log("User Manager: i18n manually initialized");
        await forceApplyTranslations();
        resolve();
      } else {
        // Check again in 100ms
        console.log("User Manager: i18n not found, checking again soon");
        setTimeout(checkI18n, 100);
      }
    };

    // Start checking
    checkI18n();

    // Also listen for the ready event as a backup
    window.addEventListener('i18nReady', async () => {
      console.log("User Manager: i18nReady event received");
      await forceApplyTranslations();
      resolve();
    }, { once: true });

    // Set a timeout to resolve anyway after 3 seconds to prevent hanging
    setTimeout(async () => {
      console.warn("User Manager: i18n initialization timed out, trying one more translation update");
      await forceApplyTranslations();
      resolve();
    }, 3000);
  });
}

// Add this new function to explicitly load translations before applying them
async function forceApplyTranslations() {
  if (translationsApplied) {
    console.log("User Manager: Translations already applied, skipping");
    return;
  }

  try {
    console.log("User Manager: Force applying translations to all elements");

    // Get current language
    const lang = localStorage.getItem('language') || 'en';
    console.log(`User Manager: Current language: ${lang}`);

    // First ensure translations are loaded
    if (window.i18n) {
      // Try to directly load the translation file for current language
      try {
        // Try absolute paths - this might work better in Electron
        const possiblePaths = [
          `/locales/${lang}.json`,
          `./locales/${lang}.json`,
          `../locales/${lang}.json`,
          `${lang}.json`
        ];

        console.log("User Manager: Trying to load translations from paths:", possiblePaths);

        let translationsLoaded = false;

        for (const path of possiblePaths) {
          try {
            const response = await fetch(path);
            if (response.ok) {
              const data = await response.json();
              console.log(`User Manager: Successfully loaded translations from ${path}`);

              // Flatten and apply translations
              if (typeof window.i18n.flattenTranslations === 'function') {
                const flattened = window.i18n.flattenTranslations(data);

                // Merge with existing translations
                window.i18n.translations[lang] = {
                  ...(window.i18n.translations[lang] || {}),
                  ...flattened
                };

                console.log(`User Manager: Added ${Object.keys(flattened).length} translations`);
                translationsLoaded = true;
                break;
              }
            }
          } catch (e) {
            console.warn(`User Manager: Failed loading from ${path}:`, e);
          }
        }

        if (!translationsLoaded) {
          console.warn(`User Manager: Could not load translations for ${lang} from files`);
        }
      } catch (e) {
        console.error("User Manager: Error loading translation file:", e);
      }

      // Log available translations before applying
      if (window.i18n.translations && window.i18n.translations[lang]) {
        console.log(`User Manager: Available translation keys: ${Object.keys(window.i18n.translations[lang]).length}`);

        // Debug: Log some specific keys
        const keysToCheck = [
          'userManager.table.name',
          'userManager.table.email',
          'userManager.filters.allStatus',
          'userManager.filters.allRoles',
          'userManager.modal.addUser'
        ];

        keysToCheck.forEach(key => {
          console.log(`User Manager: Translation for "${key}": ${window.i18n.translations[lang][key] || "NOT FOUND"}`);
        });
      } else {
        console.warn(`User Manager: No translations available for ${lang}`);
      }

      // Now manually apply translations to all elements with data-i18n
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        console.log(`User Manager: Translating element with key: ${key}`);

        let translated = window.t(key);
        if (translated === key) {
          console.warn(`User Manager: Translation not found for key: ${key}`);
        } else {
          console.log(`User Manager: Translated "${key}" to "${translated}"`);
        }

        el.textContent = translated;
      });

      // Update placeholders
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const translated = window.t(key);
        console.log(`User Manager: Setting placeholder for key: ${key} to "${translated}"`);
        el.setAttribute('placeholder', translated);
      });

      // After manual translation, call the official update method
      if (typeof window.i18n.updatePageContent === 'function') {
        window.i18n.updatePageContent();
      }

      translationsApplied = true;

      // Add a listener for language changes to reapply translations
      window.addEventListener('languageChanged', async () => {
        console.log("User Manager: Language changed, reapplying translations");
        translationsApplied = false; // Reset so we can apply again
        await forceApplyTranslations();
      });
    }
  } catch (error) {
    console.error("User Manager: Error in forceApplyTranslations:", error);
  }
}

// Initialize variables - don't try to access IPC yet
let currentUsers = [];
let currentPage = 1;
const usersPerPage = 10;
let totalUsers = 0;
let currentFilters = {
  search: "",
  role: "all",
  status: "all",
};
let currentUser = null;
let actionCallback = null;
let ipcRenderer = null;

// Initialize user manager
function initUserManager() {
  console.log("Initializing user manager...");

  // Make sure translations are applied to the page
  if (window.i18n) {
    console.log("Updating page content with translations");
    window.i18n.updatePageContent();setTimeout(async () => {
      await forceApplyTranslations();
    }, 500);
  }

  // For demo purposes without IPC, load sample users
  if (!window.api || !window.api.ipcRenderer) {
    console.warn("IPC renderer bridge not found, using sample data");
    loadSampleUsers();
    return;
  }

  // Make sure the API bridge is available through window.api
  if (window.api && window.api.ipcRenderer) {
    console.log("IPC renderer bridge is available");
    ipcRenderer = window.api.ipcRenderer;
  } else {
    console.error("IPC renderer bridge not found");
    showNotification(
        window.t("userManager.errors.ipcNotAvailable", "Application error: IPC communication not available"),
        "error"
    );
    return;
  }

  document
      .getElementById("user-search")
      .addEventListener("input", handleSearch);
  document
      .getElementById("role-filter")
      .addEventListener("change", handleFilterChange);
  document
      .getElementById("status-filter")
      .addEventListener("change", handleFilterChange);
  document
      .getElementById("prev-page")
      .addEventListener("click", () => changePage(currentPage - 1));
  document
      .getElementById("next-page")
      .addEventListener("click", () => changePage(currentPage + 1));

  // Modal event listeners
  document
      .getElementById("user-form")
      .addEventListener("submit", handleUserSubmit);
  document
      .getElementById("cancel-user-btn")
      .addEventListener("click", closeUserModal);
  document.querySelectorAll(".modal .close").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      closeModal(e.target.closest(".modal").id);
    });
  });
  document
      .getElementById("cancel-confirm-btn")
      .addEventListener("click", () => closeModal("confirm-modal"));
  document
      .getElementById("confirm-action-btn")
      .addEventListener("click", handleConfirmAction);

  // Check authentication and fetch users
  checkAuth()
      .then(() => {
        fetchUsers();
      })
      .catch((error) => {
        console.error("Authentication error:", error);
        showNotification(
            window.t("userManager.errors.authRequired", "You must be logged in to access user management."),
            "error"
        );
        // Redirect to login after a delay
        setTimeout(() => {
          window.location.href = "login.html";
        }, 2000);
      });

  // Global click listener to close modals when clicking outside
  window.addEventListener("click", (event) => {
    const modals = document.querySelectorAll(".modal");
    modals.forEach((modal) => {
      if (event.target === modal) {
        closeModal(modal.id);
      }
    });
  });
}

// Check if the user is authenticated and authorized
async function checkAuth() {
  // If no API (demo mode), resolve immediately
  if (!window.api) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    // Use window.api.getCurrentUser instead of IPC invoke directly
    window.api
        .getCurrentUser()
        .then((user) => {
          if (user && user.role === "admin") {
            currentUser = user;
            resolve();
          } else {
            showNotification(
                window.t("userManager.errors.permissionDenied", "You do not have permission to access this page."),
                "error"
            );
            reject(new Error("Unauthorized"));
          }
        })
        .catch((error) => {
          console.error("Error checking authentication:", error);
          reject(error);
        });
  });
}

// Fetch users from Firestore via IPC
async function fetchUsers() {
  try {
    const usersTableBody = document.getElementById("users-table-body");

    // Show loading state
    usersTableBody.innerHTML = `
      <tr class="loading-row">
        <td colspan="6">
          <div class="loading-spinner"></div>
          <div class="loading-text">${window.t("common.loading", "Loading...")}</div>
        </td>
      </tr>
    `;

    // Create a filters object for the backend API
    // Only include role and status filters for the backend
    const filterParams = {
      roleFilter: currentFilters.role !== "all" ? currentFilters.role : null,
      statusFilter:
          currentFilters.status !== "all" ? currentFilters.status : null,
    };

    console.log("Sending filter parameters to backend:", filterParams);

    // Use IPC to get users from Firestore via main process
    const users = await window.api.getUsers(filterParams);

    console.log(`Received ${users.length} users from API`);

    // Apply client-side search filtering
    let filteredUsers = users;
    if (currentFilters.search && currentFilters.search.length > 0) {
      const searchTerm = currentFilters.search.toLowerCase();
      filteredUsers = users.filter(
          (user) =>
              (user.name && user.name.toLowerCase().includes(searchTerm)) ||
              (user.email && user.email.toLowerCase().includes(searchTerm)) ||
              (user.role && user.role.toLowerCase().includes(searchTerm)) ||
              (user.status && user.status.toLowerCase().includes(searchTerm))
      );
      console.log(
          `Filtered to ${filteredUsers.length} users after client-side search for "${searchTerm}"`
      );
    }

    // Store the filtered users
    currentUsers = filteredUsers;
    totalUsers = filteredUsers.length;

    // Update the UI
    updatePagination();
    renderUsers();

    if (users.length > 0) {
      console.log("Users loaded successfully");
    } else {
      showNotification(window.t("userManager.noUsersFound", "No users match the current filters"), "info");
    }
  } catch (error) {
    console.error("Error fetching users:", error);
    showNotification(window.t("userManager.errors.loadFailed", "Failed to load users. Please try again."), "error");

    const usersTableBody = document.getElementById("users-table-body");
    usersTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <p>${window.t("userManager.errors.loadError", "There was an error loading users. Please try again.")}</p>
        </td>
      </tr>
    `;
  }
}

// Render users on the current page
function renderUsers() {
  const usersTableBody = document.getElementById("users-table-body");

  // If no users, show empty state
  if (currentUsers.length === 0) {
    usersTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <p>${window.t("userManager.noUsersFoundAdjust", "No users found. Try adjusting your filters or add a new user.")}</p>
        </td>
      </tr>
    `;
    return;
  }

  // Calculate pagination
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = Math.min(startIndex + usersPerPage, currentUsers.length);
  const usersToDisplay = currentUsers.slice(startIndex, endIndex);

  // Clear the table
  usersTableBody.innerHTML = "";

  // Add users to the table
  usersToDisplay.forEach((user) => {
    const row = document.createElement("tr");

    // Add a class for deleted users to style them differently
    if (user.status === "deleted") {
      row.classList.add("deleted-user");
    }

    // Format last login time
    let lastLoginText = window.t("userManager.userNeverLoggedIn", "Never");
    if (user.lastLogin) {
      const lastLogin = new Date(user.lastLogin);
      // Format the date in a standardized way with English numerals
      lastLoginText = lastLogin.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    }

    // Determine status display
    const statusDisplay = user.status || "inactive";
    const statusText = window.t(`userManager.status.${statusDisplay}`, statusDisplay);

    const roleDisplay = user.role || "Unknown";
    const roleText = window.t(`user.roles.${roleDisplay.toLowerCase()}`, roleDisplay);

    row.innerHTML = `
      <td>${user.name || "N/A"}</td>
      <td>${user.email || "N/A"}</td>
      <td><span class="user-role ${roleDisplay.toLowerCase()}">${roleText}</span></td>
      <td><span class="user-status ${statusDisplay.toLowerCase()}">${statusText}</span></td>
      <td>${lastLoginText}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn edit-btn" data-id="${user.id}" 
                  title="${window.t("common.edit", "Edit")}" ${user.status === "deleted" ? "disabled" : ""}>
            ✏️
          </button>
          <button class="action-btn delete-btn" data-id="${user.id}" 
                  title="${window.t("common.delete", "Delete")}" ${user.status === "deleted" ? "disabled" : ""}>
            🗑️
          </button>
        </div>
      </td>
    `;

    // Add event listeners to the buttons
    const editBtn = row.querySelector(".edit-btn");
    const deleteBtn = row.querySelector(".delete-btn");

    editBtn.addEventListener("click", () => showEditUserModal(user.id));
    deleteBtn.addEventListener("click", () => showDeleteConfirmation(user.id));

    usersTableBody.appendChild(row);
  });
}

// Update pagination controls
// Replace your current updatePagination function with this fixed version
function updatePagination() {
  const totalPages = Math.ceil(totalUsers / usersPerPage);
  const paginationDetails = document.getElementById("pagination-details");
  const pageIndicator = document.getElementById("page-indicator");
  const prevPageBtn = document.getElementById("prev-page");
  const nextPageBtn = document.getElementById("next-page");

  // Adjust current page if needed
  if (currentPage > totalPages && totalPages > 0) {
    currentPage = totalPages;
  }

  // Update the page indicator
  const pageOfTemplate = window.t("userManager.pagination.pageOf", "Page {current} of {total}");
  pageIndicator.textContent = pageOfTemplate
      .replace("{current}", currentPage)
      .replace("{total}", totalPages || 1);

  // Update pagination details
  const startIndex = (currentPage - 1) * usersPerPage + 1;
  const endIndex = Math.min(startIndex + usersPerPage - 1, totalUsers);

  if (totalUsers === 0) {
    paginationDetails.textContent = window.t("userManager.noUsersFound", "No users found");
  } else {
    // Use manual template substitution instead of relying on t() function's args handling
    const template = window.t("userManager.pagination.showingRange", "Showing {start} to {end} of {total} users");
    paginationDetails.textContent = template
        .replace("{start}", startIndex)
        .replace("{end}", endIndex)
        .replace("{total}", totalUsers);
  }

  // Enable/disable pagination buttons
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

// Change the current page
function changePage(newPage) {
  currentPage = newPage;
  updatePagination();
  renderUsers();

  // Scroll to the top of the table
  document.querySelector(".users-table-container").scrollTop = 0;
}

// Handle search input
function handleSearch(event) {
  // Update the search filter term
  currentFilters.search = event.target.value.trim();

  // Log for debugging
  console.log(`Search term updated: "${currentFilters.search}"`);

  // Reset to first page when filtering
  currentPage = 1;

  // Otherwise, fetch with updated filters
  fetchUsers();
}

// Handle filter changes
function handleFilterChange(event) {
  const filterId = event.target.id;
  const filterValue = event.target.value;

  console.log(`Filter changed: ${filterId} = ${filterValue}`); // Debug log

  if (filterId === "role-filter") {
    currentFilters.role = filterValue;
  } else if (filterId === "status-filter") {
    currentFilters.status = filterValue;
  }

  console.log("Current filters:", currentFilters); // Debug log for filter state

  // Reset to first page when filtering
  currentPage = 1;

  // Clear previous results
  const usersTableBody = document.getElementById("users-table-body");
  usersTableBody.innerHTML = `
      <tr class="loading-row">
        <td colspan="6">
          <div class="loading-spinner"></div>
          <div class="loading-text">${window.t("userManager.filtering", "Filtering users...")}</div>
        </td>
      </tr>
    `;

  // Otherwise, fetch from API with filters
  fetchUsers();
}

// Show the edit user modal
async function showEditUserModal(userId) {
  try {
    const modalTitle = document.getElementById("modal-title");
    const userForm = document.getElementById("user-form");
    const passwordField = document.getElementById("user-password");
    const passwordInfo = document.getElementById("password-info");

    modalTitle.textContent = window.t("userManager.modal.editUser", "Edit User");
    userForm.reset();
    userForm.dataset.mode = "edit";
    userForm.dataset.userId = userId;

    // Password is optional when editing
    passwordField.required = false;
    passwordInfo.textContent = window.t("userManager.modal.passwordKeep", "Leave blank to keep current password");

    // Show loading state
    document.getElementById("save-user-btn").disabled = true;

    // Fetch user data using IPC
    const userData = await ipcRenderer.invoke("get-user-by-id", userId);

    if (!userData) {
      showNotification(window.t("userManager.errors.userNotFound", "User not found"), "error");
      closeModal("user-modal");
      return;
    }

    // Fill the form with user data
    document.getElementById("user-name").value = userData.name || "";
    document.getElementById("user-email").value = userData.email || "";
    document.getElementById("user-role").value = userData.role || "";
    document.getElementById("user-status").value = userData.status || "active";

    // Empty the password field
    document.getElementById("user-password").value = "";

    // Enable the save button
    document.getElementById("save-user-btn").disabled = false;

    openModal("user-modal");
  } catch (error) {
    console.error("Error loading user data:", error);
    showNotification(window.t("userManager.errors.loadUserData", "Failed to load user data"), "error");
  }
}

// Handle user form submission (add/edit)
async function handleUserSubmit(event) {
  event.preventDefault();

  const form = event.target;
  const mode = form.dataset.mode;
  const userId = form.dataset.userId;
  const saveBtn = document.getElementById("save-user-btn");

  // Get form values
  const name = document.getElementById("user-name").value.trim();
  const email = document
      .getElementById("user-email")
      .value.trim()
      .toLowerCase();
  const role = document.getElementById("user-role").value;
  const password = document.getElementById("user-password").value;
  const status = document.getElementById("user-status").value;

  // Disable the save button while processing
  saveBtn.disabled = true;

  try {
    if (mode === "edit") {
      // Update user data via IPC
      const result = await ipcRenderer.invoke("update-user", {
        id: userId,
        name,
        email,
        password, // Will be handled on the main process side if empty
        role,
        status,
      });

      if (result.success) {
        showNotification(window.t("userManager.success.userUpdated", "User updated successfully"), "success");
      } else {
        throw new Error(result.message || window.t("userManager.errors.updateFailed", "Failed to update user"));
      }
    }

    // Close the modal and refresh the user list
    closeModal("user-modal");
    fetchUsers();
  } catch (error) {
    console.error("Error saving user:", error);
    let errorMessage = error.message || window.t("userManager.errors.saveFailed", "Failed to save user");

    showNotification(errorMessage, "error");
    saveBtn.disabled = false;
  }
}

// Show delete confirmation modal
function showDeleteConfirmation(userId) {
  const confirmMessage = document.getElementById("confirm-message");
  confirmMessage.textContent = window.t(
      "userManager.confirm.deleteMessage",
      "Are you sure you want to delete this user? This action cannot be undone."
  );

  // Set up the callback for confirmation
  actionCallback = async () => {
    try {
      // Don't allow deleting yourself
      if (userId === currentUser.id) {
        showNotification(window.t("userManager.errors.cannotDeleteSelf", "You cannot delete your own account"), "error");
        return;
      }
      // Delete the user via IPC
      const result = await ipcRenderer.invoke("delete-user", userId);

      if (result.success) {
        showNotification(window.t("userManager.success.userDeleted", "User deleted successfully"), "success");
        fetchUsers();
      } else {
        throw new Error(result.message || window.t("userManager.errors.deleteFailed", "Failed to delete user"));
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      showNotification(window.t("userManager.errors.deleteFailed", "Failed to delete user") + ": " + error.message, "error");
    }
  };

  openModal("confirm-modal");
}

// Handle confirmation modal action
function handleConfirmAction() {
  if (typeof actionCallback === "function") {
    actionCallback();
    actionCallback = null;
  }

  closeModal("confirm-modal");
}

// Open a modal
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "block";
  }
}

// Close a modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
  }
}

// Close the user modal
function closeUserModal() {
  closeModal("user-modal");
}

function showNotification(message, type = "info") {
  const notification = document.getElementById("notification");

  // Clear existing classes
  notification.className = "notification";

  // Add the type class
  notification.classList.add(type);

  // Set the message
  notification.textContent = message;

  // Show the notification
  notification.classList.add("show");

  // Hide after 5 seconds
  setTimeout(() => {
    notification.classList.remove("show");
  }, 5000);
}