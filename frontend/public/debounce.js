// Debounce utility function
// Prevents excessive function calls during rapid user input

function debounce(func, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Make it globally available
window.debounce = debounce;
