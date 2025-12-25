<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="px-4 py-5 sm:px-6 mb-4">
        <div class="flex items-center justify-between">
          <div>
            <button
              @click="$router.push('/accounts')"
              class="mb-4 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Accounts
            </button>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ account?.account_name || 'Account Details' }}
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Comprehensive account information and history
            </p>
          </div>
          <div v-if="account" class="text-right">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ formatAmount(account.current_balance) }}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Current Balance
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">Loading account details...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p class="text-red-800 dark:text-red-200">{{ error }}</p>
      </div>

      <!-- Account Details -->
      <div v-else-if="account" class="space-y-6">
        <!-- Account Information Card -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 class="text-lg font-medium text-gray-900 dark:text-white">Account Information</h2>
          </div>
          <div class="px-6 py-4">
            <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Account Name</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ account.account_name }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Account Type</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white capitalize">{{ account.account_type }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Account Class</dt>
                <dd class="mt-1">
                  <span class="px-2 py-1 text-xs rounded-full capitalize" :class="{
                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300': account.account_class === 'asset',
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300': account.account_class === 'liability',
                    'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300': account.account_class === 'equity'
                  }">
                    {{ account.account_class || 'asset' }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Current Balance</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white font-semibold">
                  {{ formatAmount(account.current_balance) }}
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Balance Reconciled To</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                  {{ latestReconciliationDate ? formatDate(latestReconciliationDate) : 'Never' }}
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Positive is Credit</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ account.positive_is_credit ? 'Yes' : 'No' }}</dd>
              </div>
              <div v-if="account.timeframe">
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Timeframe</dt>
                <dd class="mt-1">
                  <span class="px-2 py-1 text-xs rounded-full capitalize" :class="{
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300': account.timeframe === 'short',
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300': account.timeframe === 'mid',
                    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300': account.timeframe === 'long'
                  }">
                    {{ account.timeframe }}
                  </span>
                </dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Created Date</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ formatDate(account.created_at) }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Account ID</dt>
                <dd class="mt-1 text-sm text-gray-500 dark:text-gray-400 font-mono text-xs">{{ account.account_id }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div class="relative border-b border-gray-200 dark:border-gray-700 pt-2 px-4">
            <nav class="flex space-x-1" aria-label="Tabs">
              <button
                v-for="tab in tabs"
                :key="tab.id"
                @click="activeTab = tab.id"
                :class="[
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border-t-2 border-l-2 border-r-2 border-indigo-500 dark:border-indigo-400 rounded-t-lg shadow-sm z-10 relative'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-t-2 border-l-2 border-r-2 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-800 dark:hover:text-gray-300 rounded-t-md',
                  'whitespace-nowrap py-1.5 px-3 text-xs font-medium transition-all duration-150 relative -mb-px'
                ]"
              >
                <span class="flex items-center gap-1.5">
                  {{ tab.name }}
                  <span v-if="tab.count !== undefined" :class="[
                    'py-0.5 px-1.5 text-xs rounded-full font-semibold',
                    activeTab === tab.id
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                  ]">
                    {{ tab.count }}
                  </span>
                </span>
              </button>
            </nav>
          </div>

          <!-- Tab Content -->
          <div class="p-6">
            <!-- Transactions Tab -->
            <div v-if="activeTab === 'transactions'" class="space-y-4">
              <!-- Financial Summary -->
              <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Balance Summary</h3>
                <dl class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Opening Balance</dt>
                    <dd class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                      {{ formatAmount(calculatedOpeningBalance) }}
                    </dd>
                    <dd class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {{ openingBalanceDate ? `As of ${formatDateShort(openingBalanceDate)}` : 'Before transactions' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Transaction Total</dt>
                    <dd class="mt-1 text-lg font-semibold" :class="{
                      'text-green-600 dark:text-green-400': transactionSum >= 0,
                      'text-red-600 dark:text-red-400': transactionSum < 0
                    }">
                      {{ formatAmount(transactionSum) }}
                    </dd>
                    <dd class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {{ transactions.length }} transaction{{ transactions.length !== 1 ? 's' : '' }}
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Calculated Balance</dt>
                    <dd class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                      {{ formatAmount(calculatedBalance) }}
                    </dd>
                    <dd class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Opening + Transactions
                    </dd>
                  </div>
                  <div>
                    <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Current Balance</dt>
                    <dd class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                      {{ formatAmount(account?.current_balance || 0) }}
                    </dd>
                    <dd class="text-xs font-medium mt-0.5" :class="{
                      'text-green-600 dark:text-green-400': Math.abs(variance) < 0.01,
                      'text-red-600 dark:text-red-400': Math.abs(variance) >= 0.01
                    }">
                      Variance: {{ formatAmount(variance) }}
                      <span v-if="Math.abs(variance) >= 0.01" class="ml-1">⚠️</span>
                    </dd>
                  </div>
                </dl>
              </div>

              <div v-if="transactions.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
                No transactions found for this account.
              </div>
              <div v-else class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    <tr v-for="tx in transactions" :key="tx.transaction_id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {{ formatDate(tx.transaction_date) }}
                      </td>
                      <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {{ tx.description || '—' }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {{ tx.category_name || 'Uncategorized' }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium" :class="{
                        'text-green-600 dark:text-green-400': parseFloat(tx.signed_amount) >= 0,
                        'text-red-600 dark:text-red-400': parseFloat(tx.signed_amount) < 0
                      }">
                        {{ formatAmount(tx.signed_amount) }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {{ tx.transaction_type }}
                        <span v-if="tx.is_transfer" class="ml-1 text-xs text-indigo-600 dark:text-indigo-400">(Transfer)</span>
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {{ formatDate(tx.created_at) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Reconciliations Tab -->
            <div v-if="activeTab === 'reconciliations'" class="space-y-4">
              <div v-if="reconciliations.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
                No reconciliation sessions found for this account.
              </div>
              <div v-else class="space-y-4">
                <div
                  v-for="recon in reconciliations"
                  :key="recon.session_id"
                  class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div class="flex items-center justify-between mb-2">
                    <div>
                      <h3 class="text-sm font-medium text-gray-900 dark:text-white">
                        Session: {{ formatDate(recon.run_started) }}
                      </h3>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        Period: {{ formatDate(recon.period_start) }} - {{ formatDate(recon.period_end) }}
                      </p>
                    </div>
                    <span :class="[
                      'px-2 py-1 text-xs rounded-full',
                      recon.closed
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    ]">
                      {{ recon.closed ? 'Closed' : 'Active' }}
                    </span>
                  </div>
                  <dl class="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">Closing Balance</dt>
                      <dd class="text-gray-900 dark:text-white font-medium">{{ formatAmount(recon.closing_balance) }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">Variance</dt>
                      <dd class="text-gray-900 dark:text-white font-medium" :class="{
                        'text-green-600 dark:text-green-400': Math.abs(recon.variance || 0) < 0.01,
                        'text-red-600 dark:text-red-400': Math.abs(recon.variance || 0) >= 0.01
                      }">
                        {{ formatAmount(recon.variance || 0) }}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">Matches</dt>
                      <dd class="text-gray-900 dark:text-white">{{ recon.match_count || 0 }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">Session ID</dt>
                      <dd class="text-gray-500 dark:text-gray-400 font-mono text-xs">{{ recon.session_id }}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            <!-- Statement Imports Tab -->
            <div v-if="activeTab === 'statement-imports'" class="space-y-4">
              <div v-if="statementImports.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
                No statement imports found for this account.
              </div>
              <div v-else class="space-y-4">
                <div
                  v-for="importItem in statementImports"
                  :key="importItem.import_id"
                  class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <h3 
                          v-if="editingStatementName !== importItem.import_id"
                          class="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                          @click="startEditingStatementName(importItem)"
                        >
                          {{ importItem.statement_name || importItem.source_filename }}
                        </h3>
                        <input
                          v-else
                          v-model="editingStatementNameValue"
                          @blur="saveStatementName(importItem.import_id)"
                          @keyup.enter="saveStatementName(importItem.import_id)"
                          @keyup.esc="cancelEditingStatementName"
                          class="text-sm font-medium px-2 py-1 border border-blue-500 rounded dark:bg-gray-700 dark:text-white dark:border-blue-400"
                          ref="statementNameInput"
                        />
                        <button
                          v-if="editingStatementName !== importItem.import_id"
                          @click="startEditingStatementName(importItem)"
                          class="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                          title="Edit statement name"
                        >
                          ✏️
                        </button>
                      </div>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ importItem.bank_name || 'Unknown Bank' }}
                        <span v-if="importItem.statement_name && importItem.statement_name !== importItem.source_filename" class="ml-2">
                          • {{ importItem.source_filename }}
                        </span>
                      </p>
                    </div>
                    <span class="px-2 py-1 text-xs rounded-full" :class="{
                      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300': importItem.status === 'completed',
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300': importItem.status === 'pending',
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300': importItem.status === 'error'
                    }">
                      {{ importItem.status || 'pending' }}
                    </span>
                  </div>
                  <dl class="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">Statement Period</dt>
                      <dd class="text-gray-900 dark:text-white">
                        {{ formatDate(importItem.statement_from) }} - {{ formatDate(importItem.statement_to) }}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">Lines</dt>
                      <dd class="text-gray-900 dark:text-white">{{ importItem.line_count || 0 }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">Closing Balance</dt>
                      <dd class="text-gray-900 dark:text-white font-medium">
                        {{ formatAmount(importItem.closing_balance) }}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">Imported</dt>
                      <dd class="text-gray-900 dark:text-white">{{ formatDate(importItem.created_at) }}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            <!-- Transaction Imports Tab -->
            <div v-if="activeTab === 'transaction-imports'" class="space-y-4">
              <div v-if="transactionImports.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
                No transaction imports found for this account.
              </div>
              <div v-else class="space-y-4">
                <div
                  v-for="importItem in transactionImports"
                  :key="importItem.id"
                  class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div class="flex items-center justify-between mb-2">
                    <div>
                      <h3 class="text-sm font-medium text-gray-900 dark:text-white">
                        Import ID: {{ importItem.id }}
                      </h3>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        Import Date: {{ formatDate(importItem.import_date) }}
                      </p>
                    </div>
                    <span class="px-2 py-1 text-xs rounded-full" :class="{
                      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300': importItem.status === 'completed',
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300': importItem.status === 'processing',
                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300': importItem.status === 'error'
                    }">
                      {{ importItem.status || 'processing' }}
                    </span>
                  </div>
                  <dl class="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">Status</dt>
                      <dd class="text-gray-900 dark:text-white capitalize">{{ importItem.status }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">Created</dt>
                      <dd class="text-gray-900 dark:text-white">{{ formatDate(importItem.created_at) }}</dd>
                    </div>
                    <div v-if="importItem.error_message" class="col-span-2">
                      <dt class="text-gray-500 dark:text-gray-400">Error</dt>
                      <dd class="text-red-600 dark:text-red-400 text-sm">{{ importItem.error_message }}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            <!-- Balance Adjustments Tab -->
            <div v-if="activeTab === 'balance-adjustments'" class="space-y-4">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium text-gray-900 dark:text-white">Balance Adjustments</h3>
                <button
                  @click="openBalanceAdjustmentModal"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Create Balance Adjustment
                </button>
              </div>
              <div v-if="balanceAdjustments.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
                No balance adjustments found for this account.
              </div>
              <div v-else class="space-y-4">
                <div
                  v-for="adjustment in balanceAdjustments"
                  :key="adjustment.adjustment_id"
                  class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div class="flex items-center justify-between mb-2">
                    <h3 class="text-sm font-medium text-gray-900 dark:text-white">
                      Adjustment: {{ formatDate(adjustment.adjustment_date || adjustment.created_at) }}
                    </h3>
                    <span class="text-sm font-medium" :class="{
                      'text-green-600 dark:text-green-400': parseFloat(adjustment.adjustment_amount) >= 0,
                      'text-red-600 dark:text-red-400': parseFloat(adjustment.adjustment_amount) < 0
                    }">
                      {{ formatAmount(adjustment.adjustment_amount) }}
                    </span>
                  </div>
                  <dl class="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">Reason</dt>
                      <dd class="text-gray-900 dark:text-white">{{ adjustment.adjustment_reason || '—' }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">Balance Before</dt>
                      <dd class="text-gray-900 dark:text-white">{{ formatAmount(adjustment.balance_before) }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">Balance After</dt>
                      <dd class="text-gray-900 dark:text-white">{{ formatAmount(adjustment.balance_after) }}</dd>
                    </div>
                    <div>
                      <dt class="text-gray-500 dark:text-gray-400">Created</dt>
                      <dd class="text-gray-900 dark:text-white">{{ formatDate(adjustment.created_at) }}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            <!-- Field Mappings Tab -->
            <div v-if="activeTab === 'field-mappings'" class="space-y-4">
              <div v-if="fieldMappings.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
                No field mappings configured for this account.
              </div>
              <div v-else class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Field Name</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">CSV Header</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Updated</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    <tr v-for="mapping in fieldMappings" :key="mapping.mapping_id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {{ mapping.field_name }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {{ mapping.csv_header }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {{ formatDate(mapping.created_at) }}
                      </td>
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {{ formatDate(mapping.updated_at) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Balance Adjustment Modal -->
    <div v-if="showBalanceAdjustmentModal" class="fixed z-10 inset-0 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>
        <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                  Create Historic Balance Adjustment
                </h3>
                
                <!-- RED FONTED WARNING -->
                <div class="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg">
                  <p class="text-red-600 dark:text-red-400 font-bold text-base">
                    ⚠️ DO NOT DO THIS UNLESS YOU ARE SURE
                  </p>
                  <p class="text-red-600 dark:text-red-400 text-sm mt-2">
                    Historic balance adjustments should only be used for corrections or adjustments that occurred in the past. 
                    This will permanently modify your account balance and create an audit trail record. 
                    Use this feature carefully and only when absolutely necessary.
                  </p>
                </div>

                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Adjustment Amount</label>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Positive amounts increase balance, negative amounts decrease balance
                    </p>
                    <input
                      v-model="balanceAdjustmentForm.adjustment_amount"
                      type="number"
                      step="0.01"
                      class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Adjustment Date</label>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      The date this adjustment occurred (can be in the past)
                    </p>
                    <input
                      v-model="balanceAdjustmentForm.adjustment_date"
                      type="date"
                      class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Reason</label>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Explain why this adjustment is necessary (required for audit trail)
                    </p>
                    <textarea
                      v-model="balanceAdjustmentForm.adjustment_reason"
                      rows="3"
                      class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      placeholder="e.g., Found error in statement, Bank correction, etc."
                    ></textarea>
                  </div>
                  <div v-if="account" class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Balance:</p>
                    <p class="text-lg font-semibold text-gray-900 dark:text-white">
                      {{ formatAmount(account.current_balance) }}
                    </p>
                    <p v-if="balanceAdjustmentForm.adjustment_amount" class="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      New Balance After Adjustment:
                      <span class="font-semibold" :class="{
                        'text-green-600 dark:text-green-400': (parseFloat(account.current_balance) + parseFloat(balanceAdjustmentForm.adjustment_amount || 0)) >= parseFloat(account.current_balance),
                        'text-red-600 dark:text-red-400': (parseFloat(account.current_balance) + parseFloat(balanceAdjustmentForm.adjustment_amount || 0)) < parseFloat(account.current_balance)
                      }">
                        {{ formatAmount(parseFloat(account.current_balance) + parseFloat(balanceAdjustmentForm.adjustment_amount || 0)) }}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="saveBalanceAdjustment"
              :disabled="!balanceAdjustmentForm.adjustment_amount || !balanceAdjustmentForm.adjustment_date || !balanceAdjustmentForm.adjustment_reason"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
            >
              Create Adjustment
            </button>
            <button
              @click="closeBalanceAdjustmentModal"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { formatDate, formatDateShort, getToday, compareDates, normalizeAppDateClient } from '../utils/dateUtils';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const loading = ref(true);
const error = ref(null);
const account = ref(null);
const transactions = ref([]);
const reconciliations = ref([]);
const statementImports = ref([]);
const transactionImports = ref([]);
const balanceAdjustments = ref([]);
const fieldMappings = ref([]);
const activeTab = ref('transactions');
const showBalanceAdjustmentModal = ref(false);
const editingStatementName = ref(null);
const editingStatementNameValue = ref('');
const statementNameInput = ref(null);
const balanceAdjustmentForm = ref({
  adjustment_amount: '',
  adjustment_date: getToday(),
  adjustment_reason: ''
});

const tabs = computed(() => [
  { id: 'transactions', name: 'Transactions', count: transactions.value.length },
  { id: 'reconciliations', name: 'Reconciliations', count: reconciliations.value.length },
  { id: 'statement-imports', name: 'Statement Imports', count: statementImports.value.length },
  { id: 'transaction-imports', name: 'Transaction Imports', count: transactionImports.value.length },
  { id: 'balance-adjustments', name: 'Balance Adjustments', count: balanceAdjustments.value.length },
  { id: 'field-mappings', name: 'Field Mappings', count: fieldMappings.value.length }
]);

const formatAmount = (amount) => {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(num);
};

// formatDate and formatDateShort are now imported from dateUtils

// Opening balance = user-entered value when account was created (NEVER changes)
const calculatedOpeningBalance = computed(() => {
  if (!account.value) return 0;
  // Use opening_balance field if available, otherwise fallback to current_balance for backward compatibility
  return parseFloat(account.value.opening_balance ?? account.value.current_balance ?? 0);
});

// Calculate sum of all transactions
const transactionSum = computed(() => {
  return transactions.value.reduce((sum, tx) => {
    return sum + (parseFloat(tx.signed_amount) || 0);
  }, 0);
});

// Calculate expected balance (opening + transactions)
const calculatedBalance = computed(() => {
  return calculatedOpeningBalance.value + transactionSum.value;
});

// Calculate variance between calculated and current balance
const variance = computed(() => {
  if (!account.value) return 0;
  const currentBalance = parseFloat(account.value.current_balance) || 0;
  return currentBalance - calculatedBalance.value;
});

// Get opening balance date (earliest transaction date or account creation date)
const openingBalanceDate = computed(() => {
  if (transactions.value.length === 0) {
    return account.value?.created_at || account.value?.last_balance_update;
  }
  
  // Find earliest transaction date
  const dates = transactions.value
    .map(tx => tx.transaction_date)
    .filter(d => d)
    .sort();
  
  return dates[0] || account.value?.created_at;
});

// Get latest reconciliation date (period_end of latest closed reconciliation)
const latestReconciliationDate = computed(() => {
  if (!reconciliations.value || reconciliations.value.length === 0) {
    return null;
  }
  
  // Filter to only closed reconciliations
  const closedReconciliations = reconciliations.value.filter(recon => recon.closed);
  
  if (closedReconciliations.length === 0) {
    return null;
  }
  
  // Sort by period_end date (most recent first) and return the latest
  const sorted = closedReconciliations
    .filter(recon => recon.period_end)
    .sort((a, b) => {
      return compareDates(a.period_end, b.period_end) * -1; // Reverse for descending
    });
  
  return sorted.length > 0 ? sorted[0].period_end : null;
});

const fetchAccountDetails = async () => {
  const accountId = route.params.id;
  if (!accountId) {
    error.value = 'Account ID is required';
    loading.value = false;
    return;
  }

  try {
    loading.value = true;
    error.value = null;

    const response = await axios.get(`/accounts/${accountId}/details`);

    if (response.data) {
      account.value = response.data.account;
      transactions.value = response.data.transactions || [];
      reconciliations.value = response.data.reconciliations || [];
      statementImports.value = response.data.statementImports || [];
      transactionImports.value = response.data.transactionImports || [];
      balanceAdjustments.value = response.data.balanceAdjustments || [];
      fieldMappings.value = response.data.fieldMappings || [];
    }
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Failed to fetch account details';
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
};

const openBalanceAdjustmentModal = () => {
  balanceAdjustmentForm.value = {
    adjustment_amount: '',
    adjustment_date: getToday(),
    adjustment_reason: ''
  };
  showBalanceAdjustmentModal.value = true;
};

const closeBalanceAdjustmentModal = () => {
  showBalanceAdjustmentModal.value = false;
};

const saveBalanceAdjustment = async () => {
  try {
    const accountId = route.params.id;
    const response = await axios.post(`/accounts/${accountId}/balance-adjustments`, balanceAdjustmentForm.value);
    
    toast.success('Balance adjustment created successfully');
    closeBalanceAdjustmentModal();
    await fetchAccountDetails(); // Refresh to show new adjustment
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message || 'Failed to create balance adjustment';
    toast.error(errorMsg);
  }
};

const startEditingStatementName = (importItem) => {
  editingStatementName.value = importItem.import_id;
  editingStatementNameValue.value = importItem.statement_name || importItem.source_filename || '';
  // Focus input on next tick
  nextTick(() => {
    if (statementNameInput.value && Array.isArray(statementNameInput.value)) {
      const input = statementNameInput.value.find(el => el);
      if (input) input.focus();
    } else if (statementNameInput.value) {
      statementNameInput.value.focus();
    }
  });
};

const cancelEditingStatementName = () => {
  editingStatementName.value = null;
  editingStatementNameValue.value = '';
};

const saveStatementName = async (importId) => {
  if (!editingStatementNameValue.value || editingStatementNameValue.value.trim() === '') {
    toast.error('Statement name cannot be empty');
    cancelEditingStatementName();
    return;
  }

  try {
    const { reconciliationAPI } = await import('../lib/http');
    await reconciliationAPI.updateStatementName(importId, editingStatementNameValue.value.trim());
    
    // Update local state
    const importItem = statementImports.value.find(item => item.import_id === importId);
    if (importItem) {
      importItem.statement_name = editingStatementNameValue.value.trim();
    }
    
    toast.success('Statement name updated successfully');
    cancelEditingStatementName();
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message || 'Failed to update statement name';
    toast.error(errorMsg);
    cancelEditingStatementName();
  }
};

onMounted(() => {
  fetchAccountDetails();
});
</script>

