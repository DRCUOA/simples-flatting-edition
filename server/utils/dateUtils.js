// server/utils/dateUtils.js
/**
 * Central Date Utilities for Backend
 * 
 * Provides consistent date handling across the application:
 * - Domain dates: YYYY-MM-DD format (no time component)
 * - Timestamps: ISO UTC format (YYYY-MM-DDTHH:mm:ss.sssZ)
 */

/**
 * Normalize a date input based on the specified mode
 * @param {string|Date|null|undefined} input - Date input to normalize
 * @param {string} mode - Mode: 'bank-import', 'api-domain', 'db-domain', 'timestamp-iso', 'compare-domain'
 * @returns {Object} - { parsed: string|null, error: string|null, original: string }
 */
function normalizeAppDate(input, mode = 'api-domain') {
  if (!input && input !== '') {
    return { parsed: null, error: 'Empty date', original: String(input || '') };
  }

  const original = String(input).trim();
  
  // Handle timestamp-iso mode separately (for creating new timestamps)
  if (mode === 'timestamp-iso') {
    const now = new Date();
    return {
      parsed: now.toISOString(),
      error: null,
      original: original || 'now'
    };
  }

  // Clean the date string and remove any time components for domain dates
  const cleanDateStr = original.split(' ')[0].split('T')[0];

  // Try different date formats (prioritize DD/MM/YYYY for NZ banks)
  const formats = [
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, parts: [1, 2, 3], name: 'DD/MM/YYYY' },
    { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, parts: [3, 2, 1], name: 'YYYY-MM-DD' },
    { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, parts: [1, 2, 3], name: 'DD-MM-YYYY' },
    { regex: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, parts: [3, 2, 1], name: 'YYYY/MM/DD' },
    { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, parts: [1, 2, 3], name: 'DD.MM.YYYY' },
    { regex: /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/, parts: [3, 2, 1], name: 'YYYY.MM.DD' },
    { regex: /^(\d{1,2})\s+(\d{1,2})\s+(\d{4})$/, parts: [1, 2, 3], name: 'DD MM YYYY' },
    { regex: /^(\d{4})\s+(\d{1,2})\s+(\d{1,2})$/, parts: [3, 2, 1], name: 'YYYY MM DD' }
  ];

  for (const format of formats) {
    const match = cleanDateStr.match(format.regex);
    if (match) {
      const day = parseInt(match[format.parts[0]], 10);
      const month = parseInt(match[format.parts[1]], 10);
      const year = parseInt(match[format.parts[2]], 10);
      
      // Basic validation of date components
      if (month < 1 || month > 12) {
        return {
          parsed: null,
          error: `Invalid month in ${format.name} format`,
          original: original
        };
      }
      
      // Validate day based on month
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day < 1 || day > daysInMonth) {
        return {
          parsed: null,
          error: `Invalid day for month ${month} in ${format.name} format`,
          original: original
        };
      }
      
      if (year < 1900 || year > 2100) {
        return {
          parsed: null,
          error: `Invalid year in ${format.name} format`,
          original: original
        };
      }
      
      // Create date object and validate
      const date = new Date(year, month - 1, day);
      if (isNaN(date.getTime())) {
        return {
          parsed: null,
          error: `Invalid date in ${format.name} format`,
          original: original
        };
      }
      
      // Return in YYYY-MM-DD format for database storage
      return {
        parsed: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
        error: null,
        original: original
      };
    }
  }
  
  // Try parsing as ISO date string (for timestamps that might be passed in)
  const isoDate = new Date(cleanDateStr);
  if (!isNaN(isoDate.getTime())) {
    const day = isoDate.getDate();
    const month = isoDate.getMonth() + 1;
    const year = isoDate.getFullYear();
    
    if (year >= 1900 && year <= 2100) {
      return {
        parsed: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
        error: null,
        original: original
      };
    }
  }
  
  return {
    parsed: null,
    error: 'Date format not recognized',
    original: original
  };
}

