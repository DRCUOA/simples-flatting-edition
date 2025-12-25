<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      ref="calculatorRef"
      class="calculator-container"
      :style="{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`
      }"
    >
      <!-- Header (draggable) -->
      <div
        class="calculator-header"
        @mousedown="startDrag"
      >
        <span class="calculator-title">Calculator</span>
        <div class="flex items-center gap-1">
          <!-- Undo/Redo buttons -->
          <button 
            @click.stop="handleUndo" 
            :disabled="!canUndo"
            class="calculator-undo-redo"
            :class="{ 'opacity-50 cursor-not-allowed': !canUndo }"
            title="Undo"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button 
            @click.stop="handleRedo" 
            :disabled="!canRedo"
            class="calculator-undo-redo"
            :class="{ 'opacity-50 cursor-not-allowed': !canRedo }"
            title="Redo"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
          <button @click="closeCalculator" class="calculator-close">×</button>
        </div>
      </div>

      <!-- Display -->
      <div class="calculator-display">
        {{ display }}
      </div>

      <!-- Buttons -->
      <div class="calculator-buttons">
        <button @click="clear" class="btn-clear">C</button>
        <button @click="insertOperator('(')" class="btn-operator">(</button>
        <button @click="insertOperator(')')" class="btn-operator">)</button>
        <button @click="insertOperator('÷')" class="btn-operator">÷</button>

        <button @click="insertNumber('7')" class="btn-number">7</button>
        <button @click="insertNumber('8')" class="btn-number">8</button>
        <button @click="insertNumber('9')" class="btn-number">9</button>
        <button @click="insertOperator('×')" class="btn-operator">×</button>

        <button @click="insertNumber('4')" class="btn-number">4</button>
        <button @click="insertNumber('5')" class="btn-number">5</button>
        <button @click="insertNumber('6')" class="btn-number">6</button>
        <button @click="insertOperator('-')" class="btn-operator">-</button>

        <button @click="insertNumber('1')" class="btn-number">1</button>
        <button @click="insertNumber('2')" class="btn-number">2</button>
        <button @click="insertNumber('3')" class="btn-number">3</button>
        <button @click="insertOperator('+')" class="btn-operator">+</button>

        <button @click="insertNumber('0')" class="btn-number btn-zero">0</button>
        <button @click="insertDecimal" class="btn-number">.</button>
        <button @click="calculate" class="btn-equals">=</button>
      </div>

      <!-- Resize handle -->
      <div
        class="calculator-resize-handle"
        @mousedown.stop="startResize"
      ></div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useCalculatorStore } from '../stores/calculator';
import { useCalculatorClickDetection } from '../composables/useCalculatorClickDetection';

// Initialize click detection
useCalculatorClickDetection();

const route = useRoute();

const calculatorStore = useCalculatorStore();
const calculatorRef = ref(null);

const isOpen = computed(() => calculatorStore.isOpen);
const display = computed(() => calculatorStore.display);
const position = computed(() => calculatorStore.position);
const size = computed(() => calculatorStore.size);
const canUndo = computed(() => calculatorStore.canUndo);
const canRedo = computed(() => calculatorStore.canRedo);

let isDragging = false;
let isResizing = false;
let dragStart = { x: 0, y: 0 };
let resizeStart = { x: 0, y: 0, width: 0, height: 0 };

const startDrag = (e) => {
  if (e.target.classList.contains('calculator-close')) return;
  isDragging = true;
  dragStart.x = e.clientX - position.value.x;
  dragStart.y = e.clientY - position.value.y;
  document.addEventListener('mousemove', handleDrag);
  document.addEventListener('mouseup', stopDrag);
  e.preventDefault();
};

const handleDrag = (e) => {
  if (!isDragging) return;
  const newX = e.clientX - dragStart.x;
  const newY = e.clientY - dragStart.y;
  
  // Keep calculator within viewport
  const maxX = window.innerWidth - size.value.width;
  const maxY = window.innerHeight - size.value.height;
  
  calculatorStore.setPosition(
    Math.max(0, Math.min(newX, maxX)),
    Math.max(0, Math.min(newY, maxY))
  );
};

const stopDrag = () => {
  isDragging = false;
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
};

const startResize = (e) => {
  isResizing = true;
  resizeStart.x = e.clientX;
  resizeStart.y = e.clientY;
  resizeStart.width = size.value.width;
  resizeStart.height = size.value.height;
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  e.preventDefault();
};

const handleResize = (e) => {
  if (!isResizing) return;
  const deltaX = e.clientX - resizeStart.x;
  const deltaY = e.clientY - resizeStart.y;
  
  const newWidth = Math.max(250, Math.min(500, resizeStart.width + deltaX));
  const newHeight = Math.max(300, Math.min(600, resizeStart.height + deltaY));
  
  calculatorStore.setSize(newWidth, newHeight);
};

const stopResize = () => {
  isResizing = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
};

const closeCalculator = () => {
  calculatorStore.closeCalculator();
};

const insertNumber = (num) => {
  if (display.value === 'Error') {
    calculatorStore.setDisplay('0');
  }
  calculatorStore.insertValue(num);
};

const insertOperator = (op) => {
  if (display.value === 'Error') {
    calculatorStore.setDisplay('0');
  }
  calculatorStore.insertValue(op);
};

