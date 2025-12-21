// Firebase configuration
const firebaseConfig = {
   apiKey: "AIzaSyDXKSgO8ArAd32r5kHW4KzM4EHfFTd7AB4",
  authDomain: "my-new-ff-app.firebaseapp.com",
  projectId: "my-new-ff-app",
  storageBucket: "my-new-ff-app.firebasestorage.app",
  messagingSenderId: "721102554732",
  appId: "1:721102554732:web:736adb31819cda998dba49",
  measurementId: "G-YV8C2FFV5L"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let adminSecretCode = "";

// Fetch admin secret code on page load
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const configDoc = await db.collection('config').doc('adminConfig').get();
        if (configDoc.exists) {
            adminSecretCode = configDoc.data().adminSecretCode;
        } else {
            // Create default admin config if not exists
            adminSecretCode = "ADMIN12345";
            await db.collection('config').doc('adminConfig').set({
                adminSecretCode: adminSecretCode,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error("Error fetching admin config:", error);
        adminSecretCode = "ADMIN12345"; // Default code
    }

    initializeTabs();
});

// Initialize tabs
function initializeTabs() {
    // Bootstrap tab switching
    const tabButtons = document.querySelectorAll('#authTab button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const target = this.getAttribute('data-bs-target');
            
            // Remove active class from all tabs and buttons
            document.querySelectorAll('.tab-pane').forEach(tab => {
                tab.classList.remove('show', 'active');
            });
            document.querySelectorAll('#authTab .nav-link').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to current tab and button
            this.classList.add('active');
            const targetTab = document.querySelector(target);
            targetTab.classList.add('show', 'active');
            
            // Reset admin toggle when switching tabs
            if (target === '#register') {
                resetAdminToggle();
            }
        });
    });

    // Admin toggle for registration
    const adminToggle = document.getElementById('adminToggle');
    if (adminToggle) {
        adminToggle.addEventListener('change', function() {
            toggleAdminFields(this.checked);
        });
    }

    // Admin toggle for login
    const adminToggleLogin = document.getElementById('adminToggleLogin');
    if (adminToggleLogin) {
        adminToggleLogin.addEventListener('change', function() {
            // Nothing special needed for login
        });
    }

    // Check if user is already logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            // Redirect based on user role
            checkUserRole(user.uid);
        }
    });

    // Form submissions
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const isAdmin = document.getElementById('adminToggleLogin')?.checked || false;
    
    if (!email || !password) {
        showAlert('Please fill in all fields', 'danger');
        return;
    }
    
    await loginUser(email, password, isAdmin);
}

// Handle register form submission
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const ffid = document.getElementById('registerFFID')?.value.trim() || '';
    const isAdmin = document.getElementById('adminToggle')?.checked || false;
    const adminCode = document.getElementById('adminCode')?.value || '';
    const terms = document.getElementById('terms').checked;
    
    // Validation
    if (!name || !email || !password) {
        showAlert('Please fill in all required fields', 'danger');
        return;
    }
    
    if (!terms) {
        showAlert('Please agree to terms & conditions', 'danger');
        return;
    }
    
    // Admin validation
    if (isAdmin) {
        if (!adminCode) {
            showAlert('Please enter admin code', 'danger');
            return;
        }
        
        if (adminCode !== adminSecretCode) {
            showAlert('Invalid admin code', 'danger');
            return;
        }
    } else {
        if (!ffid) {
            showAlert('Free Fire ID is required for players', 'danger');
            return;
        }
    }
    
    await registerUser(name, email, password, ffid, isAdmin);
}

// Toggle admin fields visibility
function toggleAdminFields(isAdmin) {
    const adminField = document.querySelector('.admin-field');
    const userField = document.querySelector('.user-field');
    
    if (isAdmin) {
        adminField.style.display = 'block';
        userField.style.display = 'none';
    } else {
        adminField.style.display = 'none';
        userField.style.display = 'block';
    }
}

// Reset admin toggle
function resetAdminToggle() {
    const adminToggle = document.getElementById('adminToggle');
    if (adminToggle) {
        adminToggle.checked = false;
        toggleAdminFields(false);
    }
}

