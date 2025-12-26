# Simples - Personal Finance Management System - Flatting Edition


Based on Simples—the world-leading, fabulous personal finance app—this is the Flatting Edition, designed specifically to help flatmates harmoniously manage their shared household finances. Built with Vue.js and Express.js, it features double-entry accounting, equity tracking, and statement reconciliation. With professional-grade accuracy and a super simple interface, Simples makes it easy for everyone in your flat to stay on top of expenses—no financial expertise (or cat-like reflexes) required.

## 📦 Version Information

**Project Version:** `0.0.1` (Fresh Start - January 2025)

This codebase has been rebaselined to version 0.0.1 as a fresh start on an orphaned codebase. This is a monorepo workspace containing two independently versioned components:

| Component | Version | Last Updated | Location |
|-----------|---------|--------------|----------|
| **Root Project** | `0.0.1` | 01/01/25 | `package.json` |
| **Frontend (Client)** | `0.0.1` | 01/01/25 | `client/package.json` |
| **Backend (Server/API)** | `0.0.1` | 01/01/25 | `server/package.json` |

**Note:** This project has been reset to version 0.0.1 to begin a new development cycle. All previous version history has been archived, and development will proceed from this baseline.

### Version History

For detailed version history, change logs, and release notes, see [CHANGELOG.md](CHANGELOG.md).

**Current Release:**
- **v0.0.1** (26/12/25) - Fresh start on orphaned codebase - resetting version history to begin new development cycle

## 🚀 Quick Start

### Development Environment
```bash
# 1. Install dependencies
npm run install:all

# 2. Setup development environment
npm run setup:dev

# 3. Start development servers
npm run dev
```

### Production Environment
```bash
# 1. Install dependencies
npm run install:all

# 2. Setup production environment
npm run setup:prod

# 3. Test production configuration
npm run test:prod

# 4. Start production servers
npm run prod
```

## 📋 Environment Setup

This application supports separate development and production environments with different configurations for security, performance, and debugging.

### Available Commands
- `npm run setup:dev` - Setup development environment
- `npm run setup:prod` - Setup production environment
- `npm run dev` - Run in development mode
- `npm run prod` - Run in production mode
- `npm run test:prod` - Test production configuration

For detailed environment setup instructions, see [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md).

## Project Structure

