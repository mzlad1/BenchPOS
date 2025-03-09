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

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC6z4Ci0QvHlLtonZLDAlyJHH7Km0B_PI0",
  authDomain: "shop-d44bb.firebaseapp.com",
  projectId: "shop-d44bb",
  storageBucket: "shop-d44bb.firebasestorage.app",
  messagingSenderId: "624712206371",
  appId: "1:624712206371:web:3e93f2354ed96164804996",
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
