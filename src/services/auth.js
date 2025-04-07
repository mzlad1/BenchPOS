// services/auth.js
const { initializeApp } = require("firebase/app");
const {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} = require("firebase/auth");
const {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
} = require("firebase/firestore");
const bcrypt = require("bcryptjs");
const ElectronStore = require("electron-store");
const localStore = new ElectronStore({ name: "shop-billing-local-data" });
const secureStore = require("./secureStore");
const { firebaseConfig, isFirebaseConfigured } = require("../config");

// Initialize Firebase only if properly configured
let firebaseApp = null;
let auth = null;
let db = null;

try {
  if (isFirebaseConfigured()) {
    firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    console.log("Firebase auth initialized successfully");
  } else {
    console.warn(
      "Firebase not configured properly, falling back to local auth"
    );
  }
} catch (error) {
  console.error("Failed to initialize Firebase auth:", error);
}

// Track current user
let currentUser = null;

// Get user credentials from secure store
const getUserCredentials = () => {
  try {
    return secureStore.load();
  } catch (error) {
    console.error("Error loading credentials from secure store:", error);
    return null;
  }
};

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

// Login user with online/offline support
async function loginUser(credentials) {
  try {
    const { email, password, isOnline } = credentials;

    // Try to use Firebase if online and configured
    if (isOnline && auth && isFirebaseConfigured()) {
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

          // Update last login time
          await updateDoc(doc(db, "users", firebaseUser.uid), {
            lastLogin: new Date().toISOString(),
          });
        } else {
          // Create a basic user record if it doesn't exist
          userData = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName || email.split("@")[0],
            role: determineUserRole(email),
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };

          // Save to Firestore
          await setDoc(doc(db, "users", firebaseUser.uid), userData);
          console.log("Created new user record in Firestore");
        }

        // Save user to local storage for offline login
        syncUserToLocal(userData, password);

        // Store credentials securely
        storeUserCredentials({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: userData.name,
          role: userData.role,
          accessToken: firebaseUser.accessToken,
          refreshToken: firebaseUser.refreshToken,
        });

        // Set current user
        currentUser = { ...userData, authProvider: "firebase" };

        // Sync users with Firebase for better local data
        await syncUsersWithFirebase(firebaseUser.uid, isOnline);

        return { success: true, user: userData };
      } catch (firebaseError) {
        console.error("Firebase login failed:", firebaseError);

        // Fall back to local login if Firebase authentication fails
        console.log("Falling back to local login");
        return await localLogin(email, password, isOnline);
      }
    } else {
      // Offline mode: use local authentication
      console.log("Using local login (offline)");
      return await localLogin(email, password, isOnline);
    }
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, message: error.message };
  }
}

// Helper to determine user role based on email
function determineUserRole(email) {
  // You can customize this logic based on your requirements
  if (email.includes("admin") || email === "admin@example.com") {
    return "admin";
  } else if (email.includes("manager")) {
    return "manager";
  } else {
    return "cashier"; // Default role
  }
}

// Store user credentials securely
function storeUserCredentials(user) {
  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    tokens: {
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
    },
    lastLogin: new Date().toISOString(),
  };

  secureStore.save(userData);
}

// Get current user
function getCurrentUser() {
  // If we already have a currentUser, return it
  if (currentUser) return currentUser;

  // Try to load from secure storage if available
  try {
    const storedUser = secureStore.load();
    if (storedUser) {
      currentUser = {
        id: storedUser.uid,
        email: storedUser.email,
        name: storedUser.displayName,
        role: storedUser.role,
        authProvider: "firebase",
      };
      return currentUser;
    }
  } catch (error) {
    console.error("Error loading user from secure storage:", error);
  }

  return null;
}

/**
 * Synchronize Firebase users with local storage
 * This should be called after login when online
 * @param {string} currentUserId - ID of the currently logged in user
 * @returns {Promise<boolean>} - Success status
 */
