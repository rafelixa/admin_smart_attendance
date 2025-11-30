
const express = require('express');
const router = express.Router();
const { 
  getAttendanceLogs, 
  getTodayAttendanceLogs 
} = require('../controllers/attendanceController');
const { verifyToken } = require('../middleware/auth');

// GET /api/attendance/logs - Get all attendance logs with optional status filter (protected)
router.get('/logs', verifyToken, getAttendanceLogs);

// GET /api/attendance/today - Get today's attendance logs (protected)
router.get('/today', verifyToken, getTodayAttendanceLogs);

module.exports = router;
