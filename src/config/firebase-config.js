/**
 * Firebase configuration
 * IMPORTANT: This file contains non-sensitive configuration that can be included in the repo
 */
module.exports = {
  apiKey: process.env.FIREBASE_API_KEY || "your-api-key",
  authDomain:
    process.env.FIREBASE_AUTH_DOMAIN || "your-project-id.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket:
    process.env.FIREBASE_STORAGE_BUCKET || "your-project-id.appspot.com",
  messagingSenderId:
    process.env.FIREBASE_MESSAGING_SENDER_ID || "your-sender-id",
  appId: process.env.FIREBASE_APP_ID || "your-app-id",
};
