// User Manager JavaScript
document.addEventListener("DOMContentLoaded", function () {
  // Initialize the layout manager with the current page
  if (window.LayoutManager) {
    window.LayoutManager.init("user-manager");
  } else {
    console.error("LayoutManager not available");
  }

  // Once layout is initialized, proceed with initializing the user manager
  initUserManager();
});

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
      "Application error: IPC communication not available",
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
        "You must be logged in to access user management.",
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
            "You do not have permission to access this page.",
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
// Fetch users from Firestore via IPC
async function fetchUsers() {
  try {
    const usersTableBody = document.getElementById("users-table-body");

    // Show loading state
    usersTableBody.innerHTML = `
      <tr class="loading-row">
        <td colspan="6">
          <div class="loading-spinner"></div>
          <div class="loading-text">Loading users...</div>
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
      showNotification("No users match the current filters", "info");
    }
  } catch (error) {
    console.error("Error fetching users:", error);
    showNotification("Failed to load users. Please try again.", "error");

    const usersTableBody = document.getElementById("users-table-body");
    usersTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <p>There was an error loading users. Please try again.</p>
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
          <p>No users found. Try adjusting your filters or add a new user.</p>
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
    let lastLoginText = "Never";
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
    const roleDisplay = user.role || "Unknown";

    row.innerHTML = `
      <td>${user.name || "N/A"}</td>
      <td>${user.email || "N/A"}</td>
      <td><span class="user-role ${roleDisplay.toLowerCase()}">${roleDisplay}</span></td>
      <td><span class="user-status ${statusDisplay.toLowerCase()}">${statusDisplay}</span></td>
      <td>${lastLoginText}</td>
      <td>
        <div class="action-buttons">
          <button class="action-btn edit-btn" data-id="${user.id}" 
                  title="Edit" ${user.status === "deleted" ? "disabled" : ""}>
            ✏️
          </button>
          <button class="action-btn delete-btn" data-id="${user.id}" 
                  title="Delete" ${user.status === "deleted" ? "disabled" : ""}>
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

// Rest of the functions remain the same as in your original code
// Update pagination controls
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
  pageIndicator.textContent = `Page ${currentPage} of ${totalPages || 1}`;

  // Update pagination details
  const startIndex = (currentPage - 1) * usersPerPage + 1;
  const endIndex = Math.min(startIndex + usersPerPage - 1, totalUsers);

  if (totalUsers === 0) {
    paginationDetails.textContent = "No users found";
  } else {
    paginationDetails.textContent = `Showing ${startIndex} to ${endIndex} of ${totalUsers} users`;
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
          <div class="loading-text">Filtering users...</div>
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

    modalTitle.textContent = "Edit User";
    userForm.reset();
    userForm.dataset.mode = "edit";
    userForm.dataset.userId = userId;

    // Password is optional when editing
    passwordField.required = false;
    passwordInfo.textContent = "Leave blank to keep current password";

    // Show loading state
    document.getElementById("save-user-btn").disabled = true;

    // Fetch user data using IPC
    const userData = await ipcRenderer.invoke("get-user-by-id", userId);

    if (!userData) {
      showNotification("User not found", "error");
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
    showNotification("Failed to load user data", "error");
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
        showNotification("User updated successfully", "success");
      } else {
        throw new Error(result.message || "Failed to update user");
      }
    }

    // Close the modal and refresh the user list
    closeModal("user-modal");
    fetchUsers();
  } catch (error) {
    console.error("Error saving user:", error);
    let errorMessage = error.message || "Failed to save user";

    showNotification(errorMessage, "error");
    saveBtn.disabled = false;
  }
}

// Show delete confirmation modal
function showDeleteConfirmation(userId) {
  const confirmMessage = document.getElementById("confirm-message");
  confirmMessage.textContent =
    "Are you sure you want to delete this user? This action cannot be undone.";

  // Set up the callback for confirmation
  actionCallback = async () => {
    try {
      // Don't allow deleting yourself
      if (userId === currentUser.id) {
        showNotification("You cannot delete your own account", "error");
        return;
      }
      // Delete the user via IPC
      const result = await ipcRenderer.invoke("delete-user", userId);

      if (result.success) {
        showNotification("User deleted successfully", "success");
        fetchUsers();
      } else {
        throw new Error(result.message || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      showNotification("Failed to delete user: " + error.message, "error");
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
