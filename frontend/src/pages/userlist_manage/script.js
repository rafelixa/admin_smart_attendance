// ========================================
// USER LIST MANAGE - STUDENT DETAIL PAGE
// Fetch real data from Supabase via Backend API
// ========================================

// API Configuration - use global config
const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : '/api';

// AUTHENTICATION CHECK: now uses JWT session to backend


// ========================================
// GET USER ID FROM URL
// ========================================
function getUserIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// ========================================
// LOADING FUNCTIONS
// ========================================
function showLoading() {
  // Remove existing overlay if any
  const existingOverlay = document.querySelector('.loading-overlay');
  if (existingOverlay) return;
  
  // Create full page overlay
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(246, 246, 246, 0.98);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;
  overlay.innerHTML = `
    <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 20px; color: #666;"></i>
    <p style="font-size: 18px; color: #666; font-family: Poppins, sans-serif;">Loading student detail...</p>
  `;
  document.body.appendChild(overlay);
}

function hideLoading() {
  const overlay = document.querySelector('.loading-overlay');
  if (overlay) {
    overlay.remove();
  }
}

// In-flight request control
let detailAbortController = null;

// ========================================
// FETCH STUDENT DETAIL FROM API (cancellable)
// ========================================
async function fetchStudentDetail(userId, showLoadingOverlay = false) {
  try {
    if (showLoadingOverlay) {
      showLoading();
    }

    // Cancel previous request to avoid race conditions with auto-refresh
    if (detailAbortController) {
      detailAbortController.abort();
    }
    detailAbortController = new AbortController();

    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/users/students/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      signal: detailAbortController.signal
    });
    const data = await response.json();
    
    if (data.success) {
      displayStudentDetail(data.data);
      if (showLoadingOverlay) {
        hideLoading();
      }
    } else {
      if (showLoadingOverlay) {
        hideLoading();
      }
      console.error('Failed to fetch student detail:', data.message);
      alert('Student not found');
      window.location.href = '/userlist';
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      // ignored: a newer request started
      return;
    }
    if (showLoadingOverlay) {
      hideLoading();
    }
    console.error('Error fetching student detail:', error);
    alert('Connection error. Please check if backend is running.');
  }
}

// ========================================
// DISPLAY STUDENT DETAIL
// ========================================
function displayStudentDetail(data) {
  const { student, courses, tolerance } = data;

  // Update enrolled course IDs for enrollment modal
  enrolledCourseIds = courses.map(c => c.course_id);

  // Render detail info secara dinamis
  const detailGrid = document.querySelector('.detail-grid');
  if (detailGrid) {
    detailGrid.innerHTML = `
      <div class="detail-row">
        <span class="detail-label">Name</span>
        <span class="detail-value">${student.full_name || '-'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">NIM</span>
        <span class="detail-value">${student.nim || '-'}</span>
      </div>
    `;
  }

  // Update class information table
  updateClassTable(courses);

  // Update condition alerts
  updateConditionAlerts(tolerance);

  console.log('Student detail displayed successfully');
  const content = document.querySelector('.content');
  if (content) content.style.display = 'block';
}

// ========================================
// UPDATE CLASS TABLE
// ========================================
function updateClassTable(courses) {
  const tableContainer = document.querySelector('.class-table');
  if (!tableContainer) return;

  // Keep header
  const header = tableContainer.querySelector('.table-header');
  
  // Clear all rows
  tableContainer.innerHTML = '';
  
  // Re-add header
  if (header) {
    tableContainer.appendChild(header);
  }

  // Add course rows
  courses.forEach(course => {
    const row = document.createElement('div');
    row.className = 'table-row';

    row.innerHTML = `
      <div class="table-cell class-code">${course.course_code}</div>
      <div class="table-cell class-name">${course.course_name}</div>
      <div class="table-cell present-cell">${course.attendance.present}/16</div>
      <div class="table-cell late-cell">${course.attendance.late}/16</div>
      <div class="table-cell absent-cell">${course.attendance.absent}/16</div>
      <div class="table-cell sick-cell">${course.attendance.sick}/16</div>
      <div class="table-cell excused-cell">${course.attendance.excused}/16</div>
    `;

    tableContainer.appendChild(row);
  });
}

// ========================================
// UPDATE CONDITION ALERTS
// ========================================
function updateConditionAlerts(tolerance) {
  const alertsContainer = document.querySelector('.condition-alerts');
  if (!alertsContainer) return;

  // Clear existing alerts
  alertsContainer.innerHTML = '';

  if (!tolerance.has_issues) {
    alertsContainer.innerHTML = `
      <p style="color: #10b981; text-align: center; padding: 20px; margin: 0;">
        ✓ No tolerance issues detected for this student.
      </p>
    `;
    return;
  }

  // Show exceeded tolerance (red alert)
  if (tolerance.exceeded.length > 0) {
    const exceededAlert = createAlert(
      'exceeded',
      'Exceeded Tolerance Limit',
      'The following courses have exceeded tolerance limits:',
      tolerance.exceeded
    );
    alertsContainer.appendChild(exceededAlert);
  }

  // Show reached tolerance (yellow alert)
  if (tolerance.reached.length > 0) {
    const reachedAlert = createAlert(
      'reached',
      'Reached Tolerance Limit',
      'The following courses have reached tolerance limits:',
      tolerance.reached
    );
    alertsContainer.appendChild(reachedAlert);
  }
}

