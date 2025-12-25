/**
 * Simple debounce utility
 * Delays function execution until after `wait` milliseconds have elapsed
 * since the last time it was invoked
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait (default 300ms)
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Debounce with immediate execution on first call
 * Useful for user interactions where you want immediate feedback
 * but want to throttle subsequent rapid calls
 */
export function debounceImmediate(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const callNow = !timeout;
    
    const later = () => {
      timeout = null;
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) {
      func(...args);
    }
  };
}

