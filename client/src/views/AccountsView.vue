<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="px-4 py-5 sm:px-6">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Accounts</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your financial accounts
        </p>
      </div>

      <!-- Action Bar -->
      <div class="bg-white dark:bg-gray-800 shadow px-4 py-5 sm:rounded-lg sm:p-6 mb-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <button
              @click="openCreateModal"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Add Account
            </button>
          </div>
        </div>
      </div>

      <!-- Accounts Table -->
      <div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th 
                  @click="toggleSort('account_name')" 
                  scope="col" 
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Name
                  <span v-if="sortBy === 'account_name'" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th 
                  @click="toggleSort('account_type')" 
                  scope="col" 
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Type
                  <span v-if="sortBy === 'account_type'" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th 
                  @click="toggleSort('timeframe')" 
                  scope="col" 
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Timeframe
                  <span v-if="sortBy === 'timeframe'" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th 
                  @click="toggleSort('current_balance')" 
                  scope="col" 
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Balance
                  <span v-if="sortBy === 'current_balance'" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th 
                  @click="toggleSort('last_balance_update')" 
                  scope="col" 
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Last Updated
                  <span v-if="sortBy === 'last_balance_update'" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th 
                  @click="toggleSort('reconciliation')" 
                  scope="col" 
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Reconciliation
                  <span v-if="sortBy === 'reconciliation'" class="ml-1">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <template v-for="account in sortedAccounts" :key="account.account_id">
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <button
                      @click="$router.push(`/accounts/${account.account_id}`)"
                      class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium hover:underline"
                    >
                      {{ account.account_name }}
                    </button>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white capitalize">
                    {{ account.account_type }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white capitalize">
                    <span v-if="account.timeframe" class="px-2 py-1 text-xs rounded-full" :class="{
                      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300': account.timeframe === 'short',
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300': account.timeframe === 'mid',
                      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300': account.timeframe === 'long'
                    }">
                      {{ account.timeframe }}
                    </span>
                    <span v-else class="text-gray-400 dark:text-gray-500">—</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {{ formatAmount(account.current_balance) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {{ formatDate(account.last_balance_update) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      @click="toggleReconciliationDetails(account.account_id)"
                      class="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                      <svg 
                        class="w-4 h-4 transition-transform"
                        :class="{ 'rotate-90': expandedReconciliations.has(account.account_id) }"
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                      <span v-if="getActiveReconciliation(account.account_id)" class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        Active
                      </span>
                      <span v-else-if="getLatestReconciliation(account.account_id)" class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        Closed
                      </span>
                      <span v-else class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-500">
                        None
                      </span>
                    </button>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      @click="openEditModal(account)"
                      class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      @click="confirmDelete(account)"
                      class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                <!-- Expanded Reconciliation Details Row -->
                <tr v-if="expandedReconciliations.has(account.account_id)" class="bg-gray-50 dark:bg-gray-900/50">
                  <td colspan="7" class="px-6 py-4">
                    <div class="space-y-3">
                      <!-- Active Reconciliation -->
                      <div v-if="getActiveReconciliation(account.account_id)" class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-800">
                        <div class="flex items-center justify-between mb-2">
                          <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Active Reconciliation</h4>
                          <span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            In Progress
                          </span>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span class="text-gray-500 dark:text-gray-400">Period:</span>
                            <div class="text-gray-900 dark:text-white font-medium">
                              {{ formatReconciliationDate(getActiveReconciliation(account.account_id).period_start) }} - 
                              {{ formatReconciliationDate(getActiveReconciliation(account.account_id).period_end) }}
                            </div>
                          </div>
                          <div>
                            <span class="text-gray-500 dark:text-gray-400">Closing Balance:</span>
                            <div class="text-gray-900 dark:text-white font-medium">
                              {{ formatAmount(getActiveReconciliation(account.account_id).closing_balance || 0) }}
                            </div>
                          </div>
                          <div>
                            <span class="text-gray-500 dark:text-gray-400">Calculated:</span>
                            <div class="text-gray-900 dark:text-white font-medium">
                              {{ formatAmount(getActiveReconciliation(account.account_id).calculated_balance || 0) }}
                            </div>
                          </div>
                          <div>
                            <span class="text-gray-500 dark:text-gray-400">Variance:</span>
                            <div 
                              class="font-medium"
                              :class="{
                                'text-green-600 dark:text-green-400': Math.abs(getActiveReconciliation(account.account_id).variance || 0) < 0.01,
                                'text-yellow-600 dark:text-yellow-400': Math.abs(getActiveReconciliation(account.account_id).variance || 0) >= 0.01 && Math.abs(getActiveReconciliation(account.account_id).variance || 0) < 1.00,
                                'text-red-600 dark:text-red-400': Math.abs(getActiveReconciliation(account.account_id).variance || 0) >= 1.00
                              }"
                            >
                              {{ formatAmount(getActiveReconciliation(account.account_id).variance || 0) }}
                            </div>
                          </div>
                        </div>
                        <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <span class="text-xs text-gray-500 dark:text-gray-400">
                            Started: {{ formatDate(getActiveReconciliation(account.account_id).run_started) }}
                          </span>
                        </div>
                      </div>
                      
                      <!-- Latest Closed Reconciliation -->
                      <div v-else-if="getLatestReconciliation(account.account_id)" class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div class="flex items-center justify-between mb-2">
                          <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Latest Reconciliation</h4>
                          <span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            Closed
                          </span>
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span class="text-gray-500 dark:text-gray-400">Period:</span>
                            <div class="text-gray-900 dark:text-white font-medium">
                              {{ formatReconciliationDate(getLatestReconciliation(account.account_id).period_start) }} - 
                              {{ formatReconciliationDate(getLatestReconciliation(account.account_id).period_end) }}
                            </div>
                          </div>
                          <div>
                            <span class="text-gray-500 dark:text-gray-400">Closing Balance:</span>
                            <div class="text-gray-900 dark:text-white font-medium">
                              {{ formatAmount(getLatestReconciliation(account.account_id).closing_balance || 0) }}
                            </div>
                          </div>
                          <div>
                            <span class="text-gray-500 dark:text-gray-400">Variance:</span>
                            <div 
                              class="font-medium"
                              :class="{
                                'text-green-600 dark:text-green-400': Math.abs(getLatestReconciliation(account.account_id).variance || 0) < 0.01,
                                'text-yellow-600 dark:text-yellow-400': Math.abs(getLatestReconciliation(account.account_id).variance || 0) >= 0.01 && Math.abs(getLatestReconciliation(account.account_id).variance || 0) < 1.00,
                                'text-red-600 dark:text-red-400': Math.abs(getLatestReconciliation(account.account_id).variance || 0) >= 1.00
                              }"
                            >
                              {{ formatAmount(getLatestReconciliation(account.account_id).variance || 0) }}
                            </div>
                          </div>
                          <div>
                            <span class="text-gray-500 dark:text-gray-400">Completed:</span>
                            <div class="text-gray-900 dark:text-white font-medium">
                              {{ formatDate(getLatestReconciliation(account.account_id).run_completed || getLatestReconciliation(account.account_id).run_started) }}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- No Reconciliation -->
                      <div v-else class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <p class="text-sm text-gray-500 dark:text-gray-400 text-center">
                          No reconciliation sessions found for this account.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              </template>
              <tr v-if="sortedAccounts.length === 0">
                <td colspan="7" class="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  No accounts found. Create your first account to get started.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create/Edit Account Modal -->
    <div v-if="showModal" class="fixed z-10 inset-0 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>
        <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  {{ isEditing ? 'Edit Account' : 'Create Account' }}
                </h3>
                <div class="mt-4 space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                    <input
                      v-model="accountForm.account_name"
                      type="text"
                      class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                    <select
                      v-model="accountForm.account_type"
                      class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Select a type</option>
                      <optgroup label="Assets (What You Own)">
                        <option value="checking">Checking Account</option>
                        <option value="savings">Savings Account</option>
                        <option value="investment">Investment Account</option>
                        <option value="cash">Cash</option>
                        <option value="other">Other Asset</option>
                      </optgroup>
                      <optgroup label="Liabilities (What You Owe)">
                        <option value="credit">Credit Card</option>
                        <option value="loan">Loan</option>
                        <option value="mortgage">Mortgage</option>
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Opening Balance
                      <span class="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1">
                        (Balance on the date the account is opened)
                      </span>
                    </label>
                    <input
                      v-model="accountForm.current_balance"
                      type="number"
                      step="0.01"
                      :disabled="isEditing"
                      :class="[
                        'mt-1 block w-full border rounded-md shadow-sm py-2 px-3 sm:text-sm',
                        isEditing 
                          ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                          : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                      ]"
                    />
                    <p v-if="isEditing" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Opening balance cannot be changed after account creation. Use Balance Adjustments for corrections.
                    </p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Timeframe</label>
                    <select
                      v-model="accountForm.timeframe"
                      class="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    >
                      <option :value="null">None</option>
                      <option value="short">Short</option>
                      <option value="mid">Mid</option>
                      <option value="long">Long</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Account Opening Date
                      <span class="text-xs text-gray-500 dark:text-gray-400 font-normal ml-1">
                        (Date the account was opened)
                      </span>
                    </label>
                    <input
                      v-model="accountForm.last_balance_update"
                      type="date"
                      :disabled="isEditing"
                      :class="[
                        'mt-1 block w-full border rounded-md shadow-sm py-2 px-3 sm:text-sm',
                        isEditing 
                          ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                          : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500'
                      ]"
                    />
                    <p v-if="isEditing" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Account opening date cannot be changed after account creation.
                    </p>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Positive Amounts are Credits</label>
                    <div class="mt-2">
                      <label class="inline-flex items-center">
                        <input
                          type="checkbox"
                          v-model="accountForm.positive_is_credit"
                          class="form-checkbox h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                        />
                        <span class="ml-2 text-sm text-gray-700 dark:text-gray-300">Check this if positive amounts represent credits (money coming in)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="saveAccount"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {{ isEditing ? 'Update' : 'Create' }}
            </button>
            <button
              @click="closeModal"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
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
                  Delete Account
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    Are you sure you want to delete the account "{{ accountToDelete?.account_name }}"? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="deleteAccount"
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Delete
            </button>
            <button
              @click="showDeleteModal = false"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- View Info -->
    <ViewInfo 
      view-name="Accounts" 
      :components="[]"
      :script-blocks="[
        { name: 'useAccountStore', type: 'store', functions: ['fetchAccounts', 'createAccount', 'updateAccount', 'deleteAccount'] },
        { name: 'reconciliationAPI', type: 'api', functions: ['getSessions'] }
      ]"
    />
  </div>
