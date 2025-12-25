# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.6] - 2025-11-21

### Added
- **Currency Precision System**: Comprehensive implementation of precise decimal arithmetic for all currency calculations
  - Added `decimal.js` library dependency to both server and client packages
  - Created unified money utilities (`server/utils/money.js` and `client/src/utils/money.js`) for precise currency operations
  - All currency amounts now maintain 2 decimal places precision using banking rounding (ROUND_HALF_UP)
  - Functions include: `parseMoney()`, `addMoney()`, `subtractMoney()`, `multiplyMoney()`, `divideMoney()`, `sumMoney()`, `roundMoney()`, `moneyEquals()`, and more
  - Eliminates floating-point rounding errors in financial calculations (e.g., `0.1 + 0.2` now equals `0.30` exactly)
- **Category Display Order System**: Added drag-and-drop ordering for categories
  - New `display_order` column in Categories table with migration (`2025-01-XX_add_category_display_order.sql`)
  - Categories can now be manually ordered within their parent category
  - Ordering persists across sessions and respects parent-child relationships
  - Falls back to alphabetical ordering when `display_order` is NULL
- **Category Tree Component**: New `CategoryTreeNode.vue` component for hierarchical category display
  - Flight strip-style UI with visual hierarchy indicators
  - Drag-and-drop reordering support with visual feedback
  - Expand/collapse functionality for nested categories
  - Color-coded borders by hierarchy level (indigo for root, green for level 1, blue for level 2+)
  - Edit and delete actions with proper parent-child relationship validation
- **Balance Recalculation Script**: New utility script (`server/scripts/recalculate-all-balances.js`)
  - Manually recalculate all account balances to fix any inconsistencies
  - Supports user-specific or system-wide recalculation
  - Provides detailed progress reporting and error handling

### Changed
- **Currency Calculations**: Migrated all currency arithmetic to use money utilities
  - **Server-side**:
    - `server/models/account_dao.js`: Balance calculations now use `addMoney()`, `subtractMoney()`, `parseMoney()`
    - `server/controllers/reporting-controller.js`: Net balance calculations use precise arithmetic
  - **Client-side**:
    - `client/src/stores/account.js`: Account balance calculations use money utilities
    - `client/src/stores/transaction.js`: Transaction totals and aggregations use `sumMoney()` and `addMoney()`
- **Category Management**: Enhanced category tree view with drag-and-drop ordering
  - `client/src/views/CategoriesView.vue`: Integrated new CategoryTreeNode component with drag-and-drop support
  - Categories sorted by `display_order` first, then alphabetically
  - Visual feedback during drag operations
  - Automatic order persistence on drag completion
- **Category DAO**: Updated to support display order
  - `server/models/category_dao.js`: Added display order column detection and ordering logic
  - Queries now order by `COALESCE(display_order, 999999)` then `category_name`
  - Backward compatible with databases that don't have `display_order` column yet
- **Category Store**: Added order update functionality
  - `client/src/stores/category.js`: New `updateCategoryOrder()` method for batch order updates
  - Handles order persistence and local state synchronization
- **Category Controller**: Added endpoint for updating category order
  - `server/controllers/category-controller.js`: New `updateCategoryOrder()` endpoint
  - `server/routes/category-router.js`: Added route for batch order updates
- **Net Balance Chart**: Updated to use money utilities for precise calculations
  - `client/src/components/NetBalanceChart.vue`: Currency calculations use money utilities
- **Reconciliation System**: Updated to use money utilities
  - `client/src/composables/useReconciliation.js`: Reconciliation calculations use precise arithmetic
  - `client/src/stores/reconciliation.js`: Balance comparisons use `moneyEquals()` for tolerance-based equality
- **Transaction Import**: Enhanced with money utilities
  - `client/src/views/TransactionImport.vue`: Amount parsing and validation use `parseMoney()`
- **Category Assignment**: Updated composable to use money utilities
  - `client/src/composables/useCategoryAssignment.js`: Amount calculations use precise arithmetic
- **HTTP Client**: Minor updates to support new endpoints
  - `client/src/lib/http.js`: Enhanced error handling and request formatting

