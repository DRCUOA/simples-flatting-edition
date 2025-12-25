// server/middleware/logging.js

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Request ID middleware - assigns unique ID to each request
 */
const requestId = (req, res, next) => {
  const reqId = uuidv4();
  req.requestId = reqId;
  res.setHeader('X-Request-ID', reqId);
  next();
};

/**
 * Enhanced request logging middleware with security considerations
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const { getCurrentTimestamp } = require('../utils/dateUtils');
  const timestamp = getCurrentTimestamp();
  
  // Capture original response methods for logging response data
  const originalSend = res.send;
  const originalJson = res.json;
  
  let responseBody = null;
  let responseSize = 0;
  
  // Override response methods to capture data
  res.send = function(data) {
    responseSize = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data || '', 'utf8');
    // Don't log response body in production for security
    if (process.env.NODE_ENV !== 'production') {
      try {
        responseBody = typeof data === 'string' ? JSON.parse(data) : data;
      } catch (e) {
        responseBody = data;
      }
    }
    return originalSend.apply(this, arguments);
  };
  
  res.json = function(data) {
    responseSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
    // Don't log response body in production for security
    if (process.env.NODE_ENV !== 'production') {
      responseBody = data;
    }
    return originalJson.apply(this, arguments);
  };
  
  // Log request completion
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Sanitize sensitive information
    const sanitizedHeaders = { ...req.headers };
    delete sanitizedHeaders.authorization;
    delete sanitizedHeaders.cookie;
    delete sanitizedHeaders['x-api-key'];
    
    // Sanitize request body
    const sanitizedBody = sanitizeRequestBody(req.body);
    
    const logEntry = {
      timestamp,
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.user_id,
      statusCode: res.statusCode,
      duration: duration,
      responseSize: responseSize,
      headers: process.env.NODE_ENV !== 'production' ? sanitizedHeaders : undefined,
      body: process.env.NODE_ENV !== 'production' ? sanitizedBody : undefined,
      response: process.env.NODE_ENV !== 'production' ? sanitizeResponseBody(responseBody) : undefined
    };
    
    // Write to appropriate log file based on status code
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    const { getToday } = require('../utils/dateUtils');
    const logFile = path.join(logsDir, `${logLevel}-${getToday()}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';
    
    fs.appendFile(logFile, logLine, (err) => {
      if (err) {
        console.error('Failed to write to request log:', err);
      }
    });
    
    // Log errors only to console
    if (process.env.NODE_ENV !== 'production' && res.statusCode >= 400) {
      console.error(
        `${req.method} ${req.url} ${res.statusCode} - ${duration}ms - ${req.requestId}${
          req.user?.user_id ? ` - User: ${req.user.user_id}` : ''
        }`
      );
    }
  });
  
  next();
};

/**
 * Sanitize request body to remove sensitive information
 */
const sanitizeRequestBody = (body) => {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'confirmPassword',
    'oldPassword',
    'newPassword',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'secret',
    'authorization'
  ];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

/**
 * Sanitize response body to remove sensitive information
 */
const sanitizeResponseBody = (body) => {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  const sanitized = { ...body };
  const sensitiveFields = [
    'password_hash',
    'accessToken',
    'refreshToken',
    'token',
    'apiKey',
    'secret'
  ];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

/**
 * Performance monitoring middleware
 */
const performanceMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log slow requests
    const slowRequestThreshold = parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS) || 1000;
    if (duration > slowRequestThreshold) {
      const { getCurrentTimestamp } = require('../utils/dateUtils');
      const logEntry = {
        timestamp: getCurrentTimestamp(),
        type: 'SLOW_REQUEST',
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        duration: duration,
        userId: req.user?.user_id,
        threshold: slowRequestThreshold
      };
      
      const { getToday } = require('../utils/dateUtils');
      const logFile = path.join(logsDir, `performance-${getToday()}.log`);
      fs.appendFile(logFile, JSON.stringify(logEntry) + '\n', (err) => {
        if (err) {
          console.error('Failed to write to performance log:', err);
        }
      });
      
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Slow request detected: ${req.method} ${req.url} - ${duration.toFixed(2)}ms`);
      }
    }
  });
  
  next();
};

/**
 * Security event logger
 */
const securityLogger = (eventType, details, req = null) => {
  const { getCurrentTimestamp } = require('../utils/dateUtils');
  const logEntry = {
    timestamp: getCurrentTimestamp(),
    type: 'SECURITY_EVENT',
    eventType: eventType,
    details: details,
    request: req ? {
      requestId: req.requestId,
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.user_id
    } : null
  };
  
  const { getToday } = require('../utils/dateUtils');
  const logFile = path.join(logsDir, `security-${getToday()}.log`);
  fs.appendFile(logFile, JSON.stringify(logEntry) + '\n', (err) => {
    if (err) {
      console.error('Failed to write to security log:', err);
    }
  });
  
  // Also log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Security event:', logEntry);
  }
};

/**
 * Health check endpoint
 */
const healthCheck = (req, res) => {
  const { getCurrentTimestamp } = require('../utils/dateUtils');
  const healthData = {
    status: 'healthy',
    timestamp: getCurrentTimestamp(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    environment: process.env.NODE_ENV || 'development'
  };
  
  // Don't expose sensitive environment info in production
  if (process.env.NODE_ENV === 'production') {
    delete healthData.memory;
  }
  
  res.json(healthData);
};

module.exports = {
  requestId,
  requestLogger,
  performanceMonitor,
  securityLogger,
  healthCheck,
  sanitizeRequestBody,
  sanitizeResponseBody
};
