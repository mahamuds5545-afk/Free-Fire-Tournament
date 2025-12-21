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

// Check authentication status
function checkAuthStatus() {
    onAuthStateChanged(auth, (user) => {
        const authStatus = document.getElementById('authStatus');
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
    });
}

// Register new user
window.registerUser = async function(name, email, password, ffid) {
    try {
        // Create user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Save user data to Realtime Database
        await set(ref(database, 'users/' + user.uid), {
            name: name,
            email: email,
            ffid: ffid,
            balance: 0,
            kills: 0,
            wins: 0,
            matches: 0,
            role: 'user',
            joinDate: new Date().toISOString(),
            isActive: true
        });
        
        alert('Registration successful!');
        return true;
    } catch (error) {
        alert('Registration failed: ' + error.message);
        return false;
    }
};

// Login user
window.loginUser = async function(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert('Login successful!');
        return true;
    } catch (error) {
        alert('Login failed: ' + error.message);
        return false;
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

// Initialize auth check when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
});