</template>

<script setup>
import { formatDate, getToday, normalizeAppDateClient, compareDates } from '../utils/dateUtils';
import { ref, onMounted, computed } from 'vue';
import { useAccountStore } from '../stores/account';
import { reconciliationAPI } from '../lib/http';
import ViewInfo from '../components/ViewInfo.vue';

const accountStore = useAccountStore();
const accounts = ref([]);
const showModal = ref(false);
const showDeleteModal = ref(false);
const isEditing = ref(false);
const accountToDelete = ref(null);
const expandedReconciliations = ref(new Set());
const reconciliationSessions = ref([]); // All reconciliation sessions
const activeReconciliations = ref({}); // Map of account_id -> active session
const latestReconciliations = ref({}); // Map of account_id -> latest closed session

// Sorting state
const sortBy = ref('account_name');
const sortDir = ref('asc');

const accountForm = ref({
  account_id: '',
  account_name: '',
  account_type: '',
  current_balance: 0,
  positive_is_credit: true,
  last_balance_update: getToday(),
  timeframe: null,
  metadata: {}
});

onMounted(async () => {
  await Promise.all([
    fetchAccounts(),
    fetchReconciliations()
  ]);
});

const fetchAccounts = async () => {
  try {
    await accountStore.fetchAccounts();
    accounts.value = accountStore.accounts;
  } catch (error) {
    
  }
};

