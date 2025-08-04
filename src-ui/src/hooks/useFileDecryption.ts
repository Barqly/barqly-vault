import { useState, useCallback } from 'react';
import { safeInvoke, safeListen } from '../lib/tauri-safe';
import {
  CommandError,
  ErrorCode,
  DecryptionResult,
  ProgressUpdate,
  FileSelection,
} from '../lib/api-types';
import {
  createValidationError,
  createFileSelectionError,
  createFileFormatError,
  toCommandError,
} from '../lib/errors/command-error';

export interface FileDecryptionState {
  isLoading: boolean;
  error: CommandError | null;
  success: DecryptionResult | null;
  progress: ProgressUpdate | null;
  selectedFile: string | null;
  selectedKeyId: string | null;
  passphrase: string;
  outputPath: string | null;
}

export interface FileDecryptionActions {
  selectEncryptedFile: () => Promise<void>;
  setKeyId: (keyId: string) => void;
  setPassphrase: (passphrase: string) => void;
  setOutputPath: (path: string) => void;
  decryptFile: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
  clearSelection: () => void;
}

export interface UseFileDecryptionReturn extends FileDecryptionState, FileDecryptionActions {}

/**
 * Hook for managing file decryption workflow
 *
 * Provides a clean interface for decrypting files with:
 * - Encrypted file selection
 * - Key selection
 * - Passphrase input
 * - Output path selection
 * - Loading states
 * - Error handling with recovery guidance
 * - Progress tracking for long operations
 * - Success state management
 *
 * @example
 * ```tsx
 * const {
 *   selectEncryptedFile,
 *   setKeyId,
 *   setPassphrase,
 *   setOutputPath,
 *   decryptFile,
 *   isLoading,
 *   error,
 *   success,
 *   progress,
 *   selectedFile,
 *   selectedKeyId,
 *   passphrase,
 *   outputPath
 * } = useFileDecryption();
 *
 * const handleFileSelection = async () => {
 *   await selectEncryptedFile();
 * };
 *
 * const handleDecryption = async () => {
 *   await decryptFile();
 * };
 * ```
 */
export const useFileDecryption = (): UseFileDecryptionReturn => {
  const [state, setState] = useState<FileDecryptionState>({
    isLoading: false,
    error: null,
    success: null,
    progress: null,
    selectedFile: null,
    selectedKeyId: null,
    passphrase: '',
    outputPath: null,
  });

  const selectEncryptedFile = useCallback(async (): Promise<void> => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      // Call the backend command to select encrypted file
      const result = await safeInvoke<FileSelection>('select_files', 'Files', 'useFileDecryption');

      // For decryption, we expect only one .age file
      if (result.paths.length === 0) {
        throw createFileSelectionError(
          'No file selected',
          'Please select an encrypted .age file to decrypt',
        );
      }

      if (result.paths.length > 1) {
        throw createFileSelectionError(
          'Multiple files selected',
          'Please select only one encrypted .age file to decrypt',
        );
      }

      const selectedFile = result.paths[0];

      // Validate that the selected file is a .age file
      if (!selectedFile.toLowerCase().endsWith('.age')) {
        throw createFileFormatError('.age encrypted');
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        selectedFile,
      }));
    } catch (error) {
      const commandError = toCommandError(
        error,
        ErrorCode.INTERNAL_ERROR,
        'File selection failed',
        'Please try selecting the file again. If the problem persists, restart the application.',
      );

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: commandError,
      }));

      throw commandError;
    }
  }, []);

  const setKeyId = useCallback((keyId: string) => {
    setState((prev) => ({
      ...prev,
      selectedKeyId: keyId,
      error: null, // Clear any previous errors when user makes changes
    }));
  }, []);

  const setPassphrase = useCallback((passphrase: string) => {
    setState((prev) => ({
      ...prev,
      passphrase,
      error: null, // Clear any previous errors when user makes changes
    }));
  }, []);

  const setOutputPath = useCallback((path: string) => {
    setState((prev) => ({
      ...prev,
      outputPath: path,
      error: null, // Clear any previous errors when user makes changes
    }));
  }, []);

  const decryptFile = useCallback(async (): Promise<void> => {
    // Validate all required inputs
    if (!state.selectedFile) {
      const error = createValidationError(
        'Encrypted file',
        'Please select an encrypted .age file to decrypt',
      );
      setState((prev) => ({ ...prev, error }));
      throw error;
    }

    if (!state.selectedKeyId) {
      const error = createValidationError(
        'Decryption key',
        'Please select the key that was used to encrypt this file',
      );
      setState((prev) => ({ ...prev, error }));
      throw error;
    }

    if (!state.passphrase.trim()) {
      const error = createValidationError(
        'Passphrase',
        'Please enter the passphrase for the selected key',
      );
      setState((prev) => ({ ...prev, error }));
      throw error;
    }

    if (!state.outputPath) {
      const error = createValidationError(
        'Output directory',
        'Please select where to save the decrypted files',
      );
      setState((prev) => ({ ...prev, error }));
      throw error;
    }

    // Reset state for new operation
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      success: null,
      progress: null,
    }));

    try {
      // Set up progress listener for decryption
      const unlisten = await safeListen<ProgressUpdate>('decryption-progress', (event) => {
        setState((prev) => ({
          ...prev,
          progress: event.payload,
        }));
      });

      try {
        // Prepare the decryption input
        // Backend expects snake_case fields
        const decryptionInput = {
          encrypted_file: state.selectedFile,
          key_id: state.selectedKeyId || '',
          passphrase: state.passphrase,
          output_dir: state.outputPath || '',
        };

        // Call the backend command
        const result = await safeInvoke<DecryptionResult>(
          'decrypt_data',
          { ...decryptionInput },
          'useFileDecryption',
        );

        // Update success state
        setState((prev) => ({
          ...prev,
          isLoading: false,
          success: result,
          progress: null,
        }));

        // Clean up progress listener
        unlisten();
      } catch (commandError) {
        // Clean up progress listener on error
        unlisten();
        throw commandError;
      }
    } catch (error) {
      // Handle different types of errors
      const commandError = toCommandError(
        error,
        ErrorCode.DECRYPTION_FAILED,
        'File decryption failed',
        'Please check your key, passphrase, and file. If the problem persists, restart the application.',
      );

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: commandError,
        progress: null,
      }));

      // Re-throw for components that need to handle errors
      throw commandError;
    }
  }, [state.selectedFile, state.selectedKeyId, state.passphrase, state.outputPath]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      success: null,
      progress: null,
      selectedFile: null,
      selectedKeyId: null,
      passphrase: '',
      outputPath: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedFile: null,
      selectedKeyId: null,
      passphrase: '',
      outputPath: null,
    }));
  }, []);

  return {
    ...state,
    selectEncryptedFile,
    setKeyId: (keyId: string) => setKeyId(keyId),
    setPassphrase: (passphrase: string) => setPassphrase(passphrase),
    setOutputPath: (path: string) => setOutputPath(path),
    decryptFile,
    reset,
    clearError,
    clearSelection,
  };
};
