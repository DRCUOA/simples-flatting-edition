<template>
  <div class="reconciliation-view">
    <!-- Header -->
    <div class="header">
      <div class="header-title-section">
        <h1>Bank Reconciliation</h1>
        <button 
          @click="showHelpModal = true" 
          class="info-icon-btn"
          title="How Bank Reconciliation Works"
        >
          ℹ️
        </button>
      </div>
      <div class="header-controls">
        <select 
          v-model="selectedAccount" 
          class="account-selector"
          @change="onAccountChange"
          :disabled="loading"
        >
          <option value="">Select Account</option>
          <option 
            v-for="account in availableAccounts" 
            :key="account.account_id" 
            :value="account"
          >
            {{ account.account_name }}
          </option>
        </select>
        
        <button 
          v-if="!currentSession"
          @click="showSessionModal = true" 
          class="btn btn-success"
          :disabled="!selectedAccount || loading"
        >
          Start Reconciliation
        </button>
        
        <button 
          v-if="currentSession"
          @click="returnToHistory"
          class="btn btn-secondary"
          :disabled="loading"
        >
          ← Back to History
        </button>
      </div>
    </div>

    <!-- Toast Notifications -->
    <transition-group name="toast" tag="div" class="toast-container">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        :class="['toast', `toast-${toast.type}`]"
      >
        <span class="toast-icon">{{ getToastIcon(toast.type) }}</span>
        <span class="toast-message">{{ toast.message }}</span>
        <button @click="removeToast(toast.id)" class="toast-close">×</button>
      </div>
    </transition-group>

    <!-- Loading Overlay -->
    <div v-if="loading && loadingMessage" class="loading-overlay">
      <div class="loading-card">
        <div class="loading-spinner"></div>
        <p class="loading-message">{{ loadingMessage }}</p>
      </div>
    </div>

    <!-- Help Modal -->
    <div v-if="showHelpModal" class="modal-overlay" @click="showHelpModal = false">
      <div class="modal help-modal" @click.stop>
        <div class="modal-header">
          <h3>How Bank Reconciliation Works</h3>
          <button @click="showHelpModal = false" class="modal-close">×</button>
        </div>
        <div class="modal-content">
          <div class="help-step">
            <span class="step-number">1</span>
            <div class="step-content">
              <strong>Select an Account</strong>
              <p>Choose the bank account you want to reconcile from the dropdown above.</p>
            </div>
          </div>
          <div class="help-step">
            <span class="step-number">2</span>
            <div class="step-content">
              <strong>Start Reconciliation</strong>
              <p>Click "Start Reconciliation" and enter the date range and balances from your bank statement.</p>
            </div>
          </div>
          <div class="help-step">
            <span class="step-number">3</span>
            <div class="step-content">
              <strong>Mark Transactions as Reconciled</strong>
              <p>Review each transaction and check the box to mark it as reconciled. The variance will update automatically.</p>
            </div>
          </div>
          <div class="help-step">
            <span class="step-number">4</span>
            <div class="step-content">
              <strong>Complete Reconciliation</strong>
              <p>When the variance is zero (or acceptable), click "Complete Reconciliation" to finalize. You can also save a draft to continue later.</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showHelpModal = false" class="btn btn-primary">Got it</button>
        </div>
      </div>
    </div>

    <!-- Reconciliation History (when no active session) -->
    <div v-if="!currentSession" class="reconciliation-history">
      <div class="history-header">
        <h2>Reconciliation History</h2>
        <div class="history-filters">
          <select v-model="historyFilter" @change="loadHistory" class="filter-select">
            <option value="all">All Accounts</option>
            <option v-for="account in availableAccounts" :key="account.account_id" :value="account.account_id">
              {{ account.account_name }}
            </option>
          </select>
          <button @click="loadHistory" class="btn btn-secondary" :disabled="loading">
            Refresh
          </button>
        </div>
      </div>

      <div v-if="historyLoading" class="loading-state">
        <div class="loading-spinner-small"></div>
        <p>Loading reconciliation history...</p>
      </div>

      <div v-else-if="historySessions.length === 0" class="empty-history">
        <span class="empty-icon">📋</span>
        <h3>No Reconciliation History</h3>
        <p v-if="selectedAccount">No reconciliations found for {{ selectedAccount.account_name }}.</p>
        <p v-else>No reconciliations found. Start your first reconciliation by selecting an account above.</p>
      </div>

      <div v-else class="history-list">
        <div 
          v-for="session in historySessions" 
          :key="session.session_id"
          class="history-item"
          :class="{ 'history-item-active': !session.closed, 'history-item-closed': session.closed }"
          @click="viewSession(session.session_id)"
        >
          <div class="history-item-header">
            <div class="history-item-title">
              <strong>{{ session.account_name || 'Unknown Account' }}</strong>
              <span class="history-item-status" :class="session.closed ? 'status-closed' : 'status-active'">
                {{ session.closed ? 'Completed' : 'Active' }}
              </span>
            </div>
            <span class="history-item-date">{{ formatDate(session.run_started) }}</span>
          </div>
          
          <div class="history-item-details">
            <div class="history-detail">
              <span class="detail-label">Period:</span>
              <span class="detail-value">{{ formatDate(session.period_start) }} - {{ formatDate(session.period_end) }}</span>
            </div>
            <div class="history-detail">
              <span class="detail-label">Start Balance:</span>
              <span class="detail-value">{{ formatAmount(session.start_balance || 0) }}</span>
            </div>
            <div class="history-detail">
              <span class="detail-label">Closing Balance:</span>
              <span class="detail-value">{{ formatAmount(session.closing_balance) }}</span>
            </div>
            <div class="history-detail">
              <span class="detail-label">Matches:</span>
              <span class="detail-value">{{ session.match_count || 0 }}</span>
            </div>
            <div class="history-detail">
              <span class="detail-label">Variance:</span>
              <span class="detail-value" :class="getVarianceClass(session.variance)">
                {{ formatAmount(session.variance || 0) }}
              </span>
            </div>
          </div>
          
          <div class="history-item-actions">
            <button 
              v-if="!session.closed"
              @click.stop="openEditSessionModal(session)"
              class="btn btn-secondary btn-sm"
              :disabled="loading"
              title="Edit session parameters"
            >
              Edit
            </button>
            <button 
              v-if="!session.closed"
              @click.stop="viewSession(session.session_id)"
              class="btn btn-primary btn-sm"
              :disabled="loading"
              title="Open this reconciliation"
            >
              Open
            </button>
            <button 
              @click.stop="deleteHistorySession(session.session_id)"
              class="btn btn-danger btn-sm"
              :disabled="loading"
              title="Delete this reconciliation"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-message">
      {{ error }}
      <button @click="clearError" class="btn-close">×</button>
    </div>

    <!-- Session Summary -->
    <div v-if="currentSession" class="session-summary">
      <div class="summary-card" :class="reconciliationStatusClass">
        <div class="status-banner" :class="reconciliationStatusClass">
          <span class="status-icon">{{ reconciliationStatusIcon }}</span>
          <span class="status-text">{{ reconciliationStatusText }}</span>
        </div>
        
        <h3>Reconciliation Summary</h3>
        
        <!-- Balance Calculation -->
        <div class="balance-calculation">
          <div class="calculation-row">
            <span class="calculation-label">Start Balance:</span>
            <span class="calculation-value">{{ formatAmount(sessionSummary?.start_balance || 0) }}</span>
          </div>
          <div class="calculation-row">
            <span class="calculation-label">+ Reconciled Transactions:</span>
            <span class="calculation-value">{{ formatAmount(sessionSummary?.reconciled_amount || 0) }}</span>
            <span class="calculation-note">({{ sessionSummary?.reconciled_transactions || 0 }} transactions)</span>
          </div>
          <div class="calculation-row calculation-total">
            <span class="calculation-label">= Calculated Balance:</span>
            <span class="calculation-value">{{ formatAmount(sessionSummary?.calculated_balance || 0) }}</span>
          </div>
          <div class="calculation-row calculation-target">
            <span class="calculation-label">Target Closing Balance:</span>
            <span class="calculation-value">{{ formatAmount(sessionSummary?.closing_balance || 0) }}</span>
          </div>
          <div class="calculation-row calculation-variance" :class="varianceStatus.status">
            <span class="calculation-label">Variance:</span>
            <span class="calculation-value">{{ formatAmount(variance) }}</span>
          </div>
        </div>
        
        <div class="summary-stats">
          <div class="stat">
            <span class="label">Period:</span>
            <span class="value">{{ formatDate(currentSession.period_start) }} - {{ formatDate(currentSession.period_end) }}</span>
          </div>
          <div class="stat">
            <span class="label">Total Reconciled Value:</span>
            <span class="value highlighted">{{ formatAmount(sessionSummary?.reconciled_amount || 0) }}</span>
          </div>
          <div class="stat">
            <span class="label">Reconciled Transactions:</span>
            <span class="value">{{ sessionSummary?.reconciled_transactions || 0 }} / {{ sessionSummary?.total_transactions || 0 }}</span>
          </div>
        </div>
        
        <div class="session-actions">
          <button 
            v-if="currentSession && !currentSession.closed"
            @click="openEditSessionModal(currentSession)"
            class="btn btn-secondary"
            :disabled="loading || !isSessionActive"
          >
            Edit Session
          </button>
          <button 
            @click="saveDraft"
            class="btn btn-secondary"
            :disabled="loading || !isSessionActive"
          >
            Save Draft
          </button>
          <button 
            @click="handleCloseSession" 
            class="btn btn-warning"
            :disabled="loading || !isSessionActive"
          >
            Complete Reconciliation
          </button>
        </div>
      </div>
    </div>

    <!-- Transactions List -->
    <div v-if="currentSession" class="transactions-section">
      <div class="transactions-header">
        <h3>Transactions</h3>
        <div class="transactions-controls">
          <label class="select-all-label">
            <input 
              type="checkbox" 
              :checked="allTransactionsSelected"
              :indeterminate="someTransactionsSelected && !allTransactionsSelected"
              @change="toggleSelectAll"
              :disabled="loading || !isSessionActive"
            />
            <span>Select All</span>
          </label>
        </div>
      </div>
      <div class="transactions-list">
        <div v-if="transactions.length === 0" class="empty-state">
          <span class="empty-icon">📋</span>
          <h4>No Transactions Found</h4>
          <p>No transactions found for this period.</p>
        </div>
        <div 
          v-for="transaction in transactions" 
          :key="transaction.transaction_id"
          class="transaction-item"
          :class="{ 
            reconciled: isReconciled(transaction.transaction_id),
            'reconciled-other-session': isReconciledInOtherSession(transaction.transaction_id)
          }"
        >
          <input
            type="checkbox"
            :checked="isReconciled(transaction.transaction_id)"
            @change="toggleReconciliation(transaction)"
            :disabled="loading || !isSessionActive || isReconciledInOtherSession(transaction.transaction_id)"
            class="reconcile-checkbox"
            :title="isReconciledInOtherSession(transaction.transaction_id) ? 'Already reconciled in another session' : ''"
          />
          <div class="transaction-details" @click="viewTransactionDetails(transaction.transaction_id)">
            <div class="transaction-header">
              <strong>{{ transaction.description || 'No description' }}</strong>
              <span class="amount" :class="transaction.signed_amount >= 0 ? 'positive' : 'negative'">
                {{ formatAmount(transaction.signed_amount) }}
              </span>
            </div>
            <div class="transaction-meta">
              <span class="date">{{ formatDate(transaction.transaction_date) }}</span>
              <span v-if="transaction.category_name" class="category">{{ transaction.category_name }}</span>
              <span 
                v-if="isReconciledInOtherSession(transaction.transaction_id)" 
                class="other-session-warning"
                :title="getOtherSessionWarningText(transaction)"
              >
                ⚠️ Already reconciled in {{ getOtherSessionPeriod(transaction) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Session Modal (Create/Edit) -->
    <div v-if="showSessionModal" class="modal-overlay" @click="showSessionModal = false">
      <div class="modal" @click.stop>
        <h3>{{ editingSession ? 'Edit Reconciliation Session' : 'Start Reconciliation' }}</h3>
        <form @submit.prevent="editingSession ? handleUpdateSession() : handleStartSession()">
          <div class="form-group">
            <label>Statement Start Date (approximate):</label>
            <input 
              v-model="sessionForm.period_start" 
              type="date" 
              required 
            />
          </div>
          <div class="form-group">
            <label>Statement Closing Date:</label>
            <input 
              v-model="sessionForm.period_end" 
              type="date" 
              required 
            />
          </div>
          <div class="form-group">
            <label>Start Balance (from bank statement):</label>
            <input 
              v-model="sessionForm.start_balance" 
              type="number" 
              step="0.01" 
              required 
              placeholder="0.00"
            />
          </div>
          <div class="form-group">
            <label>Closing Balance (from bank statement):</label>
            <input 
              v-model="sessionForm.closing_balance" 
              type="number" 
              step="0.01" 
              required 
              placeholder="0.00"
            />
          </div>
          <div class="form-group">
            <label>Statement Name (optional):</label>
            <input 
              v-model="sessionForm.statement_name" 
              type="text" 
              placeholder="e.g., January 2025 Reconciliation"
              maxlength="255"
            />
            <small class="form-help-text">Give this reconciliation a memorable name. If left empty, a default name will be generated.</small>
          </div>
          <div v-if="sessionError" class="error-message">
            {{ sessionError }}
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-success" :disabled="loading">
              {{ editingSession ? 'Update Session' : 'Start Reconciliation' }}
            </button>
            <button type="button" @click="closeSessionModal" class="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Transaction Details Modal -->
    <div v-if="showTransactionModal" class="modal-overlay" @click="closeTransactionModal">
      <div class="modal transaction-details-modal" @click.stop>
        <div class="modal-header">
          <h3>Transaction Details</h3>
          <button @click="closeTransactionModal" class="btn-close-modal">×</button>
        </div>
        <div class="modal-body">
          <div v-if="transactionDetailsLoading" class="loading-state">
            <p>Loading transaction details...</p>
          </div>
          <div v-else-if="transactionDetailsError" class="error-state">
            <p>Error loading details: {{ transactionDetailsError }}</p>
          </div>
          <div v-else class="transaction-details-content">
            <!-- Transaction Core Fields -->
            <section class="details-section">
              <h4>Transaction Information</h4>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Transaction ID:</label>
                  <span class="monospace">{{ selectedTransactionDetails.transaction?.transaction_id }}</span>
                </div>
                <div class="detail-item">
                  <label>Date:</label>
                  <span>{{ formatDate(selectedTransactionDetails.transaction?.transaction_date) }}</span>
                </div>
                <div class="detail-item">
                  <label>Posted Date:</label>
                  <span>{{ formatDate(selectedTransactionDetails.transaction?.posted_date) || '—' }}</span>
                </div>
                <div class="detail-item">
                  <label>Description:</label>
                  <span>{{ selectedTransactionDetails.transaction?.description || '—' }}</span>
                </div>
                <div class="detail-item">
                  <label>Amount:</label>
                  <span>{{ formatAmount(selectedTransactionDetails.transaction?.amount || 0) }}</span>
                </div>
                <div class="detail-item">
                  <label>Signed Amount:</label>
                  <span :class="selectedTransactionDetails.transaction?.signed_amount >= 0 ? 'positive' : 'negative'">
                    {{ formatAmount(selectedTransactionDetails.transaction?.signed_amount || 0) }}
                  </span>
                </div>
                <div class="detail-item">
                  <label>Transaction Type:</label>
                  <span>{{ selectedTransactionDetails.transaction?.transaction_type || '—' }}</span>
                </div>
                <div class="detail-item">
                  <label>Posted Status:</label>
                  <span>{{ selectedTransactionDetails.transaction?.posted_status || '—' }}</span>
                </div>
                <div class="detail-item">
                  <label>Is Transfer:</label>
                  <span>{{ selectedTransactionDetails.transaction?.is_transfer ? 'Yes' : 'No' }}</span>
                </div>
                <div class="detail-item">
                  <label>Created At:</label>
                  <span>{{ formatDate(selectedTransactionDetails.transaction?.created_at) || '—' }}</span>
                </div>
                <div class="detail-item">
                  <label>Dedupe Hash:</label>
                  <span class="monospace small">{{ selectedTransactionDetails.transaction?.dedupe_hash?.substring(0, 16) || '—' }}...</span>
                </div>
                <div class="detail-item">
                  <label>Import ID:</label>
                  <span class="monospace small">{{ selectedTransactionDetails.transaction?.import_id || '—' }}</span>
                </div>
              </div>
            </section>

            <!-- Account Information -->
            <section class="details-section">
              <h4>Account</h4>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Account ID:</label>
                  <span class="monospace">{{ selectedTransactionDetails.transaction?.account_id }}</span>
                </div>
                <div class="detail-item">
                  <label>Account Name:</label>
                  <span>{{ selectedTransactionDetails.transaction?.account_name || '—' }}</span>
                </div>
                <div class="detail-item">
                  <label>Account Type:</label>
                  <span>{{ selectedTransactionDetails.transaction?.account_type || '—' }}</span>
                </div>
                <div class="detail-item">
                  <label>Positive Is Credit:</label>
                  <span>{{ selectedTransactionDetails.transaction?.positive_is_credit ? 'Yes' : 'No' }}</span>
                </div>
              </div>
            </section>

            <!-- Category Information -->
            <section class="details-section" v-if="selectedTransactionDetails.transaction?.category_id">
              <h4>Category</h4>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Category ID:</label>
                  <span class="monospace">{{ selectedTransactionDetails.transaction?.category_id }}</span>
                </div>
                <div class="detail-item">
                  <label>Category Name:</label>
                  <span>{{ selectedTransactionDetails.transaction?.category_name || '—' }}</span>
                </div>
                <div class="detail-item" v-if="selectedTransactionDetails.transaction?.parent_category_id">
                  <label>Parent Category:</label>
                  <span>{{ selectedTransactionDetails.transaction?.parent_category_name || '—' }}</span>
                </div>
              </div>
            </section>

            <!-- Statement Assignment -->
            <section class="details-section">
              <h4>Statement Assignment</h4>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Assigned to Statement:</label>
                  <span v-if="selectedTransactionDetails.transaction?.statement_id" class="monospace">
                    {{ selectedTransactionDetails.transaction.statement_id }}
                  </span>
                  <span v-else class="text-gray-500 italic">Unassigned</span>
                </div>
                <div v-if="selectedTransactionDetails.statement_info" class="detail-item full-width">
                  <label>Statement Name:</label>
                  <span class="font-semibold text-blue-600 dark:text-blue-400">
                    {{ selectedTransactionDetails.statement_info.statement_name }}
                  </span>
                </div>
                <div v-if="selectedTransactionDetails.statement_info" class="detail-item">
                  <label>Statement Period:</label>
                  <span>
                    {{ formatDate(selectedTransactionDetails.statement_info.statement_from) }} - 
                    {{ formatDate(selectedTransactionDetails.statement_info.statement_to) }}
                  </span>
                </div>
                <div v-if="selectedTransactionDetails.statement_info" class="detail-item">
                  <label>Source Filename:</label>
                  <span>{{ selectedTransactionDetails.statement_info.source_filename || '—' }}</span>
                </div>
                <div v-if="selectedTransactionDetails.statement_info?.bank_name" class="detail-item">
                  <label>Bank Name:</label>
                  <span>{{ selectedTransactionDetails.statement_info.bank_name }}</span>
                </div>
                <div v-if="selectedTransactionDetails.statement_info" class="detail-item">
                  <label>Status:</label>
                  <span class="px-2 py-1 text-xs rounded-full" :class="{
                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300': selectedTransactionDetails.statement_info.status === 'completed',
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300': selectedTransactionDetails.statement_info.status === 'pending',
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300': selectedTransactionDetails.statement_info.status === 'failed'
                  }">
                    {{ selectedTransactionDetails.statement_info.status || 'pending' }}
                  </span>
                </div>
                <div v-if="selectedTransactionDetails.statement_info" class="detail-item">
                  <label>Created:</label>
                  <span>{{ formatDate(selectedTransactionDetails.statement_info.created_at) }}</span>
                </div>
                <div class="detail-item full-width">
                  <label>Reconciliation Summary:</label>
                  <span>
                    {{ selectedTransactionDetails.reconciliation_summary?.total_matches || 0 }} total matches
                    ({{ selectedTransactionDetails.reconciliation_summary?.active_matches || 0 }} active,
                    {{ selectedTransactionDetails.reconciliation_summary?.inactive_matches || 0 }} inactive)
                  </span>
                </div>
              </div>
            </section>

            <!-- Reconciliation Matches -->
            <section class="details-section" v-if="selectedTransactionDetails.reconciliation_matches?.length > 0">
              <h4>Reconciliation History ({{ selectedTransactionDetails.reconciliation_matches.length }})</h4>
              <div class="matches-list">
                <div 
                  v-for="match in selectedTransactionDetails.reconciliation_matches" 
                  :key="match.match_id"
                  class="match-item"
                  :class="{ inactive: !match.active }"
                >
                  <div class="match-header">
                    <span class="match-status" :class="match.active ? 'active' : 'inactive'">
                      {{ match.active ? 'Active' : 'Inactive' }}
                    </span>
                    <span class="match-date">{{ formatDate(match.matched_at) }}</span>
                  </div>
                  <div class="match-details">
                    <div class="match-detail-row">
                      <label>Session ID:</label>
                      <span class="monospace small">{{ match.session_id }}</span>
                    </div>
                    <div class="match-detail-row" v-if="match.period_start">
                      <label>Session Period:</label>
                      <span>{{ formatDate(match.period_start) }} - {{ formatDate(match.period_end) }}</span>
                    </div>
                    <div class="match-detail-row">
                      <label>Matched By:</label>
                      <span>{{ match.matched_by || '—' }}</span>
                    </div>
                    <div class="match-detail-row">
                      <label>Confidence:</label>
                      <span>{{ match.confidence || 0 }}%</span>
                    </div>
                    <div class="match-detail-row">
                      <label>Rule:</label>
                      <span>{{ match.rule || '—' }}</span>
                    </div>
                    <div class="match-detail-row" v-if="match.closed !== undefined">
                      <label>Session Status:</label>
                      <span>{{ match.closed ? 'Closed' : 'Active' }}</span>
                    </div>
                    <div class="match-detail-row" v-if="match.statement_line_id">
                      <label>Statement Line ID:</label>
                      <span class="monospace small">{{ match.statement_line_id }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Linked Transaction -->
            <section class="details-section" v-if="selectedTransactionDetails.linked_transaction">
              <h4>Linked Transaction</h4>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Linked Transaction ID:</label>
                  <span class="monospace">{{ selectedTransactionDetails.linked_transaction.transaction_id }}</span>
                </div>
                <div class="detail-item">
                  <label>Account:</label>
                  <span>{{ selectedTransactionDetails.linked_transaction.account_name || '—' }}</span>
                </div>
                <div class="detail-item">
                  <label>Date:</label>
                  <span>{{ formatDate(selectedTransactionDetails.linked_transaction.transaction_date) }}</span>
                </div>
                <div class="detail-item">
                  <label>Amount:</label>
                  <span>{{ formatAmount(selectedTransactionDetails.linked_transaction.signed_amount || 0) }}</span>
                </div>
              </div>
            </section>

            <!-- Import Record -->
            <section class="details-section" v-if="selectedTransactionDetails.import_record">
              <h4>Import Record</h4>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Import ID:</label>
                  <span class="monospace">{{ selectedTransactionDetails.import_record.id }}</span>
                </div>
                <div class="detail-item">
                  <label>Import Date:</label>
                  <span>{{ formatDate(selectedTransactionDetails.import_record.import_date) }}</span>
                </div>
                <div class="detail-item">
                  <label>Status:</label>
                  <span>{{ selectedTransactionDetails.import_record.status || '—' }}</span>
                </div>
                <div class="detail-item" v-if="selectedTransactionDetails.import_record.error_message">
                  <label>Error Message:</label>
                  <span class="error-text">{{ selectedTransactionDetails.import_record.error_message }}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeTransactionModal" class="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
    
    <!-- View Info -->
    <ViewInfo 
      view-name="Reconciliation" 
      :components="[]"
      :script-blocks="[
        { name: 'useReconciliation', type: 'composable', functions: ['startNewSession', 'closeSession', 'deleteMatch', 'createMatch', 'loadAccountSessions', 'loadSession', 'deleteSession', 'clearError', 'formatAmount', 'formatDate'] }
      ]"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useReconciliation } from '../composables/useReconciliation'
import ViewInfo from '../components/ViewInfo.vue'

const {
  // Store state
  currentSession,
  matches,
  transactions,
  sessions,
  sessionSummary,
  variance,
  isSessionActive,
  loading,
  error,
  
  // Local state
  selectedAccount,
  availableAccounts,
  showSessionModal,
  selectedTransaction,
  
  // Computed
  reconciledTransactionIds,
  reconciledInOtherSessionIds,
  getOtherSessionInfo,
  unreconciledTransactions,
  varianceStatus,
  
  // Actions
  startNewSession,
  closeSession,
  deleteMatch,
  createMatch,
  loadAccountSessions,
  loadSession,
  updateSession,
  deleteSession,
  clearError,
  
  // Utilities
  formatAmount,
  formatDate
} = useReconciliation()

// History state
const historySessions = ref([])
const historyLoading = ref(false)
const historyFilter = ref('all')
const showHelpModal = ref(false)

// Transaction details modal state
const showTransactionModal = ref(false)
const selectedTransactionDetails = ref(null)
const transactionDetailsLoading = ref(false)
const transactionDetailsError = ref(null)

// Form data
const sessionForm = ref({
  period_start: '',
  period_end: '',
  start_balance: 0,
  closing_balance: 0,
  statement_name: ''
})

const sessionError = ref(null)
const editingSession = ref(null)

// Toast notifications
const toasts = ref([])
let toastIdCounter = 0

// Loading states
const loadingMessage = ref('')

// Toast methods
const showToast = (message, type = 'info', duration = 4000) => {
  const id = toastIdCounter++
  toasts.value.push({ id, message, type })
  
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration)
  }
}

