// client/src/composables/useReconciliation.js

import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useReconciliationStore } from '../stores/reconciliation'
import { normalizeAppDateClient } from '../utils/dateUtils'

export function useReconciliation() {
  const store = useReconciliationStore()
  
  // Extract reactive refs from store using storeToRefs
  const {
    currentSession,
    sessions,
    matches,
    transactions,
    loading,
    error,
    sessionSummary,
    variance,
    isSessionActive
  } = storeToRefs(store)
  
  // Local state for UI interactions
  const selectedTransaction = ref(null)
  const showSessionModal = ref(false)
  const selectedAccount = ref(null)
  const availableAccounts = ref([])

  // Computed properties
  const reconciledTransactionIds = computed(() => {
    return new Set(store.matches.map(m => m.transaction_id))
  })

  const reconciledInOtherSessionIds = computed(() => {
    return new Set(
      store.transactions
        .filter(tx => tx.is_reconciled_in_other_session === 1)
        .map(tx => tx.transaction_id)
    )
  })

  const getOtherSessionInfo = (transactionId) => {
    const tx = store.transactions.find(t => t.transaction_id === transactionId)
    if (tx && tx.is_reconciled_in_other_session === 1) {
      return {
        sessionId: tx.other_session_id,
        periodStart: tx.other_session_period_start,
        periodEnd: tx.other_session_period_end,
        closed: tx.other_session_closed
      }
    }
    return null
  }

  const unreconciledTransactions = computed(() => {
    return store.transactions.filter(tx => 
      !reconciledTransactionIds.value.has(tx.transaction_id)
    )
  })

  const varianceStatus = computed(() => {
    const variance = store.variance
    const absVariance = Math.abs(variance)
    
    if (absVariance < 0.01) {
      return { status: 'balanced', color: 'green', message: 'Perfectly balanced' }
    } else if (absVariance < 1.00) {
      return { status: 'close', color: 'yellow', message: `Variance: $${variance.toFixed(2)}` }
    } else {
      return { status: 'unbalanced', color: 'red', message: `Large variance: $${variance.toFixed(2)}` }
    }
  })

  // Actions
  const selectTransaction = (transaction) => {
    selectedTransaction.value = transaction
  }

  const clearSelection = () => {
    selectedTransaction.value = null
  }

  const createMatch = async () => {
    if (!selectedTransaction.value) return

    try {
      await store.createManualMatch(selectedTransaction.value.transaction_id)
      clearSelection()
    } catch (error) {
      console.error('Failed to create match:', error)
      throw error
    }
  }

  const startNewSession = async (sessionData) => {
    try {
      const session = await store.createSession(sessionData)
      // Transactions are already loaded in createSession
      return session
    } catch (error) {
      console.error('Failed to start session:', error)
      throw error
    }
  }

  const runAutoMatch = async () => {
    // Simplified reconciliation doesn't support auto-matching
    throw new Error('Auto-matching is not available. Please reconcile transactions manually.')
  }

  const loadUnmatchedItems = async () => {
    if (!selectedAccount.value) return

    try {
      await store.loadUnmatchedItems(selectedAccount.value.account_id)
    } catch (error) {
      console.error('Failed to load unmatched items:', error)
      throw error
    }
  }

  const loadAccountSessions = async (accountId) => {
    try {
      await store.loadSessions(accountId)
    } catch (error) {
      console.error('Failed to load sessions:', error)
      throw error
    }
  }

  const loadSession = async (sessionId) => {
    try {
      return await store.loadSession(sessionId)
    } catch (error) {
      console.error('Failed to load session:', error)
      throw error
    }
  }

  const updateSession = async (sessionId, updateData) => {
    try {
      return await store.updateSession(sessionId, updateData)
    } catch (error) {
      console.error('Failed to update session:', error)
      throw error
    }
  }

  const closeSession = async () => {
    try {
      await store.closeSession()
    } catch (error) {
      console.error('Failed to close session:', error)
      throw error
    }
  }

  const deleteSession = async (sessionId) => {
    try {
      return await store.deleteSession(sessionId)
    } catch (error) {
      console.error('Failed to delete session:', error)
      throw error
    }
  }

  const deleteMatch = async (matchId) => {
    try {
      await store.deleteMatch(matchId)
      // Reload session to update variance
      if (currentSession.value) {
        await store.loadSession(currentSession.value.session_id)
      }
    } catch (error) {
      console.error('Failed to delete match:', error)
      throw error
    }
  }

  const clearError = () => {
    store.error = null
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return normalizeAppDateClient(dateString, 'domain-to-display') || '—';
  }

  // Watch for account changes
  watch(selectedAccount, (newAccount) => {
    if (newAccount) {
      loadAccountSessions(newAccount.account_id)
      loadUnmatchedItems()
    }
  })

  return {
    // Store state (from storeToRefs - maintains reactivity)
    currentSession,
    sessions,
    matches,
    transactions,
    loading,
    error,
    sessionSummary,
    variance,
    isSessionActive,
    
    // Local state
    selectedTransaction,
    showSessionModal,
    selectedAccount,
    availableAccounts,
    
    // Computed
    reconciledTransactionIds,
    reconciledInOtherSessionIds,
    getOtherSessionInfo,
    unreconciledTransactions,
    varianceStatus,
    
    // Actions
    selectTransaction,
    clearSelection,
    createMatch,
    startNewSession,
    runAutoMatch,
    loadUnmatchedItems,
    loadAccountSessions,
    loadSession,
    updateSession,
    closeSession,
    deleteSession,
    deleteMatch,
    clearError,
    
    // Utilities
    formatAmount,
    formatDate
  }
}
