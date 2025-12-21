// Global variables
let adminSecretCode = "ADMIN12345";
let currentUser = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log("🚀 Authentication system initializing...");
    
    try {
        // Load admin config
        await loadAdminConfig();
        
        // Setup event listeners
        setupEventListeners();
        
        // Check if user is already logged in
        checkAuthState();
        
    } catch (error) {
        console.error("❌ Initialization error:", error);
        showAlert("System initialization failed. Please refresh.", "danger");
    }
});

// Load admin configuration from Realtime Database
async function loadAdminConfig() {
    try {
        const snapshot = await database.ref('config/adminConfig').once('value');
        
        if (snapshot.exists()) {
            const config = snapshot.val();
            adminSecretCode = config.adminSecretCode || "ADMIN12345";
            console.log("✅ Admin config loaded:", adminSecretCode);
        } else {
            // Create default config
            await database.ref('config/adminConfig').set({
                adminSecretCode: adminSecretCode,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                createdBy: "system"
            });
            console.log("📝 Default admin config created");
        }
    } catch (error) {
        console.error("❌ Error loading admin config:", error);
        adminSecretCode = "ADMIN12345";
    }
}

// Setup all event listeners
function setupEventListeners() {
    // Tab switching
    const tabButtons = document.querySelectorAll('#authTab button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab(this.getAttribute('data-bs-target'));
        });
    });
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
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
    
    // Forgot password
    const forgotPasswordLink = document.querySelector('a[onclick*="resetPassword"]');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            resetPassword();
        });
    }
}

// Switch between tabs
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

// Toggle admin fields
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

// Check authentication state
function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("👤 User already logged in:", user.email);
            currentUser = user;
            
            // Get user data from database
            const userSnapshot = await database.ref('users/' + user.uid).once('value');
            let userData = userSnapshot.val();
            
            if (!userData) {
                // Create user data if not exists
                userData = {
                    name: user.email.split('@')[0],
                    email: user.email,
                    isAdmin: false,
                    ffid: '',
                    status: 'active',
                    emailVerified: user.emailVerified,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                };
                await database.ref('users/' + user.uid).set(userData);
            }
            
            // Store in localStorage
            localStorage.setItem('currentUser', JSON.stringify({
                uid: user.uid,
                email: user.email,
                name: userData.name,
                isAdmin: userData.isAdmin || false,
                ffid: userData.ffid || ''
            }));
            
            // Auto-redirect if on login/register page
            if (window.location.pathname.includes('login.html') || 
                window.location.pathname.includes('register.html')) {
                console.log("🔄 Redirecting to dashboard...");
                setTimeout(() => {
                    if (userData.isAdmin) {
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        window.location.href = 'user-dashboard.html';
                    }
                }, 1000);
            }
        } else {
            console.log("❌ No user logged in");
            currentUser = null;
        }
    });
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const isAdmin = document.getElementById('adminToggleLogin')?.checked || false;
    
    if (!email || !password) {
        showAlert('Please enter email and password', 'danger');
        return;
    }
    
    await performLogin(email, password, isAdmin);
}

