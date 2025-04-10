// i18n.js - Internationalization module for MZLAD Billing System

// Default language
let currentLanguage = 'en';
// Cache for loaded language files
const translations = {
    en: null,
    ar: null
};

// Initialize the i18n module
const i18n = {
    /**
     * Initialize the translation system
     * @param {string} language - The language code to initialize with (default: from localStorage)
     */
    init: async function(language) {
        // Use provided language, or get from localStorage, or default to 'en'
        currentLanguage = language || localStorage.getItem('language') || 'en';

        // Load the current language file if not already loaded
        if (!translations[currentLanguage]) {
            await this.loadLanguageFile(currentLanguage);
        }

        console.log(`i18n initialized with language: ${currentLanguage}`);

        // Setup language change listener
        window.addEventListener('languageChanged', async (event) => {
            const newLanguage = event.detail.language;
            if (newLanguage && newLanguage !== currentLanguage) {
                currentLanguage = newLanguage;

                if (!translations[currentLanguage]) {
                    await this.loadLanguageFile(currentLanguage);
                }

                // Trigger page refresh if requested
                if (event.detail.refresh) {
                    this.updatePageContent();
                }
            }
        });

        return this;
    },

    /**
     * Load a language file
     * @param {string} language - The language code to load
     */
    loadLanguageFile: async function(language) {
        try {
            if (!['en', 'ar'].includes(language)) {
                console.error(`Unsupported language: ${language}`);
                return false;
            }

            // In Electron, we fetch from the local file path
            const response = await fetch(`../locales/${language}.json`);
            translations[language] = await response.json();

            console.log(`Loaded language file: ${language}`);
            return true;
        } catch (error) {
            console.error(`Error loading language file (${language}):`, error);

            // Fallback to English if the requested language fails to load
            if (language !== 'en') {
                if (!translations['en']) {
                    await this.loadLanguageFile('en');
                }
                currentLanguage = 'en';
            }

            return false;
        }
    },

    /**
     * Get a translation by key
     * @param {string} key - The translation key (can be nested with dots)
     * @param {object} params - Optional parameters to replace in the translation
     * @returns {string} - The translated text
     */
    t: function(key, params = {}) {
        // Make sure we have translations loaded
        if (!translations[currentLanguage]) {
            return key; // Return the key itself as fallback
        }

        // Split the key by dots to support nested objects
        const keyParts = key.split('.');
        let value = translations[currentLanguage];

        // Navigate through the nested translation object
        for (const part of keyParts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                // If key not found in current language, try English as fallback
                if (currentLanguage !== 'en' && translations['en']) {
                    let enValue = translations['en'];
                    for (const p of keyParts) {
                        if (enValue && typeof enValue === 'object' && p in enValue) {
                            enValue = enValue[p];
                        } else {
                            enValue = null;
                            break;
                        }
                    }

                    // Use English translation if available, otherwise return the key
                    return enValue || key;
                }

                return key; // Return the key itself if translation not found
            }
        }

        // Replace parameters in the translation string
        if (typeof value === 'string') {
            return this.replaceParams(value, params);
        }

        return key; // Return the key if value is not a string
    },

    /**
     * Replace parameters in a translation string
     * @param {string} text - The text with parameter placeholders
     * @param {object} params - The parameters to replace
     * @returns {string} - The text with replaced parameters
     */
    replaceParams: function(text, params) {
        return Object.keys(params).reduce((result, param) => {
            return result.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
        }, text);
    },

    /**
     * Update UI elements with translations
     */
    updatePageContent: function() {
        // Find all elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');

        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });

        // Handle placeholders for input fields
        const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // Handle titles/tooltips
        const titles = document.querySelectorAll('[data-i18n-title]');
        titles.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
    },

    /**
     * Get current language
     * @returns {string} - The current language code
     */
    getCurrentLanguage: function() {
        return currentLanguage;
    },

    /**
     * Change the current language
     * @param {string} language - The language code to switch to
     * @param {boolean} refresh - Whether to refresh the page content immediately
     */
    changeLanguage: async function(language, refresh = true) {
        if (language === currentLanguage) return;

        if (!translations[language]) {
            const success = await this.loadLanguageFile(language);
            if (!success) return false;
        }

        // Update local storage
        localStorage.setItem('language', language);

        // Set current language
        currentLanguage = language;

        // Dispatch event for other components to react
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: {
                language,
                refresh
            }
        }));

        // Update direction for RTL languages
        if (window.LayoutManager) {
            window.LayoutManager.applyLanguageDirection();
        }

        // Update page content if requested
        if (refresh) {
            this.updatePageContent();
        }

        return true;
    }
};

// Create a shorthand function for translation
const t = (key, params = {}) => i18n.t(key, params);

// Export the module
window.i18n = i18n;
window.t = t;

// Auto-initialize when script is loaded
document.addEventListener('DOMContentLoaded', () => {
    i18n.init().then(() => {
        i18n.updatePageContent();
    });
});