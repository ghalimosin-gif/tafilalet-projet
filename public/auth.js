/**
 * Authentication Handler
 */

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.getElementById('loginBtn');

    // Only attach handler if the form exists on the current page
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Clear previous errors
            if (errorMessage) errorMessage.style.display = 'none';
            if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = 'Connexion en cours...'; }

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // Redirect based on role
                    if (data.role === 'admin') {
                        window.location.href = '/admin.html';
                    } else {
                        window.location.href = '/driver.html';
                    }
                } else {
                    if (errorMessage) { errorMessage.textContent = data.error || 'Identifiants invalides'; errorMessage.style.display = 'block'; }
                    if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Se connecter'; }
                }
            } catch (error) {
                console.error('Login error:', error);
                if (errorMessage) { errorMessage.textContent = 'Erreur de connexion. Veuillez réessayer.'; errorMessage.style.display = 'block'; }
                if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Se connecter'; }
            }
        });
    }
});

// Check authentication status
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();

        if (data.authenticated) {
            // User is logged in
            if (window.location.pathname === '/login.html' || window.location.pathname === '/') {
                // Redirect to appropriate dashboard
                if (data.role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/driver.html';
                }
            }
            return data;
        } else {
            // User is not logged in
            if (window.location.pathname !== '/login.html' && window.location.pathname !== '/') {
                window.location.href = '/login.html';
            }
            return null;
        }
    } catch (error) {
        console.error('Auth check error:', error);
        return null;
    }
}

// Logout function
async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login.html';
    }
}
