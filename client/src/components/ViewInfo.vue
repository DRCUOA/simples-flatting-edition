<template>
  <!-- V Icon (only in dev) - positioned on left side to avoid calculator icon -->
  <div v-if="isDevelopment" class="fixed bottom-20 left-4 z-50">
    <div class="relative group">
      <div class="w-8 h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all hover:scale-110">
        <span class="text-xs font-bold">V</span>
      </div>
    
      <!-- Tooltip on hover -->
      <div v-if="viewName" class="absolute bottom-full left-0 mb-2 w-80 max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div class="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
          {{ viewName }}
        </div>
        
        <!-- Components Section -->
        <div class="mb-3">
          <div class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Components:</div>
          <ul class="list-disc list-inside space-y-0.5 ml-2">
            <li v-for="component in components" :key="component" class="text-xs">
              <a 
                :href="getComponentPath(component)" 
                target="_blank"
                class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                @click.stop
              >
                {{ component }}
              </a>
            </li>
            <li v-if="components.length === 0" class="text-xs text-gray-500 dark:text-gray-500 italic">
              No components
            </li>
          </ul>
        </div>
        
        <!-- Script Blocks Section -->
        <div v-if="scriptBlocks && scriptBlocks.length > 0" class="border-t border-gray-200 dark:border-gray-700 pt-2">
          <div class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Script Blocks:</div>
          <div class="space-y-1">
            <div v-for="block in scriptBlocks" :key="block.name" class="text-xs">
              <button
                @click.stop="toggleBlock(block.name)"
                class="w-full text-left flex items-center justify-between py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span class="font-medium text-gray-700 dark:text-gray-300">
                  {{ block.name }}
                  <span class="text-gray-500 dark:text-gray-500 text-[10px] ml-1">({{ block.type }})</span>
                </span>
                <svg 
                  class="w-3 h-3 text-gray-500 dark:text-gray-400 transition-transform"
                  :class="{ 'rotate-90': expandedBlocks.has(block.name) }"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div 
                v-if="expandedBlocks.has(block.name)" 
                class="ml-4 mt-1 mb-2 pl-2 border-l-2 border-gray-300 dark:border-gray-600"
              >
                <div v-if="block.functions && block.functions.length > 0" class="space-y-0.5">
                  <div 
                    v-for="func in block.functions" 
                    :key="func"
                    class="text-xs pl-2"
                  >
                    • <a 
                      :href="`cursor://file/${getFunctionPathSync(block, func)}`" 
                      target="_blank"
                      class="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                      @click.stop="handleFunctionClick($event, block, func)"
                    >
                      {{ func }}
                    </a>
                  </div>
                </div>
                <div v-else class="text-xs text-gray-500 dark:text-gray-500 italic pl-2">
                  No functions listed
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="border-t border-gray-200 dark:border-gray-700 pt-2">
          <div class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Script Blocks:</div>
          <div class="text-xs text-gray-500 dark:text-gray-500 italic ml-2">No script blocks</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

// Check if we're in development environment
const isDevelopment = computed(() => {
  return import.meta.env.MODE === 'development' || import.meta.env.DEV;
});

const props = defineProps({
  viewName: {
    type: String,
    required: false,
    default: ''
  },
  components: {
    type: Array,
    default: () => []
  },
  scriptBlocks: {
    type: Array,
    default: () => []
  }
});

const expandedBlocks = ref(new Set());

const toggleBlock = (blockName) => {
  if (expandedBlocks.value.has(blockName)) {
    expandedBlocks.value.delete(blockName);
  } else {
    expandedBlocks.value.add(blockName);
  }
  // Force reactivity
  expandedBlocks.value = new Set(expandedBlocks.value);
};

// Handle function click - fetch line number and open file
const handleFunctionClick = async (event, block, functionName) => {
  event.preventDefault();
  
  const path = await getFunctionPath(block, functionName);
  
  // Open in new window
  window.open(path, '_blank');
};

// Get the workspace root path - default to the known workspace path
const getWorkspaceRoot = () => {
  // Default workspace path from user_info
  // This should match the actual workspace root on the local system
  return '/Users/Rich/c25/simples';
};

// Generate file path for components
const getComponentPath = (componentName) => {
  // Remove .vue extension if present
  const name = componentName.replace('.vue', '');
  const workspaceRoot = getWorkspaceRoot();
  const absolutePath = `${workspaceRoot}/client/src/components/${name}.vue`;
  
  // Use Cursor protocol with absolute path
  return `cursor://file/${absolutePath}`;
};

