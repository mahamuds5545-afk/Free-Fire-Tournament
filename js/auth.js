// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    // Bootstrap tab switching
    const tabButtons = document.querySelectorAll('#authTab button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const target = this.getAttribute('data-bs-target');
            const activeTab = document.querySelector('.tab-pane.active');
            const targetTab = document.querySelector(target);
            
            // Remove active class from all tabs and buttons
            document.querySelectorAll('.tab-pane').forEach(tab => {
                tab.classList.remove('show', 'active');
            });
            document.querySelectorAll('#authTab .nav-link').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to current tab and button
            this.classList.add('active');
            targetTab.classList.add('show', 'active');
        });
    });

    // Admin toggle functionality
    const adminToggle = document.getElementById('adminToggle');
    if(adminToggle) {
        adminToggle.addEventListener('change', function() {
            const adminFields = document.querySelectorAll('.admin-field');
            const userFields = document.querySelectorAll('.user-field');
            
            if(this.checked) {
                adminFields.forEach(field => field.style.display = 'block');
                userFields.forEach(field => field.style.display = 'none');
            } else {
                adminFields.forEach(field => field.style.display = 'none');
                userFields.forEach(field => field.style.display = 'block');
            }
        });
    }

    // Check if user is already logged in
    auth.onAuthStateChanged(user => {
        if(user) {
            // Redirect based on user role
            checkUserRole(user.uid);
        }
    });
});

// Login Form Handler
document.getElementById('loginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const isAdmin = document.getElementById('adminToggleLogin')?.checked || false;
    
    loginUser(email, password, isAdmin);
});

// Register Form Handler
document.getElementById('registerForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const ffid = document.getElementById('registerFFID').value;
    const isAdmin = document.getElementById('adminToggle')?.checked || false;
    
    registerUser(name, email, password, ffid, isAdmin);
});

// Login Function
async function loginUser(email, password, isAdmin = false) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Check user role in Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if(userDoc.exists) {
            const userData = userDoc.data();
            
            // If trying to login as admin but user is not admin
            if(isAdmin && !userData.isAdmin) {
                throw new Error('This user is not an administrator');
            }
            
            // Store user data in localStorage
            localStorage.setItem('currentUser', JSON.stringify({
                uid: user.uid,
                email: user.email,
                name: userData.name,
                isAdmin: userData.isAdmin || false,
                ffid: userData.ffid || ''
            }));
            
            // Redirect based on role
            if(userData.isAdmin) {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'user-dashboard.html';
            }
        } else {
            throw new Error('User data not found');
        }
        
    } catch(error) {
        showAlert(error.message, 'danger');
    }
}

// Register Function
async function registerUser(name, email, password, ffid, isAdmin = false) {
    try {
        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Create user document in Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            ffid: ffid,
            isAdmin: isAdmin,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        });
        
        // Create additional data based on role
        if(isAdmin) {
            await db.collection('admins').doc(user.uid).set({
                email: email,
                name: name,
                createdAt: new Date()
            });
        } else {
            await db.collection('players').doc(user.uid).set({
                email: email,
                name: name,
                ffid: ffid,
                createdAt: new Date(),
                totalMatches: 0,
                totalKills: 0
            });
        }
        
        // Store user data
        localStorage.setItem('currentUser', JSON.stringify({
            uid: user.uid,
            email: user.email,
            name: name,
            isAdmin: isAdmin,
            ffid: ffid
        }));
        
        showAlert('Registration successful! Redirecting...', 'success');
        
        // Redirect after 2 seconds
        setTimeout(() => {
            if(isAdmin) {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'user-dashboard.html';
            }
        }, 2000);
        
    } catch(error) {
        showAlert(error.message, 'danger');
    }
}

// Password Reset Function
function resetPassword() {
    const email = prompt('Please enter your email address:');
    
    if(email) {
        auth.sendPasswordResetEmail(email)
            .then(() => {
                showAlert('Password reset email sent! Check your inbox.', 'success');
            })
            .catch(error => {
                showAlert(error.message, 'danger');
            });
    }
}

// Check User Role Function
async function checkUserRole(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        
        if(userDoc.exists) {
            const userData = userDoc.data();
            
            if(userData.isAdmin && window.location.pathname.includes('admin')) {
                return true;
            } else if(!userData.isAdmin && window.location.pathname.includes('user')) {
                return true;
            } else {
                // Redirect to appropriate dashboard
                if(userData.isAdmin) {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'user-dashboard.html';
                }
            }
        }
    } catch(error) {
        console.error('Error checking user role:', error);
    }
}

// Utility function to show alerts
function showAlert(message, type) {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert');
    if(existingAlert) {
        existingAlert.remove();
    }
    
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show mt-3`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Insert after forms
    const forms = document.querySelectorAll('form');
    const lastForm = forms[forms.length - 1];
    lastForm.parentNode.insertBefore(alertDiv, lastForm.nextSibling);
}
