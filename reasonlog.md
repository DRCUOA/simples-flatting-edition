
## Reason Log

## Purpose

This document records the intent and reasoning behind each change made to this project. It provides context for why decisions were made, what problems were solved, and what goals were achieved. Each entry includes the version considered, the change made, the intent behind it, and the detailed reasoning. This log serves as a decision audit trail, helping developers understand not just what changed, but why it changed and what was considered at the time.

The document content is captured in two different formats, one optimized for human consumption and the other for LLM consumption. This refers to structure and format only; it is very important to maintain the same content in both formats.

**Usage Note:** When this template is referenced as a dependency (e.g., `@reasonlog.md`), use the structure and format shown in the examples below. Replace example data with actual project reasoning, ensuring both the tabular (human-readable) and JSON (LLM-readable) formats contain identical information.

**Legend:**
- **Intent** = The goal or objective behind the change
- **Reasoning** = Detailed explanation of why this approach was chosen
- **Problems Solved** = Specific issues addressed by this change
- **Goals Achieved** = Outcomes or benefits realized

**Quick Navigation:**
- **[LLM Version](#llm-version)** - Structured JSON data optimized for agent/LLM ingestion
- **[Human Reader Focused Version](#version-history)** - Tabular format optimized for human scanning

## Version History

**Human Reader Format, tabular for optimized human scanning**

| Version | Date | Component | Intent | Reasoning | Problems Solved | Goals Achieved |
|---------|------|-----------|--------|-----------|-----------------|----------------|
| 3.0.13 | 12/26/25 | views | Display reconciliation match status for transactions | Users need visual indication when transactions are matched/locked for reconciliation purposes to prevent accidental deletion attempts. Added "Matched" badge inline with transaction description and in status column. Uses same logic as delete transaction check (active ReconciliationMatches records) to ensure consistency. Badge styled with green background to indicate protected status. | No visual indication of reconciliation match status; users couldn't tell which transactions were locked; delete attempts failed without clear reason | Clear visual indicator for matched transactions; prevents confusion when deleting transactions; consistent with delete transaction logic |
| 3.0.13 | 12/26/25 | models | Include reconciliation match status in transaction queries | Transaction list needs reconciliation match information to display status indicators. Modified getAllTransactions to LEFT JOIN ReconciliationMatches table and add has_reconciliation_match field (1 if active match exists, 0 otherwise). Uses same criteria as delete check: transaction_id match, user_id match, and active=1. This ensures frontend has all necessary data without additional API calls. | Transaction queries didn't include reconciliation match status; frontend would need separate API calls to check match status; inefficient data fetching | Reconciliation match status included in transaction data; single query provides all needed information; efficient data loading |
| 3.0.12 | 12/24/25 | views | Add PDF export functionality for reports | Users need to export financial reports as PDF documents for sharing, archiving, and offline reference. Created pdfExport.js utility that generates professional PDF reports with cashflow statements and Sankey diagrams. Uses jsPDF for PDF generation and html2canvas for capturing Sankey diagrams as images. Reports include detailed income/expense breakdowns by category hierarchy and monthly flow diagrams. PDFs are formatted for A4 paper with proper pagination and landscape orientation for diagrams. | No way to export reports as PDF; users couldn't share or archive financial reports; offline access to reports not available | PDF export functionality for reports; professional report formatting; Sankey diagrams included in PDFs; shareable and archivable reports |
| 3.0.12 | 12/24/25 | utils | Create PDF export and Sankey generation utilities | PDF export requires specialized utilities for generating PDF documents and capturing Sankey diagrams. Created pdfExport.js for PDF generation with cashflow statements and Sankey diagram pages. Created sankeyGenerator.js to generate Sankey data structure for any date range, reusable across FlowView and PDF export. Both utilities handle date formatting, currency formatting, and proper data structure preparation. | No PDF export capability; Sankey data generation logic duplicated; no reusable utilities for report generation | Centralized PDF export logic; reusable Sankey data generation; consistent report formatting; improved code organization |
| 3.0.12 | 12/24/25 | dependencies | Add PDF generation libraries | PDF export requires jsPDF for PDF document creation and html2canvas for capturing DOM elements (Sankey diagrams) as images. These libraries provide production-ready PDF generation with proper formatting, pagination, and image embedding capabilities. | No PDF generation libraries available; no way to capture Sankey diagrams as images | Professional PDF generation support; image capture for Sankey diagrams; production-ready libraries |
| 3.0.12 | 12/24/25 | views | Fix FlowView income/expense calculation consistency | FlowView was using category-type-based classification which didn't match the transaction-sign-based approach used in Reports and Transactions views. This caused discrepancies in totals and confusing visualizations. Fixed to use transaction sign (positive = income, negative = expense) consistently. Root category type now determined by actual income vs expense totals rather than category_type field. Transfer exclusion updated to match Reports view (only exclude "Internal-Transfers" category, not all transfers). | FlowView totals didn't match Reports view; inconsistent income/expense classification; transfer exclusion too broad; confusing Sankey visualizations | Consistent transaction-sign-based classification; FlowView totals match Reports view; accurate Sankey diagrams; improved data consistency |
| 3.0.12 | 12/24/25 | views | Fix ReportsView net income and grand totals calculation | ReportsView was calculating net income and grand totals incorrectly by only summing from income/expense root sections. However, income roots can have expense transactions and expense roots can have income transactions (e.g., refunds). Fixed getAllRootsMonthTotal to sum across all roots correctly, and updated grandTotalIncome/grandTotalExpense to include all income/expense transactions regardless of root classification. This ensures totals match the transaction-sign-based reality. | Net income calculation incorrect; grand totals missing transactions from opposite root types; totals didn't match actual transaction sums | Accurate net income calculation; correct grand totals including all transactions; totals match transaction reality |
| 3.0.12 | 12/24/25 | components | Update Sankey diagram color coding logic | Sankey diagram color coding was based on isIncomeDescendant flag which didn't accurately reflect root category type. Updated to use rootCategoryType field which is determined by actual income vs expense totals. Net cashflow node colors remain variable (green for profit, red for loss), but category nodes now use fixed colors based on root category type (income = green, expense = red) for organizational clarity. | Sankey colors didn't match actual category classification; confusing color coding | Accurate color coding based on root category type; consistent visual representation; improved diagram clarity |
| 3.0.12 | 12/24/25 | documentation | Document income/expense classification challenges | The application uses transaction-sign-based classification but categories are organized hierarchically, creating conceptual mismatches. Added options.md explaining the technical reality, user confusion points, and potential solutions. Documented why income transactions can appear in expense categories and vice versa. Added TRANSFER_EXCLUSION_CLARIFICATION.md explaining transfer exclusion logic consistency. | No documentation explaining classification approach; user confusion about income in expense categories; unclear transfer exclusion logic | Clear documentation of classification approach; explanation of user confusion points; transfer exclusion logic documented |
| 3.0.11 | 12/19/25 | stores | Fix bulk category assignment UI refresh issue | The bulk category assignment feature wasn't updating the UI after batch updates because fetchTransactions() was blocked by cache (30-second timeout) and loading state checks. When batchUpdateTransactions set loading=true, the subsequent fetchTransactions() call would return early due to the loading check, preventing data refresh. Fixed by adding forceRefresh parameter to fetchTransactions that bypasses both cache and loading checks when explicitly requested. Applied to batchUpdateTransactions, createTransaction, updateTransaction, and uploadTransactions to ensure UI always reflects latest data. | Bulk category assignment not updating UI after completion; users had to manually reload page to see changes; cache preventing refresh within 30 seconds; loading state blocking refresh after batch operations | Bulk category assignment now immediately updates UI; no manual page reload needed; consistent refresh behavior across all transaction update operations; improved user experience |
| 3.0.11 | 12/19/25 | views | Add visual flow chart showing income/expense breakdown | Users needed a visual representation of how income flows into expenses and net profit/loss, similar to Sankey diagrams used in financial planning tools. Created FlowView with month/year selectors to show income and expense categories in a hierarchical flow diagram. Uses Plotly.js for professional Sankey visualization with proper node positioning and link routing. Shows Net Income on left, flowing to income categories (green) and expense categories (red) on right, with parent-to-child category breakdowns. Excludes transfer transactions and transfer categories as they net to zero. | No visual representation of financial flow; difficult to understand income/expense relationships; no way to see category hierarchy breakdown visually | Visual flow chart showing income/expense relationships; intuitive Sankey diagram with color coding; category hierarchy visualization; improved financial understanding |
| 3.0.11 | 12/19/25 | components | Create reusable Sankey diagram component | Needed a reusable component for rendering Sankey diagrams using Plotly.js. The component handles node positioning, link routing, color coding (green for income descendants, red for expense descendants), and interactive features. Supports dark mode and responsive layout. Uses Plotly's built-in Sankey type which handles complex layout calculations automatically. | Custom SVG Sankey implementation was unreliable and complex; needed professional-grade visualization library | Reliable Sankey diagram rendering using Plotly.js; proper node/link positioning; interactive hover effects; professional visualization quality |
| 3.0.11 | 12/19/25 | dependencies | Add Plotly.js for Sankey diagram support | Chart.js (already in project) doesn't support Sankey diagrams natively. Plotly.js provides robust, production-ready Sankey diagram support with automatic layout, interactive features, and excellent documentation. Used plotly.js-dist-min for smaller bundle size. | No suitable charting library for Sankey diagrams; custom implementation unreliable | Professional Sankey diagram support; smaller bundle size with minified version; proven visualization library |
| 3.0.11 | 12/19/25 | navigation | Add Flow Chart to navigation menu | Users need easy access to the new Flow Chart view. Added "Flow Chart" link to both desktop "More" dropdown menu and mobile navigation menu for consistent access across devices. | Flow Chart view not easily discoverable; no navigation path to new feature | Flow Chart accessible from main navigation; consistent desktop and mobile experience |
| 3.0.11 | 12/19/25 | router | Add route for Flow Chart view | New Flow Chart view needs a route definition. Added /flow route that renders FlowView component, placed logically after reports routes in the router configuration. | No route defined for Flow Chart view; feature not accessible | Flow Chart view accessible at /flow route; proper route organization |
| 3.0.10 | 12/18/25 | controllers | Fix CSV import failures and centralize date operations | CSV imports were failing because column headers with spaces (e.g., "  amount  ") weren't being trimmed, causing mapping mismatches. Fixed by adding column name trimming to CSV parser. Also refactored all date operations to use only utility functions (normalizeAppDate) instead of wrapper functions, ensuring consistency. Removed unused imports (accountFieldMappingDAO, validateRequiredFields, validateNumber, validateDate, validateArray, parseNumber, isDateValid) and dead code (formattedTransactions that just returned same data). | CSV import failing with "Empty date" errors due to column name spacing; date operations using wrapper functions instead of direct utility calls; unused imports cluttering codebase; dead code reducing maintainability | CSV imports now work correctly with spaced column names; all date operations centralized through utility functions; cleaner codebase with no unused imports; improved maintainability |
| 3.0.9 | 12/17/25 | controllers | Fix syntax error preventing net balance history endpoint from functioning | The reporting-controller promise chain had a syntax error where `});` on line 811 closed both the callback and promise chain prematurely, preventing proper error handling. Additionally, there was a duplicate closing brace. This caused the net balance history endpoint to fail with "missing ) after argument list" error. Fixed by changing `});` to `})` and properly chaining the `.catch()` handler. | Syntax error causing "missing ) after argument list" error; promise chain not properly structured; error handlers not correctly chained; duplicate closing brace | Net balance history endpoint now functions correctly; proper promise chain error handling; code syntax validated |
| 3.0.8 | 12/10/24 | architecture | Enforce MVC separation by moving all database access to DAO layer | Controllers were violating MVC principles by accessing the database directly via getConnection() and db.get()/db.all() calls. This refactoring ensures all database queries are contained within DAO files, making the codebase more maintainable, testable, and aligned with separation of concerns. Controllers now exclusively handle business logic and delegate data access to the DAO layer. | Violation of MVC architecture principles; poor code organization; difficult to test controllers with direct DB access; mixing business logic with data access logic | Proper MVC separation; improved code maintainability; easier unit testing; better separation of concerns; consistent architecture pattern |
| 3.0.8 | 12/10/24 | models | Add missing DAO methods for reconciliation operations | Added getTransactionWithOwnershipCheck() and getTransactionDetails() to reconciliation_dao.js to support the refactored controller. These methods encapsulate complex queries involving transactions, reconciliation matches, linked transactions, import records, and statement information. | Reconciliation controller had complex nested queries that needed to be moved to DAO; transaction ownership validation logic was embedded in controller | Centralized reconciliation data access logic; reusable DAO methods; cleaner controller code |
| 3.0.8 | 12/10/24 | models | Add duplicate checking methods to transaction DAO | Added checkLegacyTransactionExists() and checkTransactionExistsByDedupeHash() to transaction_dao.js to support duplicate detection during CSV/OFX imports. These methods replace direct DB queries in the transaction controller. | Transaction controller had duplicate checking queries embedded directly; needed to support both legacy and new transaction ID schemes | Centralized duplicate checking logic; support for legacy and new transaction formats; cleaner import flow |
| 3.0.8 | 12/10/24 | models | Create reporting DAO for all reporting queries | Created new reporting_dao.js with 8 query methods (getMonthlySummary, getAllCategoriesWithRoots, getTransactionActuals, getAccountBalancesAsOf, getAccountsByUser, getTransactionsForAccounts, getStartingBalances, getAllTransactionsSum) to centralize all reporting database operations. | Reporting controller had extensive direct database queries mixed with business logic; complex queries needed proper encapsulation | Centralized reporting data access; improved query reusability; cleaner reporting controller; easier to optimize queries |
| 3.0.8 | 12/10/24 | models | Add batch preferences method to user preferences DAO | Added batchSetPreferences() method to user_preferences_dao.js to support batch preference updates. This method uses transactions to ensure atomicity when updating multiple preferences. | User preferences controller had batch operation logic with direct DB access; needed transaction support for atomic updates | Centralized batch preference logic; transaction-based atomic updates; cleaner controller code |
| 3.0.7 | 11/25/25 | scripts | Enable full-stack development mode with single command | Added dev:full script that sets DEV_FULL environment variable to enable both backend and frontend servers simultaneously. This simplifies the development workflow by providing a single command to start the entire application stack. | Need to manually start backend and frontend separately; no clear indication when both servers are running | Single command for full-stack development; improved developer experience |
| 3.0.7 | 11/25/25 | server | Improve server startup visibility and ensure database readiness | Replaced verbose console.log statements with a structured status monitor footer that displays system status, ports, and environment information. Added database initialization wait logic to ensure database is ready before server accepts connections. This provides better visibility into system state and prevents race conditions during startup. | Verbose startup logging cluttered console; no clear system status overview; potential race conditions with database initialization | Clean, structured status display; guaranteed database readiness before server start; improved operational visibility |
| 3.0.7 | 11/25/25 | frontend | Reduce console noise during development | Removed the log-config plugin from vite.config.js that printed verbose startup information. This reduces console clutter and focuses attention on the structured status monitor footer displayed by the backend server. | Excessive console output during frontend startup; redundant logging | Cleaner development console; focused status information |
| 3.0.7 | 11/25/25 | utilities | Provide centralized status monitoring display | Created footer utility module that generates a formatted status monitor display showing backend/frontend status, ports, environment, and system information. This centralizes status display logic and provides consistent formatting across the application. | No centralized way to display system status; inconsistent status reporting | Centralized status display utility; consistent formatting; improved operational awareness |
| 3.0.7 | 11/25/25 | documentation | Establish standard changelog and reasonlog templates | Added example changelog and reasonlog templates to documentation to serve as reference for maintaining project change history. These templates follow established formats (Keep a Changelog, semantic versioning) and provide both human-readable and LLM-optimized formats. | No standardized format for tracking changes and reasoning; inconsistent documentation practices | Standard templates for change tracking; improved documentation consistency |

---

## LLM Version

**Optimized for agent/LLM ingestion - structured data format**

```json
{
  "project": "simples",
  "versioning": "semantic",
  "format": "reasonlog",
  "versions": [
    {
      "version": "3.0.12",
      "date": "12/24/25",
      "reasons": [
        {
          "component": "views",
          "intent": "Add PDF export functionality for reports",
          "reasoning": "Users need to export financial reports as PDF documents for sharing, archiving, and offline reference. Created pdfExport.js utility that generates professional PDF reports with cashflow statements and Sankey diagrams. Uses jsPDF for PDF generation and html2canvas for capturing Sankey diagrams as images. Reports include detailed income/expense breakdowns by category hierarchy and monthly flow diagrams. PDFs are formatted for A4 paper with proper pagination and landscape orientation for diagrams.",
          "problemsSolved": [
            "No way to export reports as PDF",
            "Users couldn't share or archive financial reports",
            "Offline access to reports not available"
          ],
          "goalsAchieved": [
            "PDF export functionality for reports",
            "Professional report formatting",
            "Sankey diagrams included in PDFs",
            "Shareable and archivable reports"
          ],
          "files": ["client/src/views/ReportsView.vue", "client/src/utils/pdfExport.js"],
          "alternativesConsidered": [],
          "dependencies": ["jspdf", "html2canvas"]
        },
        {
          "component": "utils",
          "intent": "Create PDF export and Sankey generation utilities",
          "reasoning": "PDF export requires specialized utilities for generating PDF documents and capturing Sankey diagrams. Created pdfExport.js for PDF generation with cashflow statements and Sankey diagram pages. Created sankeyGenerator.js to generate Sankey data structure for any date range, reusable across FlowView and PDF export. Both utilities handle date formatting, currency formatting, and proper data structure preparation.",
          "problemsSolved": [
            "No PDF export capability",
            "Sankey data generation logic duplicated",
            "No reusable utilities for report generation"
          ],
          "goalsAchieved": [
            "Centralized PDF export logic",
            "Reusable Sankey data generation",
            "Consistent report formatting",
            "Improved code organization"
          ],
          "files": ["client/src/utils/pdfExport.js", "client/src/utils/sankeyGenerator.js"],
          "alternativesConsidered": [],
          "dependencies": ["jspdf", "html2canvas"]
        },
        {
          "component": "dependencies",
          "intent": "Add PDF generation libraries",
          "reasoning": "PDF export requires jsPDF for PDF document creation and html2canvas for capturing DOM elements (Sankey diagrams) as images. These libraries provide production-ready PDF generation with proper formatting, pagination, and image embedding capabilities.",
          "problemsSolved": [
            "No PDF generation libraries available",
            "No way to capture Sankey diagrams as images"
          ],
          "goalsAchieved": [
            "Professional PDF generation support",
            "Image capture for Sankey diagrams",
            "Production-ready libraries"
          ],
          "files": ["client/package.json"],
          "alternativesConsidered": [],
          "dependencies": ["jspdf", "html2canvas"]
        },
        {
          "component": "views",
          "intent": "Fix FlowView income/expense calculation consistency",
          "reasoning": "FlowView was using category-type-based classification which didn't match the transaction-sign-based approach used in Reports and Transactions views. This caused discrepancies in totals and confusing visualizations. Fixed to use transaction sign (positive = income, negative = expense) consistently. Root category type now determined by actual income vs expense totals rather than category_type field. Transfer exclusion updated to match Reports view (only exclude \"Internal-Transfers\" category, not all transfers).",
          "problemsSolved": [
            "FlowView totals didn't match Reports view",
            "Inconsistent income/expense classification",
            "Transfer exclusion too broad",
            "Confusing Sankey visualizations"
          ],
          "goalsAchieved": [
            "Consistent transaction-sign-based classification",
            "FlowView totals match Reports view",
            "Accurate Sankey diagrams",
            "Improved data consistency"
          ],
          "files": ["client/src/views/FlowView.vue"],
          "alternativesConsidered": [],
          "dependencies": []
        },
        {
          "component": "views",
          "intent": "Fix ReportsView net income and grand totals calculation",
          "reasoning": "ReportsView was calculating net income and grand totals incorrectly by only summing from income/expense root sections. However, income roots can have expense transactions and expense roots can have income transactions (e.g., refunds). Fixed getAllRootsMonthTotal to sum across all roots correctly, and updated grandTotalIncome/grandTotalExpense to include all income/expense transactions regardless of root classification. This ensures totals match the transaction-sign-based reality.",
          "problemsSolved": [
            "Net income calculation incorrect",
            "Grand totals missing transactions from opposite root types",
            "Totals didn't match actual transaction sums"
          ],
          "goalsAchieved": [
            "Accurate net income calculation",
            "Correct grand totals including all transactions",
            "Totals match transaction reality"
          ],
          "files": ["client/src/views/ReportsView.vue"],
          "alternativesConsidered": [],
          "dependencies": []
        },
        {
          "component": "components",
          "intent": "Update Sankey diagram color coding logic",
          "reasoning": "Sankey diagram color coding was based on isIncomeDescendant flag which didn't accurately reflect root category type. Updated to use rootCategoryType field which is determined by actual income vs expense totals. Net cashflow node colors remain variable (green for profit, red for loss), but category nodes now use fixed colors based on root category type (income = green, expense = red) for organizational clarity.",
          "problemsSolved": [
            "Sankey colors didn't match actual category classification",
            "Confusing color coding"
          ],
          "goalsAchieved": [
            "Accurate color coding based on root category type",
            "Consistent visual representation",
            "Improved diagram clarity"
          ],
          "files": ["client/src/components/SankeyDiagram.vue"],
          "alternativesConsidered": [],
          "dependencies": []
        },
        {
          "component": "documentation",
          "intent": "Document income/expense classification challenges",
          "reasoning": "The application uses transaction-sign-based classification but categories are organized hierarchically, creating conceptual mismatches. Added options.md explaining the technical reality, user confusion points, and potential solutions. Documented why income transactions can appear in expense categories and vice versa. Added TRANSFER_EXCLUSION_CLARIFICATION.md explaining transfer exclusion logic consistency.",
          "problemsSolved": [
            "No documentation explaining classification approach",
            "User confusion about income in expense categories",
            "Unclear transfer exclusion logic"
          ],
          "goalsAchieved": [
            "Clear documentation of classification approach",
            "Explanation of user confusion points",
            "Transfer exclusion logic documented"
          ],
          "files": ["documentation/options.md", "documentation/TRANSFER_EXCLUSION_CLARIFICATION.md"],
          "alternativesConsidered": [],
          "dependencies": []
        }
      ]
    },
    {
      "version": "3.0.13",
      "date": "12/26/25",
      "reasons": [
        {
          "component": "views",
          "intent": "Display reconciliation match status for transactions",
          "reasoning": "Users need visual indication when transactions are matched/locked for reconciliation purposes to prevent accidental deletion attempts. Added \"Matched\" badge inline with transaction description and in status column. Uses same logic as delete transaction check (active ReconciliationMatches records) to ensure consistency. Badge styled with green background to indicate protected status.",
          "problemsSolved": [
            "No visual indication of reconciliation match status",
            "Users couldn't tell which transactions were locked",
            "Delete attempts failed without clear reason"
          ],
          "goalsAchieved": [
            "Clear visual indicator for matched transactions",
            "Prevents confusion when deleting transactions",
            "Consistent with delete transaction logic"
          ],
          "files": ["client/src/views/TransactionsView.vue"],
          "alternativesConsidered": [],
          "dependencies": []
        },
        {
          "component": "models",
          "intent": "Include reconciliation match status in transaction queries",
          "reasoning": "Transaction list needs reconciliation match information to display status indicators. Modified getAllTransactions to LEFT JOIN ReconciliationMatches table and add has_reconciliation_match field (1 if active match exists, 0 otherwise). Uses same criteria as delete check: transaction_id match, user_id match, and active=1. This ensures frontend has all necessary data without additional API calls.",
          "problemsSolved": [
            "Transaction queries didn't include reconciliation match status",
            "Frontend would need separate API calls to check match status",
            "Inefficient data fetching"
          ],
          "goalsAchieved": [
            "Reconciliation match status included in transaction data",
            "Single query provides all needed information",
            "Efficient data loading"
          ],
          "files": ["server/models/transaction_dao.js"],
          "alternativesConsidered": [],
          "dependencies": []
        }
      ]
    },
    {
      "version": "3.0.11",
      "date": "12/19/25",
      "reasons": [
        {
          "component": "stores",
          "intent": "Fix bulk category assignment UI refresh issue",
          "reasoning": "The bulk category assignment feature wasn't updating the UI after batch updates because fetchTransactions() was blocked by cache (30-second timeout) and loading state checks. When batchUpdateTransactions set loading=true, the subsequent fetchTransactions() call would return early due to the loading check, preventing data refresh. Fixed by adding forceRefresh parameter to fetchTransactions that bypasses both cache and loading checks when explicitly requested. Applied to batchUpdateTransactions, createTransaction, updateTransaction, and uploadTransactions to ensure UI always reflects latest data.",
          "problemsSolved": [
            "Bulk category assignment not updating UI after completion",
            "Users had to manually reload page to see changes",
            "Cache preventing refresh within 30 seconds",
            "Loading state blocking refresh after batch operations"
          ],
          "goalsAchieved": [
            "Bulk category assignment now immediately updates UI",
            "No manual page reload needed",
            "Consistent refresh behavior across all transaction update operations",
            "Improved user experience"
          ],
          "files": ["client/src/stores/transaction.js"],
          "alternativesConsidered": [],
          "dependencies": []
        },
        {
          "component": "views",
          "intent": "Add visual flow chart showing income/expense breakdown",
          "reasoning": "Users needed a visual representation of how income flows into expenses and net profit/loss, similar to Sankey diagrams used in financial planning tools. Created FlowView with month/year selectors to show income and expense categories in a hierarchical flow diagram. Uses Plotly.js for professional Sankey visualization with proper node positioning and link routing. Shows Net Income on left, flowing to income categories (green) and expense categories (red) on right, with parent-to-child category breakdowns. Excludes transfer transactions and transfer categories as they net to zero.",
          "problemsSolved": [
            "No visual representation of financial flow",
            "Difficult to understand income/expense relationships",
            "No way to see category hierarchy breakdown visually"
          ],
          "goalsAchieved": [
            "Visual flow chart showing income/expense relationships",
            "Intuitive Sankey diagram with color coding",
            "Category hierarchy visualization",
            "Improved financial understanding"
          ],
          "files": ["client/src/views/FlowView.vue"],
          "alternativesConsidered": ["Custom SVG implementation (rejected - unreliable)", "Chart.js (rejected - no Sankey support)"],
          "dependencies": ["plotly.js-dist-min"]
        },
        {
          "component": "components",
          "intent": "Create reusable Sankey diagram component",
          "reasoning": "Needed a reusable component for rendering Sankey diagrams using Plotly.js. The component handles node positioning, link routing, color coding (green for income descendants, red for expense descendants), and interactive features. Supports dark mode and responsive layout. Uses Plotly's built-in Sankey type which handles complex layout calculations automatically.",
          "problemsSolved": [
            "Custom SVG Sankey implementation was unreliable and complex",
            "Needed professional-grade visualization library"
          ],
          "goalsAchieved": [
            "Reliable Sankey diagram rendering using Plotly.js",
            "Proper node/link positioning",
            "Interactive hover effects",
            "Professional visualization quality"
          ],
          "files": ["client/src/components/SankeyDiagram.vue"],
          "alternativesConsidered": [],
          "dependencies": ["plotly.js-dist-min"]
        },
        {
          "component": "dependencies",
          "intent": "Add Plotly.js for Sankey diagram support",
          "reasoning": "Chart.js (already in project) doesn't support Sankey diagrams natively. Plotly.js provides robust, production-ready Sankey diagram support with automatic layout, interactive features, and excellent documentation. Used plotly.js-dist-min for smaller bundle size.",
          "problemsSolved": [
            "No suitable charting library for Sankey diagrams",
            "Custom implementation unreliable"
          ],
          "goalsAchieved": [
            "Professional Sankey diagram support",
            "Smaller bundle size with minified version",
            "Proven visualization library"
          ],
          "files": ["client/package.json"],
          "alternativesConsidered": ["Chart.js (rejected - no Sankey support)", "Custom SVG (rejected - unreliable)"],
          "dependencies": ["plotly.js-dist-min"]
        },
        {
          "component": "navigation",
          "intent": "Add Flow Chart to navigation menu",
          "reasoning": "Users need easy access to the new Flow Chart view. Added \"Flow Chart\" link to both desktop \"More\" dropdown menu and mobile navigation menu for consistent access across devices.",
          "problemsSolved": [
            "Flow Chart view not easily discoverable",
            "No navigation path to new feature"
          ],
          "goalsAchieved": [
            "Flow Chart accessible from main navigation",
            "Consistent desktop and mobile experience"
          ],
          "files": ["client/src/components/Navbar.vue"],
          "alternativesConsidered": [],
          "dependencies": []
        },
        {
          "component": "router",
          "intent": "Add route for Flow Chart view",
          "reasoning": "New Flow Chart view needs a route definition. Added /flow route that renders FlowView component, placed logically after reports routes in the router configuration.",
          "problemsSolved": [
            "No route defined for Flow Chart view",
            "Feature not accessible"
          ],
          "goalsAchieved": [
            "Flow Chart view accessible at /flow route",
            "Proper route organization"
          ],
          "files": ["client/src/router/index.js"],
          "alternativesConsidered": [],
          "dependencies": []
        }
      ]
    },
    {
      "version": "3.0.10",
      "date": "12/18/25",
      "reasons": [
        {
          "component": "controllers",
          "intent": "Fix CSV import failures and centralize date operations",
          "reasoning": "CSV imports were failing because column headers with spaces (e.g., \"  amount  \") weren't being trimmed, causing mapping mismatches. Fixed by adding column name trimming to CSV parser. Also refactored all date operations to use only utility functions (normalizeAppDate) instead of wrapper functions, ensuring consistency. Removed unused imports (accountFieldMappingDAO, validateRequiredFields, validateNumber, validateDate, validateArray, parseNumber, isDateValid) and dead code (formattedTransactions that just returned same data).",
          "problemsSolved": [
            "CSV import failing with \"Empty date\" errors due to column name spacing",
            "Date operations using wrapper functions instead of direct utility calls",
            "Unused imports cluttering codebase",
            "Dead code reducing maintainability"
          ],
          "goalsAchieved": [
            "CSV imports now work correctly with spaced column names",
            "All date operations centralized through utility functions",
            "Cleaner codebase with no unused imports",
            "Improved maintainability"
          ],
          "files": ["server/controllers/transaction-controller.js"],
          "alternativesConsidered": [],
          "dependencies": []
        }
      ]
    },
    {
      "version": "3.0.9",
      "date": "12/17/25",
      "reasons": [
        {
          "component": "controllers",
          "intent": "Fix syntax error preventing net balance history endpoint from functioning",
          "reasoning": "The reporting-controller promise chain had a syntax error where `});` on line 811 closed both the callback and promise chain prematurely, preventing proper error handling. Additionally, there was a duplicate closing brace. This caused the net balance history endpoint to fail with \"missing ) after argument list\" error. Fixed by changing `});` to `})` and properly chaining the `.catch()` handler.",
          "problemsSolved": [
            "Syntax error causing \"missing ) after argument list\" error",
            "Promise chain not properly structured",
            "Error handlers not correctly chained",
            "Duplicate closing brace"
          ],
          "goalsAchieved": [
            "Net balance history endpoint now functions correctly",
            "Proper promise chain error handling",
            "Code syntax validated"
          ],
          "files": ["server/controllers/reporting-controller.js"],
          "alternativesConsidered": [],
          "dependencies": []
        }
      ]
    },
    {
      "version": "3.0.8",
      "date": "12/10/24",
      "reasons": [
        {
          "component": "architecture",
          "intent": "Enforce MVC separation by moving all database access to DAO layer",
          "reasoning": "Controllers were violating MVC principles by accessing the database directly via getConnection() and db.get()/db.all() calls. This refactoring ensures all database queries are contained within DAO files, making the codebase more maintainable, testable, and aligned with separation of concerns. Controllers now exclusively handle business logic and delegate data access to the DAO layer.",
          "problemsSolved": [
            "Violation of MVC architecture principles",
            "Poor code organization",
            "Difficult to test controllers with direct DB access",
            "Mixing business logic with data access logic"
          ],
          "goalsAchieved": [
            "Proper MVC separation",
            "Improved code maintainability",
            "Easier unit testing",
            "Better separation of concerns",
            "Consistent architecture pattern"
          ],
          "files": ["server/controllers/reconciliation-controller.js", "server/controllers/transaction-controller.js", "server/controllers/reporting-controller.js", "server/controllers/user-preferences-controller.js", "server/models/reconciliation_dao.js", "server/models/transaction_dao.js", "server/models/reporting_dao.js", "server/models/user_preferences_dao.js"],
          "alternativesConsidered": [],
          "dependencies": []
        },
        {
          "component": "models",
          "intent": "Add missing DAO methods for reconciliation operations",
          "reasoning": "Added getTransactionWithOwnershipCheck() and getTransactionDetails() to reconciliation_dao.js to support the refactored controller. These methods encapsulate complex queries involving transactions, reconciliation matches, linked transactions, import records, and statement information.",
          "problemsSolved": [
            "Reconciliation controller had complex nested queries that needed to be moved to DAO",
            "Transaction ownership validation logic was embedded in controller"
          ],
          "goalsAchieved": [
            "Centralized reconciliation data access logic",
            "Reusable DAO methods",
            "Cleaner controller code"
          ],
          "files": ["server/models/reconciliation_dao.js"],
          "alternativesConsidered": [],
          "dependencies": []
        },
        {
          "component": "models",
          "intent": "Add duplicate checking methods to transaction DAO",
          "reasoning": "Added checkLegacyTransactionExists() and checkTransactionExistsByDedupeHash() to transaction_dao.js to support duplicate detection during CSV/OFX imports. These methods replace direct DB queries in the transaction controller.",
          "problemsSolved": [
            "Transaction controller had duplicate checking queries embedded directly",
            "Needed to support both legacy and new transaction ID schemes"
          ],
          "goalsAchieved": [
            "Centralized duplicate checking logic",
            "Support for legacy and new transaction formats",
            "Cleaner import flow"
          ],
          "files": ["server/models/transaction_dao.js"],
          "alternativesConsidered": [],
          "dependencies": []
        },
        {
          "component": "models",
          "intent": "Create reporting DAO for all reporting queries",
          "reasoning": "Created new reporting_dao.js with 8 query methods (getMonthlySummary, getAllCategoriesWithRoots, getTransactionActuals, getAccountBalancesAsOf, getAccountsByUser, getTransactionsForAccounts, getStartingBalances, getAllTransactionsSum) to centralize all reporting database operations.",
          "problemsSolved": [
            "Reporting controller had extensive direct database queries mixed with business logic",
            "Complex queries needed proper encapsulation"
          ],
          "goalsAchieved": [
            "Centralized reporting data access",
            "Improved query reusability",
            "Cleaner reporting controller",
            "Easier to optimize queries"
          ],
          "files": ["server/models/reporting_dao.js"],
          "alternativesConsidered": [],
          "dependencies": []
        },
        {
          "component": "models",
          "intent": "Add batch preferences method to user preferences DAO",
          "reasoning": "Added batchSetPreferences() method to user_preferences_dao.js to support batch preference updates. This method uses transactions to ensure atomicity when updating multiple preferences.",
          "problemsSolved": [
            "User preferences controller had batch operation logic with direct DB access",
            "Needed transaction support for atomic updates"
          ],
          "goalsAchieved": [
            "Centralized batch preference logic",
            "Transaction-based atomic updates",
            "Cleaner controller code"
          ],
          "files": ["server/models/user_preferences_dao.js"],
          "alternativesConsidered": [],
          "dependencies": []
        }
      ]
    },
    {
      "version": "3.0.7",
      "date": "11/25/25",
      "reasons": [
        {
          "component": "scripts",
          "intent": "Enable full-stack development mode with single command",
          "reasoning": "Added dev:full script that sets DEV_FULL environment variable to enable both backend and frontend servers simultaneously. This simplifies the development workflow by providing a single command to start the entire application stack.",
          "problemsSolved": [
            "Need to manually start backend and frontend separately",
            "No clear indication when both servers are running"
          ],
          "goalsAchieved": [
            "Single command for full-stack development",
            "Improved developer experience"
          ],
          "files": ["package.json"],
          "alternativesConsidered": [],
          "dependencies": []
        },
        {
          "component": "server",
          "intent": "Improve server startup visibility and ensure database readiness",
          "reasoning": "Replaced verbose console.log statements with a structured status monitor footer that displays system status, ports, and environment information. Added database initialization wait logic to ensure database is ready before server accepts connections. This provides better visibility into system state and prevents race conditions during startup.",
          "problemsSolved": [
            "Verbose startup logging cluttered console",
            "No clear system status overview",
            "Potential race conditions with database initialization"
          ],
          "goalsAchieved": [
            "Clean, structured status display",
            "Guaranteed database readiness before server start",
            "Improved operational visibility"
          ],
          "files": ["server/app.js", "utils/footer.js"],
          "alternativesConsidered": [],
          "dependencies": []
        },
        {
          "component": "frontend",
          "intent": "Reduce console noise during development",
          "reasoning": "Removed the log-config plugin from vite.config.js that printed verbose startup information. This reduces console clutter and focuses attention on the structured status monitor footer displayed by the backend server.",
          "problemsSolved": [
            "Excessive console output during frontend startup",
            "Redundant logging"
          ],
          "goalsAchieved": [
            "Cleaner development console",
            "Focused status information"
          ],
          "files": ["client/vite.config.js"],
          "alternativesConsidered": [],
          "dependencies": []
        },
        {
          "component": "utilities",
          "intent": "Provide centralized status monitoring display",
          "reasoning": "Created footer utility module that generates a formatted status monitor display showing backend/frontend status, ports, environment, and system information. This centralizes status display logic and provides consistent formatting across the application.",
          "problemsSolved": [
            "No centralized way to display system status",
            "Inconsistent status reporting"
          ],
          "goalsAchieved": [
            "Centralized status display utility",
            "Consistent formatting",
            "Improved operational awareness"
          ],
          "files": ["utils/footer.js"],
          "alternativesConsidered": [],
          "dependencies": []
        },
        {
          "component": "documentation",
          "intent": "Establish standard changelog and reasonlog templates",
          "reasoning": "Added example changelog and reasonlog templates to documentation to serve as reference for maintaining project change history. These templates follow established formats (Keep a Changelog, semantic versioning) and provide both human-readable and LLM-optimized formats.",
          "problemsSolved": [
            "No standardized format for tracking changes and reasoning",
            "Inconsistent documentation practices"
          ],
          "goalsAchieved": [
            "Standard templates for change tracking",
            "Improved documentation consistency"
          ],
          "files": ["documentation/myproject-globals/example_changelog.md", "documentation/myproject-globals/example_reasonlog.md"],
          "alternativesConsidered": [],
          "dependencies": []
        }
      ]
    }
  ]
}
```
**Key metadata for LLM processing:**
- Version number (semantic versioning)
- Component/category affected
- Intent behind the change
- Detailed reasoning explanation
- Problems solved by this change
- Goals achieved
- Files modified
- Alternatives considered (if any)
- Dependencies impacted

---

