<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Header -->
      <div class="px-4 py-5 sm:px-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Category Verification Files</h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View category verification reports generated from direct database queries
            </p>
          </div>
          <div class="flex gap-3">
            <button
              @click="generateNewFile"
              :disabled="generating"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg v-if="!generating" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <svg v-else class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ generating ? 'Generating...' : 'Generate New' }}
            </button>
            <button
              @click="$router.push('/audit')"
              class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Audit
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="bg-white dark:bg-gray-800 shadow rounded-lg p-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400">Loading verification files...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p class="text-red-800 dark:text-red-200">{{ error }}</p>
      </div>

      <!-- Files List -->
      <div v-else class="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-lg font-medium text-gray-900 dark:text-white">
            Verification Files ({{ files.length }} total)
          </h2>
        </div>
        
        <div v-if="files.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
          No category verification files found.
        </div>
        
        <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
          <div
            v-for="file in files"
            :key="file.filename"
            @click="viewFile(file)"
            class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <h3 class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ file.filename }}
                    </h3>
                    <div class="mt-1 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span v-if="file.date">
                        Date: {{ formatDate(file.date) }}
                      </span>
                      <span v-if="file.userId">
                        User ID: {{ file.userId }}
                      </span>
                      <span>
                        Size: {{ formatFileSize(file.size) }}
                      </span>
                      <span v-if="file.metadata?.query_timestamp">
                        Query Time: {{ formatDateTime(file.metadata.query_timestamp) }}
                      </span>
                    </div>
                    <div v-if="file.metadata" class="mt-2 flex flex-wrap gap-2">
                      <span
                        v-if="file.metadata.filters?.user_id"
                        class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        User: {{ file.metadata.filters.user_id.substring(0, 8) }}...
                      </span>
                      <span
                        v-if="file.metadata.filters?.start_date"
                        class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      >
                        From: {{ file.metadata.filters.start_date }}
                      </span>
                      <span
                        v-if="file.metadata.filters?.end_date"
                        class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-300"
                      >
                        To: {{ file.metadata.filters.end_date }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="ml-4">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- File Details Modal -->
    <div v-if="showModal && selectedFile" class="fixed z-50 inset-0 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true" @click="closeModal">
          <div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>
        <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                  Category Verification Details
                </h3>
                
                <!-- Loading file content -->
                <div v-if="loadingFile" class="text-center py-8">
                  <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p class="mt-4 text-gray-600 dark:text-gray-400">Loading file content...</p>
                </div>

                <!-- File Content -->
                <div v-else-if="fileContent" class="space-y-6">
                  <!-- Metadata Section -->
                  <div class="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Metadata</h4>
                    <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Query Timestamp</dt>
                        <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                          {{ formatDateTime(fileContent.metadata?.query_timestamp) }}
                        </dd>
                      </div>
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Database Path</dt>
                        <dd class="mt-1 text-sm text-gray-900 dark:text-white font-mono text-xs">
                          {{ fileContent.metadata?.database_path }}
                        </dd>
                      </div>
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">User ID</dt>
                        <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                          {{ fileContent.metadata?.filters?.user_id || 'All' }}
                        </dd>
                      </div>
                      <div>
                        <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Date Range</dt>
                        <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                          <span v-if="fileContent.metadata?.filters?.start_date">
                            {{ fileContent.metadata.filters.start_date }}
                          </span>
                          <span v-else>All dates</span>
                          <span v-if="fileContent.metadata?.filters?.end_date">
                            - {{ fileContent.metadata.filters.end_date }}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <!-- Verification Section -->
                  <div v-if="fileContent.verification" class="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Verification</h4>
                    <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div class="flex items-center justify-between mb-3">
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                        <span
                          :class="fileContent.verification.passed
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'"
                          class="px-2 py-1 rounded-md text-xs font-medium"
                        >
                          {{ fileContent.verification.passed ? 'Passed' : 'Failed' }}
                        </span>
                      </div>
                      <dl class="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt class="text-gray-500 dark:text-gray-400">Total Signed Amount</dt>
                          <dd class="font-medium text-gray-900 dark:text-white">
                            {{ formatCurrency(fileContent.verification.total_all_signed_amount) }}
                          </dd>
                        </div>
                        <div>
                          <dt class="text-gray-500 dark:text-gray-400">Calculated Total</dt>
                          <dd class="font-medium text-gray-900 dark:text-white">
                            {{ formatCurrency(fileContent.verification.calculated_total) }}
                          </dd>
                        </div>
                        <div>
                          <dt class="text-gray-500 dark:text-gray-400">Total Income</dt>
                          <dd class="font-medium text-green-600 dark:text-green-400">
                            {{ formatCurrency(fileContent.verification.total_all_income) }}
                          </dd>
                        </div>
                        <div>
                          <dt class="text-gray-500 dark:text-gray-400">Total Expense</dt>
                          <dd class="font-medium text-red-600 dark:text-red-400">
                            {{ formatCurrency(fileContent.verification.total_all_expense) }}
                          </dd>
                        </div>
                        <div v-if="fileContent.verification.difference !== undefined" class="col-span-2">
                          <dt class="text-gray-500 dark:text-gray-400">Difference</dt>
                          <dd
                            :class="Math.abs(fileContent.verification.difference) < 0.01
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'"
                            class="font-medium"
                          >
                            {{ formatCurrency(fileContent.verification.difference) }}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <!-- Summary Totals -->
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <!-- Income Summary -->
                    <div
                      v-if="fileContent.income"
                      @click="showCategoryDetails('income')"
                      class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer transition-colors border-2 border-transparent hover:border-green-300 dark:hover:border-green-700"
                    >
                      <div class="flex items-center justify-between mb-2">
                        <h4 class="text-sm font-semibold text-green-900 dark:text-green-200">Income</h4>
                        <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div class="space-y-1 text-sm">
                        <div class="flex justify-between">
                          <span class="text-gray-600 dark:text-gray-400">Records:</span>
                          <span class="font-medium text-gray-900 dark:text-white">
                            {{ fileContent.income.data?.length || 0 }}
                          </span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-gray-600 dark:text-gray-400">Total Income:</span>
                          <span class="font-medium text-green-700 dark:text-green-300">
                            {{ formatCurrency(fileContent.income.totals?.total_income || 0) }}
                          </span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-gray-600 dark:text-gray-400">Total Expense:</span>
                          <span class="font-medium text-gray-900 dark:text-white">
                            {{ formatCurrency(fileContent.income.totals?.total_expense || 0) }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Expense Summary -->
                    <div
                      v-if="fileContent.expense"
                      @click="showCategoryDetails('expense')"
                      class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer transition-colors border-2 border-transparent hover:border-red-300 dark:hover:border-red-700"
                    >
                      <div class="flex items-center justify-between mb-2">
                        <h4 class="text-sm font-semibold text-red-900 dark:text-red-200">Expense</h4>
                        <svg class="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div class="space-y-1 text-sm">
                        <div class="flex justify-between">
                          <span class="text-gray-600 dark:text-gray-400">Records:</span>
                          <span class="font-medium text-gray-900 dark:text-white">
                            {{ fileContent.expense.data?.length || 0 }}
                          </span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-gray-600 dark:text-gray-400">Total Income:</span>
                          <span class="font-medium text-gray-900 dark:text-white">
                            {{ formatCurrency(fileContent.expense.totals?.total_income || 0) }}
                          </span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-gray-600 dark:text-gray-400">Total Expense:</span>
                          <span class="font-medium text-red-700 dark:text-red-300">
                            {{ formatCurrency(fileContent.expense.totals?.total_expense || 0) }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Transfers Summary -->
                    <div
                      v-if="fileContent.transfers"
                      @click="showCategoryDetails('transfers')"
                      class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                    >
                      <div class="flex items-center justify-between mb-2">
                        <h4 class="text-sm font-semibold text-gray-900 dark:text-white">Transfers</h4>
                        <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div class="space-y-1 text-sm">
                        <div class="flex justify-between">
                          <span class="text-gray-600 dark:text-gray-400">Records:</span>
                          <span class="font-medium text-gray-900 dark:text-white">
                            {{ fileContent.transfers.data?.length || 0 }}
                          </span>
                        </div>
                        <div class="flex justify-between">
                          <span class="text-gray-600 dark:text-gray-400">Net Amount:</span>
                          <span class="font-medium text-gray-900 dark:text-white">
                            {{ formatCurrency(fileContent.transfers.totals?.net || 0) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Error loading file -->
                <div v-else-if="fileError" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p class="text-red-800 dark:text-red-200">{{ fileError }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="closeModal"
              class="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Details Modal -->
    <div v-if="showCategoryModal && selectedCategory" class="fixed z-50 inset-0 overflow-y-auto">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true" @click="closeCategoryModal">
          <div class="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>
        <div class="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          <div class="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    {{ selectedCategory === 'income' ? 'Income' : selectedCategory === 'expense' ? 'Expense' : 'Transfers' }} Category Details
                  </h3>
                  <button
                    @click="closeCategoryModal"
                    class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <!-- Filters -->
                <div class="mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <!-- Category Name Filter -->
                    <div>
                      <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category Name</label>
                      <input
                        v-model="categoryFilters.categoryName"
                        type="text"
                        placeholder="Search category..."
                        class="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <!-- Month Filter -->
                    <div>
                      <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
                      <select
                        v-model="categoryFilters.month"
                        class="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="">All Months</option>
                        <option v-for="month in availableMonths" :key="month" :value="month">
                          {{ formatMonth(month) }}
                        </option>
                      </select>
                    </div>
                    <!-- Min Amount Filter -->
                    <div>
                      <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Min Amount</label>
                      <input
                        v-model.number="categoryFilters.minAmount"
                        type="number"
                        step="0.01"
                        placeholder="Min amount..."
                        class="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <!-- Max Amount Filter -->
                    <div>
                      <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Max Amount</label>
                      <input
                        v-model.number="categoryFilters.maxAmount"
                        type="number"
                        step="0.01"
                        placeholder="Max amount..."
                        class="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div class="mt-3 flex justify-between items-center">
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                      Showing {{ filteredCategoryData.length }} of {{ categoryData?.length || 0 }} records
                    </div>
                    <button
                      @click="clearCategoryFilters"
                      class="text-sm text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>

                <!-- Category Data Table -->
                <div v-if="filteredCategoryData && filteredCategoryData.length > 0" class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead class="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th 
                          @click="sortBy('category_name')"
                          class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                        >
                          <div class="flex items-center gap-2">
                            <span>Category</span>
                            <span v-if="sortColumn === 'category_name'" class="text-indigo-600 dark:text-indigo-400">
                              <svg v-if="sortDirection === 'asc'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                              </svg>
                              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </span>
                            <span v-else class="text-gray-400 dark:text-gray-500">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                            </span>
                          </div>
                        </th>
                        <th 
                          @click="sortBy('month')"
                          class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                        >
                          <div class="flex items-center gap-2">
                            <span>Month</span>
                            <span v-if="sortColumn === 'month'" class="text-indigo-600 dark:text-indigo-400">
                              <svg v-if="sortDirection === 'asc'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                              </svg>
                              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </span>
                            <span v-else class="text-gray-400 dark:text-gray-500">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                            </span>
                          </div>
                        </th>
                        <th 
                          @click="sortBy('transaction_count')"
                          class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                        >
                          <div class="flex items-center justify-end gap-2">
                            <span>Transactions</span>
                            <span v-if="sortColumn === 'transaction_count'" class="text-indigo-600 dark:text-indigo-400">
                              <svg v-if="sortDirection === 'asc'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                              </svg>
                              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </span>
                            <span v-else class="text-gray-400 dark:text-gray-500">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                            </span>
                          </div>
                        </th>
                        <th 
                          @click="sortBy('total_signed_amount')"
                          class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                        >
                          <div class="flex items-center justify-end gap-2">
                            <span>Total Amount</span>
                            <span v-if="sortColumn === 'total_signed_amount'" class="text-indigo-600 dark:text-indigo-400">
                              <svg v-if="sortDirection === 'asc'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                              </svg>
                              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </span>
                            <span v-else class="text-gray-400 dark:text-gray-500">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                            </span>
                          </div>
                        </th>
                        <th 
                          @click="sortBy('income')"
                          class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                        >
                          <div class="flex items-center justify-end gap-2">
                            <span>Income</span>
                            <span v-if="sortColumn === 'income'" class="text-indigo-600 dark:text-indigo-400">
                              <svg v-if="sortDirection === 'asc'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                              </svg>
                              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </span>
                            <span v-else class="text-gray-400 dark:text-gray-500">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                            </span>
                          </div>
                        </th>
                        <th 
                          @click="sortBy('expense')"
                          class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                        >
                          <div class="flex items-center justify-end gap-2">
                            <span>Expense</span>
                            <span v-if="sortColumn === 'expense'" class="text-indigo-600 dark:text-indigo-400">
                              <svg v-if="sortDirection === 'asc'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                              </svg>
                              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </span>
                            <span v-else class="text-gray-400 dark:text-gray-500">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                            </span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      <tr v-for="(item, index) in filteredCategoryData" :key="index" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {{ item.category_name }}
                          <span v-if="item.parent_category_id" class="text-xs text-gray-500 dark:text-gray-400 block">
                            Parent: {{ getCategoryName(item.parent_category_id) }}
                          </span>
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {{ formatMonth(item.month) }}
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                          {{ item.transaction_count || 0 }}
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-right font-medium"
                          :class="item.total_signed_amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                          {{ formatCurrency(item.total_signed_amount || 0) }}
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400">
                          {{ formatCurrency(item.income || 0) }}
                        </td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400">
                          {{ formatCurrency(item.expense || 0) }}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot class="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <td colspan="3" class="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                          {{ categoryFilters.categoryName || categoryFilters.month || categoryFilters.minAmount !== null || categoryFilters.maxAmount !== null ? 'Filtered Totals' : 'Totals' }}
                        </td>
                        <td class="px-4 py-3 text-sm text-right font-semibold"
                          :class="(filteredCategoryTotals.total_signed_amount || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                          {{ formatCurrency(filteredCategoryTotals.total_signed_amount || 0) }}
                        </td>
                        <td class="px-4 py-3 text-sm text-right font-semibold text-green-600 dark:text-green-400">
                          {{ formatCurrency(filteredCategoryTotals.total_income || 0) }}
                        </td>
                        <td class="px-4 py-3 text-sm text-right font-semibold text-red-600 dark:text-red-400">
                          {{ formatCurrency(filteredCategoryTotals.total_expense || 0) }}
                        </td>
                      </tr>
                      <tr v-if="categoryTotals && (categoryFilters.categoryName || categoryFilters.month || categoryFilters.minAmount !== null || categoryFilters.maxAmount !== null)" class="border-t border-gray-300 dark:border-gray-600">
                        <td colspan="3" class="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">Original Totals</td>
                        <td class="px-4 py-3 text-xs text-right font-medium"
                          :class="(categoryTotals.total_signed_amount || categoryTotals.net || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                          {{ formatCurrency(categoryTotals.total_signed_amount || categoryTotals.net || 0) }}
                        </td>
                        <td class="px-4 py-3 text-xs text-right font-medium text-green-600 dark:text-green-400">
                          {{ formatCurrency(categoryTotals.total_income || 0) }}
                        </td>
                        <td class="px-4 py-3 text-xs text-right font-medium text-red-600 dark:text-red-400">
                          {{ formatCurrency(categoryTotals.total_expense || 0) }}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
                  No category data available.
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              @click="closeCategoryModal"
              class="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { formatDate } from '../utils/dateUtils';

const toast = useToast();

const loading = ref(true);
const error = ref(null);
const files = ref([]);
const showModal = ref(false);
const selectedFile = ref(null);
const fileContent = ref(null);
const loadingFile = ref(false);
const fileError = ref(null);
const showCategoryModal = ref(false);
const selectedCategory = ref(null);
const categoryData = ref(null);
const categoryTotals = ref(null);
const categoryFilters = ref({
  categoryName: '',
  month: '',
  minAmount: null,
  maxAmount: null
});
const sortColumn = ref(null);
const sortDirection = ref('asc'); // 'asc' or 'desc'
const generating = ref(false);

const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(num);
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const formatDateTime = (dateString) => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  } catch (err) {
    return dateString;
  }
};

const formatMonth = (monthStr) => {
  if (!monthStr) return '—';
  try {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch (err) {
    return monthStr;
  }
};

const getCategoryName = (categoryId) => {
  if (!fileContent.value || !categoryId) return categoryId;
  // Try to find category name from all data
  const allData = [
    ...(fileContent.value.income?.data || []),
    ...(fileContent.value.expense?.data || []),
    ...(fileContent.value.transfers?.data || [])
  ];
  const category = allData.find(item => item.category_id === categoryId);
  return category?.category_name || categoryId;
};

// Computed: Get available months from category data
const availableMonths = computed(() => {
  if (!categoryData.value || categoryData.value.length === 0) return [];
  const months = new Set();
  categoryData.value.forEach(item => {
    if (item.month) months.add(item.month);
  });
  return Array.from(months).sort().reverse(); // Newest first
});

// Computed: Filter category data based on filters
const filteredCategoryData = computed(() => {
  if (!categoryData.value || categoryData.value.length === 0) return [];
  
  let filtered = [...categoryData.value];
  
  // Filter by category name
  if (categoryFilters.value.categoryName) {
    const searchTerm = categoryFilters.value.categoryName.toLowerCase();
    filtered = filtered.filter(item => 
      item.category_name?.toLowerCase().includes(searchTerm)
    );
  }
  
  // Filter by month
  if (categoryFilters.value.month) {
    filtered = filtered.filter(item => item.month === categoryFilters.value.month);
  }
  
  // Filter by min amount
  if (categoryFilters.value.minAmount !== null && categoryFilters.value.minAmount !== '') {
    filtered = filtered.filter(item => 
      Math.abs(item.total_signed_amount || 0) >= categoryFilters.value.minAmount
    );
  }
  
  // Filter by max amount
  if (categoryFilters.value.maxAmount !== null && categoryFilters.value.maxAmount !== '') {
    filtered = filtered.filter(item => 
      Math.abs(item.total_signed_amount || 0) <= categoryFilters.value.maxAmount
    );
  }
  
  // Apply sorting
  if (sortColumn.value) {
    filtered.sort((a, b) => {
      let aVal = a[sortColumn.value];
      let bVal = b[sortColumn.value];
      
      // Handle null/undefined values
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';
      
      // Handle numeric values
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Handle string values
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (aStr < bStr) {
        return sortDirection.value === 'asc' ? -1 : 1;
      }
      if (aStr > bStr) {
        return sortDirection.value === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }
  
  return filtered;
});

// Computed: Calculate filtered totals
const filteredCategoryTotals = computed(() => {
  if (!filteredCategoryData.value || filteredCategoryData.value.length === 0) {
    return {
      total_signed_amount: 0,
      total_income: 0,
      total_expense: 0,
      transaction_count: 0
    };
  }
  
  return filteredCategoryData.value.reduce((acc, item) => {
    acc.total_signed_amount += item.total_signed_amount || 0;
    acc.total_income += item.income || 0;
    acc.total_expense += item.expense || 0;
    acc.transaction_count += item.transaction_count || 0;
    return acc;
  }, {
    total_signed_amount: 0,
    total_income: 0,
    total_expense: 0,
    transaction_count: 0
  });
});

const clearCategoryFilters = () => {
  categoryFilters.value = {
    categoryName: '',
    month: '',
    minAmount: null,
    maxAmount: null
  };
};

const sortBy = (column) => {
  if (sortColumn.value === column) {
    // Toggle direction if clicking the same column
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    // Set new column and default to ascending
    sortColumn.value = column;
    sortDirection.value = 'asc';
  }
};

const fetchFiles = async () => {
  try {
    loading.value = true;
    error.value = null;

    const response = await axios.get('/audit/category-verification-files');
    
    if (response.data && response.data.files) {
      files.value = response.data.files;
    }
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Failed to fetch verification files';
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
};

const viewFile = async (file) => {
  selectedFile.value = file;
  showModal.value = true;
  loadingFile.value = true;
  fileError.value = null;
  fileContent.value = null;

  try {
    const response = await axios.get(`/audit/category-verification-files/${encodeURIComponent(file.filename)}`);
    fileContent.value = response.data;
  } catch (err) {
    fileError.value = err.response?.data?.error || err.message || 'Failed to load file content';
    toast.error(fileError.value);
  } finally {
    loadingFile.value = false;
  }
};

const closeModal = () => {
  showModal.value = false;
  selectedFile.value = null;
  fileContent.value = null;
  fileError.value = null;
  closeCategoryModal();
};

const showCategoryDetails = (categoryType) => {
  selectedCategory.value = categoryType;
  
  if (!fileContent.value) return;
  
  let data = null;
  let totals = null;
  
  if (categoryType === 'income' && fileContent.value.income) {
    data = fileContent.value.income.data || [];
    totals = fileContent.value.income.totals || {};
  } else if (categoryType === 'expense' && fileContent.value.expense) {
    data = fileContent.value.expense.data || [];
    totals = fileContent.value.expense.totals || {};
  } else if (categoryType === 'transfers' && fileContent.value.transfers) {
    data = fileContent.value.transfers.data || [];
    totals = fileContent.value.transfers.totals || {};
  }
  
  categoryData.value = data;
  categoryTotals.value = totals;
  showCategoryModal.value = true;
};

const closeCategoryModal = () => {
  showCategoryModal.value = false;
  selectedCategory.value = null;
  categoryData.value = null;
  categoryTotals.value = null;
  clearCategoryFilters();
  sortColumn.value = null;
  sortDirection.value = 'asc';
};

const generateNewFile = async () => {
  try {
    generating.value = true;
    error.value = null;
    
    const response = await axios.post('/audit/category-verification-files/generate', {
      // Optional: can add user_id, start_date, end_date here if needed
    });
    
    toast.success('Category verification file generated successfully');
    
    // Refresh the files list
    await fetchFiles();
    
    // Optionally open the newly generated file
    if (response.data.filename) {
      const newFile = files.value.find(f => f.filename === response.data.filename);
      if (newFile) {
        await viewFile(newFile);
      }
    }
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message || 'Failed to generate verification file';
    error.value = errorMsg;
    toast.error(errorMsg);
  } finally {
    generating.value = false;
  }
};

onMounted(() => {
  fetchFiles();
});
</script>

