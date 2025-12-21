// Common JavaScript Functions

// Initialize tooltips
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
});

// Format currency
function formatCurrency(amount) {
    return '৳' + amount.toLocaleString('en-IN');
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Countdown timer
function startCountdown(elementId, targetDate) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = targetDate - now;
        
        if (distance < 0) {
            element.innerHTML = 'EXPIRED';
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        element.innerHTML = `
            <div class="countdown-item">
                <span>${days}</span>
                <small>Days</small>
            </div>
            <div class="countdown-item">
                <span>${hours}</span>
                <small>Hours</small>
            </div>
            <div class="countdown-item">
                <span>${minutes}</span>
                <small>Minutes</small>
            </div>
            <div class="countdown-item">
                <span>${seconds}</span>
                <small>Seconds</small>
            </div>
        `;
    }
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return interval;
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            showToast('success', 'Copied to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy: ', err);
        });
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate phone number (Bangladeshi)
function validatePhone(phone) {
    const re = /^(?:\+88|01)?\d{11}$/;
    return re.test(phone);
}

// Validate Free Fire ID
function validateFFID(ffid) {
    return ffid.length >= 6 && ffid.length <= 20;
}

// Show loading overlay
function showLoading(message = 'Loading...') {
    let overlay = document.getElementById('loadingOverlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    overlay.style.display = 'flex';
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Show toast notification
function showToast(type, message) {
    // Create toast container if not exists
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }
    
    // Create toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-body d-flex justify-content-between align-items-center">
            <span>${message}</span>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Initialize and show toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    bsToast.show();
    
    // Remove after hiding
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// Check if user is online
function checkOnlineStatus() {
    if (!navigator.onLine) {
        showToast('error', 'You are offline. Some features may not work.');
    }
}

// Setup offline/online detection
window.addEventListener('online', () => {
    showToast('success', 'You are back online!');
});

window.addEventListener('offline', () => {
    showToast('error', 'You are offline. Some features may not work.');
});

// Initialize check
checkOnlineStatus();

// Add CSS for loading overlay
const loadingStyles = document.createElement('style');
loadingStyles.textContent = `
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }
    
    .loading-content {
        text-align: center;
        color: white;
    }
    
    .loading-spinner {
        border: 4px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top: 4px solid #ff6600;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(loadingStyles);
