// ========================================
// API CONFIGURATION - use global config
// ========================================
const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : '/api';

// AUTHENTICATION CHECK: now uses JWT session to backend


// ========================================
// GLOBAL VARIABLES
// ========================================
let currentFilter = 'all';
let allPermissions = [];
let selectedDate = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentPage = 1;
let totalPages = 1;
let totalRecords = 0;
const ITEMS_PER_PAGE = 50;

// Request control & simple cache to avoid re-fetching
let abortController = null;
const permissionsCache = new Map(); // key: `${filter}:${page}` -> array of permissions

// ========================================
// FETCH PERMISSIONS FROM API
// ========================================
async function fetchPermissions(page = 1) {
  showLoading();
  await fetchPermissionsData(page);
}

// ========================================
// APPLY FILTER - NOW FETCHES FROM SERVER
// ========================================
async function applyFilter(filter) {
  currentFilter = filter;
  currentPage = 1; // Reset to page 1
  // Clear cache when switching filters to avoid stale results
  permissionsCache.clear();
  await fetchPermissions(1);
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
  
  // Clear all content (removes all old data and messages)
  container.innerHTML = '';
  
  // Re-add header
  if (header) {
    container.appendChild(header);
  }

  // Check if no permissions
  if (!permissions || permissions.length === 0) {
    const noData = document.createElement('div');
    noData.className = 'empty-message';
    noData.style.textAlign = 'center';
    noData.style.padding = '40px';
    noData.style.color = '#666';
    noData.innerHTML = '<p>No permission requests found</p>';
    container.appendChild(noData);
    return;
  }

  // Use DocumentFragment for batch rendering
  const fragment = document.createDocumentFragment();
  
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
      statusText = 'APPROVED';
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

    fragment.appendChild(row);
  });
  
  // Batch append using requestAnimationFrame
  requestAnimationFrame(() => {
    container.appendChild(fragment);
  });

  console.log(`[SUCCESS] Displayed ${permissions.length} permissions from database`);
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
  loading.innerHTML = '<p>Loading permission requests...</p>';
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
function initializeFilterPopup() {
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
    option.addEventListener('click', async function() {
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
        await filterByWeek();
      } else {
        // Standard filter (all, pending, etc)
        await applyFilter(filterValue);
      }
      
      // Close popup
      filterPopup.style.display = 'none';
      filterOverlay.style.display = 'none';
    });
  });
  
  // Close popup when pressing Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      filterPopup.style.display = 'none';
      filterOverlay.style.display = 'none';
    }
  });
}

// ========================================
// INITIALIZE PAGE
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
  // Set default active filter
  const defaultFilter = document.querySelector('.filter-option[data-filter="all"]');
  if (defaultFilter) defaultFilter.classList.add('active');

  // Initialize filter popup functionality
  initializeFilterPopup();
  
  // Initialize calendar functionality
  initializeCalendar();

  // Initial load - fetch permissions page 1 (loading will show inside fetch if no cache)
  showLoading();
  await fetchPermissionsData(1);
  
  // Auth check non-blocking (background)
  window.checkAuth?.().then(isAuth => {
    if (!isAuth) {
      document.body.innerHTML = '';
      window.location.href = '/login';
    }
  });
  
  console.log('[SUCCESS] Request List page initialized');
});