```
simples/
├── client/                    # Frontend Vue.js application
│   ├── src/                   # Source code
│   │   ├── assets/           # Static assets
│   │   │   └── main.css      # Main CSS file
│   │   ├── components/       # Reusable Vue components
│   │   │   ├── Navbar.vue           # Navigation component
│   │   │   ├── ProtectedRoute.vue   # Route protection component
│   │   │   └── ToastNotification.vue # Toast notifications
│   │   ├── composables/      # Vue composables
│   │   │   ├── useAuth.js                    # Authentication logic
│   │   │   ├── useBudgetCategoryMonth.js     # Budget category month logic
│   │   │   ├── useBudgetQuery.js             # Budget query utilities
│   │   │   ├── useCategoryAssignment.js      # Category assignment logic
│   │   │   ├── useCategorySuggestions.js     # Category suggestion engine
│   │   │   ├── useChangeTracking.js          # Change tracking utilities
│   │   │   ├── useCSVPreview.js              # CSV preview functionality
│   │   │   ├── useFieldMapping.js            # Field mapping utilities
│   │   │   ├── useNavigationGuard.js         # Navigation guard logic
│   │   │   ├── useReconciliation.js          # Bank reconciliation logic (v2.0.0)
│   │   │   ├── useResizableTable.js          # Table resizing functionality
│   │   │   ├── useStatementDefaults.js       # Statement default values
│   │   │   ├── useStatementReconciliation.js # Statement reconciliation
│   │   │   ├── useTheme.js                   # Theme management
│   │   │   ├── useToast.js                   # Toast notifications
│   │   │   ├── useTransactionImport.js       # Transaction import logic
│   │   │   └── useUserPreferences.js         # User preferences management
│   │   ├── stores/           # Pinia stores
│   │   │   ├── account.js        # Account store
│   │   │   ├── actuals.js        # Actuals store (DB actuals system)
│   │   │   ├── auth.js           # Authentication store
│   │   │   ├── budget.js         # Budget store
│   │   │   ├── category.js       # Category store
│   │   │   ├── changeTracking.js # Change tracking store
│   │   │   ├── equity.js         # Equity tracking store
│   │   │   ├── messages.js       # Messages store
│   │   │   ├── reconciliation.js # Bank reconciliation store (v2.0.0)
│   │   │   ├── statement.js      # Statement reconciliation store
│   │   │   ├── transaction.js    # Transaction store
│   │   │   └── ui.js             # UI state store
│   │   ├── views/            # Page components
│   │   │   ├── AccountsView.vue         # Accounts management view
│   │   │   ├── BudgetReportView.vue     # Budget reporting view
│   │   │   ├── BudgetsView.vue          # Budget planning view
│   │   │   ├── CategoriesView.vue       # Categories management view
│   │   │   ├── ChartsView.vue           # Data visualization view
│   │   │   ├── DashboardView.vue        # Dashboard view
│   │   │   ├── DatabaseAdmin.vue        # Database administration view
│   │   │   ├── LoginView.vue            # User login view
│   │   │   ├── MonthlyActualsView.vue   # Monthly actuals view
│   │   │   ├── NetWorthView.vue         # Net worth and equity view
│   │   │   ├── ProfileView.vue          # User profile view
│   │   │   ├── ReconciliationView.vue   # Bank reconciliation view (v2.0.0)
│   │   │   ├── RegisterView.vue         # User registration view
│   │   │   ├── ReportsView.vue          # Reports and analytics view
│   │   │   ├── StatementsView.vue       # Statement reconciliation view
│   │   │   ├── TransactionImport.vue    # Transaction import view
│   │   │   ├── TransactionsView.vue     # Transaction management view
│   │   │   └── UserManagementView.vue   # User management view
│   │   ├── lib/              # Library utilities
│   │   │   └── http.js       # HTTP client configuration
│   │   ├── utils/            # Utility functions
│   │   │   └── debounce.js   # Debounce utility
│   │   ├── router/           # Vue Router configuration
│   │   │   └── index.js      # Router setup
│   │   ├── App.vue           # Root component
│   │   └── main.js           # Application entry point
│   ├── index.html            # HTML template
│   ├── package.json          # Frontend dependencies
│   ├── vite.config.js        # Vite configuration
│   ├── tailwind.config.js    # Tailwind CSS configuration
│   └── postcss.config.js     # PostCSS configuration
│
├── server/                    # Backend Express.js application
│   ├── controllers/          # Route controllers
│   │   ├── account-controller.js                 # Account controller
│   │   ├── account-field-mapping-controller.js   # Account field mapping controller
│   │   ├── actuals-controller.js                 # Actuals controller (DB actuals system)
│   │   ├── auto-search-keyword-controller.js     # Auto search keyword controller
│   │   ├── budget-controller.js                  # Budget controller
│   │   ├── category-controller.js                # Category controller
│   │   ├── equity-controller.js                  # Equity tracking controller
│   │   ├── messages_controller.js                # Messages controller
│   │   ├── reconciliation-controller.js          # Bank reconciliation controller (v2.0.0)
│   │   ├── reporting-controller.js               # Reporting controller
│   │   ├── statement-controller.js               # Statement import controller (v2.0.0)
│   │   ├── testing-controller.js                 # Testing controller
│   │   ├── transaction-controller.js             # Transaction controller
│   │   ├── user-controller.js                    # User controller
│   │   └── user-preferences-controller.js        # User preferences controller
│   ├── models/               # Database models
│   │   ├── account_dao.js                    # Account data access
│   │   ├── account_field_mapping_dao.js      # Account field mapping data access
│   │   ├── budget_category_month_dao.js      # Budget category month data access
│   │   ├── budget_dao.js                     # Budget data access
│   │   ├── category_dao.js                   # Category data access
│   │   ├── keyword_category_map_dao.js       # Keyword category mapping
│   │   ├── messages_dao.js                   # Messages data access
│   │   ├── reconciliation_dao.js             # Reconciliation data access (v2.0.0)
│   │   ├── statement_dao.js                  # Statement data access (v2.0.0)
│   │   ├── testing_dao.js                    # Testing data access
│   │   ├── transaction_dao.js                # Transaction data access
│   │   ├── user_dao.js                       # User data access
│   │   └── user_preferences_dao.js           # User preferences data access
│   ├── routes/               # API routes
│   │   ├── account-field-mapping-router.js   # Account field mapping routes
│   │   ├── account-router.js                 # Account routes
│   │   ├── actuals-router.js                 # Actuals routes (DB actuals system)
│   │   ├── auth-router.js                    # Authentication routes
│   │   ├── autoSearchKeywordRouter.js        # Auto search keyword routes
│   │   ├── budget-router.js                  # Budget routes
│   │   ├── category-router.js                # Category routes
│   │   ├── equity-routes.js                  # Equity tracking routes
│   │   ├── export-router.js                  # Data export routes
│   │   ├── main-router.js                    # Main routes
│   │   ├── reconciliation-router.js          # Bank reconciliation routes (v2.0.0)
│   │   ├── reporting-router.js               # Reporting routes
│   │   ├── statement-router.js               # Statement import routes (v2.0.0)
│   │   ├── test-router.js                    # Test routes
│   │   ├── transaction-router.js             # Transaction routes
│   │   ├── user-preferences-router.js        # User preferences routes
│   │   └── user-router.js                    # User routes
│   ├── services/             # Business logic services
│   │   ├── actuals-service.js                # Actuals calculation service
│   │   ├── budget-reporting-service.js       # Budget reporting service
│   │   ├── equity-service.js                 # Equity tracking service
│   │   ├── reconciliation/                   # Bank reconciliation services (v2.0.0)
│   │   │   ├── compositeMatcher.js           # Composite matching orchestrator
│   │   │   ├── exactMatcher.js               # Exact matching engine
│   │   │   ├── fuzzyMatcher.js               # Fuzzy matching engine
│   │   │   └── keywordMatcher.js             # Keyword matching engine
│   │   ├── reconciliationService.js          # General reconciliation service
│   │   ├── statement-mappers/                # Statement CSV mappers (v2.0.0)
│   │   │   ├── bankLedgerMapper.js           # Bank ledger CSV mapper
│   │   │   └── cardMapper.js                 # Card statement CSV mapper
│   │   └── statementReconciliationService.js # Statement reconciliation service
│   ├── middleware/           # Express middleware
│   │   ├── auth.js           # Authentication middleware
│   │   ├── daoSecurity.js    # DAO security middleware
│   │   ├── errorHandler.js   # Error handling middleware
│   │   ├── etag.js           # ETag middleware
│   │   ├── fileUpload.js     # File upload middleware
│   │   ├── logging.js        # Logging middleware
│   │   ├── security.js       # Security middleware
│   │   └── validation.js     # Validation middleware
│   ├── utils/                # Utility functions
│   │   ├── calculateSignedAmount.js  # Amount calculation utility
│   │   ├── daoGuards.js              # DAO security guards
│   │   ├── equity-reconciliation.js  # Equity reconciliation utility
│   │   ├── featureFlags.js           # Feature flag management
│   │   ├── formatDetector.js         # CSV format detection (v2.0.0)
│   │   ├── money.js                  # Money calculation utilities
│   │   └── statementNormalizer.js    # Statement description normalizer (v2.0.0)
│   ├── config/               # Configuration files
│   │   └── environment.js    # Environment configuration
│   ├── uploads/              # File uploads directory
│   ├── logs/                 # Application logs
│   ├── db/                   # Database files
│   │   └── index.js          # Database configuration
│   ├── migrations/           # Database migrations
│   │   ├── 2025-09-10_add_core_indexes.sql              # Core database indexes
│   │   ├── 2025-10-03_add_updated_at_tracking_v2.sql    # Updated tracking v2
│   │   ├── 2025-10-03_add_updated_at_tracking.sql       # Updated tracking
│   │   ├── 2025-10-11_add_system_categories_timezone.sql # System categories
│   │   ├── 2025-10-11_add_transaction_tracking.sql      # Transaction tracking
│   │   ├── 2025-10-11_migrate_legacy_budgets.sql        # Legacy budget migration
│   │   ├── 2025-10-11_refactor_budget_category_month.sql # Budget refactor
│   │   ├── 2025-10-12_fix_budget_actuals_view.sql       # Budget actuals fix
│   │   ├── 2025-10-24_add_reconciliation_tables.sql     # Bank reconciliation (v2.0.0)
│   │   ├── add_account_reconciliation_support.sql       # Account reconciliation
│   │   ├── add_actuals_views.sql                        # Actuals views
│   │   ├── add_dedupe_hash_to_transactions.sql          # Deduplication
│   │   ├── add_equity_account_support.sql               # Equity account support
│   │   ├── add_last_balance_update_to_accounts.sql      # Balance updates
│   │   ├── add_positive_is_credit_to_accounts.sql       # Credit accounts
│   │   ├── add_signed_amount_to_transactions.sql        # Signed amounts
│   │   ├── add_statement_locking_support.sql            # Statement locking
│   │   ├── add_user_id_constraints_fixed.sql            # User constraints
│   │   ├── add_user_preferences.sql                     # User preferences
│   │   ├── fix_account_classification.sql               # Account classification
│   │   ├── fix_reconciliation_integrity.sql             # Reconciliation integrity
│   │   ├── fix_signed_amount_calculations.sql           # Amount calculations
│   │   ├── fix_statement_actuals_view.sql               # Statement actuals
│   │   └── update_account_field_mappings.sql            # Field mappings
│   ├── scripts/              # Utility scripts
│   │   └── backup-db.mjs     # Database backup script
│   ├── test/                 # Test files
│   │   ├── auth.test.js      # Authentication tests
│   │   ├── messages.integration.test.js  # Messages integration tests
│   │   └── security/         # Security test suite
│   ├── app.js                # Express application
│   ├── package.json          # Backend dependencies
│   ├── database.sqlite       # SQLite database
│   ├── database.sqlite-shm   # SQLite shared memory
│   ├── database.sqlite-wal   # SQLite write-ahead log
│   ├── setup-env.js          # Environment setup script
│   └── test-production-config.js # Production config test
│
├── documentation/            # Project documentation
│   ├── BUDGET_ID_USAGE_ANALYSIS.md      # Budget ID usage analysis
│   ├── BUDGET_REFACTOR_COMPLETE.md      # Budget refactor completion
│   ├── BUDGET_REFACTOR_IMPLEMENTATION.md # Budget refactor implementation
│   ├── BUDGET_SYSTEM_FIX_SUMMARY.md     # Budget system fixes
│   ├── DASHBOARD_REDESIGN.md            # Dashboard redesign documentation
│   ├── EQUITY_IMPLEMENTATION.md         # Equity system implementation
│   ├── FIXES_APPLIED.md                 # Applied fixes documentation
│   ├── IMPLEMENTATION_SUMMARY.md        # Implementation summary
│   ├── PROJECT_COMPLETE_SUMMARY.md      # Project completion summary
│   ├── QUICK_START_EQUITY.md            # Equity quick start guide
│   ├── QUICK_START_NEW_BUDGET.md        # Budget quick start guide
│   ├── RECONCILIATION_SYSTEM_CHANGELOG.md # Bank reconciliation changelog (v2.0.0)
│   ├── RECONCILIATION_UX.md             # Reconciliation UX documentation
│   ├── misc/                            # Miscellaneous documentation
│   │   ├── ACTUALS_API_FIX.md           # Actuals API fixes
│   │   ├── ALL_FIXES_COMPLETE.md        # All fixes completion
│   │   ├── AUTH_AND_RATE_LIMIT_FIXES.md # Auth and rate limit fixes
│   │   ├── BUDGET_LOGIC_FIX.md          # Budget logic fixes
│   │   ├── CATEGORY_VIEW_MODE_FEATURE.md # Category view mode feature
│   │   ├── CHANGE_TRACKING_IMPLEMENTATION.md # Change tracking implementation
│   │   ├── COMPLETE_FIX_SUMMARY.md      # Complete fix summary
│   │   ├── CRITICAL_SECURITY_FIXES.md   # Critical security fixes
│   │   ├── CSS_RESPONSIVE_IMPROVEMENTS.md # CSS responsive improvements
│   │   ├── DEPLOYMENT_CHECKLIST.md      # Deployment checklist
│   │   ├── ENVIRONMENT_SETUP.md         # Environment setup guide
│   │   ├── PRODUCTION_DEPLOYMENT_GUIDE.md # Production deployment guide
│   │   ├── SECURITY_FIX_SUMMARY.md      # Security fix summary
│   │   └── STATEMENT_LOCKING_IMPLEMENTATION.md # Statement locking implementation
│   ├── storagereport/                   # Storage reports
│   └── summary/                         # Summary documentation
│       ├── backend/                     # Backend summaries
│       └── client/                      # Client summaries
│
├── rag_store/                # RAG (Retrieval Augmented Generation) store
│   ├── chunks.sqlite        # RAG chunks database
│   ├── index.bin            # RAG index file
│   ├── meta.json            # RAG metadata
│   └── summary_*.txt        # RAG summary files
│
├── database.sqlite           # Root database file
├── .gitignore               # Git ignore rules
├── package.json             # Root package.json (version 0.0.1)
├── package-lock.json        # Package lock file
├── CHANGELOG.md             # Detailed version history and change log
└── README.md                # Project documentation
```

