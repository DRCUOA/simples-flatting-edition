
## Change Log

## Purpose

This document tracks all notable changes to this project, providing a chronological record of features, fixes, and improvements. It serves as a reference for developers to understand what changed, when, and why. The changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (MAJOR.MINOR.PATCH).

The document content is captured in two different formats, one optimized for human consumption and the other for LLM consumption. This refers to structure and format only; it is very important to maintain the same content in both formats.

**Usage Note:** When this template is referenced as a dependency (e.g., `@changelog.md`), use the structure and format shown in the examples below. Replace example data with actual project changes, ensuring both the tabular (human-readable) and JSON (LLM-readable) formats contain identical information.

**Legend:**
- **Added** = New features
- **Changed** = Modifications to existing functionality
- **Fixed** = Bug fixes
- **Technical Details** = Implementation notes and architecture decisions

**Quick Navigation:**
- **[LLM Version](#llm-version)** - Structured JSON data optimized for agent/LLM ingestion
- **[Human Reader Focused Version](#version-history)** - Tabular format optimized for human scanning

## Version History

**Human Reader Format, tabular for optimized human scanning**

| Version | Date | Type | Component | Description |
|---------|------|------|------------|-------------|
| 3.0.13 | 12/26/25 | Added | views | Added reconciliation match status indicator to TransactionsView showing "Matched" badge for transactions locked for reconciliation purposes; uses same logic as delete transaction check |
| 3.0.13 | 12/26/25 | Changed | models | Modified getAllTransactions query to include has_reconciliation_match field by joining ReconciliationMatches table to identify transactions with active reconciliation matches |
| 3.0.12 | 12/24/25 | Added | views | Added PDF export functionality to Reports view with cashflow statements and Sankey diagrams; includes professional formatting and pagination |
| 3.0.12 | 12/24/25 | Added | utils | Added pdfExport.js utility for generating PDF reports and sankeyGenerator.js for reusable Sankey data generation |
| 3.0.12 | 12/24/25 | Added | dependencies | Added jspdf and html2canvas packages for PDF generation and image capture |
| 3.0.12 | 12/24/25 | Fixed | views | Fixed FlowView income/expense calculation to use transaction-sign-based approach consistent with Reports view; updated transfer exclusion to match Reports (only Internal-Transfers category) |
| 3.0.12 | 12/24/25 | Fixed | views | Fixed ReportsView net income and grand totals calculation to include all income/expense transactions across all root categories |
| 3.0.12 | 12/24/25 | Changed | components | Updated Sankey diagram color coding to use rootCategoryType based on actual income vs expense totals |
| 3.0.12 | 12/24/25 | Added | documentation | Added options.md documenting income/expense classification challenges and TRANSFER_EXCLUSION_CLARIFICATION.md |
| 3.0.11 | 12/19/25 | Fixed | stores | Fixed bulk category assignment not refreshing UI; added forceRefresh parameter to fetchTransactions to bypass cache when needed; fixed loading state blocking refresh after batch operations |
| 3.0.11 | 12/19/25 | Added | views | Added Flow Chart view with Sankey diagram visualization showing income/expense flow breakdown by category hierarchy; includes month/year date range selection |
| 3.0.11 | 12/19/25 | Added | components | Added SankeyDiagram component using Plotly.js for interactive flow visualization with income (green) and expense (red) color coding |
| 3.0.11 | 12/19/25 | Added | dependencies | Added plotly.js-dist-min package for Sankey diagram rendering |
| 3.0.11 | 12/19/25 | Changed | navigation | Added Flow Chart link to desktop and mobile navigation menus |
| 3.0.11 | 12/19/25 | Changed | router | Added /flow route for Flow Chart view |
| 3.0.10 | 12/18/25 | Fixed | controllers | Fixed CSV import failure caused by column name spacing; refactored date operations to use only utility functions; removed unused imports and dead code |
| 3.0.9 | 12/17/25 | Fixed | controllers | Fixed syntax error in reporting-controller promise chain for net balance history endpoint |
| 3.0.8 | 12/10/24 | Changed | architecture | Refactored all controllers to use DAO layer, removing direct database access for MVC compliance |
| 3.0.8 | 12/10/24 | Added | models | Added getTransactionWithOwnershipCheck() and getTransactionDetails() methods to reconciliation_dao.js |
| 3.0.8 | 12/10/24 | Added | models | Added checkLegacyTransactionExists() and checkTransactionExistsByDedupeHash() methods to transaction_dao.js |
| 3.0.8 | 12/10/24 | Added | models | Created new reporting_dao.js with 8 query methods for all reporting endpoints |
| 3.0.8 | 12/10/24 | Added | models | Added batchSetPreferences() method to user_preferences_dao.js |
| 3.0.8 | 12/10/24 | Changed | controllers | Refactored reconciliation-controller.js to use DAO methods instead of direct DB access |
| 3.0.8 | 12/10/24 | Changed | controllers | Refactored transaction-controller.js to use DAO methods for duplicate checking |
| 3.0.8 | 12/10/24 | Changed | controllers | Refactored reporting-controller.js to use reporting_dao.js for all queries |
| 3.0.8 | 12/10/24 | Changed | controllers | Refactored user-preferences-controller.js to use existing DAO instead of direct DB access |
| 3.0.7 | 11/25/25 | Added | scripts | Added dev:full script to package.json for full-stack development mode |
| 3.0.7 | 11/25/25 | Changed | server | Improved server startup with status monitor footer and database initialization wait |
| 3.0.7 | 11/25/25 | Changed | frontend | Removed verbose logging plugin from vite.config.js |
| 3.0.7 | 11/25/25 | Added | utilities | Added footer utility for status monitor display |
| 3.0.7 | 11/25/25 | Added | documentation | Added changelog and reasonlog template examples |

**Stack:**
- **Backend:** Node.js, Express, SQLite (better-sqlite3)
- **Frontend:** Vue 3, Vite, Pinia, Vue Router

**Compliance:**
- **ENV_SETUP_GUIDE:** verified
- **PROJECT_SETUP_GUIDE:** 100% compliant (v1.1.1+)
---

## LLM Version

**Optimized for agent/LLM ingestion - structured data format**

```json
{
  "project": "simples",
  "versioning": "semantic",
  "format": "keepachangelog",
  "versions": [
    {
      "version": "3.0.12",
      "date": "12/24/25",
      "changes": [
        {
          "type": "added",
          "category": "views",
          "component": "ReportsView.vue",
          "description": "Added PDF export functionality to Reports view with cashflow statements and Sankey diagrams; includes professional formatting and pagination",
          "files": ["client/src/views/ReportsView.vue"],
          "dependencies": ["jspdf", "html2canvas"]
        },
        {
          "type": "added",
          "category": "utils",
          "component": "pdfExport.js",
          "description": "Added pdfExport.js utility for generating PDF reports and sankeyGenerator.js for reusable Sankey data generation",
          "files": ["client/src/utils/pdfExport.js", "client/src/utils/sankeyGenerator.js"],
          "dependencies": ["jspdf", "html2canvas"]
        },
        {
          "type": "added",
          "category": "dependencies",
          "component": "package.json",
          "description": "Added jspdf and html2canvas packages for PDF generation and image capture",
          "files": ["client/package.json"],
          "dependencies": ["jspdf", "html2canvas"]
        },
        {
          "type": "fixed",
          "category": "views",
          "component": "FlowView.vue",
          "description": "Fixed FlowView income/expense calculation to use transaction-sign-based approach consistent with Reports view; updated transfer exclusion to match Reports (only Internal-Transfers category)",
          "files": ["client/src/views/FlowView.vue"],
          "dependencies": []
        },
        {
          "type": "fixed",
          "category": "views",
          "component": "ReportsView.vue",
          "description": "Fixed ReportsView net income and grand totals calculation to include all income/expense transactions across all root categories",
          "files": ["client/src/views/ReportsView.vue"],
          "dependencies": []
        },
        {
          "type": "changed",
          "category": "components",
          "component": "SankeyDiagram.vue",
          "description": "Updated Sankey diagram color coding to use rootCategoryType based on actual income vs expense totals",
          "files": ["client/src/components/SankeyDiagram.vue"],
          "dependencies": []
        },
        {
          "type": "added",
          "category": "documentation",
          "component": "options.md",
          "description": "Added options.md documenting income/expense classification challenges and TRANSFER_EXCLUSION_CLARIFICATION.md",
          "files": ["documentation/options.md", "documentation/TRANSFER_EXCLUSION_CLARIFICATION.md"],
          "dependencies": []
        }
      ]
    },
    {
      "version": "3.0.13",
      "date": "12/26/25",
      "changes": [
        {
          "type": "added",
          "category": "views",
          "component": "TransactionsView.vue",
          "description": "Added reconciliation match status indicator to TransactionsView showing \"Matched\" badge for transactions locked for reconciliation purposes; uses same logic as delete transaction check",
          "files": ["client/src/views/TransactionsView.vue"],
          "dependencies": []
        },
        {
          "type": "changed",
          "category": "models",
          "component": "transaction_dao.js",
          "description": "Modified getAllTransactions query to include has_reconciliation_match field by joining ReconciliationMatches table to identify transactions with active reconciliation matches",
          "files": ["server/models/transaction_dao.js"],
          "dependencies": []
        }
      ]
    },
    {
      "version": "3.0.11",
      "date": "12/19/25",
      "changes": [
        {
          "type": "fixed",
          "category": "stores",
          "component": "transaction.js",
          "description": "Fixed bulk category assignment not refreshing UI; added forceRefresh parameter to fetchTransactions to bypass cache when needed; fixed loading state blocking refresh after batch operations",
          "files": ["client/src/stores/transaction.js"],
          "dependencies": []
        },
        {
          "type": "added",
          "category": "views",
          "component": "FlowView.vue",
          "description": "Added Flow Chart view with Sankey diagram visualization showing income/expense flow breakdown by category hierarchy; includes month/year date range selection",
          "files": ["client/src/views/FlowView.vue"],
          "dependencies": ["plotly.js-dist-min"]
        },
        {
          "type": "added",
          "category": "components",
          "component": "SankeyDiagram.vue",
          "description": "Added SankeyDiagram component using Plotly.js for interactive flow visualization with income (green) and expense (red) color coding",
          "files": ["client/src/components/SankeyDiagram.vue"],
          "dependencies": ["plotly.js-dist-min"]
        },
        {
          "type": "added",
          "category": "dependencies",
          "component": "package.json",
          "description": "Added plotly.js-dist-min package for Sankey diagram rendering",
          "files": ["client/package.json"],
          "dependencies": ["plotly.js-dist-min"]
        },
        {
          "type": "changed",
          "category": "navigation",
          "component": "Navbar.vue",
          "description": "Added Flow Chart link to desktop and mobile navigation menus",
          "files": ["client/src/components/Navbar.vue"],
          "dependencies": []
        },
        {
          "type": "changed",
          "category": "router",
          "component": "index.js",
          "description": "Added /flow route for Flow Chart view",
          "files": ["client/src/router/index.js"],
          "dependencies": []
        }
      ]
    },
    {
      "version": "3.0.10",
      "date": "12/18/25",
      "changes": [
        {
          "type": "fixed",
          "category": "controllers",
          "component": "transaction-controller.js",
          "description": "Fixed CSV import failure caused by column name spacing; refactored date operations to use only utility functions; removed unused imports and dead code",
          "files": ["server/controllers/transaction-controller.js"],
          "dependencies": []
        }
      ]
    },
    {
      "version": "3.0.9",
      "date": "12/17/25",
      "changes": [
        {
          "type": "fixed",
          "category": "controllers",
          "component": "reporting-controller.js",
          "description": "Fixed syntax error in reporting-controller promise chain for net balance history endpoint",
          "files": ["server/controllers/reporting-controller.js"],
          "dependencies": []
        }
      ]
    },
    {
      "version": "3.0.8",
      "date": "12/10/24",
      "changes": [
        {
          "type": "changed",
          "category": "architecture",
          "component": "controllers",
          "description": "Refactored all controllers to use DAO layer, removing direct database access for MVC compliance",
          "files": ["server/controllers/reconciliation-controller.js", "server/controllers/transaction-controller.js", "server/controllers/reporting-controller.js", "server/controllers/user-preferences-controller.js"],
          "dependencies": []
        },
        {
          "type": "added",
          "category": "models",
          "component": "reconciliation_dao.js",
          "description": "Added getTransactionWithOwnershipCheck() and getTransactionDetails() methods to reconciliation_dao.js",
          "files": ["server/models/reconciliation_dao.js"],
          "dependencies": []
        },
        {
          "type": "added",
          "category": "models",
          "component": "transaction_dao.js",
          "description": "Added checkLegacyTransactionExists() and checkTransactionExistsByDedupeHash() methods to transaction_dao.js",
          "files": ["server/models/transaction_dao.js"],
          "dependencies": []
        },
        {
          "type": "added",
          "category": "models",
          "component": "reporting_dao.js",
          "description": "Created new reporting_dao.js with 8 query methods for all reporting endpoints",
          "files": ["server/models/reporting_dao.js"],
          "dependencies": []
        },
        {
          "type": "added",
          "category": "models",
          "component": "user_preferences_dao.js",
          "description": "Added batchSetPreferences() method to user_preferences_dao.js",
          "files": ["server/models/user_preferences_dao.js"],
          "dependencies": []
        },
        {
          "type": "changed",
          "category": "controllers",
          "component": "reconciliation-controller.js",
          "description": "Refactored reconciliation-controller.js to use DAO methods instead of direct DB access",
          "files": ["server/controllers/reconciliation-controller.js"],
          "dependencies": []
        },
        {
          "type": "changed",
          "category": "controllers",
          "component": "transaction-controller.js",
          "description": "Refactored transaction-controller.js to use DAO methods for duplicate checking",
          "files": ["server/controllers/transaction-controller.js"],
          "dependencies": []
        },
        {
          "type": "changed",
          "category": "controllers",
          "component": "reporting-controller.js",
          "description": "Refactored reporting-controller.js to use reporting_dao.js for all queries",
          "files": ["server/controllers/reporting-controller.js"],
          "dependencies": []
        },
        {
          "type": "changed",
          "category": "controllers",
          "component": "user-preferences-controller.js",
          "description": "Refactored user-preferences-controller.js to use existing DAO instead of direct DB access",
          "files": ["server/controllers/user-preferences-controller.js"],
          "dependencies": []
        }
      ]
    },
    {
      "version": "3.0.7",
      "date": "11/25/25",
      "changes": [
        {
          "type": "added",
          "category": "scripts",
          "component": "package.json",
          "description": "Added dev:full script to package.json for full-stack development mode",
          "files": ["package.json"],
          "dependencies": []
        },
        {
          "type": "changed",
          "category": "server",
          "component": "startup",
          "description": "Improved server startup with status monitor footer and database initialization wait",
          "files": ["server/app.js", "utils/footer.js"],
          "dependencies": []
        },
        {
          "type": "changed",
          "category": "frontend",
          "component": "build",
          "description": "Removed verbose logging plugin from vite.config.js",
          "files": ["client/vite.config.js"],
          "dependencies": []
        },
        {
          "type": "added",
          "category": "utilities",
          "component": "footer",
          "description": "Added footer utility for status monitor display",
          "files": ["utils/footer.js"],
          "dependencies": []
        },
        {
          "type": "added",
          "category": "documentation",
          "component": "templates",
          "description": "Added changelog and reasonlog template examples",
          "files": ["documentation/myproject-globals/example_changelog.md", "documentation/myproject-globals/example_reasonlog.md"],
          "dependencies": []
        }
      ]
    }
  ],
  "stack": {
    "backend": ["Node.js", "Express", "SQLite (better-sqlite3)"],
    "frontend": ["Vue 3", "Vite", "Pinia", "Vue Router"]
  },
  "compliance": {
    "ENV_SETUP_GUIDE": "verified",
    "PROJECT_SETUP_GUIDE": "100% compliant (v1.1.1+)"
  }
}
```
**Key metadata for LLM processing:**
- Version number (semantic versioning)
- Change type (added/changed/fixed/technical)
- Component/category affected
- Files modified
- Dependencies impacted
- Compliance status

---

