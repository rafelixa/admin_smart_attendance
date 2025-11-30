// Authentication Controller
// Handles login logic and password verification
const supabase = require('../config/db');
const crypto = require('crypto');

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

    // Success response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword
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
    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
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
    return res.status(200).json({
      success: true,
      message: 'User info retrieved',
      data: null
    });
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
