// User Routes
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users/students - Get all students
router.get('/students', userController.getAllStudents);

// GET /api/users/students/:userId - Get student detail with attendance
router.get('/students/:userId', userController.getStudentDetail);

module.exports = router;
