import { safeListen } from '../tauri-safe';
import { commands, EncryptDataInput } from '../../bindings';
import { ProgressUpdate } from '../api-types';
import { logger } from '../logger';

/**
 * Input for the encryption operation
 * Now uses the generated EncryptDataInput type
 */
export type EncryptionInput = EncryptDataInput;

/**
 * Executes file encryption with progress tracking
 *
 * @param input - The encryption input parameters
 * @param onProgress - Callback for progress updates
 * @returns The path to the encrypted output file
 */
export const executeEncryptionWithProgress = async (
  input: EncryptionInput,
  onProgress: (progress: ProgressUpdate) => void,
): Promise<string> => {
  // Create a progress listener
  const unlisten = await safeListen<ProgressUpdate>('encryption-progress', (event) => {
    onProgress(event.payload);
  });

  try {
    logger.debug('encryption-workflow', 'Starting encryption', { input });

    // Call the backend command using generated function
    const result = await commands.encryptFiles(input);

    if (result.status === 'error') {
      throw new Error(result.error.message || 'Encryption failed');
    }

    // Clean up progress listener on success
    unlisten();

    return result.data;
  } catch (error) {
    // Clean up progress listener on error
    unlisten();
    logger.error('encryption-workflow', 'Encryption failed', error as Error);
    throw error;
  }
};
