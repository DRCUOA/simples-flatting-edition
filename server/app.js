// Load environment variables first
// Load .env from root directory (project root, not server directory)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ============================================================================
// CRITICAL: Environment Variable Validation (Security & Stability)
// ============================================================================
// Validate required environment variables before starting the application
// This prevents insecure deployments and provides clear error messages

const REQUIRED_ENV_VARS = {
  JWT_ACCESS_SECRET: { 
    minLength: 32, 
    description: 'JWT access token secret (min 32 chars)' 
  },
  JWT_REFRESH_SECRET: { 
    minLength: 32, 
    description: 'JWT refresh token secret (min 32 chars)' 
  },
  FRONTEND_ORIGIN: { 
    pattern: /^https?:\/\/.+/,
    description: 'Frontend origin URL (e.g., http://localhost:5173 or https://app.example.com)' 
  }
};

const PRODUCTION_REQUIRED_ENV_VARS = {
  BCRYPT_ROUNDS: { 
    min: 12, 
    max: 15, 
    description: 'Bcrypt hashing rounds (12-15 recommended)' 
  }
};

const RECOMMENDED_ENV_VARS = {
  JWT_ISS: { description: 'JWT issuer (application identifier)' },
  JWT_AUD: { description: 'JWT audience (token recipients)' },
  TOKEN_TTL_MIN: { description: 'Access token TTL in minutes' },
  REFRESH_TTL_DAYS: { description: 'Refresh token TTL in days' },
  BCRYPT_ROUNDS: { 
    min: 10, 
    max: 15,
    recommended: 12,
    description: 'Bcrypt hashing rounds (10-15, recommended: 12+)' 
  }
};

