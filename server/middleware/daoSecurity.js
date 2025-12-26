// server/middleware/daoSecurity.js

const { validateUserId, createDAOError } = require('../utils/daoGuards');

/**
 * Enhanced DAO security middleware that wraps existing DAO methods
 * to ensure user isolation and validation
 */

/**
 * Creates a secure wrapper for DAO methods that require userId
 * @param {Object} dao - The DAO object to wrap
 * @param {Array} methodsRequiringUserId - Array of method names that require userId
 * @param {Array} methodsRequiringUserIdInOptions - Array of method names that require userId in options object
 * @returns {Object} Wrapped DAO with security enforcement
 */
const createSecureDAO = (dao, methodsRequiringUserId = [], methodsRequiringUserIdInOptions = []) => {
  const secureDAO = Object.create(dao);

  // Wrap methods that require userId as a parameter
  methodsRequiringUserId.forEach(methodName => {
    if (typeof dao[methodName] === 'function') {
      secureDAO[methodName] = function(...args) {
        // Find userId in arguments (usually first or second parameter)
        let userId = args[0];
        let userIdIndex = 0;
        
        // Check if userId is in second position (common pattern for ID-based methods)
        if (typeof args[0] === 'string' && args[0].includes('-') && typeof args[1] === 'string' && args[1].includes('-')) {
          userId = args[1];
          userIdIndex = 1;
        } else if (typeof args[0] !== 'string' || !args[0].includes('-')) {
          // Look for userId in other positions
          for (let i = 1; i < args.length; i++) {
            if (typeof args[i] === 'string' && args[i].includes('-')) {
              userId = args[i];
              userIdIndex = i;
              break;
            }
          }
        }

        // For callback-based methods, the last argument should be a function
        const lastArg = args[args.length - 1];
        const hasCallback = typeof lastArg === 'function';

        try {
          validateUserId(userId, `${methodName} operation`);
        } catch (error) {
          if (hasCallback) {
            return lastArg(createDAOError(error.message, 'DAO_SECURITY_ERROR'));
          } else {
            throw createDAOError(error.message, 'DAO_SECURITY_ERROR');
          }
        }

        // Call original method with validated userId
        return dao[methodName].apply(this, args);
      };
    }
  });

  // Wrap methods that require userId in options object
  methodsRequiringUserIdInOptions.forEach(methodName => {
    if (typeof dao[methodName] === 'function') {
      secureDAO[methodName] = function(options, ...args) {
        try {
          if (!options || typeof options !== 'object') {
            throw new Error(`Options object with userId is required for ${methodName}`);
          }
          validateUserId(options.userId, `${methodName} operation`);
        } catch (error) {
          const callback = args.find(arg => typeof arg === 'function');
          if (callback) {
            return callback(createDAOError(error.message, 'DAO_SECURITY_ERROR'));
          } else {
            throw createDAOError(error.message, 'DAO_SECURITY_ERROR');
          }
        }

        return dao[methodName].apply(this, [options, ...args]);
      };
    }
  });

  return secureDAO;
};

/**
 * Validates that query results only contain data belonging to the requesting user
 * @param {Function} originalCallback - The original callback function
 * @param {string} userId - The expected user ID
 * @param {string} operation - The operation name for error messages
 * @returns {Function} Wrapped callback that validates ownership
 */
const createOwnershipValidatingCallback = (originalCallback, userId, operation) => {
  return (err, result) => {
    if (err) {
      return originalCallback(err);
    }

    try {
      if (result) {
        const items = Array.isArray(result) ? result : [result];
        for (const item of items) {
          if (item && typeof item === 'object' && item.user_id && item.user_id !== userId) {
            throw createDAOError(
              `${operation}: Result contains data not belonging to requesting user`,
              'CROSS_USER_DATA_DETECTED',
              { expectedUserId: userId, foundUserId: item.user_id }
            );
          }
        }
      }
      originalCallback(null, result);
    } catch (validationError) {
      originalCallback(validationError);
    }
  };
};

/**
 * Security configuration for each DAO
 */
const DAO_SECURITY_CONFIG = {
  transaction: {
    methodsRequiringUserId: [
      'getAllTransactions',
      'deleteTransaction', 
      'batchDeleteTransactions',
      'createTransaction',
      'updateTransaction',
      'getTransactionById',
      'getTransactionsByCategory',
      'getTransactionsByAccount',
      'getTransactionsByDateRange'
    ],
    methodsRequiringUserIdInOptions: []
  },
  account: {
    methodsRequiringUserId: [
      'getAllAccounts',
      'getAccountById',
      'getAccountsByUserId', 
      'updateAccount',
      'deleteAccount'
    ],
    methodsRequiringUserIdInOptions: []
  },
  category: {
    methodsRequiringUserId: [
      'getAllCategories',
      'getCategoryById',
      'getCategoriesByUserId',
      'updateCategory',
      'deleteCategory'
    ],
    methodsRequiringUserIdInOptions: []
  },
  budget: {
    methodsRequiringUserId: [
      'getAllBudgets',
      'getBudgetById',
      'getBudgetsByUserId',
      'updateBudget',
      'deleteBudget'
    ],
    methodsRequiringUserIdInOptions: []
  },
  statement: {
    methodsRequiringUserId: [
      'getAllStatements',
      'getStatementById',
      'getStatementsByUserId',
      'updateStatement',
      'deleteStatement'
    ],
    methodsRequiringUserIdInOptions: []
  }
};

/**
 * Apply security wrapper to a DAO based on its type
 * @param {Object} dao - The DAO to secure
 * @param {string} daoType - The type of DAO (transaction, account, etc.)
 * @returns {Object} Secured DAO
 */
const secureDAO = (dao, daoType) => {
  const config = DAO_SECURITY_CONFIG[daoType];
  if (!config) {
    // Log warning in development, but don't expose in production
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`No security configuration found for DAO type: ${daoType}`);
    }
    return dao;
  }

  return createSecureDAO(
    dao,
    config.methodsRequiringUserId,
    config.methodsRequiringUserIdInOptions
  );
};

module.exports = {
  createSecureDAO,
  createOwnershipValidatingCallback,
  secureDAO,
  DAO_SECURITY_CONFIG
};
