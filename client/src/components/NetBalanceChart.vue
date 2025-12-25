<template>
  <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-4 h-full flex flex-col">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-base font-semibold text-gray-900 dark:text-white">Net Balance History</h3>
      <div class="flex gap-2">
        <button
          v-for="periodOption in periodOptions"
          :key="periodOption.value"
          @click="selectedPeriod = periodOption.value; loadData()"
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
          :class="selectedPeriod === periodOption.value
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'"
        >
          {{ periodOption.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center flex-1 min-h-[200px]">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading chart data...</p>
      </div>
    </div>

    <div v-else-if="error" class="flex items-center justify-center flex-1 min-h-[200px]">
      <div class="text-center text-red-600 dark:text-red-400">
        <p class="text-sm">{{ error }}</p>
        <button @click="loadData" class="mt-2 px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700">
          Retry
        </button>
      </div>
    </div>

    <div v-else-if="chartData && chartData.length > 0" class="relative flex-1 flex flex-col">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <div class="text-xs text-gray-600 dark:text-gray-400">Current Net Balance</div>
          <div class="text-lg font-bold" :class="currentNetBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
            {{ formatCurrency(currentNetBalance) }}
          </div>
        </div>
        <div v-if="changeAmount !== null" class="text-right">
          <div class="text-xs text-gray-600 dark:text-gray-400">Change</div>
          <div class="text-sm font-semibold" :class="changeAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
            {{ changeAmount >= 0 ? '+' : '' }}{{ formatCurrency(changeAmount) }}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-500" v-if="changePercent !== null">
            {{ changePercent >= 0 ? '+' : '' }}{{ changePercent.toFixed(1) }}%
          </div>
        </div>
      </div>
      <div class="flex-1 min-h-[200px]">
        <canvas ref="chartCanvas"></canvas>
      </div>
    </div>

    <div v-else class="flex items-center justify-center flex-1 min-h-[200px]">
      <div class="text-center text-gray-500 dark:text-gray-400">
        <svg class="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p class="text-sm">No data available for the selected period</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Chart, registerables } from 'chart.js';
import http from '../lib/http';
import { formatDateForPeriod } from '../utils/dateUtils';

Chart.register(...registerables);

const props = defineProps({
  timeframe: {
    type: String,
    default: 'long' // Progressive: short=short only, mid=short+mid, long=short+mid+long
  }
});

const chartCanvas = ref(null);
const chartInstance = ref(null);
const selectedPeriod = ref('1M');
const loading = ref(false);
const error = ref(null);
const chartData = ref([]);
const currentNetBalance = ref(0);
const changeAmount = ref(null);
const changePercent = ref(null);

const periodOptions = [
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
  { label: '1Y', value: '1Y' },
  { label: '5Y', value: '5Y' },
  { label: 'ALL', value: 'ALL' }
];

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

// Calculate linear regression trend line
const calculateTrendLine = (data) => {
  if (data.length < 2) return data;
  
  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  
  // Calculate sums for linear regression
  data.forEach((value, index) => {
    const x = index;
    const y = value;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });
  
  // Calculate slope (m) and intercept (b) for y = mx + b
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Generate trend line points
  return data.map((_, index) => slope * index + intercept);
};

// Use date utils for formatting
const formatDate = (dateString, period) => {
  return formatDateForPeriod(dateString, period);
};

const loadData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const params = { 
      period: selectedPeriod.value,
      timeframe: props.timeframe || 'long' // Always send timeframe (progressive filter)
    };
    
    const response = await http.get('/reports/net-balance-history', { params });

    if (response.data && response.data.data) {
      chartData.value = response.data.data;
      currentNetBalance.value = response.data.current?.netBalance || 0;


      // Calculate change from first to last
      if (chartData.value.length >= 2) {
        const firstBalance = chartData.value[0].netBalance;
        const lastBalance = chartData.value[chartData.value.length - 1].netBalance;
        changeAmount.value = lastBalance - firstBalance;
        if (firstBalance !== 0) {
          changePercent.value = (changeAmount.value / Math.abs(firstBalance)) * 100;
        } else {
          changePercent.value = null;
        }
      } else {
        changeAmount.value = null;
        changePercent.value = null;
      }

      await nextTick();
      renderChart();
    } else {
      chartData.value = [];
      error.value = 'No data received';
    }
  } catch (err) {
    console.error('Error loading net balance history:', err);
    error.value = err.response?.data?.error || 'Failed to load chart data';
    chartData.value = [];
  } finally {
    loading.value = false;
  }
};

