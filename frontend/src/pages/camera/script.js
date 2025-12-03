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
// CONFIGURATION - use global config
// ========================================
const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : '/api';
let allLogs = [];
let currentFilter = 'all';
let selectedDateFilter = null;
let refreshInterval;
let currentPage = 1;
let totalPages = 1;
let totalRecords = 0;
const ITEMS_PER_PAGE = 50;

// Request control & simple cache
let abortController = null;
const logsCache = new Map(); // key: `${currentFilter}:${selectedDateFilter || ''}:${currentPage}`

// AUTHENTICATION CHECK: now uses JWT session to backend


// ========================================
// FETCH ATTENDANCE LOGS
// ========================================
async function fetchAttendanceLogs(status = 'all', page = 1) {
  try {
    const cacheKey = `${status}:${selectedDateFilter || ''}:${page}`;
    
    // Serve cached results instantly if available (no skeleton)
    const hasCache = logsCache.has(cacheKey);
    if (hasCache) {
      const cached = logsCache.get(cacheKey);
      allLogs = cached.data;
      currentPage = cached.page;
      totalPages = cached.totalPages;
      totalRecords = cached.total;
      displayLogs(allLogs);
      updatePagination();
      // Skip fetch if cache is fresh (< 10 seconds old)
      if (cached.timestamp && Date.now() - cached.timestamp < 10000) {
        return;
      }
    } else {
      // Only show skeleton if no cache
      showSkeletonLoading();
    }

    // Cancel any in-flight request to avoid overlap
    if (abortController) abortController.abort();
    abortController = new AbortController();
    
    const params = new URLSearchParams({
      page: page,
      limit: ITEMS_PER_PAGE
    });
    
    if (status !== 'all') {
      params.append('status', status);
    }
    
    const url = `${API_URL}/attendance/logs?${params.toString()}`;
    const token = localStorage.getItem('token');
    
    const response = await fetch(url, {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' },
      signal: abortController.signal
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      allLogs = result.data;
      currentPage = result.page;
      totalPages = result.totalPages;
      totalRecords = result.total;
      
      // Cache fresh results with timestamp
      logsCache.set(cacheKey, {
        data: allLogs,
        page: currentPage,
        totalPages,
        total: totalRecords,
        timestamp: Date.now()
      });

      displayLogs(allLogs);
      updatePagination();
    } else {
      throw new Error(result.message || 'Failed to fetch logs');
    }
  } catch (error) {
    if (error.name === 'AbortError') return; // intentional cancel
    console.error('Error fetching attendance logs:', error);
    showError('Failed to load attendance logs. Please try again.');
  }
}

// ========================================
// SKELETON LOADING FOR CAMERA PAGE
// ========================================
function showSkeletonLoading() {
  const container = document.querySelector('.frame-2');
  if (!container) return;

  // Remove existing content
  const existingRows = container.querySelectorAll('.attendance-row, .loading-indicator');
  existingRows.forEach(row => row.remove());

  const loading = document.createElement('div');
  loading.id = 'loading';
  loading.className = 'loading-indicator';
  loading.style.textAlign = 'center';
  loading.style.padding = '40px';
  loading.style.color = '#666';
  loading.innerHTML = '<p>Loading attendance logs...</p>';
  container.appendChild(loading);
}

// ========================================
// DISPLAY LOGS
// ========================================
function displayLogs(logs) {
  const container = document.querySelector('.frame-2');
  const loading = document.getElementById('loading');
  
  if (loading) loading.remove();
  
  // Remove all existing rows and messages (except header)
  const existingRows = container.querySelectorAll('.attendance-row');
  existingRows.forEach(row => row.remove());
  
  // Remove all loading-indicator messages (error/empty messages)
  const existingMessages = container.querySelectorAll('.loading-indicator');
  existingMessages.forEach(msg => msg.remove());
  
  if (logs.length === 0) {
    const emptyRow = document.createElement('div');
    emptyRow.className = 'loading-indicator';
    emptyRow.innerHTML = '<p style="color: #6c757d;">No attendance logs found for the selected filter.</p>';
    container.appendChild(emptyRow);
    return;
  }
  
  // Use DocumentFragment for batch rendering
  const fragment = document.createDocumentFragment();
  
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
        <span class="status-badge ${statusClass}">${log.status.toUpperCase()}</span>
      </div>
    `;
    
    fragment.appendChild(row);
  });
  
  // Batch append for better performance
  requestAnimationFrame(() => {
    container.appendChild(fragment);
  });
  
  console.log(`Displayed ${logs.length} attendance logs`);
}

// ========================================
// FILTER FUNCTIONS
// ========================================
// Animasi filter popup kini pakai class 'active' (lihat event listener di atas)

async function filterBy(status, event) {
  console.log('Filter by:', status);
  
  // Update active filter state
  currentFilter = status;
  
  // Update UI: remove active class from all options
  document.querySelectorAll('.filter-option').forEach(option => {
    option.classList.remove('active');
  });
  
  // Add active class to selected option
  if (event && event.target) {
    event.target.classList.add('active');
  } else {
    // fallback: set active by data-filter
    const activeOption = document.querySelector(`.filter-option[data-filter="${status}"]`);
    if (activeOption) activeOption.classList.add('active');
  }
  
  // Reset to page 1 when changing filter
  currentPage = 1;
  
  // Execute filter based on type
  if (status === 'bydate' && arguments.length > 2) {
    // Filter by date: save selected date
    selectedDateFilter = arguments[2];
    await fetchAttendanceLogsByDate(arguments[2], 1);
  } else {
    // Other filters (all, present, late): reset date filter
    selectedDateFilter = null;
    await fetchAttendanceLogs(status, 1);
  }
  
  // Restart auto-refresh with new filter
  startAutoRefresh();
}

// Fetch logs by date
async function fetchAttendanceLogsByDate(dateStr, page = 1) {
  try {
    const cacheKey = `bydate:${dateStr}:${page}`;
    
    // Serve cached results instantly if available
    const hasCache = logsCache.has(cacheKey);
    if (hasCache) {
      const cached = logsCache.get(cacheKey);
      allLogs = cached.data;
      currentPage = cached.page;
      totalPages = cached.totalPages;
      totalRecords = cached.total;
      displayLogs(allLogs);
      updatePagination();
      // Skip fetch if cache is fresh
      if (cached.timestamp && Date.now() - cached.timestamp < 10000) {
        return;
      }
    } else {
      showSkeletonLoading();
    }
    
    // Cancel any in-flight request
    if (abortController) abortController.abort();
    abortController = new AbortController();
    
    const params = new URLSearchParams({
      date: dateStr,
      page: page,
      limit: ITEMS_PER_PAGE
    });
    
    const url = `${API_URL}/attendance/logs?${params.toString()}`;
    const token = localStorage.getItem('token');

    const response = await fetch(url, {
      headers: { 'Authorization': token ? `Bearer ${token}` : '' },
      signal: abortController.signal
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      allLogs = result.data;
      currentPage = result.page;
      totalPages = result.totalPages;
      totalRecords = result.total;
      
      logsCache.set(cacheKey, {
        data: allLogs,
        page: currentPage,
        totalPages,
        total: totalRecords,
        timestamp: Date.now()
      });
      
      displayLogs(allLogs);
      updatePagination();
    } else {
      throw new Error(result.message || 'Failed to fetch logs');
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
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
  
  // Remove all existing error messages
  const existingErrors = container.querySelectorAll('.loading-indicator');
  existingErrors.forEach(err => err.remove());
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'loading-indicator';
  errorDiv.style.color = '#dc3545';
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  
  container.appendChild(errorDiv);
}

// ========================================
// AUTO REFRESH
// ========================================
function refreshCurrentFilter() {
  console.log('Auto-refreshing attendance logs with filter:', currentFilter, selectedDateFilter ? `(date: ${selectedDateFilter})` : '', `page: ${currentPage}`);
  
  // If filter is by date and date is selected, use date filter
  if (currentFilter === 'bydate' && selectedDateFilter) {
    fetchAttendanceLogsByDate(selectedDateFilter, currentPage);
  } else if (currentFilter === 'bydate' && !selectedDateFilter) {
    // If bydate selected but no date, fallback to 'all'
    console.warn('Filter is bydate but no date selected, falling back to all');
    currentFilter = 'all';
    fetchAttendanceLogs('all', currentPage);
  } else {
    // For all, present, late filters
    fetchAttendanceLogs(currentFilter, currentPage);
  }
}

// ========================================
// PAGINATION FUNCTIONS
// ========================================
function updatePagination() {
  let paginationContainer = document.querySelector('.pagination-container');
  
  // Create pagination container if it doesn't exist
  if (!paginationContainer) {
    paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container';
    const tableWrapper = document.querySelector('.table-container');
    if (tableWrapper && tableWrapper.parentNode) {
      tableWrapper.parentNode.insertBefore(paginationContainer, tableWrapper.nextSibling);
    }
  }
  
  // Clear existing pagination
  paginationContainer.innerHTML = '';
  
  // Don't show pagination if only 1 page or no data
  if (totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }
  
  paginationContainer.style.display = 'flex';
  
  // Pagination info
  const startRecord = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endRecord = Math.min(currentPage * ITEMS_PER_PAGE, totalRecords);
  
  const paginationInfo = document.createElement('div');
  paginationInfo.className = 'pagination-info';
  paginationInfo.textContent = `Showing ${startRecord}-${endRecord} of ${totalRecords} records`;
  paginationContainer.appendChild(paginationInfo);
  
  // Pagination buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'pagination-buttons';
  
  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'pagination-btn';
  prevBtn.textContent = '← Previous';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => goToPage(currentPage - 1);
  buttonsContainer.appendChild(prevBtn);
  
  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage < maxVisiblePages - 1) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  // First page + ellipsis if needed
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
  
  // Page number buttons
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
  
  // Ellipsis + last page if needed
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
  
  // Next button
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
  
  // Fetch data for the new page
  if (currentFilter === 'bydate' && selectedDateFilter) {
    await fetchAttendanceLogsByDate(selectedDateFilter, page);
  } else {
    await fetchAttendanceLogs(currentFilter, page);
  }
  
  // Scroll to top of table
  const tableWrapper = document.querySelector('.table-container');
  if (tableWrapper) {
    tableWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function startAutoRefresh() {
  // Stop any existing interval first
  stopAutoRefresh();
  
  // Refresh every 10 seconds
  refreshInterval = setInterval(() => {
    refreshCurrentFilter();
  }, 10000);
  
  console.log('Auto-refresh started (every 10 seconds)');
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log('Auto-refresh stopped');
  }
}

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', async function () {
  // Initial fetch (page 1) - skeleton akan muncul di dalam fetchAttendanceLogs jika perlu
  fetchAttendanceLogs('all', 1);
  
  // Start auto-refresh
  startAutoRefresh();
  
  // Auth check non-blocking (check di background)
  window.checkAuth?.().then(isAuth => {
    if (!isAuth) {
      document.body.innerHTML = '';
      window.location.href = '/login';
    }
  });
  
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
