// services/firebase-core.js
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  enableIndexedDbPersistence,
} = require("firebase/firestore");
const { getAuth } = require("firebase/auth");
const { loadFirebaseConfig } = require("./config-loader");

// Load Firebase configuration securely
let firebaseConfig = loadFirebaseConfig();

// If no config is found, use the hardcoded config from firebase.js
if (
  !firebaseConfig ||
  !firebaseConfig.apiKey ||
  firebaseConfig.apiKey === "MISSING-API-KEY"
) {
  console.log("Loading hardcoded Firebase config as fallback");
  firebaseConfig = {
    apiKey: "AIzaSyD5YXGZE8LMj_YLrPOh-nyjiLpqZoDouPE",
    authDomain: "msmlal.firebaseapp.com",
    projectId: "msmlal",
    storageBucket: "msmlal.appspot.com",
    messagingSenderId: "908418803307",
    appId: "1:908418803307:web:4889cb78186ef8305d732e",
  };
}

// Check if Firebase is properly configured
function isFirebaseConfigured() {
  return !!(
    firebaseConfig &&
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
let initialized = false;

// This function ensures Firebase is initialized before use
function initFirebase() {
  if (initialized) return { app, db, auth };

  try {
    if (isFirebaseConfigured()) {
      // Check if Firebase app already exists (to avoid duplicate initialization)
      try {
        const { getApp } = require("firebase/app");
        app = getApp(); // Will throw if no default app exists
        console.log("Using existing Firebase app instance");
      } catch (appError) {
        // App doesn't exist yet, create it
        app = initializeApp(firebaseConfig);
        console.log("Created new Firebase app instance");
      }

      // Get services from the app
      db = getFirestore(app);
      auth = getAuth(app);
      console.log("Firebase core initialized successfully");
      initialized = true;

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
      console.warn(
        "Firebase not properly configured, using local storage only"
      );
    }
  } catch (error) {
    console.error("Error initializing Firebase core:", error);
  }

  return { app, db, auth };
}

// Call initFirebase immediately to initialize on module load
initFirebase();

// Getter methods to ensure we always return initialized instances
function getFirebaseApp() {
  const { app } = initFirebase();
  return app;
}

function getFirestoreDB() {
  const { db } = initFirebase();
  return db;
}

function getFirebaseAuth() {
  const { auth } = initFirebase();
  return auth;
}

module.exports = {
  get app() {
    return getFirebaseApp();
  },
  get db() {
    return getFirestoreDB();
  },
  get auth() {
    return getFirebaseAuth();
  },
  isFirebaseConfigured,
  firebaseConfig, // Only export this in development
  getConfig,
  initialize: initFirebase, // Export explicit initialization function
};
