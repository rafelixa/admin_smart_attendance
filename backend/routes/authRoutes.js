// Authentication Routes
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/login - Login user
router.post('/login', authController.login);

// POST /api/auth/logout - Logout user
router.post('/logout', authController.logout);

// GET /api/auth/me - Get current user info
router.get('/me', authController.getCurrentUser);

module.exports = router;
