<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="px-4 py-5 sm:px-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          View activity history, statement imports, balance adjustments, and reconciliation sessions
        </p>
      </div>

      <!-- Statistics Cards -->
      <div v-if="stats" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 mb-6">
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Balance Adjustments</dt>
          <dd class="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{{ stats.balance_adjustments || 0 }}</dd>
        </div>
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Statement Imports</dt>
          <dd class="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{{ stats.statement_imports || 0 }}</dd>
        </div>
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Transaction Imports</dt>
          <dd class="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{{ stats.transaction_imports || 0 }}</dd>
        </div>
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Reconciliations</dt>
          <dd class="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{{ stats.reconciliations || 0 }}</dd>
        </div>
        <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Accounts</dt>
          <dd class="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{{ stats.accounts || 0 }}</dd>
        </div>
        <router-link 
          to="/audit/category-verification-files"
          class="bg-white dark:bg-gray-800 shadow rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Category Verification Files</dt>
          <dd class="mt-1 text-2xl font-semibold text-indigo-600 dark:text-indigo-400">{{ stats.category_verification_files || 0 }}</dd>
        </router-link>
      </div>

      <!-- Filters -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-6">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select
              v-model="filters.type"
              class="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Types</option>
              <option value="balance_adjustment">Balance Adjustments</option>
              <option value="statement_import">Statement Imports</option>
              <option value="transaction_import">Transaction Imports</option>
              <option value="reconciliation">Reconciliation Sessions</option>
              <option value="account_created">Account Created</option>
              <option value="category_verification_file">Category Verification Files</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account</label>
            <select
              v-model="filters.accountId"
              class="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Accounts</option>
              <option v-for="account in accounts" :key="account.account_id" :value="account.account_id">
                {{ account.account_name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
            <input
              v-model="filters.startDate"
              type="date"
              class="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
            <input
              v-model="filters.endDate"
              type="date"
              class="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <button
            @click="applyFilters"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Apply Filters
          </button>
          <button
            @click="clearFilters"
            class="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">Loading audit logs...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p class="text-red-800 dark:text-red-200">{{ error }}</p>
      </div>

      <!-- Audit Logs Table -->
      <div v-else class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 class="text-lg font-medium text-gray-900 dark:text-white">
            Audit Logs ({{ total }} total)
          </h2>
        </div>
        
        <div v-if="auditLogs.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
          No audit logs found matching your filters.
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Account</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="log in auditLogs" :key="log.id" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {{ formatDate(log.timestamp || log.created_at) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs rounded-full font-medium" :class="getTypeBadgeClass(log.type)">
                    {{ log.type_label || log.type }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  <button
                    v-if="log.account_id"
                    @click="$router.push(`/accounts/${log.account_id}`)"
                    class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                  >
                    {{ getAccountName(log.account_id) }}
                  </button>
                  <span v-else class="text-gray-400">—</span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">
                  {{ getLogDescription(log) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium" :class="getAmountClass(log.amount)">
                  {{ log.amount != null ? formatAmount(log.amount) : '—' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span v-if="log.type === 'category_verification_file' && log.verification" class="px-2 py-1 text-xs rounded-full" :class="log.verification.passed ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'">
                    {{ log.verification.passed ? 'Passed' : 'Failed' }}
                  </span>
                  <span v-else-if="log.status || log.integrity_status" class="px-2 py-1 text-xs rounded-full" :class="getStatusBadgeClass(log.status || log.integrity_status)">
                    {{ log.status || log.integrity_status }}
                  </span>
                  <span v-else-if="log.closed !== undefined" class="px-2 py-1 text-xs rounded-full" :class="log.closed ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'">
                    {{ log.closed ? 'Closed' : 'Active' }}
                  </span>
                  <span v-else class="text-gray-400">—</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <div class="flex items-center space-x-2">
                    <button
                      @click="viewDetails(log)"
                      class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      title="View Details"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      v-if="log.type !== 'account_created'"
                      @click="confirmDelete(log)"
                      class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <span v-if="log.type === 'account_created'" class="text-gray-400 text-xs">—</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="total > limit" class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div class="text-sm text-gray-700 dark:text-gray-300">
            Showing {{ offset + 1 }} to {{ Math.min(offset + limit, total) }} of {{ total }} results
          </div>
          <div class="flex space-x-2">
            <button
              @click="previousPage"
              :disabled="offset === 0"
              class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              @click="nextPage"
              :disabled="offset + limit >= total"
              class="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Details Modal -->
    <div v-if="showDetailsModal && logToView" class="fixed z-10 inset-0 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>
        <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                  Audit Log Details
                </h3>
                <div class="space-y-4">
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Type</dt>
                    <dd class="mt-1">
                      <span class="px-2 py-1 text-xs rounded-full font-medium" :class="getTypeBadgeClass(logToView.type)">
                        {{ logToView.type_label || logToView.type }}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Date</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                      {{ formatDate(logToView.timestamp || logToView.created_at) }}
                    </dd>
                  </div>
                  <div v-if="logToView.account_id">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Account</dt>
                    <dd class="mt-1">
                      <button
                        @click="viewAccount(logToView.account_id)"
                        class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline"
                      >
                        {{ getAccountName(logToView.account_id) }}
                      </button>
                    </dd>
                  </div>
                  <div v-if="logToView.description">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Description</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ logToView.description }}</dd>
                  </div>
                  <div v-if="logToView.amount != null">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Amount</dt>
                    <dd class="mt-1 text-sm font-medium" :class="getAmountClass(logToView.amount)">
                      {{ formatAmount(logToView.amount) }}
                    </dd>
                  </div>
                  <div v-if="logToView.adjustment_reason">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Reason</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ logToView.adjustment_reason }}</dd>
                  </div>
                  <div v-if="logToView.balance_before != null && logToView.balance_after != null">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Balance Change</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                      {{ formatAmount(logToView.balance_before) }} → {{ formatAmount(logToView.balance_after) }}
                    </dd>
                  </div>
                  <div v-if="logToView.statement_from && logToView.statement_to">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Statement Period</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                      {{ formatDate(logToView.statement_from) }} - {{ formatDate(logToView.statement_to) }}
                    </dd>
                  </div>
                  <div v-if="logToView.period_start && logToView.period_end">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Reconciliation Period</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                      {{ formatDate(logToView.period_start) }} - {{ formatDate(logToView.period_end) }}
                    </dd>
                  </div>
                  <div v-if="logToView.bank_name">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Bank</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white">{{ logToView.bank_name }}</dd>
                  </div>
                  <div v-if="logToView.status || logToView.integrity_status">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                    <dd class="mt-1">
                      <span class="px-2 py-1 text-xs rounded-full" :class="getStatusBadgeClass(logToView.status || logToView.integrity_status)">
                        {{ logToView.status || logToView.integrity_status }}
                      </span>
                    </dd>
                  </div>
                  <div v-if="logToView.variance != null">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Variance</dt>
                    <dd class="mt-1 text-sm font-medium" :class="{
                      'text-green-600 dark:text-green-400': Math.abs(logToView.variance) < 0.01,
                      'text-red-600 dark:text-red-400': Math.abs(logToView.variance) >= 0.01
                    }">
                      {{ formatAmount(logToView.variance) }}
                    </dd>
                  </div>
                  <div v-if="logToView.closed !== undefined">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                    <dd class="mt-1">
                      <span class="px-2 py-1 text-xs rounded-full" :class="logToView.closed ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'">
                        {{ logToView.closed ? 'Closed' : 'Active' }}
                      </span>
                    </dd>
                  </div>
                  <div v-if="logToView.type === 'category_verification_file'">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Filename</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-white font-mono">{{ logToView.filename }}</dd>
                  </div>
                  <div v-if="logToView.type === 'category_verification_file' && logToView.verification">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Verification Status</dt>
                    <dd class="mt-1">
                      <span class="px-2 py-1 text-xs rounded-full" :class="logToView.verification.passed ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'">
                        {{ logToView.verification.passed ? 'Passed' : 'Failed' }}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">ID</dt>
                    <dd class="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono">{{ logToView.id }}</dd>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="closeDetailsModal"
              class="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="fixed z-10 inset-0 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>
        <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Delete Audit Log Entry
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to delete this {{ logToDelete?.type_label || 'audit log entry' }}?
                  </p>
                  <div v-if="logToDelete" class="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <p class="text-xs font-medium text-gray-700 dark:text-gray-300">Details:</p>
                    <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Type: {{ logToDelete.type_label || logToDelete.type }}
                    </p>
                    <p class="text-xs text-gray-600 dark:text-gray-400">
                      Date: {{ formatDate(logToDelete.timestamp || logToDelete.created_at) }}
                    </p>
                    <p v-if="logToDelete.description" class="text-xs text-gray-600 dark:text-gray-400">
                      {{ logToDelete.description }}
                    </p>
                  </div>
                  <div v-if="logToDelete?.type === 'balance_adjustment'" class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <p class="text-xs font-medium text-red-800 dark:text-red-300">
                      ⚠️ Warning: Deleting this balance adjustment will reverse the account balance change.
                    </p>
                  </div>
                  <div v-if="logToDelete?.type === 'transaction_import'" class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <p class="text-xs font-medium text-red-800 dark:text-red-300">
                      ⚠️ Warning: This will delete all transactions from this import and recalculate account balances.
                    </p>
                  </div>
                  <div v-if="logToDelete?.type === 'reconciliation'" class="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                    <p class="text-xs font-medium text-red-800 dark:text-red-300">
                      ⚠️ Warning: This will unreconcile all transactions that were only reconciled in this session.
                    </p>
                  </div>
                  <div v-if="logToDelete?.type === 'category_verification_file'" class="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                    <p class="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                      ⚠️ Warning: This will permanently delete the verification file from the server.
                    </p>
                  </div>
                  <p class="text-sm font-medium text-red-600 dark:text-red-400 mt-3">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="deleteAuditLog"
              :disabled="deleting"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
            >
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
            <button
              @click="closeDeleteModal"
              :disabled="deleting"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { formatDate } from '../utils/dateUtils';
import { useAccountStore } from '../stores/account';

const toast = useToast();
const router = useRouter();
const accountStore = useAccountStore();

const loading = ref(true);
const error = ref(null);
const auditLogs = ref([]);
const stats = ref(null);
const accounts = ref([]);
const total = ref(0);
const limit = ref(100);
const offset = ref(0);
const showDeleteModal = ref(false);
const showDetailsModal = ref(false);
const logToDelete = ref(null);
const logToView = ref(null);
const deleting = ref(false);

const filters = ref({
  type: '',
  accountId: '',
  startDate: '',
  endDate: ''
});

const formatAmount = (amount) => {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(num);
};

const getTypeBadgeClass = (type) => {
  const classes = {
    balance_adjustment: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    statement_import: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    transaction_import: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    reconciliation: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    account_created: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    category_verification_file: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
  };
  return classes[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
};

const getStatusBadgeClass = (status) => {
  const classes = {
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    ok: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    mismatch: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  };
  return classes[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
};

const getAmountClass = (amount) => {
  if (amount == null) return 'text-gray-500 dark:text-gray-400';
  const num = parseFloat(amount) || 0;
  return num >= 0 
    ? 'text-green-600 dark:text-green-400' 
    : 'text-red-600 dark:text-red-400';
};

const getAccountName = (accountId) => {
  const account = accounts.value.find(a => a.account_id === accountId);
  return account ? account.account_name : accountId;
};

const getLogDescription = (log) => {
  if (log.description) return log.description;
  if (log.type === 'statement_import') {
    return `${log.bank_name || 'Bank'} Statement (${formatDate(log.statement_from)} - ${formatDate(log.statement_to)})`;
  }
  if (log.type === 'reconciliation') {
    return `Reconciliation Period: ${formatDate(log.period_start)} - ${formatDate(log.period_end)}`;
  }
  if (log.type === 'account_created') {
    return `${log.account_type || 'Account'} - ${log.description || 'Created'}`;
  }
  if (log.type === 'category_verification_file') {
    const filters = log.metadata?.filters || {};
    const dateRange = filters.start_date && filters.end_date 
      ? `${formatDate(filters.start_date)} - ${formatDate(filters.end_date)}`
      : filters.start_date 
        ? `From ${formatDate(filters.start_date)}`
        : filters.end_date
          ? `Until ${formatDate(filters.end_date)}`
          : 'All dates';
    const userFilter = filters.user_id ? `User: ${filters.user_id.substring(0, 8)}...` : 'All users';
    return `Verification File - ${userFilter}, ${dateRange}`;
  }
  return '—';
};

const fetchAuditLogs = async () => {
  try {
    loading.value = true;
    error.value = null;

    const params = {
      limit: limit.value,
      offset: offset.value
    };

    if (filters.value.type) params.type = filters.value.type;
    if (filters.value.accountId) params.account_id = filters.value.accountId;
    if (filters.value.startDate) params.start_date = filters.value.startDate;
    if (filters.value.endDate) params.end_date = filters.value.endDate;

    const response = await axios.get('/audit/logs', { params });
    
    if (response.data) {
      auditLogs.value = response.data.logs || [];
      total.value = response.data.total || 0;
    }
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Failed to fetch audit logs';
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
};

const fetchAuditStats = async () => {
  try {
    const response = await axios.get('/audit/stats');
    if (response.data) {
      stats.value = response.data;
    }
  } catch (err) {
    console.error('Failed to fetch audit stats:', err);
  }
};

const fetchAccounts = async () => {
  try {
    await accountStore.fetchAccounts();
    accounts.value = accountStore.accounts;
  } catch (err) {
    console.error('Failed to fetch accounts:', err);
  }
};

const applyFilters = () => {
  offset.value = 0;
  fetchAuditLogs();
};

const clearFilters = () => {
  filters.value = {
    type: '',
    accountId: '',
    startDate: '',
    endDate: ''
  };
  offset.value = 0;
  fetchAuditLogs();
};

const nextPage = () => {
  if (offset.value + limit.value < total.value) {
    offset.value += limit.value;
    fetchAuditLogs();
  }
};

const previousPage = () => {
  if (offset.value > 0) {
    offset.value = Math.max(0, offset.value - limit.value);
    fetchAuditLogs();
  }
};

const viewDetails = (log) => {
  logToView.value = log;
  showDetailsModal.value = true;
};

const closeDetailsModal = () => {
  showDetailsModal.value = false;
  logToView.value = null;
};

const viewAccount = (accountId) => {
  closeDetailsModal();
  router.push(`/accounts/${accountId}`);
};

const confirmDelete = (log) => {
  logToDelete.value = log;
  showDeleteModal.value = true;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  logToDelete.value = null;
  deleting.value = false;
};

const deleteAuditLog = async () => {
  if (!logToDelete.value) return;

  try {
    deleting.value = true;
    const { type, id } = logToDelete.value;
    
    await axios.delete(`/audit/logs/${type}/${id}`);
    
    toast.success('Audit log entry deleted successfully');
    closeDeleteModal();
    
    // Refresh logs and stats
    await Promise.all([
      fetchAuditStats(),
      fetchAuditLogs()
    ]);
  } catch (err) {
    deleting.value = false;
    const errorMsg = err.response?.data?.error || err.message || 'Failed to delete audit log entry';
    toast.error(errorMsg);
  }
};

onMounted(async () => {
  await Promise.all([
    fetchAccounts(),
    fetchAuditStats(),
    fetchAuditLogs()
  ]);
});
</script>

