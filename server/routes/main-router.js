const express = require('express');
const router = express.Router();
const transactionRouter = require('./transaction-router');
const categoryRouter = require('./category-router');
const autoSearchRouter = require('./autoSearchKeywordRouter.js');
const accountRouter = require('./account-router');
const accountFieldMappingRouter = require('./account-field-mapping-router');
const userRouter = require('./user-router');
const reportingRouter = require('./reporting-router');
const userPreferencesRouter = require('./user-preferences-router');
const statementRouter = require('./statement-router');
const reconciliationRouter = require('./reconciliation-router');
const auditRouter = require('./audit-router');
const keywordRulesRouter = require('./keyword-rules-router');
const importExportRouter = require('./import-export-router');

// Transaction routes
router.use('/transactions', transactionRouter);

// Category routes
router.use('/categories', categoryRouter);

// Keyword Rules routes
router.use('/keyword-rules', keywordRulesRouter);

// Category Assignment routes
router.use('/autocatfind', autoSearchRouter);

// Account routes
router.use('/accounts', accountRouter);

// Account Field Mapping routes
router.use('/account-field-mappings', accountFieldMappingRouter);

// User routes
router.use('/users', userRouter);

// Reporting routes
router.use('/reports', reportingRouter);

// User Preferences routes
router.use('/user-preferences', userPreferencesRouter);

// Statement routes (reconciliation)
router.use('/statements', statementRouter);

// Reconciliation routes
router.use('/recon', reconciliationRouter);

// Audit routes
router.use('/audit', auditRouter);

// Import-Export routes
router.use('/import-export', importExportRouter);

module.exports = router;
