const accountDAO = require('../models/account_dao');
const { v4: uuidv4 } = require('uuid');
const { validateAuthentication, validateRequiredFields, validateNumber, validateUserAccess } = require('../utils/validators');
const { parseNumber, createErrorResponse, createSuccessResponse } = require('../utils/transformers');
const { normalizeAppDate, getToday } = require('../utils/dateUtils');

// Get all accounts for authenticated user
exports.getAllAccounts = (req, res) => {
  // Validate authentication
  const authValidation = validateAuthentication(req.user);
  if (!authValidation.isValid) {
    return res.status(401).json(authValidation.error);
  }

  const userId = req.user.user_id;
  
  accountDAO.getAllAccounts(userId, (err, accounts) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch accounts' });
    }
    // Return accounts array directly for backward compatibility with frontend
    return res.json(accounts);
  });
};

// Get account by ID (user-scoped)
exports.getAccountById = (req, res) => {
  const { id } = req.params;
  const userId = req.user?.user_id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  accountDAO.getAccountById(id, userId, (err, account) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch account' });
    }
    if (!account) {
      return res.status(404).json({ error: 'Account not found or access denied' });
    }
    res.json(account);
  });
};


// Create a new account
exports.createAccount = async (req, res) => {
  try {
    // Validate authentication
    const authValidation = validateAuthentication(req.user);
    if (!authValidation.isValid) {
      return res.status(401).json(authValidation.error);
    }

    // Validate required fields
    const { name, account_name, account_type, positive_is_credit = true, current_balance = 0, last_balance_update, timeframe } = req.body;
    const finalAccountName = account_name || name;
    
    const fieldValidation = validateRequiredFields({ account_name: finalAccountName, account_type }, ['account_name', 'account_type']);
    if (!fieldValidation.isValid) {
      return res.status(400).json(fieldValidation.error);
    }

    // Validate timeframe if provided
    if (timeframe && !['short', 'mid', 'long'].includes(timeframe)) {
      return res.status(400).json({ error: 'timeframe must be one of: short, mid, long' });
    }

    const userId = req.user.user_id;
    
    // Normalize last_balance_update to YYYY-MM-DD format (domain date)
    let normalizedBalanceDate = getToday();
    if (last_balance_update) {
      const normalized = normalizeAppDate(last_balance_update, 'api-domain');
      if (normalized.parsed) {
        normalizedBalanceDate = normalized.parsed;
      }
    }
    
    const account = {
      account_id: uuidv4(),
      account_name: finalAccountName,
      account_type,
      positive_is_credit,
      user_id: userId,
      current_balance: parseNumber(current_balance, 0),
      last_balance_update: normalizedBalanceDate,
      timeframe: timeframe || null
    };

    accountDAO.createAccount(account, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to create account' });
      }
      // Return simple response for backward compatibility
      return res.status(201).json({ id: result.account_id });
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create account' });
  }
};

// Update an account
exports.updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, account_name, account_type, positive_is_credit, current_balance, last_balance_update, timeframe } = req.body;
    
    // Use either name or account_name, with account_name taking precedence
    const finalAccountName = account_name || name;
    
    if (!finalAccountName || !account_type) {
      return res.status(400).json({ error: 'Account name and account type are required' });
    }
    
    // Validate timeframe if provided
    if (timeframe && !['short', 'mid', 'long'].includes(timeframe)) {
      return res.status(400).json({ error: 'timeframe must be one of: short, mid, long' });
    }
    
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Normalize last_balance_update to YYYY-MM-DD format (domain date)
    let normalizedBalanceDate = null;
    if (last_balance_update) {
      const normalized = normalizeAppDate(last_balance_update, 'api-domain');
      if (normalized.parsed) {
        normalizedBalanceDate = normalized.parsed;
      }
    }
    
    const account = {
      account_name: finalAccountName,
      account_type,
      positive_is_credit,
      current_balance: current_balance !== undefined ? parseFloat(current_balance) : 0,
      last_balance_update: normalizedBalanceDate,
      timeframe: timeframe || null
    };
    
    accountDAO.updateAccount(id, account, userId, (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to update account' });
      }
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Account not found or access denied' });
      }
      res.json({ message: 'Account updated successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update account' });
  }
};

