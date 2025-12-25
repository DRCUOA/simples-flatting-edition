// client/src/utils/dateUtils.js
/**
 * Central Date Utilities for Frontend
 * 
 * Provides consistent date handling across the frontend:
 * - Domain dates: YYYY-MM-DD format (no time component)
 * - Timestamps: ISO UTC format (YYYY-MM-DDTHH:mm:ss.sssZ)
 * - Display: DD/MM/YYYY format for NZ users
 */

/**
 * Normalize a date input based on the specified mode
 * @param {string|null|undefined} input - Date input to normalize
 * @param {string} mode - Mode: 'api-to-domain', 'domain-to-display', 'display-to-domain', 'timestamp-to-display', 'compare-domain'
 * @returns {string|null} - Normalized date string or null if invalid
 */
function normalizeAppDateClient(input, mode = 'api-to-domain') {
  if (!input && input !== '') {
    return null;
  }

  const original = String(input).trim();
  
  // api-to-domain: API response → internal YYYY-MM-DD
  if (mode === 'api-to-domain') {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(original)) {
      return original;
    }
    
    // Try parsing DD/MM/YYYY format FIRST (before new Date() which interprets as MM/DD/YYYY)
    const ddmmyyyyMatch = original.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      return `${year}-${month}-${day}`;
    }
    
    // Try parsing ISO timestamp and extract date part (only for unambiguous ISO formats)
    // Check if it looks like an ISO timestamp (contains T or has timezone info)
    if (original.includes('T') || original.includes('Z') || /^\d{4}-\d{2}-\d{2}/.test(original)) {
      const date = new Date(original);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    
    return null;
  }
  
  // domain-to-display: Internal YYYY-MM-DD → NZ display DD/MM/YYYY
  if (mode === 'domain-to-display') {
    if (!original) return '—';
    
    // If already in DD/MM/YYYY format, return as-is
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(original)) {
      return original;
    }
    
    // Parse YYYY-MM-DD format
    const yyyymmddMatch = original.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (yyyymmddMatch) {
      const [, year, month, day] = yyyymmddMatch;
      return `${day}/${month}/${year}`;
    }
    
    // Try parsing as ISO timestamp
    const date = new Date(original);
    if (!isNaN(date.getTime())) {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
    return original; // Return original if can't parse
  }
  
  // display-to-domain: User input DD/MM/YYYY → internal YYYY-MM-DD
  if (mode === 'display-to-domain') {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(original)) {
      return original;
    }
    
    // Parse DD/MM/YYYY format
    const ddmmyyyyMatch = original.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      return `${year}-${month}-${day}`;
    }
    
    // Try parsing as ISO timestamp
    const date = new Date(original);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return null;
  }
  
  // timestamp-to-display: ISO timestamp → NZ display format
  if (mode === 'timestamp-to-display') {
    if (!original) return '—';
    
    const date = new Date(original);
    if (isNaN(date.getTime())) {
      return '—';
    }
    
    // Format as DD/MM/YYYY HH:mm for timestamps
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
  
  return null;
}

/**
 * Format date for display (DD/MM/YYYY)
 * @param {string|null|undefined} dateStr - Date string in YYYY-MM-DD or ISO format
 * @returns {string} - Formatted date string or '—' if invalid
 */
function formatDate(dateStr) {
  return normalizeAppDateClient(dateStr, 'domain-to-display') || '—';
}

/**
 * Format date for short display (DD/MM/YYYY without time)
 * @param {string|null|undefined} dateStr - Date string in YYYY-MM-DD or ISO format
 * @returns {string} - Formatted date string or '—' if invalid
 */
function formatDateShort(dateStr) {
  return normalizeAppDateClient(dateStr, 'domain-to-display') || '—';
}

/**
 * Format date for API (YYYY-MM-DD)
 * @param {string|null|undefined} dateStr - Date string in DD/MM/YYYY or YYYY-MM-DD format
 * @returns {string|null} - Date in YYYY-MM-DD format or null if invalid
 */
function formatDateForAPI(dateStr) {
  return normalizeAppDateClient(dateStr, 'display-to-domain');
}

/**
 * Compare two domain dates (YYYY-MM-DD format)
 * @param {string} date1 - First date in YYYY-MM-DD format
 * @param {string} date2 - Second date in YYYY-MM-DD format
 * @returns {number} - -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
function compareDates(date1, date2) {
  if (!date1 && !date2) return 0;
  if (!date1) return -1;
  if (!date2) return 1;
  
  // Normalize both dates to YYYY-MM-DD
  const norm1 = normalizeAppDateClient(date1, 'api-to-domain');
  const norm2 = normalizeAppDateClient(date2, 'api-to-domain');
  
  if (!norm1 && !norm2) return 0;
  if (!norm1) return -1;
  if (!norm2) return 1;
  
  // Lexicographic comparison works for YYYY-MM-DD format
  if (norm1 < norm2) return -1;
  if (norm1 > norm2) return 1;
  return 0;
}

/**
 * Check if a date string is valid
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} - True if valid date
 */
function isDateValid(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  
  const normalized = normalizeAppDateClient(dateStr, 'api-to-domain');
  return normalized !== null;
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} - Today's date as YYYY-MM-DD
 */
function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format timestamp for display (DD/MM/YYYY HH:mm)
 * @param {string|null|undefined} timestampStr - ISO timestamp string
 * @returns {string} - Formatted timestamp or '—' if invalid
 */