### Fixed
- **Floating-Point Precision Errors**: Eliminated rounding errors in currency calculations
  - All currency operations now use `decimal.js` for arbitrary-precision arithmetic
  - Consistent 2 decimal place precision across all calculations
  - Proper handling of edge cases (null values, division by zero, etc.)
- **Category Ordering**: Fixed inconsistent category display order
  - Categories now maintain user-defined order within parent categories
  - Proper fallback to alphabetical ordering when order not specified

### Technical Details
- **Money Utilities**: 
  - Uses `decimal.js` library configured with 28-digit precision for intermediate calculations
  - Final results rounded to 2 decimal places using `ROUND_HALF_UP` (banking standard)
  - All functions handle null/undefined values gracefully
  - Comparison functions use epsilon tolerance (0.01) for equality checks
- **Category Display Order**:
  - `display_order` is an INTEGER field, NULL means use alphabetical fallback
  - Index created on `(user_id, parent_category_id, display_order)` for efficient queries
  - Migration initializes existing categories with order based on current alphabetical order
- **Component Architecture**:
  - CategoryTreeNode uses recursive component pattern for nested hierarchies
  - Drag-and-drop implemented using `vuedraggable` library
  - Order updates sent as batch operations to minimize API calls

### Impact
- **Precision**: All financial calculations now maintain exact 2 decimal place precision
- **User Experience**: Categories can be organized in custom order via intuitive drag-and-drop interface
- **Data Integrity**: Eliminated floating-point rounding errors that could cause balance discrepancies
- **Maintainability**: Centralized money utilities make currency handling consistent and easier to maintain

## [3.0.5] - 2025-12-XX

### Fixed (CRITICAL)
- **Account Balance Calculation Architecture Flaw**: Fixed fundamental design flaw where opening balance was incorrectly equated with current balance
  - **Root Cause**: Opening balance (user-entered, fixed, never changes) was being confused with current balance (calculated as opening_balance + sum_of_transactions)
  - **Previous Flawed Logic**: System attempted to reconstruct opening balance using date comparisons (`last_balance_update === created_at`) and complex calculations (`current_balance - sum_of_transactions`)
  - **Problem**: This temporal coincidence logic was fragile and error-prone, treating opening balance as a derived value rather than a fixed user input
  - **Solution**: Added dedicated `opening_balance` column to Accounts table that stores user-entered opening balance separately from `current_balance`
  - Opening balance is now stored at account creation and NEVER changes (unless account is deleted and recreated)
  - Current balance is ALWAYS calculated as: `current_balance = opening_balance + sum(signed_amount)` for all transactions
  - Removed all date comparison logic and balance reconstruction attempts from `updateAccountBalanceFromTransactions()`
  - Simplified balance recalculation to direct calculation: `opening_balance + transaction_sum`

### Changed
- **Database Schema** (`server/migrations/2025-12-XX_add_opening_balance_to_accounts.sql`):
  - Added `opening_balance REAL DEFAULT 0` column to Accounts table
  - Migration sets `opening_balance = current_balance` for existing accounts (preserves data)
- **Account Creation** (`server/models/account_dao.js`):
  - `createAccount()` now stores `opening_balance` separately from `current_balance`
  - Both fields initially set to user-entered value, but only `current_balance` changes thereafter
- **Balance Recalculation** (`server/models/account_dao.js`):
  - `updateAccountBalanceFromTransactions()` simplified to use `opening_balance` field directly
  - Removed all date comparison logic (`last_balance_update === created_at` checks)
  - Removed balance reconstruction logic (`current_balance - sum_of_transactions`)
  - Now uses simple formula: `current_balance = opening_balance + sum(signed_amount)`
- **UI Display** (`client/src/views/AccountDetailView.vue`):
  - Opening balance now reads directly from `account.opening_balance` field
  - Removed complex date-based calculation logic
- **Reporting** (`server/controllers/reporting-controller.js`):
  - Net balance history now uses `opening_balance` field directly instead of calculating it
  - Removed SQL subquery that calculated opening balance as `current_balance - sum(signed_amount)`

### Technical Details
- **Opening Balance**: User-entered value when account is created, stored in `opening_balance` column, NEVER changes
- **Current Balance**: Calculated value (`opening_balance + sum_of_transactions`), stored in `current_balance` column, ALWAYS recalculated
- **Separation of Concerns**: Opening balance and current balance are now properly separated - they are NOT the same field and should never be confused
- Migration preserves existing data by setting `opening_balance = current_balance` for all existing accounts