// Delete an account (user-scoped)
exports.deleteAccount = (req, res) => {
  const { id } = req.params;
  const userId = req.user?.user_id;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  accountDAO.deleteAccount(id, userId, (err, result) => {
    if (err) {
      // Pass the error message directly to the client
      return res.status(400).json({ error: err.message });
    }
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Account not found or access denied' });
    }
    
    res.json({ message: 'Account deleted successfully' });
  });
};

// Update account balance
exports.updateAccountBalance = (req, res) => {
  const { id } = req.params;
  // Accept both { amount } and { signed_amount } from clients
  const amountRaw = req.body.amount !== undefined ? req.body.amount : req.body.signed_amount;

  if (amountRaw === undefined || isNaN(parseFloat(amountRaw))) {
    return res.status(400).json({ error: 'Valid amount (signed_amount) is required' });
  }

  const amount = parseFloat(amountRaw);

  accountDAO.updateAccountBalance(id, amount, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to update account balance' });
    }
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }
    res.json({ message: 'Account balance updated successfully' });
  });
};

// Get comprehensive account details
exports.getAccountDetails = (req, res) => {
  const { id } = req.params;
  const userId = req.user?.user_id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // First, ensure balance is up to date by recalculating it
  accountDAO.updateAccountBalanceFromTransactions(id, (balanceErr, balanceResult) => {
    if (balanceErr) {
      // Log error but don't fail - balance recalculation errors shouldn't prevent viewing account details
      console.error(`[Account Details] Failed to recalculate balance for account ${id}:`, balanceErr);
    }
    
    // Then fetch account details (which will include the updated balance)
    accountDAO.getAccountDetails(id, userId, (err, details) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch account details' });
      }
      if (!details) {
        return res.status(404).json({ error: 'Account not found or access denied' });
      }
      res.json(details);
    });
  });
};

// Create a balance adjustment
exports.createBalanceAdjustment = (req, res) => {
  try {
    const { id } = req.params;
    const { adjustment_amount, adjustment_date, adjustment_reason } = req.body;
    const userId = req.user?.user_id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (adjustment_amount === undefined || isNaN(parseFloat(adjustment_amount))) {
      return res.status(400).json({ error: 'Valid adjustment_amount is required' });
    }
    
    if (!adjustment_date) {
      return res.status(400).json({ error: 'adjustment_date is required' });
    }
    
    // Normalize adjustment date
    const normalized = normalizeAppDate(adjustment_date, 'api-domain');
    if (!normalized.parsed) {
      return res.status(400).json({ error: 'Invalid adjustment_date format' });
    }
    
    // Get current account balance
    accountDAO.getAccountById(id, userId, (err, account) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch account' });
      }
      if (!account) {
        return res.status(404).json({ error: 'Account not found or access denied' });
      }
      
      const balanceBefore = parseFloat(account.current_balance) || 0;
      const adjustmentAmount = parseFloat(adjustment_amount);
      const balanceAfter = balanceBefore + adjustmentAmount;
      
      // Create adjustment record
      const adjustment = {
        adjustment_id: uuidv4(),
        account_id: id,
        user_id: userId,
        adjustment_amount: adjustmentAmount,
        adjustment_date: normalized.parsed,
        adjustment_reason: adjustment_reason || null,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        created_by_user_id: userId
      };
      
      // Insert adjustment record
      accountDAO.createBalanceAdjustment(adjustment, (adjErr) => {
        if (adjErr) {
          return res.status(500).json({ error: 'Failed to create balance adjustment record' });
        }
        
        // Update account balance
        accountDAO.updateAccountBalance(id, adjustmentAmount, (balErr) => {
          if (balErr) {
            return res.status(500).json({ error: 'Failed to update account balance' });
          }
          
          res.status(201).json({
            message: 'Balance adjustment created successfully',
            adjustment: adjustment
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create balance adjustment' });
  }
};

// Get balance adjustments for an account
exports.getBalanceAdjustments = (req, res) => {
  const { id } = req.params;
  const userId = req.user?.user_id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  accountDAO.getBalanceAdjustments(id, userId, (err, adjustments) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch balance adjustments' });
    }
    res.json(adjustments || []);
  });
};
