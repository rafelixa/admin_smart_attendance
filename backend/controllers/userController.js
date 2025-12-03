// User Controller
// Handles user-related operations (get students, get student detail)
const supabase = require('../config/db');

const getAllStudents = async (req, res) => {
  try {
    const { search, page = 1, limit = 50, filter = 'all' } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build base query with pagination FIRST (more efficient)
    let countQuery = supabase
      .from('users')
      .select('user_id', { count: 'exact', head: true })
      .eq('role', 'student');

    let query = supabase
      .from('users')
      .select('user_id, full_name, nim')
      .eq('role', 'student')
      .order('full_name', { ascending: true })
      .range(offset, offset + limitNum - 1);

    if (search) {
      const searchFilter = `full_name.ilike.%${search}%,nim.ilike.%${search}%`;
      query = query.or(searchFilter);
      countQuery = countQuery.or(searchFilter);
    }

    // Execute count and data queries in parallel
    const [{ count: totalCount }, { data: students, error }] = await Promise.all([
      countQuery,
      query
    ]);

    if (error) {
      console.error('Error fetching students:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch students'
      });
    }

    // Batch fetch tolerance info for PAGINATED students only
    const userIds = students.map(s => s.user_id);
    
    if (userIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: { students: [], exceeded: [], reached: [] },
        page: pageNum,
        limit: limitNum,
        total: 0,
        totalPages: 0
      });
    }
    
    // Get only active enrollments for these students (optimized with index)
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('user_id, enrollment_id')
      .in('user_id', userIds)
      .eq('is_deleted', false);
    
    if (!enrollments || enrollments.length === 0) {
      const studentsWithTolerance = students.map(s => ({
        ...s,
        tolerance: { late: 0, absent: 0, exceeded: false, reached: false }
      }));
      
      return res.status(200).json({
        success: true,
        data: { students: studentsWithTolerance, exceeded: [], reached: [] },
        page: pageNum,
        limit: limitNum,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limitNum)
      });
    }
    
    // Get attendance COUNTS aggregated by enrollment (more efficient than fetching all records)
    const enrollmentIds = enrollments.map(e => e.enrollment_id);
    const { data: attendances } = await supabase
      .from('attendances')
      .select('enrollment_id, status')
      .in('enrollment_id', enrollmentIds)
      .in('status', ['late', 'absent']); // Only fetch relevant statuses
    
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

    // For filtered views, we return the paginated results as-is since we already fetched the right page
    // For filter='past' or 'reach', we need to apply post-processing filter
    let finalStudents = studentsWithTolerance;
    let finalTotal = totalCount || students.length;
    
    if (filter === 'past') {
      finalStudents = studentsWithTolerance.filter(s => s.tolerance.exceeded === true);
      finalTotal = finalStudents.length; // Can't predict filtered count without fetching all
    } else if (filter === 'reach') {
      finalStudents = studentsWithTolerance.filter(s => s.tolerance.reached === true);
      finalTotal = finalStudents.length; // Can't predict filtered count without fetching all
    }

    const totalPages = Math.ceil(finalTotal / limitNum);

    return res.status(200).json({
      success: true,
      count: finalStudents.length,
      total: finalTotal,
      page: pageNum,
      limit: limitNum,
      totalPages: totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      data: {
        students: finalStudents,
        total: finalTotal
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
      .eq('user_id', userId)
      .eq('is_deleted', false);

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

    // Fetch approved permissions for Sick and Excused count
    const { data: allPermissions, error: permError } = await supabase
      .from('permissions')
      .select('enrollment_id, reason, status')
      .in('enrollment_id', enrollmentIds)
      .eq('status', 'approved');

    if (permError) {
      console.error('Error fetching permissions:', permError);
    }

    console.log('=== DEBUG: Approved Permissions ===');
    console.log('Enrollment IDs:', enrollmentIds);
    console.log('Approved Permissions:', allPermissions);
    console.log('===================================');

    // Group attendances by enrollment_id
    const attendancesByEnrollment = {};
    (allAttendances || []).forEach(att => {
      if (!attendancesByEnrollment[att.enrollment_id]) {
        attendancesByEnrollment[att.enrollment_id] = [];
      }
      attendancesByEnrollment[att.enrollment_id].push(att);
    });

    // Group permissions by enrollment_id
    const permissionsByEnrollment = {};
    (allPermissions || []).forEach(perm => {
      if (!permissionsByEnrollment[perm.enrollment_id]) {
        permissionsByEnrollment[perm.enrollment_id] = [];
      }
      permissionsByEnrollment[perm.enrollment_id].push(perm);
    });

    // Build courses with attendance data
    const coursesWithAttendance = enrollments.map(enrollment => {
      const attendances = attendancesByEnrollment[enrollment.enrollment_id] || [];
      const permissions = permissionsByEnrollment[enrollment.enrollment_id] || [];
      const attendanceCount = { present: 0, late: 0, absent: 0, sick: 0, excused: 0, total: 0 };

      // Count Present, Late, Absent from attendances table
      attendances.forEach(att => {
        const status = att.status.toLowerCase();
        if (status === 'present' || status === 'late' || status === 'absent') {
          attendanceCount[status]++;
          attendanceCount.total++;
        }
      });

      // Count Sick and Excused from approved permissions
      permissions.forEach(perm => {
        const reason = (perm.reason || '').toLowerCase().trim();
        console.log(`Processing permission - Enrollment: ${enrollment.enrollment_id}, Reason: "${reason}"`);
        
        if (reason === 'sick' || reason === 'medical appointment') {
          attendanceCount.sick++;
          attendanceCount.total++;
          console.log(`  → Counted as SICK (total sick: ${attendanceCount.sick})`);
        } else if (reason === 'family emergency' || reason === 'personal matter' || reason === 'other') {
          attendanceCount.excused++;
          attendanceCount.total++;
          console.log(`  → Counted as EXCUSED (total excused: ${attendanceCount.excused})`);
        } else {
          console.log(`  → Reason not matched, skipped`);
        }
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

// Create new student
const createStudent = async (req, res) => {
  try {
    const { full_name, nim, email, password } = req.body;

    // Validation
    if (!full_name || !nim || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: full_name, nim, email, password'
      });
    }

    // Validate NIM format: minimum 11 digits, only numbers
    const nimRegex = /^[0-9]{11,}$/;
    if (!nimRegex.test(nim)) {
      return res.status(400).json({
        success: false,
        message: 'NIM must be at least 11 digits and contain only numbers'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if NIM already exists
    const { data: existingNim } = await supabase
      .from('users')
      .select('nim')
      .eq('nim', nim)
      .maybeSingle();

    if (existingNim) {
      return res.status(409).json({
        success: false,
        message: 'NIM already exists'
      });
    }

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Hash password using SHA-256 (same as mobile app)
    const crypto = require('crypto');
    const password_hash = crypto.createHash('sha256').update(password).digest('hex');

    // Use NIM as user_id (consistent with existing users)
    const user_id = nim;

    // Insert new student
    const { data: newStudent, error } = await supabase
      .from('users')
      .insert({
        user_id,
        full_name,
        nim,
        email,
        password_hash,
        role: 'student'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating student:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create student',
        error: error.message
      });
    }

    // Remove password_hash from response
    const { password_hash: _, ...studentData } = newStudent;

    return res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: studentData
    });

  } catch (error) {
    console.error('Create student error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Soft delete student (hide from display, don't delete from database)
const deleteStudent = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists and is a student
    const { data: student, error: fetchError } = await supabase
      .from('users')
      .select('user_id, role, full_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching student for delete:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: fetchError.message
      });
    }

    if (!student) {
      console.error('Student not found with user_id:', userId);
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (student.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete students, current role: ' + student.role
      });
    }

    // Soft delete: Add is_deleted column flag
    // Since schema doesn't have is_deleted, we'll use a workaround:
    // Update role to 'deleted_student' to hide from listing
    const { error: updateError } = await supabase
      .from('users')
      .update({
        role: 'deleted_student',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error soft deleting student:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete student',
        error: updateError.message
      });
    }

    return res.status(200).json({
      success: true,
      message: `Student ${student.full_name} has been removed from the system`,
      data: {
        user_id: userId,
        full_name: student.full_name
      }
    });

  } catch (error) {
    console.error('Delete student error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get all courses
const getAllCourses = async (req, res) => {
  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('course_id, course_code, course_name')
      .order('course_code', { ascending: true });

    if (error) {
      console.error('Error fetching courses:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch courses'
      });
    }

    return res.status(200).json({
      success: true,
      data: courses
    });

  } catch (error) {
    console.error('Get courses error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Manage enrollments for student (create, restore, or soft delete)
const createEnrollments = async (req, res) => {
  try {
    const { user_id, course_ids } = req.body;

    // Validate input
    if (!user_id || !course_ids || !Array.isArray(course_ids)) {
      return res.status(400).json({
        success: false,
        message: 'User ID and course IDs array are required'
      });
    }

    // Check if user exists and is a student
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id, full_name, role')
      .eq('user_id', user_id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Can only enroll students'
      });
    }

    // Ensure course_ids are integers
    const courseIdsInt = course_ids.map(id => parseInt(id, 10));

    // Get ALL existing enrollments (including soft deleted ones)
    const { data: allEnrollments } = await supabase
      .from('enrollments')
      .select('enrollment_id, course_id, is_deleted')
      .eq('user_id', user_id);

    // Create Set for fast lookup of selected courses
    const selectedCourseSet = new Set(courseIdsInt);
    
    const existingMap = new Map();
    (allEnrollments || []).forEach(e => {
      existingMap.set(e.course_id, { enrollment_id: e.enrollment_id, is_deleted: e.is_deleted });
    });

    // Determine which courses need to be added/restored and which to soft delete
    const toCreate = [];  // Truly new enrollments
    const toRestore = []; // Soft deleted enrollments to restore
    const toSoftDelete = [];

    // Check selected course_ids
    courseIdsInt.forEach(course_id => {
      const existing = existingMap.get(course_id);
      if (!existing) {
        // New enrollment - need to create
        toCreate.push(course_id);
      } else if (existing.is_deleted) {
        // Was soft deleted - need to restore
        toRestore.push(existing.enrollment_id);
      }
      // If exists and not deleted, do nothing (already enrolled)
    });

    // Courses not in course_ids but exist and not deleted = soft delete
    allEnrollments?.forEach(e => {
      if (!selectedCourseSet.has(e.course_id) && !e.is_deleted) {
        toSoftDelete.push(e.enrollment_id);
      }
    });

    let addedCount = 0;
    let deletedCount = 0;

    // Create new enrollments
    if (toCreate.length > 0) {
      const enrollmentsToCreate = toCreate.map(course_id => ({
        user_id,
        course_id,
        is_deleted: false,
        enrolled_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('enrollments')
        .insert(enrollmentsToCreate);

      if (insertError) {
        console.error('Error creating enrollments:', insertError);
        return res.status(500).json({
          success: false,
          message: 'Failed to create enrollments',
          error: insertError.message
        });
      }
      addedCount += toCreate.length;
    }

    // Restore soft deleted enrollments
    if (toRestore.length > 0) {
      const { error: restoreError } = await supabase
        .from('enrollments')
        .update({ is_deleted: false })
        .in('enrollment_id', toRestore);

      if (restoreError) {
        console.error('Error restoring enrollments:', restoreError);
        return res.status(500).json({
          success: false,
          message: 'Failed to restore enrollments',
          error: restoreError.message
        });
      }
      addedCount += toRestore.length;
    }

    // Soft delete unchecked enrollments
    if (toSoftDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('enrollments')
        .update({ is_deleted: true })
        .in('enrollment_id', toSoftDelete);

      if (deleteError) {
        console.error('Error soft deleting enrollments:', deleteError);
        return res.status(500).json({
          success: false,
          message: 'Failed to remove enrollments',
          error: deleteError.message
        });
      }
      deletedCount = toSoftDelete.length;
    }

    const operations = [];
    if (addedCount > 0) operations.push(`added ${addedCount}`);
    if (deletedCount > 0) operations.push(`removed ${deletedCount}`);

    const message = operations.length > 0
      ? `Successfully ${operations.join(', ')} course(s) for ${user.full_name}`
      : `No changes made for ${user.full_name}`;

    return res.status(200).json({
      success: true,
      message,
      data: {
        user_id,
        added: addedCount,
        deleted: deletedCount
      }
    });

  } catch (error) {
    console.error('Manage enrollments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getAllStudents,
  getStudentDetail,
  createStudent,
  deleteStudent,
  getAllCourses,
  createEnrollments
};
