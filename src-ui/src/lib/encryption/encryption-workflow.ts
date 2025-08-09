import { safeInvoke, safeListen } from '../tauri-safe';
import { ProgressUpdate } from '../api-types';

/**
 * Input for the encryption operation
 */
export interface EncryptionInput {
  key_id: string;
  file_paths: string[];
  output_name?: string;
  output_path?: string;
}

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
    // Call the backend command - the safeInvoke will wrap it in 'input' parameter
    const result = await safeInvoke<string>('encrypt_files', input, 'useFileEncryption');

    // Clean up progress listener on success
    unlisten();

    return result;
  } catch (error) {
    // Clean up progress listener on error
    unlisten();
    throw error;
  }
};
