/**
 * Utility Functions
 * 
 * Shared utility functions used throughout the application.
 * 
 * @module utils
 */

/**
 * Format a number as currency
 * 
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string (e.g., "$1,234")
 */
export function formatCurrency(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Format a number as percentage
 * 
 * @param value - Decimal value (0.5 = 50%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "50.0%")
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a number with +/- sign for P/L display
 * 
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted string (e.g., "+$123" or "-$68")
 */
export function formatPnL(value: number, decimals: number = 0): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatCurrency(value, decimals)}`;
}

/**
 * Format a date as ISO8601 string (YYYY-MM-DD)
 * 
 * @param date - Date object or ISO string
 * @returns ISO date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Format a date with time for display
 * 
 * @param date - Date object or ISO string
 * @returns Formatted string (e.g., "Nov 30, 2024 12:00 PM")
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
}

/**
 * Calculate time until next Sunday at midnight UTC
 * 
 * @returns Object with days, hours, minutes, seconds
 */
export function getTimeUntilNextSunday(): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total_ms: number;
} {
  const now = new Date();
  const nextSunday = new Date(now);
  
  // Find next Sunday
  const daysUntilSunday = (7 - now.getUTCDay()) % 7 || 7;
  nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
  nextSunday.setUTCHours(0, 0, 0, 0);
  
  const diff = nextSunday.getTime() - now.getTime();
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds, total_ms: diff };
}

/**
 * Calculate week number within a cohort
 * 
 * @param cohortStartDate - When the cohort started
 * @param currentDate - Current date (defaults to now)
 * @returns Week number (1-based)
 */
export function calculateWeekNumber(
  cohortStartDate: string | Date,
  currentDate: Date = new Date()
): number {
  const start = typeof cohortStartDate === 'string' 
    ? new Date(cohortStartDate) 
    : cohortStartDate;
  
  const diffMs = currentDate.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return Math.floor(diffDays / 7) + 1;
}

/**
 * Sleep for a specified duration
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the delay
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in ms (doubles each retry)
 * @returns Result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Truncate a string to a maximum length
 * 
 * @param str - String to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add if truncated (default: "...")
 * @returns Truncated string
 */
export function truncate(
  str: string,
  maxLength: number,
  suffix: string = '...'
): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Parse JSON safely, returning null on error
 * 
 * @param str - JSON string to parse
 * @returns Parsed object or null
 */
export function safeJsonParse<T>(str: string): T | null {
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

/**
 * Check if a date string is in the past
 * 
 * @param dateStr - ISO date string
 * @returns True if the date is in the past
 */
export function isPast(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

/**
 * Check if a date string is in the future
 * 
 * @param dateStr - ISO date string
 * @returns True if the date is in the future
 */
export function isFuture(dateStr: string): boolean {
  return new Date(dateStr) > new Date();
}

/**
 * Get current timestamp as ISO8601 string
 * 
 * @returns ISO8601 timestamp
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Get today's date as YYYY-MM-DD
 * 
 * @returns Date string
 */
export function today(): string {
  return formatDate(new Date());
}

/**
 * Get current timestamp as YYYY-MM-DD HH:MM:SS
 *
 * @returns Timestamp string
 */
export function nowTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Calculate percentage change
 *
 * @param oldValue - Original value
 * @param newValue - New value
 * @returns Percentage change as decimal (0.1 = 10%)
 */
export function percentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return (newValue - oldValue) / oldValue;
}

/**
 * Clamp a number to a range
 * 
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Round a number to a specific number of decimal places
 * 
 * @param value - Value to round
 * @param decimals - Number of decimal places
 * @returns Rounded value
 */
export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Group an array by a key function
 * 
 * @param array - Array to group
 * @param keyFn - Function to extract key
 * @returns Object with grouped items
 */
export function groupBy<T>(
  array: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  return array.reduce((result, item) => {
    const key = keyFn(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Sort an array by a key function
 * 
 * @param array - Array to sort
 * @param keyFn - Function to extract sort key
 * @param descending - Sort descending (default: false)
 * @returns Sorted array (new array, original unchanged)
 */
export function sortBy<T>(
  array: T[],
  keyFn: (item: T) => number | string,
  descending: boolean = false
): T[] {
  const sorted = [...array].sort((a, b) => {
    const keyA = keyFn(a);
    const keyB = keyFn(b);
    
    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return 0;
  });
  
  return descending ? sorted.reverse() : sorted;
}



