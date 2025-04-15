// services/auth.js
const { db, auth, isFirebaseConfigured } = require("./firebase-core");
const {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} = require("firebase/auth");
const {
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

// Add this diagnostic function to auth.js

function checkLocalUserStore() {
  try {
    const users = localStore.get("users") || [];
    console.log(`Local user store contains ${users.length} users`);

    // Check for admin user
    const adminUser = users.find((u) => u.role === "admin");
    if (!adminUser) {
      console.warn("No admin user found in local storage!");
    } else {
      console.log(`Admin user exists: ${adminUser.email}`);
    }

    // Check for duplicate emails
    const emails = users.map((u) => u.email.toLowerCase());
    const uniqueEmails = [...new Set(emails)];
    if (emails.length !== uniqueEmails.length) {
      console.warn("Duplicate emails found in user store!");
    }

    return users;
  } catch (error) {
    console.error("Error checking local user store:", error);
    return [];
  }
}

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

// Log existing users for debugging
console.log(
  "Available users in local storage:",
  localStore.get("users")?.length || 0
);
const users = localStore.get("users") || [];
users.forEach((user) => {
  console.log(`- User: ${user.email}, Role: ${user.role}`);
});

// Call this during initialization
checkLocalUserStore();

// Make sure admin@example.com exists
const hasDefaultAdmin = users.some((u) => u.email === "admin@example.com");
if (!hasDefaultAdmin) {
  console.log("Re-creating default admin user that should exist");
  const salt = bcrypt.genSaltSync(10);
  const defaultAdmin = {
    id: "admin",
    email: "admin@example.com",
    name: "Administrator",
    passwordHash: bcrypt.hashSync("admin123", salt),
    role: "admin",
    createdAt: new Date().toISOString(),
  };
  users.push(defaultAdmin);
  localStore.set("users", users);
}

// Enhanced version of loginUser function in auth.js
// Modified loginUser function in auth.js
async function loginUser({
  email,
  password,
  remember = false,
  isOnline = false,
}) {
  try {
    const salt = bcrypt.genSaltSync(10);

    // Log authentication attempt
    console.log(`Login attempt for ${email}, online: ${isOnline}`);

    // Try to use Firebase if online and configured
    if (isOnline && isFirebaseConfigured()) {
      try {
        console.log("Attempting Firebase login");

        // Import auth module directly to ensure it's the latest instance
        const { auth } = require("./firebase-core");

        // Check if Firebase auth is really available
        if (!auth) {
          console.error("Firebase auth object is not available");
          throw new Error(
            "Authentication service not available. Please restart the application."
          );
        }

        const { signInWithEmailAndPassword } = require("firebase/auth");

        // Directly check the auth object for proper initialization
        if (!auth || typeof auth.signInWithEmailAndPassword !== "function") {
          console.error(
            "Firebase auth object is invalid or not properly initialized"
          );

          // Try to reinitialize Firebase auth
          console.log("Attempting to reinitialize Firebase...");
          const { initialize } = require("./firebase-core");
          const { auth: refreshedAuth } = initialize();

          if (!refreshedAuth) {
            throw new Error(
              "Authentication service not available. Please restart the application."
            );
          }

          // Use the reinitialized auth object
          try {
            const userCredential = await signInWithEmailAndPassword(
              refreshedAuth,
              email,
              password
            );

            const firebaseUser = userCredential.user;
            const { db } = require("./firebase-core");

            // Get user profile from Firestore
            const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
            let userData;

            if (userDoc.exists()) {
              userData = userDoc.data();
              // Check user status
              if (userData.status === "deleted") {
                await signOut(refreshedAuth);
                return {
                  success: false,
                  message:
                    "This account has been deleted. Please contact your administrator.",
                };
              }

              if (userData.status === "inactive") {
                await signOut(refreshedAuth);
                return {
                  success: false,
                  message:
                    "This account is inactive. Please contact your administrator to activate it.",
                };
              }

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

            // Create success result
            const result = { success: true, user: userData };

            if (remember) {
              // Store encrypted credentials using secureStore
              secureStore.set("userCredentials", {
                email: email.toLowerCase(),
                passwordHash: password ? bcrypt.hashSync(password, salt) : null,
                timestamp: new Date().toISOString(),
              });

              console.log("User credentials saved for auto-login");
            }

            return result;
          } catch (reinitError) {
            console.error("Login failed after reinitialization:", reinitError);
            // Ensure we always return an object with success property
            return {
              success: false,
              message:
                reinitError.message ||
                "Authentication failed after reinitialization",
              code: reinitError.code,
            };
          }
        }

        // Normal flow with available auth object
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        const firebaseUser = userCredential.user;

        // Get user profile from Firestore
        const { db } = require("./firebase-core");
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        let userData;

        if (userDoc.exists()) {
          userData = userDoc.data();
          // Add status checks here
          if (userData.status === "deleted") {
            // Sign out the user since they were authenticated but shouldn't be allowed in
            await signOut(auth);
            return {
              success: false,
              message:
                "This account has been deleted. Please contact your administrator.",
            };
          }

          if (userData.status === "inactive") {
            // Sign out the user since they were authenticated but shouldn't be allowed in
            await signOut(auth);
            return {
              success: false,
              message:
                "This account is inactive. Please contact your administrator to activate it.",
            };
          }
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

        const result = { success: true, user: userData };

        if (result.success && remember) {
          // Store encrypted credentials using secureStore
          secureStore.set("userCredentials", {
            email: email.toLowerCase(),
            passwordHash: password ? bcrypt.hashSync(password, salt) : null,
            timestamp: new Date().toISOString(),
          });

          console.log("User credentials saved for auto-login");
        }

        return result;
      } catch (firebaseError) {
        console.error("Firebase login failed:", firebaseError);

        // Create user-friendly error message
        let userMessage = "Login failed. ";

        // Handle specific Firebase error codes
        if (firebaseError.code === "auth/user-not-found") {
          userMessage += "User not found. Please check your email address.";
        } else if (firebaseError.code === "auth/wrong-password") {
          userMessage += "Incorrect password. Please try again.";
        } else if (firebaseError.code === "auth/invalid-credential") {
          userMessage +=
            "Invalid login credentials. Please check your email and password.";
        } else if (firebaseError.code === "auth/too-many-requests") {
          userMessage +=
            "Too many failed login attempts. Please try again later.";
        } else if (firebaseError.code === "auth/network-request-failed") {
          userMessage +=
            "Network error. Please check your internet connection.";
        } else if (
          firebaseError.message.includes("Authentication service not available")
        ) {
          userMessage =
            "Authentication service not available. Please restart the application.";
        } else {
          // Default error message
          userMessage += firebaseError.message;
        }

        // Fall back to local login only for specific errors
        const shouldFallback = [
          "auth/network-request-failed",
          "auth/too-many-requests",
          "auth/internal-error",
          "auth/operation-not-allowed",
        ].includes(firebaseError.code);

        if (shouldFallback) {
          console.log("Falling back to local login");
          return await localLogin(email, password, isOnline);
        }

        // Otherwise return the specific Firebase error
        return {
          success: false,
          message: userMessage,
          code: firebaseError.code,
          isFirebaseError: true,
        };
      }
    } else {
      // Offline mode: use local authentication
      console.log("Using local login (offline)");
      return await localLogin(email, password, isOnline);
    }
  } catch (error) {
    console.error("Login error:", error);
    // Make sure we always return an object with success property
    return {
      success: false,
      message: error.message || "An unexpected error occurred during login",
    };
  }
}
/**
 * Helper function to get human-friendly Firebase error messages
 */
function getFirebaseErrorMessage(error) {
  switch (error.code) {
    case "auth/user-not-found":
      return "No account found with this email. Please check your email address or create an account.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again or use the 'Forgot Password' link.";
    case "auth/invalid-credential":
      return "Invalid login credentials. Please check your email and password.";
    case "auth/too-many-requests":
      return "Access temporarily disabled due to many failed login attempts. Please try again later or reset your password.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection and try again.";
    case "auth/invalid-email":
      return "Invalid email address format. Please enter a valid email.";
    case "auth/app-deleted":
      return "Authentication service unavailable. Please contact support.";
    case "auth/internal-error":
      return "An internal authentication error occurred. Please try again later.";
    default:
      return `Authentication error: ${error.message}`;
  }
}

/**
 * Determines whether we should fall back to local login based on Firebase error
 */
function shouldUseLocalFallback(error) {
  const fallbackErrorCodes = [
    "auth/network-request-failed",
    "auth/internal-error",
    "auth/app-deleted",
    "auth/operation-not-allowed",
  ];

  return fallbackErrorCodes.includes(error.code);
}

/**
 * Diagnose Firebase auth and check if the user exists
 * @param {string} email - User email to check
 * @return {Promise<Object>} Diagnostic info
 */
async function diagnoseFBAuth(email) {
  try {
    // Check if Firebase is properly configured
    const isConfigured = isFirebaseConfigured();

    if (!isConfigured) {
      return {
        configured: false,
        message: "Firebase not properly configured",
      };
    }

    // Check if auth is initialized
    if (!auth) {
      return {
        configured: true,
        initialized: false,
        message: "Firebase auth not initialized",
      };
    }

    // Check if the user exists in the database
    try {
      const userQuery = query(
        collection(db, "users"),
        where("email", "==", email.toLowerCase())
      );

      const querySnapshot = await getDocs(userQuery);
      const userExists = !querySnapshot.empty;

      return {
        configured: true,
        initialized: true,
        userExists,
        userCount: querySnapshot.size,
        message: userExists
          ? `User found in Firestore (${querySnapshot.size} records)`
          : "User not found in Firestore",
      };
    } catch (dbError) {
      return {
        configured: true,
        initialized: true,
        error: dbError.message,
        message: "Error checking user existence",
      };
    }
  } catch (error) {
    return {
      error: error.message,
      message: "Error during Firebase diagnostic check",
    };
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
 * Local login with improved error handling
 */
async function localLogin(email, password, isOnline) {
  try {
    const users = localStore.get("users") || [];
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      // Check if this might be a Firebase user that's not synced locally
      if (isOnline && auth && isFirebaseConfigured()) {
        try {
          console.log("User not found locally. Checking with Firebase...");
          const authCheck = await diagnoseFBAuth(email);

          if (authCheck.userExists) {
            return {
              success: false,
              message:
                "User exists in Firebase but not in local storage. Try logging in with internet connection to sync your account.",
              needsSync: true,
            };
          }
        } catch (checkError) {
          console.error("Error checking user in Firebase:", checkError);
        }
      }

      return {
        success: false,
        message:
          "User not found. Login requires internet connection for first-time users.",
      };
    }

    // Add these status checks
    if (user.status === "deleted") {
      return {
        success: false,
        message:
          "This account has been deleted. Please contact your administrator.",
      };
    }

    if (user.status === "inactive") {
      return {
        success: false,
        message:
          "This account is inactive. Please contact your administrator to activate it.",
      };
    }

    // Special case for synced user with invalid hash
    if (user.passwordHash?.includes("INVALID_USER_NEEDS_ONLINE_LOGIN")) {
      return {
        success: false,
        needsOnlineLogin: true,
        message:
          "This account requires you to login with internet connection at least once.",
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

/**
 * Improved syncUsersWithFirebase function
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

    // Always keep the admin user
    const adminUser = localUsers.find(
      (user) => user.email === "admin@example.com"
    );

    // Filter local users to keep only those that exist in Firebase
    // (except for the admin user which we always keep)
    const validLocalUsers = localUsers.filter((localUser) => {
      // Always keep the admin user
      if (localUser.email === "admin@example.com") {
        return true;
      }

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
      if (!fbUser.email) return; // Skip users without email

      const existsLocally = validLocalUsers.some(
        (localUser) =>
          localUser.id === fbUser.id ||
          (localUser.email &&
            fbUser.email &&
            localUser.email.toLowerCase() === fbUser.email.toLowerCase())
      );

      if (!existsLocally) {
        // Add skeleton user - they'll need to login online once to set password
        validLocalUsers.push({
          ...fbUser,
          // Use a hash that will never match any password
          passwordHash: "$2a$10$INVALID_USER_NEEDS_ONLINE_LOGIN",
          syncedFromFirebase: true,
        });
      }
    });

    // Make sure we always have the admin user
    if (
      adminUser &&
      !validLocalUsers.some((user) => user.email === "admin@example.com")
    ) {
      validLocalUsers.push(adminUser);
    }

    // Update local storage
    localStore.set("users", validLocalUsers);
    console.log(`User sync completed: ${validLocalUsers.length} valid users`);

    return true;
  } catch (error) {
    console.error("Error syncing users with Firebase:", error);
    return false;
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
async function restoreSession() {
  try {
    const credentials = getUserCredentials();

    if (credentials && credentials.email) {
      console.log("Attempting to restore session for:", credentials.email);
      return await loginUser({
        email: credentials.email,
        password: credentials.password,
        remember: true,
        isRestoring: true,
      });
    }
  } catch (error) {
    console.error("Failed to restore session:", error);
  }

  return { success: false };
}

// Check page-level permissions
function checkPagePermission(page, userRole) {
  // Define page access by role
  const permissions = {
    admin: [
      "dashboard",
      "inventory",
      "users",
      "reports",
      "settings",
      "billing",
    ],
    manager: ["dashboard", "inventory", "reports", "billing"],
    cashier: ["billing", "dashboard"],
  };

  // Get allowed pages for this role
  const allowedPages = permissions[userRole] || [];

  // Check if the requested page is in the allowed pages
  return allowedPages.includes(page);
}

// Export all the auth functions
module.exports = {
  loginUser,
  registerUser,
  getCurrentUser,
  logoutUser,
  checkPermission,
  checkPagePermission,
  deleteUser,
  updateUser,
  diagnoseFBAuth,
  db,
};
