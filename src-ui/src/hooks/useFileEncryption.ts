import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  CommandError,
  ErrorCode,
  EncryptDataInput,
  ProgressUpdate,
  FileSelection,
} from '../lib/api-types';

// Check if we're in a browser environment (not Tauri desktop)
// In test environment, we should use the real Tauri commands
const isBrowser =
  typeof window !== 'undefined' && !(window as any).__TAURI__ && typeof process === 'undefined';

interface FileEncryptionState {
  isLoading: boolean;
  error: CommandError | null;
  selectedFiles: FileSelection | null;
  success: string | null; // Backend returns string path
  progress: ProgressUpdate | null;
}

export interface FileEncryptionActions {
  selectFiles: (selectionType: 'Files' | 'Folder') => Promise<void>;
  encryptFiles: (keyId: string, outputPath: string, outputName?: string) => Promise<void>;
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

  const selectFiles = useCallback(async (selectionType: 'Files' | 'Folder'): Promise<void> => {
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

        // Mock success response
        const mockResult: FileSelection = {
          paths: ['/mock/file1.txt', '/mock/file2.txt'],
          selection_type: selectionType,
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
      const result = await invoke<FileSelection>('select_files', {
        selection_type: selectionType,
      });

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
    async (keyId: string, outputPath: string, outputName?: string): Promise<void> => {
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

        if (!keyId?.trim()) {
          throw {
            code: ErrorCode.INVALID_INPUT,
            message: 'Encryption key is required',
            recovery_guidance: 'Please select an encryption key',
            user_actionable: true,
          } as CommandError;
        }

        if (!outputPath?.trim()) {
          throw {
            code: ErrorCode.INVALID_INPUT,
            message: 'Output path is required',
            recovery_guidance: 'Please specify where to save the encrypted file',
            user_actionable: true,
          } as CommandError;
        }

        // If in browser environment, use mock data
        if (isBrowser) {
          // Simulate encryption delay
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Mock success response - backend returns just the path
          const mockResult = '/mock/encrypted.age';

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
          // Prepare the input for the backend command
          const encryptInput: EncryptDataInput = {
            key_id: keyId,
            file_paths: state.selectedFiles.paths,
            output_name: outputName,
          };

          // Call the backend command
          const result = await invoke<string>('encrypt_files', { ...encryptInput });

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