const removeToast = (id) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

const getToastIcon = (type) => {
  switch (type) {
    case 'success': return '✓'
    case 'error': return '✕'
    case 'warning': return '⚠'
    case 'info': return 'ℹ'
    default: return '•'
  }
}

const setLoading = (message) => {
  loadingMessage.value = message
}

const clearLoading = () => {
  loadingMessage.value = ''
}

// Check if transaction is reconciled
const isReconciled = (transactionId) => {
  return reconciledTransactionIds.value.has(transactionId)
}

// Check if transaction is reconciled in another session
const isReconciledInOtherSession = (transactionId) => {
  return reconciledInOtherSessionIds.value.has(transactionId)
}

const getOtherSessionWarningText = (transaction) => {
  if (!isReconciledInOtherSession(transaction.transaction_id)) return ''
  const status = transaction.other_session_closed ? 'completed' : 'active'
  return `This transaction was already reconciled in ${status} session ${transaction.other_session_id?.substring(0, 8)} (${formatDate(transaction.other_session_period_start)} to ${formatDate(transaction.other_session_period_end)})`
}

const getOtherSessionPeriod = (transaction) => {
  if (!isReconciledInOtherSession(transaction.transaction_id)) return ''
  return `${formatDate(transaction.other_session_period_start)} - ${formatDate(transaction.other_session_period_end)}`
}

