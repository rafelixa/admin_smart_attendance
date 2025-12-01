// User Controller
// Handles user-related operations (get students, get student detail)
const supabase = require('../config/db');

const getAllStudents = async (req, res) => {
  try {
    const { search, page = 1, limit = 50, filter = 'all' } = req.query;

    // Get ALL students first (no pagination yet) - need all to calculate tolerance
    let query = supabase
      .from('users')
      .select('user_id, full_name, nim')
      .eq('role', 'student')
      .order('full_name', { ascending: true });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,nim.ilike.%${search}%`);
    }

    const { data: students, error } = await query;

    if (error) {
      console.error('Error fetching students:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch students'
      });
    }

    // Batch fetch tolerance info for all students to avoid N+1 problem
    const userIds = students.map(s => s.user_id);
    
    // Get all enrollments for these students in one query
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('user_id, enrollment_id')
      .in('user_id', userIds);
    
    // Get all attendance records for these enrollments in one query
    const enrollmentIds = (enrollments || []).map(e => e.enrollment_id);
    const { data: attendances } = await supabase
      .from('attendances')
      .select('enrollment_id, status')
      .in('enrollment_id', enrollmentIds);
    
    // Group attendance by enrollment (per course)
    const attendanceByEnrollment = {};
    (attendances || []).forEach(att => {
      if (!attendanceByEnrollment[att.enrollment_id]) {
        attendanceByEnrollment[att.enrollment_id] = { late: 0, absent: 0 };
      }
      const status = att.status.toLowerCase();
      if (status === 'late') attendanceByEnrollment[att.enrollment_id].late++;
      if (status === 'absent') attendanceByEnrollment[att.enrollment_id].absent++;
    });
    
    // Calculate tolerance status PER USER based on ANY course exceeding/reaching limit
    const TOLERANCE_LIMIT = 3;
    const toleranceByUser = {};
    
    students.forEach(student => {
      toleranceByUser[student.user_id] = { 
        late: 0, 
        absent: 0, 
        exceeded: false, 
        reached: false 
      };
    });
    
    (enrollments || []).forEach(enrollment => {
      const att = attendanceByEnrollment[enrollment.enrollment_id] || { late: 0, absent: 0 };
      const total = att.late + att.absent;
      
      // Check if THIS course has exceeded or reached tolerance
      if (total > TOLERANCE_LIMIT || att.late > TOLERANCE_LIMIT || att.absent > TOLERANCE_LIMIT) {
        toleranceByUser[enrollment.user_id].exceeded = true;
      } else if (total === TOLERANCE_LIMIT || att.late === TOLERANCE_LIMIT || att.absent === TOLERANCE_LIMIT) {
        toleranceByUser[enrollment.user_id].reached = true;
      }
      
      // Sum total attendance issues across all courses for display
      toleranceByUser[enrollment.user_id].late += att.late;
      toleranceByUser[enrollment.user_id].absent += att.absent;
    });
    
    // Add tolerance info to students
    let studentsWithTolerance = students.map(student => ({
      ...student,
      tolerance: toleranceByUser[student.user_id] || { late: 0, absent: 0, exceeded: false, reached: false }
    }));

    // Apply filter based on tolerance status
    if (filter === 'past') {
      studentsWithTolerance = studentsWithTolerance.filter(s => s.tolerance.exceeded === true);
    } else if (filter === 'reach') {
      studentsWithTolerance = studentsWithTolerance.filter(s => s.tolerance.reached === true);
    }
    // 'all' shows everyone, no filtering needed

    // Recalculate pagination based on filtered results
    const filteredCount = studentsWithTolerance.length;
    const totalPages = Math.ceil(filteredCount / parseInt(limit));
    const currentPage = parseInt(page);
    
    // Calculate offset for filtered results
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Apply pagination to filtered results
    const paginatedStudents = studentsWithTolerance.slice(offset, offset + parseInt(limit));

    return res.status(200).json({
      success: true,
      count: paginatedStudents.length,
      total: filteredCount,
      page: currentPage,
      limit: parseInt(limit),
      totalPages: totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      data: {
        students: paginatedStudents,
        total: filteredCount
      }
    });

  } catch (error) {
    console.error('Get students error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const getStudentDetail = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('user_id, full_name, nim')
      .eq('user_id', userId)
      .eq('role', 'student')
      .single();

    if (studentError || !student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select(`
        enrollment_id,
        course_id,
        courses (
          course_id,
          course_code,
          course_name
        )
      `)
      .eq('user_id', userId);

    if (enrollError) {
      console.error('Error fetching enrollments:', enrollError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch enrollments'
      });
    }

    // Fix N+1 query problem: fetch all attendances in one query
    const enrollmentIds = enrollments.map(e => e.enrollment_id);
    const { data: allAttendances, error: attError } = await supabase
      .from('attendances')
      .select('enrollment_id, status')
      .in('enrollment_id', enrollmentIds);

    if (attError) {
      console.error('Error fetching attendances:', attError);
    }

    // Group attendances by enrollment_id
    const attendancesByEnrollment = {};
    (allAttendances || []).forEach(att => {
      if (!attendancesByEnrollment[att.enrollment_id]) {
        attendancesByEnrollment[att.enrollment_id] = [];
      }
      attendancesByEnrollment[att.enrollment_id].push(att);
    });

    // Build courses with attendance data
    const coursesWithAttendance = enrollments.map(enrollment => {
      const attendances = attendancesByEnrollment[enrollment.enrollment_id] || [];
      const attendanceCount = { present: 0, late: 0, absent: 0, sick: 0, excused: 0, total: 0 };

      attendances.forEach(att => {
        const status = att.status.toLowerCase();
        if (attendanceCount.hasOwnProperty(status)) {
          attendanceCount[status]++;
        }
        attendanceCount.total++;
      });

      return {
        course_id: enrollment.courses.course_id,
        course_code: enrollment.courses.course_code,
        course_name: enrollment.courses.course_name,
        attendance: attendanceCount
      };
    });

    const TOLERANCE_LIMIT = 3;
    const exceeded = [];
    const reached = [];

    coursesWithAttendance.forEach(course => {
      const { late, absent } = course.attendance;
      const total = late + absent;

      if (total > TOLERANCE_LIMIT || late > TOLERANCE_LIMIT || absent > TOLERANCE_LIMIT) {
        exceeded.push({
          course_id: course.course_id,
          course_code: course.course_code,
          course_name: course.course_name,
          attendance: { late, absent, total }
        });
      } else if (total === TOLERANCE_LIMIT || late === TOLERANCE_LIMIT || absent === TOLERANCE_LIMIT) {
        reached.push({
          course_id: course.course_id,
          course_code: course.course_code,
          course_name: course.course_name,
          attendance: { late, absent, total }
        });
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        student,
        courses: coursesWithAttendance,
        tolerance: {
          has_issues: exceeded.length > 0 || reached.length > 0,
          exceeded,
          reached
        }
      }
    });

  } catch (error) {
    console.error('Get student detail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getAllStudents,
  getStudentDetail
};