### Impact
- **Critical Fix**: Resolves fundamental architectural flaw where opening balance was incorrectly treated as a derived value
- **Data Integrity**: Opening balance is now properly preserved and never accidentally modified
- **Simplicity**: Balance calculation logic is now straightforward and maintainable
- **Correctness**: Current balance always correctly reflects `opening_balance + sum_of_transactions`

## [3.0.4] - 2025-12-XX

### Fixed (CRITICAL)
- **Date Handling Timezone Consistency**: Eliminated all date operations outside centralized date utilities to prevent timezone-related filtering bugs
  - Fixed critical bug where transactions date-stamped in NZ time were being filtered inconsistently due to timezone issues
  - All JavaScript `Date` object operations now exclusively use centralized date utilities (`server/utils/dateUtils.js` and `client/src/utils/dateUtils.js`)
  - Replaced all SQL `DATE()` function calls with direct string comparisons (YYYY-MM-DD format) to avoid timezone interpretation issues
  - Replaced all SQL `strftime()` calls with `substr()` for extracting year-month from YYYY-MM-DD date strings
  - Removed all manual date string manipulations (`.split('T')[0]`) in favor of date utility functions
  - Date filtering now uses lexicographical string comparison on YYYY-MM-DD formatted dates, ensuring consistent results regardless of server timezone

### Changed
- **Server-Side Date Operations**:
  - `server/models/reconciliation_dao.js`: Replaced `new Date().toISOString()` with `getCurrentTimestamp()`, removed SQL `DATE()` comparisons
  - `server/models/statement_dao.js`: Replaced `new Date().toISOString()` with `getCurrentTimestamp()`, fixed SQL date comparisons
  - `server/models/account_dao.js`: Removed SQL `DATE()` functions, normalized dates using date utils before SQL queries, replaced `.split('T')[0]` with date utils
  - `server/controllers/reporting-controller.js`: Removed SQL `DATE()` and `strftime()` functions, using string comparison and `substr()` instead
  - All date calculations now use `getToday()`, `addDays()`, `daysDifference()` from date utils

- **Client-Side Date Operations**:
  - `client/src/stores/ui.js`: Replaced `new Date()` with `getDayOfWeek()` from date utils
  - `client/src/stores/transaction.js`: Removed deprecated `_parseDate()` function
  - `client/src/views/TransactionImport.vue`: Replaced `new Date().getTime()` with `compareDates()` from date utils
  - `client/src/components/GemTransactionModal.vue`: Replaced `new Date()` parsing with `normalizeAppDateClient()`
  - `client/src/views/ReportsView.vue`: Replaced `new Date()` month calculations with `getFirstDayOfMonth()` and `getLastDayOfMonth()`
  - `client/src/views/ProfileView.vue`: Replaced `new Date().toLocaleString()` with `formatTimestampLocale()` and `formatTimestampLocaleDate()`
  - `client/src/components/NetBalanceChart.vue`: Replaced `new Date()` formatting with `formatDateForPeriod()` from date utils
  - `client/src/views/AccountDetailView.vue`: Replaced `.split('T')[0]` with date utils normalization

### Added
- **New Date Utility Functions**:
  - `getDayOfWeek(dateStr)`: Get day of week (0-6) from YYYY-MM-DD date string
  - `getFirstDayOfMonth()`: Get first day of current month in YYYY-MM-DD format
  - `getLastDayOfMonth()`: Get last day of current month in YYYY-MM-DD format
  - `formatDateForPeriod(dateStr, period)`: Format dates for chart display based on period type

### Technical Details
- **Date Format Standards**:
  - Domain dates: YYYY-MM-DD format (no time component) - stored in database and used for comparisons
  - Timestamps: ISO UTC format (YYYY-MM-DDTHH:mm:ss.sssZ) - for technical timestamps only
  - Display dates: DD/MM/YYYY format - for NZ user display
- **Date Comparison Strategy**: All date filtering uses lexicographical string comparison on YYYY-MM-DD formatted strings, ensuring consistent results regardless of timezone
- **SQL Date Functions**: Removed all SQL `DATE()` and `strftime()` functions that cause timezone issues. SQL `julianday()` functions remain for date arithmetic in sorting/weighting queries (not timezone-sensitive)
- **Zero Tolerance Policy**: All date operations must go through centralized utilities - no direct JavaScript `Date` object usage or problematic SQL date functions outside utils files