const renderChart = () => {
  if (!chartCanvas.value || chartData.value.length === 0) return;

  // Destroy existing chart if it exists
  if (chartInstance.value) {
    chartInstance.value.destroy();
  }

  const ctx = chartCanvas.value.getContext('2d');
  const isDark = document.documentElement.classList.contains('dark');

  const labels = chartData.value.map(d => formatDate(d.date, selectedPeriod.value));
  const netBalanceData = chartData.value.map(d => d.netBalance);

  // Calculate trend line - can extend beyond last data point
  const trendLineData = calculateTrendLine(netBalanceData);
  
  // For balance line: only show data up to last transaction date
  // Create separate arrays for balance vs trend to handle different lengths if needed
  const balanceLabels = [...labels];
  const balanceData = [...netBalanceData];

  // Determine chart color based on trend
  const firstBalance = netBalanceData[0];
  const lastBalance = netBalanceData[netBalanceData.length - 1];
  const chartColor = lastBalance >= firstBalance 
    ? (isDark ? 'rgba(34, 197, 94, 1)' : 'rgba(34, 197, 94, 1)') // green
    : (isDark ? 'rgba(239, 68, 68, 1)' : 'rgba(239, 68, 68, 1)'); // red

  const backgroundColor = lastBalance >= firstBalance
    ? (isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.1)')
    : (isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)');

  // Trend line color (neutral gray-blue)
  const trendLineColor = isDark ? 'rgba(147, 197, 253, 0.8)' : 'rgba(59, 130, 246, 0.8)';

  chartInstance.value = new Chart(ctx, {
    type: 'line',
    data: {
      labels, // Labels from actual data points only (backend ensures no future dates)
      datasets: [
        {
          label: 'Net Balance',
          data: netBalanceData, // Only actual data points (backend filters out future dates)
          borderColor: chartColor,
          backgroundColor: backgroundColor,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: chartColor,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
          order: 2 // Render behind trend line
        },
        {
          label: 'Trend Line',
          data: trendLineData, // Trend line can extend (calculated from actual data)
          borderColor: trendLineColor,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5], // Dashed line
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 1, // Smooth curved line
          order: 1 // Render on top
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: isDark ? '#d1d5db' : '#374151',
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12
            },
            filter: function(item, chart) {
              // Only show legend for trend line
              return item.datasetIndex === 1;
            }
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: isDark ? '#fff' : '#111827',
          bodyColor: isDark ? '#d1d5db' : '#374151',
          borderColor: isDark ? '#4b5563' : '#e5e7eb',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              const dataPoint = chartData.value[context.dataIndex];
              if (context.datasetIndex === 0) {
                // Net Balance dataset
                return [
                  `Net Balance: ${formatCurrency(context.parsed.y)}`,
                  `Assets: ${formatCurrency(dataPoint.assets)}`,
                  `Liabilities: ${formatCurrency(Math.abs(dataPoint.liabilities || 0))}`
                ];
              } else {
                // Trend Line dataset
                return `Trend: ${formatCurrency(context.parsed.y)}`;
              }
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false,
            color: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 1)'
          },
          ticks: {
            color: isDark ? '#9ca3af' : '#6b7280',
            maxRotation: 45,
            minRotation: 0
          }
        },
        y: {
          grid: {
            color: isDark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(229, 231, 235, 1)'
          },
          ticks: {
            color: isDark ? '#9ca3af' : '#6b7280',
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    }
  });
};

watch(selectedPeriod, () => {
  loadData();
});

watch(() => props.timeframe, () => {
  loadData();
});

onMounted(() => {
  loadData();
});

onUnmounted(() => {
  if (chartInstance.value) {
    chartInstance.value.destroy();
  }
});
</script>

<style scoped>
canvas {
  max-height: 300px;
  height: 100% !important;
}
</style>

