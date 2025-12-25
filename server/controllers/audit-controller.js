const auditDAO = require('../models/audit_dao');
const { validateAuthentication } = require('../utils/validators');
const fs = require('fs').promises;
const path = require('path');

/**
 * Get audit logs for authenticated user
 * GET /api/audit/logs
 */
exports.getAuditLogs = (req, res) => {
  // Validate authentication
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  const userId = req.user.user_id;
  const options = {
    startDate: req.query.start_date || null,
    endDate: req.query.end_date || null,
    type: req.query.type || null,
    accountId: req.query.account_id || null,
    limit: parseInt(req.query.limit) || 100,
    offset: parseInt(req.query.offset) || 0
  };

  auditDAO.getAuditLogs(userId, options, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
    res.json(result);
  });
};

/**
 * Get audit statistics for authenticated user
 * GET /api/audit/stats
 */
exports.getAuditStats = (req, res) => {
  // Validate authentication
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  const userId = req.user.user_id;

  auditDAO.getAuditStats(userId, (err, stats) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch audit statistics' });
    }
    res.json(stats);
  });
};

/**
 * Delete an audit log entry
 * DELETE /api/audit/logs/:type/:id
 */
exports.deleteAuditLog = (req, res) => {
  // Validate authentication
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  const { type, id } = req.params;
  const userId = req.user.user_id;

  // Validate type
  const validTypes = ['balance_adjustment', 'statement_import', 'transaction_import', 'reconciliation', 'category_verification_file'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid audit log type. Must be one of: ${validTypes.join(', ')}` });
  }

  auditDAO.deleteAuditLog(type, id, userId, (err, result) => {
    if (err) {
      if (err.message && err.message.includes('not found')) {
        return res.status(404).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message || 'Failed to delete audit log entry' });
    }
    res.json({
      message: 'Audit log entry deleted successfully',
      ...result
    });
  });
};

/**
 * Get list of category verification files
 * GET /api/audit/category-verification-files
 */
exports.getCategoryVerificationFiles = async (req, res) => {
  // Validate authentication
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  try {
    const projectRoot = path.resolve(__dirname, '../..');
    const files = await fs.readdir(projectRoot);
    
    // Filter for category verification files
    const verificationFiles = files.filter(file => 
      file.startsWith('categoryVerificationrunon_') && file.endsWith('.json')
    );

    // Extract metadata from filenames and get file stats
    const filesWithMetadata = await Promise.all(
      verificationFiles.map(async (filename) => {
        const filePath = path.join(projectRoot, filename);
        const stats = await fs.stat(filePath);
        
        // Parse filename: categoryVerificationrunon_DDMMYYYY_UserId_userId.json
        const match = filename.match(/categoryVerificationrunon_(\d{8})_UserId_(.+)\.json/);
        const dateStr = match ? match[1] : '';
        const userId = match ? match[2] : '';
        
        // Parse date DDMMYYYY
        let parsedDate = null;
        if (dateStr && dateStr.length === 8) {
          const day = dateStr.substring(0, 2);
          const month = dateStr.substring(2, 4);
          const year = dateStr.substring(4, 8);
          // Validate date components
          const dayNum = parseInt(day, 10);
          const monthNum = parseInt(month, 10);
          const yearNum = parseInt(year, 10);
          if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 2000) {
            parsedDate = `${year}-${month}-${day}`;
          }
        }

        // Read file to get metadata
        let fileMetadata = null;
        try {
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const jsonData = JSON.parse(fileContent);
          fileMetadata = jsonData.metadata || null;
        } catch (err) {
          console.error(`Error reading file ${filename}:`, err);
        }

        return {
          filename,
          date: parsedDate,
          userId,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          metadata: fileMetadata
        };
      })
    );

    // Sort by date descending (newest first)
    filesWithMetadata.sort((a, b) => {
      if (a.date && b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.modified.getTime() - a.modified.getTime();
    });

    res.json({ files: filesWithMetadata });
  } catch (err) {
    console.error('Error listing category verification files:', err);
    res.status(500).json({ error: 'Failed to list category verification files' });
  }
};

/**
 * Get category verification file content
 * GET /api/audit/category-verification-files/:filename
 */
exports.getCategoryVerificationFile = async (req, res) => {
  // Validate authentication
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  try {
    const { filename } = req.params;
    
    // Security: ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Ensure it's a category verification file
    if (!filename.startsWith('categoryVerificationrunon_') || !filename.endsWith('.json')) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const projectRoot = path.resolve(__dirname, '../..');
    const filePath = path.join(projectRoot, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (err) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Read and parse file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    res.json(jsonData);
  } catch (err) {
    console.error('Error reading category verification file:', err);
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(500).json({ error: 'Failed to read category verification file' });
  }
};

/**
 * Generate a new category verification file
 * POST /api/audit/category-verification-files/generate
 */
exports.generateCategoryVerificationFile = async (req, res) => {
  // Validate authentication
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  try {
    const { start_date, end_date } = req.body;
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const projectRoot = path.resolve(__dirname, '../..');
    const scriptPath = path.join(projectRoot, 'server', 'scripts', 'category-monthly-totals.sh');
    
    // Build command arguments - always use -d (default user ID)
    let command = `bash "${scriptPath}" -d`;
    if (start_date) command += ` "${start_date}"`;
    if (end_date) command += ` "${end_date}"`;
    
    // Execute the script
    const { stdout, stderr } = await execAsync(command, {
      cwd: projectRoot,
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    // Parse output filename from stderr (script outputs filename to stderr)
    const filenameMatch = stderr.match(/Output saved to: (.+)/);
    const filename = filenameMatch ? filenameMatch[1].trim() : null;
    
    if (!filename) {
      return res.status(500).json({ error: 'Failed to determine output filename' });
    }
    
    // Read the generated file to return metadata
    try {
      const filePath = path.join(projectRoot, filename);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);
      
      res.json({
        success: true,
        filename: filename,
        metadata: jsonData.metadata,
        verification: jsonData.verification
      });
    } catch (err) {
      // File was created but couldn't be read
      res.json({
        success: true,
        filename: filename,
        message: 'File generated successfully'
      });
    }
  } catch (err) {
    console.error('Error generating category verification file:', err);
    res.status(500).json({ 
      error: 'Failed to generate category verification file',
      details: err.message 
    });
  }
};

