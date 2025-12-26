// server/controllers/import-export-controller.js

const { exportUserData, importUserData } = require('../services/import-export-service');
const { securityLogger } = require('../middleware/logging');
const { validateAuthentication } = require('../utils/validators');

/**
 * Export all user data
 * GET /api/import-export/export
 */
exports.exportData = async (req, res) => {
  try {
    // Validate authentication
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const userId = req.user.user_id;

    securityLogger('IMPORT_EXPORT_EXPORT_REQUEST', {
      userId
    }, req);

    const exportData = await exportUserData(userId);

    // Set headers for JSON download
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="user-data-export-${userId}-${Date.now()}.json"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    securityLogger('IMPORT_EXPORT_EXPORT_SUCCESS', {
      userId,
      recordCounts: Object.keys(exportData.data).reduce((acc, key) => {
        acc[key] = exportData.data[key].length;
        return acc;
      }, {})
    }, req);

    res.json(exportData);
  } catch (error) {
    securityLogger('IMPORT_EXPORT_EXPORT_ERROR', {
      userId: req.user?.user_id,
      error: error.message
    }, req);

    console.error('Export error:', error);
    res.status(500).json({
      error: 'Export failed',
      code: 'EXPORT_ERROR',
      message: error.message,
      correlationId: req.requestId
    });
  }
};

/**
 * Import user data
 * POST /api/import-export/import
 */
exports.importData = async (req, res) => {
  try {
    // Validate authentication
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const userId = req.user.user_id;
    const importData = req.body;
    const { preserveIds = true, overwriteExisting = false } = req.body.options || {};

    securityLogger('IMPORT_EXPORT_IMPORT_REQUEST', {
      userId,
      preserveIds,
      overwriteExisting,
      hasData: !!importData.data
    }, req);

    // Validate import data structure
    if (!importData || !importData.data) {
      return res.status(400).json({
        error: 'Invalid import data format',
        code: 'INVALID_IMPORT_FORMAT',
        message: 'Import data must contain a "data" object'
      });
    }

    // Validate metadata if present
    if (importData.metadata && importData.metadata.schema) {
      if (importData.metadata.schema !== 'simples-flatting-edition') {
        return res.status(400).json({
          error: 'Schema mismatch',
          code: 'SCHEMA_MISMATCH',
          message: `Expected schema 'simples-flatting-edition', got '${importData.metadata.schema}'`
        });
      }
    }

    const result = await importUserData(userId, importData, {
      preserveIds,
      overwriteExisting
    });

    securityLogger('IMPORT_EXPORT_IMPORT_SUCCESS', {
      userId,
      statistics: result.statistics
    }, req);

    res.status(200).json({
      success: true,
      message: 'Import completed',
      result: result
    });
  } catch (error) {
    securityLogger('IMPORT_EXPORT_IMPORT_ERROR', {
      userId: req.user?.user_id,
      error: error.message
    }, req);

    console.error('Import error:', error);
    res.status(500).json({
      error: 'Import failed',
      code: 'IMPORT_ERROR',
      message: error.message,
      correlationId: req.requestId
    });
  }
};

/**
 * Get import-export status/summary
 * GET /api/import-export/summary
 */
exports.getSummary = async (req, res) => {
  try {
    // Validate authentication
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    const userId = req.user.user_id;
    const { getConnection } = require('../db/index');
    const db = getConnection();

    // Get counts for all user tables
    const tables = [
      'Categories',
      'Accounts',
      'UserPreferences',
      'account_field_mappings',
      'Transactions',
      'transaction_imports',
      'StatementImports',
      'StatementLines',
      'ReconciliationSessions',
      'ReconciliationMatches'
    ];

    const summary = {};
    
    // Use Promise.all to get all counts in parallel
    const countPromises = tables.map(tableName => {
      return new Promise((resolve) => {
        db.get(`SELECT COUNT(*) as count FROM ${tableName} WHERE user_id = ?`, [userId], (err, row) => {
          if (!err && row) {
            summary[tableName] = row.count;
          } else {
            summary[tableName] = 0;
          }
          resolve();
        });
      });
    });

    await Promise.all(countPromises);

    res.json({
      success: true,
      userId,
      summary
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({
      error: 'Failed to get summary',
      code: 'SUMMARY_ERROR',
      message: error.message
    });
  }
};