## Key Features

### 1. Account Management ✅
- Create, view, edit, and delete financial accounts
- Automatic balance updates based on transactions
- Account type-specific handling (checking, savings, credit cards)
- Transaction type validation
- Balance history tracking
- Account field mapping for CSV imports

### 2. Transaction Management ✅
- Manual transaction entry with full CRUD operations
- CSV import support with flexible field mapping
- Automatic signed amount calculation
- Category assignment and management
- Account balance updates
- List all transactions with filtering and search
- Batch delete operations
- Duplicate detection and prevention

### 3. CSV Import System ✅
- Flexible field mapping for different CSV formats
- Preview before import with validation
- Duplicate detection using hash-based deduplication
- Category assignment during import
- Import history tracking
- Support for multiple file formats and account types
- Real-time preview with category suggestions

### 4. Category Management ✅
- Create and manage transaction categories
- Hierarchical category structure (parent/child relationships)
- Automatic category assignment based on keywords
- Category statistics and reporting
- Category budget integration
- Category suggestion engine with machine learning

### 5. Budget Planning ✅
- Annual budget planning with monthly breakdowns
- Category-based budget allocation
- Budget vs actual spending analysis
- Interactive budget grid with undo functionality
- Pattern-based budget distribution
- Budget burn rate calculations
- Bulk budget operations

