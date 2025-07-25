import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { CommandError, ErrorCode, EncryptionInput, ProgressUpdate } from '../lib/api-types';

// FileSelectionResponse interface for backend communication

interface FileSelectionResponse {
  paths: string[];
  selection_type: string;
  total_size: number;
  file_count: number;
}

interface FileEncryptionState {
  isLoading: boolean;
  error: CommandError | null;
  selectedFiles: FileSelectionResponse | null;
  success: string | null;
  progress: ProgressUpdate | null;
}

export interface FileEncryptionActions {
  selectFiles: (type: 'Files' | 'Folder') => Promise<void>;

  encryptFiles: (input: EncryptionInput) => Promise<void>;
  reset: () => void;
  clearError: () => void;
  clearSelection: () => void;
}

export interface UseFileEncryptionReturn extends FileEncryptionState, FileEncryptionActions {}

/**
 * Hook for file encryption operations
 *
 * Provides a clean interface for file encryption with:
 * - File selection (individual files or folders)
 * - Encryption with progress tracking
 * - Error handling and recovery
 * - State management
 */
export const useFileEncryption = (): UseFileEncryptionReturn => {
  const [state, setState] = useState<FileEncryptionState>({
    isLoading: false,
    error: null,
    selectedFiles: null,
    success: null,
    progress: null,
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

        // Mock success response
        const mockResult: FileSelectionResponse = {
          paths: ['/mock/file1.txt', '/mock/file2.txt'],
          selection_type: type,
          total_size: 2048,
          file_count: 2,
        };

        setState((prev) => ({
          ...prev,
          isLoading: false,
          selectedFiles: mockResult,
        }));

        return;
      }

      // Call the backend command
      const result = await invoke<FileSelectionResponse>('select_files', { type });

      setState((prev) => ({
        ...prev,
        isLoading: false,
        selectedFiles: result,
      }));
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

      // Re-throw for components that need to handle errors
      throw commandError;
    }
  }, []);

  const encryptFiles = useCallback(
    async (input: EncryptionInput): Promise<void> => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        progress: null,
      }));

      try {
        // Validate inputs
        if (!state.selectedFiles || state.selectedFiles.paths.length === 0) {
          throw {
            code: ErrorCode.INVALID_INPUT,
            message: 'No files selected for encryption',
            recovery_guidance: 'Please select files or folders to encrypt',
            user_actionable: true,
          } as CommandError;
        }

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
          // Simulate encryption delay
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Mock success response
          const mockResult = 'encrypted_file.age';

          setState((prev) => ({
            ...prev,
            isLoading: false,
            success: mockResult,
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
          // Call the backend command
          const result = await invoke<string>('encrypt_files', { input });

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
            message: error instanceof Error ? error.message : 'File encryption failed',
            recovery_guidance: 'Please try again. If the problem persists, check your system.',
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
      selectedFiles: null,
      success: null,
      progress: null,
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
      selectedFiles: null,
    }));
  }, []);

  return {
    ...state,
    selectFiles,
    encryptFiles,
    reset,
    clearError,
    clearSelection,
  };
};