### Impact
- **Critical Fix**: Resolves timezone-related date filtering bugs where transactions date-stamped on 31/3/2025 NZ time were not showing correctly when filtering by date
- **Consistency**: Ensures all date operations are handled consistently across the entire application
- **Maintainability**: Centralized date handling makes future date-related changes easier and prevents timezone bugs

## [3.0.3] - 2025-11-20

### Fixed
- **Account Deletion Foreign Key Constraint Issue**: Fixed bug where accounts with no transactions could not be deleted due to foreign key constraints from other related tables
  - Updated `deleteAccount()` function to check for all related records: Transactions, StatementImports, StatementLines, ReconciliationSessions, and ReconciliationMatches
  - Added explicit deletion of CASCADE records (BalanceAdjustments, account_field_mappings) before account deletion
  - Improved error messages to clearly indicate which type of related records are preventing deletion
  - Enabled foreign key enforcement (`PRAGMA foreign_keys = ON`) to ensure constraints are properly enforced
  - Accounts with no related records can now be successfully deleted

### Technical Details
- Modified `server/models/account_dao.js` `deleteAccount()` function
- Function now performs comprehensive checks across all tables that reference `account_id`
- Provides user-friendly error messages for each blocking condition
- Explicitly handles CASCADE deletions for clarity and reliability

## [3.0.2] - 2025-11-20

### Fixed
- **Balance Bug Fix and Separation of Logic for Adjusting and Setting Account Balances**: Comprehensive refactor to separate opening balance setting from historic balance adjustments
  - Fixed issue where account balance updates could trigger unintended recalculations
  - Opening balance is now immutable after account creation, preventing accidental modifications

### Changed
- **Account Setup/Edit Modal** (`client/src/views/AccountsView.vue`):
  - Renamed "Current Balance" field to "Opening Balance" with clarification text "(Balance on the date the account is opened)"
  - Renamed "Balance Date" field to "Account Opening Date" with clarification text "(Date the account was opened)"
  - Opening balance field is now disabled (read-only) when editing existing accounts
  - Account opening date field is now disabled (read-only) when editing existing accounts
  - Added helper text explaining these fields cannot be changed after account creation
  - Modified `saveAccount()` function to exclude `current_balance` and `last_balance_update` fields when updating accounts
  - Opening balance can only be set during account creation, not modification

- **Account Update Logic** (`server/models/account_dao.js`):
  - Completely removed balance recalculation logic from `updateAccount()` function
  - Account updates now only modify: `account_name`, `account_type`, `positive_is_credit`, `account_class`, `timeframe`
  - Balance (`current_balance`) and balance date (`last_balance_update`) are preserved and cannot be changed via account update
  - Removed dependency on `hasTransactionsAfterDate()` and `getTransactionsSumAfterDate()` for account updates
  - Removed balance recalculation code that added transaction sums to entered balance

