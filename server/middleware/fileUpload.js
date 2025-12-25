// server/middleware/fileUpload.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Configuration from environment
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB) || 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'text/plain', // Some systems report CSV as text/plain
  'application/x-ofx',
  'application/ofx',
  'text/xml', // OFX files may be reported as XML
  'application/xml',
  'application/octet-stream' // Some browsers send this for CSV/OFX files
];

// Create uploads directory if it doesn't exist
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Secure file storage configuration
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Generate cryptographically secure random filename
    const randomName = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Validate extension
    if (ext !== '.csv' && ext !== '.ofx') {
      return cb(new Error('Only CSV or OFX files are allowed'));
    }
    
    cb(null, `${timestamp}-${randomName}${ext}`);
  }
});

/**
 * File filter for security validation
 */
const fileFilter = (req, file, cb) => {
  // Check file extension first (more reliable than MIME type)
  const ext = path.extname(file.originalname).toLowerCase();
  const isValidExtension = ext === '.csv' || ext === '.ofx';
  
  if (!isValidExtension) {
    const error = new Error('Invalid file extension. Only .csv or .ofx files are allowed.');
    error.code = 'INVALID_FILE_EXTENSION';
    error.status = 415;
    return cb(error);
  }
  
  // Check MIME type, but be lenient - browsers report CSV files inconsistently
  const mimetype = (file.mimetype || '').toLowerCase();
  const isAllowedMimeType = ALLOWED_MIME_TYPES.includes(mimetype);
  const isEmptyMimeType = !mimetype || mimetype === '';
  
  // Allow if: valid extension AND (allowed MIME type OR empty MIME type)
  // Reject only if MIME type is explicitly wrong (not empty and not in allowed list)
  if (!isEmptyMimeType && !isAllowedMimeType) {
    // For CSV/OFX files, be more lenient - only reject obviously wrong types
    const obviouslyWrongTypes = [
      'image/', 'video/', 'audio/', 'application/pdf', 'application/zip',
      'application/x-zip-compressed', 'application/x-rar-compressed'
    ];
    const isObviouslyWrong = obviouslyWrongTypes.some(wrongType => mimetype.startsWith(wrongType));
    
    if (isObviouslyWrong) {
      const error = new Error(`Invalid file type: ${mimetype}. Only CSV or OFX files are allowed.`);
      error.code = 'INVALID_FILE_TYPE';
      error.status = 415;
      return cb(error);
    }
    // If MIME type is not obviously wrong but not in allowed list, allow it anyway
    // (browsers sometimes send unexpected MIME types for CSV files)
  }
  
  // Additional security: Check original filename for suspicious patterns
  const filename = file.originalname;
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /[<>:"|?*]/,  // Invalid filename characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,  // Windows reserved names
    /^\./  // Hidden files
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(filename))) {
    const error = new Error('Invalid filename detected.');
    error.code = 'SUSPICIOUS_FILENAME';
    error.status = 400;
    return cb(error);
  }
  
  cb(null, true);
};

/**
 * Multer configuration for secure CSV and OFX uploads
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1, // Only allow single file upload
    fields: 10, // Limit number of non-file fields
    fieldNameSize: 100, // Limit field name size
    fieldSize: 1024 * 1024 // 1MB limit for field values
  }
});

/**
 * Enhanced error handling for file uploads
 */
const handleUploadError = (err, req, res, next) => {
  // Clean up any uploaded files on error
  if (req.file && req.file.path) {
    fs.unlink(req.file.path, (unlinkErr) => {
      if (unlinkErr) {
        console.error('Failed to cleanup uploaded file:', unlinkErr);
      }
    });
  }
  
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`,
          code: 'FILE_TOO_LARGE',
          maxSize: MAX_FILE_SIZE_MB
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          error: 'Too many files. Only one file is allowed.',
          code: 'TOO_MANY_FILES'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'Unexpected field name for file upload.',
          code: 'UNEXPECTED_FIELD'
        });
      default:
        return res.status(400).json({
          error: 'File upload error.',
          code: 'UPLOAD_ERROR',
          details: err.message
        });
    }
  }
  
  if (err.code) {
    return res.status(err.status || 400).json({
      error: err.message,
      code: err.code
    });
  }
  
  // Generic upload error
  return res.status(500).json({
    error: 'Internal server error during file upload.',
    code: 'UPLOAD_INTERNAL_ERROR'
  });
};

/**
 * Binary content detection middleware
 */
const validateFileContent = async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  
  try {
    // Read first 512 bytes to check for binary content
    const buffer = Buffer.alloc(512);
    const fd = fs.openSync(req.file.path, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
    fs.closeSync(fd);
    
    // Check file extension to determine validation approach
    const ext = path.extname(req.file.originalname).toLowerCase();
    const isOFX = ext === '.ofx';
    
    // For OFX files, allow null bytes (they may appear in headers but file is still text-based)
    // For CSV files, check for null bytes (indicator of binary content)
    if (!isOFX) {
      const content = buffer.slice(0, bytesRead);
      if (content.includes(0)) {
        // Clean up the file
        fs.unlink(req.file.path, () => {});
        
        return res.status(415).json({
          error: 'Binary file content detected. Only text CSV files are allowed.',
          code: 'BINARY_CONTENT_DETECTED'
        });
      }
    }
    
    // Normalize line endings and validate basic structure
    const textContent = buffer.slice(0, bytesRead).toString('utf8');
    const normalizedContent = textContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    if (isOFX) {
      // Basic OFX validation: check for OFX markers
      const hasOFXMarker = normalizedContent.includes('<OFX>') || 
                           normalizedContent.includes('OFXHEADER') ||
                           normalizedContent.match(/^\s*OFXHEADER/i);
      
      if (!hasOFXMarker && normalizedContent.trim().length > 0) {
        // Might still be valid OFX, but warn
        console.warn('OFX file may not have standard markers');
      }
      
      // Store file info
      req.fileInfo = {
        hasValidStructure: true,
        fileType: 'ofx'
      };
    } else {
      // Basic CSV validation: check for reasonable structure
      const lines = normalizedContent.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({
          error: 'Empty CSV file.',
          code: 'EMPTY_FILE'
        });
      }
      
      // Store normalized content info for processing
      req.fileInfo = {
        hasValidStructure: true,
        lineCount: lines.length,
        estimatedColumns: lines[0] ? lines[0].split(',').length : 0,
        fileType: 'csv'
      };
    }
    
    next();
  } catch (error) {
    // Clean up the file
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    
    return res.status(500).json({
      error: 'Failed to validate file content.',
      code: 'FILE_VALIDATION_ERROR'
    });
  }
};

/**
 * Middleware to ensure file cleanup after processing
 */
const ensureFileCleanup = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  const cleanup = () => {
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Failed to cleanup uploaded file:', err);
        }
      });
    }
  };
  
  res.send = function(...args) {
    cleanup();
    return originalSend.apply(this, args);
  };
  
  res.json = function(...args) {
    cleanup();
    return originalJson.apply(this, args);
  };
  
  // Also cleanup on response finish
  res.on('finish', cleanup);
  res.on('close', cleanup);
  
  next();
};

/**
 * Complete secure upload middleware chain
 */
const secureCSVUpload = [
  upload.single('csvFile'),
  handleUploadError,
  validateFileContent,
  ensureFileCleanup
];

module.exports = {
  secureCSVUpload,
  upload,
  handleUploadError,
  validateFileContent,
  ensureFileCleanup,
  uploadLimiter: require('./security').uploadLimiter,
  MAX_FILE_SIZE_MB,
  ALLOWED_MIME_TYPES
};