// Perform login with Firebase
async function performLogin(email, password, isAdmin) {
    showLoading(true, 'login');
    
    try {
        console.log("🔐 Attempting login...");
        
        // Sign in with Firebase Auth
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log("✅ Firebase Auth successful");
        
        // Get or create user data in Realtime Database
        const userRef = database.ref('users/' + user.uid);
        const snapshot = await userRef.once('value');
        
        let userData;
        if (snapshot.exists()) {
            userData = snapshot.val();
            console.log("📊 User data found:", userData);
        } else {
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
            console.log("📝 Created new user entry");
        }
        
        // Admin validation
        if (isAdmin && !userData.isAdmin) {
            throw new Error('This account is not an administrator');
        }
        
        // Update last login
        await userRef.update({
            lastLogin: firebase.database.ServerValue.TIMESTAMP,
            emailVerified: user.emailVerified
        });
        
        // Store in localStorage
        localStorage.setItem('currentUser', JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: userData.name,
            isAdmin: userData.isAdmin,
            ffid: userData.ffid || ''
        }));
        
        // Show success message
        showAlert(`Welcome back, ${userData.name}! Redirecting...`, 'success');
        
        // Redirect to appropriate dashboard
        setTimeout(() => {
            if (userData.isAdmin) {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'user-dashboard.html';
            }
        }, 1500);
        
    } catch (error) {
        console.error('❌ Login error:', error);
        handleAuthError(error);
    } finally {
        showLoading(false, 'login');
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const ffid = document.getElementById('registerFFID')?.value.trim() || '';
    const isAdmin = document.getElementById('adminToggle')?.checked || false;
    const adminCode = document.getElementById('adminCode')?.value || '';
    const terms = document.getElementById('terms');
    
    // Validation
    if (!name || !email || !password) {
        showAlert('Please fill in all required fields', 'danger');
        return;
    }
    
    if (!terms?.checked) {
        showAlert('Please agree to terms & conditions', 'danger');
        return;
    }
    
    // Password validation
    if (password.length < 6) {
        showAlert('Password must be at least 6 characters', 'danger');
        return;
    }
    
    // Admin validation
    if (isAdmin && !adminCode) {
        showAlert('Please enter admin code', 'danger');
        return;
    }
    
    if (isAdmin && adminCode !== adminSecretCode) {
        showAlert('Invalid admin code', 'danger');
        return;
    }
    
    // User validation
    if (!isAdmin && !ffid) {
        showAlert('Free Fire ID is required for players', 'danger');
        return;
    }
    
    await performRegistration(name, email, password, ffid, isAdmin);
}

// Perform registration
async function performRegistration(name, email, password, ffid, isAdmin) {
    showLoading(true, 'register');
    
    try {
        console.log("📝 Registering new user...");
        
        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        console.log("✅ User created in Firebase Auth");
        
        // Send email verification
        await user.sendEmailVerification();
        
        // Create user data for Realtime Database
        const userData = {
            name: name,
            email: email,
            ffid: isAdmin ? '' : ffid,
            isAdmin: isAdmin,
            status: 'active',
            emailVerified: false,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastLogin: firebase.database.ServerValue.TIMESTAMP
        };
        
        // Save to Realtime Database
        await database.ref('users/' + user.uid).set(userData);
        
        // Create role-specific data
        if (isAdmin) {
            await database.ref('admins/' + user.uid).set({
                email: email,
                name: name,
                permissions: ['manage_tournaments', 'manage_users', 'view_reports'],
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
        } else {
            await database.ref('players/' + user.uid).set({
                email: email,
                name: name,
                ffid: ffid,
                stats: { totalMatches: 0, totalKills: 0, totalWins: 0 },
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
        }
        
        // Store in localStorage
        localStorage.setItem('currentUser', JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: name,
            isAdmin: isAdmin,
            ffid: isAdmin ? '' : ffid,
            emailVerified: false
        }));
        
        // Show success message
        showAlert(`${isAdmin ? 'Admin' : 'Player'} account created successfully! Please verify your email.`, 'success');
        
        // Redirect after delay
        setTimeout(() => {
            if (isAdmin) {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'user-dashboard.html';
            }
        }, 2000);
        
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
        default:
            errorMessage += error.message || 'Unknown error occurred';
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
        showAlert('Error: ' + error.message, 'danger');
    }
}

// Show loading state
function showLoading(isLoading, formType) {
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
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Get alert icon
function getAlertIcon(type) {
    switch(type) {
        case 'success': return 'fa-check-circle';
        case 'danger': return 'fa-exclamation-circle';
        case 'warning': return 'fa-exclamation-triangle';
        case 'info': return 'fa-info-circle';
        default: return 'fa-info-circle';
    }
}

// Global function for password reset
window.resetPassword = resetPassword;