async function syncUsersWithFirebase(currentUserId, isOnline) {
  try {
    if (!db || !isFirebaseConfigured() || !isOnline) {
      console.log("Cannot sync users: Firebase not available or offline");
      return false;
    }

    console.log("Syncing users with Firebase...");

    // Get all users from Firestore
    const userCollection = collection(db, "users");
    const snapshot = await getDocs(userCollection);
    const firebaseUsers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get local users
    const localUsers = localStore.get("users") || [];

    // Create a map of Firebase users by ID and email
    const firebaseUserMap = new Map();
    const firebaseEmailMap = new Map();

    firebaseUsers.forEach((user) => {
      firebaseUserMap.set(user.id, user);
      if (user.email) {
        firebaseEmailMap.set(user.email.toLowerCase(), user);
      }
    });

    // Filter local users to keep only those that exist in Firebase
    // (except for the current user which we always keep)
    const validLocalUsers = localUsers.filter((localUser) => {
      // Always keep the current user
      if (localUser.id === currentUserId) {
        return true;
      }

      // Keep users that exist in Firebase by ID or email
      return (
        firebaseUserMap.has(localUser.id) ||
        (localUser.email && firebaseEmailMap.has(localUser.email.toLowerCase()))
      );
    });

    // Add any Firebase users that don't exist locally
    // (we can't add password hashes, but this makes them visible in UI)
    firebaseUsers.forEach((fbUser) => {
      const existsLocally = validLocalUsers.some(
        (localUser) =>
          localUser.id === fbUser.id ||
          (localUser.email &&
            fbUser.email &&
            localUser.email.toLowerCase() === fbUser.email.toLowerCase())
      );

      if (!existsLocally && fbUser.email) {
        // Add skeleton user - they'll need to login online once to set password
        validLocalUsers.push({
          ...fbUser,
          // Use a hash that will never match any password
          passwordHash: "$2a$10$INVALID_USER_NEEDS_ONLINE_LOGIN",
          syncedFromFirebase: true,
        });
      }
    });

    // Update local storage
    localStore.set("users", validLocalUsers);
    console.log(`User sync completed: ${validLocalUsers.length} valid users`);

    return true;
  } catch (error) {
    console.error("Error syncing users with Firebase:", error);
    return false;
  }
}

