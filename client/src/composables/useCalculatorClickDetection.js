import { onMounted, onUnmounted, watch } from 'vue';
import { useCalculatorStore } from '../stores/calculator';

export function useCalculatorClickDetection() {
  const calculatorStore = useCalculatorStore();

  const extractNumberFromElement = (element) => {
    if (!element) return null;

    // Get text content
    let text = element.textContent || element.innerText || '';
    
    // Also check value attribute for inputs
    if (element.value !== undefined && element.value !== null && element.value !== '') {
      text = element.value.toString();
    }

    // Remove common currency symbols and formatting
    text = text
      .replace(/[$€£¥₹,]/g, '') // Remove currency symbols and commas
      .replace(/\s+/g, '') // Remove whitespace
      .trim();

    // Try to match various number formats
    // Match: integers, decimals, negative numbers
    const numberPattern = /^-?\d+\.?\d*$/;
    
    if (numberPattern.test(text)) {
      const num = parseFloat(text);
      if (!isNaN(num) && isFinite(num)) {
        return num;
      }
    }

    return null;
  };

  const handleElementClick = (e) => {
    // Only process if calculator is open
    if (!calculatorStore.isOpen) return;

    // Don't process clicks inside the calculator itself
    if (e.target.closest('.calculator-container')) return;
    
    // Don't process clicks on the calculator icon
    if (e.target.closest('.calculator-icon-button')) return;

    // Check if clicked element or its parent contains a number
    let currentElement = e.target;
    let attempts = 0;
    const maxAttempts = 5; // Limit traversal depth

    while (currentElement && attempts < maxAttempts) {
      const num = extractNumberFromElement(currentElement);
      if (num !== null) {
        e.preventDefault();
        e.stopPropagation();
        insertNumberToCalculator(num, currentElement);
        return;
      }
      currentElement = currentElement.parentElement;
      attempts++;
    }
  };

  const insertNumberToCalculator = (num, element) => {
    // Round to 2 decimal places
    const rounded = parseFloat(num.toFixed(2));
    
    // Highlight the element
    calculatorStore.highlightElement(element);
    
    // Insert into calculator display (with history tracking)
    if (calculatorStore.display === '0' || calculatorStore.display === 'Error') {
      calculatorStore.setDisplay(rounded.toString(), true);
    } else {
      // Append to current display (with history tracking)
      calculatorStore.setDisplay(calculatorStore.display + rounded.toString(), true);
    }
  };

  let clickListenerActive = false;

  const addClickListener = () => {
    if (!clickListenerActive && calculatorStore.isOpen) {
      document.addEventListener('click', handleElementClick, true); // Use capture phase
      clickListenerActive = true;
    }
  };

  const removeClickListener = () => {
    if (clickListenerActive) {
      document.removeEventListener('click', handleElementClick, true);
      clickListenerActive = false;
    }
  };

  // Watch for calculator open/close state
  watch(() => calculatorStore.isOpen, (isOpen) => {
    if (isOpen) {
      addClickListener();
    } else {
      removeClickListener();
    }
  }, { immediate: true });

  onUnmounted(() => {
    removeClickListener();
  });
}

