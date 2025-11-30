const express = require('express');
const router = express.Router();
const { 
  getAttendanceLogs, 
  getTodayAttendanceLogs 
} = require('../controllers/attendanceController');

// GET /api/attendance/logs - Get all attendance logs with optional status filter
router.get('/logs', getAttendanceLogs);

// GET /api/attendance/today - Get today's attendance logs
router.get('/today', getTodayAttendanceLogs);

module.exports = router;
