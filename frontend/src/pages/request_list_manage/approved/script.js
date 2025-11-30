// ========================================
// API CONFIGURATION (development vs production)
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
// GET PERMISSION ID FROM URL
// ========================================
function getPermissionIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// ========================================
// FETCH PERMISSION DETAIL
// ========================================
async function fetchPermissionDetail(permissionId) {
  try {
    showLoading();
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/permissions/${permissionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });

    const data = await response.json();

    if (!data.success) {
      console.error('Failed to fetch permission detail:', data.message);
      showError('Failed to load permission detail');
      return null;
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching permission detail:', error);
    showError('Connection error. Please check if backend is running.');
    return null;
  }
}

// ========================================
// DISPLAY PERMISSION DETAIL
// ========================================
function displayPermissionDetail(permission) {
  console.log('🎨 Displaying permission detail:', permission);
  
  // Hide loading overlay
  hideLoading();
  
  // Update Detail section
  updateDetailValue('Name', permission.student.name);
  updateDetailValue('NIM', permission.student.nim);
  updateDetailValue('Class', permission.course.name.toUpperCase());
  
  // Requested time
  const requestedTime = `${formatTime(permission.start_time)} - ${formatTime(permission.end_time)}`;
  updateDetailValue('Requested time', requestedTime);
  
  // Requested date
  const requestedDate = formatDateFull(permission.permission_date);
  updateDetailValue('Requested date', requestedDate.toUpperCase());
  
  // Submit time and date
  if (permission.submitted_at) {
    const submitDateTime = new Date(permission.submitted_at);
    const submitTime = submitDateTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const submitDate = formatDateFull(submitDateTime);
    updateDetailValue('Submit time', submitTime);
    updateDetailValue('Submit date', submitDate.toUpperCase());
  }
  
  // Reason
  const reasonValue = permission.reason || 'NOT SPECIFIED';
  updateDetailValue('Reason', reasonValue.toUpperCase());
  
  // Update Class Information section
  if (permission.schedule) {
    updateClassInfo('Day', permission.schedule.day || '-');
    const scheduleTime = `${formatTime(permission.schedule.start_time)} - ${formatTime(permission.schedule.end_time)}`;
    updateClassInfo('Schedule', scheduleTime);
  }
  updateClassInfo('Date', formatDateFull(permission.permission_date));
  
  // Update Description
  const descriptionText = document.querySelector('.description-text');
  if (descriptionText) {
    descriptionText.textContent = permission.description || 'No description provided.';
  }
  
  // Update Image/Evidence (prioritas image_link, fallback ke evidence)
  const imageContainer = document.querySelector('.image-container');
  if (imageContainer) {
    const imageUrl = permission.image_link || permission.evidence;
    const img = imageContainer.querySelector('img');
    
    if (imageUrl) {
      // Display image from link
      if (img) {
        img.src = imageUrl;
        img.alt = 'Permission Evidence';
        img.style.display = 'block';
        img.onerror = function() {
          this.style.display = 'none';
          const errorText = document.createElement('p');
          errorText.style.textAlign = 'center';
          errorText.style.color = '#dc3545';
          errorText.textContent = 'Failed to load image';
          imageContainer.appendChild(errorText);
        };
      } else {
        const newImg = document.createElement('img');
        newImg.src = imageUrl;
        newImg.alt = 'Permission Evidence';
        newImg.className = 'medical-image';
        newImg.onerror = function() {
          this.style.display = 'none';
          const errorText = document.createElement('p');
          errorText.style.textAlign = 'center';
          errorText.style.color = '#dc3545';
          errorText.textContent = 'Failed to load image';
          imageContainer.appendChild(errorText);
        };
        imageContainer.appendChild(newImg);
      }
    } else {
      // Hide image if no evidence
      if (img) {
        img.style.display = 'none';
      }
      const noImageText = document.createElement('p');
      noImageText.style.textAlign = 'center';
      noImageText.style.color = '#999';
      noImageText.textContent = 'No evidence image provided';
      imageContainer.appendChild(noImageText);
    }
  }
  
  console.log('[SUCCESS] Permission detail displayed');
}

// ========================================
// HELPER FUNCTIONS TO UPDATE DOM
// ========================================
function updateDetailValue(label, value) {
  const detailRows = document.querySelectorAll('.detail-row');
  detailRows.forEach(row => {
    const labelElement = row.querySelector('.detail-label');
    if (labelElement && labelElement.textContent.trim() === label) {
      const valueElement = row.querySelector('.detail-value');
      if (valueElement) {
        valueElement.textContent = value;
        
        // Apply styling based on reason
        if (label === 'Reason') {
          valueElement.className = 'detail-value';
          const reasonLower = value.toLowerCase();
          if (reasonLower.includes('sick')) {
            valueElement.classList.add('reason-sick');
          } else if (reasonLower.includes('family')) {
            valueElement.classList.add('reason-family');
          } else if (reasonLower.includes('medical')) {
            valueElement.classList.add('reason-medical');
          }
        }
      }
    }
  });
}

function updateClassInfo(label, value) {
  const classInfoContainer = document.querySelector('.class-info-container');
  if (!classInfoContainer) return;
  
  const detailRows = classInfoContainer.querySelectorAll('.detail-row');
  detailRows.forEach(row => {
    const labelElement = row.querySelector('.detail-label');
    if (labelElement && labelElement.textContent.trim() === label) {
      const valueElement = row.querySelector('.detail-value');
      if (valueElement) {
        valueElement.textContent = value;
      }
    }
  });
}

// ========================================
// FORMAT HELPER FUNCTIONS
// ========================================
function formatTime(timeString) {
  if (!timeString) return '-';
  const parts = timeString.split(':');
  const hours = parseInt(parts[0]);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes}${ampm}`;
}

function formatDateFull(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const day = date.getDate();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

// ========================================
// LOADING INDICATOR
// ========================================
function showLoading() {
  const content = document.querySelector('.content');
  if (!content) return;
  
  // Add overlay instead of replacing content
  const existingOverlay = content.querySelector('.loading-overlay');
  if (existingOverlay) return;
  
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.95);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  overlay.innerHTML = `
    <i class="fas fa-spinner fa-spin" style="font-size: 48px; margin-bottom: 20px; color: #666;"></i>
    <p style="font-size: 18px; color: #666;">Loading permission detail...</p>
  `;
  content.style.position = 'relative';
  content.appendChild(overlay);
}

function hideLoading() {
  const content = document.querySelector('.content');
  if (!content) return;
  
  const overlay = content.querySelector('.loading-overlay');
  if (overlay) {
    overlay.remove();
  }
}

// ========================================
// ERROR DISPLAY
// ========================================
function showError(message) {
  const content = document.querySelector('.content');
  if (!content) return;
  
  content.innerHTML = `
    <div style="text-align: center; padding: 100px 40px; color: #dc3545;">
      <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 20px;"></i>
      <p style="font-size: 18px;">${message}</p>
      <button onclick="window.location.href='/request-list'" style="margin-top: 20px; padding: 10px 30px; background: #e0697e; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">Back to Request List</button>
    </div>
  `;
}

// ========================================
// INITIALIZE PAGE
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
  // Check authentication
  const user = checkAuth();
  if (!user) return;

  // Get permission ID from URL
  const permissionId = getPermissionIdFromURL();
  
  if (!permissionId) {
    showError('Permission ID not found in URL');
    return;
  }

  // Fetch and display permission detail
  const permission = await fetchPermissionDetail(permissionId);
  
  if (permission) {
    displayPermissionDetail(permission);
  }
  
  console.log('[SUCCESS] Request Manage (Approved) page initialized');
});
