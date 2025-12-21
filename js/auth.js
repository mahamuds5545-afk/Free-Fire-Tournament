// Global variables
let adminSecretCode = "ADMIN12345"; // Default code
let currentUserData = null;

// Fetch admin config from Realtime Database
async function fetchAdminConfig() {
    try {
        console.log("🔄 Fetching admin config from Realtime DB...");
        
        // Using promise-based approach
        const snapshot = await database.ref('config/adminConfig').once('value');
        
        if (snapshot.exists()) {
            const config = snapshot.val();
            adminSecretCode = config.adminSecretCode || "ADMIN12345";
            console.log("✅ Admin config loaded:", adminSecretCode);
            return true;
        } else {
            // Create default config
            console.log("📝 Creating default admin config...");
            adminSecretCode = "ADMIN12345";
            await database.ref('config/adminConfig').set({
                adminSecretCode: adminSecretCode,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                createdBy: "system",
                note: "Default admin code. Change in admin panel."
            });
            console.log("✅ Default admin config created");
            return true;
        }
    } catch (error) {
        console.error("❌ Error loading admin config:", error);
        // Use default code
        adminSecretCode = "ADMIN12345";
        showAlert("Note: Using default admin code", "info");
        return false;
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    console.log("🚀 Initializing authentication system...");
    
    try {
        // Load admin config
        await fetchAdminConfig();
        
        // Initialize UI components
        initializeUI();
        
        // Check if user is already logged in
        checkExistingAuth();
        
    } catch (error) {
        console.error("❌ Initialization error:", error);
        showAlert("System initialization failed. Please refresh.", "danger");
    }
});

// Initialize UI components
function initializeUI() {
    // Tab switching
    const tabButtons = document.querySelectorAll('#authTab button[data-bs-target]');
    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab(this.getAttribute('data-bs-target'));
        });
    });
    
    // Form submissions
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }
    
    // Admin toggle for registration
    const adminToggle = document.getElementById('adminToggle');
    if (adminToggle) {
        adminToggle.addEventListener('change', function() {
            toggleAdminFields(this.checked);
        });
        // Initialize hidden state
        toggleAdminFields(false);
    }
    
    // Forgot password link
    const forgotPasswordLink = document.querySelector('a[onclick*="resetPassword"]');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            resetPassword();
        });
    }
}

// Switch between login/register tabs
function switchTab(targetId) {
    // Remove active classes
    document.querySelectorAll('#authTab .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('show', 'active');
    });
    
    // Add active classes
    const activeButton = document.querySelector(`#authTab button[data-bs-target="${targetId}"]`);
    const activeTab = document.querySelector(targetId);
    
    if (activeButton && activeTab) {
        activeButton.classList.add('active');
        activeTab.classList.add('show', 'active');
    }
}

// Toggle admin fields visibility
function toggleAdminFields(isAdmin) {
    const adminField = document.querySelector('.admin-field');
    const userField = document.querySelector('.user-field');
    
    if (adminField && userField) {
        if (isAdmin) {
            adminField.style.display = 'block';
            userField.style.display = 'none';
        } else {
            adminField.style.display = 'none';
            userField.style.display = 'block';
        }
    }
}

// Check existing authentication
function checkExistingAuth() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("👤 User already logged in:", user.email);
            
            // Get user data from Realtime DB
            const userSnapshot = await database.ref('users/' + user.uid).once('value');
            
            if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                currentUserData = userData;
                
                // Store in localStorage
                localStorage.setItem('currentUser', JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    name: userData.name || user.email.split('@')[0],
                    isAdmin: userData.isAdmin || false,
                    ffid: userData.ffid || '',
                    status: userData.status || 'active'
                }));
                
                // Redirect based on role
                if (window.location.pathname.includes('login.html') || 
                    window.location.pathname.includes('register.html')) {
                    setTimeout(() => {
                        if (userData.isAdmin) {
                            window.location.href = 'admin-dashboard.html';
                        } else {
                            window.location.href = 'user-dashboard.html';
                        }
                    }, 1000);
                }
            }
        }
    });
}

// Handle login form submission
async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const isAdmin = document.getElementById('adminToggleLogin')?.checked || false;
    
    if (!validateLoginForm(email, password)) {
        return;
    }
    
    await loginUser(email, password, isAdmin);
}

// Handle register form submission
async function handleRegisterSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const ffid = document.getElementById('registerFFID')?.value.trim() || '';
    const isAdmin = document.getElementById('adminToggle')?.checked || false;
    const adminCode = document.getElementById('adminCode')?.value || '';
    const terms = document.getElementById('terms');
    
    if (!validateRegisterForm(name, email, password, ffid, isAdmin, adminCode, terms)) {
        return;
    }
    
    await registerUser(name, email, password, ffid, isAdmin, adminCode);
}