// Separate function to fetch without showing loading again
async function fetchPermissionsData(page = 1, skipDisplay = false) {
  const cacheKey = `${currentFilter}:${page}`;
  
  // Serve cached results instantly if available
  const hasCache = permissionsCache.has(cacheKey);
  if (hasCache) {
    const cached = permissionsCache.get(cacheKey);
    allPermissions = cached.data;
    currentPage = cached.page;
    totalPages = cached.totalPages;
    totalRecords = cached.total;
    if (!skipDisplay) {
      displayPermissions(allPermissions);
      updatePagination();
    }
    // Skip fetch if cache is fresh (< 10 seconds)
    if (cached.timestamp && Date.now() - cached.timestamp < 10000) {
      return;
    }
  }
  
  // Cancel any in-flight request to avoid overlap and UI stalls
  if (abortController) {
    abortController.abort();
  }
  abortController = new AbortController();

  try {
    const token = localStorage.getItem('token');

    const params = new URLSearchParams({
      page: page,
      limit: ITEMS_PER_PAGE
    });

    if (currentFilter !== 'all') {
      // Normalize to lowercase to match backend values
      params.append('status', String(currentFilter).toLowerCase());
    }

    const response = await fetch(`${API_URL}/permissions?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      signal: abortController.signal
    });

    const data = await response.json();

    if (!data.success) {
      console.error('Failed to fetch permissions:', data.message);
      showError('Failed to load permission requests');
      return;
    }

    // Safety: ensure array and normalize data
    allPermissions = Array.isArray(data.data) ? data.data : [];
    currentPage = data.page || 1;
    totalPages = data.totalPages || 1;
    totalRecords = data.total || 0;

    // Always cache fresh results with timestamp
    permissionsCache.set(cacheKey, {
      data: allPermissions,
      page: currentPage,
      totalPages,
      total: totalRecords,
      timestamp: Date.now()
    });

    // Display fresh results (unless caller wants to do custom filtering first)
    if (!skipDisplay) {
      displayPermissions(allPermissions);
      updatePagination();
    }

    console.log('[SUCCESS] Fetched', allPermissions.length, 'permissions from API');
  } catch (error) {
    if (error.name === 'AbortError') {
      // Request intentionally cancelled due to new filter/page action
      return;
    }
    console.error('Error fetching permissions:', error);
    showError('Connection error. Please check if backend is running.');
  }
}

// ========================================
// CALENDAR MODAL FUNCTIONALITY
// ========================================
function initializeCalendar() {
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
    document.getElementById('filterPopup').style.display = 'none';
    document.getElementById('filterOverlay').style.display = 'none';
  });

  document.getElementById('confirmCalendar').addEventListener('click', function() {
    if (!selectedDate) {
      alert('Please select a date');
      return;
    }
    
    console.log('Selected date from calendar:', selectedDate);
    filterByDate(selectedDate);
    closeCalendarModal();
    document.getElementById('filterPopup').style.display = 'none';
    document.getElementById('filterOverlay').style.display = 'none';
  });

  // Close calendar on overlay click
  document.getElementById('calendarOverlay').addEventListener('click', function() {
    closeCalendarModal();
  });
}

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



// ========================================
// PAGINATION FUNCTIONS
// ========================================
function updatePagination() {
  let paginationContainer = document.querySelector('.pagination-container');
  
  if (!paginationContainer) {
    paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container';
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper && tableWrapper.parentNode) {
      tableWrapper.parentNode.insertBefore(paginationContainer, tableWrapper.nextSibling);
    }
  }
  
  paginationContainer.innerHTML = '';
  
  if (totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }
  
  paginationContainer.style.display = 'flex';
  
  const startRecord = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endRecord = Math.min(currentPage * ITEMS_PER_PAGE, totalRecords);
  
  const paginationInfo = document.createElement('div');
  paginationInfo.className = 'pagination-info';
  paginationInfo.textContent = `Showing ${startRecord}-${endRecord} of ${totalRecords} records`;
  paginationContainer.appendChild(paginationInfo);
  
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'pagination-buttons';
  
  const prevBtn = document.createElement('button');
  prevBtn.className = 'pagination-btn';
  prevBtn.textContent = '← Previous';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => goToPage(currentPage - 1);
  buttonsContainer.appendChild(prevBtn);
  
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  if (startPage > 1) {
    const firstBtn = document.createElement('button');
    firstBtn.className = 'pagination-btn';
    firstBtn.textContent = '1';
    firstBtn.onclick = () => goToPage(1);
    buttonsContainer.appendChild(firstBtn);
    
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'pagination-ellipsis';
      ellipsis.textContent = '...';
      buttonsContainer.appendChild(ellipsis);
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = 'pagination-btn';
    if (i === currentPage) {
      pageBtn.classList.add('active');
    }
    pageBtn.textContent = i;
    pageBtn.onclick = () => goToPage(i);
    buttonsContainer.appendChild(pageBtn);
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'pagination-ellipsis';
      ellipsis.textContent = '...';
      buttonsContainer.appendChild(ellipsis);
    }
    
    const lastBtn = document.createElement('button');
    lastBtn.className = 'pagination-btn';
    lastBtn.textContent = totalPages;
    lastBtn.onclick = () => goToPage(totalPages);
    buttonsContainer.appendChild(lastBtn);
  }
  
  const nextBtn = document.createElement('button');
  nextBtn.className = 'pagination-btn';
  nextBtn.textContent = 'Next →';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => goToPage(currentPage + 1);
  buttonsContainer.appendChild(nextBtn);
  
  paginationContainer.appendChild(buttonsContainer);
}

async function goToPage(page) {
  if (page < 1 || page > totalPages || page === currentPage) return;
  
  currentPage = page;
  await fetchPermissions(page);
  
  const tableWrapper = document.querySelector('.table-wrapper');
  if (tableWrapper) {
    tableWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ========================================
// DATE FILTERING FUNCTIONS
// ========================================
async function filterByDate(date) {
  // Format date as YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  console.log('Filtering by date:', dateStr);
  
  // Clear cache and fetch fresh data WITHOUT status filter
  permissionsCache.clear();
  const previousFilter = currentFilter;
  currentFilter = 'all'; // Temporarily set to 'all' to get ALL data
  currentPage = 1;
  
  // Show loading
  showLoading();
  
  // Fetch all permissions WITHOUT auto-display
  await fetchPermissionsData(1, true);
  
  // Restore filter name for display purposes
  currentFilter = 'date';
  
  // Then filter client-side by date
  const filtered = allPermissions.filter(permission => {
    return permission.permission_date === dateStr;
  });
  
  console.log(`Filtered by date ${dateStr}:`, filtered.length, 'results');
  
  // Display filtered results (only once!)
  displayPermissions(filtered);
}

async function filterByWeek() {
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
  
  // Clear cache and fetch fresh data WITHOUT status filter
  permissionsCache.clear();
  const previousFilter = currentFilter;
  currentFilter = 'all'; // Temporarily set to 'all' to get ALL data
  currentPage = 1;
  
  // Show loading
  showLoading();
  
  // Fetch all permissions WITHOUT auto-display
  await fetchPermissionsData(1, true);
  
  // Restore filter name for display purposes
  currentFilter = 'week';
  
  // Then filter client-side by week
  const filtered = allPermissions.filter(permission => {
    const permDate = new Date(permission.permission_date + 'T00:00:00');
    return permDate >= weekStart && permDate <= weekEnd;
  });
  
  console.log(`Filtered by week:`, filtered.length, 'results');
  
  // Display filtered results (only once!)
  displayPermissions(filtered);
}
