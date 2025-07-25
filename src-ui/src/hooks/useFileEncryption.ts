import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  CommandError,
  ErrorCode,
  EncryptionInput,
  ProgressUpdate,
} from '../lib/api-types';

// Define a simplified file selection type for the UI
interface FileSelection {
  paths: string[];
  total_size: number;
  file_count: number;
  selection_type: string;
}

interface FileEncryptionState {
  isLoading: boolean;
  error: CommandError | null;
  success: string | null; // Path to encrypted file
  progress: ProgressUpdate | null;
  selectedFiles: FileSelection | null;
}

export interface FileEncryptionActions {
  selectFiles: (type: 'Files' | 'Folder') => Promise<void>;
  encryptFiles: (input: Omit<EncryptionInput, 'files'>) => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

export interface UseFileEncryptionReturn extends FileEncryptionState, FileEncryptionActions {}

/**
 * Hook for managing file encryption workflow
 *
 * Provides a clean interface for encrypting files with:
 * - File/folder selection
 * - Loading states
 * - Error handling with recovery guidance
 * - Progress tracking for long operations
 * - Success state management
 *
 * @example
 * ```tsx
 * const {
 *   selectFiles,
 *   encryptFiles,
 *   isLoading,
 *   error,
 *   success,
 *   progress,
 *   selectedFiles
 * } = useFileEncryption();
 *
 * const handleFileSelection = async () => {
 *   await selectFiles('Files');
 * };
 *
 * const handleEncryption = async (keyId: string, outputPath: string) => {
 *   await encryptFiles({ key_id: keyId, output_path: outputPath, compression_level: 6 });
 * };
 * ```
 */
export const useFileEncryption = (): UseFileEncryptionReturn => {
  const [state, setState] = useState<FileEncryptionState>({
    isLoading: false,
    error: null,
    success: null,
    progress: null,
    selectedFiles: null,
  });

  const selectFiles = useCallback(async (type: 'Files' | 'Folder'): Promise<void> => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      // If in browser environment, use mock data
      if (
        typeof window !== 'undefined' &&
        !(window as any).__TAURI__ &&
        typeof process === 'undefined'
      ) {
        // Simulate file selection delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Mock file selection result
        const mockResult: FileSelection = {
          paths:
            type === 'Files'
              ? [
                  '/Users/demo/Documents/bitcoin-wallet.dat',
                  '/Users/demo/Documents/seed-phrase.txt',
                  '/Users/demo/Pictures/private-key.png',
                ]
              : ['/Users/demo/Documents/bitcoin-backup/'],
          total_size: type === 'Files' ? 2048576 : 10485760, // 2MB for files, 10MB for folder
          file_count: type === 'Files' ? 3 : 15,
          selection_type: type,
        };

        setState((prev) => ({
          ...prev,
          isLoading: false,
          selectedFiles: mockResult,
        }));

        return;
      }

      // Call the backend command to select files (Tauri desktop only)
      const result = await invoke<FileSelection>('select_files', { selection_type: type });

      setState((prev) => ({
        ...prev,
        isLoading: false,
        selectedFiles: result,
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
            'Please try selecting files again. If the problem persists, restart the application.',
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

  const encryptFiles = useCallback(
    async (input: Omit<EncryptionInput, 'files'>): Promise<void> => {
      if (!state.selectedFiles || state.selectedFiles.paths.length === 0) {
        const error: CommandError = {
          code: ErrorCode.INVALID_INPUT,
          message: 'No files selected for encryption',
          recovery_guidance: 'Please select files or folders to encrypt',
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
        // Validate input before sending to backend
        if (!input.key_id?.trim()) {
          throw {
            code: ErrorCode.INVALID_INPUT,
            message: 'Encryption key is required',
            recovery_guidance: 'Please select an encryption key',
            user_actionable: true,
          } as CommandError;
        }

        if (!input.output_path?.trim()) {
          throw {
            code: ErrorCode.INVALID_INPUT,
            message: 'Output path is required',
            recovery_guidance: 'Please specify where to save the encrypted file',
            user_actionable: true,
          } as CommandError;
        }

        if (input.compression_level < 0 || input.compression_level > 9) {
          throw {
            code: ErrorCode.INVALID_INPUT,
            message: 'Compression level must be between 0 and 9',
            recovery_guidance:
              'Please choose a compression level between 0 (no compression) and 9 (maximum compression)',
            user_actionable: true,
          } as CommandError;
        }

        // If in browser environment, use mock data
        if (
          typeof window !== 'undefined' &&
          !(window as any).__TAURI__ &&
          typeof process === 'undefined'
        ) {
          // Simulate encryption progress
          const progressSteps = [
            { progress: 0.1, message: 'Validating file selection...' },
            { progress: 0.2, message: 'Creating archive...' },
            { progress: 0.4, message: 'Compressing files...' },
            { progress: 0.6, message: 'Encrypting data...' },
            { progress: 0.8, message: 'Writing encrypted file...' },
            { progress: 1.0, message: 'Encryption completed!' },
          ];

          for (const step of progressSteps) {
            setState((prev) => ({
              ...prev,
              progress: {
                operation_id: 'mock-encryption',
                progress: step.progress,
                message: step.message,
                timestamp: new Date().toISOString(),
              },
            }));
            await new Promise((resolve) => setTimeout(resolve, 800)); // Simulate delay
          }

          // Mock success response
          const mockResult = {
            encrypted_file_path: input.output_path || '/path/to/encrypted.age',
            original_file_count: state.selectedFiles!.file_count,
            total_size_encrypted: state.selectedFiles!.total_size,
          };

          setState((prev) => ({
            ...prev,
            isLoading: false,
            success: mockResult.encrypted_file_path,
            progress: null,
          }));

          return;
        }

        // Create a progress listener
        const unlisten = await listen<ProgressUpdate>('encryption-progress', (event) => {
          setState((prev) => ({
            ...prev,
            progress: event.payload,
          }));
        });

        try {
          // Prepare the complete input with selected files
          const encryptionInput: EncryptionInput = {
            ...input,
            files: state.selectedFiles!.paths,
          };

          // Call the backend command
          const result = await invoke<string>('encrypt_files', { input: encryptionInput });

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
            code: ErrorCode.INTERNAL_ERROR,
            message: error instanceof Error ? error.message : 'Encryption failed',
            recovery_guidance:
              'Please try again. If the problem persists, check your file permissions.',
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
    },
    [state.selectedFiles],
  );

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      success: null,
      progress: null,
      selectedFiles: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    ...state,
    selectFiles,
    encryptFiles,
    reset,
    clearError,
  };
};
