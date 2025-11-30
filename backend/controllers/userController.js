// User Controller
// Handles user-related operations (get students, get student detail)
const supabase = require('../config/db');

const getAllStudents = async (req, res) => {
  try {
    const { search } = req.query;

    let query = supabase
      .from('users')
      .select('user_id, full_name, nim, email, role, created_at')
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

    return res.status(200).json({
      success: true,
      data: {
        students: students || [],
        total: students ? students.length : 0
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
      .select('user_id, full_name, nim, email, role, created_at')
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

    const coursesWithAttendance = await Promise.all(
      (enrollments || []).map(async (enrollment) => {
        const { data: attendances, error: attError } = await supabase
          .from('attendances')
          .select('status')
          .eq('enrollment_id', enrollment.enrollment_id);

        if (attError) {
          console.error('Error fetching attendance:', attError);
        }

        const attendanceCount = { present: 0, late: 0, absent: 0, sick: 0, excused: 0, total: 0 };

        (attendances || []).forEach(att => {
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
      })
    );

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
