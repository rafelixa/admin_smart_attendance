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
let currentPage = 1;
let totalPages = 1;
let totalRecords = 0;
const ITEMS_PER_PAGE = 50;

// Request control & page cache
let abortController = null;
const studentsCache = new Map(); // key: `${currentPage}` + `:${currentFilter}`

async function filterBy(tolerance, targetElement) {
  console.log('Filter by:', tolerance);
  
  currentFilter = tolerance;
  // Clear cached pages when changing tolerance filter to avoid stale views
  studentsCache.clear?.();
  
  // Remove active class from all options
  document.querySelectorAll('.filter-option').forEach(option => {
    option.classList.remove('active');
  });
  
  // Add active class to clicked option
  if (targetElement) {
    targetElement.classList.add('active');
  } else {
    const activeOption = document.querySelector(`.filter-option[data-filter="${tolerance}"]`);
    if (activeOption) activeOption.classList.add('active');
  }
  
  // Reset to page 1 and re-fetch with new filter
  currentPage = 1;
  await fetchStudentsWithTolerance(tolerance, 1);
  
  closeFilter();
}

// ========================================
// APPLY FILTER TO EXISTING DATA (for display only)
// ========================================
function applyFilterLocal(filter) {
  let filteredStudents = allStudentsData;
  
  // Backend returns boolean flags: tolerance.exceeded, tolerance.reached
  if (filter === 'past') {
    filteredStudents = allStudentsData.filter(s => 
      s.tolerance && s.tolerance.exceeded === true
    );
  } else if (filter === 'reach') {
    filteredStudents = allStudentsData.filter(s => 
      s.tolerance && s.tolerance.reached === true
    );
  }
  
  console.log(`Filter by: ${filter} - Displaying ${filteredStudents.length} students`);
  displayStudents(filteredStudents);
}

// ========================================
// API CONFIGURATION - use global config
// ========================================
const API_URL = window.APP_CONFIG ? window.APP_CONFIG.API_URL : '/api';

// AUTHENTICATION CHECK: now uses JWT session to backend


