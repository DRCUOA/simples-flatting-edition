<template>
  <div>
    <!-- Category node (flight strip) -->
    <div 
      class="flight-strip relative bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 border-l-4"
      :class="{
        'border-indigo-500': nodeLevel === 0,
        'border-green-500': nodeLevel === 1,
        'border-blue-500': nodeLevel >= 2
      }"
    >
      <!-- Simple connecting line -->
      <div v-if="nodeLevel > 0" 
           class="absolute left-0 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-600"
           :style="{ left: `${nodeLevel * 20 + 8}px` }">
      </div>
      
      <!-- Flight strip content -->
      <div class="flex items-center justify-between px-4 py-3"
           :style="{ paddingLeft: `${nodeLevel * 20 + 16}px` }">
        
        <!-- Left side: Drag handle and content -->
        <div class="flex items-center min-w-0 flex-1">
          <!-- Drag handle (show if has siblings at this level) -->
          <div 
            v-if="hasSiblings"
            class="drag-handle cursor-move mr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
            </svg>
          </div>
          <div v-else class="w-8 h-5 mr-3"></div>
          
          <!-- Expand/collapse button -->
          <button
            v-if="childrenCount > 0"
            @click.stop="handleToggleExpand"
            class="w-4 h-4 mr-2 inline-flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-150"
          >
            <svg class="w-3 h-3 transition-transform duration-150" 
                 :class="{ 'rotate-90': isExpanded }"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div v-else class="w-4 h-4 mr-2"></div>
          
          <!-- Category name (flight strip style) -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-medium truncate text-gray-900 dark:text-white">
                {{ node.category_name }}
              </h3>
              <span v-if="node.display_order !== null && node.display_order !== undefined" 
                    class="text-xs text-gray-400 dark:text-gray-500">
                #{{ node.display_order }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Right side: Actions -->
        <div class="flex items-center gap-2 shrink-0 ml-4">
          <button @click.stop="handleEdit" 
                  :disabled="childrenCount > 0" 
                  :class="[
                    'text-sm transition-colors duration-150',
                    childrenCount > 0 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : 'text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300'
                  ]">
            Edit
          </button>
          <button @click.stop="handleDelete" 
                  class="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-150">
            Delete
          </button>
        </div>
      </div>
    </div>
    
    <!-- Children (draggable if more than one) -->
    <draggable
      v-if="childrenCount > 0 && isExpanded"
      :list="childrenList"
      :item-key="(item) => item.category_id"
      :group="{ name: 'categories', pull: false, put: false }"
      :animation="200"
      handle=".drag-handle"
      @end="handleDragEnd"
      class="divide-y divide-gray-200 dark:divide-gray-700"
    >
      <template #item="{ element: childNode }">
        <CategoryTreeNode
          :key="childNode.category_id"
          :node="childNode"
          :expanded-ids="expandedIds"
          :children-map="childrenMap"
          :parent-id="node.category_id"
          :level="nodeLevel + 1"
          @toggle-expand="$emit('toggle-expand', $event)"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
          @drag-end="$emit('drag-end', $event)"
        />
      </template>
    </draggable>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import draggable from 'vuedraggable';

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  expandedIds: {
    type: Object,
    required: true
  },
  childrenMap: {
    type: Object,
    required: true
  },
  parentId: {
    type: String,
    default: null
  },
  level: {
    type: Number,
    default: 0
  }
});

const emit = defineEmits(['toggle-expand', 'edit', 'delete', 'drag-end']);

// Calculate node level
const nodeLevel = computed(() => props.level || 0);

// Get children for this node
const childrenList = computed(() => {
  const map = props.childrenMap;
  if (map && typeof map.get === 'function') {
    return map.get(props.node.category_id) || [];
  }
  return [];
});

// Compute children count from childrenList (for nested nodes that don't have childrenCount property)
const childrenCount = computed(() => {
  // Use node.childrenCount if available (for root nodes), otherwise compute from childrenList
  return props.node.childrenCount !== undefined && props.node.childrenCount !== null
    ? props.node.childrenCount
    : childrenList.value.length;
});

// Check if this node has siblings (for drag handle display)
const hasSiblings = computed(() => {
  const parentId = props.parentId !== undefined ? props.parentId : (props.node.parent_category_id || null);
  const map = props.childrenMap;
  if (map && typeof map.get === 'function') {
    const siblings = map.get(parentId) || [];
    return siblings.length > 1;
  }
  return false;
});

// Check if node is expanded
const isExpanded = computed(() => {
  const expanded = props.expandedIds;
  if (expanded instanceof Set) {
    return expanded.has(props.node.category_id);
  }
  // Handle reactive Set or object with has method
  if (expanded && typeof expanded.has === 'function') {
    return expanded.has(props.node.category_id);
  }
  return false;
});

// Event handlers
const handleToggleExpand = () => {
  emit('toggle-expand', props.node.category_id);
};

const handleEdit = () => {
  emit('edit', props.node);
};

const handleDelete = () => {
  emit('delete', props.node);
};

// Handle drag end
const handleDragEnd = () => {
  emit('drag-end', props.node.category_id);
};
</script>

<style scoped>
.flight-strip {
  position: relative;
  transition: all 0.2s ease;
}

.flight-strip:hover {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.drag-handle {
  cursor: grab;
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.flight-strip.sortable-ghost {
  opacity: 0.4;
  background: #f3f4f6;
}

.flight-strip.sortable-drag {
  opacity: 0.8;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
</style>
