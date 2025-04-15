const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  enableIndexedDbPersistence,
} = require("firebase/firestore");
const { getAuth } = require("firebase/auth");
const { loadFirebaseConfig } = require("./config-loader");

// Load Firebase configuration securely
let firebaseConfig = loadFirebaseConfig();

// If no config is found, use a placeholder that will fail gracefully
if (!firebaseConfig) {
  firebaseConfig = {
    apiKey: "MISSING-API-KEY",
    authDomain: "missing.firebaseapp.com",
    projectId: "missing",
  };
}

// Check if Firebase is properly configured
function isFirebaseConfigured() {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "MISSING-API-KEY" &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
  );
}

// Export a safe version of the config (no sensitive data)
function getConfig() {
  return {
    apiKey: firebaseConfig.apiKey ? "API_KEY_SET" : "MISSING",
    authDomain: firebaseConfig.authDomain || "MISSING",
    projectId: firebaseConfig.projectId || "MISSING",
    isConfigured: isFirebaseConfigured(),
  };
}

// Initialize Firebase singleton
let app = null;
let db = null;
let auth = null;

try {
  if (isFirebaseConfigured()) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase core initialized successfully");

    // Enable offline persistence
    try {
      enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === "failed-precondition") {
          console.warn(
            "Multiple tabs open, persistence can only be enabled in one tab at a time."
          );
        } else if (err.code === "unimplemented") {
          console.warn(
            "The current browser doesn't support all of the features required to enable persistence"
          );
        }
      });
      console.log("Offline persistence enabled");
    } catch (error) {
      console.error("Error with persistence setup:", error);
    }
  } else {
    console.warn("Firebase not properly configured, using local storage only");
  }
} catch (error) {
  console.error("Error initializing Firebase core:", error);
}

module.exports = {
  app,
  db,
  auth,
  isFirebaseConfigured,
  firebaseConfig, // Only export this in development
  getConfig,
};
