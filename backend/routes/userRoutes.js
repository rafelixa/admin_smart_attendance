// User Routes

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

// GET /api/users/students - Get all students (protected)
router.get('/students', verifyToken, userController.getAllStudents);

// GET /api/users/students/:userId - Get student detail with attendance (protected)
router.get('/students/:userId', verifyToken, userController.getStudentDetail);

module.exports = router;
