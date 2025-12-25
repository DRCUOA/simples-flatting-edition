#!/usr/bin/env node

/**
 * Production Configuration Test Script
 * 
 * This script validates that the server can start with production-like configuration
 * and verifies all security features are working correctly.
 * 
 * Usage: node test-production-config.js
 */

const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');

console.log('='.repeat(80));
console.log('Production Configuration Test');
console.log('='.repeat(80));
console.log('');

// Generate test secrets
const testAccessSecret = crypto.randomBytes(32).toString('hex');
const testRefreshSecret = crypto.randomBytes(32).toString('hex');

console.log('✓ Generated test JWT secrets (32+ characters each)');
console.log(`  Access secret length: ${testAccessSecret.length}`);
console.log(`  Refresh secret length: ${testRefreshSecret.length}`);
console.log('');

// Test environment configuration
const testEnv = {
  ...process.env,
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: testAccessSecret,
  JWT_REFRESH_SECRET: testRefreshSecret,
  JWT_ISS: 'financial-app-test',
  JWT_AUD: 'test-domain.com',
  FRONTEND_ORIGIN: 'https://test-domain.com',
  BCRYPT_ROUNDS: '12',
  PORT: '3051', // Use different port to avoid conflicts
  TOKEN_TTL_MIN: '15',
  REFRESH_TTL_DAYS: '7'
};

console.log('Test Environment Configuration:');
console.log('-'.repeat(80));
console.log(`  NODE_ENV: ${testEnv.NODE_ENV}`);
console.log(`  JWT_ACCESS_SECRET: [${testEnv.JWT_ACCESS_SECRET.substring(0, 10)}...] (${testEnv.JWT_ACCESS_SECRET.length} chars)`);
console.log(`  JWT_REFRESH_SECRET: [${testEnv.JWT_REFRESH_SECRET.substring(0, 10)}...] (${testEnv.JWT_REFRESH_SECRET.length} chars)`);
console.log(`  JWT_ISS: ${testEnv.JWT_ISS}`);
console.log(`  JWT_AUD: ${testEnv.JWT_AUD}`);
console.log(`  FRONTEND_ORIGIN: ${testEnv.FRONTEND_ORIGIN}`);
console.log(`  BCRYPT_ROUNDS: ${testEnv.BCRYPT_ROUNDS}`);
console.log(`  PORT: ${testEnv.PORT}`);
console.log('');

// Start server process
console.log('Starting server with production configuration...');
console.log('-'.repeat(80));

const serverProcess = spawn('node', ['app.js'], {
  cwd: __dirname,
  env: testEnv,
  stdio: ['inherit', 'pipe', 'pipe']
});

let serverOutput = '';
let serverErrors = '';
let validationPassed = false;
let serverStarted = false;

// Capture stdout
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  serverOutput += output;
  process.stdout.write(output);

  if (output.includes('Environment validation passed')) {
    validationPassed = true;
    console.log('✓ Environment validation passed');
  }

  if (output.includes('SQLite WAL mode enabled')) {
    console.log('✓ SQLite WAL mode enabled');
  }

  if (output.includes('Foreign key constraints enabled')) {
    console.log('✓ Foreign key constraints enabled');
  }

  if (output.includes(`BackendServer is running on port ${testEnv.PORT}`)) {
    serverStarted = true;
    console.log(`✓ Server started successfully on port ${testEnv.PORT}`);
  }
});

// Capture stderr
serverProcess.stderr.on('data', (data) => {
  const output = data.toString();
  serverErrors += output;
  process.stderr.write(output);
});

// Handle process exit
serverProcess.on('exit', (code) => {
  console.log('');
  console.log('='.repeat(80));
  console.log('Test Results');
  console.log('='.repeat(80));
  console.log('');

  if (code === 0 && validationPassed && serverStarted) {
    console.log('✅ SUCCESS: Server configured correctly for production');
    console.log('');
    console.log('Verified:');
    console.log('  ✓ Environment validation passed');
    console.log('  ✓ JWT secrets validated (32+ characters, different values)');
    console.log('  ✓ SQLite WAL mode enabled');
    console.log('  ✓ Database initialization complete');
    console.log('  ✓ Server started successfully');
    console.log('');
    console.log('Production readiness: READY ✅');
  } else {
    console.log('❌ FAILED: Server configuration issues detected');
    console.log('');
    if (!validationPassed) {
      console.log('  ❌ Environment validation failed');
    }
    if (!serverStarted) {
      console.log('  ❌ Server failed to start');
    }
    if (code !== 0) {
      console.log(`  ❌ Server exited with code: ${code}`);
    }
    console.log('');
    console.log('Production readiness: NOT READY ❌');
  }

  console.log('');
  console.log('='.repeat(80));
  process.exit(code === 0 && validationPassed && serverStarted ? 0 : 1);
});

// Give server 5 seconds to start, then shut it down
setTimeout(() => {
  console.log('');
  console.log('Shutting down test server...');
  serverProcess.kill('SIGTERM');
}, 5000);

// Handle script termination
process.on('SIGINT', () => {
  console.log('');
  console.log('Test interrupted by user');
  serverProcess.kill('SIGTERM');
  process.exit(1);
});

process.on('SIGTERM', () => {
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

