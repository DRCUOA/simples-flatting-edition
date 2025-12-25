# Business Logic Documentation

## Overview

This document details the **business logic and rules** implemented across all controllers in the financial management application. Each controller encapsulates specific business domains with their own rules, calculations, and validation logic.

## Core Business Principles

### Financial Integrity
- **Double-Entry Accounting**: All transactions must balance across accounts
- **Audit Trail**: Complete transaction history with timestamps and user tracking
- **Reconciliation**: Bank statements must reconcile with internal records
- **Data Consistency**: Referential integrity across all financial entities

### User Data Isolation
- **Multi-Tenant Architecture**: Complete data separation between users
- **User-Scoped Operations**: All operations automatically scoped to authenticated user
- **Admin Override**: Limited admin access for system management

### Business Rule Enforcement
- **Validation at Entry**: All business rules enforced at data entry
- **Constraint Checking**: Database and application-level constraint validation
- **Workflow Controls**: State-based business process controls

---

## Account Controller Business Logic

### Account Management Rules

#### Account Creation
```javascript
// Business Rules:
1. Account name must be unique per user
2. Account type determines positive_is_credit behavior
3. Initial balance must be a valid number
4. User can only create accounts for themselves
```

#### Account Types & Credit/Debit Logic
```javascript
// Credit vs Debit Account Rules:
- Credit Accounts (positive_is_credit = true):
  * Credits increase balance (positive amounts)
  * Debits decrease balance (negative amounts)
  * Examples: Credit Cards, Loans, Liabilities

- Debit Accounts (positive_is_credit = false):
  * Debits increase balance (positive amounts)  
  * Credits decrease balance (negative amounts)
  * Examples: Checking, Savings, Assets
```

#### Balance Management
```javascript
// Balance Update Rules:
1. Balance changes only through transactions
2. Automatic balance recalculation on transaction changes
3. Balance history tracking with last_balance_update timestamp
4. Balance validation against transaction sum
```

#### Account Deletion Constraints
```javascript
// Deletion Business Rules:
1. Cannot delete accounts with existing transactions
2. Must delete all transactions first (cascade deletion)
3. Prevents orphaned transaction records
4. Maintains referential integrity
```

### Statement Management Logic

#### Statement Creation Rules
```javascript
// Smart Defaults Logic:
1. If no period_start provided:
   - Use day after last statement's period_end
   - If no previous statement, require manual input

2. If no opening_balance provided:
   - Use last statement's closing_balance
   - If no previous statement, default to 0

3. Period validation:
   - period_start must be before period_end
   - No overlapping periods for same account
   - Dates must be in YYYY-MM-DD format
```

#### Statement Reconciliation Rules
```javascript
// Reconciliation Business Rules:
1. Opening balance must match previous statement's closing balance
2. Closing balance = Opening balance + Net transaction movement
3. All transactions in period must be reconciled before statement lock
4. Locked statements cannot be modified
```

---

## Budget Controller Business Logic

### Budget Planning Rules

#### Budget Period Management
```javascript
// Budget Period Rules:
1. Budget periods can overlap (multiple budgets per category per month)
2. Latest budget entry wins for same category/month
3. Period validation: start_date ≤ end_date
4. Budget amounts can be negative (income budgets) or positive (expense budgets)
```

#### Budget Validation Logic
```javascript
// Budget Creation Rules:
1. Category must exist and belong to user
2. Budgeted amount must be a valid number (can be negative)
3. Period dates must be valid and logical
4. User can only create budgets for their own categories
```

#### Budget vs Actual Calculations
```javascript
// Budget Analysis Logic:
1. Income Categories (negative budget):
   - Actual = sum of positive transactions
   - Variance = Actual - |Budgeted|
   - Positive variance = over-achievement

2. Expense Categories (positive budget):
   - Actual = sum of negative transactions (as positive)
   - Variance = Budgeted - Actual
   - Positive variance = under-spending

3. Burn Rate Calculation:
   - Burn Rate = Actual / (Budgeted × Time Elapsed / Total Time)
   - Values > 1.0 indicate overspending
```

#### Bulk Budget Operations
```javascript
// Bulk Upsert Logic:
1. Transaction safety: All operations in single transaction
2. Validation: Each budget validated before processing
3. Conflict resolution: Update existing, create new
4. Rollback: Entire operation fails if any budget fails validation
```

