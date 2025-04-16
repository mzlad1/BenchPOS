// i18n.js - Integrated Translation System with LayoutManager Support
// Designed to ensure translations are always available for layout components

/**
 * Translation Cache - Persistent storage of translations
 */

class TranslationCache {
  constructor(prefix = "i18n_cache_") {
    this.prefix = prefix;
    this.ttl = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  getTranslations(lang) {
    try {
      const cacheKey = `${this.prefix}${lang}`;
      const cached = localStorage.getItem(cacheKey);

      if (!cached) return null;

      const { timestamp, data } = JSON.parse(cached);

      if (Date.now() - timestamp > this.ttl) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return data;
    } catch (e) {
      console.warn("Error reading translation cache:", e);
      return null;
    }
  }

  setTranslations(lang, data) {
    try {
      const cacheKey = `${this.prefix}${lang}`;
      const cacheObject = {
        timestamp: Date.now(),
        data: data,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheObject));
    } catch (e) {
      console.warn("Error writing translation cache:", e);
    }
  }
}

/**
 * Basic minimal translations that must always be available
 * These are critical for the layout to function - keep this list minimal
 */
const CORE_TRANSLATIONS = {
  en: {
    // App
    // "app.name": "MZLAD Billing System",
    // // Sidebar
    // "sidebar.dashboard": "Dashboard",
    // "sidebar.newSale": "New Sale",
    // "sidebar.inventory": "Inventory",
    // "sidebar.reports": "Reports",
    // "sidebar.registerUser": "Register new User",
    // "sidebar.userManager": "User Manager",
    // "sidebar.system": "System",
    // "sidebar.settings": "Settings",
    // "sidebar.helpCenter": "Help Center",
    // // User roles
    // "user.roles.admin": "Administrator",
    // "user.roles.manager": "Manager",
    // "user.roles.cashier": "Cashier",
    // "user.roles.guest": "Guest",
    // // Header
    // "header.searchPlaceholder": "Search...",
    // "header.onlineMode": "Online Mode",
    // "header.offlineMode": "Offline Mode",
    // // User functions
    // "user.logout": "Logout",
    // "user.confirmLogout": "Are you sure you want to log out?",
    // "user.logoutFailed": "Logout failed. Please try again.",
    // "user.logoutError": "An error occurred during logout.",
    // // Common inventory items
    // "inventory.table.edit": "Edit",
    // "inventory.table.delete": "Delete",
    // "inventory.pagination.previous": "« Previous",
    // "inventory.pagination.next": "Next »",
    // "inventory.pagination.page": "Page {current} of {total}",
    // "inventory.bulkActions.selected": "{count} items selected",
    // "common.loading": "Loading...",
    // "settings.tabs.general": "General",
    // "settings.tabs.receipt": "Receipts",
    // "settings.receipt.companyInfoSection": "Company Information",
    // "settings.receipt.contactInfoSection": "Contact Information",
    // "settings.receipt.contentSection": "Receipt Content",
    // "settings.receipt.styleSection": "Receipt Style",
    // "settings.receipt.companyName": "Company Name",
    // "settings.receipt.companyTagline": "Company Tagline",
    // "settings.receipt.logo": "Logo",
    // "settings.receipt.noLogo": "No Logo",
    // "settings.receipt.logoHelp": "Upload a logo image (PNG, JPG, max 200KB)",
    // "settings.receipt.address": "Address",
    // "settings.receipt.phone": "Phone",
    // "settings.receipt.email": "Email",
    // "settings.receipt.website": "Website",
    // "settings.receipt.footer": "Receipt Footer",
    // "settings.receipt.returnPolicy": "Return Policy",
    // "settings.receipt.themeColor": "Theme Color",
    // "settings.receipt.autoPrint": "Auto Print",
    // "settings.receipt.autoPrintDescription":
    //   "Automatically print receipt after completing sale",
    // "settings.receipt.updatePreview": "Update Preview",
    // "settings.receipt.companyInfoSection": "Company Information",
    // "settings.receipt.contactInfoSection": "Contact Information",
    // "settings.receipt.contentSection": "Receipt Content",
    // "settings.receipt.styleSection": "Receipt Style",
    // "settings.receipt.livePreview": "Live Preview",
    // "settings.dataManagement.title": "Data Management",
    // "settings.dataManagement.autoSync": "Auto Sync",
    // "settings.dataManagement.autoSyncDescription":
    //   "Automatically sync data with the server",
    // "settings.dataManagement.syncInterval": "Sync Interval",
    // "settings.dataManagement.syncIntervals.15min": "Every 15 minutes",
    // "settings.dataManagement.syncIntervals.30min": "Every 30 minutes",
    // "settings.dataManagement.syncIntervals.60min": "Every hour",
    // "settings.dataManagement.syncIntervals.manual": "Manual only",
    // "settings.dataManagement.storageLocation": "Storage Location",
    // "settings.dataManagement.browse": "Browse",
    // "settings.regional.title": "Regional",
    // "settings.regional.language": "Language",
    // "settings.regional.currency": "Currency",
    // "settings.regional.dateFormat": "Date Format",
    // "settings.appearance.title": "Appearance",
    // "settings.appearance.theme": "Theme",
    // "settings.appearance.lightMode": "Light Mode",
    // "settings.appearance.darkMode": "Dark Mode",
    // "settings.appearance.systemDefault": "System Default",
    // "settings.appearance.sidebarBehavior": "Sidebar Behavior",
    // "settings.appearance.collapsedByDefault": "Collapsed by Default",
    // "settings.title": "Settings",
    // "settings.subtitle": "Configure your preferences",
    // "settings.reset": "Reset to Defaults",
    // "settings.save": "Save Changes",
    // "common.delete": "Delete",
  },
  ar: {
    // App
    // "app.name": "نظام بينش للفواتير",
    // // Sidebar
    // "sidebar.dashboard": "لوحة التحكم",
    // "sidebar.newSale": "بيع جديد",
    // "sidebar.inventory": "المخزون",
    // "sidebar.reports": "التقارير",
    // "sidebar.registerUser": "تسجيل مستخدم جديد",
    // "sidebar.userManager": "إدارة المستخدمين",
    // "sidebar.system": "النظام",
    // "sidebar.settings": "الإعدادات",
    // "sidebar.helpCenter": "مركز المساعدة",
    // // User roles
    // "user.roles.admin": "مسؤول",
    // "user.roles.manager": "مدير",
    // "user.roles.cashier": "أمين الصندوق",
    // "user.roles.guest": "ضيف",
    // // Header
    // "header.searchPlaceholder": "بحث...",
    // "header.onlineMode": "وضع متصل",
    // "header.offlineMode": "وضع غير متصل",
    // // User functions
    // "user.logout": "تسجيل الخروج",
    // "user.confirmLogout": "هل أنت متأكد أنك تريد تسجيل الخروج؟",
    // "user.logoutFailed": "فشل تسجيل الخروج. يرجى المحاولة مرة أخرى.",
    // "user.logoutError": "حدث خطأ أثناء تسجيل الخروج.",
    // // Common inventory items
    // "inventory.table.edit": "تعديل",
    // "inventory.table.delete": "حذف",
    // "inventory.pagination.previous": "« السابق",
    // "inventory.pagination.next": "التالي »",
    // "inventory.pagination.page": "الصفحة {current} من {total}",
    // "inventory.bulkActions.selected": "{count} عنصر محدد",
    // "common.loading": "جاري التحميل...",
    // "settings.tabs.general": "عام",
    // "settings.tabs.receipt": "إعدادات الإيصال",
    // "settings.receipt.companyInfoSection": "معلومات الشركة",
    // "settings.receipt.contactInfoSection": "معلومات الاتصال",
    // "settings.receipt.contentSection": "محتوى الإيصال",
    // "settings.receipt.styleSection": "نمط الإيصال",
    // "settings.receipt.companyName": "اسم الشركة",
    // "settings.receipt.companyTagline": "شعار الشركة",
    // "settings.receipt.logo": "الشعار",
    // "settings.receipt.noLogo": "بدون شعار",
    // "settings.receipt.logoHelp":
    //   "تحميل صورة الشعار (PNG, JPG, بحد أقصى 200 كيلوبايت)",
    // "settings.receipt.address": "العنوان",
    // "settings.receipt.phone": "الهاتف",
    // "settings.receipt.email": "البريد الإلكتروني",
    // "settings.receipt.website": "الموقع الإلكتروني",
    // "settings.receipt.footer": "تذييل الإيصال",
    // "settings.receipt.returnPolicy": "سياسة الإرجاع",
    // "settings.receipt.themeColor": "لون السمة",
    // "settings.receipt.autoPrint": "طباعة تلقائية",
    // "settings.receipt.autoPrintDescription":
    //   "طباعة الإيصال تلقائياً بعد إكمال البيع",
    // "settings.receipt.updatePreview": "تحديث المعاينة",
    // "settings.receipt.companyInfoSection": "معلومات الشركة",
    // "settings.receipt.contactInfoSection": "معلومات الاتصال",
    // "settings.receipt.contentSection": "محتوى الإيصال",
    // "settings.receipt.styleSection": "نمط الإيصال",
    // "settings.receipt.livePreview": "معاينة مباشرة",
    // "settings.title": "الإعدادات",
    // "settings.subtitle": "تكوين التفضيلات الخاصة بك",
    // "settings.reset": "إعادة التعيين إلى الافتراضي",
    // "settings.save": "حفظ التغييرات",
    // "settings.appearance.title": "المظهر",
    // "settings.appearance.theme": "السمة",
    // "settings.appearance.lightMode": "الوضع الفاتح",
    // "settings.appearance.darkMode": "الوضع الداكن",
    // "settings.appearance.systemDefault": "افتراضي النظام",
    // "settings.appearance.sidebarBehavior": "سلوك الشريط الجانبي",
    // "settings.appearance.collapsedByDefault": "مطوي افتراضياً",
    // "settings.regional.title": "الإعدادات الإقليمية",
    // "settings.regional.language": "اللغة",
    // "settings.regional.currency": "العملة",
    // "settings.regional.dateFormat": "تنسيق التاريخ",
    // "settings.dataManagement.title": "إدارة البيانات",
    // "settings.dataManagement.autoSync": "المزامنة التلقائية",
    // "settings.dataManagement.autoSyncDescription":
    //   "مزامنة البيانات تلقائياً مع الخادم",
    // "settings.dataManagement.syncInterval": "فترة المزامنة",
    // "settings.dataManagement.syncIntervals.15min": "كل 15 دقيقة",
    // "settings.dataManagement.syncIntervals.30min": "كل 30 دقيقة",
    // "settings.dataManagement.syncIntervals.60min": "كل ساعة",
    // "settings.dataManagement.syncIntervals.manual": "يدوياً فقط",
    // "settings.dataManagement.storageLocation": "موقع التخزين",
    // "settings.dataManagement.browse": "تصفح",
    // "common.delete": "حذف",
  },
};