### 6. Reporting and Analytics ✅
- Transaction filtering and search with date ranges
- Monthly spending summaries
- Category-based spending analysis
- Budget vs actual reports
- Account balance reports
- Custom date range filtering
- Export functionality

### 7. Data Visualization ✅
- Interactive charts and graphs
- Spending by category (pie charts)
- Monthly income vs expenses (bar charts)
- Account balances (doughnut charts)
- Top spending categories (horizontal bar charts)
- Chart.js integration with responsive design
- Dark mode support for charts

### 8. User Preferences ✅
- Persistent user preferences storage
- Category ordering preferences
- Expanded/collapsed category states
- UI state persistence
- Customizable settings

### 9. Category Suggestions ✅
- Intelligent category assignment
- Keyword-based matching
- Historical pattern analysis
- Amount-based suggestions
- User feedback integration
- Confidence scoring system
- Machine learning improvements

### 10. Database Administration ✅
- Database management interface
- Migration management
- Data export capabilities
- System health monitoring

### 11. Double-Entry Accounting & Equity Tracking ✅
- Automatic account classification (Assets, Liabilities, Equity)
- Real-time accounting equation enforcement (Assets = Liabilities + Equity)
- System-managed equity accounts for each user
- Net worth tracking and reconciliation
- One-click equity reconciliation from dashboard
- Comprehensive audit trail of equity adjustments
- Balance status monitoring (balanced vs. needs reconciliation)

### 12. Bank Reconciliation System ✅ **NEW in v2.0.0**
- **CSV Statement Import**: Auto-detect bank ledger and card statement formats
- **Three Matching Strategies**: Exact (100%), keyword (85-95%), fuzzy (75-90%) confidence matching
- **Session Management**: Track reconciliation runs with variance calculation
- **Manual Override**: Create and delete matches with real-time updates
- **Advanced Filtering**: Filter matches by confidence, rule, amount, and date
- **Session History**: View past reconciliation sessions with detailed statistics
- **Variance Tracking**: Real-time calculation of statement vs transaction differences
- **Idempotent Imports**: SHA-256 hash-based deduplication prevents duplicate imports
- **Three-Pane UI**: Interactive interface for manual matching with selection validation

