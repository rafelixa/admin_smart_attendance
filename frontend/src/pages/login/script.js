// Login page script: password toggle, validation and navigation to dashboard

document.addEventListener('DOMContentLoaded', async function () {
    // Jika sudah login/session valid, redirect ke dashboard
    if (window.checkAuth && await window.checkAuth()) {
        window.location.href = '/';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const passwordToggle = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');
    const usernameInput = document.getElementById('username');
    const loginButton = document.querySelector('.login-button');

    // Backend API URL - use global config
    const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : '/api';

    // Password visibility toggle
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', function () {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;

            const icon = passwordToggle.querySelector('i');
            if (icon) {
                if (type === 'password') {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                } else {
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                }
            }
        });
    }

    // Form submission handling
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const username = usernameInput?.value?.trim() ?? '';
            const password = passwordInput?.value ?? '';

            // Validation
            if (!username || !password) {
                showError('Please enter both username and password');
                return;
            }

            hideError();
            showLoading();

            try {
                // Call backend API
                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.success) {
                    // Store user data and token in localStorage
                    localStorage.setItem('user', JSON.stringify(data.data.user));
                    localStorage.setItem('token', data.data.token);
                    showSuccess();
                    // Immediately verify token by calling /auth/me and show server message on failure
                    try {
                        const verifyRes = await fetch(`${API_URL}/auth/me`, {
                            headers: { 'Authorization': `Bearer ${data.data.token}` }
                        });
                        const verifyData = await verifyRes.json();
                        console.log('verify /auth/me response', verifyRes.status, verifyData);
                        if (verifyRes.ok && verifyData.success && verifyData.data && verifyData.data.user) {
                            window.location.href = '/';
                            return;
                        }
                        // If verification failed, show server-provided message
                        showError(verifyData.message || 'Session error, please login again.');
                        resetButton();
                    } catch (err) {
                        console.error('Error verifying session after login:', err);
                        showError('Session error, please login again.');
                        resetButton();
                    }
                } else {
                    // Login failed - show specific error message
                    showError(data.message || 'Invalid username or password');
                    if (passwordInput) passwordInput.value = '';
                    passwordInput?.focus();
                    resetButton();
                }
            } catch (error) {
                console.error('Login error:', error);
                showError('Server connection error. Please try again.');
                resetButton();
            }
        });
    }

    function showError(message = 'Invalid email or password') {
        if (!errorMessage) return;
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.classList.add('shake');
        setTimeout(() => errorMessage.classList.remove('shake'), 500);
    }

    function hideError() {
        if (!errorMessage) return;
        errorMessage.style.display = 'none';
    }

    function showLoading() {
        if (!loginButton) return;
        loginButton.textContent = 'Logging in...';
        loginButton.disabled = true;
        loginButton.style.pointerEvents = 'none';
        loginButton.style.opacity = '0.7';
    }

    function showSuccess() {
        if (!loginButton) return;
        loginButton.textContent = 'Success!';
        loginButton.style.backgroundColor = '#28a745';
    }

    function resetButton() {
        if (!loginButton) return;
        loginButton.textContent = 'Sign In';
        loginButton.disabled = false;
        loginButton.style.pointerEvents = 'auto';
        loginButton.style.opacity = '1';
        loginButton.style.backgroundColor = '';
    }

    // Remove error when user types
    usernameInput?.addEventListener('input', hideError);
    passwordInput?.addEventListener('input', hideError);

    // Autofocus
    usernameInput?.focus();
});

// Add a small shake animation style used for the error message
;(function addShakeStyle(){
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake { 0%,100%{transform:translateX(0)} 10%,30%,50%,70%,90%{transform:translateX(-5px)} 20%,40%,60%,80%{transform:translateX(5px)} }
        .shake { animation: shake 0.5s ease-in-out; }
    `;
    document.head.appendChild(style);
})();