---

## Category Controller Business Logic

### Category Hierarchy Rules

#### Parent-Child Relationships
```javascript
// Category Tree Rules:
1. Categories can have parent categories (hierarchical structure)
2. Cannot delete parent categories with child categories
3. Cannot delete categories used by transactions
4. Category names must be unique per user
```

#### Category Assignment Logic
```javascript
// Auto-Categorization Rules:
1. Keyword matching uses longest match algorithm
2. Multiple keywords can map to same category
3. Confidence scoring for suggestion accuracy
4. User feedback improves future suggestions
```

#### Bulk Category Operations
```javascript
// Bulk Creation Rules:
1. All categories must have unique names
2. Parent categories must exist before child creation
3. User ID automatically assigned to authenticated user
4. Transaction safety with rollback on any failure
```

### Keyword-Based Categorization

#### Smart Category Suggestions
```javascript
// Keyword Matching Algorithm:
1. Search for longest matching keyphrase in transaction description
2. Case-insensitive matching
3. Partial word matching supported
4. Fallback to "No Category Found" if no match
```

#### Suggestion Feedback System
```javascript
// Learning Algorithm:
1. Track user acceptance/rejection of suggestions
2. Confidence scoring based on historical accuracy
3. Keyword rule updates based on feedback
4. Continuous improvement of suggestion quality
```

---

## Transaction Controller Business Logic

### Transaction Processing Rules

#### Transaction Creation Logic
```javascript
// Transaction Validation Rules:
1. Account must belong to authenticated user
2. Amount must be valid number
3. Transaction date must be valid
4. Signed amount calculated based on account type and transaction type
```

#### Signed Amount Calculation
```javascript
// Financial Calculation Logic:
function calculateSignedAmount(account, transaction) {
  const amount = Math.abs(transaction.amount);
  const isCredit = transaction.transaction_type === 'C';
  
  if (account.positive_is_credit) {
    // Credit account: Credits positive, Debits negative
    return isCredit ? amount : -amount;
  } else {
    // Debit account: Debits positive, Credits negative  
    return isCredit ? -amount : amount;
  }
}
```

#### CSV Import Business Logic

##### Date Parsing Rules
```javascript
// Supported Date Formats:
1. DD/MM/YYYY (e.g., "15/03/2024")
2. YYYY-MM-DD (e.g., "2024-03-15")
3. DD-MM-YYYY (e.g., "15-03-2024")
4. YYYY/MM/DD (e.g., "2024/03/15")
5. DD.MM.YYYY (e.g., "15.03.2024")
6. YYYY.MM.DD (e.g., "2024.03.15")
7. DD MM YYYY (e.g., "15 03 2024")
8. YYYY MM DD (e.g., "2024 03 15")
9. ISO date strings
```

##### Duplicate Detection Logic
```javascript
// Deduplication Algorithm:
1. Generate SHA-256 hash from: date + description + amount + type
2. Check against existing transaction hashes
3. Allow user to select which duplicates to import
4. Skip duplicates by default, import only if explicitly selected
```

##### Field Mapping Rules
```javascript
// CSV Field Mapping:
1. Required fields: transaction_date, description, amount, transaction_type
2. Optional fields: category_id (for pre-categorization)
3. Fallback field detection for common CSV formats
4. Multi-field description concatenation support
```

#### Transaction Reconciliation Logic
```javascript
// Reconciliation Rules:
1. Transaction must fall within statement period
2. Statement must belong to same account as transaction
3. Cannot edit reconciled transactions in locked statements
4. Batch reconciliation for efficiency
```

#### Balance Update Logic
```javascript
// Account Balance Management:
1. Create transaction: Add signed_amount to account balance
2. Update transaction: Adjust balance by difference in signed_amount
3. Delete transaction: Subtract signed_amount from account balance
4. Account change: Move balance between accounts
```

---

## User Controller Business Logic

### Authentication & Security Rules

#### User Registration Logic
```javascript
// Registration Validation:
1. Username must be unique across system
2. Email must be unique across system
3. Password must meet security requirements
4. Automatic user_id generation with UUID
```

#### Password Security Rules
```javascript
// Password Handling:
1. bcrypt hashing with configurable rounds (default: 12)
2. Password never stored in plain text
3. Password comparison using bcrypt.compare()
4. Environment variable for bcrypt rounds configuration
```