// Create the translation function immediately
window.t = function (key, args) {
  // Get the current selected language
  const lang = localStorage.getItem("language") || "en";

  // Helper function to process template variables
  const processTemplate = (text, args) => {
    if (!args || typeof args !== "object" || typeof text !== "string")
      return text;
    return text.replace(/{(\w+)}/g, (match, name) => {
      return args[name] !== undefined ? args[name] : match;
    });
  };

  // First check if i18n is fully initialized and has this key
  if (
    window.i18n &&
    window.i18n.translations &&
    window.i18n.translations[lang] &&
    window.i18n.translations[lang][key]
  ) {
    return processTemplate(window.i18n.translations[lang][key], args);
  }

  // Next check core translations
  if (CORE_TRANSLATIONS[lang] && CORE_TRANSLATIONS[lang][key]) {
    return processTemplate(CORE_TRANSLATIONS[lang][key], args);
  }

  // Fall back to English core translations
  if (lang !== "en" && CORE_TRANSLATIONS.en && CORE_TRANSLATIONS.en[key]) {
    return processTemplate(CORE_TRANSLATIONS.en[key], args);
  }

  // Last resort: return the key itself
  return key;
};

/**
 * Main i18n system
 */
const i18n = {
  // Current language
  currentLanguage: "en",

  // Translation data store
  translations: {
    en: { ...CORE_TRANSLATIONS.en }, // Initialize with core translations
    ar: { ...CORE_TRANSLATIONS.ar }, // Initialize with core translations
  },

  // Cache system
  cache: new TranslationCache(),

  // Debugging
  debug: true,

  // Layout integration flag
  layoutIntegrated: false,

  /**
   * Initialize the i18n system
   */
  async init() {
    console.log("i18n initialization started");

    try {
      // Load language preference
      this.currentLanguage = localStorage.getItem("language") || "en";

      // Apply RTL/LTR direction immediately
      this.applyLanguageDirection();

      // Check if LayoutManager exists and integrate with it
      this.integrateWithLayout();

      // Load translations with multiple fallbacks
      await this.loadAllTranslations();

      // Update the page content with translations
      this.updatePageContent();

      // Notify application that i18n is ready
      window.dispatchEvent(new Event("i18nReady"));

      console.log(`i18n initialized with language: ${this.currentLanguage}`);
      console.log(
        `Translation keys loaded: ${
          Object.keys(this.translations[this.currentLanguage]).length
        }`
      );

      return true;
    } catch (error) {
      console.error("Error initializing i18n:", error);
      return false;
    }
  },

  /**
   * Integrate with LayoutManager if available
   */
  integrateWithLayout() {
    if (window.LayoutManager) {
      console.log("Integrating i18n with LayoutManager");

      // Store original methods that we'll need to enhance
      const originalGetPageTitle = window.LayoutManager.getPageTitle;
      const originalUpdatePageContent = this.updatePageContent;

      // Enhance LayoutManager.getPageTitle to always use our translations
      window.LayoutManager.getPageTitle = () => {
        // Original implementation with guaranteed translation
        const page = window.LayoutManager.currentPage;

        switch (page) {
          case "dashboard":
            return window.t("sidebar.dashboard");
          case "inventory":
            return window.t("sidebar.inventory");
          case "billing":
            return window.t("sidebar.newSale");
          case "reports":
            return window.t("sidebar.reports");
          case "register":
            return window.t("sidebar.registerUser");
          case "user-manager":
            return window.t("sidebar.userManager");
          case "settings":
            return window.t("sidebar.settings");
          case "help":
            return window.t("sidebar.helpCenter");
          default:
            return window.t("app.name");
        }
      };

      // Enhanced updatePageContent that also updates LayoutManager
      this.updatePageContent = () => {
        // Call the original method
        originalUpdatePageContent.call(this);

        // Update layout-specific elements
        if (window.LayoutManager) {
          // Update page title
          const pageTitleEl = document.getElementById("page-title");
          if (pageTitleEl) {
            pageTitleEl.textContent = window.LayoutManager.getPageTitle();
          }

          // Update user profile
          window.LayoutManager.updateUserProfile();

          // Update connection status text
          const statusText = document.getElementById("connection-text");
          if (statusText) {
            const isOnline =
              statusText.textContent.includes("Online") ||
              statusText.getAttribute("data-i18n") === "header.onlineMode";

            statusText.textContent = isOnline
              ? window.t("header.onlineMode")
              : window.t("header.offlineMode");
          }
        }
      };

      // Listen for language changes to update layout
      window.addEventListener("languageChanged", () => {
        if (window.LayoutManager) {
          window.LayoutManager.applyLanguageDirection();
        }
      });

      this.layoutIntegrated = true;
    }
  },

  /**
   * Load all translations using multiple strategies
   */
  async loadAllTranslations() {
    const loadPromises = [];

    // Load current language
    loadPromises.push(
      this.loadTranslationsFromMultipleSources(this.currentLanguage)
    );

    // Also load English if not current language
    if (this.currentLanguage !== "en") {
      loadPromises.push(this.loadTranslationsFromMultipleSources("en"));
    }

    // Wait for all loads to complete
    await Promise.all(loadPromises);
  },

  /**
   * Try to load translations from various sources
   */
  async loadTranslationsFromMultipleSources(lang) {
    // First try to get from cache
    const cached = this.cache.getTranslations(lang);
    if (cached) {
      this.translations[lang] = {
        ...this.translations[lang], // Keep core translations
        ...cached, // Add cached translations
      };
      if (this.debug)
        console.log(
          `Loaded ${
            Object.keys(cached).length
          } translations for ${lang} from cache`
        );
      return true;
    }

    // Build array of possible JSON file locations based on project structure
    const possiblePaths = [
      // Relative to the current page
      `../locales/${lang}.json`,
      `./${lang}.json`,
      `./locales/${lang}.json`,

      // Absolute paths based on project structure
      `/locales/${lang}.json`,
      `/src/locales/${lang}.json`,
    ];

    // Try each path in order
    for (const path of possiblePaths) {
      try {
        if (this.debug) console.log(`Trying to load ${lang} from: ${path}`);

        const response = await fetch(path);
        if (!response.ok) continue;

        const data = await response.json();
        const flattened = this.flattenTranslations(data);

        // Merge with existing translations (keeping core translations)
        this.translations[lang] = {
          ...this.translations[lang], // Keep core translations
          ...flattened, // Add loaded translations
        };

        // Cache for future use
        this.cache.setTranslations(lang, flattened);

        if (this.debug)
          console.log(
            `Successfully loaded ${
              Object.keys(flattened).length
            } translations for ${lang} from ${path}`
          );
        return true;
      } catch (error) {
        if (this.debug)
          console.warn(`Failed to load ${lang} from ${path}:`, error);
      }
    }

    console.warn(
      `Could not load additional translations for ${lang}, using core translations only`
    );
    return false;
  },

  /**
   * Change the current language
   */
  async changeLanguage(lang) {
    if (lang !== "en" && lang !== "ar") {
      console.warn(`Unsupported language: ${lang}`);
      return false;
    }

    try {
      // Update state
      this.currentLanguage = lang;
      localStorage.setItem("language", lang);

      // Apply RTL/LTR layout
      this.applyLanguageDirection();

      // Try to load translations if needed
      if (
        Object.keys(this.translations[lang]).length <=
        Object.keys(CORE_TRANSLATIONS[lang]).length
      ) {
        await this.loadTranslationsFromMultipleSources(lang);
      }

      // Update all UI elements
      this.updatePageContent();

      // Notify other components
      window.dispatchEvent(new Event("languageChanged"));

      return true;
    } catch (error) {
      console.error(`Error changing language to ${lang}:`, error);
      return false;
    }
  },
  /**
   * Force reload translations from JSON files
   * @param {string} lang - Language code to reload
   * @returns {Promise<boolean>} - Success status
   */
  async reloadResources(lang) {
    console.log(`Forcing reload of translations for ${lang}...`);

    // Enable debug to see detailed logs
    this.debug = true;

    try {
      // Build array of possible JSON file locations
      const possiblePaths = [
        // Relative to the current page (most likely scenario)
        `locales/${lang}.json`,
        `./${lang}.json`,
        `./locales/${lang}.json`,
        `../locales/${lang}.json`,

        // Absolute paths
        `/locales/${lang}.json`,
        `/src/locales/${lang}.json`,
      ];

      // Try each path
      for (const path of possiblePaths) {
        try {
          console.log(`Trying to load ${lang} from: ${path}`);

          const response = await fetch(path, {
            cache: "no-store", // Force fresh load
            headers: { "Content-Type": "application/json" },
          });

          if (!response.ok) {
            console.log(
              `File not found at ${path}, status: ${response.status}`
            );
            continue;
          }

          // Parse the JSON
          const data = await response.json();
          const flattened = this.flattenTranslations(data);

          console.log(
            `Successfully loaded translations from ${path}`,
            flattened
          );

          // Merge with existing translations (keeping core translations)
          this.translations[lang] = {
            ...CORE_TRANSLATIONS[lang], // Keep core translations
            ...flattened, // Add loaded translations
          };

          // Update the cache
          this.cache.setTranslations(lang, flattened);

          // Notify that translations have changed
          window.dispatchEvent(new Event("translationsLoaded"));

          return true;
        } catch (error) {
          console.error(`Failed to load ${lang} from ${path}:`, error);
        }
      }

      console.warn(`Could not load translations for ${lang} from any path`);
      return false;
    } finally {
      // Reset debug flag
      this.debug = false;
    }
  },
  /**
   * Apply language direction (RTL for Arabic, LTR for others)
   */
  applyLanguageDirection() {
    const rtlLanguages = ["ar", "he", "fa", "ur"];
    const isRtl = rtlLanguages.includes(this.currentLanguage);

    // Set direction attribute
    document.documentElement.dir = isRtl ? "rtl" : "ltr";

    // Apply RTL class
    if (isRtl) {
      document.documentElement.classList.add("rtl");
      document.documentElement.classList.remove("ltr");
      document.body.classList.add("rtl-layout");
    } else {
      document.documentElement.classList.add("ltr");
      document.documentElement.classList.remove("rtl");
      document.body.classList.remove("rtl-layout");
    }
  },

  /**
   * Flatten nested translation objects into dot notation
   */
  flattenTranslations(obj, prefix = "") {
    if (!obj || typeof obj !== "object") return {};

    return Object.keys(obj).reduce((acc, key) => {
      const prefixedKey = prefix ? `${prefix}.${key}` : key;

      if (typeof obj[key] === "object" && obj[key] !== null) {
        Object.assign(acc, this.flattenTranslations(obj[key], prefixedKey));
      } else {
        acc[prefixedKey] = obj[key];
      }

      return acc;
    }, {});
  },

  /**
   * Get translation for a key with optional argument replacement
   */
  translate(key, args) {
    if (!key) return "";

    const lang = this.currentLanguage;

    // First try current language
    if (this.translations[lang] && this.translations[lang][key]) {
      return this.replaceVariables(this.translations[lang][key], args);
    }

    // Fallback to English
    if (lang !== "en" && this.translations.en && this.translations.en[key]) {
      if (this.debug) console.warn(`Using English fallback for: ${key}`);
      return this.replaceVariables(this.translations.en[key], args);
    }

    // If no translation found, return the key
    if (this.debug) console.warn(`Translation key not found: ${key}`);
    return key;
  },

  /**
   * Replace template variables in a string
   */
  replaceVariables(text, args) {
    if (!args || typeof args !== "object" || typeof text !== "string")
      return text;

    return text.replace(/{(\w+)}/g, (match, key) => {
      return args[key] !== undefined ? args[key] : match;
    });
  },

  /**
   * Parse data-i18n-args attribute value
   */
  parseArgsAttribute(argsValue) {
    if (!argsValue) return null;

    try {
      return JSON.parse(argsValue);
    } catch (e) {
      console.error("Error parsing data-i18n-args:", e);
      return null;
    }
  },

  /**
   * Update all translatable elements on the page
   */
  updatePageContent() {
    try {
      // Elements with data-i18n attribute
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        const argsAttr = el.getAttribute("data-i18n-args");
        const args = argsAttr ? this.parseArgsAttribute(argsAttr) : null;

        el.textContent = this.translate(key, args);
      });

      // Placeholder attributes
      document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        el.setAttribute("placeholder", this.translate(key));
      });

      // Title attributes
      document.querySelectorAll("[data-i18n-title]").forEach((el) => {
        const key = el.getAttribute("data-i18n-title");
        el.setAttribute("title", this.translate(key));
      });

      // Page title
      const titleEl = document.querySelector("title[data-i18n]");
      if (titleEl) {
        const key = titleEl.getAttribute("data-i18n");
        document.title = this.translate(key);
      }

      console.log("Page content updated with translations");
    } catch (error) {
      console.error("Error updating page content with translations:", error);
    }
  },
};

// Export to window
window.i18n = i18n;