/**
 * Compare two domain dates (YYYY-MM-DD format)
 * @param {string} date1 - First date in YYYY-MM-DD format
 * @param {string} date2 - Second date in YYYY-MM-DD format
 * @returns {number} - -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
function compareDomainDates(date1, date2) {
  if (!date1 && !date2) return 0;
  if (!date1) return -1;
  if (!date2) return 1;
  
  // Lexicographic comparison works for YYYY-MM-DD format
  if (date1 < date2) return -1;
  if (date1 > date2) return 1;
  return 0;
}

/**
 * Check if a date string is valid domain date format (YYYY-MM-DD)
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} - True if valid YYYY-MM-DD format
 */
function isDateValid(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  
  const normalized = normalizeAppDate(dateStr, 'db-domain');
  return normalized.parsed !== null && normalized.error === null;
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
 * Convert a Date object or ISO string to YYYY-MM-DD format
 * @param {Date|string} input - Date object or ISO string
 * @returns {string|null} - Date in YYYY-MM-DD format or null if invalid
 */
function toISODateString(input) {
  if (!input) return null;
  
  let date;
  if (input instanceof Date) {
    date = input;
  } else {
    date = new Date(input);
  }
  
  if (isNaN(date.getTime())) {
    return null;
  }
  
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get maximum date from an array of domain dates (YYYY-MM-DD)
 * @param {string[]} dates - Array of dates in YYYY-MM-DD format
 * @returns {string|null} - Maximum date or null if array is empty
 */
function maxDomainDate(dates) {
  if (!dates || dates.length === 0) return null;
  
  const validDates = dates.filter(d => d && isDateValid(d));
  if (validDates.length === 0) return null;
  
  return validDates.reduce((max, current) => {
    return compareDomainDates(current, max) > 0 ? current : max;
  });
}

/**
 * Get minimum date from an array of domain dates (YYYY-MM-DD)
 * @param {string[]} dates - Array of dates in YYYY-MM-DD format
 * @returns {string|null} - Minimum date or null if array is empty
 */
function minDomainDate(dates) {
  if (!dates || dates.length === 0) return null;
  
  const validDates = dates.filter(d => d && isDateValid(d));
  if (validDates.length === 0) return null;
  
  return validDates.reduce((min, current) => {
    return compareDomainDates(current, min) < 0 ? current : min;
  });
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
  
  const normalized = normalizeAppDate(dateStr, 'db-domain');
  if (!normalized.parsed) return null;
  
  const [year, month, day] = normalized.parsed.split('-').map(Number);
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
  
  const norm1 = normalizeAppDate(date1, 'db-domain');
  const norm2 = normalizeAppDate(date2, 'db-domain');
  
  if (!norm1.parsed || !norm2.parsed) return null;
  
  const [year1, month1, day1] = norm1.parsed.split('-').map(Number);
  const [year2, month2, day2] = norm2.parsed.split('-').map(Number);
  
  const d1 = new Date(year1, month1 - 1, day1);
  const d2 = new Date(year2, month2 - 1, day2);
  
  const diffTime = d2.getTime() - d1.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format timestamp for display (extracts date part from ISO timestamp)
 * @param {string} timestampStr - ISO timestamp string
 * @returns {string} - Date in YYYY-MM-DD format or null if invalid
 */
function timestampToDate(timestampStr) {
  if (!timestampStr) return null;
  return toISODateString(timestampStr);
}

module.exports = {
  normalizeAppDate,
  compareDomainDates,
  isDateValid,
  getToday,
  getCurrentDate,
  getCurrentTimestamp,
  toISODateString,
  maxDomainDate,
  minDomainDate,
  addDays,
  daysDifference,
  timestampToDate,
  getLastDayOfMonth
};

/**
 * Get the last day of a month from a YYYY-MM-DD date string
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {string|null} - Last day of month in YYYY-MM-DD format or null if invalid
 */
function getLastDayOfMonth(dateStr) {
  if (!dateStr) return null;
  
  const normalized = normalizeAppDate(dateStr, 'db-domain');
  if (!normalized.parsed) return null;
  
  const [year, month] = normalized.parsed.split('-').map(Number);
  // Day 0 of next month = last day of current month
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

