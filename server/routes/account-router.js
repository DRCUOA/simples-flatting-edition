const express = require('express');
const router = express.Router();
const accountController = require('../controllers/account-controller');
const { authenticateToken } = require('../middleware/auth');

// All account routes require authentication
router.use(authenticateToken);

// Get all accounts
router.get('/', accountController.getAllAccounts);


// Get account by ID
router.get('/:id', accountController.getAccountById);


// Create a new account
router.post('/', accountController.createAccount);

// Update an account
router.put('/:id', accountController.updateAccount);

// Delete an account
router.delete('/:id', accountController.deleteAccount);

// Update account balance
router.patch('/:id/balance', accountController.updateAccountBalance);

// Get comprehensive account details
router.get('/:id/details', accountController.getAccountDetails);

// Balance adjustment routes
router.post('/:id/balance-adjustments', accountController.createBalanceAdjustment);
router.get('/:id/balance-adjustments', accountController.getBalanceAdjustments);

module.exports = router; 