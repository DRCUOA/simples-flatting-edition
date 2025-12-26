import { ref, computed } from 'vue';
import { useCategoryStore } from '../stores/category';
import { useTransactionStore } from '../stores/transaction';
import axios from 'axios';

// Prefer VITE_API_BASE_URL (new standard), fall back to VITE_API_URL (backward compatibility)
const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3050/api';

export function useCategorySuggestions() {
  const categoryStore = useCategoryStore();
  const transactionStore = useTransactionStore();

  // State
  const keywordRules = ref({});
  const categoryHistory = ref({});
  const confidenceThreshold = ref(0.7);
  const suggestionFeedback = ref({});
  const apiSuggestionsCache = ref({}); // Cache for API-based suggestions

  // Fetch category suggestions from backend API
  const fetchCategorySuggestions = async (description, amount = 0) => {
    if (!description || !description.trim()) {
      return [];
    }

    // Check cache first
    const cacheKey = `${description.toLowerCase().trim()}_${amount}`;
    if (apiSuggestionsCache.value[cacheKey]) {
      return apiSuggestionsCache.value[cacheKey];
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/transactions/suggestions/category`, {
        params: { description, amount },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const suggestions = (response.data.suggestions || []).map(s => ({
        category: {
          category_id: s.category_id,
          category_name: s.category_name
        },
        confidence: s.confidence || 0.5,
        source: 'history',
        match_count: s.match_count
      }));

      // Cache the result
      apiSuggestionsCache.value[cacheKey] = suggestions;
      return suggestions;
    } catch (error) {
      console.error('Failed to fetch category suggestions:', error);
      return [];
    }
  };

  // Methods
  const getCategoryByIdLocal = (id) => {
    if (!id) return null;
    return categoryStore.categories.find(c => String(c.category_id) === String(id)) || null;
  };

  const findKeywordMatch = (description) => {
    if (!description) return null;
    const descriptionLower = description.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const [keyword, categoryId] of Object.entries(keywordRules.value)) {
      const keywordLower = keyword.toLowerCase();
      
      // Exact match
      if (descriptionLower.includes(keywordLower)) {
        return {
          category: getCategoryByIdLocal(categoryId),
          confidence: 1.0
        };
      }
      
      // Fuzzy match
      const similarity = calculateStringSimilarity(descriptionLower, keywordLower);
      if (similarity > 0.8 && similarity > bestScore) {
        bestScore = similarity;
        bestMatch = {
          category: getCategoryByIdLocal(categoryId),
          confidence: similarity
        };
      }
    }

    return bestMatch;
  };

  const findHistoricalMatch = (transaction) => {
    if (!transaction || !transaction.description) return null;
    const descriptionLower = transaction.description.toLowerCase();
    const amount = Math.abs(transaction.amount || 0);
    
    // Use machine learning to find similar transactions
    const similarTransactions = Object.values(categoryHistory.value)
      .filter(t => {
        const descSimilarity = calculateStringSimilarity(
          descriptionLower,
          t.description.toLowerCase()
        );
        const amountSimilarity = amount > 0 ? (1 - (Math.abs(amount - t.amount) / Math.max(amount, t.amount))) : 0.5;
        
        return descSimilarity > 0.7 && amountSimilarity > 0.7;
      });

    if (similarTransactions.length > 0) {
      // Use weighted voting based on similarity scores
      const weightedVotes = {};
      similarTransactions.forEach(t => {
        const descSimilarity = calculateStringSimilarity(
          descriptionLower,
          t.description.toLowerCase()
        );
        const amountSimilarity = amount > 0 ? (1 - (Math.abs(amount - t.amount) / Math.max(amount, t.amount))) : 0.5;
        const totalSimilarity = (descSimilarity + amountSimilarity) / 2;
        
        if (!weightedVotes[t.category_id]) {
          weightedVotes[t.category_id] = 0;
        }
        weightedVotes[t.category_id] += totalSimilarity;
      });

      const bestCategory = Object.entries(weightedVotes)
        .sort((a, b) => b[1] - a[1])[0];

      if (bestCategory) {
        return {
          category: getCategoryByIdLocal(bestCategory[0]),
          confidence: bestCategory[1] / similarTransactions.length
        };
      }
    }
    return null;
  };

  const calculateStringSimilarity = (str1, str2) => {
    if (!str1 || !str2) return 0;
    // Enhanced string similarity with word-level comparison
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    let matches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2) {
          matches++;
          break;
        }
      }
    }
    
    const wordSimilarity = matches / Math.max(words1.length, words2.length);
    
    // Combine with Levenshtein distance for character-level similarity
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const distance = matrix[len1][len2];
    const charSimilarity = 1 - (distance / Math.max(len1, len2));
    
    // Weighted combination of word and character similarity
    return (wordSimilarity * 0.7) + (charSimilarity * 0.3);
  };

  // Main function to get suggestions (now async)
  const suggestedCategories = async (transaction) => {
    const suggestions = [];
    
    // 1. Fetch from backend API (primary source)
    const apiSuggestions = await fetchCategorySuggestions(
      transaction.description || '',
      Math.abs(transaction.amount || 0)
    );
    suggestions.push(...apiSuggestions);

    // 2. Check keyword rules with fuzzy matching (fallback)
    const keywordMatch = findKeywordMatch(transaction.description);
    if (keywordMatch) {
      suggestions.push({
        category: keywordMatch.category,
        confidence: keywordMatch.confidence,
        source: 'keyword'
      });
    }

    // 3. Check historical patterns from local cache (fallback)
    const historicalMatch = findHistoricalMatch(transaction);
    if (historicalMatch) {
      suggestions.push({
        category: historicalMatch.category,
        confidence: historicalMatch.confidence,
        source: 'history'
      });
    }

    // Sort by confidence and return top suggestions
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  };

  const loadCategoryHistory = async () => {
    try {
      await transactionStore.fetchTransactions();
      const txs = transactionStore.transactions || [];
      categoryHistory.value = txs.reduce((acc, t) => {
        if (t.category_id) {
          acc[t.transaction_id] = {
            description: t.description || '',
            amount: Math.abs(Number(t.signed_amount != null ? t.signed_amount : t.amount) || 0),
            category_id: t.category_id
          };
        }
        return acc;
      }, {});
    } catch (error) {
      console.error('Failed to load category history:', error);
    }
  };

  const loadKeywordRules = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/keyword-rules`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (response.data && Array.isArray(response.data)) {
        // Convert array of rules to object map: { keyword: category_id }
        const rulesMap = {};
        response.data.forEach(rule => {
          if (rule.keyword && rule.category_id) {
            rulesMap[rule.keyword.toLowerCase()] = rule.category_id;
          }
        });
        keywordRules.value = rulesMap;
      }
    } catch (error) {
      console.error('Failed to load keyword rules:', error);
      // Don't throw - keyword rules are optional
    }
  };

  const saveSuggestionFeedback = async (transaction, category, accepted) => {
    // Disabled to prevent 429 rate limiting errors
    // try {
    //   const response = await fetch('/api/categories/suggestion-feedback', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //       transaction_id: transaction.transaction_id,
    //       description: transaction.description,
    //       amount: Math.abs(transaction.amount),
    //       suggested_category_id: category.category_id,
    //       accepted
    //     })
    //   });
    //   
    //   if (response.ok) {
    //     await loadSuggestionFeedback();
    //   }
    // } catch (error) {
    //   
    // }
  };

  const autoAssignCategories = async (transactions) => {
    const results = [];
    for (const transaction of transactions) {
      const suggestions = await suggestedCategories(transaction);
      const bestSuggestion = suggestions[0];
      
      if (bestSuggestion && bestSuggestion.confidence >= confidenceThreshold.value) {
        results.push({
          ...transaction,
          suggestedCategory: {
            category_id: bestSuggestion.category.category_id,
            category_name: bestSuggestion.category.category_name,
            confidence: bestSuggestion.confidence
          }
        });
      } else {
        results.push(transaction);
      }
    }
    return results;
  };

  // Initialize
  loadCategoryHistory();
  loadKeywordRules(); // Load keyword rules on initialization

  return {
    suggestedCategories,
    autoAssignCategories,
    confidenceThreshold,
    saveSuggestionFeedback,
    loadCategoryHistory,
    loadKeywordRules,
    fetchCategorySuggestions
  };
}
