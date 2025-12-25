import { defineStore } from 'pinia';
import { ref, watch, computed } from 'vue';

export const useCalculatorStore = defineStore('calculator', () => {
  // State
  const isOpen = ref(false);
  const display = ref('0');
  const position = ref({ x: window.innerWidth - 240, y: 100 });
  const size = ref({ width: 220, height: 320 });
  const highlightedElements = ref([]); // Array to track all highlighted elements
  
  // Undo/Redo history (max 20 operations)
  const undoHistory = ref([]);
  const redoHistory = ref([]);
  const MAX_HISTORY = 20;

  // Load from localStorage on initialization
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem('calculator-state');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.isOpen) {
          isOpen.value = parsed.isOpen;
          display.value = parsed.display || '0';
          position.value = parsed.position || { x: window.innerWidth - 240, y: 100 };
          size.value = parsed.size || { width: 220, height: 320 };
        }
      }
    } catch (e) {
      console.warn('Failed to load calculator state from storage:', e);
    }
  };

  // Save to localStorage
  const saveToStorage = () => {
    try {
      localStorage.setItem('calculator-state', JSON.stringify({
        isOpen: isOpen.value,
        display: display.value,
        position: position.value,
        size: size.value
      }));
      
      // Save highlighted elements selectors to cache
      const selectors = highlightedElements.value
        .map(el => generateSelector(el))
        .filter(s => s !== null);
      
      localStorage.setItem('calculator-highlights', JSON.stringify(selectors));
    } catch (e) {
      console.warn('Failed to save calculator state to storage:', e);
    }
  };
  
  // Generate a more reliable selector for an element
  const generateSelector = (element) => {
    if (!element) return null;
    
    // Try ID first
    if (element.id) {
      return `#${element.id}`;
    }
    
    // Try data attributes
    if (element.dataset && Object.keys(element.dataset).length > 0) {
      const dataAttr = Object.keys(element.dataset)[0];
      return `[data-${dataAttr}="${element.dataset[dataAttr]}"]`;
    }
    
    // Use path-based selector
    const path = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      } else {
        let sibling = current;
        let nth = 1;
        while (sibling.previousElementSibling) {
          sibling = sibling.previousElementSibling;
          if (sibling.tagName === current.tagName) nth++;
        }
        if (nth > 1) {
          selector += `:nth-of-type(${nth})`;
        }
        path.unshift(selector);
      }
      current = current.parentElement;
      if (path.length > 5) break; // Limit depth
    }
    return path.join(' > ');
  };

  // Initialize from storage
  loadFromStorage();

  // Watch for changes and save to storage
  watch([isOpen, display, position, size], () => {
    if (isOpen.value) {
      saveToStorage();
    }
  }, { deep: true });

  // Restore highlights from cache
  const restoreHighlights = () => {
    try {
      const highlightCache = localStorage.getItem('calculator-highlights');
      if (highlightCache) {
        const elementSelectors = JSON.parse(highlightCache);
        highlightedElements.value = [];
        
        // Try to find and highlight elements
        elementSelectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
              if (element && !highlightedElements.value.includes(element)) {
                element.classList.add('calculator-highlight');
                highlightedElements.value.push(element);
              }
            });
          } catch (e) {
            // Skip invalid selectors
          }
        });
      }
    } catch (e) {
      console.warn('Failed to restore highlights:', e);
    }
  };

  // Actions
  const openCalculator = () => {
    isOpen.value = true;
    loadFromStorage(); // Reload position/size from storage
    // Restore highlights after a short delay to ensure DOM is ready
    setTimeout(() => {
      restoreHighlights();
    }, 100);
  };

  const clearAllHighlights = () => {
    // Remove highlight class from all tracked elements
    highlightedElements.value.forEach(element => {
      if (element && element.classList) {
        element.classList.remove('calculator-highlight');
      }
    });
    highlightedElements.value = [];
    // Clear highlight cache
    localStorage.removeItem('calculator-highlights');
  };

  const closeCalculator = () => {
    isOpen.value = false;
    display.value = '0';
    clearAllHighlights();
    clearHistory();
    // Clear storage when closed
    localStorage.removeItem('calculator-state');
  };

  const setDisplay = (value, saveToHistory = true) => {
    if (saveToHistory) {
      saveToHistoryStack();
    }
    display.value = value;
  };
  
  // Save current state to undo history
  const saveToHistoryStack = () => {
    // Save current display to undo history
    undoHistory.value.push(display.value);
    
    // Limit history to MAX_HISTORY
    if (undoHistory.value.length > MAX_HISTORY) {
      undoHistory.value.shift(); // Remove oldest
    }
    
    // Clear redo history when new action is performed
    redoHistory.value = [];
  };
  
  // Undo operation
  const undo = () => {
    if (undoHistory.value.length === 0) return;
    
    // Save current state to redo history
    redoHistory.value.push(display.value);
    
    // Restore previous state
    const previousValue = undoHistory.value.pop();
    display.value = previousValue;
  };
  
  // Redo operation
  const redo = () => {
    if (redoHistory.value.length === 0) return;
    
    // Save current state to undo history
    undoHistory.value.push(display.value);
    
    // Restore next state
    const nextValue = redoHistory.value.pop();
    display.value = nextValue;
  };
  
  // Clear history
  const clearHistory = () => {
    undoHistory.value = [];
    redoHistory.value = [];
  };
  
  // Computed properties for undo/redo availability
  const canUndo = computed(() => undoHistory.value.length > 0);
  const canRedo = computed(() => redoHistory.value.length > 0);

  const setPosition = (x, y) => {
    position.value = { x, y };
  };

  const setSize = (width, height) => {
    size.value = { width, height };
  };

  const highlightElement = (element) => {
    // Add highlight and track it
    if (element && !highlightedElements.value.includes(element)) {
      element.classList.add('calculator-highlight');
      highlightedElements.value.push(element);
      saveToStorage(); // Persist highlights
    }
  };

  const insertValue = (value) => {
    const currentValue = display.value;
    saveToHistoryStack();
    
    if (currentValue === '0' || currentValue === 'Error') {
      display.value = value.toString();
    } else {
      display.value += value.toString();
    }
  };

  const clear = () => {
    saveToHistoryStack();
    display.value = '0';
    clearHistory(); // Clear history on clear
    // Don't clear highlights on clear - only on close
  };

  const calculate = () => {
    const currentValue = display.value;
    saveToHistoryStack();
    
    try {
      // Replace display with safe evaluation
      let expression = currentValue.replace(/×/g, '*').replace(/÷/g, '/');
      
      // Validate expression (only allow numbers, operators, parentheses, and decimal points)
      if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
        throw new Error('Invalid expression');
      }

      // Use Function constructor for safer evaluation than eval
      const result = Function('"use strict"; return (' + expression + ')')();
      
      if (isNaN(result) || !isFinite(result)) {
        throw new Error('Invalid result');
      }

      // Round to 2 decimal places
      display.value = parseFloat(result.toFixed(2)).toString();
    } catch (e) {
      display.value = 'Error';
    }
  };

  return {
    isOpen,
    display,
    position,
    size,
    canUndo,
    canRedo,
    openCalculator,
    closeCalculator,
    setDisplay,
    setPosition,
    setSize,
    highlightElement,
    clearAllHighlights,
    restoreHighlights,
    insertValue,
    clear,
    calculate,
    undo,
    redo,
    clearHistory
  };
});

