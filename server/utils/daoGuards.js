// server/utils/daoGuards.js

/**
 * Utility functions for enforcing user data isolation in DAO methods
 */

/**
 * Validates that userId is provided and is valid
 * @param {string} userId - The user ID to validate
 * @param {string} operation - The operation being performed (for error messages)
 * @throws {Error} If userId is missing or invalid
 */
const validateUserId = (userId, operation = 'operation') => {
  if (!userId) {
    throw new Error(`User ID is required for ${operation}`);
  }
  
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw new Error(`Invalid user ID provided for ${operation}`);
  }
  
  // Basic UUID format validation (loose)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new Error(`Invalid user ID format for ${operation}`);
  }
};

/**
 * Validates DAO method parameters for user isolation
 * @param {Object} options - The options object containing userId
 * @param {string} operation - The operation being performed
 * @throws {Error} If validation fails
 */
const validateDAOOptions = (options, operation) => {
  if (!options || typeof options !== 'object') {
    throw new Error(`Options object with userId is required for ${operation}`);
  }
  
  validateUserId(options.userId, operation);
};

/**
 * Creates a user-scoped error for DAO operations
 * @param {string} message - The error message
 * @param {string} code - The error code
 * @param {Object} details - Additional error details
 * @returns {Error} A structured error object
 */
const createDAOError = (message, code = 'DAO_ERROR', details = {}) => {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
};

/**
 * Wrapper for DAO operations that enforces user isolation
 * @param {Function} operation - The DAO operation to wrap
 * @param {string} operationName - Name of the operation for logging
 * @returns {Function} Wrapped function with user isolation enforcement
 */
const withUserIsolation = (operation, operationName) => {
  return (options, ...args) => {
    try {
      validateDAOOptions(options, operationName);
      return operation(options, ...args);
    } catch (error) {
      // Re-throw with operation context
      const wrappedError = createDAOError(
        `${operationName}: ${error.message}`,
        'USER_ISOLATION_ERROR',
        { operation: operationName, originalError: error.message }
      );
      throw wrappedError;
    }
  };
};

/**
 * Adds user_id filtering to SQL WHERE clause
 * @param {string} sql - The base SQL query
 * @param {string} userId - The user ID to filter by
 * @returns {Object} Object with updated SQL and parameters
 */
const addUserFilter = (sql, userId) => {
  validateUserId(userId, 'SQL filtering');
  
  // Check if WHERE clause already exists
  const hasWhere = /\sWHERE\s/i.test(sql);
  const userFilter = hasWhere ? ' AND user_id = ?' : ' WHERE user_id = ?';
  
  return {
    sql: sql + userFilter,
    userIdParam: userId
  };
};

/**
 * Validates that a query result belongs to the requesting user
 * @param {Object|Array} result - The query result
 * @param {string} userId - The expected user ID
 * @param {string} operation - The operation being performed
 * @throws {Error} If result doesn't belong to user
 */
const validateResultOwnership = (result, userId, operation) => {
  if (!result) {
    return; // No result to validate
  }
  
  const items = Array.isArray(result) ? result : [result];
  
  for (const item of items) {
    if (item && item.user_id && item.user_id !== userId) {
      throw createDAOError(
        `${operation}: Attempted to access resource belonging to different user`,
        'CROSS_USER_ACCESS_ATTEMPT',
        { expectedUserId: userId, actualUserId: item.user_id }
      );
    }
  }
};

module.exports = {
  validateUserId,
  validateDAOOptions,
  createDAOError,
  withUserIsolation,
  addUserFilter,
  validateResultOwnership
};
