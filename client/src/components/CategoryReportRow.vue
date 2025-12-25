<template>
  <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
    <td class="px-3 py-2 text-sm sticky left-0 bg-white dark:bg-gray-800 z-10" :style="{ paddingLeft: `${(level * 24) + 12}px` }">
      <div class="flex items-center gap-2">
        <button
          v-if="hasChildren"
          @click.stop="$emit('toggle-expand', category.category_id)"
          class="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <svg 
            class="w-4 h-4 transition-transform"
            :class="{ 'rotate-90': isExpanded }"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <span v-else class="w-5"></span>
        <span :class="level === 0 ? 'font-medium' : 'font-normal'">
          {{ category.category_name }}
        </span>
      </div>
    </td>
    <td v-for="month in months" :key="month" class="px-3 py-2 text-sm text-right">
      <div :class="[
        getMonthValue(month) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
        level === 0 ? 'font-medium' : 'font-normal'
      ]">
        {{ formatCurrency(getMonthValue(month)) }}
      </div>
    </td>
    <td class="px-3 py-2 text-sm text-right bg-gray-100 dark:bg-gray-600">
      <div :class="[
        getTotal() >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
        level === 0 ? 'font-medium' : 'font-normal'
      ]">
        {{ formatCurrency(getTotal()) }}
      </div>
    </td>
  </tr>
  
  <!-- Children rows -->
  <template v-if="hasChildren && isExpanded">
    <CategoryReportRow
      v-for="child in sortedChildren"
      :key="child.category_id"
      :category="child"
      :months="months"
      :expanded-ids="expandedIds"
      :children-map="childrenMap"
      :level="level + 1"
      :sort-by="sortBy"
      :sort-dir="sortDir"
      @toggle-expand="$emit('toggle-expand', $event)"
    />
  </template>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  category: {
    type: Object,
    required: true
  },
  months: {
    type: Array,
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
  level: {
    type: Number,
    default: 0
  },
  sortBy: {
    type: String,
    default: 'category_name'
  },
  sortDir: {
    type: String,
    default: 'asc'
  }
});

const emit = defineEmits(['toggle-expand']);

const formatCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v) || 0);

// Get children for this category
const children = computed(() => {
  const map = props.childrenMap;
  if (map && typeof map.get === 'function') {
    return map.get(props.category.category_id) || [];
  }
  return [];
});

const hasChildren = computed(() => {
  return children.value.length > 0;
});

// Check if category is expanded
const isExpanded = computed(() => {
  const expanded = props.expandedIds;
  if (expanded instanceof Set) {
    return expanded.has(props.category.category_id);
  }
  if (expanded && typeof expanded.has === 'function') {
    return expanded.has(props.category.category_id);
  }
  return false;
});

// Get category's own month value (not including children) - returns net (income - expense)
const getCategoryOwnMonthValue = (month) => {
  if (!props.category.months || !props.category.months[month]) return 0;
  const income = props.category.months[month].income || 0;
  const expense = props.category.months[month].expense || 0;
  return income - expense; // Always return net
};

// Get category's own total (not including children) - returns net (income - expense)
const getCategoryOwnTotal = () => {
  const income = props.category.total_income || 0;
  const expense = props.category.total_expense || 0;
  return income - expense; // Always return net
};

// Recursively get sum of all descendants for a month (net: income - expense)
const getDescendantsMonthValue = (category, month) => {
  const children = props.childrenMap.get(category.category_id) || [];
  let sum = 0;
  children.forEach(child => {
    // Add child's own net value
    if (child.months && child.months[month]) {
      const income = child.months[month].income || 0;
      const expense = child.months[month].expense || 0;
      sum += income - expense; // Net
    }
    // Recursively add grandchildren and deeper
    sum += getDescendantsMonthValue(child, month);
  });
  return sum;
};

// Recursively get sum of all descendants totals (net: income - expense)
const getDescendantsTotal = (category) => {
  const children = props.childrenMap.get(category.category_id) || [];
  let sum = 0;
  children.forEach(child => {
    // Add child's own net total
    const income = child.total_income || 0;
    const expense = child.total_expense || 0;
    sum += income - expense; // Net
    // Recursively add grandchildren and deeper
    sum += getDescendantsTotal(child);
  });
  return sum;
};

// Get month value for this category
// If expanded: show only own value
// If collapsed and has children: show own value + sum of all descendants
const getMonthValue = (month) => {
  const ownValue = getCategoryOwnMonthValue(month);
  
  // If expanded or no children, show only own value
  if (isExpanded.value || !hasChildren.value) {
    return ownValue;
  }
  
  // If collapsed and has children, show own value + descendants
  return ownValue + getDescendantsMonthValue(props.category, month);
};

// Get total for this category
// If expanded: show only own value
// If collapsed and has children: show own value + sum of all descendants
const getTotal = () => {
  const ownTotal = getCategoryOwnTotal();
  
  // If expanded or no children, show only own value
  if (isExpanded.value || !hasChildren.value) {
    return ownTotal;
  }
  
  // If collapsed and has children, show own value + descendants
  return ownTotal + getDescendantsTotal(props.category);
};

// Get category's own month value for sorting (net: income - expense)
const getCategoryOwnMonthValueForSort = (category, month) => {
  if (!category.months || !category.months[month]) return 0;
  const income = category.months[month].income || 0;
  const expense = category.months[month].expense || 0;
  return income - expense; // Always return net
};

// Helper to get sort value for a category (matches display logic)
const getSortValue = (category, sortKey) => {
  if (sortKey === 'category_name') {
    return (category.category_name || '').toLowerCase();
  }
  
  const map = props.childrenMap;
  const expandedIds = props.expandedIds;
  const hasChildrenForCategory = (map.get(category.category_id) || []).length > 0;
  const isExpanded = expandedIds.has(category.category_id);
  
  if (sortKey === 'grand_total') {
    const income = category.total_income || 0;
    const expense = category.total_expense || 0;
    const ownTotal = income - expense; // Net
    if (isExpanded || !hasChildrenForCategory) {
      return ownTotal;
    }
    // If collapsed, return aggregated total
    return ownTotal + getDescendantsTotal(category);
  }
  
  if (sortKey.startsWith('month_')) {
    const month = sortKey.replace('month_', '');
    const ownValue = getCategoryOwnMonthValueForSort(category, month);
    if (isExpanded || !hasChildrenForCategory) {
      return ownValue;
    }
    // If collapsed, return aggregated value
    return ownValue + getDescendantsMonthValue(category, month);
  }
  
  return 0;
};

// Sorted children based on current sort settings
const sortedChildren = computed(() => {
  const multiplier = props.sortDir === 'asc' ? 1 : -1;
  return [...children.value].sort((a, b) => {
    const aVal = getSortValue(a, props.sortBy);
    const bVal = getSortValue(b, props.sortBy);
    
    if (props.sortBy === 'category_name') {
      const comparison = aVal.localeCompare(bVal);
      return comparison * multiplier;
    }
    
    // Numeric comparison
    const diff = aVal - bVal;
    return diff * multiplier;
  });
});
</script>