const fetchReconciliations = async () => {
  try {
    // Fetch all reconciliation sessions (both active and closed)
    const response = await reconciliationAPI.getSessions({});
    const sessions = response.data || [];
    reconciliationSessions.value = sessions;
    
    // Create maps for active and latest closed sessions
    const activeMap = {};
    const latestMap = {};
    
    sessions.forEach(session => {
      if (!session.account_id) return;
      
      if (!session.closed) {
        // Active session - use most recent if multiple exist
        const existing = activeMap[session.account_id];
        if (!existing || compareDates(session.run_started, existing.run_started) > 0) {
          activeMap[session.account_id] = session;
        }
      } else {
        // Closed session - track latest one
        const existing = latestMap[session.account_id];
        if (!existing || compareDates(session.run_started, existing.run_started) > 0) {
          latestMap[session.account_id] = session;
        }
      }
    });
    
    activeReconciliations.value = activeMap;
    latestReconciliations.value = latestMap;
  } catch (error) {
    console.error('Error fetching reconciliations:', error);
    activeReconciliations.value = {};
    latestReconciliations.value = {};
  }
};

const toggleReconciliationDetails = (accountId) => {
  if (expandedReconciliations.value.has(accountId)) {
    expandedReconciliations.value.delete(accountId);
  } else {
    expandedReconciliations.value.add(accountId);
  }
  // Force reactivity
  expandedReconciliations.value = new Set(expandedReconciliations.value);
};