const insertDecimal = () => {
  if (display.value === 'Error') {
    calculatorStore.setDisplay('0');
  }
  // Don't allow multiple decimal points in the same number
  const parts = display.value.split(/[+\-×÷()]/);
  const lastPart = parts[parts.length - 1];
  if (!lastPart.includes('.')) {
    calculatorStore.insertValue('.');
  }
};

const clear = () => {
  calculatorStore.clear();
};

const calculate = () => {
  calculatorStore.calculate();
};

const handleUndo = () => {
  calculatorStore.undo();
};

const handleRedo = () => {
  calculatorStore.redo();
};

// Ensure calculator stays within viewport on window resize
const handleWindowResize = () => {
  if (isOpen.value) {
    const maxX = window.innerWidth - size.value.width;
    const maxY = window.innerHeight - size.value.height;
    calculatorStore.setPosition(
      Math.max(0, Math.min(position.value.x, maxX)),
      Math.max(0, Math.min(position.value.y, maxY))
    );
  }
};

// Restore highlights when route changes (navigation)
watch(() => route.path, () => {
  if (isOpen.value) {
    // Small delay to ensure DOM is updated
    setTimeout(() => {
      calculatorStore.restoreHighlights();
    }, 200);
  }
});

onMounted(() => {
  window.addEventListener('resize', handleWindowResize);
});

onUnmounted(() => {
  document.removeEventListener('mousemove', handleDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  window.removeEventListener('resize', handleWindowResize);
});
</script>

<style scoped>
.calculator-container {
  position: fixed;
  z-index: 99999;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 
    0 0 0 3px rgba(0, 0, 0, 0.1),
    0 0 0 6px rgba(0, 0, 0, 0.05),
    0 20px 60px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(0, 0, 0, 0.2) inset;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 200px;
  min-height: 280px;
  max-width: 500px;
  max-height: 600px;
  border: 4px solid #1a1a1a;
}

.dark .calculator-container {
  background: #1a1a1a;
  border: 4px solid #0a0a0a;
  box-shadow: 
    0 0 0 3px rgba(255, 255, 255, 0.1),
    0 0 0 6px rgba(255, 255, 255, 0.05),
    0 20px 60px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
}

.calculator-header {
  background: #3b82f6;
  color: white;
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  user-select: none;
}

.dark .calculator-header {
  background: #2563eb;
}

.calculator-title {
  font-weight: 600;
  font-size: 14px;
}

.calculator-undo-redo {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  padding: 2px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.calculator-undo-redo:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.calculator-undo-redo:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.calculator-close {
  background: transparent;
  border: none;
  color: white;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.calculator-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.calculator-display {
  background: #ffffff;
  padding: 12px;
  text-align: right;
  font-size: 24px;
  font-weight: 600;
  min-height: 50px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  word-break: break-all;
  overflow-wrap: break-word;
  border-bottom: 2px solid #1a1a1a;
  color: #212529;
}

.dark .calculator-display {
  background: #0a0a0a;
  color: #f7fafc;
  border-bottom-color: #ffffff;
}

.calculator-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0px;
  background: #1a1a1a;
  padding: 2px;
  flex: 1;
  overflow: hidden;
}

.dark .calculator-buttons {
  background: #0a0a0a;
}

.calculator-buttons button {
  border: none;
  background: #ffffff;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
  min-height: 45px;
  user-select: none;
  color: #212529;
  padding: 4px 2px;
}

.dark .calculator-buttons button {
  background: #2d3748;
  color: #f7fafc;
}

.calculator-buttons button:hover {
  background: #e9ecef;
}

.dark .calculator-buttons button:hover {
  background: #4a5568;
}

.calculator-buttons button:active {
  background: #dee2e6;
}

.dark .calculator-buttons button:active {
  background: #5a6578;
}

.btn-number {
  color: #111827;
}

.dark .btn-number {
  color: white;
}

.btn-operator {
  background: #e9ecef !important;
  color: #3b82f6;
  font-weight: 600;
}

.dark .btn-operator {
  background: #4a5568 !important;
  color: #60a5fa;
}

.btn-clear {
  background: #ef4444 !important;
  color: white;
}

.dark .btn-clear {
  background: #dc2626 !important;
}

.btn-equals {
  background: #3b82f6 !important;
  color: white;
  font-weight: 600;
}

.dark .btn-equals {
  background: #2563eb !important;
}

.btn-zero {
  grid-column: span 1;
}

.calculator-resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 0%, transparent 40%, #9ca3af 40%, #9ca3af 45%, transparent 45%, transparent 55%, #9ca3af 55%, #9ca3af 60%, transparent 60%);
}

.dark .calculator-resize-handle {
  background: linear-gradient(135deg, transparent 0%, transparent 40%, #6b7280 40%, #6b7280 45%, transparent 45%, transparent 55%, #6b7280 55%, #6b7280 60%, transparent 60%);
}
</style>

<style>
/* Global style for highlighted elements */
.calculator-highlight {
  background-color: #fef9c3 !important;
  transition: background-color 0.3s ease;
}

.dark .calculator-highlight {
  background-color: #78350f !important;
}
</style>