### Added
- **Balance Adjustments System**:
  - **New Database Table**: `BalanceAdjustments` table (`server/migrations/2025-11-20_add_balance_adjustments_table.sql`)
    - Tracks historic balance adjustments with full audit trail
    - Fields: `adjustment_id`, `account_id`, `user_id`, `adjustment_amount`, `adjustment_date`, `adjustment_reason`, `balance_before`, `balance_after`, `created_at`, `created_by_user_id`
    - Indexes on `account_id`, `user_id`, and `adjustment_date` for efficient queries
  - **Backend API Endpoints** (`server/controllers/account-controller.js`, `server/routes/account-router.js`):
    - `POST /accounts/:id/balance-adjustments` - Create a new balance adjustment
      - Validates adjustment amount, date, and reason
      - Creates audit trail record in `BalanceAdjustments` table
      - Updates account balance atomically
      - Returns created adjustment with full details
    - `GET /accounts/:id/balance-adjustments` - List all balance adjustments for an account
      - Returns adjustments ordered by date (most recent first)
      - User-scoped for security
  - **DAO Functions** (`server/models/account_dao.js`):
    - `createBalanceAdjustment(adjustment, callback)` - Creates a balance adjustment record
    - `getBalanceAdjustments(accountId, userId, callback)` - Retrieves balance adjustments for an account
    - Updated `getAccountDetails()` to fetch balance adjustments from new `BalanceAdjustments` table instead of deprecated `EquityAdjustments` table
  - **Balance Adjustment Modal** (`client/src/views/AccountDetailView.vue`):
    - New standalone modal for creating historic balance adjustments
    - **RED FONTED WARNING**: Prominent warning message "⚠️ DO NOT DO THIS UNLESS YOU ARE SURE" in red text
    - Warning explains that adjustments should only be used for corrections and creates permanent audit trail
    - Form fields:
      - Adjustment Amount (number input, positive/negative)
      - Adjustment Date (date input, can be historic)
      - Reason (textarea, required for audit trail)
    - Shows current balance and preview of new balance after adjustment
    - Submit button disabled until all required fields are filled
    - Creates adjustment via API and refreshes account details
  - **Balance Adjustments Tab Enhancement** (`client/src/views/AccountDetailView.vue`):
    - Added "Create Balance Adjustment" button in Balance Adjustments tab
    - Updated display to show adjustment date (from `adjustment_date` field) instead of creation date
    - Updated fields displayed: `adjustment_reason`, `balance_before`, `balance_after`, `created_at`
    - Removed deprecated equity-related fields (`equity_before`, `equity_after`)

### Technical Details
- Balance adjustments are separate from opening balance setting
- Opening balance represents the account balance on the date it was opened
- Historic balance adjustments are for corrections/adjustments that occurred in the past
- All balance adjustments are recorded with full audit trail including reason, before/after balances, and timestamp
- Account balance updates no longer trigger transaction-based recalculations
- Migration file: `server/migrations/2025-11-20_add_balance_adjustments_table.sql`

## [3.0.1] - 2025-11-10

### Fixed
- Removed duplicate `formatDate` import in AccountsView causing compilation error

## [3.0.0] - 2025-11-10

### Changed (BREAKING)
- **Unified Date Handling System**: Complete refactor of date handling across entire application
  - Domain dates (transaction_date, balance_as_of_date, etc.) now consistently stored as `YYYY-MM-DD` format
  - Technical timestamps (created_at, updated_at, etc.) remain as ISO UTC format
  - Single central date utilities on backend (`server/utils/dateUtils.js`) and frontend (`client/src/utils/dateUtils.js`)
  - All date parsing, formatting, and comparisons now flow through these utilities
  - Removed all ad-hoc date parsing/formatting code scattered throughout codebase
- **Database Schema**: Added `last_imported_transaction_date` field to Accounts table
  - Separates concept of "latest transaction date imported" from "balance reconciled to date"
  - Migration: `2025-11-10_add_last_imported_transaction_date.sql`

### Fixed
- **Critical Balance Update Bug**: Fixed bug where importing transactions for future dates (e.g., Nov-2025) could corrupt starting balance anchored at earlier dates (e.g., Apr-2025)
  - `last_balance_update` now enforces monotonic updates (only moves forward in time)
  - Importing older transactions updates `last_imported_transaction_date` but does NOT change `last_balance_update`
  - Balance reconciliation date preserved correctly during transaction imports

### Known Issues (Fixed in v3.0.5)
- **Architectural Flaw**: Opening balance was incorrectly equated with current balance, leading to confusion between user-entered fixed values and calculated values
  - System attempted to reconstruct opening balance using date comparisons and complex calculations
  - This temporal coincidence logic was fragile and error-prone
  - Fixed in v3.0.5 by adding dedicated `opening_balance` column and proper separation of concerns

### Technical Details
- Backend date utility supports modes: `bank-import`, `api-domain`, `db-domain`, `timestamp-iso`, `compare-domain`
- Frontend date utility supports modes: `api-to-domain`, `domain-to-display`, `display-to-domain`, `timestamp-to-display`, `compare-domain`
- All controllers, DAOs, utils, stores, views, and components updated to use central utilities
- Transaction store now stores dates as `YYYY-MM-DD` internally (display formatting happens at UI layer)
- Date comparisons use lexicographic comparison for `YYYY-MM-DD` format (works correctly for ISO dates)

## [2.3.0] - 2025-01-XX

