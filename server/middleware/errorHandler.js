// server/middleware/errorHandler.js

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Enhanced error logging function with security and correlation
const logError = (error, req = null, correlationId = null) => {
  const { getCurrentTimestamp } = require('../utils/dateUtils');
  const timestamp = getCurrentTimestamp();
  
  // Sanitize sensitive information
  const sanitizedError = {
    message: error.message,
    name: error.name,
    code: error.code,
    statusCode: error.statusCode,
    isOperational: error.isOperational
  };
  
  // Only include stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    sanitizedError.stack = error.stack;
  }
  
  const logEntry = {
    timestamp,
    correlationId: correlationId || uuidv4(),
    level: error.statusCode >= 500 ? 'error' : 'warn',
    error: sanitizedError,
    request: req ? {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.user_id, // Include user context if available
      requestId: req.requestId
    } : null
  };

  const { getToday } = require('../utils/dateUtils');
  const logFile = path.join(logsDir, `error-${getToday()}.log`);
  const logLine = JSON.stringify(logEntry) + '\n';

  fs.appendFile(logFile, logLine, (err) => {
    if (err) {
      console.error('Failed to write to error log:', err);
    }
  });

  // Also log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error logged:', {
      correlationId: logEntry.correlationId,
      message: error.message,
      stack: error.stack,
      url: req ? req.url : 'N/A',
      userId: req?.user?.user_id
    });
  }
  
  return logEntry.correlationId;
};

// Custom error class for API errors
class APIError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = 'APIError';

    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Enhanced global error handler middleware with security
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Generate correlation ID for tracking
  const correlationId = logError(err, req);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new APIError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new APIError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new APIError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new APIError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new APIError(message, 401);
  }

  // SQLite constraint errors
  if (err.code && typeof err.code === 'string' && err.code.startsWith('SQLITE_CONSTRAINT')) {
    let message = 'Database constraint violation';
    if (err.message && err.message.includes('UNIQUE')) {
      message = 'Unique constraint violation';
    }
    error = new APIError(message, 400);
  }

  // Security-related errors
  if (err.code === 'EBADCSRFTOKEN') {
    error = new APIError('Invalid CSRF token', 403);
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new APIError('File too large', 413);
  }

  // DAO security errors
  if (err.code === 'DAO_SECURITY_ERROR' || err.code === 'USER_ISOLATION_ERROR') {
    error = new APIError(err.message || 'Access denied', 403);
  }

  // Determine if this is a production-safe error message
  const isProductionSafe = error.isOperational || 
    error.statusCode < 500 || 
    ['CastError', 'ValidationError', 'JsonWebTokenError', 'TokenExpiredError'].includes(err.name);

  // Build error response
  const errorResponse = {
    success: false,
    error: isProductionSafe ? (error.message || 'Client Error') : 'Internal Server Error',
    code: error.code || 'UNKNOWN_ERROR',
    correlationId: correlationId
  };

  // Add additional details in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.details = {
      originalMessage: err.message,
      stack: err.stack,
      name: err.name
    };
  }

  // Security: Don't expose internal errors in production
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    errorResponse.error = 'Internal Server Error';
  }

  res.status(statusCode).json(errorResponse);
};

// 404 handler
const notFound = (req, res, next) => {
  const error = new APIError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

module.exports = {
  APIError,
  asyncHandler,
  errorHandler,
  notFound,
  logError
};
