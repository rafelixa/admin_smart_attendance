// ========== FILTER EVENT LISTENERS =============
document.addEventListener('DOMContentLoaded', function () {
  // Filter button
  const filterBtn = document.getElementById('filterBtn');
  const filterOverlay = document.getElementById('filterOverlay');
  const filterPopup = document.querySelector('.filter-popup');
  if (filterBtn && filterPopup && filterOverlay) {
    filterBtn.addEventListener('click', function () {
      if (filterPopup.classList.contains('active')) {
        filterPopup.classList.remove('active');
        filterOverlay.classList.remove('active');
      } else {
        filterPopup.classList.add('active');
        filterOverlay.classList.add('active');
      }
    });
    filterOverlay.addEventListener('click', function () {
      filterPopup.classList.remove('active');
      filterOverlay.classList.remove('active');
    });
    // Calendar modal logic
    let selectedDate = null;
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    filterPopup.querySelectorAll('.filter-option').forEach(option => {
      option.addEventListener('click', function (event) {
        const filterType = option.getAttribute('data-filter');
        if (filterType === 'bydate') {
          openCalendarModal();
        } else {
          filterBy(filterType, event);
          filterPopup.classList.remove('active');
          filterOverlay.classList.remove('active');
        }
      });
    });
    // Calendar modal events
    function openCalendarModal() {
      const modal = document.getElementById('calendarModal');
      modal.classList.add('active');
      renderCalendar();
    }
    function closeCalendarModal() {
      const modal = document.getElementById('calendarModal');
      modal.classList.remove('active');
    }
    function renderCalendar() {
      const calendarDays = document.getElementById('calendarDays');
      const calendarTitle = document.getElementById('calendarTitle');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      calendarTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;
      calendarDays.innerHTML = '';
      const firstDay = new Date(currentYear, currentMonth, 1).getDay();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
      for (let i = firstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = prevMonthDays - i;
        calendarDays.appendChild(day);
      }
      const today = new Date();
      for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day';
        day.textContent = i;
        if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
          day.classList.add('today');
        }
        if (selectedDate && i === selectedDate.getDate() && currentMonth === selectedDate.getMonth() && currentYear === selectedDate.getFullYear()) {
          day.classList.add('selected');
        }
        day.addEventListener('click', function() {
          document.querySelectorAll('.calendar-day.selected').forEach(d => d.classList.remove('selected'));
          this.classList.add('selected');
          selectedDate = new Date(currentYear, currentMonth, i);
        });
        calendarDays.appendChild(day);
      }
      const totalCells = calendarDays.children.length;
      const remainingCells = 42 - totalCells;
      for (let i = 1; i <= remainingCells; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = i;
        calendarDays.appendChild(day);
      }
    }
    document.getElementById('prevMonth').addEventListener('click', function() {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click', function() {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar();
    });
    document.getElementById('cancelCalendar').addEventListener('click', function() {
      closeCalendarModal();
      filterPopup.classList.remove('active');
      filterOverlay.classList.remove('active');
    });
    document.getElementById('confirmCalendar').addEventListener('click', function() {
      if (!selectedDate) {
        alert('Please select a date');
        return;
      }
      filterBy('bydate', null, formatDateForApi(selectedDate));
      closeCalendarModal();
      filterPopup.classList.remove('active');
      filterOverlay.classList.remove('active');
    });
    document.getElementById('calendarOverlay').addEventListener('click', function() {
      closeCalendarModal();
    });
    function formatDateForApi(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
});
// ========================================
// CONFIGURATION (development vs production)
// use localhost during development, otherwise use relative '/api' so production routing works
// ========================================
const API_URL = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) ? 'http://localhost:3000/api' : '/api';
let allLogs = [];
let currentFilter = 'all';
let refreshInterval;

// AUTHENTICATION CHECK: now uses JWT session to backend


// ========================================
// FETCH ATTENDANCE LOGS
// ========================================
async function fetchAttendanceLogs(status = 'all') {
  try {
    const url = `${API_URL}/attendance/logs${status !== 'all' ? `?status=${status}` : ''}`;
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' }
    });
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
// Animasi filter popup kini pakai class 'active' (lihat event listener di atas)

async function filterBy(status, event) {
  console.log('Filter by:', status);
  currentFilter = status;
  document.querySelectorAll('.filter-option').forEach(option => {
    option.classList.remove('active');
  });
  if (event && event.target) {
    event.target.classList.add('active');
  } else {
    // fallback: set active by data-filter
    const activeOption = document.querySelector(`.filter-option[data-filter="${status}"]`);
    if (activeOption) activeOption.classList.add('active');
  }
  if (status === 'bydate' && arguments.length > 2) {
    // Filter by date
    await fetchAttendanceLogsByDate(arguments[2]);
  } else {
    await fetchAttendanceLogs(status);
  }
}

// Fetch logs by date
async function fetchAttendanceLogsByDate(dateStr) {
  try {
    const url = `${API_URL}/attendance/logs?date=${dateStr}`;
    const token = localStorage.getItem('token');
    const response = await fetch(url, {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' }
    });
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
    console.error('Error fetching attendance logs by date:', error);
    showError('Failed to load attendance logs by date.');
  }
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
document.addEventListener('DOMContentLoaded', async function () {
  // Proteksi: cek session via backend JWT
  if (!(await window.checkAuth?.())) {
    document.body.innerHTML = '';
    window.location.href = '/login';
    return;
  }
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
