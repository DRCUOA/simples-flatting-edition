<template>
  <button
    @click="toggleCalculator"
    :class="['calculator-icon-button', { 'calculator-icon-relative': position === 'relative' }]"
    title="Open Calculator"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      class="calculator-icon-svg"
    >
      <!-- Calculator body -->
      <rect x="3" y="4" width="18" height="16" rx="1.5" stroke="currentColor" fill="none" stroke-width="1.5"/>
      <!-- Display screen -->
      <rect x="5" y="6" width="14" height="5" rx="0.5" stroke="currentColor" fill="none" stroke-width="1"/>
      <!-- Display line (showing numbers) -->
      <line x1="6" y1="8.5" x2="18" y2="8.5" stroke="currentColor" stroke-width="0.8" opacity="0.5"/>
      <!-- Button rows -->
      <!-- Row 1 -->
      <circle cx="7" cy="13.5" r="1.2" fill="currentColor"/>
      <circle cx="10.5" cy="13.5" r="1.2" fill="currentColor"/>
      <circle cx="14" cy="13.5" r="1.2" fill="currentColor"/>
      <circle cx="17.5" cy="13.5" r="1.2" fill="currentColor"/>
      <!-- Row 2 -->
      <circle cx="7" cy="16.5" r="1.2" fill="currentColor"/>
      <circle cx="10.5" cy="16.5" r="1.2" fill="currentColor"/>
      <circle cx="14" cy="16.5" r="1.2" fill="currentColor"/>
      <circle cx="17.5" cy="16.5" r="1.2" fill="currentColor"/>
      <!-- Row 3 -->
      <circle cx="7" cy="19.5" r="1.2" fill="currentColor"/>
      <circle cx="10.5" cy="19.5" r="1.2" fill="currentColor"/>
      <circle cx="14" cy="19.5" r="1.2" fill="currentColor"/>
      <!-- Equals button (wider, right side) -->
      <rect x="15.5" y="18.3" width="4" height="2.4" rx="1.2" fill="currentColor"/>
    </svg>
  </button>
</template>

<script setup>
import { useCalculatorStore } from '../stores/calculator';

const props = defineProps({
  position: {
    type: String,
    default: 'fixed',
    validator: (value) => ['fixed', 'relative'].includes(value)
  }
});

const calculatorStore = useCalculatorStore();

const toggleCalculator = () => {
  if (calculatorStore.isOpen) {
    calculatorStore.closeCalculator();
  } else {
    calculatorStore.openCalculator();
  }
};
</script>

<style scoped>
.calculator-icon-button {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
  z-index: 9998;
}

.calculator-icon-relative {
  position: relative !important;
  bottom: auto !important;
  right: auto !important;
}

.calculator-icon-button:hover {
  background: #2563eb;
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.calculator-icon-button:active {
  transform: scale(0.95);
}

.dark .calculator-icon-button {
  background: #2563eb;
}

.dark .calculator-icon-button:hover {
  background: #1d4ed8;
}

.calculator-icon-svg {
  width: 24px;
  height: 24px;
}
</style>

