// User Routes

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

// GET /api/users/students - Get all students (protected)
router.get('/students', verifyToken, userController.getAllStudents);

// GET /api/users/students/:userId - Get student detail with attendance (protected)
router.get('/students/:userId', verifyToken, userController.getStudentDetail);

// POST /api/users/students - Create new student (protected)
router.post('/students', verifyToken, userController.createStudent);

// DELETE /api/users/students/:userId - Soft delete student (protected)
router.delete('/students/:userId', verifyToken, userController.deleteStudent);

// GET /api/users/courses - Get all courses (protected)
router.get('/courses', verifyToken, userController.getAllCourses);

// POST /api/users/enrollments - Create enrollments for student (protected)
router.post('/enrollments', verifyToken, userController.createEnrollments);

module.exports = router;
