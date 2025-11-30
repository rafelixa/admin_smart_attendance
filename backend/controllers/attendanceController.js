const supabase = require('../config/db');

// ========================================
// GET ALL ATTENDANCE LOGS
// ========================================
const getAttendanceLogs = async (req, res) => {
  try {
    const { status } = req.query; // Optional filter parameter

    let query = supabase
      .from('attendances')
      .select(`
        attendance_id,
        enrollment_id,
        schedule_id,
        status,
        attendance_date,
        recorded_at,
        enrollments!inner (
          enrollment_id,
          user_id,
          course_id,
          users!inner (
            user_id,
            nim,
            full_name,
            email
          ),
          courses!inner (
            course_id,
            course_code,
            course_name
          )
        )
      `)
      .in('status', ['present', 'late']) // Only show present and late status
      .order('attendance_date', { ascending: false })
      .order('recorded_at', { ascending: false })
      .limit(100); // Limit to latest 100 records

    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching attendance logs:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch attendance logs',
        error: error.message
      });
    }

    // Format the response
    const formattedLogs = data.map(log => {
      const date = log.attendance_date 
        ? new Date(log.attendance_date).toLocaleDateString('en-CA')
        : '-';

      const time = log.recorded_at
        ? new Date(log.recorded_at).toLocaleTimeString('en-GB', { hour12: false })
        : '-';

      return {
        id: log.attendance_id,
        nim: log.enrollments?.users?.nim || log.enrollments?.users?.user_id || '-',
        name: log.enrollments?.users?.full_name || 'Unknown',
        date: date,
        time: time,
        status: log.status || 'unknown',
        course_code: log.enrollments?.courses?.course_code || '-',
        course_name: log.enrollments?.courses?.course_name || '-'
      };
    });

    res.json({
      success: true,
      count: formattedLogs.length,
      data: formattedLogs
    });

  } catch (error) {
    console.error('Error in getAttendanceLogs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// ========================================
// GET TODAY'S ATTENDANCE LOGS
// ========================================
const getTodayAttendanceLogs = async (req, res) => {
  try {
    const { status } = req.query;
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('attendances')
      .select(`
        attendance_id,
        enrollment_id,
        schedule_id,
        status,
        attendance_date,
        recorded_at,
        enrollments!inner (
          enrollment_id,
          user_id,
          course_id,
          users!inner (
            user_id,
            nim,
            full_name,
            email
          ),
          courses!inner (
            course_id,
            course_code,
            course_name
          )
        )
      `)
      .eq('attendance_date', today)
      .in('status', ['present', 'late'])
      .order('attendance_date', { ascending: false })
      .order('recorded_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching today\'s attendance logs:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch today\'s attendance logs',
        error: error.message
      });
    }

    const formattedLogs = data.map(log => {
      const date = log.attendance_date 
        ? new Date(log.attendance_date).toLocaleDateString('en-CA')
        : '-';

      const time = log.recorded_at
        ? new Date(log.recorded_at).toLocaleTimeString('en-GB', { hour12: false })
        : '-';

      return {
        id: log.attendance_id,
        nim: log.enrollments?.users?.nim || log.enrollments?.users?.user_id || '-',
        name: log.enrollments?.users?.full_name || 'Unknown',
        date: date,
        time: time,
        status: log.status || 'unknown',
        course_code: log.enrollments?.courses?.course_code || '-',
        course_name: log.enrollments?.courses?.course_name || '-'
      };
    });

    res.json({
      success: true,
      count: formattedLogs.length,
      date: today,
      data: formattedLogs
    });

  } catch (error) {
    console.error('Error in getTodayAttendanceLogs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getAttendanceLogs,
  getTodayAttendanceLogs
};
