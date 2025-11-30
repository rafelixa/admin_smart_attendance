// Authentication Controller
// Handles login logic, password verification, JWT issuance and Redis session
const supabase = require('../config/db');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const redisClient = require('../utils/redisClient');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-secure-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Hash password using SHA-256 (same as mobile app)
 */
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

/**
 * Login User
 * POST /api/auth/login
 * Body: { username, password }
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find user by username (bisa full_name, NIM, atau email)
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .or(`full_name.eq.${username},nim.eq.${username},email.eq.${username}`);

    const user = users && users.length > 0 ? users[0] : null;

    // User not found
    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Verify password using SHA-256 (same as mobile app)
    const hashedPassword = hashPassword(password);
    const isPasswordValid = hashedPassword === user.password_hash;

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Check if user role is admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    // Create session id (jti)
    const jti = crypto.randomBytes(16).toString('hex');

    // Sign JWT
    const token = jwt.sign({ user_id: user.user_id, role: user.role, jti }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Store session in Redis with expiry (seconds)
    try {
      const ttlSeconds = 7 * 24 * 3600; // default 7 days
      await redisClient.set(`session:${jti}`, JSON.stringify({ user_id: user.user_id, role: user.role }), { EX: ttlSeconds });
    } catch (err) {
      console.warn('Failed to store session in Redis', err.message);
    }

    // Success response with token
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

/**
 * Logout User
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // Expect token in Authorization header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Authorization token required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const jti = decoded.jti;
      if (jti) {
        await redisClient.del(`session:${jti}`);
      }
    } catch (err) {
      // If token invalid/expired, still return success to avoid leaking state
      console.warn('Logout: token verify failed', err.message);
    }

    return res.status(200).json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: error.message
    });
  }
};

/**
 * Get Current User
 * GET /api/auth/me
 */
const getCurrentUser = async (req, res) => {
  try {
    // Try to read Authorization header and verify token
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authorization required' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const jti = decoded.jti;
      // Check session exists in Redis
      const session = await redisClient.get(`session:${jti}`);
      if (!session) {
        return res.status(401).json({ success: false, message: 'Session invalid or expired' });
      }

      // Fetch user from DB to return latest info
      const { data: users } = await supabase.from('users').select('*').eq('user_id', decoded.user_id);
      const user = users && users.length > 0 ? users[0] : null;
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const { password_hash, ...userWithoutPassword } = user;
      return res.status(200).json({ success: true, message: 'User info retrieved', data: { user: userWithoutPassword } });
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token', error: err.message });
    }
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  login,
  logout,
  getCurrentUser
};
