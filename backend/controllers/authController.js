// Clean Authentication Controller (stateless JWT)
// Uses Supabase client only to read users table for credential verification
const supabase = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in environment variables');
}

// Use bcrypt for secure password hashing (for new passwords)
const hashPassword = async (password) => await bcrypt.hash(password, 10);

// Support both SHA256 (legacy) and bcrypt (new) for backward compatibility
const verifyPassword = async (password, storedHash) => {
  // Check if it's bcrypt format (starts with $2a$, $2b$, or $2y$)
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    // Use bcrypt verification
    return await bcrypt.compare(password, storedHash);
  } else {
    // Legacy SHA256 verification
    const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
    return sha256Hash === storedHash;
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.debug('[authController] POST /auth/login received for username:', username);
    if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password are required' });

    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .or(`full_name.eq.${username},nim.eq.${username},email.eq.${username}`);

    const user = users && users.length > 0 ? users[0] : null;
    if (error || !user) {
      console.debug('[authController] user lookup failed or not found for username:', username, 'error:', error);
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // Verify password (supports both SHA256 legacy and bcrypt new format)
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      console.debug('[authController] password mismatch for user_id:', user.user_id);
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    // If you want to restrict to admin now, keep this check. Otherwise remove.
    if (user.role && user.role !== 'admin') return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });

    const { password_hash, ...userWithoutPassword } = user;
    const token = jwt.sign({ user_id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    console.debug('[authController] login success for user_id:', user.user_id, 'issuing token (len):', token.length);

    return res.status(200).json({ success: true, message: 'Login successful', data: { user: userWithoutPassword, token } });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login', error: err.message });
  }
};

const logout = async (req, res) => {
  return res.status(200).json({ success: true, message: 'Logout successful' });
};

const getCurrentUser = async (req, res) => {
  try {
    // If middleware `verifyToken` ran, `req.user` should contain the user object
    if (req.user) {
      const { password_hash, ...userWithoutPassword } = req.user;
      return res.status(200).json({ success: true, message: 'User info retrieved', data: { user: userWithoutPassword } });
    }

    // Fallback: verify token directly (backwards compatibility)
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Authorization token required' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token', error: err.message });
    }

    const { data: users } = await supabase.from('users').select('*').eq('user_id', decoded.user_id);
    const user = users && users.length > 0 ? users[0] : null;
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { password_hash, ...userWithoutPassword } = user;
    return res.status(200).json({ success: true, message: 'User info retrieved', data: { user: userWithoutPassword } });
  } catch (err) {
    console.error('Get current user error:', err);
    return res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = { login, logout, getCurrentUser };
