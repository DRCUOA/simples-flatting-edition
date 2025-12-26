// client/src/stores/reconciliation.js

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { reconciliationAPI } from '../lib/http'
import { getCurrentTimestamp } from '../utils/dateUtils'

export const useReconciliationStore = defineStore('reconciliation', () => {
  // State
  const sessions = ref([])
  const currentSession = ref(null)
  const matches = ref([])
  const transactions = ref([]) // All transactions for current session
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const sessionSummary = computed(() => {
    if (!currentSession.value) return null
    
    const reconciledCount = matches.value.length
    const totalTransactions = transactions.value.length
    const unreconciledCount = totalTransactions - reconciledCount
    
    // Optimize: Create Map for O(1) lookups instead of O(n) find() operations
    // This reduces complexity from O(n*m) to O(n+m)
    const transactionMap = new Map(
      transactions.value.map(tx => [tx.transaction_id, tx])
    )
    
    // Calculate sum of reconciled transaction amounts
    const reconciledAmount = matches.value.reduce((sum, match) => {
      const tx = transactionMap.get(match.transaction_id)
      return sum + (tx?.signed_amount || 0)
    }, 0)
    
    // Calculate expected balance: start_balance + reconciled_amount
    const startBalance = currentSession.value.start_balance || 0
    const calculatedBalance = startBalance + reconciledAmount
    const closingBalance = currentSession.value.closing_balance || 0
    const variance = calculatedBalance - closingBalance
    const isBalanced = Math.abs(variance) < 0.01
    
    return {
      total_matches: reconciledCount,
      reconciled_transactions: reconciledCount,
      unreconciled_transactions: unreconciledCount,
      total_transactions: totalTransactions,
      reconciled_amount: reconciledAmount,
      start_balance: startBalance,
      calculated_balance: calculatedBalance,
      closing_balance: closingBalance,
      variance: variance,
      is_balanced: isBalanced
    }
  })

  const variance = computed(() => {
    return sessionSummary.value?.variance || 0
  })

  const isSessionActive = computed(() => {
    return currentSession.value && !currentSession.value.closed
  })

  // Actions
  const createSession = async (sessionData) => {
    try {
      loading.value = true
      error.value = null
      
      const response = await reconciliationAPI.createSession(sessionData)
      
      // Backend now returns full session data with transactions
      currentSession.value = response.data.session
      matches.value = response.data.matches || []
      transactions.value = response.data.transactions || []
      
      // Add to sessions list
      if (currentSession.value) {
        sessions.value.unshift(currentSession.value)
      }
      
      return currentSession.value
    } catch (err) {
      error.value = err?.data?.error || err?.response?.data?.error || err?.message || 'Failed to create session'
      throw err
    } finally {
      loading.value = false
    }
  }

  const loadSession = async (sessionId) => {
    try {
      loading.value = true
      error.value = null
      
      const response = await reconciliationAPI.getSession(sessionId)
      const sessionData = response.data
      
      currentSession.value = sessionData.session
      matches.value = sessionData.matches || []
      transactions.value = sessionData.transactions || []
      
      return sessionData
    } catch (err) {
      error.value = err?.data?.error || err?.response?.data?.error || err?.message || 'Failed to load session'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateSession = async (sessionId, updateData) => {
    try {
      loading.value = true
      error.value = null
      
      const response = await reconciliationAPI.updateSession(sessionId, updateData)
      
      // Update current session if it's the one being updated
      if (currentSession.value && currentSession.value.session_id === sessionId) {
        currentSession.value = response.data.session
        
        // Reload transactions if period dates changed
        if (updateData.period_start || updateData.period_end) {
          const sessionData = await reconciliationAPI.getSession(sessionId)
          transactions.value = sessionData.data.transactions || []
        }
      }
      
      // Update in sessions list
      const sessionIndex = sessions.value.findIndex(s => s.session_id === sessionId)
      if (sessionIndex !== -1) {
        sessions.value[sessionIndex] = response.data.session
      }
      
      return response.data.session
    } catch (err) {
      error.value = err?.data?.error || err?.response?.data?.error || err?.message || 'Failed to update session'
      throw err
    } finally {
      loading.value = false
    }
  }

  const loadSessions = async (accountId = null) => {
    try {
      loading.value = true
      error.value = null
      
      const params = accountId ? { account_id: accountId } : {}
      const response = await reconciliationAPI.getSessions(params)
      
      sessions.value = response.data
      return response.data
    } catch (err) {
      error.value = err?.data?.error || err?.response?.data?.error || err?.message || 'Failed to load sessions'
      throw err
    } finally {
      loading.value = false
    }
  }

  const runAutoMatch = async () => {
    // Simplified reconciliation doesn't use auto-matching
    // Users manually reconcile transactions
    throw new Error('Auto-matching is not available in simplified reconciliation mode')
  }

  const createManualMatch = async (transactionId, skipLoading = false) => {
    if (!currentSession.value) {
      throw new Error('No active session')
    }

    try {
      if (!skipLoading) {
        loading.value = true
      }
      error.value = null
      
      // Optimistically add match to local state immediately
      const transaction = transactions.value.find(t => t.transaction_id === transactionId)
      if (transaction) {
        const optimisticMatch = {
          match_id: `temp-${Date.now()}-${Math.random()}`, // More unique temporary ID
          session_id: currentSession.value.session_id,
          user_id: currentSession.value.user_id,
          account_id: currentSession.value.account_id,
          transaction_id: transactionId,
          statement_line_id: null,
          confidence: 100,
          rule: 'manual',
          matched_by: 'manual',
          active: 1,
          matched_at: getCurrentTimestamp(),
          // Include transaction details for display
          tx_description: transaction.description,
          tx_signed_amount: transaction.signed_amount,
          transaction_date: transaction.transaction_date
        }
        matches.value.push(optimisticMatch)
      }
      
      // Create match via API (simplified: no statement_line_id needed)
      const response = await reconciliationAPI.createMatch({
        session_id: currentSession.value.session_id,
        transaction_id: transactionId
      })
      
      // Replace optimistic match with real match from server
      if (response.data.match_id) {
        const optimisticIndex = matches.value.findIndex(m => 
          m.match_id?.toString().startsWith('temp-') && m.transaction_id === transactionId
        )
        if (optimisticIndex !== -1) {
          matches.value[optimisticIndex] = {
            ...matches.value[optimisticIndex],
            match_id: response.data.match_id
          }
        }
      } else {
        // If no match_id returned, remove optimistic match and reload from server
        matches.value = matches.value.filter(m => 
          !(m.match_id?.toString().startsWith('temp-') && m.transaction_id === transactionId)
        )
        await loadSession(currentSession.value.session_id)
      }
      
      return response.data
    } catch (err) {
      // Rollback optimistic update on error
      matches.value = matches.value.filter(m => 
        !(m.match_id?.toString().startsWith('temp-') && m.transaction_id === transactionId)
      )
      error.value = err?.data?.error || err?.response?.data?.error || err?.message || 'Failed to create manual match'
      throw err
    } finally {
      if (!skipLoading) {
        loading.value = false
      }
    }
  }

  const deleteMatch = async (matchId) => {
    try {
      loading.value = true
      error.value = null
      
      // Optimistically remove match from local state immediately
      const matchToDelete = matches.value.find(m => m.match_id === matchId)
      matches.value = matches.value.filter(m => m.match_id !== matchId)
      
      try {
        await reconciliationAPI.deleteMatch(matchId)
      } catch (err) {
        // Rollback optimistic update on error
        if (matchToDelete) {
          matches.value.push(matchToDelete)
        }
        throw err
      }
    } catch (err) {
      error.value = err?.data?.error || err?.response?.data?.error || err?.message || 'Failed to delete match'
      throw err
    } finally {
      loading.value = false
    }
  }

  const closeSession = async () => {
    if (!currentSession.value) {
      throw new Error('No active session')
    }

    try {
      loading.value = true
      error.value = null
      
      const response = await reconciliationAPI.closeSession(
        currentSession.value.session_id
      )
      
      // Update current session
      currentSession.value = response.data.final_summary
      
      return response.data
    } catch (err) {
      error.value = err?.data?.error || err?.response?.data?.error || err?.message || 'Failed to close session'
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteSession = async (sessionId) => {
    try {
      loading.value = true
      error.value = null
      
      const response = await reconciliationAPI.deleteSession(sessionId)
      
      // Remove from sessions list
      sessions.value = sessions.value.filter(s => s.session_id !== sessionId)
      
      // If this was the current session, clear it
      if (currentSession.value && currentSession.value.session_id === sessionId) {
        currentSession.value = null
        matches.value = []
        transactions.value = []
      }
      
      return response.data
    } catch (err) {
      error.value = err?.data?.error || err?.response?.data?.error || err?.message || 'Failed to delete session'
      throw err
    } finally {
      loading.value = false
    }
  }

  const loadSessionTransactions = async (sessionId) => {
    try {
      loading.value = true
      error.value = null
      
      const response = await reconciliationAPI.getSessionTransactions(sessionId)
      transactions.value = response.data.transactions || []
      
      return transactions.value
    } catch (err) {
      error.value = err?.data?.error || err?.response?.data?.error || err?.message || 'Failed to load session transactions'
      throw err
    } finally {
      loading.value = false
    }
  }

  const loadUnmatchedItems = async (accountId, options = {}) => {
    try {
      loading.value = true
      error.value = null
      
      // Build params for unmatched transactions
      const txParams = {
        account_id: accountId,
        include_transfers: options.includeTransfers !== false ? 'true' : 'false',
        include_non_posted: options.includeNonPosted === true ? 'true' : 'false'
      }
      
      // If there's an active session, filter by session date range and exclude session transactions
      if (currentSession.value) {
        txParams.date_from = currentSession.value.period_start
        txParams.date_to = currentSession.value.period_end
        txParams.session_id = currentSession.value.session_id
      }
      
      const txResponse = await reconciliationAPI.getUnmatchedTransactions(txParams)
      
      // For simplified reconciliation, we just return transactions
      // (no statement lines needed)
      return {
        transactions: txResponse.data
      }
    } catch (err) {
      error.value = err?.data?.error || err?.response?.data?.error || err?.message || 'Failed to load unmatched items'
      throw err
    } finally {
      loading.value = false
    }
  }

  const getSessionSummary = async (sessionId) => {
    try {
      const response = await reconciliationAPI.getSessionSummary(sessionId)
      return response.data
    } catch (err) {
      error.value = err?.data?.error || err?.response?.data?.error || err?.message || 'Failed to get session summary'
      throw err
    }
  }

  // Utility functions
  const clearError = () => {
    error.value = null
  }

  const reset = () => {
    sessions.value = []
    currentSession.value = null
    matches.value = []
    transactions.value = []
    loading.value = false
    error.value = null
  }

  return {
    // State
    sessions,
    currentSession,
    matches,
    transactions,
    loading,
    error,
    
    // Getters
    sessionSummary,
    variance,
    isSessionActive,
    
    // Actions
    createSession,
    loadSession,
    updateSession,
    loadSessions,
    runAutoMatch,
    createManualMatch,
    deleteMatch,
    closeSession,
    deleteSession,
    loadSessionTransactions,
    loadUnmatchedItems,
    getSessionSummary,
    clearError,
    reset
  }
})