// Local login fallback
// Update to make this function async
async function localLogin(email, password, isOnline) {
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

    // Check if we're online and should validate against Firebase
    if (isOnline && auth && isFirebaseConfigured()) {
      try {
        // Check if user exists in Firebase
        const firebaseUserQuery = query(
          collection(db, "users"),
          where("email", "==", email.toLowerCase())
        );
        const querySnapshot = await getDocs(firebaseUserQuery);

        // If user doesn't exist in Firebase but exists locally, they might have been deleted
        if (querySnapshot.empty) {
          console.log(
            "User exists locally but not in Firebase. Account may have been deleted."
          );

          // Remove from local storage only if we confirm they don't exist in Firebase
          const updatedUsers = users.filter(
            (u) => u.email.toLowerCase() !== email.toLowerCase()
          );
          localStore.set("users", updatedUsers);

          return {
            success: false,
            message:
              "Your account appears to have been deleted. Please contact administrator.",
          };
        }
      } catch (error) {
        console.error("Error validating user against Firebase:", error);
        // Continue with local login as fallback
      }
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
    const { name, email, password, role, status } = userData;

    // Check if Firebase is available
    if (!auth || !isFirebaseConfigured()) {
      return {
        success: false,
        message: "User registration requires internet connection.",
      };
    }

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
      status: (status || "active").toLowerCase(), // Explicitly include status
      createdAt: new Date().toISOString(),
    };

    console.log("Registering user with details:", {
      email,
      name,
      role: role || "cashier",
      status: (status || "active").toLowerCase(),
    });

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
function syncUserToLocal(userData, plainPassword = null) {
  try {
    const users = localStore.get("users") || [];

    // Find existing user
    const existingUserIndex = users.findIndex(
      (u) =>
        u.id === userData.id ||
        (u.email &&
          userData.email &&
          u.email.toLowerCase() === userData.email.toLowerCase())
    );

    let updatedUser;

    if (existingUserIndex >= 0) {
      // Update existing user
      const existingUser = users[existingUserIndex];

      // Only update password if a new one is provided
      if (plainPassword) {
        const salt = bcrypt.genSaltSync(10);
        updatedUser = {
          ...existingUser,
          ...userData,
          passwordHash: bcrypt.hashSync(plainPassword, salt),
          updatedAt: new Date().toISOString(),
        };
      } else {
        // Keep existing password hash
        updatedUser = {
          ...existingUser,
          ...userData,
          passwordHash: existingUser.passwordHash,
          updatedAt: new Date().toISOString(),
        };
      }

      // Replace the user in the array
      users[existingUserIndex] = updatedUser;
    } else {
      // Add new user
      if (!plainPassword) {
        console.error("Cannot add new user without password");
        return false;
      }

      const salt = bcrypt.genSaltSync(10);
      updatedUser = {
        ...userData,
        passwordHash: bcrypt.hashSync(plainPassword, salt),
        createdAt: new Date().toISOString(),
      };

      users.push(updatedUser);
    }

    // Save updated users to local storage
    localStore.set("users", users);

    console.log("User synced to local storage:", userData.email);
    return true;
  } catch (error) {
    console.error("Error syncing user to local:", error);
    return false;
  }
}
async function updateUser(userData) {
  try {
    // Update in Firestore
    await setDoc(doc(db, "users", userData.id), userData, { merge: true });

    // Get current local users
    const users = localStore.get("users") || [];

    // Find the index of the user to update
    const userIndex = users.findIndex((u) => u.id === userData.id);

    if (userIndex !== -1) {
      // Update the user in local storage
      users[userIndex] = {
        ...users[userIndex],
        ...userData,
        updatedAt: new Date().toISOString(),
      };

      // Remove password if not updating
      if (!userData.password) {
        delete users[userIndex].passwordHash;
      }

      // Save updated users back to local storage
      localStore.set("users", users);
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, message: error.message };
  }
}

// Delete user function with local storage sync
async function deleteUser(userId) {
  try {
    // Update status to "deleted" in Firestore
    await updateDoc(doc(db, "users", userId), {
      status: "deleted",
      updatedAt: new Date().toISOString(),
    });

    // Update status to "deleted" in local storage
    const users = localStore.get("users") || [];
    const updatedUsers = users.map((user) => {
      if (user.id === userId) {
        return {
          ...user,
          status: "deleted",
          updatedAt: new Date().toISOString(),
        };
      }
      return user;
    });

    localStore.set("users", updatedUsers);

    return { success: true };
  } catch (error) {
    console.error("Error deleting (disabling) user:", error);
    return { success: false, message: error.message };
  }
}

// Logout user
async function logoutUser() {
  try {
    // Firebase logout if auth is available
    if (auth && isFirebaseConfigured()) {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Firebase logout error:", error);
      }
    }

    // Clear current user
    currentUser = null;

    // IMPORTANT: Clear secure storage
    try {
      secureStore.save(null); // Clear the secure store
    } catch (error) {
      console.error("Error clearing secure storage:", error);
    }

    // Don't try to use localStorage in the main process
    // Instead, you can clear user settings in electron-store if needed
    try {
      // Clear any user-related data in local store
      const userStore = new ElectronStore({ name: "user-settings" });
      userStore.clear();
    } catch (e) {
      console.error("Error clearing user settings:", e);
    }

    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false, message: error.message };
  }
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

// Check page-level permissions
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

// Export all the auth functions
module.exports = {
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser,
  checkPermission,
  checkPagePermission,
  db,
};
