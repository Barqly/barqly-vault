/**
 * Formatting utilities for consistent display across the application
 */

/**
 * Format bytes into human-readable file size
 * @param bytes - Size in bytes
 * @returns Formatted string like "1.5 MB"
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format duration in seconds to human-readable format
 * @param seconds - Duration in seconds
 * @returns Formatted string like "1m 30s"
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
};

/**
 * Format date to localized string
 * @param date - Date object or ISO string
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Format timestamp to localized string with time
 * @param timestamp - Date object or ISO string
 * @returns Formatted timestamp string
 */
export const formatTimestamp = (timestamp: Date | string): string => {
  const dateObj = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return dateObj.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Truncate long text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength - 3)}...`;
};

/**
 * Format percentage with specified decimal places
 * @param value - Value between 0 and 1
 * @param decimals - Number of decimal places (default: 0)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};