### 13. DB Actuals System ✅
- Database-truth calculations for all financial data
- Feature flag controlled (FEATURE_STRICT_ACTUALS)
- SQL views for consistent calculations
- Legacy mode support for backward compatibility
- Performance optimized with atomic DB reads
- Real-time balance and category totals
- Budget vs actual variance calculations

## Development Setup

### Prerequisites
- Node.js (v18 or higher)
- npm (v8 or higher)
- SQLite3

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/simples.git
cd simples
```

2. Install dependencies:
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Start the development servers:
```bash
# Start the client (from client directory)
npm run dev

# Start the server (from server directory)
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Database Setup

The application uses SQLite as its database. The database file is located at `server/database.sqlite`.

### Initial Setup
1. The database will be automatically created on first run
2. Run migrations to set up the initial schema:
```bash
cd server
npm run migrate
```

### Database Schema
The application includes comprehensive database schema with tables for:
- Accounts (with balance tracking)
- Transactions (with deduplication)
- Categories (with hierarchy)
- Budgets (with period management)
- User Preferences (with JSON storage)
- Category Suggestions (with feedback)
- Import History (with tracking)
- Field Mappings (for CSV imports)

## API Documentation

The API documentation is available in the `documentation/API.md` file. It includes detailed information about:
- Available endpoints
- Request/response formats
- Authentication requirements
- Error handling

## Architecture

The application follows a modern web architecture with a clear separation between frontend and backend:

### Frontend (`client/`)
- **Framework**: Vue.js 3 with Composition API
- **State Management**: Pinia stores
- **Routing**: Vue Router
- **Styling**: Tailwind CSS with dark mode support
- **Charts**: Chart.js for data visualization
- **Build Tool**: Vite
- **Version**: `0.0.1` (as of 01/01/25)

### Backend (`server/`)
- **Framework**: Express.js with RESTful APIs
- **Database**: SQLite with DAO pattern
- **Authentication**: JWT-based with refresh tokens
- **File Upload**: Multer middleware for CSV imports
- **Version**: `0.0.1` (as of 01/01/25)

### Project Structure
- **Monorepo**: Workspace-based structure with independent versioning
- **Root Version**: `0.0.1` (as of 01/01/25) - fresh start on orphaned codebase
- **Version Tracking**: See [CHANGELOG.md](CHANGELOG.md) for detailed version history

For detailed architecture documentation, see `documentation/ARCHITECTURE.md`.

## Current Status

### ✅ Implemented Features
- Complete account management system with double-entry accounting
- Full transaction management with CSV import and deduplication
- Category management with hierarchy and smart suggestions
- Advanced budget planning and tracking with monthly breakdowns
- Comprehensive reporting and analytics with real-time calculations
- Data visualization with interactive charts and dark mode support
- User preferences system with persistent state management
- Category suggestion engine with machine learning
- Database administration tools with migration management
- Double-entry accounting with equity tracking and reconciliation
- **Bank Reconciliation System (v2.0.0)** - Complete statement import and matching workflow
- DB Actuals system with feature flag control
- JWT-based authentication with refresh tokens
- Comprehensive security features and rate limiting

### 🔄 In Development
- Enhanced machine learning for category suggestions
- Advanced reporting features
- Mobile responsiveness improvements
- Performance optimizations

### 🔒 Production Security Features ✅
- JWT-based authentication with access/refresh tokens
- HTTP-only cookie refresh tokens
- Comprehensive user data isolation
- Role-based access control (RBAC)
- Rate limiting for API and auth endpoints
- Secure file upload validation
- SQL injection prevention
- XSS protection with Content Security Policy
- CORS configuration for production
- Request logging and security monitoring
- Automated database backups
- User data export with streaming
- Database performance indexes

## Security Configuration

### Environment Variables

Create a `.env` file in the server directory with the following variables:

```bash
# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars
JWT_ISS=your-app-name
JWT_AUD=your-app-users
TOKEN_TTL_MIN=15
REFRESH_TTL_DAYS=7
REFRESH_COOKIE_NAME=refresh_token

# Frontend Configuration
FRONTEND_ORIGIN=http://localhost:5173

# Security Configuration
NODE_ENV=production
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MIN=15
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5

# File Upload Limits
MAX_FILE_SIZE_MB=5

# Logging
LOG_LEVEL=info

# Feature Flags
FEATURE_STRICT_ACTUALS=false
```

### Authentication Flow

#### Login
```bash
curl -X POST http://localhost:3050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

Response includes access token and sets HTTP-only refresh cookie.

#### Refresh Token
```bash
curl -X POST http://localhost:3050/api/auth/refresh \
  --cookie "refresh_token=your_refresh_token"
```

#### Logout
```bash
curl -X POST http://localhost:3050/api/auth/logout \
  --cookie "refresh_token=your_refresh_token"
```

#### Authenticated API Access
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3050/api/transactions
```

### Security Features

#### User Data Isolation
- All DAO methods enforce user_id validation
- Cross-user data access attempts return 403 Forbidden
- SQL queries include user_id filters by default

#### Rate Limiting
- General API: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes  
- File uploads: 5 uploads per minute
- Export endpoints: 10 exports per hour

