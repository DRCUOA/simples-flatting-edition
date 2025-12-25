<template>
  <div class="sankey-container" ref="containerRef">
    <div ref="plotRef" class="sankey-plot"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue';
import Plotly from 'plotly.js-dist-min';

const props = defineProps({
  data: {
    type: Object,
    required: true,
    default: () => ({ nodes: [], links: [] })
  }
});

const containerRef = ref(null);
const plotRef = ref(null);
let plotInstance = null;

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

const renderSankey = () => {
  if (!plotRef.value || !props.data.nodes || props.data.nodes.length === 0) {
    return;
  }

  // Prepare data for Plotly Sankey
  const nodeLabels = props.data.nodes.map(node => node.name);
  const nodeColors = props.data.nodes.map(node => {
    // Net cashflow: green for profit, red for loss (only variable color)
    if (node.id === 'net') {
      return node.isProfit ? '#10b981' : '#ef4444'; // green for profit, red for loss
    }
    // Categories: color based on root category type (income = green, expense = red)
    // This is organizational - reflects category classification, not transaction amounts
    // Income root categories are always green, expense root categories are always red
    if (node.rootCategoryType === 'income') {
      return '#10b981'; // green for income root categories
    }
    // Default to red for expense root categories (or if rootCategoryType is undefined/expense)
    return '#ef4444'; // red for expense root categories
  });

  // Convert links to Plotly format (source and target are indices)
  const sources = props.data.links.map(link => link.source);
  const targets = props.data.links.map(link => link.target);
  const values = props.data.links.map(link => link.value);

  // Create link colors based on target node's income descendant status
  const linkColors = props.data.links.map(link => {
    const sourceNode = props.data.nodes[link.source];
    const targetNode = props.data.nodes[link.target];
    
    // Links from net income
    if (sourceNode.id === 'net') {
      if (targetNode.isIncomeDescendant === true) {
        return 'rgba(16, 185, 129, 0.4)'; // green for income descendants
      } else {
        return 'rgba(239, 68, 68, 0.4)'; // red for expense descendants
      }
    }
    
    // Links from category to subcategory - use target's color
    if (targetNode.isIncomeDescendant === true) return 'rgba(16, 185, 129, 0.4)'; // green
    return 'rgba(239, 68, 68, 0.4)'; // red
  });

  const data = {
    type: 'sankey',
    orientation: 'h',
    arrangement: 'snap', // Use snap arrangement to preserve node order
    node: {
      pad: 15,
      thickness: 20,
      line: {
        color: 'black',
        width: 0.5
      },
      label: nodeLabels,
      color: nodeColors
    },
    link: {
      source: sources,
      target: targets,
      value: values,
      color: linkColors,
      hoverinfo: 'all'
    }
  };

  const layout = {
    title: {
      text: 'Income & Expense Flow',
      font: {
        size: 16
      }
    },
    font: {
      size: 12,
      color: 'black'
    },
    paper_bgcolor: 'white',
    plot_bgcolor: 'white',
    height: Math.max(600, props.data.nodes.length * 40 + 200),
    margin: {
      l: 50,
      r: 50,
      t: 50,
      b: 50
    }
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d']
  };

  // Destroy existing plot if it exists
  if (plotInstance) {
    Plotly.purge(plotRef.value);
  }

  Plotly.newPlot(plotRef.value, [data], layout, config)
    .then(() => {
      plotInstance = plotRef.value;
    })
    .catch(error => {
      console.error('Error rendering Sankey diagram:', error);
    });
};

// Handle dark mode
const updateColors = () => {
  if (!plotRef.value || !plotInstance) return;
  
  const isDark = document.documentElement.classList.contains('dark');
  const update = {
    'paper_bgcolor': isDark ? '#1f2937' : 'white',
    'plot_bgcolor': isDark ? '#1f2937' : 'white',
    'font.color': isDark ? 'white' : 'black'
  };
  
  Plotly.relayout(plotRef.value, update);
};

watch(() => props.data, () => {
  nextTick(() => {
    renderSankey();
  });
}, { deep: true });

onMounted(() => {
  nextTick(() => {
    renderSankey();
    
    // Watch for dark mode changes
    const observer = new MutationObserver(() => {
      updateColors();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
  });
});

onUnmounted(() => {
  if (plotRef.value) {
    Plotly.purge(plotRef.value);
  }
});
</script>

<style scoped>
.sankey-container {
  width: 100%;
  height: 100%;
  min-height: 600px;
}

.sankey-plot {
  width: 100%;
  height: 100%;
  min-height: 600px;
}

/* Dark mode support */
:deep(.js-plotly-plot) {
  width: 100% !important;
  height: 100% !important;
}
</style>
