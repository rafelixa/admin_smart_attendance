// Middleware for authentication and authorization
const supabase = require('../config/db');

const requireAuth = (req, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin privileges required' });
  }
  next();
};

const requireLecturer = (req, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (user.role !== 'lecturer' && user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Lecturer privileges required' });
  }
  next();
};

module.exports = { requireAuth, requireAdmin, requireLecturer };
