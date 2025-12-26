// Load environment variables first
// Load .env from root directory (project root, not server directory)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// ============================================================================
// CRITICAL: Environment Variable Validation (Security & Stability)
// ============================================================================
// Use centralized environment configuration module
const { validateEnvironment: validateEnv } = require('./config/environment');

// Run validation before loading any modules that depend on environment variables
const validationResult = validateEnv();

// Handle validation errors (centralized module handles display)
if (validationResult.errors.length > 0) {
  process.exit(1);
}

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
const { sanitizeInput } = require('./middleware/validation');
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

// Input sanitization - sanitize all request body, params, and query strings
app.use(sanitizeInput);

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
          // Only warn in development - in production, rely on database connection errors
          if (process.env.NODE_ENV !== 'production') {
            console.warn('⚠️  Database initialization check failed, proceeding with server start');
          }
          break;
        }
      }
    }
  } catch (error) {
    // Fallback: proceed even if initialization check fails
    // Only warn in development - in production, rely on database connection errors
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  Could not verify database initialization, proceeding:', error.message);
    }
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

// Graceful shutdown handler
let isShuttingDown = false;

function gracefulShutdown(signal) {
  if (isShuttingDown) {
    return; // Already shutting down
  }
  
  isShuttingDown = true;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
    console.log(`\n${signal} received, starting graceful shutdown...`);
  }
  
  // Stop accepting new connections
  server.close(async () => {
    if (!isProduction) {
      console.log('HTTP server closed');
    }
    
    // Close database connection and wait for it to complete
    try {
      await closeConnection();
      if (!isProduction) {
        console.log('Database connection closed');
        console.log('Graceful shutdown complete');
      }
      process.exit(0);
    } catch (error) {
      // Log error but still exit - database may be in inconsistent state
      if (!isProduction) {
        console.error('Error during database close:', error.message);
      }
      process.exit(1);
    }
  });
  
  // Force shutdown after 10 seconds if graceful shutdown doesn't complete
  setTimeout(() => {
    if (!isProduction) {
      console.error('Forced shutdown after timeout');
    }
    process.exit(1);
  }, 10000);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

module.exports = app;