// Login Function
async function loginUser(email, password, isAdmin = false) {
    showLoading(true);
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Get user data from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            throw new Error('User not found. Please register first.');
        }
        
        const userData = userDoc.data();
        
        // Check if account is active
        if (userData.status === 'inactive') {
            throw new Error('Your account has been deactivated. Contact support.');
        }
        
        // Admin validation
        if (isAdmin && !userData.isAdmin) {
            throw new Error('Access denied. This account is not an administrator.');
        }
        
        // If trying to access admin panel without admin toggle
        if (userData.isAdmin && !isAdmin) {
            showAlert('This is an admin account. Please check "Login as Administrator"', 'warning');
            return;
        }
        
        // Store user data in localStorage
        localStorage.setItem('currentUser', JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: userData.name,
            isAdmin: userData.isAdmin || false,
            ffid: userData.ffid || '',
            status: userData.status || 'active'
        }));
        
        showAlert('Login successful! Redirecting...', 'success');
        
        // Redirect based on role
        setTimeout(() => {
            if (userData.isAdmin) {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'user-dashboard.html';
            }
        }, 1500);
        
    } catch (error) {
        showAlert(error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

// Register Function
async function registerUser(name, email, password, ffid, isAdmin = false) {
    showLoading(true);
    
    try {
        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Send email verification
        await user.sendEmailVerification();
        
        // Create user document in Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            ffid: isAdmin ? '' : ffid,
            isAdmin: isAdmin,
            status: 'active',
            emailVerified: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Create additional data based on role
        if (isAdmin) {
            await db.collection('admins').doc(user.uid).set({
                email: email,
                name: name,
                permissions: ['manage_tournaments', 'manage_users', 'view_reports'],
                createdAt: new Date()
            });
            showAlert('Admin account created successfully! Please verify your email.', 'success');
        } else {
            await db.collection('players').doc(user.uid).set({
                email: email,
                name: name,
                ffid: ffid,
                stats: {
                    totalMatches: 0,
                    totalKills: 0,
                    totalWins: 0,
                    winRate: 0
                },
                createdAt: new Date(),
                teamId: null
            });
            showAlert('Player account created successfully! Please verify your email.', 'success');
        }
        
        // Store user data
        localStorage.setItem('currentUser', JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: name,
            isAdmin: isAdmin,
            ffid: isAdmin ? '' : ffid,
            emailVerified: false
        }));
        
        // Redirect after 3 seconds
        setTimeout(() => {
            if (isAdmin) {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'user-dashboard.html';
            }
        }, 3000);
        
    } catch (error) {
        let errorMessage = error.message;
        
        // User-friendly error messages
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already registered. Please login instead.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password should be at least 6 characters long.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        }
        
        showAlert(errorMessage, 'danger');
    } finally {
        showLoading(false);
    }
}

// Check User Role Function
async function checkUserRole(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Update last login
            await db.collection('users').doc(uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Check current page and redirect if needed
            const currentPage = window.location.pathname;
            
            if (currentPage.includes('login.html') || currentPage.includes('register.html')) {
                if (userData.isAdmin) {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'user-dashboard.html';
                }
            }
        }
    } catch (error) {
        console.error('Error checking user role:', error);
    }
}

// Password Reset Function
function resetPassword() {
    const email = document.getElementById('loginEmail')?.value;
    
    if (!email) {
        email = prompt('Please enter your email address:');
    }
    
    if (email) {
        auth.sendPasswordResetEmail(email)
            .then(() => {
                showAlert('Password reset email sent! Check your inbox.', 'success');
            })
            .catch(error => {
                let errorMessage = error.message;
                if (error.code === 'auth/user-not-found') {
                    errorMessage = 'No account found with this email.';
                }
                showAlert(errorMessage, 'danger');
            });
    }
}

// Show loading state
function showLoading(isLoading) {
    const loginBtn = document.querySelector('#loginForm button[type="submit"]');
    const registerBtn = document.querySelector('#registerForm button[type="submit"]');
    
    if (loginBtn) {
        if (isLoading) {
            loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';
            loginBtn.disabled = true;
        } else {
            loginBtn.innerHTML = 'Login';
            loginBtn.disabled = false;
        }
    }
    
    if (registerBtn) {
        if (isLoading) {
            registerBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating Account...';
            registerBtn.disabled = true;
        } else {
            registerBtn.innerHTML = 'Create Account';
            registerBtn.disabled = false;
        }
    }
}

// Utility function to show alerts
function showAlert(message, type) {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
    alertDiv.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert after forms
    const forms = document.querySelectorAll('form');
    const lastForm = forms[forms.length - 1];
    lastForm.parentNode.insertBefore(alertDiv, lastForm.nextSibling);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Logout function (can be used in other pages)
function logout() {
    auth.signOut().then(() => {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }).catch(error => {
        showAlert('Error logging out: ' + error.message, 'danger');
    });
}

// Check authentication on page load
function checkAuth() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'login.html';
        } else {
            // User is logged in, check role if needed
            const userData = JSON.parse(localStorage.getItem('currentUser') || '{}');
            
            // If on admin page but not admin
            if (window.location.pathname.includes('admin') && !userData.isAdmin) {
                window.location.href = 'user-dashboard.html';
            }
            
            // If on user page but is admin
            if (window.location.pathname.includes('user-dashboard') && userData.isAdmin) {
                window.location.href = 'admin-dashboard.html';
            }
        }
    });
}
