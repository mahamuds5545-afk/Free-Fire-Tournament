// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDXKSgO8ArAd32r5kHW4KzM4EHfFTd7AB4",
    authDomain: "my-new-ff-app.firebaseapp.com",
    databaseURL: "https://my-new-ff-app-default-rtdb.firebaseio.com/",
    projectId: "my-new-ff-app",
    storageBucket: "my-new-ff-app.firebasestorage.app",
    messagingSenderId: "721102554732",
    appId: "1:721102554732:web:736adb31819cda998dba49",
    measurementId: "G-YV8C2FFV5L"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const analytics = firebase.analytics();
