// Create a dedicated activity logger in a new file called activity-logger.js

/**
 * Global activity logger that can be used across the application
 * This ensures consistent activity logging between different pages
 */
class ActivityLogger {
    constructor() {
        this.logKey = 'mzlad_activity_logs';
        this.maxLogs = 50;
    }

    /**
     * Log a new activity
     * @param {string} action - The action performed (update, delete, add, etc.)
     * @param {string} itemType - The type of item (product, invoice, etc.)
     * @param {string} itemName - The name of the item
     * @param {object} additionalInfo - Additional info like badge, text, icon, etc.
     * @returns {boolean} - Success status
     */
    log(action, itemType, itemName, additionalInfo = {}) {
        try {
            console.log(`Logging activity: ${action} - ${itemType} - ${itemName}`);

            // Create new activity log entry
            const activity = {
                action,
                itemType,
                itemName,
                timestamp: new Date().toISOString(),
                ...additionalInfo
            };

            // Get existing logs
            let activityLogs = [];
            try {
                const storedLogs = localStorage.getItem(this.logKey);
                if (storedLogs) {
                    activityLogs = JSON.parse(storedLogs);
                    if (!Array.isArray(activityLogs)) {
                        console.warn('Stored activity logs were not an array, resetting');
                        activityLogs = [];
                    }
                }
            } catch (error) {
                console.error('Error reading activity logs from localStorage:', error);
                activityLogs = [];
            }

            // Add new log
            activityLogs.unshift(activity);

            // Keep only the most recent logs
            if (activityLogs.length > this.maxLogs) {
                activityLogs = activityLogs.slice(0, this.maxLogs);
            }

            // Save back to storage
            localStorage.setItem(this.logKey, JSON.stringify(activityLogs));
            console.log(`Saved activity to localStorage: ${action} for ${itemName}`);

            // If API method exists, also save there
            if (window.api && typeof window.api.saveActivityLog === 'function') {
                window.api.saveActivityLog(activity).catch(error => {
                    console.error("Error saving to API:", error);
                });
            }

            return true;
        } catch (error) {
            console.error("Error logging activity:", error);
            return false;
        }
    }

    /**
     * Get all logged activities
     * @returns {Array} - Activity logs
     */
    getAll() {
        try {
            const storedLogs = localStorage.getItem(this.logKey);
            if (storedLogs) {
                const logs = JSON.parse(storedLogs);
                return Array.isArray(logs) ? logs : [];
            }
        } catch (error) {
            console.error("Error getting activity logs:", error);
        }
        return [];
    }

    /**
     * Clear all activity logs
     */
    clearAll() {
        localStorage.removeItem(this.logKey);
    }
}

// Create global instance
window.activityLogger = window.activityLogger || new ActivityLogger();

// Backward compatibility for older code that uses logActivity directly
function logActivity(action, itemType, itemName, additionalInfo = {}) {
    return window.activityLogger.log(action, itemType, itemName, additionalInfo);
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ActivityLogger,
        logActivity
    };
}