// Validate login form
function validateLoginForm(email, password) {
    if (!email || !password) {
        showAlert('Please enter both email and password', 'danger');
        return false;
    }
    
    if (!validateEmail(email)) {
        showAlert('Please enter a valid email address', 'danger');
        return false;
    }
    
    return true;
}

// Validate register form
function validateRegisterForm(name, email, password, ffid, isAdmin, adminCode, terms) {
    // Basic validation
    if (!name || !email || !password) {
        showAlert('Please fill in all required fields', 'danger');
        return false;
    }
    
    if (!validateEmail(email)) {
        showAlert('Please enter a valid email address', 'danger');
        return false;
    }
    
    if (password.length < 6) {
        showAlert('Password must be at least 6 characters', 'danger');
        return false;
    }
    
    if (!terms?.checked) {
        showAlert('Please agree to terms & conditions', 'danger');
        return false;
    }
    
    // Role-specific validation
    if (isAdmin) {
        if (!adminCode) {
            showAlert('Please enter admin code', 'danger');
            return false;
        }
    } else {
        if (!ffid) {
            showAlert('Free Fire ID is required for players', 'danger');
            return false;
        }
    }
    
    return true;
}

// Email validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Login user
async function loginUser(email, password, isAdmin = false) {
    showLoading(true, 'login');
    
    try {
        console.log("🔐 Attempting login for:", email);
        
        // Sign in with Firebase Auth
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log("✅ Auth successful, checking user data...");
        
        // Get user data from Realtime Database
        const userRef = database.ref('users/' + user.uid);
        const snapshot = await userRef.once('value');
        
        let userData;
        
        if (snapshot.exists()) {
            userData = snapshot.val();
            console.log("📊 User data found:", userData);
        } else {
            // Create new user entry if not exists
            userData = {
                name: user.email.split('@')[0],
                email: user.email,
                isAdmin: false,
                ffid: '',
                status: 'active',
                emailVerified: user.emailVerified,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            await userRef.set(userData);
            console.log("📝 Created new user entry in Realtime DB");
        }
        
        // Admin validation
        if (isAdmin && !userData.isAdmin) {
            throw new Error('This account is not an administrator.');
        }
        
        // Update last login
        await userRef.update({
            lastLogin: firebase.database.ServerValue.TIMESTAMP,
            emailVerified: user.emailVerified
        });
        
        // Store user data
        currentUserData = userData;
        localStorage.setItem('currentUser', JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: userData.name,
            isAdmin: userData.isAdmin,
            ffid: userData.ffid || '',
            status: userData.status || 'active',
            emailVerified: user.emailVerified
        }));
        
        // Show success message
        let welcomeMessage = `Welcome back, ${userData.name}!`;
        if (!user.emailVerified) {
            welcomeMessage += ' Please verify your email.';
        }
        
        showAlert(welcomeMessage, 'success');
        
        // Redirect after delay
        setTimeout(() => {
            if (userData.isAdmin) {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'user-dashboard.html';
            }
        }, 2000);
        
    } catch (error) {
        console.error('❌ Login error:', error);
        handleAuthError(error);
    } finally {
        showLoading(false, 'login');
    }
}

// Register new user
async function registerUser(name, email, password, ffid, isAdmin = false, adminCode = '') {
    showLoading(true, 'register');
    
    try {
        console.log("📝 Registering new user:", email);
        
        // Verify admin code if registering as admin
        if (isAdmin) {
            if (adminCode !== adminSecretCode) {
                throw new Error('Invalid admin code');
            }
        }
        
        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log("✅ User created in Auth, sending verification email...");
        
        // Send email verification
        await user.sendEmailVerification();
        
        // Prepare user data for Realtime Database
        const userData = {
            name: name,
            email: email,
            ffid: isAdmin ? '' : ffid,
            isAdmin: isAdmin,
            status: 'active',
            emailVerified: false,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastLogin: firebase.database.ServerValue.TIMESTAMP,
            profileComplete: false
        };
        
        // Save to Realtime Database
        const userRef = database.ref('users/' + user.uid);
        await userRef.set(userData);
        
        // Save to role-specific collection
        if (isAdmin) {
            await database.ref('admins/' + user.uid).set({
                ...userData,
                permissions: ['manage_tournaments', 'manage_users', 'view_reports'],
                adminSince: firebase.database.ServerValue.TIMESTAMP
            });
        } else {
            await database.ref('players/' + user.uid).set({
                ...userData,
                stats: {
                    totalMatches: 0,
                    totalKills: 0,
                    totalWins: 0,
                    winRate: 0,
                    rank: 'Bronze',
                    points: 0
                },
                tournamentHistory: {},
                teamId: null
            });
        }
        
        // Store in localStorage
        currentUserData = userData;
        localStorage.setItem('currentUser', JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: name,
            isAdmin: isAdmin,
            ffid: isAdmin ? '' : ffid,
            emailVerified: false,
            createdAt: Date.now()
        }));
        
        // Show success message
        const successMessage = isAdmin 
            ? 'Admin account created successfully! Please check your email for verification.' 
            : `Welcome ${name}! Account created. Please verify your email and complete your profile.`;
        
        showAlert(successMessage, 'success');
        
        // Redirect after delay
        setTimeout(() => {
            if (isAdmin) {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'user-dashboard.html';
            }
        }, 3000);
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        handleAuthError(error);
    } finally {
        showLoading(false, 'register');
    }
}

