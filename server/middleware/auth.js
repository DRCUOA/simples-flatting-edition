// server/middleware/auth.js

const jwt = require('jsonwebtoken');
const userDAO = require('../models/user_dao');
const { v4: uuidv4 } = require('uuid');

// JWT Configuration - SECURITY: No default secrets allowed
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_ISS = process.env.JWT_ISS || 'financial-app';
const JWT_AUD = process.env.JWT_AUD || 'financial-app-users';
const TOKEN_TTL_MIN = parseInt(process.env.TOKEN_TTL_MIN) || 60;
const REFRESH_TTL_DAYS = parseInt(process.env.REFRESH_TTL_DAYS) || 7;
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'refresh_token';

// Validate JWT secrets at module load time (fail-fast for security)
if (!JWT_ACCESS_SECRET || JWT_ACCESS_SECRET.length < 32) {
  throw new Error(
    'SECURITY CRITICAL: JWT_ACCESS_SECRET environment variable must be set and at least 32 characters long. ' +
    'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 32) {
  throw new Error(
    'SECURITY CRITICAL: JWT_REFRESH_SECRET environment variable must be set and at least 32 characters long. ' +
    'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

if (JWT_ACCESS_SECRET === JWT_REFRESH_SECRET) {
  throw new Error(
    'SECURITY CRITICAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values. ' +
    'Using the same secret for both tokens compromises security.'
  );
}

// Warn if using default issuer/audience in production
if (process.env.NODE_ENV === 'production') {
  if (JWT_ISS === 'financial-app' || JWT_AUD === 'financial-app-users') {
    console.warn(
      'WARNING: Using default JWT_ISS or JWT_AUD in production. ' +
      'Set these environment variables to unique values for your application.'
    );
  }
}

// Legacy support
const JWT_SECRET = JWT_ACCESS_SECRET;

// Token generation utilities
const generateAccessToken = (user) => {
  const payload = {
    sub: user.user_id,
    role: user.role || 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (TOKEN_TTL_MIN * 60),
    iss: JWT_ISS,
    aud: JWT_AUD
  };
  return jwt.sign(payload, JWT_ACCESS_SECRET);
};

const generateRefreshToken = (user) => {
  const payload = {
    sub: user.user_id,
    role: user.role || 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (REFRESH_TTL_DAYS * 24 * 60 * 60),
    iss: JWT_ISS,
    aud: JWT_AUD,
    jti: uuidv4() // JWT ID for tracking/revocation
  };
  return jwt.sign(payload, JWT_REFRESH_SECRET);
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_ACCESS_SECRET, {
    issuer: JWT_ISS,
    audience: JWT_AUD
  });
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET, {
    issuer: JWT_ISS,
    audience: JWT_AUD
  });
};

// Enhanced authentication middleware with better error handling
const requireUser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      code: 'TOKEN_MISSING'
    });
  }

  try {
    const decoded = verifyAccessToken(token);
    
    // Ensure user object has required fields for user context
    if (!decoded.sub) {
      return res.status(403).json({ 
        error: 'Invalid token: missing user context',
        code: 'INVALID_TOKEN_STRUCTURE'
      });
    }
    
    // Set user context for downstream middleware/controllers
    req.user = {
      id: decoded.sub,
      user_id: decoded.sub, // Keep compatibility with existing code
      role: decoded.role || 'user'
    };
    
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Access token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        error: 'Invalid access token',
        code: 'TOKEN_INVALID'
      });
    } else {
      return res.status(403).json({ 
        error: 'Token verification failed',
        code: 'TOKEN_VERIFICATION_FAILED'
      });
    }
  }
};

// Legacy alias for backwards compatibility
const authenticateToken = requireUser;

// Enhanced role-based authorization middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!req.user.user_id) {
      return res.status(403).json({ 
        error: 'Invalid user context',
        code: 'INVALID_USER_CONTEXT'
      });
    }

    const userRole = req.user.role || 'user'; // Default to 'user' if no role specified
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: userRole
      });
    }

    next();
  };
};

// Legacy alias for backwards compatibility
const authorizeRoles = requireRole;

// Optional authentication (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
      next();
    });
  } else {
    next();
  }
};

// Enhanced middleware to ensure user can only access their own resources
const requireSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const requestingUserId = req.user.user_id;
  const targetUserId = req.params.userId || req.body.user_id || req.query.user_id;
  const userRole = req.user.role || 'user';

  // Allow if user is admin or accessing their own resources
  if (userRole === 'admin' || requestingUserId === targetUserId) {
    return next();
  }

  return res.status(403).json({ 
    error: 'Access denied: Cannot access other user resources',
    code: 'CROSS_USER_ACCESS_DENIED'
  });
};

// Global middleware to prevent cross-user resource access
const enforceUserIsolation = (req, res, next) => {
  if (!req.user) {
    return next(); // Let other auth middleware handle this
  }

  const userId = req.user.user_id;
  const userRole = req.user.role || 'user';

  // Skip validation for admin users
  if (userRole === 'admin') {
    return next();
  }

  // Check for user_id in URL params that doesn't match authenticated user
  if (req.params.userId && req.params.userId !== userId) {
    return res.status(403).json({
      error: 'Access denied: Cannot access other user resources',
      code: 'CROSS_USER_ACCESS_DENIED'
    });
  }

  // Check for user_id in request body that doesn't match authenticated user
  if (req.body && req.body.user_id && req.body.user_id !== userId) {
    return res.status(403).json({
      error: 'Access denied: Cannot modify other user resources',
      code: 'CROSS_USER_MODIFICATION_DENIED'
    });
  }

  // Check for user_id in query params that doesn't match authenticated user
  if (req.query && req.query.user_id && req.query.user_id !== userId) {
    return res.status(403).json({
      error: 'Access denied: Cannot query other user resources',
      code: 'CROSS_USER_QUERY_DENIED'
    });
  }

  next();
};

module.exports = {
  // Token utilities
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  
  // Authentication middleware
  requireUser,
  authenticateToken, // Legacy alias
  
  // Authorization middleware
  requireRole,
  authorizeRoles, // Legacy alias
  requireSelfOrAdmin,
  enforceUserIsolation,
  optionalAuth,
  
  // Configuration constants
  JWT_SECRET, // Legacy support
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ISS,
  JWT_AUD,
  TOKEN_TTL_MIN,
  REFRESH_TTL_DAYS,
  REFRESH_COOKIE_NAME
};