### Added
- **OFX File Import Support**: Added comprehensive support for importing OFX (Open Financial Exchange) files
  - Automatic file type detection for CSV and OFX files based on extension and content analysis
  - OFX parser supporting both SGML format (OFX 1.x) and XML format (OFX 2.x)
  - Transaction mapper that converts OFX transactions to system format with proper type mapping
  - Support for bank accounts and credit card accounts in OFX files
  - Extraction of account information, statement periods, balances, and transaction details
  - Enhanced duplicate detection using OFX FITID (Financial Institution Transaction ID) when available
  - File upload middleware updated to accept OFX MIME types and validate OFX file structure
  - Preview functionality for OFX files showing parsed transactions before import
- **Account Detail View**: New comprehensive account detail page accessible from accounts list
  - Tabbed interface displaying account information and related data
  - **Transactions Tab**: Shows all account transactions with balance summary including opening balance, transaction total, calculated balance, and variance detection
  - **Reconciliations Tab**: Displays reconciliation sessions with status, periods, balances, and variance information
  - **Statement Imports Tab**: Lists statement imports with source filename, bank name, statement periods, and closing balances
  - **Transaction Imports Tab**: Shows transaction import history with status and error information
  - **Balance Adjustments Tab**: Displays balance adjustment history with reasons and equity impact
  - **Field Mappings Tab**: Lists CSV field mappings configured for the account
  - Route added: `/accounts/:id` with detail view navigation
  - Backend endpoint: `GET /accounts/:id/details` returning comprehensive account data

### Changed
- Transaction import system now supports both CSV and OFX file formats
- File upload validation enhanced to detect and validate OFX files alongside CSV files
- Account DAO extended with `getAccountDetails` method to fetch comprehensive account information

### Technical Details
- OFX parser handles both SGML (regex-based) and XML (xml2js-based) parsing
- OFX date parsing converts YYYYMMDDHHMMSS format to ISO date format
- Transaction type mapping from OFX types (CREDIT, DEBIT, INT, DIV, FEE, etc.) to system types
- FITID-based deduplication provides more reliable duplicate detection than date/amount/description matching
- Account detail view calculates opening balance by subtracting transaction sum from current balance
- Variance detection alerts when calculated balance differs from stored current balance

## [0.0.3/4] - 2025-11-19

### Added
- **Reconciliation Status Column**: Added expandable reconciliation status column to Accounts view table
  - Shows Active/Closed/None status badges for each account
  - Expandable details row displaying reconciliation session information
  - For active sessions: shows period, closing balance, calculated balance, variance (color-coded), and start date
  - For closed sessions: shows period, closing balance, variance, and completion date
  - Fetches reconciliation data on mount and maps to accounts
- **Table Sorting**: Made all columns in Accounts table sortable
  - Clickable column headers with hover effects
  - Visual sort indicators (↑ ascending, ↓ descending)
  - Smart default sort directions (dates/balances default to desc, text to asc)
  - Handles null values appropriately (timeframe nulls sort last)
  - Custom reconciliation status sorting (Active → Closed → None)

### Changed
- **Footer**:
Refactored Footer to be it's own component
- **Dynamic Version Reading**: Updated footer to import package.json directly for dynamic version display
  - Version now reads from package.json at runtime instead of build-time injection
  - Changes to version reflect immediately in development without rebuild
  - Simplified implementation by removing Vite define dependency

### Technical Details
- Reconciliation status uses priority-based sorting (Active=2, Closed=1, None=0)
- Sorting preserves expanded reconciliation details when changing sort order
- All sortable columns support both ascending and descending order
- Date and numeric columns have intelligent default sort directions

## [0.0.2] - 2025-01-XX

### Added
- **ViewInfo Development Component**: Added development-only footer component with view debugging capabilities
  - Small "V" icon in footer (dev mode only) that displays view information on hover
  - Shows view name, components used, and script blocks (stores/composables/APIs)
  - Expandable script blocks showing functions with clickable links to source files
  - Clickable component and function names that open files in Cursor editor at specific line numbers
  - Automatic function line number detection via file parsing
- **Footer with Build Information**: Added footer to all views displaying:
  - Build number from package.json version
  - Copyright notice: "Built By NZEBAPPS Ltd © 2025"
  - Footer visible in all environments (dev and production)
