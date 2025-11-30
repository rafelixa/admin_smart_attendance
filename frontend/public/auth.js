
// auth.js: Helper for JWT session check and logout
const API_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ? 'http://localhost:3000/api' : '/api';

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