// Reconciliation status computed properties
const reconciliationStatusClass = computed(() => {
  if (!sessionSummary.value) return 'status-pending'
  return sessionSummary.value.is_balanced ? 'status-balanced' : 'status-unbalanced'
})

const reconciliationStatusIcon = computed(() => {
  if (!sessionSummary.value) return '⏳'
  return sessionSummary.value.is_balanced ? '✓' : '✕'
})

const reconciliationStatusText = computed(() => {
  if (!sessionSummary.value) return 'Calculating...'
  if (sessionSummary.value.is_balanced) {
    return 'Reconciliation Balanced - Ready to Complete'
  }
  const absVariance = Math.abs(sessionSummary.value.variance)
  if (absVariance < 1.00) {
    return `Almost Balanced - Variance: ${formatAmount(sessionSummary.value.variance)}`
  }
  return `Unbalanced - Variance: ${formatAmount(sessionSummary.value.variance)}`
})

// Toggle reconciliation for a transaction
const toggleReconciliation = async (transaction) => {
  if (loading.value || !isSessionActive.value) return
  
  // Check if already reconciled in other session
  if (isReconciledInOtherSession(transaction.transaction_id)) {
    const warningText = getOtherSessionWarningText(transaction)
    showToast(warningText, 'warning', 5000)
    return
  }

  const isCurrentlyReconciled = isReconciled(transaction.transaction_id)
  
  try {
    if (isCurrentlyReconciled) {
      // Find the match and delete it
      const match = matches.value.find(m => m.transaction_id === transaction.transaction_id)
      if (match) {
        setLoading('Unreconciling transaction...')
        await deleteMatch(match.match_id)
        clearLoading()
        showToast('Transaction unreconciled', 'success', 2000)
      }
    } else {
      // Create a new match - set selected transaction temporarily
      setLoading('Reconciling transaction...')
      const originalSelected = selectedTransaction.value
      selectedTransaction.value = transaction
      try {
        await createMatch()
        clearLoading()
        showToast('Transaction reconciled', 'success', 2000)
      } catch (error) {
        // Check for conflict error (support both axios-style and mapped errors)
        const status = error?.status || error?.response?.status || error?.originalError?.response?.status
        const errorData = error?.data || error?.response?.data || error?.originalError?.response?.data
        if (status === 409) {
          showToast(errorData?.message || errorData?.error || error.message, 'warning', 6000)
        } else {
          throw error
        }
      } finally {
        selectedTransaction.value = originalSelected
      }
    }
  } catch (error) {
    clearLoading()
    const status = error?.status || error?.response?.status || error?.originalError?.response?.status
    const errorData = error?.data || error?.response?.data || error?.originalError?.response?.data
    if (status === 409) {
      showToast(errorData?.message || errorData?.error || error.message, 'warning', 6000)
    } else {
      showToast(`Failed to ${isCurrentlyReconciled ? 'unreconcile' : 'reconcile'} transaction: ${error.message}`, 'error')
    }
  }
}

