import { CommandError, ErrorCode } from '../../bindings';
import { AlertCircle, AlertTriangle, Info, Shield } from 'lucide-react';

export type ErrorVariant = 'default' | 'warning' | 'info' | 'security';

export interface ParsedErrorInfo {
  message: string;
  code: ErrorCode | null;
  details?: string;
  recovery_guidance?: string;
  user_actionable: boolean;
}

/**
 * Parse error to get structured information
 */
export function parseError(error: CommandError | string): ParsedErrorInfo {
  if (typeof error === 'string') {
    return {
      message: error,
      code: null,
      user_actionable: true,
    };
  }
  return error;
}

/**
 * Determine error variant based on error code
 */
export function getErrorVariant(errorCode: ErrorCode | null): ErrorVariant {
  if (!errorCode) return 'default';

  // Security errors
  if (
    [
      'INVALID_KEY',
      'WRONG_PASSPHRASE',
      'TAMPERED_DATA',
      'UNAUTHORIZED_ACCESS',
    ].includes(errorCode)
  ) {
    return 'security';
  }

  // Warning-level errors
  if (
    [
      'WEAK_PASSPHRASE',
      'FILE_TOO_LARGE',
      'TOO_MANY_FILES',
      'CONCURRENT_OPERATION',
    ].includes(errorCode)
  ) {
    return 'warning';
  }

  // Info-level errors
  if (
    [
      'MISSING_PARAMETER',
      'INVALID_PATH',
      'KEY_NOT_FOUND',
      'FILE_NOT_FOUND',
    ].includes(errorCode)
  ) {
    return 'info';
  }

  return 'default';
}

/**
 * Get appropriate icon component based on variant
 */
export function getErrorIcon(variant: ErrorVariant) {
  switch (variant) {
    case 'warning':
      return AlertTriangle;
    case 'info':
      return Info;
    case 'security':
      return Shield;
    default:
      return AlertCircle;
  }
}

/**
 * Format error code for display
 */
export function formatErrorCode(code: ErrorCode): string {
  return code
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