#### JWT Token Logic
```javascript
// Token Management:
1. 24-hour token expiration
2. User info embedded in token (user_id, username, email, role)
3. Stateless authentication (no server-side token storage)
4. Client-side logout (token removal)
```

#### User Profile Management
```javascript
// Profile Update Rules:
1. Users can only update their own profiles
2. Admins can update any user profile
3. Password updates trigger re-hashing
4. Last login timestamp tracking
```

---

## Actuals Controller Business Logic

### Financial Data Aggregation Rules

#### Account Actuals Logic
```javascript
// Account Balance Calculations:
1. Current Balance: Real-time account balance
2. Transaction Count: Number of transactions per account
3. Balance Sum: Sum of all signed amounts
4. Credit/Debit Breakdown: Separate totals for credits and debits
5. Reconciled Amounts: Sum of reconciled transactions
```

#### Category Actuals Logic
```javascript
// Category Financial Analysis:
1. Net Amount: Sum of all signed amounts for category
2. Income Amount: Sum of positive signed amounts
3. Expense Amount: Sum of negative signed amounts (as positive)
4. Transaction Count: Number of transactions per category
5. Parent Category Rollup: Child category amounts rolled up to parents
```

#### Budget vs Actual Analysis
```javascript
// Budget Performance Metrics:
1. Variance Calculation: Budgeted - Actual
2. Burn Rate: Actual spending vs time elapsed
3. Income vs Expense categorization
4. Monthly budget tracking with period analysis
```

#### Feature Flag Logic
```javascript
// Mode Selection Rules:
1. Strict Mode: Use database views for optimized queries
2. Legacy Mode: Direct transaction calculations
3. Automatic mode selection based on feature flags
4. Backward compatibility for existing clients
```

---

## Reporting Controller Business Logic

### Financial Reporting Rules

#### Monthly Summary Logic
```javascript
// Monthly Aggregation Rules:
1. Group transactions by YYYY-MM format
2. Exclude Internal-Transfers category
3. Calculate income, expense, and net per month
4. Date range filtering with inclusive boundaries
```

#### Budget vs Actual Reporting
```javascript
// Budget Analysis Rules:
1. Header Mode: Roll up child budgets to parent categories
2. Detail Mode: Show individual category budgets
3. Latest budget wins for same category/month
4. Time-based burn rate calculations
5. Variance analysis with positive/negative indicators
```

#### Weekly Category Analysis
```javascript
// Weekly Aggregation Logic:
1. Group by week starting Monday
2. Use normalized amounts for consistent calculations
3. Filter by budget categories only
4. Exclude Internal-Transfers
5. Week-over-week trend analysis
```

#### Balance History Logic
```javascript
// Historical Balance Calculations:
1. Calculate balance as of specific date
2. Subtract transactions after specified date
3. Account for all transaction types
4. Maintain audit trail of balance changes
```

---

## Statement Controller Business Logic

### Statement Management Rules

#### Statement Creation Logic
```javascript
// Smart Defaults Algorithm:
1. Period Start Default:
   - If no previous statement: require manual input
   - If previous statement exists: day after period_end

2. Opening Balance Default:
   - If no previous statement: default to 0
   - If previous statement exists: use closing_balance

3. Validation Rules:
   - Period dates must be valid YYYY-MM-DD format
   - Start date must be before end date
   - No overlapping periods for same account
   - Balance values must be valid numbers
```

#### Reconciliation Business Logic
```javascript
// Reconciliation Rules:
1. Transaction Reconciliation:
   - Transaction date must fall within statement period
   - Statement must belong to same account
   - Cannot reconcile to locked statements

2. Statement Reconciliation:
   - All transactions in period must be reconciled
   - Opening balance must match previous closing balance
   - Arithmetic validation: opening + transactions = closing
   - Statement locks after successful reconciliation

3. Unreconciliation:
   - Delete statement to unlock and unreconcile transactions
   - Maintains transaction history
   - Allows re-reconciliation with corrected data
```

