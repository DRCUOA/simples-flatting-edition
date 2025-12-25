/**
 * Common data transformation utilities for controllers
 * Pure functions with no side effects following functional programming principles
 */

const { normalizeAppDate } = require('./dateUtils');

/**
 * Transforms a date string to ISO format (YYYY-MM-DD)
 * @param {string} dateString - Date string in various formats
 * @returns {string} - ISO formatted date string
 */
const toISODate = (dateString) => {
  if (!dateString) return null;
  const normalized = normalizeAppDate(dateString, 'api-domain');
  return normalized.parsed || null;
};

/**
 * Safely parses a number from a string or number
 * @param {any} value - Value to parse
 * @param {number} defaultValue - Default value if parsing fails
 * @returns {number} - Parsed number or default
 */
const parseNumber = (value, defaultValue = 0) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
};

/**
 * Safely parses a boolean from various input types
 * @param {any} value - Value to parse
 * @param {boolean} defaultValue - Default value if parsing fails
 * @returns {boolean} - Parsed boolean or default
 */
const parseBoolean = (value, defaultValue = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return defaultValue;
};

/**
 * Trims whitespace from string values in an object
 * @param {Object} obj - Object to clean
 * @returns {Object} - Object with trimmed string values
 */
const trimStringValues = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      cleaned[key] = value.trim();
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

/**
 * Removes undefined and null values from an object
 * @param {Object} obj - Object to clean
 * @returns {Object} - Object without undefined/null values
 */
const removeEmptyValues = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }
  return cleaned;
};

/**
 * Groups an array of objects by a specified key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {Object} - Object with grouped arrays
 */
const groupBy = (array, key) => {
  if (!Array.isArray(array)) return {};
  
  return array.reduce((groups, item) => {
    const groupKey = item[key];
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {});
};

/**
 * Maps an array of objects to a key-value object
 * @param {Array} array - Array to map
 * @param {string} keyField - Field to use as key
 * @param {string} valueField - Field to use as value
 * @returns {Object} - Key-value mapping
 */
const mapToKeyValue = (array, keyField, valueField) => {
  if (!Array.isArray(array)) return {};
  
  return array.reduce((map, item) => {
    map[item[keyField]] = item[valueField];
    return map;
  }, {});
};

/**
 * Formats a number as currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @param {string} locale - Locale (default: en-US)
 * @returns {string} - Formatted currency string
 */
const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  const num = parseNumber(amount, 0);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

/**
 * Capitalizes the first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} - Capitalized string
 */
const capitalize = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Converts a string to title case
 * @param {string} str - String to convert
 * @returns {string} - Title case string
 */
const toTitleCase = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Generates a standardized error response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {any} details - Additional error details
 * @returns {Object} - Standardized error object
 */
const createErrorResponse = (message, statusCode = 500, details = null) => {
  const error = { error: message };
  if (details) {
    error.details = details;
  }
  return { statusCode, error };
};

/**
 * Generates a standardized success response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} - Standardized success object
 */
const createSuccessResponse = (data = null, message = 'Success', statusCode = 200) => {
  const response = { message };
  if (data !== null) {
    response.data = data;
  }
  return { statusCode, response };
};

module.exports = {
  toISODate,
  parseNumber,
  parseBoolean,
  trimStringValues,
  removeEmptyValues,
  groupBy,
  mapToKeyValue,
  formatCurrency,
  capitalize,
  toTitleCase,
  createErrorResponse,
  createSuccessResponse
};
