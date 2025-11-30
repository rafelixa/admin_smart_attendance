// Permission Controller
// Handles permission request operations (get all, get detail, update status)
const supabase = require('../config/db');

const getAllPermissions = async (req, res) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from('permissions')
      .select(`
        *,
        enrollments (
          enrollment_id,
          user_id,
          course_id
        )
      `)
      .order('submitted_at', { ascending: false });

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

    const formattedPermissions = await Promise.all(
      permissions.map(async (permission) => {
        let studentData = { nim: '-', name: 'Unknown', email: '-', user_id: null };
        let courseData = { code: '-', name: '-', course_id: null };

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
        }

        return {
          id: permission.permission_id,
          enrollment_id: permission.enrollment_id,
          student_id: studentData.user_id,
          nim: studentData.nim,
          name: studentData.name,
          email: studentData.email,
          course_code: courseData.code,
          course_name: courseData.name,
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
      })
    );

    res.json({
      success: true,
      count: formattedPermissions.length,
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

    let studentData = { id: null, nim: '-', name: 'Unknown', email: '-' };
    if (permission.enrollments) {
      const { data: userData } = await supabase
        .from('users')
        .select('user_id, nim, full_name, email')
        .eq('user_id', permission.enrollments.user_id)
        .single();

      if (userData) {
        studentData = {
          id: userData.user_id,
          nim: userData.nim || '-',
          name: userData.full_name || 'Unknown',
          email: userData.email || '-'
        };
      }
    }

    let courseData = { id: null, code: '-', name: '-' };
    if (permission.enrollments) {
      const { data: courseInfo } = await supabase
        .from('courses')
        .select('course_id, course_code, course_name')
        .eq('course_id', permission.enrollments.course_id)
        .single();

      if (courseInfo) {
        courseData = {
          id: courseInfo.course_id,
          code: courseInfo.course_code || '-',
          name: courseInfo.course_name || '-'
        };
      }
    }

    let scheduleData = null;
    if (permission.enrollments && permission.enrollments.course_id) {
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

    const formattedPermission = {
      id: permission.permission_id,
      enrollment_id: permission.enrollment_id,
      student: studentData,
      course: courseData,
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