// Get variance class for styling
const getVarianceClass = (variance) => {
  const absVariance = Math.abs(variance || 0)
  if (absVariance < 0.01) return 'balanced'
  if (absVariance < 1.00) return 'close'
  return 'unbalanced'
}

// Computed properties for select all
const allTransactionsSelected = computed(() => {
  if (!transactions.value || transactions.value.length === 0) return false
  return transactions.value.every(tx => isReconciled(tx.transaction_id))
})

const someTransactionsSelected = computed(() => {
  if (!transactions.value || transactions.value.length === 0) return false
  const reconciledCount = transactions.value.filter(tx => isReconciled(tx.transaction_id)).length
  return reconciledCount > 0 && reconciledCount < transactions.value.length
})

// Toggle select all transactions
const toggleSelectAll = async () => {
  if (loading.value || !isSessionActive.value) return
  
  const shouldSelectAll = !allTransactionsSelected.value
  
  try {
    setLoading(shouldSelectAll ? 'Reconciling all transactions...' : 'Unreconciling all transactions...')
    
    // Get transactions that need to be toggled
    const transactionsToToggle = transactions.value.filter(tx => {
      const isCurrentlyReconciled = isReconciled(tx.transaction_id)
      return shouldSelectAll ? !isCurrentlyReconciled : isCurrentlyReconciled
    })
    
    if (transactionsToToggle.length === 0) {
      clearLoading()
      return
    }
    
    // Use the store directly to avoid composable overhead
    const { useReconciliationStore } = await import('../stores/reconciliation')
    const store = useReconciliationStore()
    
    // Process sequentially to avoid overwhelming the server
    let successCount = 0
    let errorCount = 0
    
    for (const tx of transactionsToToggle) {
      try {
        if (shouldSelectAll) {
          await store.createManualMatch(tx.transaction_id, true) // Skip loading state
        } else {
          const match = matches.value.find(m => m.transaction_id === tx.transaction_id)
          if (match) {
            await store.deleteMatch(match.match_id)
          }
        }
        successCount++
        
        // Small delay between requests to avoid overwhelming the server
        if (successCount + errorCount < transactionsToToggle.length) {
          await new Promise(resolve => setTimeout(resolve, 50)) // 50ms delay
        }
      } catch (error) {
        console.error(`Failed to ${shouldSelectAll ? 'reconcile' : 'unreconcile'} transaction ${tx.transaction_id}:`, error)
        errorCount++
        // Continue with other transactions even if one fails
      }
    }
    
    clearLoading()
    
    if (errorCount === 0) {
      showToast(
        shouldSelectAll 
          ? `Successfully reconciled ${successCount} transaction(s)` 
          : `Successfully unreconciled ${successCount} transaction(s)`,
        'success',
        3000
      )
    } else {
      showToast(
        `${shouldSelectAll ? 'Reconciled' : 'Unreconciled'} ${successCount} transaction(s), ${errorCount} failed`,
        'warning',
        4000
      )
    }
  } catch (error) {
    clearLoading()
    showToast(`Failed to ${shouldSelectAll ? 'reconcile' : 'unreconcile'} transactions: ${error.message}`, 'error')
  }
}

