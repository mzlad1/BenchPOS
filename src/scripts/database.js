const { initializeApp } = require("firebase/app");
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
  enableIndexedDbPersistence,
} = require("firebase/firestore");
const { v4: uuidv4 } = require("uuid");
// Determine environment path
const envPath =
  process.env.NODE_ENV === "production"
    ? path.join(process.resourcesPath, ".env")
    : path.join(__dirname, "..", ".env");

require("dotenv").config({ path: envPath });

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db)
  .then(() => {
    console.log("Offline persistence enabled");
  })
  .catch((err) => {
    console.error("Error enabling offline persistence:", err.code, err.message);
  });

// Fallback local storage using electron-store for complete offline scenarios
const Store = require("electron-store");
const localStore = new Store({
  name: "shop-billing-local-data",
});

// Database functions
async function addProduct(product) {
  const productId = product.id || uuidv4();

  try {
    await setDoc(doc(db, "products", productId), {
      ...product,
      id: productId,
      updatedAt: new Date().toISOString(),
    });
    return productId;
  } catch (error) {
    console.error("Error adding product:", error);

    // Fallback to local storage if Firebase operation fails
    const products = localStore.get("products") || [];
    const newProduct = {
      ...product,
      id: productId,
      updatedAt: new Date().toISOString(),
    };
    products.push(newProduct);
    localStore.set("products", products);

    return productId;
  }
}

async function getProducts() {
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    return querySnapshot.docs.map((doc) => doc.data());
  } catch (error) {
    console.error("Error getting products:", error);

    // Fallback to local storage
    return localStore.get("products") || [];
  }
}

async function createInvoice(invoice) {
  const invoiceId = invoice.id || uuidv4();

  try {
    await setDoc(doc(db, "invoices", invoiceId), {
      ...invoice,
      id: invoiceId,
      createdAt: new Date().toISOString(),
      status: invoice.status || "completed",
    });
    return invoiceId;
  } catch (error) {
    console.error("Error creating invoice:", error);

    // Fallback to local storage
    const invoices = localStore.get("invoices") || [];
    const newInvoice = {
      ...invoice,
      id: invoiceId,
      createdAt: new Date().toISOString(),
      status: invoice.status || "completed",
    };
    invoices.push(newInvoice);
    localStore.set("invoices", invoices);

    return invoiceId;
  }
}

async function getInvoices() {
  try {
    const querySnapshot = await getDocs(collection(db, "invoices"));
    return querySnapshot.docs.map((doc) => doc.data());
  } catch (error) {
    console.error("Error getting invoices:", error);

    // Fallback to local storage
    return localStore.get("invoices") || [];
  }
}

// Export all the database functions
module.exports = {
  addProduct,
  getProducts,
  createInvoice,
  getInvoices,
};
