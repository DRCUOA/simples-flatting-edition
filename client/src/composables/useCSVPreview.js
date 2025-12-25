import { ref, computed, watch } from 'vue';
import { useTransactionStore } from '../stores/transaction';
import { normalizeAppDateClient } from '../utils/dateUtils';
import { useCategoryAssignment } from './useCategoryAssignment';
import { useCategorySuggestions } from './useCategorySuggestions';

const API_URL = '/api';

export function useCSVPreview() {
  const transactionStore = useTransactionStore();
  const { categoryAssignments, assignCategory } = useCategoryAssignment();
  
  // State
  const showDuplicates = ref(true);
  const processedTransactions = ref([]);
  const isProcessing = ref(false);
  
  // MVP: Autocat disabled (no remote calls). Keep signature, always return null.
  const searchKeywordsForACatorgory = async (_description) => null;
  
  // Process records and update state
  const processRecords = async () => {
    if (isProcessing.value) return;
    isProcessing.value = true;
    
    try {
      const records = transactionStore.csvPreview.map(record => {
        const mappedRecord = {};
        transactionStore.requiredFields.forEach(field => {
          const mapping = transactionStore.fieldMappings[field.id];
          if (!mapping) return;
          
          if (Array.isArray(mapping)) {
            mappedRecord[field.id] = mapping
              .map(header => record[header] || '')
              .filter(value => value)
              .join(' ');
          } else {
            mappedRecord[field.id] = record[mapping] || '';
          }
        });
        return mappedRecord;
      });

      // Process records in batches to avoid overwhelming the API
      const batchSize = 5;
      const batches = [];
      for (let i = 0; i < records.length; i += batchSize) {
        batches.push(records.slice(i, i + batchSize));
      }

      const processedBatches = [];
      const { suggestedCategories } = useCategorySuggestions();
      
      for (const batch of batches) {
        const batchPromises = batch.map(async (record, index) => {
          // Build a minimal transaction-like object for suggestion engine
          const pseudoTx = {
            description: record.description || '',
            amount: Number(record.amount) || 0
          };
          
          // Get suggestions (now async)
          const suggestions = await suggestedCategories(pseudoTx);
          const best = suggestions && suggestions.length > 0 ? suggestions[0] : null;
          const suggestedCategory = best ? { 
            category_id: best.category?.category_id, 
            category_name: best.category?.category_name, 
            confidence: best.confidence 
          } : null;

          return {
            ...record,
            suggestedCategory
          };
        });
        
        const processedBatch = await Promise.all(batchPromises);
        processedBatches.push(...processedBatch);
      }

      processedTransactions.value = processedBatches;
    } catch (error) {
      processedTransactions.value = [];
    } finally {
      isProcessing.value = false;
    }
  };

  // Computed property now uses the processed state
  const transactions = computed(() => {
    return processedTransactions.value;
  });
  
  // Watch for changes in CSV preview data or field mappings
  watch(
    [() => transactionStore.csvPreview, () => transactionStore.fieldMappings],
    async () => {
      if (transactionStore.csvPreview.length > 0) {
        await processRecords();
      }
    },
    { immediate: true, deep: true }
  );

  // Methods
  const formatDate = (date) => {
    return normalizeAppDateClient(date, 'domain-to-display') || 'Invalid Date';
  };
  
  const formatAmount = (amount) => {
    if (!amount) return '';
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };
  
  const getAmountClass = (amount) => {
    if (!amount) return '';
    const num = parseFloat(amount);
    return num < 0 ? 'text-red-600' : 'text-green-600';
  };
  
  const getMappedValue = (record, fieldId) => {
    return record[fieldId] || '';
  };
  
  return {
    // State
    showDuplicates,
    isProcessing,
    
    // Computed
    transactions,
    
    // Methods
    formatDate,
    formatAmount,
    getAmountClass,
    getMappedValue,
    refreshTransactions: processRecords
  };
} 