// Return to history view
const returnToHistory = async () => {
  // Clear current session to show history
  const { useReconciliationStore } = await import('../stores/reconciliation')
  const store = useReconciliationStore()
  store.currentSession = null
  store.matches = []
  store.transactions = []
  
  // Reload history
  await loadHistory()
}

// Load reconciliation history
const loadHistory = async () => {
  try {
    historyLoading.value = true
    const { reconciliationAPI } = await import('../lib/http')
    const params = historyFilter.value === 'all' ? {} : { account_id: historyFilter.value }
    const response = await reconciliationAPI.getSessions(params)
    historySessions.value = response.data || []
  } catch (error) {
    console.error('Failed to load history:', error)
    showToast('Failed to load reconciliation history', 'error')
  } finally {
    historyLoading.value = false
  }
}

// Save draft (save current state without closing)
const saveDraft = async () => {
  if (!currentSession.value) return
  
  try {
    setLoading('Saving draft...')
    // Draft is automatically saved since matches are persisted immediately
    // We just need to reload history and return to history view
    await loadHistory()
    returnToHistory()
    clearLoading()
    showToast('Draft saved successfully', 'success', 2000)
  } catch (error) {
    clearLoading()
    showToast(`Failed to save draft: ${error.message}`, 'error')
  }
}

// View/Open a reconciliation session
const viewSession = async (sessionId) => {
  try {
    setLoading('Loading reconciliation session...')
    
    // Load the session
    const session = await loadSession(sessionId)
    
    // Set the selected account if not already set
    if (session && session.account_id) {
      const account = availableAccounts.value.find(a => a.account_id === session.account_id)
      if (account) {
        selectedAccount.value = account
      }
    }
    
    clearLoading()
    showToast('Reconciliation session loaded', 'success', 2000)
  } catch (error) {
    clearLoading()
    showToast(`Failed to load reconciliation session: ${error.message}`, 'error')
    console.error('Failed to view session:', error)
  }
}

// Delete a reconciliation session
const deleteHistorySession = async (sessionId) => {
  const session = historySessions.value.find(s => s.session_id === sessionId)
  const sessionName = session ? `${session.account_name} - ${formatDate(session.period_start)} to ${formatDate(session.period_end)}` : 'this reconciliation'
  
  if (!confirm(`Are you sure you want to delete ${sessionName}?\n\nThis will:\n- Delete the reconciliation session\n- Unreconcile all transactions that were only reconciled in this session\n\nThis action cannot be undone.`)) {
    return
  }

  try {
    setLoading('Deleting reconciliation session...')
    const result = await deleteSession(sessionId)
    clearLoading()
    
    // Remove from history list
    historySessions.value = historySessions.value.filter(s => s.session_id !== sessionId)
    
    showToast(
      `Reconciliation deleted successfully. ${result.transactions_unreconciled || 0} transaction(s) unreconciled.`,
      'success',
      5000
    )
  } catch (error) {
    clearLoading()
    showToast(`Failed to delete reconciliation: ${error.message}`, 'error')
  }
}

