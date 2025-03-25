// First, let's add this function to directly modify the DOM once the page is loaded

function setupActivityModal() {
    console.log("Setting up activity modal...");

    // 1. First check if the button exists
    const moreButton = document.querySelector('.activity-header .btn-ghost');
    console.log("More button found:", !!moreButton);

    if (!moreButton) {
        console.error("Activity more button not found. Check your selector.");
        return;
    }

    // 2. Check if modal HTML exists, if not, append it
    let activityModal = document.getElementById('activity-modal');
    if (!activityModal) {
        console.log("Activity modal not found, creating it now...");

        // Create modal HTML
        const modalHTML = `
    <!-- Activity History Modal -->
    <div id="activity-modal" class="modal">
      <div class="modal-content" style="width: 80%; max-width: 800px;">
        <div class="modal-header">
          <h2>Activity History</h2>
          <span class="close" id="close-activity-modal">&times;</span>
        </div>
        <div class="modal-body">
          <!-- Activity filters -->
          <div class="activity-filters">
            <div class="filter-group">
              <label for="activity-type-filter">Type:</label>
              <select id="activity-type-filter">
                <option value="all">All Activities</option>
                <option value="update">Updates</option>
                <option value="delete">Deletions</option>
                <option value="add">Additions</option>
                <option value="sync">Sync</option>
                <option value="sale">Sales</option>
                <option value="stock">Stock</option>
              </select>
            </div>
            <div class="filter-group">
              <label for="activity-date-filter">Date Range:</label>
              <select id="activity-date-filter">
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
            <button id="clear-activity-filters" class="btn secondary-btn">Clear Filters</button>
          </div>

          <!-- Activity list container -->
          <div class="full-activity-list-container">
            <div id="full-activity-list">
              <!-- Activities will be loaded here -->
              <div class="activity-item loading-item">
                <div class="activity-content">
                  <div class="activity-text">Loading activities...</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination controls -->
          <div class="pagination" id="activity-pagination">
            <div class="pagination-controls">
              <button class="btn pagination-btn" id="prev-activity-page" disabled>« Previous</button>
              <span class="page-info" id="activity-page-info">Page 1 of 1</span>
              <button class="btn pagination-btn" id="next-activity-page" disabled>Next »</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

        // Append to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Re-get the modal reference
        activityModal = document.getElementById('activity-modal');
    }

    // 3. Make sure modal styles are defined
    const styleExists = document.querySelector('style[data-activity-modal-styles]');
    if (!styleExists) {
        console.log("Adding modal styles...");

        const modalStyles = `
    <style data-activity-modal-styles>
      .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: auto;
        background-color: rgba(0, 0, 0, 0.5);
      }
      
      .modal-content {
        background-color: var(--base-100, #ffffff);
        margin: 5% auto;
        padding: 0;
        border-radius: var(--border-radius, 8px);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        width: 80%;
        max-width: 800px;
        animation: modalFadeIn 0.3s;
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
      }
      
      .modal-header h2 {
        margin: 0;
        font-size: 1.25rem;
        color: var(--text-primary, #1f2937);
      }
      
      .modal-body {
        padding: 1.5rem;
      }
      
      .close {
        color: var(--text-secondary, #6b7280);
        font-size: 1.5rem;
        font-weight: bold;
        cursor: pointer;
      }
      
      .close:hover {
        color: var(--text-primary, #1f2937);
      }
      
      .full-activity-list-container {
        max-height: 400px;
        overflow-y: auto;
        margin: 15px 0;
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: var(--border-radius, 4px);
      }

      #full-activity-list .activity-item {
        padding: 12px 15px;
        display: flex;
        align-items: center;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
      }

      #full-activity-list .activity-item:last-child {
        border-bottom: none;
      }

      .activity-filters {
        display: flex;
        gap: 15px;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: 10px;
        padding: 10px;
        background-color: var(--base-200, #f3f4f6);
        border-radius: var(--border-radius, 4px);
      }

      .filter-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .filter-group label {
        font-weight: 500;
        color: var(--text-secondary, #6b7280);
      }

      .filter-group select {
        padding: 6px 10px;
        border-radius: var(--border-radius, 4px);
        border: 1px solid var(--border-color, #e5e7eb);
        background-color: var(--base-100, #ffffff);
      }

      .activity-timestamp {
        font-size: 0.8rem;
        color: var(--text-secondary, #6b7280);
        margin-top: 2px;
      }

      #activity-pagination {
        margin-top: 15px;
      }

      .no-activities {
        padding: 20px;
        text-align: center;
        color: var(--text-secondary, #6b7280);
      }
      
      @keyframes modalFadeIn {
        from {opacity: 0; transform: translateY(-20px);}
        to {opacity: 1; transform: translateY(0);}
      }
    </style>`;

        document.head.insertAdjacentHTML('beforeend', modalStyles);
    }

    // 4. Set up event listeners directly
    console.log("Setting up event listeners...");

    // More button click
    moreButton.addEventListener('click', function(e) {
        e.preventDefault();
        console.log("More button clicked");

        // Show modal directly
        if (activityModal) {
            activityModal.style.display = 'block';
            loadFullActivityList();
        } else {
            console.error("Modal element not found after setup");
        }
    });

    // Close button
    const closeBtn = document.getElementById('close-activity-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            console.log("Close button clicked");
            activityModal.style.display = 'none';
        });
    }

    // Click outside to close
    window.addEventListener('click', function(event) {
        if (event.target === activityModal) {
            activityModal.style.display = 'none';
        }
    });

    // Filter event listeners
    const typeFilter = document.getElementById('activity-type-filter');
    const dateFilter = document.getElementById('activity-date-filter');
    const clearFiltersBtn = document.getElementById('clear-activity-filters');

    if (typeFilter) {
        typeFilter.addEventListener('change', function() {
            console.log("Type filter changed");
            activityModalCurrentPage = 1;
            loadFullActivityList();
        });
    }

    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            console.log("Date filter changed");
            activityModalCurrentPage = 1;
            loadFullActivityList();
        });
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            console.log("Clear filters clicked");
            if (typeFilter) typeFilter.value = 'all';
            if (dateFilter) dateFilter.value = 'all';
            activityModalCurrentPage = 1;
            loadFullActivityList();
        });
    }

    // Pagination buttons
    const prevButton = document.getElementById('prev-activity-page');
    const nextButton = document.getElementById('next-activity-page');

    if (prevButton) {
        prevButton.addEventListener('click', function() {
            if (activityModalCurrentPage > 1) {
                activityModalCurrentPage--;
                renderActivityModalPage();
            }
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', function() {
            const totalPages = Math.ceil(filteredActivities.length / activityModalPageSize);
            if (activityModalCurrentPage < totalPages) {
                activityModalCurrentPage++;
                renderActivityModalPage();
            }
        });
    }

    console.log("Activity modal setup complete");
}

// Variables for activity modal pagination
let activityModalCurrentPage = 1;
const activityModalPageSize = 10;
let filteredActivities = [];

// Load full activity list with filtering
async function loadFullActivityList() {
    console.log("Loading full activity list...");

    try {
        const activityList = document.getElementById('full-activity-list');
        if (!activityList) {
            console.error("Full activity list element not found");
            return;
        }

        // Show loading state
        activityList.innerHTML = `
      <div class="activity-item loading-item">
        <div class="activity-content">
          <div class="activity-text">Loading activities...</div>
        </div>
      </div>
    `;

        // Get all activities
        let allActivities = [];

        // Get activities from the global activity logger if available
        if (window.activityLogger && typeof window.activityLogger.getAll === 'function') {
            allActivities = window.activityLogger.getAll();
            console.log(`Loaded ${allActivities.length} activities from global logger`);
        } else {
            // Legacy fallback for localStorage
            try {
                const storedLogs = localStorage.getItem('mzlad_activity_logs');
                if (storedLogs) {
                    allActivities = JSON.parse(storedLogs);
                    console.log(`Loaded ${allActivities.length} activities from localStorage`);
                }
            } catch (error) {
                console.error("Error loading activity logs:", error);
            }
        }

        // Add system activities (sales, low stock, etc.)

        // Get invoices and products if needed for activities
        const invoices = cachedInvoices || await window.api.getInvoices() || [];
        const products = cachedProducts || await window.api.getProducts() || [];

        console.log(`Adding activities from ${invoices.length} invoices and ${products.length} products`);

        // Add sales activities
        invoices.forEach(invoice => {
            allActivities.push({
                action: 'sale',
                itemType: 'invoice',
                itemName: `Invoice #${invoice.id || ''}`,
                timestamp: new Date(invoice.createdAt || Date.now()).toISOString(),
                text: `New sale completed for <strong>$${(invoice.total || 0).toFixed(2)}</strong>`,
                icon: '💵',
                badge: 'Sale',
                badgeClass: 'badge-success'
            });
        });

        // Add low stock activities
        products.filter(product => (product.stock || 0) < 10).forEach(product => {
            allActivities.push({
                action: 'stock',
                itemType: 'product',
                itemName: product.name || 'Unknown',
                timestamp: new Date(product.updatedAt || Date.now()).toISOString(),
                text: `Product <strong>${product.name || 'Unknown'}</strong> is running low on stock (${product.stock || 0} left)`,
                icon: '📦',
                badge: 'Stock',
                badgeClass: 'badge-warning'
            });
        });

        console.log(`Total activities before filtering: ${allActivities.length}`);

        // Apply filters
        const typeFilter = document.getElementById('activity-type-filter');
        const dateFilter = document.getElementById('activity-date-filter');

        if (!typeFilter || !dateFilter) {
            console.error("Filter elements not found");
            return;
        }

        const typeValue = typeFilter.value;
        const dateValue = dateFilter.value;

        console.log(`Applying filters - Type: ${typeValue}, Date: ${dateValue}`);

        // Apply type filter
        if (typeValue !== 'all') {
            allActivities = allActivities.filter(activity => activity.action === typeValue);
        }

        // Apply date filter
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(today.getDate() - 7);
        const oneMonthAgo = new Date(today);
        oneMonthAgo.setMonth(today.getMonth() - 1);

        if (dateValue !== 'all') {
            allActivities = allActivities.filter(activity => {
                const activityDate = new Date(activity.timestamp);

                if (dateValue === 'today') {
                    return activityDate >= today;
                } else if (dateValue === 'week') {
                    return activityDate >= oneWeekAgo;
                } else if (dateValue === 'month') {
                    return activityDate >= oneMonthAgo;
                }

                return true;
            });
        }

        // Sort by timestamp (newest first)
        allActivities.sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            return dateB - dateA;
        });

        console.log(`Activities after filtering: ${allActivities.length}`);

        // Store filtered activities for pagination
        filteredActivities = allActivities;

        // Render the current page
        renderActivityModalPage();

    } catch (error) {
        console.error("Error loading full activity list:", error);
        const activityList = document.getElementById('full-activity-list');

        if (activityList) {
            activityList.innerHTML = `
        <div class="activity-item error-item">
          <div class="activity-content">
            <div class="activity-text">Error loading activities. Please try again.</div>
          </div>
        </div>
      `;
        }
    }
}

