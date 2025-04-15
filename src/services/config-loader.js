const path = require("path");
const fs = require("fs");
const { app } = require("electron");
const Store = require("electron-store");

// Secure storage for sensitive config
const secureStore = new Store({
  name: "secure-config",
  encryptionKey: "your-app-specific-encryption-key", // Change this!
});

/**
 * Loads Firebase configuration securely for both dev and production
 */
function loadFirebaseConfig() {
  // Try loading from different sources in order of preference

  // 1. Try environment variables first (for development)
  if (process.env.FIREBASE_API_KEY && process.env.FIREBASE_PROJECT_ID) {
    console.log("Using Firebase config from environment variables");
    return {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    };
  }

  // 2. Try secure store (for subsequent production runs)
  if (secureStore.has("firebaseConfig")) {
    console.log("Using Firebase config from secure storage");
    return secureStore.get("firebaseConfig");
  }

  // 3. Try .env file in various locations (for first production run)
  const envPaths = [
    path.join(__dirname, "..", "..", ".env"),
    app ? path.join(app.getAppPath(), ".env") : null,
    app ? path.join(app.getPath("userData"), ".env") : null,
  ].filter(Boolean);

  for (const envPath of envPaths) {
    try {
      if (fs.existsSync(envPath)) {
        console.log("Found .env file at:", envPath);
        const envContent = fs.readFileSync(envPath, "utf8");
        const config = parseEnvFile(envContent);

        // Store in secure storage for future use
        secureStore.set("firebaseConfig", config);

        return config;
      }
    } catch (err) {
      console.log(`Error reading .env from ${envPath}:`, err.message);
    }
  }

  // 4. If all else fails, prompt user or use defaults
  console.warn("No Firebase configuration found!");
  return null;
}

/**
 * Parse .env file content
 */
function parseEnvFile(content) {
  const config = {};
  const lines = content.split("\n");

  lines.forEach((line) => {
    if (line.startsWith("FIREBASE_")) {
      const [key, value] = line.split("=");
      if (key && value) {
        const configKey = key
          .replace("FIREBASE_", "")
          .toLowerCase()
          .replace(/_([a-z])/g, (m, p1) => p1.toUpperCase());
        config[configKey] = value.trim();
      }
    }
  });

  return config;
}

module.exports = { loadFirebaseConfig };
