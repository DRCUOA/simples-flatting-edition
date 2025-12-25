#!/usr/bin/env node

// server/scripts/backup-db.mjs
// Database backup script for SQLite with compression

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { createGzip } from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pipelineAsync = promisify(pipeline);

// Configuration
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../database.sqlite');
const BACKUP_DIR = path.join(__dirname, '../backups');
const MAX_BACKUPS = parseInt(process.env.MAX_BACKUPS) || 30;

/**
 * Ensure backup directory exists
 */
function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }
}

/**
 * Generate timestamp for backup filename
 */
function generateTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  
  return `${year}${month}${day}_${hour}${minute}`;
}

/**
 * Create database backup using SQLite VACUUM INTO
 */
async function createSQLiteBackup(backupPath) {
  try {
    // Import sqlite3 dynamically for ES modules
    const sqlite3 = await import('sqlite3');
    const db = new sqlite3.default.Database(DB_PATH);
    
    return new Promise((resolve, reject) => {
      // Use VACUUM INTO for hot backup (SQLite 3.27.0+)
      db.run(`VACUUM INTO '${backupPath}'`, function(err) {
        if (err) {
          // Fallback to file copy if VACUUM INTO is not available
          console.warn('VACUUM INTO failed, falling back to file copy:', err.message);
          db.close();
          
          try {
            fs.copyFileSync(DB_PATH, backupPath);
            console.log(`Database backed up using file copy: ${backupPath}`);
            resolve(backupPath);
          } catch (copyErr) {
            reject(copyErr);
          }
        } else {
          console.log(`Database backed up using VACUUM INTO: ${backupPath}`);
          db.close();
          resolve(backupPath);
        }
      });
    });
  } catch (importErr) {
    // Fallback to simple file copy if sqlite3 module is not available
    console.warn('SQLite module not available, using file copy:', importErr.message);
    fs.copyFileSync(DB_PATH, backupPath);
    console.log(`Database backed up using file copy: ${backupPath}`);
    return backupPath;
  }
}

/**
 * Compress backup file using gzip
 */
async function compressBackup(backupPath) {
  const compressedPath = `${backupPath}.gz`;
  
  try {
    await pipelineAsync(
      createReadStream(backupPath),
      createGzip({ level: 6 }), // Good compression ratio
      createWriteStream(compressedPath)
    );
    
    // Remove uncompressed backup
    fs.unlinkSync(backupPath);
    
    console.log(`Backup compressed: ${compressedPath}`);
    return compressedPath;
  } catch (error) {
    console.error('Failed to compress backup:', error);
    // Return original backup path if compression fails
    return backupPath;
  }
}

/**
 * Clean up old backups to maintain maximum count
 */
function cleanupOldBackups() {
  try {
    const backupFiles = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.bak.sqlite') || file.endsWith('.bak.sqlite.gz'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        stat: fs.statSync(path.join(BACKUP_DIR, file))
      }))
      .sort((a, b) => b.stat.mtime - a.stat.mtime); // Sort by modification time (newest first)

    if (backupFiles.length > MAX_BACKUPS) {
      const filesToDelete = backupFiles.slice(MAX_BACKUPS);
      
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
        console.log(`Removed old backup: ${file.name}`);
      }
      
      console.log(`Cleaned up ${filesToDelete.length} old backups`);
    }
  } catch (error) {
    console.error('Failed to cleanup old backups:', error);
  }
}

/**
 * Get backup statistics
 */
function getBackupStats(backupPath) {
  try {
    const stats = fs.statSync(backupPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    return {
      size: stats.size,
      sizeInMB: `${sizeInMB} MB`,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (error) {
    console.error('Failed to get backup stats:', error);
    return null;
  }
}

/**
 * Main backup function
 */
async function performBackup() {
  const startTime = Date.now();
  
  try {
    console.log('Starting database backup...');
    
    // Check if database exists
    if (!fs.existsSync(DB_PATH)) {
      throw new Error(`Database file not found: ${DB_PATH}`);
    }
    
    // Ensure backup directory exists
    ensureBackupDir();
    
    // Generate backup filename
    const timestamp = generateTimestamp();
    const backupFilename = `${timestamp}.bak.sqlite`;
    const backupPath = path.join(BACKUP_DIR, backupFilename);
    
    // Create backup
    const finalBackupPath = await createSQLiteBackup(backupPath);
    
    // Compress backup
    const compressedPath = await compressBackup(finalBackupPath);
    
    // Get backup statistics
    const stats = getBackupStats(compressedPath);
    
    // Clean up old backups
    cleanupOldBackups();
    
    const duration = Date.now() - startTime;
    
    console.log('\n✅ Backup completed successfully!');
    console.log(`📁 Backup location: ${compressedPath}`);
    if (stats) {
      console.log(`📊 Backup size: ${stats.sizeInMB}`);
    }
    console.log(`⏱️  Duration: ${duration}ms`);
    
    return {
      success: true,
      backupPath: compressedPath,
      stats: stats,
      duration: duration
    };
    
  } catch (error) {
    console.error('\n❌ Backup failed:', error.message);
    
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Command line interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Database Backup Utility

Usage: node backup-db.mjs [options]

Options:
  --help, -h     Show this help message
  --stats        Show backup directory statistics
  --cleanup      Cleanup old backups only (no new backup)

Environment Variables:
  DATABASE_PATH  Path to SQLite database (default: ../database.sqlite)
  MAX_BACKUPS    Maximum number of backups to retain (default: 30)

Examples:
  node backup-db.mjs                    # Create new backup
  node backup-db.mjs --stats            # Show backup statistics
  node backup-db.mjs --cleanup          # Cleanup old backups only
`);
    process.exit(0);
  }
  
  if (args.includes('--stats')) {
    try {
      ensureBackupDir();
      const backupFiles = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.endsWith('.bak.sqlite') || file.endsWith('.bak.sqlite.gz'))
        .map(file => {
          const filePath = path.join(BACKUP_DIR, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            size: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
            created: stats.birthtime.toISOString()
          };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));
      
      console.log(`\n📊 Backup Directory Statistics:`);
      console.log(`📁 Location: ${BACKUP_DIR}`);
      console.log(`📈 Total backups: ${backupFiles.length}`);
      console.log(`📋 Recent backups:`);
      
      backupFiles.slice(0, 10).forEach((backup, index) => {
        console.log(`  ${index + 1}. ${backup.name} (${backup.size}) - ${backup.created}`);
      });
      
      if (backupFiles.length > 10) {
        console.log(`  ... and ${backupFiles.length - 10} more`);
      }
    } catch (error) {
      console.error('Failed to get backup statistics:', error);
      process.exit(1);
    }
    process.exit(0);
  }
  
  if (args.includes('--cleanup')) {
    console.log('Cleaning up old backups...');
    cleanupOldBackups();
    console.log('Cleanup completed.');
    process.exit(0);
  }
  
  // Perform backup
  const result = await performBackup();
  process.exit(result.success ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
}

export { performBackup, cleanupOldBackups, getBackupStats };
