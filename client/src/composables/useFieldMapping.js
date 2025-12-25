import { ref, computed } from 'vue';
import { useTransactionStore } from '../stores/transaction';

export function useFieldMapping() {
  const transactionStore = useTransactionStore();
  
  // Use the store's fieldMappings
  const fieldMappings = computed({
    get: () => transactionStore.fieldMappings,
    set: (value) => {
      transactionStore.fieldMappings = value;
    }
  });
  
  // Initialize field mappings
  const initializeFieldMappings = () => {
    // Ensure we replace the object to trigger reactivity in watchers
    const init = {};
    transactionStore.requiredFields.forEach(field => {
      init[field.id] = field.allowMultiple ? [] : '';
    });
    transactionStore.fieldMappings = init;
  };
  
  // Load saved mappings for an account
  const loadSavedMappings = async (accountId) => {
    try {
      const savedMappings = await transactionStore.getFieldMappings(accountId);
      
      // Process and apply saved mappings
      if (savedMappings && savedMappings.length > 0) {
        // Group mappings by field_name
        const groupedMappings = savedMappings.reduce((acc, mapping) => {
          if (!acc[mapping.field_name]) {
            acc[mapping.field_name] = [];
          }
          acc[mapping.field_name].push(mapping.csv_header);
          return acc;
        }, {});
        
        // Apply grouped mappings
        Object.entries(groupedMappings).forEach(([fieldName, headers]) => {
          const field = transactionStore.requiredFields.find(f => f.id === fieldName);
          if (field) {
            if (field.allowMultiple) {
              // Ensure we're creating a new array to trigger reactivity
              transactionStore.fieldMappings[fieldName] = [...headers];
            } else {
              transactionStore.fieldMappings[fieldName] = headers[0] || '';
            }
          }
        });
        
        // Force reactivity update
        transactionStore.fieldMappings = { ...transactionStore.fieldMappings };
      } else {
        // Only initialize if no saved mappings found
        initializeFieldMappings();
      }
    } catch (error) {
      // If there's an error, initialize with empty mappings
      initializeFieldMappings();
      throw error;
    }
  };
  
  // Methods
  const addMapping = (fieldId) => {
    if (!transactionStore.fieldMappings[fieldId]) {
      transactionStore.fieldMappings[fieldId] = [];
    }
    transactionStore.fieldMappings[fieldId].push('');
  };
  
  const removeMapping = (fieldId, index) => {
    if (transactionStore.fieldMappings[fieldId]) {
      transactionStore.fieldMappings[fieldId].splice(index, 1);
    }
  };
  
  const updateFieldMapping = (fieldId, csvHeader, isAdd = true) => {
    const field = transactionStore.requiredFields.find(f => f.id === fieldId);
    if (!field) return;

    if (field.allowMultiple) {
      if (isAdd) {
        if (!transactionStore.fieldMappings[fieldId].includes(csvHeader)) {
          transactionStore.fieldMappings[fieldId].push(csvHeader);
        }
      } else {
        transactionStore.fieldMappings[fieldId] = transactionStore.fieldMappings[fieldId].filter(h => h !== csvHeader);
      }
    } else {
      transactionStore.fieldMappings[fieldId] = csvHeader;
    }
  };
  
  const validateMappings = () => {
    return transactionStore.requiredFields.every(field => {
      if (field.allowMultiple) {
        return transactionStore.fieldMappings[field.id]?.length > 0;
      }
      return transactionStore.fieldMappings[field.id];
    });
  };
  
  const resetMappings = () => {
    initializeFieldMappings();
  };
  
  return {
    // State
    fieldMappings,
    
    // Methods
    addMapping,
    removeMapping,
    updateFieldMapping,
    validateMappings,
    resetMappings,
    initializeFieldMappings,
    loadSavedMappings
  };
} 