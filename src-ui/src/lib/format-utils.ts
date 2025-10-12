/**
 * Formatting utilities for consistent display across the application
 */

import { formatDistanceToNow } from 'date-fns';

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

/**
 * Format bytes to human-readable size (alias for formatFileSize for consistency)
 * @param bytes - Number of bytes
 * @returns Formatted string like "125 MB", "2.3 GB", etc.
 */
export const formatBytes = formatFileSize;

/**
 * Format date to relative time
 * @param date - ISO date string or null
 * @returns Formatted string like "2 hours ago" or "Never"
 */
export const formatLastEncrypted = (date: string | null): string => {
  if (!date) return 'Never';

  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Unknown';
  }
};

/**
 * Format file count for display
 * @param count - Number of files
 * @returns Formatted string like "42 files", "1 file", "No files"
 */
export const formatFileCount = (count: number): string => {
  if (count === 0) return 'No files';
  if (count === 1) return '1 file';
  return `${count} files`;
};

/**
 * Get vault status badge configuration
 * Maps backend vault status to user-friendly UI labels
 * @param status - Vault status from backend
 * @returns Badge configuration with label, color, and description
 */
export const getVaultStatusBadge = (status: string) => {
  switch (status) {
    case 'new':
      return {
        label: 'New',
        color: 'gray',
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-700',
        borderClass: 'border-gray-300',
        description: 'Never encrypted',
      };
    case 'active':
      return {
        label: 'Active',
        color: 'green',
        bgClass: 'bg-green-100',
        textClass: 'text-green-700',
        borderClass: 'border-green-300',
        description: 'Ready to use',
      };
    case 'orphaned':
      // Backend uses "orphaned" but UI shows "No Keys" (more user-friendly)
      return {
        label: 'No Keys',
        color: 'red',
        bgClass: 'bg-red-100',
        textClass: 'text-red-700',
        borderClass: 'border-red-300',
        description: 'No keys attached to vault',
      };
    case 'incomplete':
      return {
        label: 'Setup Needed',
        color: 'yellow',
        bgClass: 'bg-yellow-100',
        textClass: 'text-yellow-700',
        borderClass: 'border-yellow-300',
        description: 'Vault configuration incomplete',
      };
    default:
      return {
        label: 'Unknown',
        color: 'gray',
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-700',
        borderClass: 'border-gray-300',
        description: 'Status unknown',
      };
  }
};

/**
 * Get key lifecycle status badge configuration
 * Maps NIST-aligned key lifecycle states to UI badges
 * Reference: docs/architecture/key-lifecycle-management.md
 *
 * @param status - Key lifecycle status from backend
 * @returns Badge configuration with label, color, icon, and user message
 */
export const getKeyLifecycleStatusBadge = (status: string) => {
  switch (status) {
    case 'pre_activation':
      return {
        label: 'New',
        color: 'gray',
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-700',
        icon: '○',
        userMessage: 'Ready to use - attach to a vault',
        description: 'Key generated but never used',
      };
    case 'active':
      return {
        label: 'Active',
        color: 'green',
        bgClass: 'bg-green-100',
        textClass: 'text-green-700',
        icon: '●',
        userMessage: 'Available for encryption',
        description: 'Currently attached to vault(s)',
      };
    case 'suspended':
      return {
        label: 'Suspended',
        color: 'yellow',
        bgClass: 'bg-yellow-100',
        textClass: 'text-yellow-700',
        icon: '⏸',
        userMessage: 'Temporarily disabled',
        description: 'Key is temporarily unavailable',
      };
    case 'deactivated':
      return {
        label: 'Deactivated',
        color: 'red',
        bgClass: 'bg-red-100',
        textClass: 'text-red-700',
        icon: '⊘',
        userMessage: 'Permanently disabled - deletion pending',
        description: '30-day retention before destruction',
      };
    case 'compromised':
      return {
        label: 'Compromised',
        color: 'red',
        bgClass: 'bg-red-100',
        textClass: 'text-red-700',
        icon: '⚠',
        userMessage: 'Security issue - do not use',
        description: 'Security breach detected',
      };
    default:
      return {
        label: 'Unknown',
        color: 'gray',
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-700',
        icon: '?',
        userMessage: 'Status unknown',
        description: 'Unexpected key status',
      };
  }
};
