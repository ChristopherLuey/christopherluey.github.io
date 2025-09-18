// Password Protection System
(function() {
    'use strict';
    
    // Prevent conflicts with browser extensions
    if (window.PasswordProtectionInitialized) {
        return;
    }
    window.PasswordProtectionInitialized = true;

class PasswordProtection {
    constructor() {
        this.password = 'luey'; // Change this to your desired password
        this.sessionKey = 'website_authenticated';
        this.sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        
        this.init();
    }
    
    init() {
        console.log('PasswordProtection init() called');
        console.log('Current URL:', window.location.href);
        console.log('Current pathname:', window.location.pathname);
        
        // Check if user is already authenticated
        if (this.isAuthenticated()) {
            console.log('User is authenticated, showing content');
            this.showContent();
        } else {
            console.log('User is not authenticated');
            // If not authenticated, redirect to main page with password prompt
            if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
                console.log('Redirecting to main page');
                window.location.href = '/index.html';
                return;
            }
            console.log('Showing password prompt');
            this.showPasswordPrompt();
        }
    }
    
    isAuthenticated() {
        const authData = localStorage.getItem(this.sessionKey);
        if (!authData) return false;
        
        try {
            const { timestamp, authenticated } = JSON.parse(authData);
            const now = Date.now();
            
            // Check if session is still valid
            if (now - timestamp > this.sessionDuration) {
                localStorage.removeItem(this.sessionKey);
                return false;
            }
            
            return authenticated === true;
        } catch (e) {
            localStorage.removeItem(this.sessionKey);
            return false;
        }
    }
    
    authenticate(password) {
        if (password === this.password) {
            const authData = {
                timestamp: Date.now(),
                authenticated: true
            };
            localStorage.setItem(this.sessionKey, JSON.stringify(authData));
            this.showContent();
            return true;
        }
        return false;
    }
    
    showPasswordPrompt() {
        // Hide the main content
        const container = document.querySelector('.container');
        if (container) {
            container.style.display = 'none';
        }
        
        // Create password prompt
        const promptHTML = `
            <div id="password-prompt" class="password-prompt">
                <div class="password-box">
                    <h2>CHRISTOPHER LUEY</h2>
                    <p>PLEASE ENTER THE PASSWORD TO CONTINUE.</p>
                    <form id="password-form">
                        <input type="password" id="password-input" placeholder="ENTER PASSWORD" required>
                        <button type="submit">ACCESS WEBSITE</button>
                    </form>
                    <div id="error-message" class="error-message"></div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', promptHTML);
        
        // Add event listeners
        const form = document.getElementById('password-form');
        const passwordInput = document.getElementById('password-input');
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = passwordInput.value;
            
            if (this.authenticate(password)) {
                // Password correct, content will be shown by authenticate method
            } else {
                this.showError('INCORRECT PASSWORD. PLEASE TRY AGAIN.');
                passwordInput.value = '';
                passwordInput.focus();
            }
        });
        
        // Focus on password input
        passwordInput.focus();
        
        // Add enter key support
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                form.dispatchEvent(new Event('submit'));
            }
        });
    }
    
    showContent() {
        console.log('showContent() called');
        
        // Remove password prompt
        const prompt = document.getElementById('password-prompt');
        if (prompt) {
            prompt.remove();
            console.log('Password prompt removed');
        }
        
        // Show main content
        const container = document.querySelector('.container');
        if (container) {
            container.style.display = 'block';
            console.log('Container shown');
        }
        
        // Add logout button
        this.addLogoutButton();
        
        // Add authentication check for all links
        this.protectAllLinks();
    }
    
    showError(message) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            
            // Hide error after 3 seconds
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 3000);
        }
    }
    
    addLogoutButton() {
        // Check if logout button already exists
        if (document.getElementById('logout-btn')) {
            console.log('Logout button already exists');
            return;
        }
        
        console.log('Creating logout button...');
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'logout-btn';
        logoutBtn.textContent = 'LOGOUT';
        logoutBtn.className = 'logout-button';
        
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem(this.sessionKey);
            location.reload();
        });
        
        document.body.appendChild(logoutBtn);
        console.log('Logout button added to DOM:', logoutBtn);
        console.log('Button position:', logoutBtn.offsetTop, logoutBtn.offsetLeft);
        console.log('Button visibility:', window.getComputedStyle(logoutBtn).display);
    }
    
    protectAllLinks() {
        // Add click listeners to all links to check authentication
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                const link = e.target.tagName === 'A' ? e.target : e.target.closest('a');
                if (link && link.href) {
                    // Check if it's an internal link
                    const url = new URL(link.href);
                    if (url.hostname === window.location.hostname) {
                        // Check authentication before allowing navigation
                        if (!this.isAuthenticated()) {
                            e.preventDefault();
                            window.location.href = '/index.html';
                        }
                    }
                }
            }
        });
    }
}

    // Initialize password protection when DOM is loaded
    function initializePasswordProtection() {
        try {
            new PasswordProtection();
        } catch (error) {
            console.error('Password protection initialization failed:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePasswordProtection);
    } else {
        // DOM is already loaded
        initializePasswordProtection();
    }

})(); // End of IIFE