const closeSessionModal = () => {
  showSessionModal.value = false
  editingSession.value = null
  sessionForm.value = {
    period_start: '',
    period_end: '',
    start_balance: 0,
    closing_balance: 0,
    statement_name: ''
  }
  sessionError.value = null
}

const openEditSessionModal = (session) => {
  if (!session || session.closed) {
    showToast('Cannot edit closed reconciliation session', 'warning')
    return
  }
  
  editingSession.value = session
  sessionForm.value = {
    period_start: session.period_start || '',
    period_end: session.period_end || '',
    start_balance: session.start_balance || 0,
    closing_balance: session.closing_balance || 0
  }
  sessionError.value = null
  showSessionModal.value = true
}

const handleUpdateSession = async () => {
  if (!editingSession.value) return
  
  try {
    sessionError.value = null
    
    // Validate required fields
    if (!sessionForm.value.period_start || !sessionForm.value.period_end) {
      sessionError.value = 'Please fill in all required fields'
      showToast('Please fill in all required fields', 'warning')
      return
    }
    
    // Validate balances
    const startBalanceNum = parseFloat(sessionForm.value.start_balance)
    const closingBalanceNum = parseFloat(sessionForm.value.closing_balance)
    
    if (isNaN(startBalanceNum) || isNaN(closingBalanceNum)) {
      sessionError.value = 'Balances must be valid numbers'
      showToast('Balances must be valid numbers', 'warning')
      return
    }
    
    // Validate dates
    if (new Date(sessionForm.value.period_start) >= new Date(sessionForm.value.period_end)) {
      sessionError.value = 'Period start date must be before period end date'
      showToast('Period start date must be before period end date', 'warning')
      return
    }
    
    setLoading('Updating reconciliation session...')
    
    const updateData = {
      period_start: sessionForm.value.period_start,
      period_end: sessionForm.value.period_end,
      start_balance: startBalanceNum,
      closing_balance: closingBalanceNum
    }
    
    await updateSession(editingSession.value.session_id, updateData)
    
    clearLoading()
    closeSessionModal()
    
    showToast('Session updated successfully', 'success', 2000)
    
    // Reload session if it's the current one
    if (currentSession.value && currentSession.value.session_id === editingSession.value.session_id) {
      await loadSession(editingSession.value.session_id)
    }
    
    // Reload history to show updated session
    await loadHistory()
  } catch (error) {
    clearLoading()
    const errorData = error?.data || error?.response?.data || error?.originalError?.response?.data
    const errorMessage = errorData?.error || error.message || 'Failed to update session'
    sessionError.value = errorMessage
    showToast(errorMessage, 'error')
  }
}

// Methods
const onAccountChange = async () => {
  if (selectedAccount.value) {
    showToast(`Switched to ${selectedAccount.value.account_name}`, 'info', 2000)
    // Update history filter to match selected account
    historyFilter.value = selectedAccount.value.account_id
    await loadHistory()
  } else {
    historyFilter.value = 'all'
    await loadHistory()
  }
}

const handleStartSession = async () => {
  try {
    if (!selectedAccount.value) {
      sessionError.value = 'Please select an account first'
      showToast('Please select an account first', 'warning')
      return
    }
    
    // Validate required fields - allow zero values for balances
    if (!sessionForm.value.period_start || !sessionForm.value.period_end) {
      sessionError.value = 'Please fill in all required fields'
      showToast('Please fill in all required fields', 'warning')
      return
    }
    
    // Check if balances are provided (allow zero, but not undefined/null/empty string)
    if (sessionForm.value.start_balance === undefined || 
        sessionForm.value.start_balance === null || 
        sessionForm.value.start_balance === '') {
      sessionError.value = 'Start balance is required'
      showToast('Start balance is required', 'warning')
      return
    }
    
    if (sessionForm.value.closing_balance === undefined || 
        sessionForm.value.closing_balance === null || 
        sessionForm.value.closing_balance === '') {
      sessionError.value = 'Closing balance is required'
      showToast('Closing balance is required', 'warning')
      return
    }
    
    // Validate that balances are valid numbers (including zero)
    const startBalanceNum = parseFloat(sessionForm.value.start_balance)
    const closingBalanceNum = parseFloat(sessionForm.value.closing_balance)
    
    if (isNaN(startBalanceNum)) {
      sessionError.value = 'Start balance must be a valid number'
      showToast('Start balance must be a valid number', 'warning')
      return
    }
    
    if (isNaN(closingBalanceNum)) {
      sessionError.value = 'Closing balance must be a valid number'
      showToast('Closing balance must be a valid number', 'warning')
      return
    }
    
    setLoading('Creating reconciliation session...')
    
    const sessionData = {
      account_id: selectedAccount.value.account_id,
      period_start: sessionForm.value.period_start,
      period_end: sessionForm.value.period_end,
      start_balance: startBalanceNum,
      closing_balance: closingBalanceNum,
      statement_name: sessionForm.value.statement_name || undefined
    }
    
    const session = await startNewSession(sessionData)
    
    clearLoading()
    closeSessionModal()
    
    const txCount = transactions.value?.length || 0
    showToast(
      `✓ Session created! Found ${txCount} transactions to reconcile`, 
      'success', 
      6000
    )
    
  } catch (error) {
    console.error('❌ Failed to start session:', error)
    clearLoading()
    sessionError.value = error.message
    showToast(`Failed to create session: ${error.message}`, 'error')
  }
}

const handleCloseSession = async () => {
  if (!confirm('Are you sure you want to complete this reconciliation? This will mark all reconciled transactions as finalized.')) {
    return
  }

  try {
    setLoading('Completing reconciliation...')
    await closeSession()
    clearLoading()
    showToast('✓ Reconciliation completed successfully', 'success', 4000)
    
    // Return to history view after completing
    await returnToHistory()
  } catch (error) {
    clearLoading()
    showToast(`Failed to complete reconciliation: ${error.message}`, 'error')
  }
}

// Load accounts on mount
onMounted(async () => {
  try {
    // Clear any active session when navigating to reconciliation page
    // This ensures we always show history first
    const { useReconciliationStore } = await import('../stores/reconciliation')
    const store = useReconciliationStore()
    if (store.currentSession) {
      store.currentSession = null
      store.matches = []
      store.transactions = []
    }
    
    const { useAccountStore } = await import('../stores/account')
    const accountStore = useAccountStore()
    
    if (accountStore.accounts.length === 0) {
      await accountStore.fetchAccounts()
    }
    
    availableAccounts.value = accountStore.accounts
    
    // Load reconciliation history
    await loadHistory()
  } catch (error) {
    console.error('❌ Failed to load accounts:', error)
  }
})

// View transaction details
const viewTransactionDetails = async (transactionId) => {
  try {
    showTransactionModal.value = true
    transactionDetailsLoading.value = true
    transactionDetailsError.value = null
    selectedTransactionDetails.value = null

    const { reconciliationAPI } = await import('../lib/http')
    const response = await reconciliationAPI.getTransactionDetails(transactionId)
    selectedTransactionDetails.value = response.data
  } catch (error) {
    console.error('Failed to load transaction details:', error)
    transactionDetailsError.value = error.response?.data?.error || error.message || 'Failed to load transaction details'
  } finally {
    transactionDetailsLoading.value = false
  }
}