function formatTimestamp(timestampStr) {
  return normalizeAppDateClient(timestampStr, 'timestamp-to-display') || '—';
}

/**
 * Get current timestamp in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
 * @returns {string} - Current timestamp as ISO string
 */
function getCurrentTimestamp() {
  const now = new Date();
  return now.toISOString();
}

/**
 * Get current date in YYYY-MM-DD format (same as getToday, kept for consistency)
 * @returns {string} - Today's date as YYYY-MM-DD
 */
function getCurrentDate() {
  return getToday();
}

/**
 * Add days to a domain date (YYYY-MM-DD)
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {number} days - Number of days to add (can be negative)
 * @returns {string|null} - Result date in YYYY-MM-DD format or null if invalid
 */
function addDays(dateStr, days) {
  if (!dateStr) return null;
  
  const normalized = normalizeAppDateClient(dateStr, 'api-to-domain');
  if (!normalized) return null;
  
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  
  const resultYear = date.getFullYear();
  const resultMonth = (date.getMonth() + 1).toString().padStart(2, '0');
  const resultDay = date.getDate().toString().padStart(2, '0');
  return `${resultYear}-${resultMonth}-${resultDay}`;
}

/**
 * Calculate difference in days between two domain dates (YYYY-MM-DD)
 * @param {string} date1 - First date in YYYY-MM-DD format
 * @param {string} date2 - Second date in YYYY-MM-DD format
 * @returns {number|null} - Number of days difference (date2 - date1) or null if invalid
 */
function daysDifference(date1, date2) {
  if (!date1 || !date2) return null;
  
  const norm1 = normalizeAppDateClient(date1, 'api-to-domain');
  const norm2 = normalizeAppDateClient(date2, 'api-to-domain');
  
  if (!norm1 || !norm2) return null;
  
  const [year1, month1, day1] = norm1.split('-').map(Number);
  const [year2, month2, day2] = norm2.split('-').map(Number);
  
  const d1 = new Date(year1, month1 - 1, day1);
  const d2 = new Date(year2, month2 - 1, day2);
  
  const diffTime = d2.getTime() - d1.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format timestamp to locale string (for display purposes)
 * @param {string|null|undefined} timestampStr - ISO timestamp string
 * @returns {string} - Formatted locale string or 'Never' if invalid
 */
function formatTimestampLocale(timestampStr) {
  if (!timestampStr) return 'Never';
  const date = new Date(timestampStr);
  if (isNaN(date.getTime())) return 'Never';
  return date.toLocaleString();
}

/**
 * Format timestamp to locale date string (for display purposes)
 * @param {string|null|undefined} timestampStr - ISO timestamp string
 * @returns {string} - Formatted locale date string or 'N/A' if invalid
 */
function formatTimestampLocaleDate(timestampStr) {
  if (!timestampStr) return 'N/A';
  const date = new Date(timestampStr);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString();
}

/**
 * Format date string for chart display based on period
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @param {string} period - Period type ('1D', '1W', '1M', '1Y', '5Y', 'ALL')
 * @returns {string} - Formatted date string
 */
function formatDateForPeriod(dateStr, period) {
  if (!dateStr) return '';
  const normalized = normalizeAppDateClient(dateStr, 'api-to-domain');
  if (!normalized) return '';
  
  // Parse YYYY-MM-DD to get components
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return '';
  
  switch (period) {
    case '1D':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    case '1W':
    case '1M':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case '1Y':
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    case '5Y':
    case 'ALL':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    default:
      return date.toLocaleDateString('en-US');
  }
}

/**
 * Get start of current week (Sunday) in YYYY-MM-DD format
 * @returns {string} - Start of week date
 */
function getCurrentWeekStart() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const startOfWeek = addDays(getToday(), -dayOfWeek);
  return startOfWeek;
}

/**
 * Get end of current week (Saturday) in YYYY-MM-DD format
 * @returns {string} - End of week date
 */
function getCurrentWeekEnd() {
  const start = getCurrentWeekStart();
  return addDays(start, 6);
}

/**
 * Get current month in YYYY-MM format
 * @returns {string} - Current month string
 */
function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get day of week (0 = Sunday, 6 = Saturday) from a YYYY-MM-DD date string
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {number|null} - Day of week (0-6) or null if invalid
 */
function getDayOfWeek(dateStr) {
  if (!dateStr) return null;
  const normalized = normalizeAppDateClient(dateStr, 'api-to-domain');
  if (!normalized) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return null;
  return date.getDay();
}

/**
 * Get first day of current month in YYYY-MM-DD format
 * @returns {string} - First day of month
 */
function getFirstDayOfMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Get last day of current month in YYYY-MM-DD format
 * @returns {string} - Last day of month
 */
function getLastDayOfMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  // Get last day by going to first day of next month and subtracting 1 day
  const firstDayNextMonth = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  return addDays(firstDayNextMonth, -1);
}

export {
  normalizeAppDateClient,
  formatDate,
  formatDateShort,
  formatDateForAPI,
  compareDates,
  isDateValid,
  getToday,
  getCurrentDate,
  getCurrentTimestamp,
  formatTimestamp,
  addDays,
  daysDifference,
  formatTimestampLocale,
  formatTimestampLocaleDate,
  getCurrentWeekStart,
  getCurrentWeekEnd,
  getCurrentMonth,
  getDayOfWeek,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  formatDateForPeriod
};