#### Statement Validation Logic
```javascript
// Validation Checks:
1. Opening Balance Validation:
   - Must match previous statement's closing balance
   - Tolerates small rounding differences

2. Arithmetic Validation:
   - Opening + Net Transactions = Closing
   - Calculates difference for user feedback

3. Period Validation:
   - No gaps between consecutive statements
   - No overlaps in statement periods
   - Chronological order maintenance
```

---

## User Preferences Controller Business Logic

### Preference Management Rules

#### Preference Storage Logic
```javascript
// Preference Handling:
1. JSON serialization for complex data types
2. String storage for simple values
3. Automatic type detection and conversion
4. Upsert operations (insert or update)
```

#### Batch Operations Logic
```javascript
// Batch Processing Rules:
1. Transaction safety: All preferences in single transaction
2. Rollback on any failure
3. Efficient N+1 query prevention
4. Atomic operations for data consistency
```

#### Preference Validation
```javascript
// Validation Rules:
1. User ID must be valid and authenticated
2. Preference keys must be non-empty strings
3. Values can be any JSON-serializable type
4. Automatic cleanup of invalid preferences
```

---

## Auto Search Keyword Controller Business Logic

### Smart Categorization Rules

#### Keyword Matching Algorithm
```javascript
// Matching Logic:
1. Longest Match Priority:
   - Find longest matching keyphrase in description
   - Case-insensitive matching
   - Partial word matching supported

2. Fallback Handling:
   - Return "No Category Found" if no match
   - Confidence scoring for match quality
   - Learning from user feedback
```

#### Category Suggestion Logic
```javascript
// Suggestion Rules:
1. Keyword-based matching
2. Historical accuracy tracking
3. User feedback integration
4. Continuous improvement algorithm
```

---

## Business Rule Enforcement

### Data Integrity Rules

#### Referential Integrity
```javascript
// Constraint Enforcement:
1. Foreign key constraints at database level
2. Application-level validation for business rules
3. Cascade deletion prevention for critical data
4. Orphaned record prevention
```

#### Transaction Safety
```javascript
// ACID Compliance:
1. Atomic operations for multi-step processes
2. Consistent data state across operations
3. Isolation of concurrent operations
4. Durability of committed transactions
```

### Workflow Controls

#### State Management
```javascript
// Business Process States:
1. Statement States: Draft → Reconciled → Locked
2. Transaction States: Pending → Reconciled
3. Import States: Processing → Completed → Failed
4. User States: Active → Inactive → Deleted
```

#### Approval Workflows
```javascript
// Business Process Rules:
1. Statement reconciliation requires validation
2. Large transaction imports require confirmation
3. Account deletion requires transaction cleanup
4. Budget changes require period validation
```

---

## Financial Calculation Formulas

### Core Financial Calculations

#### Signed Amount Formula
```javascript
// For Credit Accounts (positive_is_credit = true):
signed_amount = transaction_type === 'C' ? amount : -amount

// For Debit Accounts (positive_is_credit = false):
signed_amount = transaction_type === 'C' ? -amount : amount
```

#### Balance Calculation Formula
```javascript
// Account Balance:
current_balance = initial_balance + sum(all_signed_amounts)

// Statement Balance:
closing_balance = opening_balance + sum(period_transactions)
```

#### Budget Variance Formula
```javascript
// For Income Categories (negative budget):
variance = actual_income - |budgeted_amount|

// For Expense Categories (positive budget):
variance = budgeted_amount - actual_expense
```

#### Burn Rate Formula
```javascript
// Burn Rate Calculation:
burn_rate = actual_spending / (budgeted_amount × elapsed_days / total_days)

// Interpretation:
// burn_rate > 1.0 = overspending
// burn_rate < 1.0 = underspending
// burn_rate = 1.0 = on track
```

---

## Summary

The business logic layer implements comprehensive financial management rules including:

- **Financial Integrity**: Double-entry accounting principles with balance validation
- **Data Consistency**: Referential integrity and constraint enforcement
- **User Isolation**: Complete multi-tenant data separation
- **Smart Defaults**: Intelligent default values for improved user experience
- **Reconciliation**: Bank statement reconciliation with validation
- **Reporting**: Advanced financial analysis and reporting capabilities
- **Import/Export**: Robust CSV processing with duplicate detection
- **Security**: Comprehensive authentication and authorization rules

Each controller encapsulates domain-specific business rules while maintaining consistency across the entire application, ensuring data integrity and providing a robust foundation for financial management operations.
