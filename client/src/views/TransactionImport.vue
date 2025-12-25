<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Import Transactions</h1>
      
      <!-- Error Alert -->
      <div v-if="error" class="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
        {{ error }}
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400">Processing your request...</p>
      </div>

      <!-- Progress Steps -->
      <div v-if="!loading" class="mb-8">
        <div class="flex items-center justify-between">
          <div 
            v-for="(step, index) in steps" 
            :key="index"
            class="flex flex-col items-center"
          >
            <div 
              class="w-10 h-10 rounded-full flex items-center justify-center mb-2"
              :class="[
                currentStep > index ? 'bg-blue-500 text-white' : 
                currentStep === index ? 'bg-blue-100 text-blue-500 border-2 border-blue-500' : 
                'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              ]"
            >
              {{ index + 1 }}
            </div>
            <span 
              class="text-sm font-medium"
              :class="[
                currentStep > index ? 'text-blue-500' : 
                currentStep === index ? 'text-blue-500' : 
                'text-gray-500 dark:text-gray-400'
              ]"
            >
              {{ step }}
            </span>
          </div>
          <div 
            v-for="(step, index) in steps.slice(0, -1)" 
            :key="`line-${index}`"
            class="flex-1 h-1 mx-4"
            :class="[
              currentStep > index ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
            ]"
          ></div>
        </div>
      </div>

      <!-- Step 1: Select Account -->
      <div v-if="currentStep === 0" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Select Account</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Select the account that all transactions in this import should be associated with.
        </p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            v-for="account in accountStore.accounts" 
            :key="account.account_id"
            class="p-4 border rounded-lg cursor-pointer transition-all duration-200"
            :class="[
              selectedAccountId === account.account_id 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900' 
                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
            ]"
            @click="selectAccount(account)"
          >
            <h3 class="font-medium text-gray-900 dark:text-white">{{ account.account_name }}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ account.account_type }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {{ account.positive_is_credit ? 'Positive amounts are credits' : 'Positive amounts are debits' }}
            </p>
          </div>
        </div>
        
        <div v-if="selectedAccountId" class="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-md">
          <p class="text-yellow-800 dark:text-yellow-200">
            <span class="inline-block mr-2">⚠️</span>
            Amounts will be interpreted as {{ selectedAccount?.positive_is_credit ? 'credits (money coming in)' : 'debits (money going out)' }} when positive.
          </p>
        </div>
        
        <p v-if="showAccountError" class="text-red-500 text-sm mt-2">Please select an account</p>
        
        <div class="mt-6 flex justify-end">
          <button
            @click="nextStep"
            :disabled="!selectedAccountId"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next: Upload File
          </button>
        </div>
      </div>

      <!-- Step 2: Upload File -->
      <div v-if="currentStep === 1" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Upload Transaction File</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Upload a CSV or OFX file containing your transactions. CSV files should include columns for date, description, amount, and transaction type. OFX files are automatically parsed.
        </p>
        
        <div class="flex items-center justify-center w-full">
          <label
            class="flex flex-col w-full h-40 border-4 border-dashed hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg cursor-pointer"
          >
            <div class="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                class="w-12 h-12 mb-3 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
                <span class="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">CSV or OFX files</p>
            </div>
            <input
              type="file"
              class="hidden"
              accept=".csv,.ofx"
              @change="handleFileSelect"
            />
          </label>
        </div>
        
        <div v-if="selectedFile" class="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <div class="flex items-center">
            <svg class="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="text-gray-700 dark:text-gray-300">{{ selectedFile.name }}</span>
          </div>
        </div>
        
        <div class="mt-6 flex justify-between">
          <button
            @click="prevStep"
            class="px-4 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Back
          </button>
          <button
            @click="nextStep"
            :disabled="!selectedFile"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next: Map Fields
          </button>
        </div>
      </div>

      <!-- Step 3: Map Fields -->
      <div v-if="currentStep === 2" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Map CSV Fields</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">
          Map the columns in your CSV file to the required transaction fields. Fields marked with an asterisk (*) are required.
        </p>
        
        <!-- Show message if mappings are already loaded -->
        <div v-if="Object.keys(fieldMappings).length > 0 && Object.values(fieldMappings).some(v => v && (Array.isArray(v) ? v.length > 0 : v))" class="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 p-4 rounded-md mb-4">
          <p class="text-blue-800 dark:text-blue-200">
            <span class="inline-block mr-2">ℹ️</span>
            Field mappings have been loaded from your previous imports. You can proceed to the next step or adjust the mappings if needed.
          </p>
        </div>
        
        <!-- Show date parsing errors if any -->
        <div v-if="transactionStore.dateParseErrors.length > 0" class="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 p-4 rounded-md mb-4">
          <p class="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
            <span class="inline-block mr-2">⚠️</span>
            Found {{ transactionStore.dateParseErrors.length }} date parsing errors
          </p>
          <div class="max-h-40 overflow-y-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="text-left">
                  <th class="py-1 px-2">Line</th>
                  <th class="py-1 px-2">Date</th>
                  <th class="py-1 px-2">Error</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="error in transactionStore.dateParseErrors" :key="error.line" class="border-t border-yellow-200 dark:border-yellow-700">
                  <td class="py-1 px-2">{{ error.line }}</td>
                  <td class="py-1 px-2">{{ error.originalDate }}</td>
                  <td class="py-1 px-2">{{ error.error }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="space-y-6">
          <div v-for="field in transactionStore.requiredFields" :key="field.id" class="border-b border-gray-200 dark:border-gray-700 pb-4">
            <div class="flex flex-col md:flex-row md:items-center">
              <label class="w-full md:w-1/3 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 md:mb-0">
                {{ field.label }}
                <span v-if="!field.allowMultiple" class="text-red-500">*</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 block">{{ field.description }}</span>
              </label>
              
              <div class="w-full md:w-2/3">
                <template v-if="field.allowMultiple">
                  <div class="space-y-2">
                    <div v-for="(mapping, index) in fieldMappings[field.id]" :key="index" class="flex gap-2">
                      <select
                        v-model="fieldMappings[field.id][index]"
                        class="flex-1 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="">Select a field</option>
                        <option
                          v-for="header in transactionStore.csvHeaders"
                          :key="header"
                          :value="header"
                        >
                          {{ header }}
                        </option>
                      </select>
                      <button
                        type="button"
                        @click="removeMapping(field.id, index)"
                        class="px-2 py-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                    <button
                      type="button"
                      @click="addMapping(field.id)"
                      class="text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      + Add another field
                    </button>
                  </div>
                </template>
                <template v-else>
                  <select
                    v-model="fieldMappings[field.id]"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    :disabled="field.id === 'account_id' || field.id === 'category_id'"
                  >
                    <option value="">Select a field</option>
                    <option
                      v-for="header in transactionStore.csvHeaders"
                      :key="header"
                      :value="header"
                    >
                      {{ header }}
                    </option>
                  </select>
                </template>
              </div>
            </div>
          </div>
        </div>
        
        <div class="mt-6 flex justify-between">
          <button
            @click="prevStep"
            class="px-4 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Back
          </button>
          <button
            @click="nextStep"
            :disabled="!canProceedToNextStep"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next: Select Account & Categories
          </button>
        </div>
      </div>

      <!-- Step 4: Select Account & Categories -->
      <div v-if="currentStep === 3" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Select Account & Categories</h2>
        
        <!-- Account Selection -->
        <div class="mb-8">
          <h3 class="text-lg font-medium mb-3 text-gray-900 dark:text-white">Account for All Transactions</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            Select the account that all transactions in this import should be associated with.
          </p>
          
          <select
            v-model="selectedAccountId"
            class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            :class="{ 'border-red-500': showAccountError }"
          >
            <option value="">Select an account</option>
            <option
              v-for="account in accountStore.accounts"
              :key="account.account_id"
              :value="account.account_id"
            >
              {{ account.account_name }} ({{ account.account_type }})
            </option>
          </select>
          <p v-if="showAccountError" class="text-red-500 text-sm mt-1">Please select an account</p>
        </div>
        
        <!-- Category Assignment -->
        <div>
          <h3 class="text-lg font-medium mb-3 text-gray-900 dark:text-white">Assign Categories</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            Assign a category to each transaction. You can use the search to filter categories.
          </p>
          
          <div class="mb-4 flex items-center gap-3">
            <input
              type="text"
              v-model="categorySearch"
              placeholder="Search categories..."
              class="flex-1 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
            <button
              type="button"
              @click="openAddCategoryModal()"
              class="px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              + Add Category
            </button>
          </div>
          
          <div class="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 p-4 rounded-md mb-4">
            <p class="text-yellow-800 dark:text-yellow-200 font-medium">
              <span class="inline-block mr-2">⚠️</span>
              Important: You must select a category for each transaction before importing.
            </p>
          </div>
          
          <p class="text-sm text-red-500 mb-2" v-if="showCategoryError">
            Please select a category for each transaction before importing.
          </p>
          
          <!-- Duplicate Transactions Warning -->
          <div v-if="transactionStore.duplicateCount > 0" class="bg-yellow-50 border border-yellow-300 text-yellow-900 px-4 py-3 rounded relative mb-4" role="alert">
            <div class="flex items-start justify-between">
              <div>
                <p class="font-semibold">Possible duplicates found</p>
                <p class="text-sm mt-1">We found {{ transactionStore.duplicateCount }} transaction(s) that already exist. Leave them unchecked to skip, or tick the ones you want to import anyway.</p>
              </div>
              <button 
                @click="showDuplicates = !showDuplicates"
                class="text-yellow-900 underline hover:text-yellow-800 text-sm"
              >
                {{ showDuplicates ? 'Hide' : 'Show' }}
              </button>
            </div>
            
            <!-- Duplicate Transactions List (choose which to import anyway) -->
            <div v-if="showDuplicates" class="mt-2">
              <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="py-2 px-4 border-b"></th>
                      <th class="py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Line</th>
                      <th class="py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th class="py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th class="py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th class="py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th class="py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hash</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr v-for="(dup, index) in transactionStore.duplicates" :key="index" class="hover:bg-gray-50">
                      <td class="py-2 px-4 border-b text-sm">
                        <input type="checkbox" v-model="selectedDuplicateLines" :value="dup.line" class="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                      </td>
                      <td class="py-2 px-4 border-b text-sm">{{ dup.line }}</td>
                      <td class="py-2 px-4 border-b text-sm">{{ formatDate(dup.record.transaction_date) }}</td>
                      <td class="py-2 px-4 border-b text-sm">{{ dup.record.description }}</td>
                      <td class="py-2 px-4 border-b text-sm" :class="getAmountClass(dup.record.amount)">
                        {{ formatAmount(dup.record.amount) }}
                      </td>
                      <td class="py-2 px-4 border-b text-sm">{{ dup.record.transaction_type }}</td>
                      <td class="py-2 px-4 border-b text-sm font-mono text-xs">{{ dup.hash }}</td>
                    </tr>
                  </tbody>
                </table>
                <div class="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  Selected to import anyway: {{ selectedDuplicateLines.length }} of {{ transactionStore.duplicates.length }}
                </div>
              </div>
            </div>
          </div>
          
          <!-- Transaction Preview Table -->
          <div class="overflow-x-auto">
            <div class="flex justify-between items-center mb-4">
              <div class="text-sm text-gray-500 dark:text-gray-400">
                Showing {{ transactions.length }} of {{ transactionStore.totalRecords }} transactions
              </div>
            </div>

            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700" :style="tableStyles">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th
                    v-for="field in transactionStore.requiredFields"
                    :key="field.id"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative cursor-pointer select-none"
                    :style="{ width: (columnWidths[field.id] || 180) + 'px' }"
                    @click="togglePreviewSort(field.id)"
                  >
                    <div class="flex items-center">
                      <span class="truncate">{{ field.label }}</span>
                      <span v-if="previewSortBy === field.id" class="ml-1">{{ previewSortDir === 'asc' ? '↑' : '↓' }}</span>
                      <div
                        class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                        @mousedown="startResize(field.id, $event)"
                      ></div>
                    </div>
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative cursor-pointer select-none" @click="togglePreviewSort('category')">
                    <div class="flex items-center">
                      <span class="truncate">Category</span>
                      <span v-if="previewSortBy === 'category'" class="ml-1">{{ previewSortDir === 'asc' ? '↑' : '↓' }}</span>
                      <div
                        class="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-500"
                        @mousedown="startResize('category', $event)"
                      ></div>
                    </div>
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Copy Split
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="(rowIndex, displayIdx) in sortedPreviewIndices" :key="rowIndex">
                  <td
                    v-for="field in transactionStore.requiredFields"
                    :key="field.id"
                    class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200"
                    :style="{ width: (columnWidths[field.id] || 180) + 'px' }"
                  >
                    <div class="truncate">
                      <template v-if="field.id === 'transaction_date'">
                        {{ formatDate(getMappedValue(transactions[rowIndex], field.id)) }}
                      </template>
                      <template v-else-if="field.id === 'amount'">
                        <span :class="getAmountClass(getMappedValue(transactions[rowIndex], field.id))">
                          {{ formatAmount(getMappedValue(transactions[rowIndex], field.id)) }}
                        </span>
                      </template>
                      <template v-else>
                        {{ getMappedValue(transactions[rowIndex], field.id) }}
                      </template>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    <div class="relative">
                      <select
                        v-model="categoryAssignments[rowIndex]"
                        class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        :class="{ 
                          'border-red-500': showCategoryError && !categoryAssignments[rowIndex],
                          'border-green-500': transactions[rowIndex].suggestedCategory && categoryAssignments[rowIndex] === transactions[rowIndex].suggestedCategory.category_id,
                          'border-blue-500': transactionSplits[rowIndex] && transactionSplits[rowIndex].categories.length > 0
                        }"
                        @change="handleCategorySelectChange(rowIndex, categoryAssignments[rowIndex])"
                      >
                        <option value="">Select a category</option>
                        <option value="__add__">+ Add new category…</option>
                        <option
                          v-if="transactions[rowIndex].suggestedCategory"
                          :value="transactions[rowIndex].suggestedCategory.category_id"
                          class="font-semibold"
                        >
                          {{ transactions[rowIndex].suggestedCategory.category_name }} (Suggested)
                        </option>
                        <option
                          v-for="category in filteredCategories"
                          :key="category.category_id"
                          :value="category.category_id"
                          :disabled="transactions[rowIndex].suggestedCategory && category.category_id === transactions[rowIndex].suggestedCategory.category_id"
                        >
                          {{ category.category_name }}
                        </option>
                      </select>
                      <div v-if="transactions[rowIndex].suggestedCategory" class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                        <span class="inline-block mr-1">💡</span>
                        Suggested: {{ transactions[rowIndex].suggestedCategory.category_name }} ({{ Math.round((transactions[rowIndex].suggestedCategory.confidence || 0) * 100) }}%)
                      </div>
                      <div v-if="transactionSplits[rowIndex] && transactionSplits[rowIndex].categories.length > 0" class="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center">
                        <span class="inline-block mr-1">✂️</span>
                        Split into {{ transactionSplits[rowIndex].categories.length }} categories
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      @click="openSplitModal(rowIndex)"
                      class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Split
                    </button>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <label class="flex items-center cursor-pointer" :class="{ 'opacity-50': displayIdx === 0 }">
                      <input
                        type="checkbox"
                        :checked="copySplitDown[rowIndex] || false"
                        :disabled="displayIdx === 0"
                        @change="handleCopySplitDownChange(rowIndex, displayIdx, $event)"
                        class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span class="ml-2 text-xs text-gray-600 dark:text-gray-400">Copy split down</span>
                    </label>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div class="mt-6 flex justify-between">
          <button
            @click="prevStep"
            class="px-4 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Back
          </button>
          <button
            @click="nextStep"
            :disabled="!canProceedToNextStep"
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next: Review & Import
          </button>
        </div>
      </div>

      <!-- Step 4: Review & Import -->
      <div v-if="currentStep === 4" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Review & Import</h2>
        
        <div class="mb-6">
          <h3 class="text-lg font-medium mb-3 text-gray-900 dark:text-white">Import Summary</h3>
          
          <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-md mb-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400">File</p>
                <p class="font-medium text-gray-900 dark:text-white">{{ selectedFile.name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400">Account</p>
                <p class="font-medium text-gray-900 dark:text-white">
                  {{ getAccountName(selectedAccountId) }}
                </p>
              </div>
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
                <p class="font-medium text-gray-900 dark:text-white">{{ transactionStore.csvPreview.length }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500 dark:text-gray-400">Field Mappings</p>
                <div class="space-y-1">
                  <p v-for="field in transactionStore.requiredFields" :key="field.id" class="text-sm">
                    <span class="font-medium">{{ field.label }}:</span> 
                    <span v-if="field.allowMultiple">
                      {{ Array.isArray(fieldMappings[field.id]) ? fieldMappings[field.id].join(', ') : fieldMappings[field.id] || 'Not mapped' }}
                    </span>
                    <span v-else>
                      {{ fieldMappings[field.id] || 'Not mapped' }}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 p-4 rounded-md mb-4">
            <p class="text-yellow-800 dark:text-yellow-200 font-medium">
              <span class="inline-block mr-2">⚠️</span>
              Please review your selections before importing. This action cannot be undone.
            </p>
          </div>
        </div>
        
        <div class="mt-6 flex justify-between">
          <button
            @click="prevStep"
            class="px-4 py-2 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Back
          </button>
          <div class="flex items-center gap-3 mr-auto ml-4">
            <input id="skipDupes" type="checkbox" v-model="skipDuplicatesByHash" class="h-4 w-4 text-blue-600 border-gray-300 rounded" />
            <label for="skipDupes" class="text-sm text-gray-700 dark:text-gray-300">Skip duplicates by dedupe hash on import</label>
          </div>
          <button
            @click="handleImport"
            :disabled="!canImport"
            class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import Transactions
          </button>
        </div>
      </div>

      <!-- Upload Progress -->
      <div v-if="transactionStore.uploadProgress > 0" class="mt-4">
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div
            class="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            :style="{ width: `${transactionStore.uploadProgress}%` }"
          ></div>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Uploading: {{ transactionStore.uploadProgress }}%</p>
      </div>
    
      <!-- Add/Edit Category Modal -->
      <div v-if="showCategoryModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">{{ categoryEditId ? 'Edit Category' : 'Add Category' }}</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
              <input v-model="categoryForm.category_name" type="text" class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 dark:text-white" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Parent</label>
              <select v-model="categoryForm.parent_category_id" class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 dark:text-white">
                <option value="">None</option>
                <option v-for="cat in sortedCategories" :key="cat.category_id" :value="cat.category_id">{{ cat.category_name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Budgeted Amount</label>
              <input v-model.number="categoryForm.budgeted_amount" type="number" step="0.01" class="mt-1 w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm dark:bg-gray-700 dark:text-white" />
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-2">
            <button @click="closeCategoryModal" class="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">Cancel</button>
            <button @click="saveCategory" class="px-3 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">Save</button>
          </div>
        </div>
      </div>

      <!-- Split Transaction Modal -->
      <div v-if="showSplitModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="closeSplitModal">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Split Transaction</h3>
          
          <!-- Transaction Info -->
          <div class="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              <span class="font-medium">Amount:</span> 
              <span :class="getAmountClass(getMappedValue(transactions[splitTransactionIndex], 'amount'))">
                {{ formatAmount(getMappedValue(transactions[splitTransactionIndex], 'amount')) }}
              </span>
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              <span class="font-medium">Description:</span> {{ getMappedValue(transactions[splitTransactionIndex], 'description') }}
            </p>
          </div>

          <!-- Split Categories -->
          <div class="space-y-3 mb-4">
            <div v-for="(split, index) in splitCategories" :key="index" class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-md">
              <div class="flex-1">
                <select
                  v-model="split.category_id"
                  class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select category</option>
                  <option
                    v-for="category in filteredCategories"
                    :key="category.category_id"
                    :value="category.category_id"
                  >
                    {{ category.category_name }}
                  </option>
                </select>
              </div>
              <div class="w-32">
                <input
                  v-model.number="split.percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="%"
                  class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  @input="updateSplitPercentages"
                />
              </div>
              <div class="w-32 text-sm text-gray-600 dark:text-gray-400">
                {{ formatAmount(calculateSplitAmount(splitTransactionIndex, split.percentage)) }}
              </div>
              <button
                @click="removeSplitCategory(index)"
                class="px-2 py-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                :disabled="splitCategories.length <= 1"
              >
                Remove
              </button>
            </div>
          </div>

          <!-- Add Category Button -->
          <button
            @click="addSplitCategory"
            class="mb-4 px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            + Add Category
          </button>

          <!-- Total Percentage Warning -->
          <div v-if="totalPercentage !== 100" class="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-md">
            <p class="text-sm text-yellow-800 dark:text-yellow-200">
              Total percentage: {{ totalPercentage.toFixed(2) }}%. Must equal 100%.
            </p>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-2">
            <button @click="closeSplitModal" class="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">Cancel</button>
            <button
              @click="saveSplit"
              :disabled="totalPercentage !== 100 || splitCategories.length === 0 || splitCategories.some(s => !s.category_id)"
              class="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Split
            </button>
          </div>
        </div>
      </div>

      <!-- Split Confirmation Dialog -->
      <div v-if="showEvenSplitDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @keydown.enter="confirmEvenSplit" @keydown.esc="cancelEvenSplit">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {{ splitTransactionIndex !== null && copySplitDown[splitTransactionIndex] ? 'Confirm Copied Split' : 'Confirm Even Split' }}
          </h3>
          <p class="text-gray-600 dark:text-gray-400 mb-4">
            <span v-if="splitTransactionIndex !== null && copySplitDown[splitTransactionIndex]">
              Apply the same split from the previous line to this transaction?
            </span>
            <span v-else>
              Split this transaction evenly across {{ splitCategories.length }} categories?
            </span>
          </p>
          <div class="space-y-2 mb-4">
            <div v-for="(split, index) in splitCategories" :key="index" class="text-sm text-gray-600 dark:text-gray-400">
              {{ getCategoryName(split.category_id) }}: {{ formatAmount(calculateSplitAmount(splitTransactionIndex, split.percentage)) }} ({{ split.percentage.toFixed(2) }}%)
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button @click="cancelEvenSplit" class="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">Cancel</button>
            <button @click="confirmEvenSplit" class="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">Confirm (Enter)</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- View Info -->
    <ViewInfo 
      view-name="Transaction Import" 
      :components="[]"
      :script-blocks="[
        { name: 'useTransactionStore', type: 'store', functions: ['uploadTransactions', 'saveFieldMappings'] },
        { name: 'useAccountStore', type: 'store', functions: ['fetchAccounts'] },
        { name: 'useCategoryStore', type: 'store', functions: ['fetchCategories', 'createCategory', 'updateCategory'] },
        { name: 'useTransactionImport', type: 'composable', functions: ['validateCategoryAssignments', 'nextStep', 'prevStep', 'selectAccount', 'resetState'] },
        { name: 'useCSVPreview', type: 'composable', functions: ['showDuplicates', 'formatDate', 'formatAmount', 'getAmountClass', 'getMappedValue'] },
        { name: 'useFieldMapping', type: 'composable', functions: ['addMapping', 'removeMapping', 'updateFieldMapping', 'validateMappings', 'resetMappings', 'loadSavedMappings'] },
        { name: 'useResizableTable', type: 'composable', functions: ['startResize'] }
      ]"
    />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { onMounted, computed, ref, onUnmounted, watch } from 'vue';
import { useTransactionStore } from '../stores/transaction';
import { useAccountStore } from '../stores/account';
import { useCategoryStore } from '../stores/category';
import ViewInfo from '../components/ViewInfo.vue';
import { useToast } from 'vue-toastification';
import { useTransactionImport } from '../composables/useTransactionImport';
import { useCSVPreview } from '../composables/useCSVPreview';
import { useFieldMapping } from '../composables/useFieldMapping';
import { useResizableTable } from '../composables/useResizableTable';
import { useCategoryAssignment } from '../composables/useCategoryAssignment';
import { useCategorySuggestions } from '../composables/useCategorySuggestions';
import axios from 'axios';
import { normalizeAppDateClient, compareDates } from '../utils/dateUtils';

// Prefer VITE_API_BASE_URL (new standard), fall back to VITE_API_URL (backward compatibility)
const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3004/api';

// Initialize stores
const transactionStore = useTransactionStore();
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const toast = useToast();
const router = useRouter();

// Initialize composables
const {
  currentStep,
  selectedFile,
  selectedAccountId,
  showAccountError,
  showCategoryError,
  categoryAssignments,
    skipDuplicatesByHash,
  error,
  loading,
  steps,
  canProceedToNextStep,
  handleFileSelect,
  validateMappings,
  validateCategoryAssignments,
  nextStep,
  prevStep,
  selectAccount: baseSelectAccount,
  resetState
} = useTransactionImport();
const selectedDuplicateLines = ref([]);

const {
  showDuplicates,
  transactions,
  formatDate,
  formatAmount,
  getAmountClass,
  getMappedValue
} = useCSVPreview();

const {
  fieldMappings,
  addMapping,
  removeMapping,
  updateFieldMapping,
  validateMappings: validateFieldMappings,
  resetMappings,
  loadSavedMappings
} = useFieldMapping();

const {
  filteredCategories,
  assignCategory,
  validateCategoryAssignments: validateCategoryAssignmentsState,
  resetCategoryAssignments,
  getCategoryName,
  categorySearch
} = useCategoryAssignment();

const { columnWidths, startResize, tableStyles } = useResizableTable(
  transactionStore.requiredFields.map(f => f.id).concat(['category'])
);

const { suggestedCategories, autoAssignCategories, confidenceThreshold } = useCategorySuggestions();
// Sorting state for preview table
const previewSortBy = ref(null); // one of field ids or 'category'
const previewSortDir = ref('asc');

// Watch transactions to auto-assign categories with high confidence
watch(
  () => transactions.value,
  (newTransactions) => {
    if (!newTransactions || newTransactions.length === 0) return;
    
    newTransactions.forEach((transaction, index) => {
      if (transaction.suggestedCategory && 
          transaction.suggestedCategory.confidence >= confidenceThreshold.value &&
          transaction.suggestedCategory.category_id &&
          !categoryAssignments.value[index]) {
        // Auto-assign high-confidence suggestions
        categoryAssignments.value[index] = transaction.suggestedCategory.category_id;
      }
    });
  },
  { deep: true, immediate: true }
);

const togglePreviewSort = (key) => {
  if (previewSortBy.value === key) {
    previewSortDir.value = previewSortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    previewSortBy.value = key;
    previewSortDir.value = 'asc';
  }
};

const sortedPreviewIndices = computed(() => {
  const total = transactions.value.length;
  const indices = Array.from({ length: total }, (_, i) => i);
  const key = previewSortBy.value;
  if (!key) return indices;
  const dir = previewSortDir.value === 'asc' ? 1 : -1;
  const getVal = (idx) => {
    if (key === 'category') return categoryAssignments.value[idx] || '';
    return getMappedValue(transactions.value[idx], key) || '';
  };
  indices.sort((a, b) => {
    const av = getVal(a);
    const bv = getVal(b);
    if (key === 'amount') {
      const an = parseFloat(av) || 0;
      const bn = parseFloat(bv) || 0;
      return (an - bn) * dir;
    }
    if (key === 'transaction_date') {
      // Use date utils for comparison
      const dateA = normalizeAppDateClient(av, 'api-to-domain') || '0000-00-00';
      const dateB = normalizeAppDateClient(bv, 'api-to-domain') || '0000-00-00';
      const comparison = compareDates(dateA, dateB);
      return comparison * dir;
      return (an - bn) * dir;
    }
    const as = String(av).toLowerCase();
    const bs = String(bv).toLowerCase();
    if (as < bs) return -1 * dir;
    if (as > bs) return 1 * dir;
    return 0;
  });
  return indices;
});

// Computed
const getAccountName = (accountId) => {
  if (!accountId) return 'Not selected';
  const account = accountStore.accounts.find(a => a.account_id === accountId);
  return account ? account.account_name : 'Unknown account';
};

const canImport = computed(() => {
  if (!validateFieldMappings()) return false;
  
  // Check that all transactions have either a category assignment or a valid split
  const totalTransactions = transactions.value.length;
  for (let i = 0; i < totalTransactions; i++) {
    // If transaction has a split with categories, check that all categories are assigned
    if (transactionSplits.value[i] && transactionSplits.value[i].categories && transactionSplits.value[i].categories.length > 0) {
      const allCategoriesAssigned = transactionSplits.value[i].categories.every(cat => cat.category_id);
      if (!allCategoriesAssigned) return false;
    } else {
      // Otherwise, require a category assignment
      if (!categoryAssignments.value[i]) return false;
    }
  }
  
  return true;
});

const selectedAccount = computed(() => {
  return accountStore.accounts.find(a => a.account_id === selectedAccountId);
});

// Sorted categories for dropdowns (alphabetical)
const sortedCategories = computed(() => {
  return [...categoryStore.categories].sort((a, b) => {
    const nameA = (a.category_name || '').toLowerCase();
    const nameB = (b.category_name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
});

// Methods
const selectAccount = async (account) => {
  baseSelectAccount(account);
  // Load saved mappings when an account is selected
  if (account && account.account_id) {
    try {
      await loadSavedMappings(account.account_id);
    } catch (error) {
      toast.error('Failed to load saved field mappings');
    }
  }
};

  const handleImport = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    // Validate mappings and category assignments
    if (!validateFieldMappings()) {
      error.value = 'Please complete all required field mappings';
      return;
    }
    
    // Validate categories - check splits too
    const totalTransactions = transactions.value.length;
    for (let i = 0; i < totalTransactions; i++) {
      if (transactionSplits.value[i] && transactionSplits.value[i].categories && transactionSplits.value[i].categories.length > 0) {
        const allCategoriesAssigned = transactionSplits.value[i].categories.every(cat => cat.category_id);
        if (!allCategoriesAssigned) {
          error.value = 'Please assign categories to all split transactions';
          return;
        }
      } else if (!categoryAssignments.value[i]) {
        error.value = 'Please assign categories to all transactions';
        return;
      }
    }
    
    // Upload transactions with split information
    const result = await transactionStore.uploadTransactions(
      selectedFile.value,
      fieldMappings.value,
      selectedAccountId.value,
      categoryAssignments.value,
      selectedDuplicateLines.value,
      transactionSplits.value
    );
    
    // Save field mappings for future use
    await transactionStore.saveFieldMappings(selectedAccountId.value, fieldMappings.value);
    
    // Save feedback for learning (in background)
    saveImportFeedback();
    
    // Show success message
    toast.success(`Successfully imported ${result.importedCount} transactions`);
    
    if (result.duplicateCount > 0) {
      toast.info(`Skipped ${result.duplicateCount} duplicate transactions`);
    }
    
    // Reset state and redirect
    resetState();
    transactionSplits.value = {};
    copySplitDown.value = {};
    router.push('/');
  } catch (importError) {
    const errorMessage = importError.response?.data?.error || importError.message || 'Failed to import transactions';
    error.value = errorMessage;
    toast.error(errorMessage);
  } finally {
    loading.value = false;
  }
};

// Inline Category CRUD (MVP: create + simple edit support)
const showCategoryModal = ref(false);
const categoryEditId = ref(null);
const categoryForm = ref({ category_name: '', parent_category_id: '', budgeted_amount: 0, user_id: 'default-user' });
let pendingAssignIndex = null;

// Split Transaction State
const showSplitModal = ref(false);
const splitTransactionIndex = ref(null);
const splitCategories = ref([]);
const transactionSplits = ref({});
const showEvenSplitDialog = ref(false);
const copySplitDown = ref({});

const openAddCategoryModal = () => {
  categoryEditId.value = null;
  categoryForm.value = { category_name: '', parent_category_id: '', budgeted_amount: 0, user_id: 'default-user' };
  showCategoryModal.value = true;
};

const handleCategorySelectChange = (rowIndex, value) => {
  if (value === '__add__') {
    pendingAssignIndex = rowIndex;
    openAddCategoryModal();
    // Reset selection until saved
    categoryAssignments.value[rowIndex] = '';
  } else if (value && transactions.value[rowIndex]) {
    // Track feedback when user changes category from suggestion
    const transaction = transactions.value[rowIndex];
    if (transaction.suggestedCategory && transaction.suggestedCategory.category_id !== value) {
      // User changed from suggested category - save feedback
      saveCategoryFeedback(transaction, transaction.suggestedCategory.category_id, value);
    } else if (transaction.suggestedCategory && transaction.suggestedCategory.category_id === value) {
      // User accepted suggestion - save positive feedback
      saveCategoryFeedback(transaction, transaction.suggestedCategory.category_id, value);
    }
  }
};

const closeCategoryModal = () => {
  showCategoryModal.value = false;
  pendingAssignIndex = null;
};

const saveCategory = async () => {
  try {
    if (!categoryForm.value.category_name) return;
    if (categoryEditId.value) {
      await categoryStore.updateCategory(categoryEditId.value, categoryForm.value);
      // Refresh list to resort categories
      await categoryStore.fetchCategories();
    } else {
      const res = await categoryStore.createCategory(categoryForm.value);
      // Refresh list and select the new category on the pending row
      await categoryStore.fetchCategories();
      const createdId = res?.category_id;
      if (createdId && pendingAssignIndex !== null) {
        categoryAssignments.value[pendingAssignIndex] = createdId;
      }
    }
  } catch (e) {
    // toast errors are handled in store
  } finally {
    closeCategoryModal();
  }
};

// Split Transaction Methods
const openSplitModal = (rowIndex) => {
  splitTransactionIndex.value = rowIndex;
  const existingSplit = transactionSplits.value[rowIndex];
  if (existingSplit && existingSplit.categories.length > 0) {
    splitCategories.value = existingSplit.categories.map(cat => ({ ...cat }));
  } else {
    // Start with current category if assigned, or empty
    const currentCategory = categoryAssignments.value[rowIndex];
    splitCategories.value = currentCategory ? [{ category_id: currentCategory, percentage: 100 }] : [{ category_id: '', percentage: 0 }];
  }
  showSplitModal.value = true;
};

const closeSplitModal = () => {
  showSplitModal.value = false;
  splitTransactionIndex.value = null;
  splitCategories.value = [];
};

const addSplitCategory = () => {
  splitCategories.value.push({ category_id: '', percentage: 0 });
  // Redistribute evenly when adding a category
  redistributeEvenly();
};

const removeSplitCategory = (index) => {
  if (splitCategories.value.length > 1) {
    splitCategories.value.splice(index, 1);
    // Redistribute evenly when removing a category
    redistributeEvenly();
  }
};

const redistributeEvenly = () => {
  if (splitCategories.value.length > 0) {
    const evenPercent = 100 / splitCategories.value.length;
    splitCategories.value.forEach(split => {
      split.percentage = evenPercent;
    });
  }
};

const updateSplitPercentages = () => {
  // This is called on input - don't auto-redistribute, let user control percentages
  // Only validate that total doesn't exceed 100%
};

const calculateSplitAmount = (rowIndex, percentage) => {
  if (!transactions.value[rowIndex]) return 0;
  const amount = parseFloat(getMappedValue(transactions.value[rowIndex], 'amount')) || 0;
  return (amount * percentage) / 100;
};

const totalPercentage = computed(() => {
  return splitCategories.value.reduce((sum, split) => sum + (parseFloat(split.percentage) || 0), 0);
});

const saveSplit = () => {
  if (totalPercentage.value !== 100) {
    toast.error('Total percentage must equal 100%');
    return;
  }
  
  if (splitCategories.value.length === 0 || splitCategories.value.some(s => !s.category_id)) {
    toast.error('Please select categories for all splits');
    return;
  }

  // Check if it's an even split
  const evenPercent = 100 / splitCategories.value.length;
  const isEvenSplit = splitCategories.value.every(s => Math.abs((s.percentage || 0) - evenPercent) < 0.01);

  if (isEvenSplit) {
    // Show confirmation dialog for even split
    showEvenSplitDialog.value = true;
  } else {
    // Not even split, save directly
    confirmSplit();
  }
};

const confirmEvenSplit = () => {
  showEvenSplitDialog.value = false;
  confirmSplit();
  // If this was from copy split down, uncheck the checkbox
  if (splitTransactionIndex.value !== null && copySplitDown.value[splitTransactionIndex.value]) {
    copySplitDown.value[splitTransactionIndex.value] = false;
  }
};

const cancelEvenSplit = () => {
  showEvenSplitDialog.value = false;
  // If this was from copy split down, uncheck the checkbox and don't show modal
  if (splitTransactionIndex.value !== null && copySplitDown.value[splitTransactionIndex.value]) {
    copySplitDown.value[splitTransactionIndex.value] = false;
    splitTransactionIndex.value = null;
    splitCategories.value = [];
  } else {
    // Show percentage input modal for manual split
    showSplitModal.value = true;
  }
};

const confirmSplit = () => {
  const rowIndex = splitTransactionIndex.value;
  if (rowIndex === null) return;

  // Store split information
  transactionSplits.value[rowIndex] = {
    categories: splitCategories.value.map(split => ({
      category_id: split.category_id,
      percentage: parseFloat(split.percentage) || 0
    }))
  };

  // Set the first category as the primary category assignment
  if (splitCategories.value.length > 0 && splitCategories.value[0].category_id) {
    categoryAssignments.value[rowIndex] = splitCategories.value[0].category_id;
  }

  toast.success(`Transaction split into ${splitCategories.value.length} categories`);
  closeSplitModal();
};

const handleCopySplitDownChange = (rowIndex, displayIdx, event) => {
  const checked = event.target.checked;
  
  if (checked && displayIdx > 0) {
    // Find the previous row index in sorted order
    const prevDisplayIdx = displayIdx - 1;
    const prevRowIndex = sortedPreviewIndices.value[prevDisplayIdx];
    
    // Check if previous row has a split
    const prevSplit = transactionSplits.value[prevRowIndex];
    if (prevSplit && prevSplit.categories && prevSplit.categories.length > 1) {
      // Copy the split configuration
      copySplitDown.value[rowIndex] = true;
      
      // Apply the split to current row - copy categories exactly
      splitTransactionIndex.value = rowIndex;
      splitCategories.value = prevSplit.categories.map(cat => ({
        category_id: cat.category_id,
        percentage: cat.percentage
      }));
      
      // Always show confirmation dialog when copying (regardless of even/uneven)
      showEvenSplitDialog.value = true;
    } else {
      // No split to copy
      copySplitDown.value[rowIndex] = false;
      toast.warning('Previous line does not have a split to copy');
      event.target.checked = false;
    }
  } else {
    copySplitDown.value[rowIndex] = false;
  }
};

const handlePreview = async () => {
  try {
    // ... existing preview code ...
    
    // Auto-assign categories based on suggestions
    const transactionsWithSuggestions = await autoAssignCategories(previewData.value.transactions);
    
    // Update the preview data with suggestions
    previewData.value = {
      ...previewData.value,
      transactions: transactionsWithSuggestions
    };
    
    // ... rest of the preview code ...
  } catch (error) {
    // ... error handling ...
  }
};

const getCategorySuggestions = async (transaction) => {
  return await suggestedCategories(transaction);
};

// Save category matching feedback for learning
const saveCategoryFeedback = async (transaction, suggestedCategoryId, actualCategoryId) => {
  try {
    const token = localStorage.getItem('token');
    await axios.post(
      `${API_URL}/api/transactions/suggestions/feedback`,
      {
        description: transaction.description || '',
        amount: Math.abs(transaction.amount || 0),
        suggested_category_id: suggestedCategoryId,
        actual_category_id: actualCategoryId,
        confidence_score: transaction.suggestedCategory?.confidence || 0
      },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }
    );
  } catch (error) {
    // Silently fail - feedback is nice to have but shouldn't block the import
    console.error('Failed to save category feedback:', error);
  }
};

// Save feedback for all transactions after import
const saveImportFeedback = async () => {
  if (!transactions.value || transactions.value.length === 0) return;
  
  const feedbackPromises = transactions.value.map((transaction, index) => {
    const actualCategoryId = categoryAssignments.value[index];
    if (!actualCategoryId || !transaction.suggestedCategory) return null;
    
    return saveCategoryFeedback(
      transaction,
      transaction.suggestedCategory.category_id,
      actualCategoryId
    );
  }).filter(Boolean);
  
  // Save feedback in background (don't wait)
  Promise.all(feedbackPromises).catch(err => {
    console.error('Error saving import feedback:', err);
  });
};

// Lifecycle
onMounted(async () => {
  try {
    await Promise.all([
      accountStore.fetchAccounts(),
      categoryStore.fetchCategories()
    ]);
    
    // Initialize field mappings
    resetMappings();
  } catch (error) {
    toast.error('Failed to load categories or accounts');
  }
});
</script> 