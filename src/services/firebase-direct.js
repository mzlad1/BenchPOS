// services/firebase-direct.js
const { initializeApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");
const { getAuth } = require("firebase/auth");

// Direct Firebase configuration - no environment variables or complex loading
const firebaseConfig = {
  apiKey: "AIzaSyD5YXGZE8LMj_YLrPOh-nyjiLpqZoDouPE",
  authDomain: "msmlal.firebaseapp.com",
  projectId: "msmlal",
  storageBucket: "msmlal.appspot.com",
  messagingSenderId: "908418803307",
  appId: "1:908418803307:web:4889cb78186ef8305d732e",
};

// Initialize Firebase using a named app to avoid conflicts
let app, db, auth;

function initializeFirebaseDirect() {
  try {
    // Use a named app instance to avoid conflicts with default app
    app = initializeApp(firebaseConfig, "direct-auth-app");
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase direct initialized successfully");
    return { app, db, auth };
  } catch (error) {
    console.error("Error initializing Firebase direct:", error);
    // Check if error is about duplicate app
    if (error.code === "app/duplicate-app") {
      try {
        const { getApp } = require("firebase/app");
        app = getApp("direct-auth-app");
        db = getFirestore(app);
        auth = getAuth(app);
        console.log("Retrieved existing direct Firebase app");
        return { app, db, auth };
      } catch (getAppError) {
        console.error("Error getting existing app:", getAppError);
        return { app: null, db: null, auth: null };
      }
    }
    return { app: null, db: null, auth: null };
  }
}

// Initialize immediately
const {
  app: initializedApp,
  db: initializedDB,
  auth: initializedAuth,
} = initializeFirebaseDirect();
app = initializedApp;
db = initializedDB;
auth = initializedAuth;

function isFirebaseConfigured() {
  return app !== null; // If app is not null, it was configured successfully
}

// Export everything needed for authentication with getter methods for safety
module.exports = {
  get app() {
    if (!app) {
      const { app: newApp } = initializeFirebaseDirect();
      return newApp;
    }
    return app;
  },
  get db() {
    if (!db) {
      const { db: newDB } = initializeFirebaseDirect();
      return newDB;
    }
    return db;
  },
  get auth() {
    if (!auth) {
      const { auth: newAuth } = initializeFirebaseDirect();
      return newAuth;
    }
    return auth;
  },
  isFirebaseConfigured,
  firebaseConfig,
  initialize: initializeFirebaseDirect,
};
