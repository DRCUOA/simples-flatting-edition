import { defineStore } from 'pinia';
import { getCurrentWeekStart, getCurrentWeekEnd, getCurrentMonth, addDays, daysDifference, formatDate, getDayOfWeek, normalizeAppDateClient } from '../utils/dateUtils';

const getCurrentWeek = () => {
  return getCurrentWeekStart();
};

const getCurrentWeekEndDate = () => {
  return getCurrentWeekEnd();
};

const currentMonth = () => {
  return getCurrentMonth();
};

export const useUiStore = defineStore('ui', {
  state: () => ({
    selectedWeekStart: getCurrentWeek(),
    selectedWeekEnd: getCurrentWeekEndDate(),
    selectedDateRange: {
      start: getCurrentWeek(),
      end: getCurrentWeekEndDate()
    },
    // Backward compatibility for monthly views
    selectedMonth: currentMonth()
  }),
  getters: {
    // Get the current week key in YYYY-W## format
    currentWeekKey: (state) => {
      const startDate = normalizeAppDateClient(state.selectedWeekStart, 'api-to-domain');
      if (!startDate) return '';
      const [year] = startDate.split('-');
      // Calculate week number using date utilities
      const firstDayOfYear = `${year}-01-01`;
      const daysDiff = daysDifference(firstDayOfYear, startDate);
      if (daysDiff === null) return '';
      // Get day of week for Jan 1st using date utils
      const jan1DayOfWeek = getDayOfWeek(firstDayOfYear);
      if (jan1DayOfWeek === null) return '';
      const weekNumber = Math.ceil((daysDiff + jan1DayOfWeek + 1) / 7);
      return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
    },
    
    // Get formatted week range for display
    formattedWeekRange: (state) => {
      return `${formatDate(state.selectedWeekStart)} - ${formatDate(state.selectedWeekEnd)}`;
    }
  },
  actions: {
    setSelectedWeek(startDate, endDate) {
      if (typeof startDate === 'string' && typeof endDate === 'string') {
        this.selectedWeekStart = startDate;
        this.selectedWeekEnd = endDate;
        this.selectedDateRange = { start: startDate, end: endDate };
      }
    },
    
    setSelectedDateRange(startDate, endDate) {
      if (typeof startDate === 'string' && typeof endDate === 'string') {
        this.selectedDateRange = { start: startDate, end: endDate };
      }
    },
    
    // Navigate to previous week
    goToPreviousWeek() {
      const newStart = addDays(this.selectedWeekStart, -7);
      const newEnd = addDays(newStart, 6);
      this.setSelectedWeek(newStart, newEnd);
    },
    
    // Navigate to next week
    goToNextWeek() {
      const newStart = addDays(this.selectedWeekStart, 7);
      const newEnd = addDays(newStart, 6);
      this.setSelectedWeek(newStart, newEnd);
    },
    
    // Go to current week
    goToCurrentWeek() {
      this.setSelectedWeek(getCurrentWeek(), getCurrentWeekEnd());
    },
    
    // Backward compatibility for monthly views
    setSelectedMonth(ym) {
      if (typeof ym === 'string' && /^\d{4}-\d{2}$/.test(ym)) {
        this.selectedMonth = ym;
      }
    },

    // Clear all UI data (for logout) - resets to current week/month
    clearAllData() {
      this.selectedWeekStart = getCurrentWeek();
      this.selectedWeekEnd = getCurrentWeekEnd();
      this.selectedDateRange = {
        start: getCurrentWeek(),
        end: getCurrentWeekEnd()
      };
      this.selectedMonth = currentMonth();
    }
  }
});


