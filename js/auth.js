// Authentication Functions
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.init();
    }

    init() {
        // Check if user is logged in
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.getUserRole(user.uid);
            } else {
                this.currentUser = null;
                this.userRole = null;
            }
        });
    }

    // Login with email/password
    async login(email, password) {
        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Get user role from database
            const snapshot = await database.ref('users/' + user.uid).once('value');
            if (snapshot.exists()) {
                const userData = snapshot.val();
                this.userRole = userData.role || 'user';
                
                // Redirect based on role
                if (this.userRole === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'user.html';
                }
                return true;
            } else {
                throw new Error('User data not found');
            }
        } catch (error) {
            throw error;
        }
    }

    // Register new user
    async register(email, password, name, ffid) {
        try {
            // Create user in Firebase Auth
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Create user profile in database
            const userData = {
                name: name,
                email: email,
                ffid: ffid,
                role: 'user',
                balance: 0,
                kills: 0,
                wins: 0,
                matches: 0,
                joinDate: new Date().toISOString(),
                isActive: true,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };

            await database.ref('users/' + user.uid).set(userData);
            
            // Send email verification
            await user.sendEmailVerification();
            
            // Auto login
            return this.login(email, password);
        } catch (error) {
            throw error;
        }
    }

    // Get user role
    async getUserRole(uid) {
        try {
            const snapshot = await database.ref('users/' + uid + '/role').once('value');
            this.userRole = snapshot.val() || 'user';
            return this.userRole;
        } catch (error) {
            console.error('Error getting user role:', error);
            return 'user';
        }
    }

    // Logout
    async logout() {
        try {
            await firebase.auth().signOut();
            window.location.href = 'index.html';
        } catch (error) {
            throw error;
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            await firebase.auth().sendPasswordResetEmail(email);
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Check if user is admin
    isAdmin() {
        return this.userRole === 'admin';
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Get current user data
    async getCurrentUserData() {
        if (!this.currentUser) return null;
        
        try {
            const snapshot = await database.ref('users/' + this.currentUser.uid).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    // Update user profile
    async updateProfile(data) {
        if (!this.currentUser) return false;
        
        try {
            await database.ref('users/' + this.currentUser.uid).update(data);
            return true;
        } catch (error) {
            throw error;
        }
    }

    // Change password
    async changePassword(newPassword) {
        try {
            await this.currentUser.updatePassword(newPassword);
            return true;
        } catch (error) {
            throw error;
        }
    }
}

// Initialize Auth Manager
const authManager = new AuthManager();

// DOM Event Listeners for Login Page
document.addEventListener('DOMContentLoaded', function() {
    // Check if on login page
    if (document.getElementById('loginForm')) {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        
        // Login form submit
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                showLoading('Logging in...');
                await authManager.login(email, password);
                hideLoading();
            } catch (error) {
                hideLoading();
                showToast('error', error.message);
            }
        });
        
        // Register form submit
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const ffid = document.getElementById('registerFFID').value;
            
            try {
                showLoading('Creating account...');
                await authManager.register(email, password, name, ffid);
                hideLoading();
            } catch (error) {
                hideLoading();
                showToast('error', error.message);
            }
        });
        
        // Setup tab switching
        const authTab = new bootstrap.Tab(document.querySelector('#authTab button[data-bs-target="#login"]'));
        
        // Check if register tab is requested
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('register') === 'true') {
            const registerTab = new bootstrap.Tab(document.querySelector('#authTab button[data-bs-target="#register"]'));
            registerTab.show();
        }
    }
});

// UI Helper Functions
function showLoading(message = 'Loading...') {
    // Create loading overlay
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <p>${message}</p>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function showToast(type, message) {
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-body">
            <strong>${type === 'error' ? 'Error' : 'Success'}:</strong> ${message}
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Password reset function
async function resetPassword() {
    const email = prompt('Enter your email address:');
    if (email) {
        try {
            await authManager.resetPassword(email);
            showToast('success', 'Password reset email sent!');
        } catch (error) {
            showToast('error', error.message);
        }
    }
}
