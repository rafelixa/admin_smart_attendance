function toggleFilter() {
  const popup = document.querySelector('.filter-popup');
  const overlay = document.querySelector('.filter-overlay');
  
  if (popup.style.display === 'block') {
    popup.style.display = 'none';
    overlay.style.display = 'none';
  } else {
    popup.style.display = 'block';
    overlay.style.display = 'block';
  }
}

function closeFilter() {
  document.querySelector('.filter-popup').style.display = 'none';
  document.querySelector('.filter-overlay').style.display = 'none';
}

let currentFilter = 'all';
let allStudentsData = [];

async function filterBy(tolerance) {
  console.log('Filter by:', tolerance);
  
  currentFilter = tolerance;
  
  // Remove active class from all options
  document.querySelectorAll('.filter-option').forEach(option => {
    option.classList.remove('active');
  });
  
  // Add active class to clicked option
  event.target.classList.add('active');
  
  // Fetch students with tolerance data
  await fetchStudentsWithTolerance(tolerance);
  
  closeFilter();
}

// ========================================
// API CONFIGURATION (development vs production)
// use localhost during development, otherwise use relative '/api' so Vercel routes work
// ========================================
const API_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ? 'http://localhost:3000/api' : '/api';

// ========================================
// AUTHENTICATION CHECK
// ========================================
function checkAuth() {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    window.location.href = '/login';
    return null;
  }
  
  const user = JSON.parse(userStr);
  if (user.role !== 'admin') {
    alert('Access denied. Admin only.');
    window.location.href = '/login';
    return null;
  }
  
  return user;
}

// ========================================
// FETCH STUDENTS WITH TOLERANCE DATA
// ========================================
async function fetchStudentsWithTolerance(filter = 'all') {
  try {
    showLoading();
    
    // Fetch all students first
    const response = await fetch(`${API_URL}/users/students`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.success) {
      console.error('Failed to fetch students:', data.message);
      showError('Failed to load student data');
      return;
    }

    const students = data.data.students;
    
    // Fetch tolerance info for each student
    const studentsWithTolerance = await Promise.all(
      students.map(async (student) => {
        try {
          const detailResponse = await fetch(`${API_URL}/users/students/${student.user_id}`);
          const detailData = await detailResponse.json();
          
          if (detailData.success) {
            return {
              ...student,
              tolerance: detailData.data.tolerance
            };
          }
          return student;
        } catch (err) {
          console.error(`Error fetching tolerance for ${student.user_id}:`, err);
          return student;
        }
      })
    );

    allStudentsData = studentsWithTolerance;
    
    // Apply filter
    let filteredStudents = studentsWithTolerance;
    
    if (filter === 'past') {
      // Show students who exceeded tolerance (> 3)
      filteredStudents = studentsWithTolerance.filter(s => 
        s.tolerance && s.tolerance.exceeded && s.tolerance.exceeded.length > 0
      );
    } else if (filter === 'reach') {
      // Show students who reached tolerance (= 3)
      filteredStudents = studentsWithTolerance.filter(s => 
        s.tolerance && s.tolerance.reached && s.tolerance.reached.length > 0
      );
    }
    
    displayStudents(filteredStudents);
    
  } catch (error) {
    console.error('Error fetching students:', error);
    showError('Connection error. Please check if backend is running.');
  }
}

// ========================================
// FETCH STUDENTS FROM API (Legacy - for initial load)
// ========================================
async function fetchStudents() {
  await fetchStudentsWithTolerance('all');
}

// ========================================
// DISPLAY STUDENTS IN TABLE
// ========================================
function displayStudents(students) {
  const container = document.querySelector('.frame-2');
  if (!container) {
    console.error('Container not found');
    return;
  }

  // Keep header row
  const header = container.querySelector('.frame-3');
  
  // Clear all content (including loading message and old data)
  container.innerHTML = '';
  
  // Re-add header
  if (header) {
    container.appendChild(header);
  }

  // Check if no students
  if (!students || students.length === 0) {
    const noData = document.createElement('div');
    noData.style.textAlign = 'center';
    noData.style.padding = '40px';
    noData.style.color = '#666';
    noData.innerHTML = '<p>No students found</p>';
    container.appendChild(noData);
    return;
  }

  // Add student rows
  students.forEach((student, index) => {
    const row = document.createElement('div');
    // Alternate row classes
    row.className = index % 2 === 0 ? 'frame-4' : 'frame-6';
    row.style.cursor = 'pointer';

    row.innerHTML = `
      <div class="frame-5"><div class="text-wrapper-3">${student.nim || '-'}</div></div>
      <div class="frame-5"><div class="text-wrapper-3">${student.full_name}</div></div>
      <div class="frame-5"><div class="text-wrapper-3">2023</div></div>
    `;

    // Click to view detail
    row.addEventListener('click', () => {
      window.location.href = `/userlist-manage?id=${student.user_id}`;
    });

    // Hover effects
    row.addEventListener('mouseenter', () => {
      row.style.backgroundColor = '#f8f9fa';
    });

    row.addEventListener('mouseleave', () => {
      row.style.backgroundColor = '';
    });

    container.appendChild(row);
  });

  console.log(`[SUCCESS] Displayed ${students.length} students from database`);
}

// ========================================
// LOADING INDICATOR
// ========================================
function showLoading() {
  const container = document.querySelector('.frame-2');
  if (!container) return;

  const header = container.querySelector('.frame-3');
  container.innerHTML = '';
  
  if (header) {
    container.appendChild(header);
  }

  const loading = document.createElement('div');
  loading.className = 'loading-message';
  loading.style.textAlign = 'center';
  loading.style.padding = '40px';
  loading.style.color = '#666';
  loading.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i><p>Loading students data...</p>';
  container.appendChild(loading);
}

// ========================================
// ERROR DISPLAY
// ========================================
function showError(message) {
  const container = document.querySelector('.frame-2');
  if (!container) return;

  const header = container.querySelector('.frame-3');
  container.innerHTML = '';
  
  if (header) {
    container.appendChild(header);
  }

  const errorDiv = document.createElement('div');
  errorDiv.style.textAlign = 'center';
  errorDiv.style.padding = '40px';
  errorDiv.style.color = '#dc3545';
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle" style="font-size: 24px; margin-bottom: 10px;"></i><p>${message}</p>`;
  container.appendChild(errorDiv);
}

// ========================================
// INITIALIZE PAGE
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  // Check authentication
  const user = checkAuth();
  if (!user) return;

  // Fetch students
  fetchStudents();

  // Auto-refresh every 30 seconds
  setInterval(fetchStudents, 30000);
});