const closeTransactionModal = () => {
  showTransactionModal.value = false
  selectedTransactionDetails.value = null
  transactionDetailsError.value = null
}
</script>

<style scoped>
.reconciliation-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
  flex-wrap: wrap;
  gap: 15px;
}

.dark .header {
  border-bottom-color: #374151;
}

.header-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title-section h1 {
  margin: 0;
  color: #333;
}

.dark .header-title-section h1 {
  color: #f3f4f6;
}

.info-icon-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
  color: #666;
}

.info-icon-btn:hover {
  background-color: #f0f0f0;
}

.dark .info-icon-btn {
  color: #9ca3af;
}

.dark .info-icon-btn:hover {
  background-color: #374151;
}

.header-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.account-selector {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
  color: #333;
}

.dark .account-selector {
  background-color: #374151;
  border-color: #4b5563;
  color: #f3f4f6;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background-color: #1e7e34;
}

.btn-warning {
  background-color: #ffc107;
  color: #212529;
}

.btn-warning:hover:not(:disabled) {
  background-color: #e0a800;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #545b62;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

/* Toast Notifications */
.toast-container {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 400px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  background: white;
  border-left: 4px solid;
  animation: slideIn 0.3s ease-out;
}

.dark .toast {
  background: #1f2937;
}

.toast-success { border-color: #10b981; }
.toast-error { border-color: #ef4444; }
.toast-warning { border-color: #f59e0b; }
.toast-info { border-color: #3b82f6; }

.toast-icon {
  font-size: 20px;
  font-weight: bold;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.dark .toast-message {
  color: #f3f4f6;
}

.toast-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Loading Overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
}

.loading-card {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  min-width: 300px;
}

.dark .loading-card {
  background: #1f2937;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-message {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.dark .loading-message {
  color: #f3f4f6;
}

/* Help Section */
.help-section {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 30px;
  margin-bottom: 30px;
  color: white;
}

.help-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 25px;
}

.help-icon {
  font-size: 32px;
}

.help-header h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: white;
}

.help-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.help-step {
  display: flex;
  gap: 15px;
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 8px;
}

.step-number {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  background: white;
  color: #667eea;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
}

.step-content strong {
  display: block;
  margin-bottom: 8px;
  font-size: 16px;
}

.step-content p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

/* Error Message */
.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #721c24;
}

/* Session Summary */
.session-summary {
  margin-bottom: 20px;
}

.summary-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  position: relative;
}

.dark .summary-card {
  background: #1f2937;
  border-color: #374151;
}

.summary-card.status-balanced {
  border-left: 4px solid #28a745;
}

.summary-card.status-unbalanced {
  border-left: 4px solid #dc3545;
}

.summary-card.status-pending {
  border-left: 4px solid #6c757d;
}

/* Status Banner */
.status-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-weight: 600;
  font-size: 16px;
}