function validateEnvironment() {
  const errors = [];
  const warnings = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // Check required environment variables
  for (const [key, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[key];
    
    if (!value) {
      errors.push(`❌ ${key} is required - ${config.description}`);
      continue;
    }
    
    if (config.minLength && value.length < config.minLength) {
      errors.push(`❌ ${key} must be at least ${config.minLength} characters`);
    }
    
    if (config.pattern && !config.pattern.test(value)) {
      errors.push(`❌ ${key} format is invalid - ${config.description}`);
    }
  }

  // Production-specific validation
  if (isProduction) {
    for (const [key, config] of Object.entries(PRODUCTION_REQUIRED_ENV_VARS)) {
      const value = process.env[key];
      
      if (value) {
        const numValue = parseInt(value, 10);
        if (config.min && numValue < config.min) {
          errors.push(`❌ ${key} must be at least ${config.min} in production`);
        }
        if (config.max && numValue > config.max) {
          errors.push(`❌ ${key} must not exceed ${config.max}`);
        }
      } else if (config.min) {
        warnings.push(`⚠️  ${key} not set - ${config.description}`);
      }
    }

    // Validate HTTPS in production
    const frontendOrigin = process.env.FRONTEND_ORIGIN || '';
    if (frontendOrigin && !frontendOrigin.startsWith('https://')) {
      warnings.push(`⚠️  FRONTEND_ORIGIN should use HTTPS in production (current: ${frontendOrigin})`);
    }

    // Validate JWT secrets are different
    if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
      errors.push(`❌ JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values`);
    }

    // Check for default/weak secrets
    const defaultSecretPattern = /secret|password|changeme|default|example/i;
    if (defaultSecretPattern.test(process.env.JWT_ACCESS_SECRET || '')) {
      warnings.push(`⚠️  JWT_ACCESS_SECRET appears to contain common words - use a cryptographically random value`);
    }
    if (defaultSecretPattern.test(process.env.JWT_REFRESH_SECRET || '')) {
      warnings.push(`⚠️  JWT_REFRESH_SECRET appears to contain common words - use a cryptographically random value`);
    }
  }

  // Check recommended variables
  for (const [key, config] of Object.entries(RECOMMENDED_ENV_VARS)) {
    const value = process.env[key];
    if (!value) {
      if (key === 'BCRYPT_ROUNDS') {
        warnings.push(`⚠️  ${key} not set - ${config.description} (using default: 12)`);
      } else {
        warnings.push(`⚠️  ${key} not set - ${config.description} (using default)`);
      }
    } else if (config.min || config.max) {
      // Validate numeric range for BCRYPT_ROUNDS
      const numValue = parseInt(value, 10);
      if (isNaN(numValue)) {
        errors.push(`❌ ${key} must be a number`);
      } else {
        if (config.min && numValue < config.min) {
          warnings.push(`⚠️  ${key} is ${numValue} (min recommended: ${config.min})`);
        }
        if (config.max && numValue > config.max) {
          warnings.push(`⚠️  ${key} is ${numValue} (max recommended: ${config.max}) - may cause slow performance`);
        }
        if (config.recommended && numValue < config.recommended && !isProduction) {
          warnings.push(`⚠️  ${key} is ${numValue} (OWASP 2025 recommends: ${config.recommended}+)`);
        }
      }
    }
  }

  // Display results
  if (errors.length > 0) {
    console.error('\n' + '='.repeat(80));
    console.error('🚨 ENVIRONMENT VALIDATION FAILED - Cannot start server');
    console.error('='.repeat(80));
    console.error('\nCritical Issues:\n');
    errors.forEach(err => console.error(`  ${err}`));
    
    console.error('\n' + '-'.repeat(80));
    console.error('💡 Quick Fix - Generate secure secrets:\n');
    console.error('  node -e "console.log(\'JWT_ACCESS_SECRET=\' + require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.error('  node -e "console.log(\'JWT_REFRESH_SECRET=\' + require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.error('\n  Add these to your .env file in the server directory');
    console.error('='.repeat(80) + '\n');
    
    process.exit(1);
  }

  // Display warnings (non-fatal)
  if (warnings.length > 0 && isProduction) {
    console.warn('\n' + '='.repeat(80));
    console.warn('⚠️  ENVIRONMENT WARNINGS (Production)');
    console.warn('='.repeat(80));
    warnings.forEach(warn => console.warn(`  ${warn}`));
    console.warn('='.repeat(80) + '\n');
  }

  // Success message
  console.log('✓ Environment validation passed');
  if (!isProduction) {
    console.log('  Environment: Development');
  } else {
    console.log('  Environment: Production (enhanced security checks enabled)');
  }
}

// Run validation before loading any modules that depend on environment variables
validateEnvironment();

// ============================================================================
// Application Setup
// ============================================================================

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mainRouter = require('./routes/main-router');
const authRouter = require('./routes/auth-router');
const exportRouter = require('./routes/export-router');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const {
  securityHeaders,
  corsOptions,
  sanitizeHeaders,
  apiLimiter
} = require('./middleware/security');
const { 
  requestId, 
  requestLogger, 
  performanceMonitor, 
  healthCheck 
} = require('./middleware/logging');
const { enforceUserIsolation } = require('./middleware/auth');

const app = express();
const BASE_PORT = Number(process.env.PORT) || 3050;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Core middleware (applied first)
app.use(requestId);
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(sanitizeHeaders);

// Cookie parsing for refresh tokens
app.use(cookieParser());

// Body parsing middleware with security limits
app.use(express.json({ 
  limit: '1mb', // Reduced limit for security
  type: ['application/json', 'application/json; charset=utf-8']
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '1mb',
  parameterLimit: 100 // Limit number of parameters
}));

// Logging and monitoring middleware
app.use(requestLogger);
app.use(performanceMonitor);

// General rate limiting
app.use('/api', apiLimiter);

// User isolation enforcement for authenticated routes
app.use('/api', enforceUserIsolation);

// Health check endpoint (no auth required)
app.get('/healthz', healthCheck);

// Root path redirect to /api
app.get('/', (req, res) => {
  res.redirect('/api');
});

// Authentication routes (no additional auth required)
app.use('/api/auth', authRouter);

// Export routes (auth required)
app.use('/api/export', exportRouter);

// Main API routes
app.use('/api', mainRouter);

// 404 handler (must be before error handler)
app.use(notFound);

// Global error handling middleware (must be last)
app.use(errorHandler);

// Parse CORS origins from environment variable
// Support both FRONTEND_URL (new standard) and FRONTEND_ORIGIN (backward compatibility)
const frontendUrl = process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:8085';
const corsOrigins = frontendUrl.split(',').map(url => url.trim());

// Import database and footer utilities
const { getConnection, closeConnection, waitForInitialization } = require('./db/index');
const { printFooter } = require('../utils/footer');

// Start server with automatic port fallback if in use
// Wait for database initialization before starting server
async function startServer(portToTry, maxRetries = 5) {
  // Initialize database connection and wait for initialization to complete
  // This ensures all database logging appears before the footer
  try {
    // Trigger database connection (starts async initialization)
    getConnection();
    
    // Wait for initialization promise to be created and complete
    // Retry logic handles async timing of promise creation
    let retries = 10;
    while (retries > 0) {
      try {
        await waitForInitialization();
        break; // Success - initialization complete
      } catch (error) {
        if (error.message === 'Database not initialized' && retries > 1) {
          // Initialization promise not created yet, wait and retry
          await new Promise(resolve => setTimeout(resolve, 100));
          retries--;
        } else {
          // Other error or max retries - proceed anyway
          console.warn('⚠️  Database initialization check failed, proceeding with server start');
          break;
        }
      }
    }
  } catch (error) {
    // Fallback: proceed even if initialization check fails
    console.warn('⚠️  Could not verify database initialization, proceeding:', error.message);
  }

  const server = app.listen(portToTry, () => {
    // Determine frontend status for footer
    const frontendStatus = process.env.DEV_FULL === 'true' ? 'active' : 'INACTIVE';
    
    // Print footer as last output (after database initialization logging)
    printFooter({ 
      backendStatus: 'active', 
      frontendStatus 
    });
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && maxRetries > 0) {
      const nextPort = portToTry + 1;
      setTimeout(() => startServer(nextPort, maxRetries - 1), 200);
    } else {
      process.exit(1);
    }
  });

  return server;
}

const server = startServer(BASE_PORT);

// Graceful shutdown
process.on('SIGTERM', () => {
  closeConnection();
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;