// Render current page of activities in the modal
function renderActivityModalPage() {
    console.log(`Rendering activity page ${activityModalCurrentPage}`);

    const activityList = document.getElementById('full-activity-list');
    if (!activityList) {
        console.error("Full activity list element not found for rendering");
        return;
    }

    // Calculate page range
    const startIndex = (activityModalCurrentPage - 1) * activityModalPageSize;
    const endIndex = Math.min(startIndex + activityModalPageSize, filteredActivities.length);
    const currentPageActivities = filteredActivities.slice(startIndex, endIndex);

    console.log(`Displaying activities ${startIndex+1} to ${endIndex} of ${filteredActivities.length}`);

    // Clear activity list
    activityList.innerHTML = '';

    // Check if no activities after filtering
    if (filteredActivities.length === 0) {
        activityList.innerHTML = `
      <div class="no-activities">
        <p>No activities found matching the selected filters.</p>
      </div>
    `;
        console.log("No activities to display");
    } else {
        // Render activities for current page
        currentPageActivities.forEach((activity, index) => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';

            // Format date for display
            const activityDate = new Date(activity.timestamp);
            const dateFormatted = activityDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
            const timeFormatted = activityDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // Create HTML structure
            let html = `
        <div class="activity-icon">${activity.icon || getIconForAction(activity.action)}</div>
        <div class="activity-content">
          <div class="activity-text">${activity.text || getTextForActivity(activity)}</div>
          <div class="activity-timestamp">${dateFormatted} at ${timeFormatted}</div>
        </div>
      `;

            // Add badge if present
            if (activity.badge) {
                html += `<div class="activity-badge ${activity.badgeClass || getBadgeClassForAction(activity.action)}">${activity.badge || activity.action}</div>`;
            }

            activityItem.innerHTML = html;
            activityList.appendChild(activityItem);
        });

        console.log(`Rendered ${currentPageActivities.length} activities`);
    }

    // Update pagination controls
    updateActivityPagination();
}

