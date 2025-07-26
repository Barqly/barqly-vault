import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  CommandError,
  ErrorCode,
  DecryptionResult,
  DecryptDataInput,
  ProgressUpdate,
  FileSelection,
} from '../lib/api-types';

// Check if we're in a browser environment (not Tauri desktop)
// In test environment, we should use the real Tauri commands
const isBrowser =
  typeof window !== 'undefined' && !(window as any).__TAURI__ && typeof process === 'undefined';

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
      // If in browser environment, use mock data
      if (isBrowser) {
        // Simulate file selection delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Mock encrypted file selection
        const selectedFile = '/Users/demo/Documents/bitcoin-backup-encrypted.age';

        setState((prev) => ({
          ...prev,
          isLoading: false,
          selectedFile,
        }));

        return;
      }

      // Call the backend command to select encrypted file (Tauri desktop only)
      const result = await invoke<FileSelection>('select_files', {
        selection_type: 'Files',
      });

      // For decryption, we expect only one .age file
      if (result.paths.length === 0) {
        throw {
          code: ErrorCode.INVALID_INPUT,
          message: 'No file selected',
          recovery_guidance: 'Please select an encrypted .age file to decrypt',
          user_actionable: true,
        } as CommandError;
      }

      if (result.paths.length > 1) {
        throw {
          code: ErrorCode.INVALID_INPUT,
          message: 'Multiple files selected',
          recovery_guidance: 'Please select only one encrypted .age file to decrypt',
          user_actionable: true,
        } as CommandError;
      }

      const selectedFile = result.paths[0];

      // Validate that the selected file is a .age file
      if (!selectedFile.toLowerCase().endsWith('.age')) {
        throw {
          code: ErrorCode.INVALID_FILE_FORMAT,
          message: 'Selected file is not an encrypted .age file',
          recovery_guidance: 'Please select a valid .age encrypted file',
          user_actionable: true,
        } as CommandError;
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        selectedFile,
      }));
    } catch (error) {
      let commandError: CommandError;

      if (error && typeof error === 'object' && 'code' in error) {
        commandError = error as CommandError;
      } else {
        commandError = {
          code: ErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'File selection failed',
          recovery_guidance:
            'Please try selecting the file again. If the problem persists, restart the application.',
          user_actionable: true,
        };
      }

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
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: 'No encrypted file selected',
        recovery_guidance: 'Please select an encrypted .age file to decrypt',
        user_actionable: true,
      };

      setState((prev) => ({
        ...prev,
        error,
      }));

      throw error;
    }

    if (!state.selectedKeyId) {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: 'No decryption key selected',
        recovery_guidance: 'Please select the key that was used to encrypt this file',
        user_actionable: true,
      };

      setState((prev) => ({
        ...prev,
        error,
      }));

      throw error;
    }

    if (!state.passphrase.trim()) {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: 'Passphrase is required',
        recovery_guidance: 'Please enter the passphrase for the selected key',
        user_actionable: true,
      };

      setState((prev) => ({
        ...prev,
        error,
      }));

      throw error;
    }

    if (!state.outputPath) {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: 'Output directory is required',
        recovery_guidance: 'Please select where to save the decrypted files',
        user_actionable: true,
      };

      setState((prev) => ({
        ...prev,
        error,
      }));

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
      // If in browser environment, use mock data
      if (isBrowser) {
        // Simulate decryption progress
        const progressSteps = [
          { progress: 0.1, message: 'Loading encrypted file...' },
          { progress: 0.2, message: 'Validating key and passphrase...' },
          { progress: 0.4, message: 'Decrypting data...' },
          { progress: 0.6, message: 'Extracting archive...' },
          { progress: 0.8, message: 'Verifying file integrity...' },
          { progress: 1.0, message: 'Decryption completed!' },
        ];

        for (const step of progressSteps) {
          setState((prev) => ({
            ...prev,
            progress: {
              operation_id: 'mock-decryption',
              progress: step.progress,
              message: step.message,
              timestamp: new Date().toISOString(),
            },
          }));
          await new Promise((resolve) => setTimeout(resolve, 700)); // Simulate delay
        }

        // Mock success response
        const mockResult: DecryptionResult = {
          extracted_files: [
            '/Users/demo/Documents/bitcoin-wallet.dat',
            '/Users/demo/Documents/seed-phrase.txt',
            '/Users/demo/Documents/private-key.png',
            '/Users/demo/Documents/manifest.json',
          ],
          output_dir: '/Users/demo/Documents',
          manifest_verified: true,
        };

        setState((prev) => ({
          ...prev,
          isLoading: false,
          success: mockResult,
          progress: null,
        }));

        return;
      }

      // Set up progress listener for decryption (Tauri desktop only)
      const unlisten = await listen<ProgressUpdate>('decryption-progress', (event) => {
        setState((prev) => ({
          ...prev,
          progress: event.payload,
        }));
      });

      try {
        // Prepare the decryption input
        const decryptionInput: DecryptDataInput = {
          encrypted_file: state.selectedFile,
          key_id: state.selectedKeyId || '',
          passphrase: state.passphrase,
          output_dir: state.outputPath || '',
        };

        // Call the backend command
        const result = await invoke<DecryptionResult>('decrypt_data', { ...decryptionInput });

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
      let commandError: CommandError;

      if (error && typeof error === 'object' && 'code' in error) {
        // This is already a CommandError
        commandError = error as CommandError;
      } else {
        // Convert generic errors to CommandError
        commandError = {
          code: ErrorCode.DECRYPTION_FAILED,
          message: error instanceof Error ? error.message : 'File decryption failed',
          recovery_guidance:
            'Please check your key, passphrase, and file. If the problem persists, restart the application.',
          user_actionable: true,
        };
      }

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
