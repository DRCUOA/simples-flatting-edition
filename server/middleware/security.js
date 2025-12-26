// server/middleware/security.js

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// Enhanced rate limiting configurations with environment support
const createRateLimit = (windowMs, max, message, options = {}) => {
  return rateLimit({
    windowMs: windowMs,
    max: max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000),
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // Return rate limit info in RateLimit-* headers
    legacyHeaders: false, // Disable X-RateLimit-* headers
    // Enhanced rate limit headers
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000),
        limit: max,
        windowMs: windowMs
      });
    },
    // Skip rate limiting in development for most requests
    skip: (req, res) => {
      // Default to development if NODE_ENV is not set
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const isSuccessful = res.statusCode < 400;
      const isAuthRequest = req.path.includes('/auth/') || req.path.includes('/refresh');
      
      // In development:
      // - Skip all successful requests unless enforceInDev is true
      // - Skip auth failures to prevent rate limit loops
      // - Only enforce rate limits on auth endpoints if explicitly requested
      if (isDevelopment) {
        if (options.enforceInDev && isAuthRequest) {
          return false; // Enforce auth rate limits in dev
        }
        return true; // Skip all other rate limiting in development
      }
      
      return false; // Always enforce in production
    },
    // Remove custom keyGenerator to use default IP handling
    // This allows express-rate-limit to handle IPv6 properly
    ...options
  });
};

// Environment-based rate limiting configuration
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MIN) || 15;
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (process.env.NODE_ENV === 'development' ? 1000 : 100);
const AUTH_RATE_LIMIT_MAX = parseInt(process.env.AUTH_RATE_LIMIT_MAX) || (process.env.NODE_ENV === 'development' ? 50 : 15);

// General API rate limiting
const apiLimiter = createRateLimit(
  RATE_LIMIT_WINDOW * 60 * 1000, // Default: 15 minutes
  RATE_LIMIT_MAX, // Default: 100 requests per window
  'Too many requests from this IP, please try again later.'
);

// Auth endpoints rate limiting (more restrictive)
const authLimiter = createRateLimit(
  RATE_LIMIT_WINDOW * 60 * 1000, // Default: 15 minutes
  AUTH_RATE_LIMIT_MAX, // Default: 50 in dev, 5 in prod auth requests per window
  'Too many authentication attempts, please try again later.'
  // Removed enforceInDev: true to allow more lenient dev behavior
);

// File upload rate limiting (very restrictive)
const uploadLimiter = createRateLimit(
  60 * 1000, // 1 minute window
  process.env.NODE_ENV === 'development' ? 50 : 5, // 50 in dev, 5 in prod uploads per minute
  'Too many file uploads, please try again later.'
  // Removed enforceInDev: true to allow more lenient dev behavior
);

// Export endpoints rate limiting
const exportLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour window
  process.env.NODE_ENV === 'development' ? 100 : 10, // 100 in dev, 10 in prod exports per hour
  'Too many export requests, please try again later.'
  // Removed enforceInDev: true to allow more lenient dev behavior
);

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
});

// Enhanced CORS configuration with environment-based security
const corsOptions = {
  origin: function (origin, callback) {
    // Default to development if NODE_ENV is not set
    const isProduction = process.env.NODE_ENV === 'production';
    
    // In development, allow requests with no origin (like mobile apps or curl requests)
    if (!origin && !isProduction) {
      return callback(null, true);
    }

    // Production: strictly enforce FRONTEND_ORIGIN
    // Support both FRONTEND_URL (new standard) and FRONTEND_ORIGIN (backward compatibility)
    const frontendOrigin = process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:8085';
    
    const allowedOrigins = isProduction 
      ? [frontendOrigin] // Production: only allow configured frontend
      : [
          frontendOrigin,
          'http://localhost:3004',
          'http://localhost:3050',
          'http://localhost:4173', // Vite preview server
          'http://localhost:8080',
          'http://localhost:8085',
          'http://localhost:5173', // Vite dev server
          'http://localhost:5177',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3004',
          'http://127.0.0.1:3050',
          'http://127.0.0.1:4173', // Vite preview server
          'http://127.0.0.1:8080',
          'http://127.0.0.1:8085',
          'http://127.0.0.1:5173', // Vite dev server
          'http://127.0.0.1:5177'
        ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      const error = new Error('Not allowed by CORS');
      error.status = 403;
      callback(error);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-Request-ID',
    'Cache-Control'
  ],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours for preflight cache
  optionsSuccessStatus: 200
};

// Request sanitization middleware
const sanitizeHeaders = (req, res, next) => {
  // Remove potentially dangerous headers
  const dangerousHeaders = [
    'x-powered-by',
    'server',
    'x-aspnet-version',
    'x-debug-token',
    'x-debug-token-link'
  ];

  dangerousHeaders.forEach(header => {
    res.removeHeader(header);
  });

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Only add HSTS in production over HTTPS
  if (process.env.NODE_ENV === 'production' && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

// Request logging middleware for security monitoring
const securityLogger = (req, res, next) => {
  const { getCurrentTimestamp } = require('../utils/dateUtils');
  const timestamp = getCurrentTimestamp();
  const logEntry = {
    timestamp,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referer: req.get('Referer')
  };

  // Log suspicious activity
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /eval\(/i,  // Code injection
    /base64/i  // Potential encoded attacks
  ];

  const requestString = JSON.stringify(logEntry).toLowerCase();
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestString));

  if (isSuspicious) {
    // Use security logger for proper logging
    const { securityLogger } = require('./logging');
    securityLogger('SUSPICIOUS_REQUEST', logEntry, req);
  }

  next();
};

module.exports = {
  // Rate limiters
  apiLimiter,
  authLimiter,
  uploadLimiter,
  exportLimiter,
  
  // Security middleware
  securityHeaders,
  corsOptions,
  sanitizeHeaders,
  securityLogger,
  
  // Utility functions
  createRateLimit
};
