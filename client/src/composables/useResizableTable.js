import { ref, computed, onMounted, onUnmounted } from 'vue';

export function useResizableTable(initialWidths = null) {
  // State: store widths by column key (string) for flexibility
  const columnWidths = ref(initialWidths || {});
  const resizingColumn = ref(null);
  const startX = ref(0);
  const startWidth = ref(0);
  const DEFAULT_WIDTH = 180;
  
  // Computed: ensure table can overflow horizontally by setting a minWidth
  const tableStyles = computed(() => {
    const values = Object.values(columnWidths.value);
    const total = values.length > 0 ? values.reduce((s, v) => s + (Number(v) || DEFAULT_WIDTH), 0) : 0;
    const minWidth = Math.max(800, total); // keep a sensible minimum
    return {
      tableLayout: 'fixed',
      width: '100%',
      minWidth: `${minWidth}px`
    };
  });
  
  // Methods
  const startResize = (columnKey, event) => {
    resizingColumn.value = columnKey;
    startX.value = event.pageX;
    const current = columnWidths.value[columnKey];
    startWidth.value = typeof current === 'number' ? current : DEFAULT_WIDTH;
    
    // Add user-select-none to prevent text selection during resize
    document.body.classList.add('select-none');
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    
    // Prevent default to avoid text selection
    event.preventDefault();
  };
  
  const handleResize = (event) => {
    if (resizingColumn.value === null) return;
    const diff = event.pageX - startX.value;
    const newWidth = Math.max(80, startWidth.value + diff); // Minimum width
    columnWidths.value[resizingColumn.value] = newWidth;
    
    // Prevent text selection during resize
    event.preventDefault();
  };
  
  const stopResize = () => {
    if (resizingColumn.value === null) return;
    
    resizingColumn.value = null;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    
    // Remove the user-select-none class from the body
    document.body.classList.remove('select-none');
  };
  
  // Lifecycle
  onMounted(() => {
    // If provided an array of keys, convert to object with defaults
    if (Array.isArray(initialWidths)) {
      const obj = {};
      initialWidths.forEach((key) => { obj[key] = DEFAULT_WIDTH; });
      columnWidths.value = obj;
    }
  });
  
  onUnmounted(() => {
    // Clean up event listeners
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.classList.remove('select-none');
  });
  
  return {
    // State
    columnWidths,
    
    // Computed
    tableStyles,
    
    // Methods
    startResize
  };
} 