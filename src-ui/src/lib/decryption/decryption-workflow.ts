/**
 * Core decryption workflow logic
 */

import { safeListen } from '../tauri-safe';
import { commands, DecryptDataInput, DecryptionResult } from '../../bindings';
import type { GetProgressResponse, CommandError } from '../../bindings';
import { logger } from '../logger';
import { toCommandError } from '../errors/command-error';
import { UnlistenFn } from '@tauri-apps/api/event';

/**
 * Input for decryption operation
 * Now uses the generated DecryptDataInput type
 */
export type DecryptionWorkflowInput = DecryptDataInput;

export interface DecryptionWorkflowResult {
  success: DecryptionResult | null;
  error: CommandError | null;
}

/**
 * Sets up a progress listener for decryption operations
 * Returns the unlisten function to clean up the listener
 */
export const setupDecryptionProgressListener = async (
  onProgress: (progress: GetProgressResponse) => void,
): Promise<UnlistenFn> => {
  return await safeListen<GetProgressResponse>('decryption-progress', (event) => {
    onProgress(event.payload);
  });
};

/**
 * Executes the core decryption workflow
 * Handles the backend command invocation and error transformation
 */
export const executeDecryption = async (
  input: DecryptionWorkflowInput,
): Promise<DecryptionResult> => {
  try {
    logger.debug('decryption-workflow', 'Starting decryption', { input });

    // Call the backend command using generated function
    const result = await commands.decryptData(input);

    if (result.status === 'error') {
      // Preserve the backend error message for pattern matching in getUserFriendlyError()
      const backendMessage = result.error.message || 'Decryption failed';

      logger.error('decryption-workflow', 'Backend returned error', {
        code: result.error.code,
        message: backendMessage,
      });

      throw toCommandError(
        new Error(backendMessage),
        'DECRYPTION_FAILED',
        backendMessage, // Use backend message, not generic override
        'Please check your key, passphrase, and file. If the problem persists, restart the application.',
      );
    }

    return result.data;
  } catch (error) {
    logger.error('decryption-workflow', 'Decryption failed', error as Error);
    // Transform and re-throw the error with appropriate context
    throw toCommandError(
      error,
      'DECRYPTION_FAILED',
      'File decryption failed',
      'Please check your key, passphrase, and file. If the problem persists, restart the application.',
    );
  }
};

/**
 * Executes decryption with progress tracking
 * Combines progress listener setup with decryption execution
 */
export const executeDecryptionWithProgress = async (
  input: DecryptionWorkflowInput,
  onProgress: (progress: GetProgressResponse) => void,
): Promise<DecryptionResult> => {
  // Set up progress listener
  const unlisten = await setupDecryptionProgressListener(onProgress);

  try {
    // Execute decryption
    const result = await executeDecryption(input);

    // Clean up listener on success
    unlisten();

    return result;
  } catch (error) {
    // Clean up listener on error
    unlisten();
    throw error;
  }
};

/**
 * Analyzes decryption errors for specific handling
 * Returns error type and recovery suggestions
 */
export const analyzeDecryptionError = (
  error: unknown,
): {
  type: 'passphrase' | 'permission' | 'corruption' | 'unknown';
  message: string;
  recovery: string;
} => {
  if (!error || typeof error !== 'object') {
    return {
      type: 'unknown',
      message: 'An unexpected error occurred',
      recovery: 'Please try again or restart the application',
    };
  }

  const errorMessage =
    'message' in error && typeof error.message === 'string' ? error.message.toLowerCase() : '';

  if (errorMessage.includes('passphrase')) {
    return {
      type: 'passphrase',
      message: 'Invalid passphrase',
      recovery: 'Please check your passphrase and try again',
    };
  }

  if (errorMessage.includes('permission') || errorMessage.includes('access')) {
    return {
      type: 'permission',
      message: 'Permission denied',
      recovery: 'Please check file permissions and try again',
    };
  }

  if (errorMessage.includes('corrupt') || errorMessage.includes('invalid')) {
    return {
      type: 'corruption',
      message: 'File may be corrupted',
      recovery: 'The encrypted file may be damaged. Try using a backup if available',
    };
  }

  return {
    type: 'unknown',
    message: 'Decryption failed',
    recovery: 'Please check your inputs and try again',
  };
};
