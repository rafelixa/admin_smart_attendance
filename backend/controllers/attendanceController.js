const supabase = require('../config/db');

// ========================================
// GET ALL ATTENDANCE LOGS
// ========================================
const getAttendanceLogs = async (req, res) => {
  try {
    const { status, date, page = 1, limit = 50 } = req.query; // Add pagination parameters

    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // First, get total count for pagination info
    let countQuery = supabase
      .from('attendances')
      .select('attendance_id', { count: 'exact', head: true })
      .in('status', ['present', 'late']);

    // Apply same filters to count query
    if (date) {
      countQuery = countQuery.eq('attendance_date', date);
    }
    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting attendance logs:', countError);
      return res.status(500).json({
        success: false,
        message: 'Failed to count attendance logs',
        error: countError.message
      });
    }

    // Now get paginated data - optimized to select only required fields
    let query = supabase
      .from('attendances')
      .select(`
        attendance_id,
        status,
        attendance_date,
        recorded_at,
        enrollments!inner (
          users!inner (
            nim,
            full_name
          ),
          courses!inner (
            course_code,
            course_name
          )
        )
      `)
      .in('status', ['present', 'late']) // Only show present and late status
      .order('attendance_date', { ascending: false })
      .order('recorded_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    // Filter by date if provided
    if (date) {
      query = query.eq('attendance_date', date);
    }

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
      // Only include logs with complete join data
      if (!log.enrollments || !log.enrollments.users || !log.enrollments.courses) return null;
      const date = log.attendance_date 
        ? new Date(log.attendance_date).toLocaleDateString('en-CA')
        : '-';
      const time = log.recorded_at
        ? new Date(log.recorded_at).toLocaleTimeString('en-GB', { hour12: false })
        : '-';
      return {
        id: log.attendance_id,
        nim: log.enrollments.users.nim,
        name: log.enrollments.users.full_name,
        date: date,
        time: time,
        status: log.status,
        course_code: log.enrollments.courses.course_code,
        course_name: log.enrollments.courses.course_name
      };
    }).filter(Boolean);

    // Calculate pagination metadata
    const totalPages = Math.ceil(count / parseInt(limit));
    const currentPage = parseInt(page);

    res.json({
      success: true,
      count: formattedLogs.length,
      total: count,
      page: currentPage,
      limit: parseInt(limit),
      totalPages: totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
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
        status,
        attendance_date,
        recorded_at,
        enrollments!inner (
          users!inner (
            nim,
            full_name
          ),
          courses!inner (
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
