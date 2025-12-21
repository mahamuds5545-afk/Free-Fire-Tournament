// Authentication Functions for Firebase v9
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

import { 
    ref, 
    set, 
    get, 
    update 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Global variables
let auth, database;

// Initialize when config loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait for firebase to be available
    if(window.auth && window.database) {
        auth = window.auth;
        database = window.database;
        initializeAuth();
    }
});

function initializeAuth() {
    // Check authentication status
    onAuthStateChanged(auth, (user) => {
        const authStatus = document.getElementById('authStatus');
        if(authStatus) {
            if (user) {
                authStatus.innerHTML = `
                    <p>Welcome, ${user.email}</p>
                    <button onclick="logout()">Logout</button>
                `;
            } else {
                authStatus.innerHTML = `
                    <p>You are not logged in</p>
                    <a href="login.html">Login here</a>
                `;
            }
        }
    });
}

// Register new user
window.registerUser = async function(name, email, password, ffid) {
    console.log('Registering user:', {name, email, ffid});
    
    try {
        // Create user in Firebase Auth
        console.log('Creating user in Firebase Auth...');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('User created in Auth:', user.uid);
        
        // Save user data to Realtime Database
        console.log('Saving to database...');
        await set(ref(database, 'users/' + user.uid), {
            name: name,
            email: email,
            ffid: ffid,
            balance: 100, // Free bonus for new users
            kills: 0,
            wins: 0,
            matches: 0,
            role: 'user',
            joinDate: new Date().toISOString(),
            isActive: true,
            createdAt: Date.now()
        });
        
        console.log('Registration successful!');
        return {success: true, message: 'Registration successful!'};
        
    } catch (error) {
        console.error('Registration error:', error);
        
        // Show specific error messages
        let errorMessage = 'Registration failed! ';
        
        switch(error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'This email is already registered.';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Invalid email address.';
                break;
            case 'auth/weak-password':
                errorMessage += 'Password should be at least 6 characters.';
                break;
            case 'auth/network-request-failed':
                errorMessage += 'Network error. Please check your connection.';
                break;
            default:
                errorMessage += error.message;
        }
        
        return {success: false, message: errorMessage};
    }
};

// Login user
window.loginUser = async function(email, password) {
    console.log('Logging in:', email);
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Login successful:', userCredential.user.uid);
        return {success: true, message: 'Login successful!'};
        
    } catch (error) {
        console.error('Login error:', error);
        
        let errorMessage = 'Login failed! ';
        
        switch(error.code) {
            case 'auth/user-not-found':
                errorMessage += 'No user found with this email.';
                break;
            case 'auth/wrong-password':
                errorMessage += 'Incorrect password.';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Invalid email address.';
                break;
            default:
                errorMessage += error.message;
        }
        
        return {success: false, message: errorMessage};
    }
};

// Logout user
window.logout = async function() {
    try {
        await signOut(auth);
        alert('Logged out successfully!');
        window.location.href = 'index.html';
    } catch (error) {
        alert('Logout failed: ' + error.message);
    }
};

// Get current user data
window.getCurrentUserData = async function() {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
        const snapshot = await get(ref(database, 'users/' + user.uid));
        return snapshot.val();
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
};
