// ========================================
// CONFIGURATION (development vs production)
// use localhost during development, otherwise use relative '/api' so production routing works
// ========================================
const API_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ? 'http://localhost:3000/api' : '/api';
let allLogs = [];
let currentFilter = 'all';
let refreshInterval;

// ========================================
// CHECK AUTHENTICATION
// ========================================
function checkAuth() {
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (!user) {
    window.location.href = '../login/index.html';
    return false;
  }
  
  if (user.role !== 'admin') {
    alert('Access denied. Admin only.');
    window.location.href = '../login/index.html';
    return false;
  }
  
  return true;
}

// ========================================
// FETCH ATTENDANCE LOGS
// ========================================
async function fetchAttendanceLogs(status = 'all') {
  try {
    const url = `${API_URL}/attendance/logs${status !== 'all' ? `?status=${status}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      allLogs = result.data;
      displayLogs(allLogs);
    } else {
      throw new Error(result.message || 'Failed to fetch logs');
    }
  } catch (error) {
    console.error('Error fetching attendance logs:', error);
    showError('Failed to load attendance logs. Please try again.');
  }
}

// ========================================
// DISPLAY LOGS
// ========================================
function displayLogs(logs) {
  const container = document.querySelector('.frame-2');
  const loading = document.getElementById('loading');
  
  if (loading) loading.remove();
  
  // Remove all existing rows except header
  const existingRows = container.querySelectorAll('.attendance-row');
  existingRows.forEach(row => row.remove());
  
  if (logs.length === 0) {
    const emptyRow = document.createElement('div');
    emptyRow.className = 'loading-indicator';
    emptyRow.innerHTML = '<p style="color: #6c757d;">No attendance logs found for the selected filter.</p>';
    container.appendChild(emptyRow);
    return;
  }
  
  logs.forEach(log => {
    const row = document.createElement('div');
    row.className = 'attendance-row';
    row.dataset.status = log.status;
    
    const statusClass = `status-${log.status.toLowerCase()}`;
    
    row.innerHTML = `
      <div class="attendance-cell">${log.nim}</div>
      <div class="attendance-cell">${log.name}</div>
      <div class="attendance-cell">${log.date}</div>
      <div class="attendance-cell">${log.time}</div>
      <div class="attendance-cell">
        <span class="status-badge ${statusClass}">${log.status}</span>
      </div>
    `;
    
    container.appendChild(row);
  });
  
  console.log(`Displayed ${logs.length} attendance logs`);
}

// ========================================
// FILTER FUNCTIONS
// ========================================
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

async function filterBy(status) {
  console.log('Filter by:', status);
  
  // Update current filter
  currentFilter = status;
  
  // Remove active class from all options
  document.querySelectorAll('.filter-option').forEach(option => {
    option.classList.remove('active');
  });
  
  // Add active class to clicked option
  event.target.classList.add('active');
  
  // Fetch filtered data from backend
  await fetchAttendanceLogs(status);
  
  closeFilter();
}

// ========================================
// ERROR DISPLAY
// ========================================
function showError(message) {
  const container = document.querySelector('.frame-2');
  const loading = document.getElementById('loading');
  
  if (loading) loading.remove();
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'loading-indicator';
  errorDiv.style.color = '#dc3545';
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  
  container.appendChild(errorDiv);
}

// ========================================
// AUTO REFRESH
// ========================================
function startAutoRefresh() {
  // Refresh every 30 seconds
  refreshInterval = setInterval(() => {
    console.log('Auto-refreshing attendance logs...');
    fetchAttendanceLogs(currentFilter);
  }, 30000);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
}

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  if (!checkAuth()) return;
  
  // Initial fetch
  fetchAttendanceLogs('all');
  
  // Start auto-refresh
  startAutoRefresh();
  
  console.log('Camera page initialized successfully');
});

// Stop auto-refresh when page is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopAutoRefresh();
  } else {
    startAutoRefresh();
  }
});
