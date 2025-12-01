
// auth.js: Helper for JWT session check and logout
// Requires: config.js to be loaded first

const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : '/api';

// Check if user is authenticated (token exists and valid)
async function checkAuth() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.data && data.data.user) {
      // Optionally update user info in localStorage
      localStorage.setItem('user', JSON.stringify(data.data.user));
      return true;
    }
    // Token invalid or session expired
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return false;
  } catch (e) {
    return false;
  }
}

// Logout: remove token, user, and call backend
async function logout() {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {}
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

window.checkAuth = checkAuth;
window.logout = logout;