#### File Upload Security
- Only CSV files accepted (MIME type validation)
- Maximum 5MB file size
- Binary content detection and rejection
- Suspicious filename pattern blocking
- Automatic file cleanup after processing

#### CORS Configuration
- Production: Only configured FRONTEND_ORIGIN allowed
- Development: Localhost variants allowed
- Credentials support for refresh cookies

### Database Performance

#### Core Indexes
The application includes optimized database indexes for:
- User-scoped queries (user_id columns)
- Date range filtering (transaction_date)
- Account and category lookups
- Transaction reconciliation
- Import tracking

Apply indexes:
```bash
npm run db:migrate
```

### Backup and Export

#### Database Backup
```bash
# Manual backup
npm run db:backup

# Automated backups with cleanup
node scripts/backup-db.mjs --cleanup
```

#### User Data Export
```bash
# Export all user data as JSON
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3050/api/export?format=json&table=all"

# Export transactions as CSV for date range
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3050/api/export?format=csv&table=transactions&startDate=2024-01-01&endDate=2024-12-31"
```

### Health Monitoring

Health check endpoint (no auth required):
```bash
curl http://localhost:3050/healthz
```

### Security Testing

Run security test suite:
```bash
npm run test:security
```

### Production Deployment Checklist

- [ ] Set strong JWT secrets (min 32 characters)
- [ ] Configure FRONTEND_ORIGIN for production domain
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Set up automated database backups
- [ ] Monitor security logs
- [ ] Test rate limiting behavior
- [ ] Verify user isolation works
- [ ] Test file upload restrictions

### Security Monitoring

Logs are written to `server/logs/` with different files for:
- `error-YYYY-MM-DD.log` - Application errors
- `security-YYYY-MM-DD.log` - Security events  
- `info-YYYY-MM-DD.log` - Request logs
- `performance-YYYY-MM-DD.log` - Slow request monitoring

All logs include correlation IDs for tracking requests across services.

## DB Actuals System (Feature Flag: FEATURE_STRICT_ACTUALS)

The DB Actuals system provides database-truth calculations for all financial "actuals" (balances, category totals, budget progress, statement reconciliation). This system ensures data consistency and eliminates frontend calculation discrepancies.

### Feature Flag Configuration

**Default**: `FEATURE_STRICT_ACTUALS=false` (OFF for stability)

```bash
# Enable DB actuals (production-ready)
FEATURE_STRICT_ACTUALS=true

# Disable DB actuals (legacy client-side calculations)
FEATURE_STRICT_ACTUALS=false
```

### Behavior Modes

#### Legacy Mode (Flag OFF or `mode=legacy`)
- Client-side `.reduce()` and computed totals in Vue components
- Server-side balance calculations in `reporting-controller.js`
- Existing `calculateSignedAmount.js` logic
- **Rollback**: Set flag to `false` to restore legacy behavior

#### Strict Mode (Flag ON or `mode=strict`)
- All actuals from SQL views with atomic DB reads
- No UI/store reductions or JS recomputations
- DB views handle transaction signing and aggregation
- Frontend uses `/api/actuals/*` endpoints exclusively

### API Endpoints

#### Account Actuals
```bash
GET /api/actuals/accounts?ids=123,456&from=2025-01-01&to=2025-01-31&mode=legacy|strict
```

**Response:**
```json
{
  "mode": "strict",
  "data": [
    {
      "account_id": "123",
      "account_name": "Checking",
      "account_type": "checking",
      "current_balance": 1000.00,
      "transaction_count": 45,
      "balance_sum": 950.00,
      "credit_sum": 2500.00,
      "debit_sum": 1550.00,
      "reconciled_count": 40,
      "reconciled_sum": 900.00
    }
  ]
}
```

#### Category Actuals
```bash
GET /api/actuals/categories?ids=789&from=2025-01-01&to=2025-01-31
```

**Response:**
```json
{
  "mode": "strict", 
  "data": [
    {
      "category_id": "789",
      "category_name": "Groceries",
      "parent_category_id": null,
      "transaction_count": 12,
      "net_amount": -450.00,
      "income_amount": 0.00,
      "expense_amount": 450.00
    }
  ]
}
```

#### Budget Actuals
```bash
GET /api/actuals/budgets?ids=budget-123
```

**Response:**
```json
{
  "mode": "strict",
  "data": [
    {
      "budget_id": "budget-123",
      "category_id": "789",
      "period_start": "2025-01-01",
      "period_end": "2025-01-31", 
      "budgeted_amount": 500.00,
      "actual_amount": 450.00,
      "actual_income": 0.00,
      "actual_expense": 450.00,
      "transaction_count": 12,
      "variance": 50.00
    }
  ]
}
```

#### Statement Actuals
```bash
GET /api/actuals/statements?ids=stmt-456
```

**Response:**
```json
{
  "mode": "strict",
  "data": [
    {
      "statement_id": "stmt-456",
      "account_id": "123",
      "period_start": "2025-01-01",
      "period_end": "2025-01-31",
      "opening_balance": 1000.00,
      "closing_balance": 950.00,
      "calculated_movement": -50.00,
      "total_transactions": 25,
      "reconciled_transactions": 20,
      "reconciled_amount": -40.00,
      "unreconciled_amount": -10.00,
      "reconciliation_percentage": 80.00
    }
  ]
}
```

