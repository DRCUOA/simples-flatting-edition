/**
 * Common validation utilities for controllers
 * Single-purpose, pure functions following DRY principles
 */

/**
 * Validates that a user is authenticated
 * @param {Object} user - The user object from req.user
 * @returns {Object} - { isValid: boolean, error?: string }
 */
const validateAuthentication = (user) => {
  if (!user?.user_id) {
    return { isValid: false, error: 'Authentication required' };
  }
  return { isValid: true };
};

/**
 * Validates required fields in request body
 * @param {Object} body - Request body
 * @param {string[]} requiredFields - Array of required field names
 * @returns {Object} - { isValid: boolean, error?: string, missing?: string[] }
 */
const validateRequiredFields = (body, requiredFields) => {
  const missing = requiredFields.filter(field => !body[field]);
  if (missing.length > 0) {
    return { 
      isValid: false, 
      error: `Missing required fields: ${missing.join(', ')}`,
      missing 
    };
  }
  return { isValid: true };
};

/**
 * Validates that a value is a valid number
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {Object} - { isValid: boolean, error?: string, parsed?: number }
 */
const validateNumber = (value, fieldName = 'value') => {
  if (value === undefined || value === null) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }
  
  return { isValid: true, parsed };
};

/**
 * Validates that a value is a valid date string (YYYY-MM-DD format)
 * @param {string} dateString - Date string to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {Object} - { isValid: boolean, error?: string, parsed?: string }
 */
const validateDate = (dateString, fieldName = 'date') => {
  if (!dateString) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const { isDateValid } = require('./dateUtils');
  if (!isDateValid(dateString)) {
    return { isValid: false, error: `${fieldName} must be a valid date in YYYY-MM-DD format` };
  }
  
  return { isValid: true, parsed: dateString };
};

/**
 * Validates that an array is provided and not empty
 * @param {any} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {Object} - { isValid: boolean, error?: string }
 */
const validateArray = (value, fieldName = 'array') => {
  if (!Array.isArray(value)) {
    return { isValid: false, error: `${fieldName} must be an array` };
  }
  
  if (value.length === 0) {
    return { isValid: false, error: `${fieldName} cannot be empty` };
  }
  
  return { isValid: true };
};

/**
 * Validates user access (self or admin)
 * @param {string} requestingUserId - ID of the requesting user
 * @param {string} targetUserId - ID of the target user
 * @param {string} userRole - Role of the requesting user
 * @returns {Object} - { isValid: boolean, error?: string }
 */
const validateUserAccess = (requestingUserId, targetUserId, userRole) => {
  if (requestingUserId !== targetUserId && userRole !== 'admin') {
    return { 
      isValid: false, 
      error: 'Access denied: Cannot access other user data' 
    };
  }
  return { isValid: true };
};

/**
 * Validates that a string is not empty after trimming
 * @param {string} value - String to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {Object} - { isValid: boolean, error?: string, parsed?: string }
 */
const validateNonEmptyString = (value, fieldName = 'field') => {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: `${fieldName} cannot be empty` };
  }
  
  return { isValid: true, parsed: trimmed };
};

module.exports = {
  validateAuthentication,
  validateRequiredFields,
  validateNumber,
  validateDate,
  validateArray,
  validateUserAccess,
  validateNonEmptyString
};
