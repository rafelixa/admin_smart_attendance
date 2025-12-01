// Permission Controller
// Handles permission request operations (get all, get detail, update status)
const supabase = require('../config/db');

// Helper function to fetch permission with all related data
async function fetchPermissionWithDetails(permission) {
  let studentData = { nim: '-', name: 'Unknown', email: '-', user_id: null };
  let courseData = { code: '-', name: '-', course_id: null };
  let scheduleData = null;

  if (permission.enrollments) {
    const { data: userData } = await supabase
      .from('users')
      .select('user_id, nim, full_name, email')
      .eq('user_id', permission.enrollments.user_id)
      .single();

    if (userData) {
      studentData = {
        user_id: userData.user_id,
        nim: userData.nim || '-',
        name: userData.full_name || 'Unknown',
        email: userData.email || '-'
      };
    }

    const { data: courseInfo } = await supabase
      .from('courses')
      .select('course_id, course_code, course_name')
      .eq('course_id', permission.enrollments.course_id)
      .single();

    if (courseInfo) {
      courseData = {
        course_id: courseInfo.course_id,
        code: courseInfo.course_code || '-',
        name: courseInfo.course_name || '-'
      };
    }

    const { data: scheduleInfo } = await supabase
      .from('schedules')
      .select('schedule_id, day, start_time, end_time, room')
      .eq('course_id', permission.enrollments.course_id)
      .maybeSingle();

    if (scheduleInfo) {
      scheduleData = {
        day: scheduleInfo.day,
        start_time: scheduleInfo.start_time,
        end_time: scheduleInfo.end_time,
        room: scheduleInfo.room
      };
    }
  }

  return { studentData, courseData, scheduleData };
}

const getAllPermissions = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Get total count
    let countQuery = supabase
      .from('permissions')
      .select('permission_id', { count: 'exact', head: true });

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting permissions:', countError);
      return res.status(500).json({
        success: false,
        message: 'Failed to count permissions',
        error: countError.message
      });
    }

    // Get paginated data with enrollments
    let query = supabase
      .from('permissions')
      .select(`
        permission_id,
        enrollment_id,
        permission_date,
        start_time,
        end_time,
        reason,
        status,
        submitted_at,
        enrollments (
          enrollment_id,
          user_id,
          course_id
        )
      `)
      .order('submitted_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: permissions, error: permError } = await query;

    if (permError) {
      console.error('Error fetching permissions:', permError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch permission requests',
        error: permError.message
      });
    }

    // OPTIMIZATION: Batch fetch all users and courses in 2 queries instead of N*3 queries
    const userIds = [...new Set(permissions.map(p => p.enrollments?.user_id).filter(Boolean))];
    const courseIds = [...new Set(permissions.map(p => p.enrollments?.course_id).filter(Boolean))];

    // Batch fetch users
    const { data: users } = userIds.length > 0 
      ? await supabase.from('users').select('user_id, nim, full_name').in('user_id', userIds)
      : { data: [] };

    // Batch fetch courses
    const { data: courses } = courseIds.length > 0
      ? await supabase.from('courses').select('course_id, course_code, course_name').in('course_id', courseIds)
      : { data: [] };

    // Create lookup maps for O(1) access
    const userMap = new Map(users?.map(u => [u.user_id, u]) || []);
    const courseMap = new Map(courses?.map(c => [c.course_id, c]) || []);

    // Format permissions using lookup maps (no additional queries!)
    const formattedPermissions = permissions.map(permission => {
      const user = userMap.get(permission.enrollments?.user_id) || {};
      const course = courseMap.get(permission.enrollments?.course_id) || {};

      return {
        id: permission.permission_id,
        enrollment_id: permission.enrollment_id,
        student_id: user.user_id || null,
        nim: user.nim || '-',
        name: user.full_name || 'Unknown',
        course_code: course.course_code || '-',
        course_name: course.course_name || '-',
        permission_date: permission.permission_date,
        start_time: permission.start_time,
        end_time: permission.end_time,
        reason: permission.reason,
        status: permission.status,
        submitted_at: permission.submitted_at
      };
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      count: formattedPermissions.length,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: totalPages,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1,
      data: formattedPermissions
    });

  } catch (error) {
    console.error('Error in getAllPermissions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const getPermissionDetail = async (req, res) => {
  try {
    const { permissionId } = req.params;

    const { data: permission, error: permError } = await supabase
      .from('permissions')
      .select(`
        *,
        enrollments (
          enrollment_id,
          user_id,
          course_id
        )
      `)
      .eq('permission_id', permissionId)
      .single();

    if (permError || !permission) {
      console.error('Error fetching permission detail:', permError);
      return res.status(404).json({
        success: false,
      message: 'Permission request not found'
    });
  }

  const { studentData, courseData, scheduleData } = await fetchPermissionWithDetails(permission);
  
  const formattedPermission = {
    id: permission.permission_id,
    enrollment_id: permission.enrollment_id,
    student: {
      id: studentData.user_id,
      nim: studentData.nim,
      name: studentData.name,
      email: studentData.email
    },
    course: {
      id: courseData.course_id,
      code: courseData.code,
      name: courseData.name
    },
    schedule: scheduleData,
      permission_date: permission.permission_date,
      start_time: permission.start_time,
      end_time: permission.end_time,
      reason: permission.reason,
      description: permission.description,
      evidence: permission.evidence,
      image_link: permission.image_link,
      status: permission.status,
      submitted_at: permission.submitted_at,
      approved_at: permission.approved_at,
      approved_by: permission.approved_by
    };

    res.json({
      success: true,
      data: formattedPermission
    });

  } catch (error) {
    console.error('Error in getPermissionDetail:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const updatePermissionStatus = async (req, res) => {
  try {
    const { permissionId } = req.params;
    const { status, admin_id } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be either "approved" or "rejected"'
      });
    }

    if (!admin_id) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID is required'
      });
    }

    const { data: existingPermission, error: checkError } = await supabase
      .from('permissions')
      .select('permission_id, status')
      .eq('permission_id', permissionId)
      .single();

    if (checkError || !existingPermission) {
      return res.status(404).json({
        success: false,
        message: 'Permission request not found'
      });
    }

    if (existingPermission.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot update permission. Current status is already "${existingPermission.status}"`
      });
    }

    const { data, error } = await supabase
      .from('permissions')
      .update({
        status: status,
        approved_at: new Date().toISOString(),
        approved_by: admin_id,
        updated_at: new Date().toISOString()
      })
      .eq('permission_id', permissionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating permission status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update permission status',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: `Permission ${status} successfully`,
      data: data
    });

  } catch (error) {
    console.error('Error in updatePermissionStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

module.exports = {
  getAllPermissions,
  getPermissionDetail,
  updatePermissionStatus
};