#### Feature Flags Status
```bash
GET /api/actuals/feature-flags
```

**Response:**
```json
{
  "strictActuals": true
}
```

### Database Views

The system creates read-only SQL views for consistent calculations:

- `v_amounts_normalized` - Canonical signed amounts matching `calculateSignedAmount.js`
- `v_account_actuals` - Account balances and transaction counts
- `v_category_actuals` - Category income/expense totals
- `v_budget_actuals` - Budget vs actual with variance calculations
- `v_statement_actuals` - Statement reconciliation and movement data

### Frontend Integration

#### Actuals Store
```javascript
import { useActualsStore } from '@/stores/actuals';

const actualsStore = useActualsStore();

// Initialize feature flags
await actualsStore.initializeFeatureFlags();

// Fetch account actuals (uses feature flag to determine mode)
await actualsStore.fetchAccountActuals();

// Force refresh after data changes
await actualsStore.refreshActuals(['accounts', 'categories']);
```

#### Component Integration
Components automatically switch between legacy and strict mode:

```javascript
// DashboardView.vue, StatementsView.vue etc.
const totalBalance = computed(() => {
  // Use DB actuals if strict mode is enabled
  if (actualsStore.strictActualsEnabled) {
    return actualsStore.totalAccountBalance;
  }
  
  // Legacy mode: client-side calculation
  return accountSummaries.value.reduce((sum, a) => sum + a.balance, 0);
});
```

### Migration & Rollback

#### Apply DB Views
```bash
# Run migration to create SQL views
sqlite3 server/database.sqlite < server/migrations/add_actuals_views.sql
```

#### Enable Feature
```bash
# Set environment variable
FEATURE_STRICT_ACTUALS=true

# Restart server
npm restart
```

#### Rollback
```bash
# Disable feature flag
FEATURE_STRICT_ACTUALS=false

# Restart server - system reverts to legacy calculations
npm restart
```

### Testing

Comprehensive test suite ensures:
- **Signing Parity**: SQL views match `calculateSignedAmount.js` exactly
- **Legacy Match**: `mode=legacy` outputs identical to current system
- **Cross-View Equality**: Same data produces identical totals across views
- **Performance**: p50 response time < 150ms

```bash
# Run actuals tests
npm test -- actuals.test.js

# Run security tests
npm run test:security

# Run authentication tests
npm run test:auth
```

### Guardrails

✅ **Zero Breaking Changes**: All existing routes and responses unchanged  
✅ **Additive Only**: New endpoints, views, and optional fields only  
✅ **Stable Contracts**: No response shape changes or write-on-read  
✅ **User Scoped**: All queries filter by `user_id` for data isolation  
✅ **Rollback Ready**: Flag OFF restores exact legacy behavior  

## Bank Reconciliation System (v2.0.0) 🆕

The Bank Reconciliation System provides a comprehensive solution for matching internal transactions against imported bank statement lines, ensuring financial accuracy and identifying discrepancies.

### Features

**Statement Import**
- Auto-detect CSV format (bank ledger or card statement)
- Manual format override via `?format=bank|card` query parameter
- SHA-256 hash-based deduplication prevents duplicate imports
- Normalized signed amounts for consistent balance calculations
- Support for instrument ID (card numbers) and processed dates

**Matching Strategies**
1. **Exact Matching** (100% confidence)
   - Amount tolerance: ±$0.005 (configurable)
   - Date tolerance: ±1 day (configurable)
   - Same-sign enforcement (debits match debits, credits match credits)
   - Optional instrument ID matching for card transactions

2. **Keyword Matching** (85-95% confidence)
   - Extracts merchant/bank tokens from descriptions
   - Calculates token overlap percentage
   - Confidence based on overlap ratio and token count

3. **Fuzzy Matching** (75-90% confidence)
   - Uses `fast-fuzzy` library for description similarity
   - Normalized descriptions (lowercase, punctuation removed)
   - Configurable similarity threshold (default: 85%)

**Session Management**
- Create reconciliation sessions for specific accounts and date ranges
- Track period start/end dates and closing balances
- Calculate variance: `(closing_balance - opening_balance) - matched_transaction_sum`
- Session history with detailed statistics (match count, confidence, auto/manual splits)
- Close sessions to lock reconciliation state

**Manual Override**
- Create manual matches between transactions and statement lines
- Delete incorrect matches with real-time updates
- Three-pane UI: matched pairs, unmatched transactions, unmatched statement lines
- Visual confidence indicators and match rule display

**Advanced Filtering**
- Filter matches by confidence range (min/max)
- Filter by matching rule (exact, keyword, fuzzy, manual)
- Filter by matched_by (auto or manual)
- Filter by amount range and date range
- Session list filtering by date range and closed status

### API Endpoints

#### Statement Import
```bash
# Preview CSV before import
POST /api/statements/preview
Content-Type: multipart/form-data
- file: CSV file
- account_id: target account ID

# Import statement (auto-detect or override format)
POST /api/statements/import?format=bank|card
Content-Type: multipart/form-data
- file: CSV file
- account_id: target account ID
- period_start: statement period start date
- period_end: statement period end date
- closing_balance: statement closing balance

# Get statement imports
GET /api/statements

# Get statement lines
GET /api/statements/:id/lines

# Delete statement import
DELETE /api/statements/:id
```

