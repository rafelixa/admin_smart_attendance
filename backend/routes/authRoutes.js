// Authentication Routes
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// POST /api/auth/login - Login user
router.post('/login', authController.login);

// POST /api/auth/logout - Logout user (requires token)
router.post('/logout', verifyToken, authController.logout);

// GET /api/auth/me - Get current user info (requires token)
router.get('/me', verifyToken, authController.getCurrentUser);

module.exports = router;
