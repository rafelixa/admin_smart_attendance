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
// GLOBAL VARIABLES
// ========================================
let currentFilter = 'all';
let allPermissions = [];
let selectedDate = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// ========================================
// FETCH PERMISSIONS FROM API
// ========================================
async function fetchPermissions(status = 'all') {
  try {
    showLoading();
    
    // Always fetch all permissions first to enable client-side filtering
    const response = await fetch(`${API_URL}/permissions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.success) {
      console.error('Failed to fetch permissions:', data.message);
      showError('Failed to load permission requests');
      return;
    }

    // Store all permissions
    allPermissions = data.data;
    
    // Filter based on status if needed
    let filtered = allPermissions;
    if (status !== 'all') {
      filtered = allPermissions.filter(p => p.status === status);
    }
    
    displayPermissions(filtered);
    
  } catch (error) {
    console.error('Error fetching permissions:', error);
    showError('Connection error. Please check if backend is running.');
  }
}

// ========================================
// DISPLAY PERMISSIONS IN TABLE
// ========================================
function displayPermissions(permissions) {
  const container = document.querySelector('.frame-2');
  if (!container) {
    console.error('Container not found');
    return;
  }

  // Keep header row
  const header = container.querySelector('.frame-3');
  
  // Clear all content
  container.innerHTML = '';
  
  // Re-add header
  if (header) {
    container.appendChild(header);
  }

  // Check if no permissions
  if (!permissions || permissions.length === 0) {
    const noData = document.createElement('div');
    noData.style.textAlign = 'center';
    noData.style.padding = '40px';
    noData.style.color = '#666';
    noData.innerHTML = '<p>No permission requests found</p>';
    container.appendChild(noData);
    return;
  }

  // Add permission rows
  permissions.forEach((permission, index) => {
    const row = document.createElement('div');
    // Alternate between frame classes
    const frameClass = index % 2 === 0 ? 'frame-4' : 
                       index % 2 === 1 ? 'frame-6' : 
                       index % 3 === 0 ? 'frame-7' : 
                       index % 4 === 0 ? 'frame-8' : 'frame-9';
    row.className = frameClass;
    row.style.cursor = 'pointer';

    // Format times
    const startTime = formatTime(permission.start_time);
    const endTime = formatTime(permission.end_time);
    const date = formatDate(permission.permission_date);

    // Determine status class and text
    let statusClass = '';
    let statusText = permission.status;
    
    if (permission.status === 'pending') {
      statusClass = 'text-wrapper-4'; // Orange
      statusText = 'Pending';
    } else if (permission.status === 'approved') {
      statusClass = 'text-wrapper-5'; // Green
      statusText = 'Approved';
    } else if (permission.status === 'rejected') {
      statusClass = 'text-wrapper-6'; // Red
      statusText = 'Rejected';
    }

    row.innerHTML = `
      <div class="frame-5" data-label="From">
        <time class="text-wrapper-3">${date}, ${startTime}</time>
      </div>
      <div class="frame-5" data-label="To">
        <time class="text-wrapper-3">${date}, ${endTime}</time>
      </div>
      <div class="frame-5" data-label="Status">
        <span class="${statusClass}">${statusText}</span>
      </div>
    `;

    // Click to view detail
    row.addEventListener('click', () => {
      const statusFolder = permission.status; // pending, approved, rejected
      window.location.href = `/request-list-manage/${statusFolder}?id=${permission.id}`;
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

  console.log(`[SUCCESS] Displayed ${permissions.length} permission requests`);
}

// ========================================
// FORMAT HELPER FUNCTIONS
// ========================================
function formatTime(timeString) {
  if (!timeString) return '-';
  // timeString format: "08:45:00" or "08:45"
  const parts = timeString.split(':');
  const hours = parseInt(parts[0]);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes}${ampm}`;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const day = date.getDate();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day} ${month}, ${year}`;
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
  loading.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i><p>Loading permission requests...</p>';
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
// FILTER POPUP FUNCTIONALITY
// ========================================
const filterButton = document.getElementById('filterButton');
const filterOverlay = document.getElementById('filterOverlay');
const filterPopup = document.getElementById('filterPopup');
const filterOptions = document.querySelectorAll('.filter-option');

// Toggle popup
filterButton.addEventListener('click', function(e) {
  e.stopPropagation();
  const isVisible = filterPopup.style.display === 'block';
  
  if (isVisible) {
    filterPopup.style.display = 'none';
    filterOverlay.style.display = 'none';
  } else {
    filterPopup.style.display = 'block';
    filterOverlay.style.display = 'block';
  }
});

// Close popup when clicking on overlay
filterOverlay.addEventListener('click', function() {
  filterPopup.style.display = 'none';
  filterOverlay.style.display = 'none';
});

// Prevent popup from closing when clicking inside the popup
filterPopup.addEventListener('click', function(e) {
  e.stopPropagation();
});

// Handle filter option selection
filterOptions.forEach(option => {
  option.addEventListener('click', function() {
    // Remove active class from all options
    filterOptions.forEach(opt => opt.classList.remove('active'));
    
    // Add active class to selected option
    this.classList.add('active');
    
    // Get filter value
    const filterValue = this.getAttribute('data-filter');
    currentFilter = filterValue;
    
    console.log('Filter selected:', filterValue);
    
    // Apply filter based on type
    if (filterValue === 'date') {
      // Open calendar modal
      openCalendarModal();
      return;
    } else if (filterValue === 'week') {
      // Filter by current week
      filterByWeek();
    } else if (filterValue === 'all' || filterValue === 'pending') {
      // Standard API filter
      fetchPermissions(filterValue);
    }
    
    // Close popup
    filterPopup.style.display = 'none';
    filterOverlay.style.display = 'none';
  });
});

// ========================================
// INITIALIZE PAGE
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  // Check authentication
  const user = checkAuth();
  if (!user) return;

  // Initial load
  fetchPermissions('all');
  
  console.log('[SUCCESS] Request List page initialized');
});

// Close popup when pressing Escape
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    filterPopup.style.display = 'none';
    filterOverlay.style.display = 'none';
  }
});

// Set default active filter
document.querySelector('.filter-option[data-filter="all"]').classList.add('active');

// Add click handler for pending rows to navigate to detail page with ID parameter
const pendingRows = document.querySelectorAll('.frame-4, .frame-6');
pendingRows.forEach((row, index) => {
  row.style.cursor = 'pointer';
    row.addEventListener('click', function() {
    // index 0 = request ID 1, index 1 = request ID 2
    const requestId = index + 1;
    window.location.href = `/request-list-manage/pending?id=${requestId}`;
  });
});

// Add click handler for approved rows to navigate to approved detail page
const approvedRows = document.querySelectorAll('.frame-7, .frame-8, .frame-9, .frame-10');
  approvedRows.forEach((row, index) => {
  row.style.cursor = 'pointer';
  row.addEventListener('click', function() {
    // index 0 = approved ID 1, index 1 = approved ID 2, etc.
    const requestId = index + 1;
    window.location.href = `/request-list-manage/approved?id=${requestId}`;
  });
});

// Add click handler for rejected row to navigate to rejected detail page
const rejectedRow = document.querySelector('.frame-11');
  if (rejectedRow) {
  rejectedRow.style.cursor = 'pointer';
  rejectedRow.addEventListener('click', function() {
    window.location.href = '/request-list-manage/rejected?id=1';
  });
}

// ========================================
// CALENDAR MODAL FUNCTIONALITY
// ========================================
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
  
  // Set title
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  calendarTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  
  // Clear existing days
  calendarDays.innerHTML = '';
  
  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  
  // Get number of days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Get previous month's last date
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  
  // Add previous month's trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = document.createElement('div');
    day.className = 'calendar-day other-month';
    day.textContent = prevMonthDays - i;
    calendarDays.appendChild(day);
  }
  
  // Add current month's days
  const today = new Date();
  for (let i = 1; i <= daysInMonth; i++) {
    const day = document.createElement('div');
    day.className = 'calendar-day';
    day.textContent = i;
    
    // Check if today
    if (i === today.getDate() && 
        currentMonth === today.getMonth() && 
        currentYear === today.getFullYear()) {
      day.classList.add('today');
    }
    
    // Check if selected
    if (selectedDate && 
        i === selectedDate.getDate() && 
        currentMonth === selectedDate.getMonth() && 
        currentYear === selectedDate.getFullYear()) {
      day.classList.add('selected');
    }
    
    // Add click handler
    day.addEventListener('click', function() {
      // Remove selected from all days
      document.querySelectorAll('.calendar-day.selected').forEach(d => {
        d.classList.remove('selected');
      });
      
      // Add selected to clicked day
      this.classList.add('selected');
      
      // Store selected date
      selectedDate = new Date(currentYear, currentMonth, i);
    });
    
    calendarDays.appendChild(day);
  }
  
  // Add next month's leading days to fill grid
  const totalCells = calendarDays.children.length;
  const remainingCells = 42 - totalCells; // 6 rows * 7 days = 42
  
  for (let i = 1; i <= remainingCells; i++) {
    const day = document.createElement('div');
    day.className = 'calendar-day other-month';
    day.textContent = i;
    calendarDays.appendChild(day);
  }
}

// Calendar navigation
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

// Calendar actions
document.getElementById('cancelCalendar').addEventListener('click', function() {
  closeCalendarModal();
  filterPopup.style.display = 'none';
  filterOverlay.style.display = 'none';
});

document.getElementById('confirmCalendar').addEventListener('click', function() {
  if (!selectedDate) {
    alert('Please select a date');
    return;
  }
  
  console.log('Selected date from calendar:', selectedDate);
  filterByDate(selectedDate);
  closeCalendarModal();
  filterPopup.style.display = 'none';
  filterOverlay.style.display = 'none';
});

// Close calendar on overlay click
document.getElementById('calendarOverlay').addEventListener('click', function() {
  closeCalendarModal();
});

// ========================================
// DATE FILTERING FUNCTIONS
// ========================================
function filterByDate(date) {
  showLoading();
  
  // Format date as YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  console.log('Filtering by date:', dateStr);
  console.log('All permissions:', allPermissions);
  
  // Filter permissions by date
  const filtered = allPermissions.filter(permission => {
    console.log('Comparing:', permission.permission_date, 'with', dateStr);
    return permission.permission_date === dateStr;
  });
  
  console.log(`Filtered by date ${dateStr}:`, filtered.length, 'results', filtered);
  displayPermissions(filtered);
}

function filterByWeek() {
  showLoading();
  
  // Get current week's date range (Sunday to Saturday)
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Calculate week start (Sunday)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  
  // Calculate week end (Saturday)
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + (6 - dayOfWeek));
  weekEnd.setHours(23, 59, 59, 999);
  
  console.log('Week range:', weekStart.toISOString().split('T')[0], 'to', weekEnd.toISOString().split('T')[0]);
  console.log('All permissions:', allPermissions);
  
  // Filter permissions within the week
  const filtered = allPermissions.filter(permission => {
    const permDate = new Date(permission.permission_date + 'T00:00:00');
    const isInRange = permDate >= weekStart && permDate <= weekEnd;
    console.log('Date:', permission.permission_date, 'In range?', isInRange);
    return isInRange;
  });
  
  console.log(`Filtered by week:`, filtered.length, 'results', filtered);
  displayPermissions(filtered);
}
