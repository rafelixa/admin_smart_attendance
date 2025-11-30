
// Middleware for authentication and authorization using JWT (stateless)
const jwt = require('jsonwebtoken');
const supabase = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-secure-secret';

// Verify token middleware - sets req.user on success
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Authorization token required' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token', error: err.message });
    }

    // Optionally fetch fresh user from DB
    const { data: users } = await supabase.from('users').select('*').eq('user_id', decoded.user_id);
    const user = users && users.length > 0 ? users[0] : null;
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    console.error('verifyToken error', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin privileges required' });
  next();
};

const requireLecturer = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
  if (req.user.role !== 'lecturer' && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Lecturer privileges required' });
  next();
};

module.exports = { verifyToken, requireAuth, requireAdmin, requireLecturer };