// Update pagination controls
function updateActivityPagination() {
    const totalPages = Math.ceil(filteredActivities.length / activityModalPageSize);
    const pageInfo = document.getElementById('activity-page-info');
    const prevButton = document.getElementById('prev-activity-page');
    const nextButton = document.getElementById('next-activity-page');

    if (pageInfo) {
        pageInfo.textContent = `Page ${activityModalCurrentPage} of ${totalPages || 1}`;
    }

    if (prevButton) {
        prevButton.disabled = activityModalCurrentPage <= 1;
    }

    if (nextButton) {
        nextButton.disabled = activityModalCurrentPage >= totalPages;
    }

    console.log(`Pagination: Page ${activityModalCurrentPage} of ${totalPages}`);
}

// Helper function to get icon for action if not specified
function getIconForAction(action) {
    switch (action) {
        case 'update': return '✏️';
        case 'delete': return '🗑️';
        case 'add': return '✚';
        case 'sync': return '🔄';
        case 'sale': return '💵';
        case 'stock': return '📦';
        default: return '🔔';
    }
}

// Helper function to get badge class for action if not specified
function getBadgeClassForAction(action) {
    switch (action) {
        case 'update': return 'badge-info';
        case 'delete': return 'badge-danger';
        case 'add': return 'badge-success';
        case 'sync': return 'badge-info';
        case 'sale': return 'badge-success';
        case 'stock': return 'badge-warning';
        default: return 'badge-info';
    }
}

// Helper function to generate text for activity if not specified
function getTextForActivity(activity) {
    switch (activity.action) {
        case 'update':
            return `Updated <strong>${activity.itemName || activity.itemType || 'item'}</strong>`;
        case 'delete':
            return `Deleted <strong>${activity.itemName || activity.itemType || 'item'}</strong>`;
        case 'add':
            return `Added <strong>${activity.itemName || activity.itemType || 'item'}</strong>`;
        case 'sync':
            return 'Data synced with cloud';
        case 'sale':
            return `New sale completed${activity.itemName ? ` for <strong>${activity.itemName}</strong>` : ''}`;
        case 'stock':
            return `Low stock alert for <strong>${activity.itemName || 'product'}</strong>`;
        default:
            return `${activity.action || 'Activity'} for ${activity.itemName || activity.itemType || 'item'}`;
    }
}

// Call this function during document ready or initialization
document.addEventListener('DOMContentLoaded', function() {
    // Add this with your other initialization code
    setTimeout(setupActivityModal, 500); // Small delay to ensure everything is loaded
});

// Alternatively, you can add this to your existing window.onload or document.ready function
// window.addEventListener('load', setupActivityModal);