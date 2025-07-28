/**
 * Command error utilities
 *
 * Provides utilities for creating and handling command errors consistently
 */

import { CommandError, ErrorCode } from '../api-types';

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
  recovery_guidance,
  user_actionable,
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
  createCommandError(ErrorCode.INVALID_INPUT, `${field} is required`, guidance);

/**
 * Create file selection error
 */
export const createFileSelectionError = (message: string, guidance: string): CommandError =>
  createCommandError(ErrorCode.INVALID_INPUT, message, guidance);

/**
 * Create file format error
 */
export const createFileFormatError = (expectedFormat: string): CommandError =>
  createCommandError(
    ErrorCode.INVALID_FILE_FORMAT,
    `Selected file is not a valid ${expectedFormat} file`,
    `Please select a valid ${expectedFormat} file`,
  );
