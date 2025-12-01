// Global Configuration for Frontend
// This file should be loaded before any other scripts that need API_URL

window.APP_CONFIG = {
  API_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
    ? 'http://localhost:3000/api' 
    : '/api',
  
  // Other global configs can be added here
  APP_NAME: 'Smart Attendance Admin',
  VERSION: '1.0.0'
};
