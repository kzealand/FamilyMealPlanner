/**
 * Date utilities for consistent date handling across the application
 * All dates are normalized to YYYY-MM-DD format for database storage
 */

/**
 * Normalize a date to YYYY-MM-DD format
 * @param {Date|string} date - Date object or date string
 * @returns {string} Date in YYYY-MM-DD format
 */
function normalizeDate(date) {
  if (!date) {
    throw new Error('Date is required');
  }
  
  let dateObj;
  
  if (typeof date === 'string') {
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    
    // Parse the string to a Date object
    dateObj = new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      throw new Error(`Invalid date string: ${date}`);
    }
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    throw new Error('Date must be a Date object or string');
  }
  
  // Convert to YYYY-MM-DD format using UTC to avoid timezone issues
  const year = dateObj.getUTCFullYear();
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get the start of the week (Sunday) for a given date
 * @param {Date|string} date - Date object or date string
 * @returns {string} Week start date in YYYY-MM-DD format
 */
function getWeekStartDate(date) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const dayOfWeek = dateObj.getUTCDay(); // 0 = Sunday, 6 = Saturday
  const daysToSubtract = dayOfWeek;
  
  const weekStart = new Date(dateObj);
  weekStart.setUTCDate(dateObj.getUTCDate() - daysToSubtract);
  
  return normalizeDate(weekStart);
}

/**
 * Validate that a date string is in YYYY-MM-DD format
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidDateString(dateString) {
  if (typeof dateString !== 'string') {
    return false;
  }
  
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Format a date for display (e.g., "Sunday, July 6, 2025")
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
function formatDateForDisplay(dateString) {
  const date = new Date(dateString + 'T00:00:00Z');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Get the day of week (0-6) for a date
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {number} Day of week (0 = Sunday, 6 = Saturday)
 */
function getDayOfWeek(dateString) {
  const date = new Date(dateString + 'T00:00:00Z');
  return date.getUTCDay();
}

/**
 * Add days to a date
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @param {number} days - Number of days to add (can be negative)
 * @returns {string} New date in YYYY-MM-DD format
 */
function addDays(dateString, days) {
  const date = new Date(dateString + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return normalizeDate(date);
}

/**
 * Get all dates in a week
 * @param {string} weekStartDate - Week start date in YYYY-MM-DD format
 * @returns {string[]} Array of 7 dates in YYYY-MM-DD format
 */
function getWeekDates(weekStartDate) {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(weekStartDate, i));
  }
  return dates;
}

module.exports = {
  normalizeDate,
  getWeekStartDate,
  isValidDateString,
  formatDateForDisplay,
  getDayOfWeek,
  addDays,
  getWeekDates
}; 