.status-banner.status-balanced {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.dark .status-banner.status-balanced {
  background-color: #1e4620;
  color: #d4edda;
  border-color: #28a745;
}

.status-banner.status-unbalanced {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.dark .status-banner.status-unbalanced {
  background-color: #4a1e1e;
  color: #f8d7da;
  border-color: #dc3545;
}

.status-banner.status-pending {
  background-color: #e2e3e5;
  color: #383d41;
  border: 1px solid #d6d8db;
}

.status-icon {
  font-size: 24px;
  font-weight: bold;
}

.status-text {
  flex: 1;
}

.summary-card h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.dark .summary-card h3 {
  color: #f3f4f6;
}

/* Balance Calculation */
.balance-calculation {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.dark .balance-calculation {
  background: #374151;
  border-color: #4b5563;
}

.calculation-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.dark .calculation-row {
  border-bottom-color: #4b5563;
}

.calculation-row:last-child {
  border-bottom: none;
}

.calculation-row.calculation-total {
  font-weight: bold;
  font-size: 16px;
  padding-top: 12px;
  margin-top: 8px;
  border-top: 2px solid #333;
}

.dark .calculation-row.calculation-total {
  border-top-color: #6b7280;
}

.calculation-row.calculation-target {
  font-weight: 600;
  color: #666;
}

.dark .calculation-row.calculation-target {
  color: #9ca3af;
}

.calculation-row.calculation-variance {
  font-weight: bold;
  font-size: 18px;
  padding-top: 12px;
  margin-top: 8px;
  border-top: 2px solid #333;
}

.dark .calculation-row.calculation-variance {
  border-top-color: #6b7280;
}

.calculation-row.calculation-variance.balanced {
  color: #28a745;
}

.calculation-row.calculation-variance.close {
  color: #ffc107;
}

.calculation-row.calculation-variance.unbalanced {
  color: #dc3545;
}

.calculation-label {
  color: #666;
  font-size: 14px;
}

.dark .calculation-label {
  color: #9ca3af;
}

.calculation-value {
  font-weight: 600;
  font-size: 16px;
  color: #333;
}

.dark .calculation-value {
  color: #f3f4f6;
}

.calculation-note {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

.dark .calculation-note {
  color: #6b7280;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat .label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
}

.dark .stat .label {
  color: #9ca3af;
}

.stat .value {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.dark .stat .value {
  color: #f3f4f6;
}

.stat .value.highlighted {
  color: #007bff;
  font-size: 20px;
}

.dark .stat .value.highlighted {
  color: #60a5fa;
}

.stat .value.balanced {
  color: #28a745;
}

.stat .value.close {
  color: #ffc107;
}

.stat .value.unbalanced {
  color: #dc3545;
}

/* Reconciliation History */
.reconciliation-history {
  margin-top: 30px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.history-header h2 {
  margin: 0;
  color: #333;
  font-size: 24px;
}

.dark .history-header h2 {
  color: #f3f4f6;
}

.history-filters {
  display: flex;
  gap: 10px;
  align-items: center;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  cursor: pointer;
}

.dark .filter-select {
  background: #374151;
  border-color: #4b5563;
  color: #f3f4f6;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;
}

.dark .loading-state {
  color: #9ca3af;
}

.loading-spinner-small {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 15px;
}

.dark .loading-spinner-small {
  border-color: #4b5563;
  border-top-color: #60a5fa;
}

.empty-history {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.dark .empty-history {
  color: #9ca3af;
}

.empty-history .empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 20px;
}

.empty-history h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.dark .empty-history h3 {
  color: #f3f4f6;
}

.empty-history p {
  margin: 5px 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.history-item {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dark .history-item {
  background: #374151;
  border-color: #4b5563;
}

.history-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.dark .history-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.history-item-active {
  border-left: 4px solid #3b82f6;
}

.history-item-closed {
  border-left: 4px solid #6b7280;
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 10px;
}

.history-item-title {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.history-item-title strong {
  font-size: 18px;
  color: #333;
}

.dark .history-item-title strong {
  color: #f3f4f6;
}

.history-item-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.status-active {
  background-color: #dbeafe;
  color: #1e40af;
}

.dark .status-active {
  background-color: #1e3a8a;
  color: #dbeafe;
}

.status-closed {
  background-color: #e5e7eb;
  color: #374151;
}

.dark .status-closed {
  background-color: #4b5563;
  color: #e5e7eb;
}

.history-item-date {
  font-size: 14px;
  color: #666;
}

.dark .history-item-date {
  color: #9ca3af;
}

.history-item-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.history-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  font-weight: 600;
}

.dark .detail-label {
  color: #9ca3af;
}

.detail-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.dark .detail-value {
  color: #f3f4f6;
}

.detail-value.balanced {
  color: #28a745;
}

.detail-value.close {
  color: #ffc107;
}

.detail-value.unbalanced {
  color: #dc3545;
}

.history-item-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.dark .history-item-actions {
  border-top-color: #4b5563;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 14px;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
  border: none;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c82333;
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Transactions Section */
.transactions-section {
  margin-top: 20px;
}

.transactions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 15px;
}

.transactions-header h3 {
  margin: 0;
}

.transactions-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  user-select: none;
}

.dark .select-all-label {
  color: #f3f4f6;
}

.select-all-label input[type="checkbox"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.select-all-label:has(input:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Help Modal */
.help-modal {
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.dark .modal-header {
  border-bottom-color: #4b5563;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.dark .modal-header h3 {
  color: #f3f4f6;
}

.modal-close {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.modal-close:hover {
  background-color: #f0f0f0;
}

.dark .modal-close {
  color: #9ca3af;
}

.dark .modal-close:hover {
  background-color: #374151;
}

.modal-content {
  padding: 20px;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
}

.dark .modal-footer {
  border-top-color: #4b5563;
}

.help-step {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.dark .help-step {
  background: #374151;
}

.help-step:last-child {
  margin-bottom: 0;
}

.step-number {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  background: #007bff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
}

.step-content strong {
  display: block;
  margin-bottom: 8px;
  font-size: 16px;
  color: #333;
}

.dark .step-content strong {
  color: #f3f4f6;
}

.step-content p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #666;
}

.dark .step-content p {
  color: #9ca3af;
}

.transactions-section h3 {
  margin: 0 0 15px 0;
  color: #333;
}

.dark .transactions-section h3 {
  color: #f3f4f6;
}

.transactions-list {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  overflow: hidden;
  background-color: white;
}

.dark .transactions-list {
  border-color: #374151;
  background-color: #1f2937;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #6b7280;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.transaction-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  transition: background-color 0.2s;
}

.dark .transaction-item {
  border-bottom-color: #374151;
}

.transaction-item:hover {
  background-color: #f8f9fa;
}

.dark .transaction-item:hover {
  background-color: #374151;
}

.transaction-item.reconciled {
  background-color: #d4edda;
  opacity: 0.8;
}

.dark .transaction-item.reconciled {
  background-color: #1e4620;
}

.transaction-item.reconciled-other-session {
  background-color: #fff3cd;
  border-left: 4px solid #ffc107;
  opacity: 0.9;
}

.dark .transaction-item.reconciled-other-session {
  background-color: #3d2e00;
  border-left-color: #ffc107;
}

.transaction-item.reconciled-other-session .reconcile-checkbox {
  cursor: not-allowed;
  opacity: 0.5;
}

.other-session-warning {
  padding: 2px 8px;
  background: #ffc107;
  color: #856404;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  margin-left: 8px;
  cursor: help;
}

.dark .other-session-warning {
  background: #856404;
  color: #ffc107;
}

.reconcile-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.transaction-details {
  flex: 1;
}

.transaction-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.transaction-header strong {
  font-size: 14px;
  color: #333;
}

.dark .transaction-header strong {
  color: #f3f4f6;
}

.amount {
  font-weight: bold;
  font-size: 16px;
}

.amount.positive {
  color: #28a745;
}

.amount.negative {
  color: #dc3545;
}

.transaction-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
}

.dark .transaction-meta {
  color: #9ca3af;
}

.category {
  padding: 2px 8px;
  background: #e5e7eb;
  border-radius: 4px;
}

.dark .category {
  background: #374151;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 30px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.dark .modal {
  background: #1f2937;
  color: #f3f4f6;
}

.modal h3 {
  margin: 0 0 20px 0;
  color: #333;
}

.dark .modal h3 {
  color: #f3f4f6;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #333;
}

.dark .form-group label {
  color: #f3f4f6;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
  color: #333;
}

.form-help-text {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}

.dark .form-help-text {
  color: #9ca3af;
}

.dark .form-group input {
  background-color: #374151;
  border-color: #4b5563;
  color: #f3f4f6;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

/* Transaction Details Modal */
.transaction-details-modal {
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 15px;
  border-bottom: 2px solid #e0e0e0;
  margin-bottom: 20px;
}

.dark .modal-header {
  border-bottom-color: #374151;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.dark .modal-header h3 {
  color: #f3f4f6;
}

.btn-close-modal {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.btn-close-modal:hover {
  background-color: #f0f0f0;
}

.dark .btn-close-modal {
  color: #9ca3af;
}

.dark .btn-close-modal:hover {
  background-color: #374151;
}

.modal-body {
  padding: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 20px;
  border-top: 2px solid #e0e0e0;
  margin-top: 20px;
}

.dark .modal-footer {
  border-top-color: #374151;
}

.transaction-details-content {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.details-section {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  background-color: #f9fafb;
}

.dark .details-section {
  background-color: #1f2937;
  border-color: #374151;
}

.details-section h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.dark .details-section h4 {
  color: #f3f4f6;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dark .detail-item label {
  color: #9ca3af;
}

.detail-item span {
  font-size: 14px;
  color: #333;
  word-break: break-word;
}

.dark .detail-item span {
  color: #f3f4f6;
}

.detail-item .monospace {
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.detail-item .monospace.small {
  font-size: 11px;
  color: #6b7280;
}

.dark .detail-item .monospace.small {
  color: #9ca3af;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item .positive {
  color: #10b981;
  font-weight: 600;
}

.detail-item .negative {
  color: #ef4444;
  font-weight: 600;
}

.detail-item .error-text {
  color: #ef4444;
}

.dark .detail-item .error-text {
  color: #f87171;
}

.matches-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.match-item {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 15px;
  background-color: white;
}

.dark .match-item {
  background-color: #111827;
  border-color: #374151;
}

.match-item.inactive {
  opacity: 0.6;
}

.match-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e0e0e0;
}

.dark .match-header {
  border-bottom-color: #374151;
}

.match-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.match-status.active {
  background-color: #d1fae5;
  color: #065f46;
}

.dark .match-status.active {
  background-color: #064e3b;
  color: #6ee7b7;
}

.match-status.inactive {
  background-color: #f3f4f6;
  color: #6b7280;
}

.dark .match-status.inactive {
  background-color: #374151;
  color: #9ca3af;
}

.match-date {
  font-size: 12px;
  color: #6b7280;
}

.dark .match-date {
  color: #9ca3af;
}

.match-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.match-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 15px;
}

.match-detail-row label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  min-width: 120px;
}

.dark .match-detail-row label {
  color: #9ca3af;
}

.match-detail-row span {
  font-size: 13px;
  color: #333;
  text-align: right;
  flex: 1;
}

.dark .match-detail-row span {
  color: #f3f4f6;
}

.loading-state,
.error-state {
  padding: 40px;
  text-align: center;
  color: #6b7280;
}

.dark .loading-state,
.dark .error-state {
  color: #9ca3af;
}

.error-state {
  color: #ef4444;
}

.dark .error-state {
  color: #f87171;
}
</style>