- **Version Injection**: Updated Vite config to inject package.json version as `VITE_APP_VERSION` environment variable

### Changed
- ViewInfo component moved from floating position to footer layout
- V icon size reduced from 10x10 to 6x6 for more subtle appearance
- Footer styling with border-top and background for clear separation

### Technical Details
- Function links use Cursor protocol (`cursor://file/`) with absolute file paths
- Line number detection uses regex patterns to find function definitions
- Caching implemented to avoid repeated file fetches for function line numbers
- Component only renders in development mode (checks `import.meta.env.MODE === 'development'`)

## [2.1.2] - 2025-11-16

### Changed
- **Environment Configuration Standardization**: Centralized environment variables in root `.env` file
  - Backend now loads `.env` from project root instead of server directory
  - Frontend Vite config loads `.env` from project root using `envDir` configuration
  - All environment variables accessible from single source of truth
- **Startup Logging**: Added comprehensive configuration logging on server startup
  - Backend logs: Port, CORS origins, and server URL
  - Frontend logs: Port, frontend URL, and API base URL
  - Makes configuration verification easy during development

### Added
- Root `.env` file with standardized variables:
  - `PORT`: Backend server port (default: 3051)
  - `FRONTEND_URL`: Frontend URL for CORS configuration
  - `FRONTEND_PORT`: Frontend development server port (default: 8085)
  - `VITE_API_BASE_URL`: Backend API URL for frontend (explicitly set)
  - Backward compatibility variables: `FRONTEND_ORIGIN`, `VITE_API_URL`
- Support for both `FRONTEND_URL` (new standard) and `FRONTEND_ORIGIN` (backward compatibility) in backend
- Frontend code updated to prefer `VITE_API_BASE_URL` with fallback to `VITE_API_URL` for backward compatibility

### Fixed
- Port consistency between backend and frontend configuration
- Environment variable loading from correct directory (root instead of subdirectories)

## [2.1.1] - 2025-11-15

### Fixed
- Fixed missing `viewSession` function in ReconciliationView causing errors when opening draft reconciliations
- Added proper session loading and account selection when viewing reconciliation history items

## [2.1.0] - 2025-11-15

### Added
- **Financial Helpers View**: New comprehensive financial utilities section accessible from main navigation
  - **Loan Repayment Calculator**: Calculate monthly payments, total interest, and total amount for loans
  - **Savings Goal Calculator**: Plan monthly savings needed to reach financial goals with interest calculations
  - **Income Tax Calculator (NZ 2025)**: Multi-step wizard for calculating PAYE, ACC, KiwiSaver, and Student Loan deductions
    - Supports multiple income frequencies (hour, week, fortnight, month, year)
    - Configurable hours worked per week
    - KiwiSaver contribution options (3%, 4%, 6%, 8%, 10%)
    - Student loan repayment calculations
    - Results table showing breakdown across all time periods
    - Additional income calculator using marginal tax rate
  - **Buy Now Pay Later Calculator**: Calculate true cost of BNPL schemes including fees and interest
  - **Budget Breakdown Helper**: Calculate daily/weekly spending limits from income after essentials and savings
  - **Emergency Fund Calculator**: Determine target emergency fund based on monthly expenses and coverage period
- **HelperIcons Component**: Minimal 2-tone SVG icons for each financial helper tool
- **Multi-step Wizard UI**: Low cognitive load wizard interface for tax calculator with progress indicators
- **Modal-based Interface**: Card overview with modal wizards for each helper tool

### Changed
- Updated income tax calculator to use New Zealand 2025 tax brackets and progressive tax calculation
- Improved transaction import error handling and balance recalculation robustness
- Enhanced account balance recalculation to handle non-zero opening balances correctly

### Fixed
- Fixed transaction import view issues with balance recalculation blocking imports
- Fixed template structure errors in HelpersView component
- Improved error handling for balance recalculation queue operations

## [2.0.0] - 2025-10-16

### Changed
- Major simplification of codebase (40% reduction in complexity)
- Removed advanced features: Budget Planning, Statement Reconciliation, Double-Entry Accounting, DB Actuals System

### Removed
- Budget planning system
- Statement reconciliation features
- Equity tracking and net worth views
- Advanced reporting features