// ========================================
// CREATE ALERT ELEMENT
// ========================================
function createAlert(type, title, subtitle, courses) {
  const alert = document.createElement('div');
  alert.className = `alert ${type}`;

  const icon = type === 'exceeded' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle';

  let coursesHTML = '';
  courses.forEach(course => {
    const total = course.attendance.late + course.attendance.absent;
    coursesHTML += `
      <div class="class-alert-item">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="class-alert-name">${course.course_code}</div>
            <div class="class-alert-details">
              <span class="class-alert-late">Late: ${course.attendance.late}</span>
              <span class="class-alert-absent">Absent: ${course.attendance.absent}</span>
              <span class="class-alert-total">Total: ${total}/3</span>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  alert.innerHTML = `
    <div class="alert-header">
      <i class="fas ${icon} alert-icon"></i>
      <div class="alert-title">${title}</div>
    </div>
    <p class="alert-subtitle">${subtitle}</p>
    <div class="alert-classes">
      ${coursesHTML}
    </div>
  `;

  return alert;
}

// ========================================
// ENROLLMENT FUNCTIONS
// ========================================
let allCourses = [];
let enrolledCourseIds = [];
let currentStudentId = null;

// Fetch all available courses
async function fetchAllCourses() {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/users/courses`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    const data = await response.json();
    
    if (data.success) {
      allCourses = data.data;
    } else {
      console.error('Failed to fetch courses:', data.message);
    }
  } catch (error) {
    console.error('Error fetching courses:', error);
  }
}

// Show enrollment modal
function showEnrollmentModal() {
  const modal = document.getElementById('enrollmentModal');
  const coursesGrid = document.getElementById('coursesGrid');
  
  if (!modal || !coursesGrid) return;
  
  // Clear previous content
  coursesGrid.innerHTML = '';
  
  // Render courses with checkboxes (all courses are enabled, enrolled ones are pre-checked)
  allCourses.forEach(course => {
    const isEnrolled = enrolledCourseIds.includes(course.course_id);
    const item = document.createElement('div');
    item.className = `course-checkbox-item ${isEnrolled ? 'checked' : ''}`;
    
    item.innerHTML = `
      <input 
        type="checkbox" 
        id="course_${course.course_id}" 
        value="${course.course_id}"
        ${isEnrolled ? 'checked' : ''}
      />
      <label class="course-checkbox-label" for="course_${course.course_id}">
        <div class="course-code">${course.course_code}</div>
        <div class="course-name">${course.course_name}</div>
      </label>
    `;
    
    // Toggle checked class on click
    const checkbox = item.querySelector('input[type="checkbox"]');
    item.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT') {
        checkbox.checked = !checkbox.checked;
      }
      item.classList.toggle('checked', checkbox.checked);
    });
    
    coursesGrid.appendChild(item);
  });
  
  modal.style.display = 'flex';
}

// Hide enrollment modal
function hideEnrollmentModal() {
  const modal = document.getElementById('enrollmentModal');
  if (modal) {
    modal.style.display = 'none';
  }
  
  // Reset form
  const form = document.getElementById('enrollmentForm');
  if (form) {
    form.reset();
  }
  
  // Remove checked classes
  document.querySelectorAll('.course-checkbox-item.checked').forEach(item => {
    item.classList.remove('checked');
  });
}

// Handle enrollment form submission
async function handleEnrollment(event) {
  event.preventDefault();
  
  // Get all checked course IDs (including newly selected and previously enrolled)
  const checkboxes = document.querySelectorAll('#coursesGrid input[type="checkbox"]:checked');
  const selectedCourseIds = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/users/enrollments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        user_id: currentStudentId,
        course_ids: selectedCourseIds
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      hideEnrollmentModal();
      // Refresh student detail in background without loading overlay
      fetchStudentDetail(currentStudentId, false);
      alert(data.message);
    } else {
      alert('Failed to update enrollments: ' + data.message);
    }
  } catch (error) {
    console.error('Error updating enrollments:', error);
    alert('Connection error. Please try again.');
  }
}

// ========================================
// INITIALIZE PAGE
// ========================================
  document.addEventListener('DOMContentLoaded', async function () {
  // Show loading immediately to avoid flash of empty content
  showLoading();
  // Proteksi: cek session via backend JWT
  if (!(await window.checkAuth?.())) {
    document.body.innerHTML = '';
    window.location.href = '/login';
    return;
  }
  // Get user ID from URL
  const userId = getUserIdFromURL();
  if (!userId) {
    alert('No user ID specified');
    window.location.href = '/userlist';
    return;
  }
  
  currentStudentId = userId;
  
  // Fetch all courses for enrollment
  await fetchAllCourses();
  
  // Fetch student detail (loading overlay already shown)
  fetchStudentDetail(userId, true);
  
  // Auto-refresh every 30 seconds (without loading overlay)
  setInterval(() => {
    fetchStudentDetail(userId, false);
  }, 30000);
  
  // Setup enrollment modal handlers
  const addCoursesBtn = document.getElementById('addCoursesBtn');
  const closeModalBtn = document.getElementById('closeEnrollmentModal');
  const cancelBtn = document.getElementById('cancelEnrollment');
  const enrollmentForm = document.getElementById('enrollmentForm');
  
  if (addCoursesBtn) {
    addCoursesBtn.addEventListener('click', showEnrollmentModal);
  }
  
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideEnrollmentModal);
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideEnrollmentModal);
  }
  
  if (enrollmentForm) {
    enrollmentForm.addEventListener('submit', handleEnrollment);
  }
  
  // Close modal when clicking outside
  const modal = document.getElementById('enrollmentModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideEnrollmentModal();
      }
    });
  }
});
