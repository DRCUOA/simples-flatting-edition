import { ref, computed } from 'vue';
import { useTransactionStore } from '../stores/transaction';
import { useToast } from 'vue-toastification';
import { useFieldMapping } from './useFieldMapping';
import { useCategoryAssignment } from './useCategoryAssignment';

export function useTransactionImport() {
  const transactionStore = useTransactionStore();
  const toast = useToast();
  
  // Import the loadSavedMappings function from useFieldMapping
  const { loadSavedMappings } = useFieldMapping();
  
  // State
  const currentStep = ref(0);
  const selectedFile = ref(null);
  const selectedAccountId = ref('');
  const showAccountError = ref(false);
  const showCategoryError = ref(false);
  const categoryAssignments = ref({});
  const skipDuplicatesByHash = ref(true);
  const error = ref(null);
  const loading = ref(false);
  
  // Steps
  const steps = [
    'Select Account',
    'Upload File',
    'Map Fields',
    'Assign Categories',
    'Review & Import'
  ];
  
  // Computed
  const canProceedToNextStep = computed(() => {
    if (currentStep.value === 0) {
      return selectedAccountId.value;
    }
    if (currentStep.value === 1) {
      return selectedFile.value;
    }
    if (currentStep.value === 2) {
      return true; // Field mapping validation is handled separately
    }
    if (currentStep.value === 3) {
      return true; // Category assignment validation is handled separately
    }
    return true;
  });
  
  // Methods
  const handleFileSelect = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      selectedFile.value = file;
      
      // Ensure initial field mappings exist before preview
      if (!transactionStore.fieldMappings || Object.keys(transactionStore.fieldMappings).length === 0) {
        // Initialize basic mapping placeholders so UI shows fields
        transactionStore.requiredFields.forEach(field => {
          transactionStore.fieldMappings[field.id] = field.allowMultiple ? [] : '';
        });
      }

      // Preview the CSV file (backend supports missing/empty mappings to fetch headers)
      await transactionStore.previewCSV(file, selectedAccountId.value);
      
      // Initialize category assignments
      categoryAssignments.value = {};
      transactionStore.csvPreview.forEach((record, index) => {
        categoryAssignments.value[index] = '';
      });
      
      // Show toast message about duplicate transactions
      if (transactionStore.duplicateCount > 0) {
        toast.warning(`${transactionStore.duplicateCount} duplicate transaction(s) detected. These will be skipped during import.`);
      }
      
      // Move to next step
      nextStep();
    } catch (error) {
      if (error.response?.data?.error === 'Field mappings are required') {
        error.value = 'Please provide field mappings for the CSV file.';
        toast.error('Field mappings are required');
      } else {
        error.value = error.response?.data?.error || error.message || 'Failed to process file';
        toast.error(error.value);
      }
    }
  };
  
  const validateMappings = () => {
    // This will be handled by the useFieldMapping composable
    return true;
  };
  
  const validateCategoryAssignments = () => {
    showCategoryError.value = true;
    return Object.values(categoryAssignments.value).every(value => value);
  };
  
  const nextStep = () => {
    if (currentStep.value < steps.length - 1) {
      currentStep.value++;
    }
  };
  
  const prevStep = () => {
    if (currentStep.value > 0) {
      currentStep.value--;
    }
  };
  
  const selectAccount = async (account) => {
    try {
      selectedAccountId.value = account.account_id;
      showAccountError.value = false;
      
      // Load saved mappings for the selected account
      await loadSavedMappings(account.account_id);
      
      // If we have a file selected, preview it with the new account
      if (selectedFile.value) {
        await transactionStore.previewCSV(selectedFile.value, account.account_id);
      }
      
      // Move to next step if we're on the account selection step
      if (currentStep.value === 0) {
        nextStep();
      }
    } catch (error) {
      toast.error('Failed to load account settings');
      error.value = error.message;
    }
  };
  
  const resetState = () => {
    currentStep.value = 0;
    selectedFile.value = null;
    selectedAccountId.value = '';
    showAccountError.value = false;
    showCategoryError.value = false;
    categoryAssignments.value = {};
    error.value = null;
    loading.value = false;
  };
  
  return {
    // State
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
    
    // Methods
    handleFileSelect,
    validateMappings,
    validateCategoryAssignments,
    nextStep,
    prevStep,
    selectAccount,
    resetState
  };
} 