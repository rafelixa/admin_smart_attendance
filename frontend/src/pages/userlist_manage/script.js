// ========================================
// USER LIST MANAGE - STUDENT DETAIL PAGE
// Fetch real data from Supabase via Backend API
// ========================================

// API Configuration (dev vs prod)
const API_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ? 'http://localhost:3000/api' : '/api';

// AUTHENTICATION CHECK: now uses JWT session to backend


// ========================================
// GET USER ID FROM URL
// ========================================
function getUserIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// ========================================
// FETCH STUDENT DETAIL FROM API
// ========================================
async function fetchStudentDetail(userId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/users/students/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    const data = await response.json();
    if (data.success) {
      displayStudentDetail(data.data);
    } else {
      console.error('Failed to fetch student detail:', data.message);
      alert('Student not found');
      window.location.href = '/userlist';
    }
  } catch (error) {
    console.error('Error fetching student detail:', error);
    alert('Connection error. Please check if backend is running.');
  }
}

// ========================================
// DISPLAY STUDENT DETAIL
// ========================================
function displayStudentDetail(data) {
  const { student, courses, tolerance } = data;

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
    coursesHTML += `
      <div class="class-alert-item">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="class-alert-name">${course.course_code}</div>
            <div class="class-alert-details">
              Late: ${course.attendance.late} | Absent: ${course.attendance.absent}
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
// INITIALIZE PAGE
// ========================================
  document.addEventListener('DOMContentLoaded', async function () {
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
  // Fetch student detail
  fetchStudentDetail(userId);
  // Auto-refresh every 30 seconds
  setInterval(() => {
    fetchStudentDetail(userId);
  }, 30000);
});
