// Shared Utility Functions
// This file should be loaded after config.js

// Format time from 24h format to 12h format with AM/PM
window.formatTime = function(timeString) {
  if (!timeString) return '-';
  const parts = timeString.split(':');
  const hours = parseInt(parts[0]);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes}${ampm}`;
};

// Format date to full readable format (e.g., "1 December 2025")
window.formatDateFull = function(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const day = date.getDate();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

// Format date for API (YYYY-MM-DD)
window.formatDateForApi = function(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Handle API errors consistently
window.handleApiError = function(error, customMessage) {
  console.error('API Error:', error);
  const message = customMessage || 'Connection error. Please try again later.';
  alert(message);
  return null;
};