// ========================================
// FETCH STUDENTS WITH TOLERANCE DATA
// ========================================
async function fetchStudentsWithTolerance(filter = 'all', page = 1) {
  try {
    showLoading();

    // Cancel any in-flight request to avoid overlap on rapid pagination
    if (abortController) abortController.abort();
    abortController = new AbortController();

    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ page, limit: ITEMS_PER_PAGE });
    
    // Add filter parameter to request
    if (filter && filter !== 'all') {
      params.append('filter', filter);
    }

    // Serve cached data immediately if available
    const cacheKey = `${String(filter).toLowerCase()}:${page}`;
    if (studentsCache.has(cacheKey)) {
      const cached = studentsCache.get(cacheKey);
      allStudentsData = cached.students;
      currentPage = cached.page;
      totalPages = cached.totalPages;
      totalRecords = cached.total;
      displayStudents(allStudentsData);
      updatePagination();
      // continue to refresh in background
    }

    const response = await fetch(`${API_URL}/users/students?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      signal: abortController.signal
    });

    const data = await response.json();

    if (!data.success) {
      console.error('Failed to fetch students:', data.message);
      showError('Failed to load student data');
      return;
    }

    currentPage = data.page;
    totalPages = data.totalPages;
    totalRecords = data.total;
    const students = Array.isArray(data?.data?.students) ? data.data.students : [];

    allStudentsData = students; // already includes tolerance

    // Cache fresh
    studentsCache.set(cacheKey, {
      students,
      page: currentPage,
      totalPages,
      total: totalRecords
    });

    // Display all students (don't apply client-side filter, data is already filtered from server if needed)
    displayStudents(allStudentsData);
    updatePagination();
  } catch (error) {
    if (error.name === 'AbortError') return;
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

  // Use DocumentFragment for batch rendering - faster than individual appends
  const fragment = document.createDocumentFragment();

  // Keep header row
  const header = container.querySelector('.frame-3');
  
  // Clear all content (removes all old data and messages)
  container.innerHTML = '';
  
  // Re-add header
  if (header) {
    container.appendChild(header);
  }

  // Check if no students
  if (!students || students.length === 0) {
    const noData = document.createElement('div');
    noData.className = 'empty-message';
    noData.style.textAlign = 'center';
    noData.style.padding = '40px';
    noData.style.color = '#666';
    noData.innerHTML = '<p>No students found</p>';
    container.appendChild(noData);
    return;
  }

  // Use DocumentFragment for batch rendering - much faster
  
  // Add student rows
  students.forEach((student, index) => {
    const row = document.createElement('div');
    // Alternate row classes
    row.className = index % 2 === 0 ? 'frame-4' : 'frame-6';

    row.innerHTML = `
      <div class="frame-5" style="cursor: pointer;"><div class="text-wrapper-3">${student.nim || '-'}</div></div>
      <div class="frame-5" style="cursor: pointer;"><div class="text-wrapper-3">${student.full_name}</div></div>
      <div class="action-buttons">
        <button class="btn-delete" data-user-id="${student.user_id}" data-user-name="${student.full_name}">
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    `;

    // Click to view detail (only on nim and name cells)
    const clickableCells = row.querySelectorAll('.frame-5');
    clickableCells.forEach(cell => {
      cell.addEventListener('click', () => {
        window.location.href = `/userlist-manage?id=${student.user_id}`;
      });

      // Hover effects
      cell.addEventListener('mouseenter', () => {
        row.style.backgroundColor = '#f8f9fa';
      });

      cell.addEventListener('mouseleave', () => {
        row.style.backgroundColor = '';
      });
    });

    // Delete button handler
    const deleteBtn = row.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent row click
      handleDeleteStudent(student.user_id, student.full_name);
    });

    fragment.appendChild(row);
  });
  
  // Batch append using requestAnimationFrame for smooth rendering
  requestAnimationFrame(() => {
    container.appendChild(fragment);
  });

  console.log(`[SUCCESS] Displayed ${students.length} students from database`);
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
  // Pass current filter to maintain filter state during pagination
  await fetchStudentsWithTolerance(currentFilter, page);
  
  const tableWrapper = document.querySelector('.table-wrapper');
  if (tableWrapper) {
    tableWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
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

// ========================================
// FILTER OPTION EVENT LISTENER
// ========================================
document.addEventListener('DOMContentLoaded', async function () {
  // Show loading ASAP to avoid empty table flash
  showLoading();
  // Proteksi: cek session via backend JWT
  if (!(await window.checkAuth?.())) {
    document.body.innerHTML = '';
    window.location.href = '/login';
    return;
  }

  // Set filter default aktif
  const defaultFilter = document.querySelector('.filter-option[data-filter="all"]');
  if (defaultFilter) defaultFilter.classList.add('active');

    // Event listener tombol filter
    const filterButton = document.getElementById('filterButton');
    if (filterButton) {
      filterButton.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleFilter();
      });
    }

    // Event listener overlay untuk menutup popup
    const filterOverlay = document.getElementById('filterOverlay');
    if (filterOverlay) {
      filterOverlay.addEventListener('click', function () {
        closeFilter();
      });
    }

  // Tambahkan event listener ke semua filter-option (hanya sekali)
  document.querySelectorAll('.filter-option').forEach(option => {
    option.addEventListener('click', function (e) {
      e.stopPropagation();
      const filterValue = this.getAttribute('data-filter');
      filterBy(filterValue, this);
    });
  });

  // Create User Modal handlers
  const createUserBtn = document.getElementById('createUserBtn');
  const createModal = document.getElementById('createModal');
  const closeCreateModal = document.getElementById('closeCreateModal');
  const cancelCreate = document.getElementById('cancelCreate');
  const createStudentForm = document.getElementById('createStudentForm');

  if (createUserBtn) {
    createUserBtn.addEventListener('click', () => {
      createModal.classList.add('active');
    });
  }

  if (closeCreateModal) {
    closeCreateModal.addEventListener('click', () => {
      createModal.classList.remove('active');
      createStudentForm.reset();
    });
  }

  if (cancelCreate) {
    cancelCreate.addEventListener('click', () => {
      createModal.classList.remove('active');
      createStudentForm.reset();
    });
  }

  // Close modal on overlay click
  if (createModal) {
    createModal.addEventListener('click', (e) => {
      if (e.target === createModal) {
        createModal.classList.remove('active');
        createStudentForm.reset();
      }
    });
  }

  // Handle form submission
  if (createStudentForm) {
    createStudentForm.addEventListener('submit', handleCreateStudent);
  }

  // NIM input validation - only allow numbers
  const nimInput = document.getElementById('nim');
  if (nimInput) {
    nimInput.addEventListener('input', (e) => {
      // Remove any non-numeric characters
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    nimInput.addEventListener('keypress', (e) => {
      // Prevent non-numeric key presses
      const charCode = e.which || e.keyCode;
      if (charCode < 48 || charCode > 57) {
        e.preventDefault();
      }
    });

    nimInput.addEventListener('paste', (e) => {
      // Handle paste event
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData('text');
      const numbersOnly = pastedText.replace(/[^0-9]/g, '');
      document.execCommand('insertText', false, numbersOnly);
    });
  }

  // Fetch students awal (hanya sekali saat load)
  fetchStudents();
});

// ========================================
// CREATE STUDENT HANDLER
// ========================================
async function handleCreateStudent(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('.btn-submit');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating...';

  const formData = new FormData(e.target);
  const studentData = {
    full_name: formData.get('full_name'),
    nim: formData.get('nim'),
    email: formData.get('email'),
    password: formData.get('password')
  };

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/users/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(studentData)
    });

    const result = await response.json();

    if (!result.success) {
      alert(`Error: ${result.message}`);
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    alert(`Student ${studentData.full_name} created successfully!`);
    document.getElementById('createModal').classList.remove('active');
    e.target.reset();
    
    // Refresh student list
    studentsCache.clear();
    await fetchStudentsWithTolerance(currentFilter, currentPage);

  } catch (error) {
    console.error('Error creating student:', error);
    alert('Failed to create student. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// ========================================
// DELETE STUDENT HANDLER
// ========================================
async function handleDeleteStudent(userId, userName) {
  const confirmDelete = confirm(`Are you sure you want to delete student "${userName}"?\n\nThis will hide the student from the system but data will be preserved in the database.`);
  
  if (!confirmDelete) return;

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/users/students/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!result.success) {
      alert(`Error: ${result.message}`);
      return;
    }

    alert(`Student ${userName} has been removed from the system.`);
    
    // Refresh student list
    studentsCache.clear();
    await fetchStudentsWithTolerance(currentFilter, currentPage);

  } catch (error) {
    console.error('Error deleting student:', error);
    alert('Failed to delete student. Please try again.');
  }
}
