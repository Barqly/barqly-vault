import { useState, useCallback } from 'react';
import { CommandError, ErrorCode } from '../bindings';
import { toCommandError } from '../lib/errors/command-error';
import { getFileInfoForEncryption } from '../lib/encryption/file-operations';
import { executeEncryptionWithProgress } from '../lib/encryption/encryption-workflow';
import {
  validateEncryptionInputs,
  prepareEncryptionInput,
} from '../lib/validation/encryption-validation';
import {
  FileEncryptionState,
  createInitialEncryptionState,
  encryptionStateUpdates,
} from '../lib/encryption/state-management';

// Re-export FileEncryptionState for consumers
export type { FileEncryptionState };

export interface FileEncryptionActions {
  selectFiles: (paths: string[], selectionType: 'Files' | 'Folder') => Promise<void>;
  encryptFiles: (keyId: string, outputName?: string, outputPath?: string) => Promise<void>;
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
  const [state, setState] = useState<FileEncryptionState>(createInitialEncryptionState());

  const selectFiles = useCallback(
    async (paths: string[], selectionType: 'Files' | 'Folder'): Promise<void> => {
      // Comprehensive logging at entry point
      console.log('[useFileEncryption] selectFiles called with:', {
        paths,
        selectionType,
        timestamp: Date.now(),
        pathCount: paths.length,
        firstPath: paths[0],
      });

      setState(encryptionStateUpdates.startLoading);

      try {
        const fileSelection = await getFileInfoForEncryption(paths, selectionType);
        setState((prev) => encryptionStateUpdates.setSelectedFiles(prev, fileSelection));
        console.log('[useFileEncryption] State updated successfully with selected files');
      } catch (error) {
        console.error('[useFileEncryption] Error in selectFiles:', {
          error,
          errorType: typeof error,
          errorMessage: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
        });

        const commandError = toCommandError(
          error,
          ErrorCode.INTERNAL_ERROR,
          'File selection failed',
          'Please try selecting files again. If the problem persists, restart the application.',
        );

        setState((prev) => encryptionStateUpdates.setError(prev, commandError));
        throw commandError;
      }
    },
    [],
  );

  const encryptFiles = useCallback(
    async (keyId: string, outputName?: string, outputPath?: string): Promise<void> => {
      // Validate all required inputs
      const validation = validateEncryptionInputs(state, keyId);

      if (!validation.isValid) {
        setState((prev) => encryptionStateUpdates.setError(prev, validation.error!));
        throw validation.error;
      }

      setState(encryptionStateUpdates.startEncryption);

      try {
        // Prepare and execute encryption
        const encryptionInput = prepareEncryptionInput(
          state.selectedFiles!,
          keyId,
          outputName,
          outputPath,
        );

        const result = await executeEncryptionWithProgress(encryptionInput, (progress) =>
          setState((prev) => encryptionStateUpdates.updateProgress(prev, progress)),
        );

        setState((prev) => encryptionStateUpdates.setSuccess(prev, result));
      } catch (error) {
        // Handle errors - they're already properly formatted by executeEncryption
        const commandError =
          error instanceof Object && 'code' in error
            ? (error as CommandError)
            : toCommandError(
                error,
                ErrorCode.INTERNAL_ERROR,
                'File encryption failed',
                'Please try again. If the problem persists, check your system.',
              );

        setState((prev) => encryptionStateUpdates.setError(prev, commandError));
        throw commandError;
      }
    },
    [state],
  );

  const reset = useCallback(() => {
    setState(createInitialEncryptionState());
  }, []);

  const clearError = useCallback(() => {
    setState(encryptionStateUpdates.clearError);
  }, []);

  const clearSelection = useCallback(() => {
    setState(encryptionStateUpdates.clearSelection);
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
