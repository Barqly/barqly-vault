/**
 * Command error utilities
 *
 * Provides utilities for creating and handling command errors consistently
 */

import { CommandError, ErrorCode } from '../../bindings';

/**
 * Create a command error with consistent structure
 */
export const createCommandError = (
  code: ErrorCode,
  message: string,
  recovery_guidance: string,
  user_actionable = true,
): CommandError => ({
  code,
  message,
  details: null,
  recovery_guidance,
  user_actionable,
  trace_id: null,
  span_id: null,
});

/**
 * Convert unknown errors to CommandError
 */
export const toCommandError = (
  error: unknown,
  defaultCode: ErrorCode,
  defaultMessage: string,
  defaultGuidance: string,
): CommandError => {
  if (error && typeof error === 'object' && 'code' in error) {
    return error as CommandError;
  }

  return createCommandError(
    defaultCode,
    error instanceof Error ? error.message : defaultMessage,
    defaultGuidance,
  );
};

/**
 * Create validation error for missing input
 */
export const createValidationError = (field: string, guidance: string): CommandError =>
  createCommandError('INVALID_INPUT', `${field} is required`, guidance);

/**
 * Create file selection error
 */
export const createFileSelectionError = (message: string, guidance: string): CommandError =>
  createCommandError('INVALID_INPUT', message, guidance);

/**
 * Create file format error
 */
export const createFileFormatError = (expectedFormat: string): CommandError =>
  createCommandError(
    'INVALID_FILE_FORMAT',
    `Selected file is not a valid ${expectedFormat} file`,
    `Please select a valid ${expectedFormat} file`,
  );
