// Firebase v9 Modular Setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA9HKKBo6KozIskG2oEF0PO7UCCScIxXdQ",
  authDomain: "freefiregame-85e60.firebaseapp.com",
  databaseURL: "https://freefiregame-85e60-default-rtdb.firebaseio.com",
  projectId: "freefiregame-85e60",
  storageBucket: "freefiregame-85e60.firebasestorage.app",
  messagingSenderId: "961424698248",
  appId: "1:961424698248:web:32e3d79f1bdfefaa9b283d",
  measurementId: "G-7D31XM1SBC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

console.log("Firebase v9 Modular initialized!");

// Make available globally
window.auth = auth;
window.database = database;
window.firebaseApp = app;