// Cache for function line numbers to avoid repeated fetches
const functionLineCache = new Map();

// Find function line number in file content
const findFunctionLine = (fileContent, functionName) => {
  const lines = fileContent.split('\n');
  
  // Patterns to match function definitions
  const patterns = [
    // Arrow functions: const functionName = ( or const functionName = async (
    new RegExp(`^\\s*(export\\s+)?const\\s+${functionName}\\s*=\\s*(async\\s+)?\\(`),
    // Function declarations: function functionName( or async function functionName(
    new RegExp(`^\\s*(export\\s+)?(async\\s+)?function\\s+${functionName}\\s*\\(`),
    // Method in object: functionName: ( or functionName: async (
    new RegExp(`^\\s*${functionName}\\s*:\\s*(async\\s+)?\\(`),
    // Getter pattern: functionName: (state) => ( for Pinia stores
    new RegExp(`^\\s*${functionName}\\s*:\\s*\\(state\\)\\s*=>`),
    // Method shorthand: functionName() { or async functionName() {
    new RegExp(`^\\s*${functionName}\\s*\\([^)]*\\)\\s*\\{`),
    // Arrow function method: functionName: async () => {
    new RegExp(`^\\s*${functionName}\\s*:\\s*(async\\s+)?\\(\\)\\s*=>`),
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of patterns) {
      if (pattern.test(line)) {
        return i + 1; // Return 1-based line number
      }
    }
  }
  
  return null;
};

// Get file path for a script block
const getFilePathForBlock = (block) => {
  let relativePath = '';
  
  if (block.type === 'store') {
    // Handle store names like: useTransactionStore -> transaction.js
    // useCalculatorStore -> calculator.js
    // useAuthStore -> auth.js
    let storeName = block.name
      .replace(/^use/, '')
      .replace(/Store$/, '');
    
    // Convert camelCase to lowercase (e.g., TransactionStore -> transaction)
    storeName = storeName.charAt(0).toLowerCase() + storeName.slice(1);
    
    relativePath = `client/src/stores/${storeName}.js`;
  } else if (block.type === 'composable') {
    // Handle composable names like: useAuth -> useAuth.js
    // useCalculatorClickDetection -> useCalculatorClickDetection.js
    // File names match the composable name exactly
    relativePath = `client/src/composables/${block.name}.js`;
  } else if (block.type === 'api') {
    const apiName = block.name.toLowerCase();
    relativePath = `client/src/lib/${apiName}.js`;
  } else {
    relativePath = `client/src/${block.name.toLowerCase()}.js`;
  }
  
  return relativePath;
};

// Generate file path for functions based on script block type
const getFunctionPath = async (block, functionName) => {
  const relativePath = getFilePathForBlock(block);
  const workspaceRoot = getWorkspaceRoot();
  const absolutePath = `${workspaceRoot}/${relativePath}`;
  
  // Create cache key
  const cacheKey = `${relativePath}:${functionName}`;
  
  // Check cache first
  if (functionLineCache.has(cacheKey)) {
    const lineNumber = functionLineCache.get(cacheKey);
    if (lineNumber) {
      return `cursor://file/${absolutePath}:${lineNumber}`;
    }
    // If cached as null, function not found, just return file path
    return `cursor://file/${absolutePath}`;
  }
  
  // Try to fetch file content to find function line number
  try {
    // In development, try to fetch from the dev server
    // The file might be accessible via the source map or direct path
    const response = await fetch(`/${relativePath}`);
    if (response.ok) {
      const fileContent = await response.text();
      const lineNumber = findFunctionLine(fileContent, functionName);
      
      // Cache the result
      functionLineCache.set(cacheKey, lineNumber);
      
      if (lineNumber) {
        return `cursor://file/${absolutePath}:${lineNumber}`;
      }
    }
  } catch (error) {
    // If fetch fails, continue with fallback
    console.debug(`Could not fetch ${relativePath} to find function line:`, error);
  }
  
  // Cache as null to avoid repeated failed fetches
  functionLineCache.set(cacheKey, null);
  
  // Fallback: return file path without line number
  return `cursor://file/${absolutePath}`;
};

// Synchronous version for href (will be updated on click)
const getFunctionPathSync = (block, functionName) => {
  const relativePath = getFilePathForBlock(block);
  const workspaceRoot = getWorkspaceRoot();
  const absolutePath = `${workspaceRoot}/${relativePath}`;
  
  // Return file path, line number will be added on click
  return absolutePath;
};
</script>

