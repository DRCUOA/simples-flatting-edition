// server/utils/fileTypeDetector.js

const fs = require('fs');

/**
 * Detect file type (CSV or OFX) based on extension and/or content
 * @param {string} filePath - Path to the file
 * @param {string} originalName - Original filename
 * @returns {Promise<string>} - 'csv' or 'ofx'
 */
async function detectFileType(filePath, originalName) {
  // First check file extension
  const ext = originalName ? originalName.toLowerCase().split('.').pop() : '';
  
  if (ext === 'csv') {
    return 'csv';
  }
  
  if (ext === 'ofx') {
    return 'ofx';
  }
  
  // If extension is unclear, check file content
  try {
    const buffer = Buffer.alloc(1024);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
    fs.closeSync(fd);
    
    const content = buffer.slice(0, bytesRead).toString('utf8');
    
    // Check for OFX markers
    if (content.includes('<OFX>') || 
        content.includes('OFXHEADER') || 
        content.includes('<?OFX') ||
        content.match(/^\s*OFXHEADER/i)) {
      return 'ofx';
    }
    
    // Check for CSV structure (comma-separated values, headers)
    if (content.includes(',') && content.split('\n').length > 1) {
      // Check if first line looks like CSV headers
      const firstLine = content.split('\n')[0];
      if (firstLine.includes(',') && firstLine.split(',').length > 1) {
        return 'csv';
      }
    }
    
    // Default to CSV if we can't determine (for backward compatibility)
    return 'csv';
  } catch (error) {
    console.error('Error detecting file type:', error);
    // Default to CSV for backward compatibility
    return 'csv';
  }
}

module.exports = {
  detectFileType
};


