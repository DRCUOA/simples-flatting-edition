<template>
  <div class="container mx-auto px-4 py-8">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Financial Helpers</h1>
      <p class="text-gray-600 dark:text-gray-400 mb-8">
        Useful calculators and tools to help you make better financial decisions day-to-day.
      </p>

      <!-- Helper Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <!-- Loan Repayment Calculator Card -->
        <div 
          @click="openHelper('loan')"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500"
        >
          <div class="flex items-center mb-3">
            <HelperIcons type="loan" primary-color="#3B82F6" class="w-10 h-10 mr-3" />
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Loan Repayment</h3>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Calculate monthly payments and total interest for loans
          </p>
        </div>

        <!-- Savings Goal Calculator Card -->
        <div 
          @click="openHelper('savings')"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500"
        >
          <div class="flex items-center mb-3">
            <HelperIcons type="savings" primary-color="#10B981" class="w-10 h-10 mr-3" />
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Savings Goal</h3>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Plan how much to save each month to reach your goal
          </p>
        </div>

        <!-- Income Tax Calculator Card -->
        <div 
          @click="openHelper('tax')"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500"
        >
          <div class="flex items-center mb-3">
            <HelperIcons type="tax" primary-color="#A855F7" class="w-10 h-10 mr-3" />
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Income Tax</h3>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Calculate your tax liability and marginal rate (NZ 2025)
          </p>
        </div>

        <!-- Buy Now Pay Later Calculator Card -->
        <div 
          @click="openHelper('bnpl')"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 hover:border-orange-500 dark:hover:border-orange-500"
        >
          <div class="flex items-center mb-3">
            <HelperIcons type="bnpl" primary-color="#F97316" class="w-10 h-10 mr-3" />
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Buy Now Pay Later</h3>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            See the true cost of BNPL schemes with fees and interest
          </p>
        </div>

        <!-- Budget Breakdown Helper Card -->
        <div 
          @click="openHelper('budget')"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500"
        >
          <div class="flex items-center mb-3">
            <HelperIcons type="budget" primary-color="#6366F1" class="w-10 h-10 mr-3" />
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Budget Breakdown</h3>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Calculate daily/weekly spending limits from your income
          </p>
        </div>

        <!-- Emergency Fund Calculator Card -->
        <div 
          @click="openHelper('emergency')"
          class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 hover:border-teal-500 dark:hover:border-teal-500"
        >
          <div class="flex items-center mb-3">
            <HelperIcons type="emergency" primary-color="#14B8A6" class="w-10 h-10 mr-3" />
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Emergency Fund</h3>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Calculate how much you need in your emergency fund
          </p>
        </div>
      </div>

      <!-- Modal Wizard for Helper -->
      <div 
        v-if="activeHelper"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="closeHelper"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <!-- Modal Header -->
          <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <div class="flex items-center">
              <HelperIcons :type="activeHelper" :primary-color="getHelperColor(activeHelper)" class="w-8 h-8 mr-3" />
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
                {{ getHelperTitle(activeHelper) }}
              </h2>
            </div>
            <button
              @click="closeHelper"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Modal Content -->
          <div class="p-6">
            <!-- Loan Repayment Wizard -->
            <div v-if="activeHelper === 'loan'" class="space-y-6">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enter your loan details to calculate monthly payments and total interest
              </p>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Loan Amount ($)
                  </label>
                  <input
                    v-model.number="loanAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                    placeholder="e.g., 20000"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Annual Interest Rate (%)
                  </label>
                  <input
                    v-model.number="loanInterestRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                    placeholder="e.g., 5.5"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Loan Term (years)
                  </label>
                  <input
                    v-model.number="loanTermYears"
                    type="number"
                    step="0.5"
                    min="0.5"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                    placeholder="e.g., 5"
                  />
                </div>
                
                <button
                  @click="calculateLoan"
                  class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Calculate
                </button>
                
                <div v-if="loanResult" class="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-md space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-700 dark:text-gray-300">Monthly Payment:</span>
                    <span class="font-semibold text-lg text-gray-900 dark:text-white">${{ formatCurrency(loanResult.monthlyPayment) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-700 dark:text-gray-300">Total Interest:</span>
                    <span class="font-semibold text-gray-900 dark:text-white">${{ formatCurrency(loanResult.totalInterest) }}</span>
                  </div>
                  <div class="flex justify-between items-center pt-3 border-t border-blue-200 dark:border-blue-700">
                    <span class="text-gray-700 dark:text-gray-300 font-medium">Total Amount:</span>
                    <span class="font-bold text-xl text-gray-900 dark:text-white">${{ formatCurrency(loanResult.totalAmount) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Savings Goal Wizard -->
            <div v-if="activeHelper === 'savings'" class="space-y-6">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Calculate how much you need to save each month to reach your goal
              </p>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Amount ($)
                  </label>
                  <input
                    v-model.number="savingsGoal"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                    placeholder="e.g., 5000"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Savings ($)
                  </label>
                  <input
                    v-model.number="currentSavings"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                    placeholder="e.g., 500"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timeframe (months)
                  </label>
                  <input
                    v-model.number="savingsMonths"
                    type="number"
                    step="1"
                    min="1"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                    placeholder="e.g., 12"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Annual Interest Rate (%)
                  </label>
                  <input
                    v-model.number="savingsInterestRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-green-500 focus:ring-green-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                    placeholder="e.g., 2.5"
                  />
                </div>
                
                <button
                  @click="calculateSavings"
                  class="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                >
                  Calculate
                </button>
                
                <div v-if="savingsResult" class="mt-6 p-4 bg-green-50 dark:bg-green-900 rounded-md space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-700 dark:text-gray-300">Monthly Savings Needed:</span>
                    <span class="font-semibold text-lg text-gray-900 dark:text-white">${{ formatCurrency(savingsResult.monthlySavings) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-700 dark:text-gray-300">Total Saved:</span>
                    <span class="font-semibold text-gray-900 dark:text-white">${{ formatCurrency(savingsResult.totalSaved) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-700 dark:text-gray-300">Interest Earned:</span>
                    <span class="font-semibold text-gray-900 dark:text-white">${{ formatCurrency(savingsResult.interestEarned) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Income Tax Wizard -->
            <div v-if="activeHelper === 'tax'" class="space-y-6">
              <!-- Progress Steps -->
              <div class="flex items-center justify-between mb-6">
                <div class="flex items-center space-x-2 flex-1">
                  <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                      :class="taxWizardStep >= 1 ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'">
                      1
                    </div>
                    <span class="ml-2 text-xs font-medium" :class="taxWizardStep >= 1 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'">Income</span>
                  </div>
                  <div class="flex-1 h-1 mx-2" :class="taxWizardStep >= 2 ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'"></div>
                  <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                      :class="taxWizardStep >= 2 ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'">
                      2
                    </div>
                    <span class="ml-2 text-xs font-medium" :class="taxWizardStep >= 2 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'">Deductions</span>
                  </div>
                  <div class="flex-1 h-1 mx-2" :class="taxWizardStep >= 3 ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'"></div>
                  <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                      :class="taxWizardStep >= 3 ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'">
                      3
                    </div>
                    <span class="ml-2 text-xs font-medium" :class="taxWizardStep >= 3 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'">Review</span>
                  </div>
                  <div class="flex-1 h-1 mx-2" :class="taxWizardStep >= 4 ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'"></div>
                  <div class="flex items-center">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                      :class="taxWizardStep >= 4 ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'">
                      4
                    </div>
                    <span class="ml-2 text-xs font-medium" :class="taxWizardStep >= 4 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'">Results</span>
                  </div>
                </div>
              </div>

              <!-- Step 1: Income -->
              <div v-if="taxWizardStep === 1" class="space-y-6">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Your Income</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Enter your income details
                  </p>
                </div>
                
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Income Amount ($)
                    </label>
                    <input
                      v-model.number="incomeAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:text-white px-4 py-3 text-lg"
                      placeholder="e.g., 75000"
                    />
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Pay Frequency
                    </label>
                    <select
                      v-model="incomeFrequency"
                      class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:text-white px-4 py-3 text-lg"
                    >
                      <option value="hour">Per Hour</option>
                      <option value="week">Per Week</option>
                      <option value="fortnight">Per Fortnight</option>
                      <option value="month">Per Month</option>
                      <option value="year">Per Year</option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Hours Worked Per Week
                    </label>
                    <input
                      v-model.number="hoursPerWeek"
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="168"
                      class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:text-white px-4 py-3 text-lg"
                      placeholder="e.g., 40"
                    />
                    <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Used to calculate annual income from hourly rate
                    </p>
                  </div>
                </div>

                <div class="flex justify-end pt-4">
                  <button
                    @click="taxWizardStep = 2"
                    :disabled="!incomeAmount || incomeAmount <= 0"
                    class="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>

              <!-- Step 2: Deductions -->
              <div v-if="taxWizardStep === 2" class="space-y-6">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Deductions</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Select any deductions that apply to you
                  </p>
                </div>
                
                <div class="space-y-4">
                  <!-- KiwiSaver -->
                  <div class="p-4 border-2 rounded-lg" :class="hasKiwiSaver ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700'">
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="kiwisaver"
                          v-model="hasKiwiSaver"
                          class="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                        />
                        <label for="kiwisaver" class="text-base font-medium text-gray-900 dark:text-white cursor-pointer">
                          KiwiSaver Contribution
                        </label>
                      </div>
                    </div>
                    <div v-if="hasKiwiSaver" class="mt-3">
                      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Contribution Rate
                      </label>
                      <select
                        v-model.number="kiwiSaverRate"
                        class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                      >
                        <option :value="3">3%</option>
                        <option :value="4">4%</option>
                        <option :value="6">6%</option>
                        <option :value="8">8%</option>
                        <option :value="10">10%</option>
                      </select>
                    </div>
                  </div>

                  <!-- Student Loan -->
                  <div class="p-4 border-2 rounded-lg" :class="hasStudentLoan ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700'">
                    <div class="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="studentloan"
                        v-model="hasStudentLoan"
                        class="h-5 w-5 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <label for="studentloan" class="text-base font-medium text-gray-900 dark:text-white cursor-pointer">
                        Student Loan Repayments
                      </label>
                    </div>
                    <p v-if="hasStudentLoan" class="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      12% of income above $22,828 per year
                    </p>
                  </div>
                </div>

                <div class="flex justify-between pt-4">
                  <button
                    @click="taxWizardStep = 1"
                    class="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors font-medium"
                  >
                    ← Previous
                  </button>
                  <button
                    @click="taxWizardStep = 3"
                    class="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors font-medium"
                  >
                    Next →
                  </button>
                </div>
              </div>

              <!-- Step 3: Summary/Review -->
              <div v-if="taxWizardStep === 3" class="space-y-6">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Review Your Details</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Please review your information before calculating
                  </p>
                </div>
                
                <div class="space-y-4">
                  <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Income</h4>
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Amount:</span>
                        <span class="font-medium text-gray-900 dark:text-white">${{ formatCurrency(incomeAmount) }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Frequency:</span>
                        <span class="font-medium text-gray-900 dark:text-white capitalize">{{ incomeFrequency }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Hours per week:</span>
                        <span class="font-medium text-gray-900 dark:text-white">{{ hoursPerWeek }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Deductions</h4>
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">KiwiSaver:</span>
                        <span class="font-medium text-gray-900 dark:text-white">
                          {{ hasKiwiSaver ? kiwiSaverRate + '%' : 'None' }}
                        </span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Student Loan:</span>
                        <span class="font-medium text-gray-900 dark:text-white">
                          {{ hasStudentLoan ? 'Yes' : 'No' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex justify-between pt-4">
                  <button
                    @click="taxWizardStep = 2"
                    class="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors font-medium"
                  >
                    ← Previous
                  </button>
                  <button
                    @click="calculateTaxAndProceed"
                    class="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors font-medium"
                  >
                    Calculate
                  </button>
                </div>
              </div>
                
              <!-- Step 4: Results -->
              <div v-if="taxWizardStep === 4 && taxResult" class="space-y-6">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Your Results</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Breakdown of your pay and deductions
                  </p>
                </div>

                <!-- Summary Cards -->
                <div class="grid grid-cols-2 gap-4 mb-6">
                  <div class="p-4 bg-purple-50 dark:bg-purple-900 rounded-md">
                    <div class="text-sm text-gray-600 dark:text-gray-400">Annual Gross Pay</div>
                    <div class="text-xl font-bold text-gray-900 dark:text-white">${{ formatCurrency(taxResult.annualGrossPay) }}</div>
                  </div>
                  <div class="p-4 bg-purple-50 dark:bg-purple-900 rounded-md">
                    <div class="text-sm text-gray-600 dark:text-gray-400">Annual Take Home Pay</div>
                    <div class="text-xl font-bold text-gray-900 dark:text-white">${{ formatCurrency(taxResult.annualTakeHomePay) }}</div>
                  </div>
                  <div class="p-4 bg-purple-50 dark:bg-purple-900 rounded-md">
                    <div class="text-sm text-gray-600 dark:text-gray-400">Effective Tax Rate</div>
                    <div class="text-xl font-bold text-gray-900 dark:text-white">{{ taxResult.effectiveRate }}%</div>
                  </div>
                  <div class="p-4 bg-purple-50 dark:bg-purple-900 rounded-md">
                    <div class="text-sm text-gray-600 dark:text-gray-400">Marginal Tax Rate</div>
                    <div class="text-xl font-bold text-gray-900 dark:text-white">{{ taxResult.marginalRate }}%</div>
                  </div>
                </div>

                <!-- Breakdown Table -->
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead class="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item</th>
                          <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hour</th>
                          <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Week</th>
                          <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fortnight</th>
                          <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</th>
                          <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Year</th>
                        </tr>
                      </thead>
                      <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        <tr>
                          <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Gross Pay</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.hour.grossPay) }}</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.week.grossPay) }}</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.fortnight.grossPay) }}</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.month.grossPay) }}</td>
                          <td class="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.year.grossPay) }}</td>
                        </tr>
                        <tr class="bg-orange-50 dark:bg-orange-900/20">
                          <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">PAYE</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.hour.paye) }}</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.week.paye) }}</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.fortnight.paye) }}</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.month.paye) }}</td>
                          <td class="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.year.paye) }}</td>
                        </tr>
                        <tr class="bg-red-50 dark:bg-red-900/20">
                          <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">ACC</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.hour.acc) }}</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.week.acc) }}</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.fortnight.acc) }}</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.month.acc) }}</td>
                          <td class="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.year.acc) }}</td>
                        </tr>
                        <tr v-if="hasKiwiSaver" class="bg-pink-50 dark:bg-pink-900/20">
                          <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">KiwiSaver</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.hour.kiwiSaver) }}</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.week.kiwiSaver) }}</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.fortnight.kiwiSaver) }}</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.month.kiwiSaver) }}</td>
                          <td class="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.year.kiwiSaver) }}</td>
                        </tr>
                        <tr v-if="hasStudentLoan" class="bg-purple-50 dark:bg-purple-900/20">
                          <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">Student Loan</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.hour.studentLoan) }}</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.week.studentLoan) }}</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.fortnight.studentLoan) }}</td>
                          <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.month.studentLoan) }}</td>
                          <td class="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.year.studentLoan) }}</td>
                        </tr>
                        <tr class="bg-green-50 dark:bg-green-900/20 font-semibold">
                          <td class="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">Take Home Pay</td>
                          <td class="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.hour.takeHomePay) }}</td>
                          <td class="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.week.takeHomePay) }}</td>
                          <td class="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.fortnight.takeHomePay) }}</td>
                          <td class="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.month.takeHomePay) }}</td>
                          <td class="px-4 py-3 text-sm text-right font-bold text-xl text-gray-900 dark:text-white">${{ formatCurrency(taxResult.breakdown.year.takeHomePay) }}</td>
                        </tr>
                      </tbody>
                    </table>
                </div>

                <!-- Additional Amount Calculator -->
                <div class="mt-8 p-6 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 class="text-base font-semibold text-gray-900 dark:text-white mb-3">
                      Calculate Tax on Additional Income
                    </h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Enter an additional amount to see how much tax you'd pay at your marginal rate ({{ taxResult.marginalRate }}%)
                    </p>
                    
                    <div class="space-y-4">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Additional Amount ($)
                        </label>
                        <input
                          v-model.number="additionalAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                          placeholder="e.g., 5000"
                          @keyup.enter="recalculateAdditionalTax"
                          @blur="recalculateAdditionalTax"
                        />
                      </div>
                      
                      <div v-if="additionalAmount > 0" class="p-4 bg-white dark:bg-gray-800 rounded-md border border-purple-200 dark:border-purple-700">
                        <div class="space-y-2">
                          <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600 dark:text-gray-400">Additional Income:</span>
                            <span class="text-sm font-medium text-gray-900 dark:text-white">${{ formatCurrency(additionalAmount) }}</span>
                          </div>
                          <div class="flex justify-between items-center">
                            <span class="text-sm text-gray-600 dark:text-gray-400">Marginal Tax Rate:</span>
                            <span class="text-sm font-medium text-gray-900 dark:text-white">{{ taxResult.marginalRate }}%</span>
                          </div>
                          <div class="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span class="text-base font-semibold text-gray-900 dark:text-white">Tax on Additional Amount:</span>
                            <span class="text-lg font-bold text-purple-600 dark:text-purple-400">
                              ${{ formatCurrency((additionalAmount * parseFloat(taxResult.marginalRate)) / 100) }}
                            </span>
                          </div>
                          <div class="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span class="text-base font-semibold text-gray-900 dark:text-white">After-Tax Amount:</span>
                            <span class="text-lg font-bold text-green-600 dark:text-green-400">
                              ${{ formatCurrency(additionalAmount - ((additionalAmount * parseFloat(taxResult.marginalRate)) / 100)) }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                </div>

                <div class="flex justify-between pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    @click="taxWizardStep = 3"
                    class="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors font-medium"
                  >
                    ← Back to Review
                  </button>
                  <button
                    @click="taxWizardStep = 1"
                    class="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors font-medium"
                  >
                    Calculate Again
                  </button>
                </div>
              </div>
            </div>

            <!-- Buy Now Pay Later Wizard -->
            <div v-if="activeHelper === 'bnpl'" class="space-y-6">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                See the true cost of buy now pay later schemes including fees and interest
              </p>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Purchase Amount ($)
                  </label>
                  <input
                    v-model.number="bnplAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-orange-500 focus:ring-orange-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                    placeholder="e.g., 500"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number of Payments
                  </label>
                  <select
                    v-model.number="bnplPayments"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-orange-500 focus:ring-orange-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                  >
                    <option :value="4">4 payments (fortnightly)</option>
                    <option :value="6">6 payments (fortnightly)</option>
                    <option :value="8">8 payments (fortnightly)</option>
                    <option :value="12">12 payments (monthly)</option>
                  </select>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Interest Rate per Payment (%)
                  </label>
                  <input
                    v-model.number="bnplInterestRate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-orange-500 focus:ring-orange-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                    placeholder="e.g., 0 (interest-free) or 2.5"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Account Keeping Fee per Payment ($)
                  </label>
                  <input
                    v-model.number="bnplFee"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-orange-500 focus:ring-orange-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                    placeholder="e.g., 5.95"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Late Payment Fee ($)
                  </label>
                  <input
                    v-model.number="bnplLateFee"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-orange-500 focus:ring-orange-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                    placeholder="e.g., 10"
                  />
                </div>
                
                <button
                  @click="calculateBNPL"
                  class="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
                >
                  Calculate
                </button>
                
                <div v-if="bnplResult" class="mt-6 p-4 bg-orange-50 dark:bg-orange-900 rounded-md space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-700 dark:text-gray-300">Payment per Installment:</span>
                    <span class="font-semibold text-lg text-gray-900 dark:text-white">${{ formatCurrency(bnplResult.paymentPerInstallment) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-700 dark:text-gray-300">Total Fees:</span>
                    <span class="font-semibold text-gray-900 dark:text-white">${{ formatCurrency(bnplResult.totalFees) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-700 dark:text-gray-300">Total Interest:</span>
                    <span class="font-semibold text-gray-900 dark:text-white">${{ formatCurrency(bnplResult.totalInterest) }}</span>
                  </div>
                  <div class="flex justify-between items-center pt-3 border-t border-orange-200 dark:border-orange-700">
                    <span class="text-gray-700 dark:text-gray-300 font-medium">Total Cost:</span>
                    <span class="font-bold text-xl text-gray-900 dark:text-white">${{ formatCurrency(bnplResult.totalCost) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-700 dark:text-gray-300 text-sm">Extra Cost vs Cash:</span>
                    <span class="font-semibold text-orange-600 dark:text-orange-400">${{ formatCurrency(bnplResult.extraCost) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Budget Breakdown Wizard -->
            <div v-if="activeHelper === 'budget'" class="space-y-6">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Calculate how much you can spend per day/week/month based on your income
              </p>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Monthly Income ($)
                  </label>
                  <input
                    v-model.number="monthlyIncome"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                    placeholder="e.g., 5000"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Essential Expenses ($/month)
                  </label>
                  <input
                    v-model.number="essentialExpenses"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                    placeholder="e.g., 2000 (rent, bills, food)"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Savings Goal ($/month)
                  </label>
                  <input
                    v-model.number="savingsGoalMonthly"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                    placeholder="e.g., 500"
                  />
                </div>
                
                <button
                  @click="calculateBudget"
                  class="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                >
                  Calculate
                </button>
                
                <div v-if="budgetResult" class="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900 rounded-md space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-700 dark:text-gray-300">Disposable Income:</span>
                    <span class="font-semibold text-gray-900 dark:text-white">${{ formatCurrency(budgetResult.disposableIncome) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-700 dark:text-gray-300">Per Week:</span>
                    <span class="font-semibold text-lg text-gray-900 dark:text-white">${{ formatCurrency(budgetResult.perWeek) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-700 dark:text-gray-300">Per Day:</span>
                    <span class="font-semibold text-lg text-gray-900 dark:text-white">${{ formatCurrency(budgetResult.perDay) }}</span>
                  </div>
                  <div class="flex justify-between items-center pt-3 border-t border-indigo-200 dark:border-indigo-700">
                    <span class="text-gray-700 dark:text-gray-300 font-medium">Remaining After Savings:</span>
                    <span class="font-bold text-xl text-gray-900 dark:text-white">${{ formatCurrency(budgetResult.remainingAfterSavings) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Emergency Fund Wizard -->
            <div v-if="activeHelper === 'emergency'" class="space-y-6">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Calculate how much you need in your emergency fund based on your expenses
              </p>
              
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Monthly Expenses ($)
                  </label>
                  <input
                    v-model.number="monthlyExpenses"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                    placeholder="e.g., 3000"
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Months of Coverage
                  </label>
                  <select
                    v-model.number="emergencyMonths"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                  >
                    <option :value="3">3 months (minimum)</option>
                    <option :value="6">6 months (recommended)</option>
                    <option :value="12">12 months (comfortable)</option>
                  </select>
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Emergency Fund ($)
                  </label>
                  <input
                    v-model.number="currentEmergencyFund"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-teal-500 focus:ring-teal-500 dark:bg-gray-700 dark:text-white px-4 py-2"
                    placeholder="e.g., 1000"
                  />
                </div>
                
                <button
                  @click="calculateEmergencyFund"
                  class="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-colors"
                >
                  Calculate
                </button>
                
                <div v-if="emergencyResult" class="mt-6 p-4 bg-teal-50 dark:bg-teal-900 rounded-md space-y-3">
                  <div class="flex justify-between items-center">
                    <span class="text-gray-700 dark:text-gray-300">Target Emergency Fund:</span>
                    <span class="font-semibold text-lg text-gray-900 dark:text-white">${{ formatCurrency(emergencyResult.targetFund) }}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-gray-700 dark:text-gray-300">Current Fund:</span>
                    <span class="font-semibold text-gray-900 dark:text-white">${{ formatCurrency(emergencyResult.currentFund) }}</span>
                  </div>
                  <div class="flex justify-between items-center pt-3 border-t border-teal-200 dark:border-teal-700">
                    <span class="text-gray-700 dark:text-gray-300 font-medium">Still Need:</span>
                    <span class="font-bold text-xl text-gray-900 dark:text-white">${{ formatCurrency(emergencyResult.stillNeed) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- View Info -->
    <ViewInfo 
      view-name="Helpers" 
      :components="['HelperIcons']"
      :script-blocks="[
        { name: 'useFinancialHelpers', type: 'composable', functions: ['calculateLoanPayment', 'calculateSavingsGoal', 'calculateTax', 'calculateBNPL', 'calculateBudgetBreakdown', 'calculateEmergencyFund', 'formatCurrency'] }
      ]"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useFinancialHelpers } from '../composables/useFinancialHelpers';
import HelperIcons from '../components/HelperIcons.vue';
import ViewInfo from '../components/ViewInfo.vue';

const {
  // Loan calculator
  loanAmount,
  loanInterestRate,
  loanTermYears,
  loanResult,
  calculateLoan,
  
  // Savings calculator
  savingsGoal,
  currentSavings,
  savingsMonths,
  savingsInterestRate,
  savingsResult,
  calculateSavings,
  
    // Tax calculator
    incomeAmount,
    incomeFrequency,
    hoursPerWeek,
    hasKiwiSaver,
    kiwiSaverRate,
    hasStudentLoan,
    taxResult,
    taxWizardStep,
    additionalAmount,
    calculateTax,
  
  // BNPL calculator
  bnplAmount,
  bnplPayments,
  bnplInterestRate,
  bnplFee,
  bnplLateFee,
  bnplResult,
  calculateBNPL,
  
  // Budget calculator
  monthlyIncome,
  essentialExpenses,
  savingsGoalMonthly,
  budgetResult,
  calculateBudget,
  
  // Emergency fund calculator
  monthlyExpenses,
  emergencyMonths,
  currentEmergencyFund,
  emergencyResult,
  calculateEmergencyFund,
  
  // Utility functions
  formatCurrency
} = useFinancialHelpers();

const activeHelper = ref(null);

const openHelper = (helperType) => {
  activeHelper.value = helperType;
  // Reset wizard step when opening tax calculator
  if (helperType === 'tax') {
    taxWizardStep.value = 1;
  }
};

const closeHelper = () => {
  activeHelper.value = null;
  // Reset wizard step and additional amount when closing
  taxWizardStep.value = 1;
  additionalAmount.value = 0;
};

const getHelperColor = (type) => {
  const colors = {
    loan: '#3B82F6',      // Blue
    savings: '#10B981',   // Green
    tax: '#A855F7',       // Purple
    bnpl: '#F97316',      // Orange
    budget: '#6366F1',    // Indigo
    emergency: '#14B8A6'  // Teal
  };
  return colors[type] || '#3B82F6';
};

const getHelperTitle = (type) => {
  const titles = {
    loan: 'Loan Repayment Calculator',
    savings: 'Savings Goal Calculator',
    tax: 'Income Tax Calculator',
    bnpl: 'Buy Now Pay Later Calculator',
    budget: 'Budget Breakdown Helper',
    emergency: 'Emergency Fund Calculator'
  };
  return titles[type] || 'Financial Helper';
};

// Calculate tax and proceed to results step
const calculateTaxAndProceed = () => {
  calculateTax();
  taxWizardStep.value = 4;
};

// Recalculate additional tax amount (triggered on Enter or blur)
const recalculateAdditionalTax = () => {
  // Force reactivity by ensuring the value is properly set
  // Vue's reactivity should handle this automatically, but this ensures it
  if (additionalAmount.value < 0) {
    additionalAmount.value = 0;
  }
  // The calculation in the template will automatically update due to Vue's reactivity
};
</script>