// Handle authentication errors
function handleAuthError(error) {
    let errorMessage = 'Authentication failed. ';
    
    switch(error.code) {
        case 'auth/email-already-in-use':
            errorMessage = 'This email is already registered. Please login instead.';
            break;
        case 'auth/invalid-email':
            errorMessage = 'Invalid email address.';
            break;
        case 'auth/user-not-found':
            errorMessage = 'No account found with this email.';
            break;
        case 'auth/wrong-password':
            errorMessage = 'Incorrect password.';
            break;
        case 'auth/weak-password':
            errorMessage = 'Password should be at least 6 characters.';
            break;
        case 'auth/too-many-requests':
            errorMessage = 'Too many attempts. Please try again later.';
            break;
        case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection.';
            break;
        default:
            errorMessage += error.message;
    }
    
    showAlert(errorMessage, 'danger');
}

// Password reset function
async function resetPassword() {
    let email = document.getElementById('loginEmail')?.value;
    
    if (!email) {
        email = prompt('Enter your email address for password reset:');
        if (!email) return;
    }
    
    try {
        await auth.sendPasswordResetEmail(email);
        showAlert('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
        console.error('Password reset error:', error);
        showAlert('Error sending reset email: ' + error.message, 'danger');
    }
}

// Show loading state
function showLoading(isLoading, formType = '') {
    let button;
    
    if (formType === 'login') {
        button = document.querySelector('#loginForm button[type="submit"]');
    } else if (formType === 'register') {
        button = document.querySelector('#registerForm button[type="submit"]');
    }
    
    if (button) {
        if (isLoading) {
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';
            button.disabled = true;
        } else {
            if (formType === 'login') {
                button.innerHTML = 'Login';
            } else {
                button.innerHTML = 'Create Account';
            }
            button.disabled = false;
        }
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
    alertDiv.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas ${getAlertIcon(type)} me-2"></i>
            <div>${message}</div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert after forms
    const forms = document.querySelectorAll('form');
    if (forms.length > 0) {
        const lastForm = forms[forms.length - 1];
        lastForm.parentNode.insertBefore(alertDiv, lastForm.nextSibling);
    } else {
        document.querySelector('.auth-card').appendChild(alertDiv);
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Get alert icon based on type
function getAlertIcon(type) {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'danger': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'info': return 'fa-info-circle';
        default: return 'fa-info-circle';
    }
}

// Check if user is admin (for other pages)
async function checkAdminStatus() {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
        const snapshot = await database.ref('users/' + user.uid).once('value');
        if (snapshot.exists()) {
            const userData = snapshot.val();
            return userData.isAdmin || false;
        }
        return false;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Logout function (for other pages)
function logout() {
    auth.signOut().then(() => {
        localStorage.removeItem('currentUser');
        currentUserData = null;
        window.location.href = 'login.html';
    }).catch(error => {
        console.error('Logout error:', error);
        showAlert('Error logging out: ' + error.message, 'danger');
    });
}

// Export functions for use in other pages
window.authFunctions = {
    logout: logout,
    checkAdminStatus: checkAdminStatus,
    getCurrentUser: () => currentUserData,
    updateAdminCode: async (newCode) => {
        try {
            await database.ref('config/adminConfig').update({
                adminSecretCode: newCode,
                updatedAt: firebase.database.ServerValue.TIMESTAMP,
                updatedBy: auth.currentUser?.uid || 'system'
            });
            adminSecretCode = newCode;
            return true;
        } catch (error) {
            console.error('Error updating admin code:', error);
            return false;
        }
    }
};