#### Reconciliation Sessions
```bash
# Create reconciliation session
POST /api/recon/sessions
{
  "account_id": "123",
  "period_start": "2025-01-01",
  "period_end": "2025-01-31",
  "closing_balance": 1000.00,
  "params": {
    "amount_tol": 0.005,
    "date_tol_days": 1,
    "fuzzy_threshold": 85,
    "use_instrument": true
  }
}

# Get session with summary
GET /api/recon/sessions/:id

# Get all sessions (with filters)
GET /api/recon/sessions?date_from=2025-01-01&date_to=2025-12-31&closed_only=true&limit=50

# Run auto-matching (exact, keyword, fuzzy)
POST /api/recon/sessions/:id/auto-match

# Close session
POST /api/recon/sessions/:id/close

# Get session matches (with filters)
GET /api/recon/sessions/:id/matches?min_confidence=80&max_confidence=100&rule=exact&limit=100
```

#### Manual Matching
```bash
# Create manual match
POST /api/recon/matches
{
  "session_id": "session-123",
  "transaction_id": "txn-456",
  "statement_line_id": "line-789"
}

# Delete match
DELETE /api/recon/matches/:id

# Get unmatched transactions
GET /api/recon/unmatched-transactions?account_id=123&from=2025-01-01&to=2025-01-31

# Get unmatched statement lines
GET /api/recon/unmatched-statement-lines?account_id=123&from=2025-01-01&to=2025-01-31
```

### Database Schema

**StatementImports**
- Tracks imported CSV files with SHA-256 hash deduplication
- Stores file metadata, import timestamp, and line count

**StatementLines**
- Normalized statement line data with signed amounts
- Includes bank FITID, instrument ID, processed date
- Dedupe hash for line-level deduplication
- Raw row JSON for audit trail

**ReconciliationSessions**
- Session metadata with account, date range, closing balance
- Configurable matching parameters (tolerances, thresholds)
- Status tracking (active/closed)

**ReconciliationMatches**
- Links transactions to statement lines
- Tracks confidence score, matching rule, and matched_by (auto/manual)
- Cascade delete on transaction/statement line deletion

### Frontend Integration

**Reconciliation Store** (`/client/src/stores/reconciliation.js`)
- Manages sessions, matches, and unmatched items
- Real-time variance calculation
- Session summary with statistics

**Reconciliation Composable** (`/client/src/composables/useReconciliation.js`)
- Wraps store for component use
- Provides reactive state and actions

**Reconciliation View** (`/client/src/views/ReconciliationView.vue`)
- Three-pane layout for matching workflow
- Session creation and management
- Manual match creation/deletion
- Real-time updates and visual feedback

### Usage Example

1. **Import Statement**
   - Navigate to Reconciliation view
   - Upload bank CSV file
   - System auto-detects format and previews data
   - Confirm import with account, date range, and closing balance

2. **Create Session**
   - Select account and date range
   - Enter closing balance from bank statement
   - Click "Start Reconciliation"

3. **Auto-Match**
   - System runs exact, keyword, and fuzzy matching
   - Displays matched pairs with confidence scores
   - Shows unmatched transactions and statement lines

4. **Manual Review**
   - Review auto-matched pairs
   - Delete incorrect matches
   - Manually match remaining items by selecting from unmatched lists

5. **Close Session**
   - Review variance (should be near zero)
   - Close session to lock reconciliation state
   - View session history for audit trail

### Migration

Apply the reconciliation schema:
```bash
sqlite3 server/database.sqlite < server/migrations/2025-10-24_add_reconciliation_tables.sql
```

### Version History

See `documentation/RECONCILIATION_SYSTEM_CHANGELOG.md` for detailed version history and implementation notes.

## Double-Entry Accounting & Equity System

The application implements proper double-entry accounting principles with automatic equity tracking to ensure financial accuracy and completeness.

### Accounting Equation Enforcement

**Assets = Liabilities + Equity**

The system automatically maintains this equation through:
- Account classification (Assets, Liabilities, Equity)
- System-managed equity accounts
- Real-time balance monitoring
- One-click reconciliation

### Account Classification

**Assets** (positive balances increase net worth)
- Checking accounts
- Savings accounts  
- Investment accounts
- Cash accounts

**Liabilities** (positive balances decrease net worth)
- Credit cards
- Loans
- Mortgages

**Equity** (system-managed)
- Owner's Equity (auto-created and maintained)

### Net Worth Dashboard

Access via Reports → Net Worth:
- Real-time net worth calculation
- Balance status (balanced vs. needs reconciliation)
- One-click "Fix Now" button for reconciliation
- Detailed accounting equation breakdown
- Account classification view

### API Endpoints

```bash
# Check accounting equation status
GET /api/equity/equation

# Reconcile equity account
POST /api/equity/reconcile
{
  "reason": "Manual reconciliation"
}

# Get equity adjustment history
GET /api/equity/adjustments
```

### CLI Tools

```bash
# Audit all users for balance issues
node server/utils/equity-reconciliation.js audit

# Reconcile all users
node server/utils/equity-reconciliation.js reconcile

# Reconcile specific user
node server/utils/equity-reconciliation.js reconcile-user <user_id>
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 