const getActiveReconciliation = (accountId) => {
  return activeReconciliations.value[accountId] || null;
};

const getLatestReconciliation = (accountId) => {
  return latestReconciliations.value[accountId] || null;
};

const formatReconciliationDate = (dateString) => {
  if (!dateString) return '';
  // Use date utils for formatting
  return formatDate(dateString);
};

// Get reconciliation status for sorting (0 = none, 1 = closed, 2 = active)
const getReconciliationSortValue = (accountId) => {
  if (getActiveReconciliation(accountId)) return 2;
  if (getLatestReconciliation(accountId)) return 1;
  return 0;
};

// Sorted accounts computed property
const sortedAccounts = computed(() => {
  const multiplier = sortDir.value === 'asc' ? 1 : -1;
  
  return [...accounts.value].sort((a, b) => {
    const key = sortBy.value;
    
    // Handle reconciliation status sorting
    if (key === 'reconciliation') {
      const aVal = getReconciliationSortValue(a.account_id);
      const bVal = getReconciliationSortValue(b.account_id);
      return (aVal - bVal) * multiplier;
    }
    
    // Handle balance sorting (numeric)
    if (key === 'current_balance') {
      const aVal = parseFloat(a.current_balance) || 0;
      const bVal = parseFloat(b.current_balance) || 0;
      return (aVal - bVal) * multiplier;
    }
    
    // Handle date sorting
    if (key === 'last_balance_update') {
      const aDate = a.last_balance_update ? normalizeAppDateClient(a.last_balance_update, 'api-to-domain') : null;
      const bDate = b.last_balance_update ? normalizeAppDateClient(b.last_balance_update, 'api-to-domain') : null;
      const comparison = compareDates(aDate || '0000-00-00', bDate || '0000-00-00');
      return comparison * multiplier;
    }
    
    // Handle timeframe sorting (null values go last)
    if (key === 'timeframe') {
      const aVal = a.timeframe || '';
      const bVal = b.timeframe || '';
      if (!aVal && !bVal) return 0;
      if (!aVal) return 1 * multiplier;
      if (!bVal) return -1 * multiplier;
      return aVal.localeCompare(bVal) * multiplier;
    }
    
    // Handle string sorting (case-insensitive)
    const aVal = String(a[key] || '').toLowerCase();
    const bVal = String(b[key] || '').toLowerCase();
    if (aVal < bVal) return -1 * multiplier;
    if (aVal > bVal) return 1 * multiplier;
    return 0;
  });
});

// Toggle sort function
const toggleSort = (key) => {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = key;
    // Default sort direction based on column type
    if (key === 'last_balance_update' || key === 'current_balance') {
      sortDir.value = 'desc'; // Most recent/highest first
    } else {
      sortDir.value = 'asc'; // Alphabetical first
    }
  }
};

const openCreateModal = () => {
  isEditing.value = false;
  accountForm.value = {
    account_id: '',
    account_name: '',
    account_type: '',
    current_balance: 0,
    positive_is_credit: true,
    last_balance_update: getToday(),
    timeframe: null,
    metadata: {}
  };
  showModal.value = true;
};

const openEditModal = (account) => {
  isEditing.value = true;
  accountForm.value = {
    ...account,
    last_balance_update: account.last_balance_update ? normalizeAppDateClient(account.last_balance_update, 'api-to-domain') || getToday() : getToday()
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const saveAccount = async () => {
  try {
    if (isEditing.value) {
      // When editing, exclude balance fields - they cannot be changed
      const { current_balance, last_balance_update, ...editableFields } = accountForm.value;
      await accountStore.updateAccount(accountForm.value.account_id, editableFields);
    } else {
      await accountStore.createAccount(accountForm.value);
    }
    await fetchAccounts();
    closeModal();
  } catch (error) {
    
  }
};

const confirmDelete = (account) => {
  accountToDelete.value = account;
  showDeleteModal.value = true;
};

const deleteAccount = async () => {
  try {
    await accountStore.deleteAccount(accountToDelete.value.account_id);
    await fetchAccounts();
    showDeleteModal.value = false;
  } catch (error) {
    
    showDeleteModal.value = false;
  }
};

const formatAmount = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};
</script> 