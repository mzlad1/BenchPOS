// services/firebase-config.js
const path = require("path");
const { app } = require("electron");
require("dotenv").config();

// Determine environment path
const envPath =
  process.env.NODE_ENV === "production"
    ? path.join(process.resourcesPath, ".env")
    : path.join(__dirname, "..", ".env");

// Load environment variables
require("dotenv").config({ path: envPath });

// Use environment variables for Firebase config
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Check if Firebase config has valid values
const isFirebaseConfigured = () => {
  return (
    firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.apiKey !== "undefined" &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID" &&
    firebaseConfig.projectId !== "undefined"
  );
};

module.exports = {
  firebaseConfig,
  isFirebaseConfigured,
};
