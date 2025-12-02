
// auth.js: Helper for JWT session check and logout
// Requires: config.js to be loaded first

const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : '/api';

// Immediately check auth on script load (before any page renders)
(function() {
  const currentPath = window.location.pathname;
  const publicPaths = ['/login', '/login/', '/'];
  const isPublicPath = publicPaths.some(path => currentPath === path || currentPath.startsWith(path));
  
  if (!isPublicPath) {
    const token = localStorage.getItem('token');
    if (!token) {
      // No token - immediately redirect before page renders
      window.location.href = '/login';
      // Block further script execution
      throw new Error('Authentication required');
    }
  }
})();

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