// services/auth.js
const { initializeApp } = require("firebase/app");
const {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} = require("firebase/auth");
const { getFirestore, doc, setDoc, getDoc } = require("firebase/firestore");
const bcrypt = require("bcryptjs");
const ElectronStore = require("electron-store");
const localStore = new ElectronStore({ name: "shop-billing-local-data" });

// Firebase config is the same as your firebase.js file
const firebaseConfig = {
  apiKey: "AIzaSyC6z4Ci0QvHlLtonZLDAlyJHH7Km0B_PI0",
  authDomain: "shop-d44bb.firebaseapp.com",
  projectId: "shop-d44bb",
  storageBucket: "shop-d44bb.firebasestorage.app",
  messagingSenderId: "624712206371",
  appId: "1:624712206371:web:3e93f2354ed96164804996",
};

// Initialize Firebase app separate from the database module
let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("Firebase auth initialized");
} catch (error) {
  console.error("Failed to initialize Firebase auth:", error);
}

// Track current user
let currentUser = null;

// Initialize local users if none exist
if (!localStore.has("users")) {
  // Create a default admin user for first-time setup
  const salt = bcrypt.genSaltSync(10);
  const defaultAdmin = {
    id: "admin",
    email: "admin@example.com",
    name: "Administrator",
    passwordHash: bcrypt.hashSync("admin123", salt),
    role: "admin",
    createdAt: new Date().toISOString(),
  };

  localStore.set("users", [defaultAdmin]);
  console.log("Created default admin user:", defaultAdmin.email);
}

// Login user
async function loginUser(credentials) {
  try {
    const { email, password, isOnline } = credentials;

    // Try to use Firebase if online
    if (isOnline && auth) {
      try {
        console.log("Attempting Firebase login");
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const firebaseUser = userCredential.user;

        // Get user profile from Firestore
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        let userData;

        if (userDoc.exists()) {
          userData = userDoc.data();
        } else {
          // Create a basic user record if it doesn't exist
          userData = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || email.split("@")[0],
            role: "cashier", // Default role
            createdAt: new Date().toISOString(),
          };

          // Save to Firestore
          await setDoc(doc(db, "users", firebaseUser.uid), userData);
        }

        // Save user to local storage for offline login
        syncUserToLocal(userData, password);

        // Set current user
        currentUser = { ...userData, authProvider: "firebase" };

        return { success: true, user: userData };
      } catch (firebaseError) {
        console.error("Firebase login failed:", firebaseError);

        // Fall back to local login if Firebase authentication fails
        console.log("Falling back to local login");
        return localLogin(email, password);
      }
    } else {
      // Offline mode: use local authentication
      console.log("Using local login (offline)");
      return localLogin(email, password);
    }
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: error.message };
  }
}

// Local login
function localLogin(email, password) {
  try {
    const users = localStore.get("users") || [];
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      return {
        success: false,
        message:
          "User not found. Login requires internet connection for first-time users.",
      };
    }

    // Verify password
    if (!bcrypt.compareSync(password, user.passwordHash)) {
      return { success: false, message: "Invalid password." };
    }

    // Set current user
    currentUser = { ...user, authProvider: "local" };

    return { success: true, user };
  } catch (error) {
    console.error("Local login error:", error);
    return { success: false, message: error.message };
  }
}

// Register new user
async function registerUser(userData) {
  try {
    const { name, email, password, role } = userData;

    // Check if user already exists locally
    const users = localStore.get("users") || [];
    const existingUser = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      return { success: false, message: "Email already in use." };
    }

    // Create user in Firebase
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;

    // Create user profile in Firestore
    const newUser = {
      id: firebaseUser.uid,
      email,
      name,
      role: role || "cashier",
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, "users", firebaseUser.uid), newUser);

    // Save user locally for offline login
    syncUserToLocal(newUser, password);

    return { success: true, user: newUser };
  } catch (error) {
    console.error("Registration error:", error);

    // Firebase error codes: https://firebase.google.com/docs/auth/admin/errors
    if (error.code === "auth/email-already-in-use") {
      return { success: false, message: "Email already in use." };
    } else if (error.code === "auth/weak-password") {
      return { success: false, message: "Password is too weak." };
    } else if (error.code === "auth/invalid-email") {
      return { success: false, message: "Invalid email address." };
    }

    return { success: false, message: error.message };
  }
}

// Sync Firebase user to local storage
function syncUserToLocal(userData, plainPassword) {
  try {
    const users = localStore.get("users") || [];

    // Remove existing user with same ID or email if exists
    const filteredUsers = users.filter(
      (u) =>
        u.id !== userData.id &&
        u.email.toLowerCase() !== userData.email.toLowerCase()
    );

    // Hash password for local storage
    const salt = bcrypt.genSaltSync(10);
    const userWithHash = {
      ...userData,
      passwordHash: bcrypt.hashSync(plainPassword, salt),
    };

    // Add user to local storage
    filteredUsers.push(userWithHash);
    localStore.set("users", filteredUsers);

    console.log("User synced to local storage:", userData.email);
    return true;
  } catch (error) {
    console.error("Error syncing user to local:", error);
    return false;
  }
}

// Get current user
function getCurrentUser() {
  return currentUser || null;
}

// Logout user
async function logoutUser() {
  try {
    // Firebase logout if auth is available
    if (auth) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Firebase logout error:", error);
      }
    }

    // Clear current user
    currentUser = null;

    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false, message: error.message };
  }
}

function checkPagePermission(page, userRole) {
  // Define page access by role
  const permissions = {
    "billing.html": ["admin", "manager", "cashier"], // Everyone can access billing
    "inventory.html": ["admin", "manager"], // Admins and managers
    "reports.html": ["admin"], // Only admins
    "index.html": ["admin"], // Only admins
  };

  // Check if the page exists in permissions
  if (!permissions[page]) return false;

  // Check if user role has permission
  return permissions[page].includes(userRole);
}

// Check if user has a specific permission
function checkPermission(permission) {
  if (!currentUser) return false;

  // Define permission matrix based on roles
  const permissions = {
    admin: [
      "manage_users",
      "manage_inventory",
      "view_reports",
      "create_sales",
      "delete_sales",
      "sync_data",
    ],
    manager: [
      "manage_inventory",
      "view_reports",
      "create_sales",
      "delete_sales",
      "sync_data",
    ],
    cashier: ["create_sales", "view_reports"],
  };

  const rolePermissions = permissions[currentUser.role] || [];
  return rolePermissions.includes(permission);
}

// Export all the auth functions
module.exports = {
  checkPagePermission,
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser,
  checkPermission,
};
