// server/middleware/validation.js

const validator = require('validator');

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize string inputs
  const sanitizeString = (str) => {
    if (typeof str === 'string') {
      return validator.escape(str.trim());
    }
    return str;
  };

  // Sanitize email
  const sanitizeEmail = (email) => {
    if (typeof email === 'string') {
      return validator.normalizeEmail(email, { gmail_remove_dots: false });
    }
    return email;
  };

  // Recursively sanitize object properties
  const sanitizeObject = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (key.toLowerCase().includes('email')) {
            obj[key] = sanitizeEmail(obj[key]);
          } else if (typeof obj[key] === 'string') {
            obj[key] = sanitizeString(obj[key]);
          } else if (typeof obj[key] === 'object') {
            sanitizeObject(obj[key]);
          }
        }
      }
    }
  };

  // Sanitize request body, params, and query
  if (req.body) sanitizeObject(req.body);
  if (req.params) sanitizeObject(req.params);
  if (req.query) sanitizeObject(req.query);

  next();
};

// User creation validation
const validateUserCreation = (req, res, next) => {
  const { username, email, password } = req.body;
  const errors = [];

  // Username validation
  if (!username || typeof username !== 'string') {
    errors.push('Username is required and must be a string');
  } else if (username.length < 3 || username.length > 50) {
    errors.push('Username must be between 3 and 50 characters');
  } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }

  // Email validation
  if (!email || typeof email !== 'string') {
    errors.push('Email is required and must be a string');
  } else if (!validator.isEmail(email)) {
    errors.push('Please provide a valid email address');
  }

  // Password validation
  if (!password || typeof password !== 'string') {
    errors.push('Password is required and must be a string');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one lowercase letter, one uppercase letter, and one number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// User login validation
const validateUserLogin = (req, res, next) => {
  const { username, password } = req.body;
  const errors = [];

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    errors.push('Username is required');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// User update validation
const validateUserUpdate = (req, res, next) => {
  const { username, email, password } = req.body;
  const errors = [];

  // At least one field must be provided
  if (!username && !email && !password) {
    errors.push('At least one field (username, email, or password) must be provided');
  }

  // Username validation (if provided)
  if (username !== undefined) {
    if (typeof username !== 'string') {
      errors.push('Username must be a string');
    } else if (username.length < 3 || username.length > 50) {
      errors.push('Username must be between 3 and 50 characters');
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }
  }

  // Email validation (if provided)
  if (email !== undefined) {
    if (typeof email !== 'string') {
      errors.push('Email must be a string');
    } else if (!validator.isEmail(email)) {
      errors.push('Please provide a valid email address');
    }
  }

  // Password validation (if provided)
  if (password !== undefined) {
    if (typeof password !== 'string') {
      errors.push('Password must be a string');
    } else if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one lowercase letter, one uppercase letter, and one number');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// UUID validation for user IDs
const validateUUID = (req, res, next) => {
  const { userId } = req.params;

  if (userId && !validator.isUUID(userId)) {
    return res.status(400).json({
      error: 'Invalid user ID format'
    });
  }

  next();
};

module.exports = {
  sanitizeInput,
  validateUserCreation,
  validateUserLogin,
  validateUserUpdate,
  validateUUID
};
