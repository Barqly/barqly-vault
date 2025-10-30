import { useState, useCallback } from 'react';
import type { CommandError } from '../bindings';
import { toCommandError } from '../lib/errors/command-error';
import { selectEncryptedFileForDecryption } from '../lib/decryption/file-operations';
import {
  validateDecryptionInputs,
  prepareDecryptionInput,
} from '../lib/validation/decryption-validation';
import { executeDecryptionWithProgress } from '../lib/decryption/decryption-workflow';
import {
  FileDecryptionState,
  createInitialDecryptionState,
  decryptionStateUpdates,
} from '../lib/decryption/state-management';

// Re-export FileDecryptionState for consumers
export type { FileDecryptionState };

export interface FileDecryptionActions {
  selectEncryptedFile: () => Promise<void>;
  setSelectedFile: (path: string) => void;
  setKeyId: (keyId: string) => void;
  setPassphrase: (passphrase: string) => void;
  setOutputPath: (path: string) => void;
  setForceOverwrite: (force: boolean | null) => void;
  decryptFile: () => Promise<any>; // Returns DecryptionResult for conflict detection
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
  const [state, setState] = useState<FileDecryptionState>(createInitialDecryptionState());

  const selectEncryptedFile = useCallback(async (): Promise<void> => {
    setState(decryptionStateUpdates.startLoading);

    try {
      const selectedFile = await selectEncryptedFileForDecryption();
      setState((prev) =>
        decryptionStateUpdates.setSelectedFile(
          decryptionStateUpdates.stopLoading(prev),
          selectedFile,
        ),
      );
    } catch (error) {
      const commandError = toCommandError(
        error,
        'INTERNAL_ERROR',
        'File selection failed',
        'Please try selecting the file again. If the problem persists, restart the application.',
      );

      setState((prev) => decryptionStateUpdates.setError(prev, commandError));
      throw commandError;
    }
  }, []);

  const setSelectedFile = useCallback((path: string) => {
    setState((prev) => decryptionStateUpdates.setSelectedFile(prev, path));
  }, []);

  const setKeyId = useCallback((keyId: string) => {
    setState((prev) => decryptionStateUpdates.setKeyId(prev, keyId));
  }, []);

  const setPassphrase = useCallback((passphrase: string) => {
    setState((prev) => decryptionStateUpdates.setPassphrase(prev, passphrase));
  }, []);

  const setOutputPath = useCallback((path: string) => {
    setState((prev) => decryptionStateUpdates.setOutputPath(prev, path));
  }, []);

  const setForceOverwrite = useCallback((force: boolean | null) => {
    setState((prev) => decryptionStateUpdates.setForceOverwrite(prev, force));
  }, []);

  const decryptFile = useCallback(async (): Promise<any> => {
    // Validate all required inputs
    const validation = validateDecryptionInputs(state);

    if (!validation.isValid) {
      setState((prev) => decryptionStateUpdates.setError(prev, validation.error!));
      throw validation.error;
    }

    // Start decryption state immediately for UI responsiveness
    setState(decryptionStateUpdates.startDecryption);

    // Small delay to ensure UI updates before heavy operation
    await new Promise((resolve) => requestAnimationFrame(resolve));

    try {
      // Prepare and execute decryption
      const decryptionInput = prepareDecryptionInput(state);
      const result = await executeDecryptionWithProgress(decryptionInput, (progress) =>
        setState((prev) => decryptionStateUpdates.updateProgress(prev, progress)),
      );

      setState((prev) => decryptionStateUpdates.setSuccess(prev, result));
      return result; // Return result for conflict detection
    } catch (error) {
      // Handle errors - they're already properly formatted by executeDecryption
      const commandError =
        error instanceof Object && 'code' in error
          ? (error as CommandError)
          : toCommandError(
              error,
              'DECRYPTION_FAILED',
              'File decryption failed',
              'Please check your key, passphrase, and file. If the problem persists, restart the application.',
            );

      setState((prev) => decryptionStateUpdates.setError(prev, commandError));
      throw commandError;
    }
  }, [state]);

  const reset = useCallback(() => {
    setState(createInitialDecryptionState());
  }, []);

  const clearError = useCallback(() => {
    setState(decryptionStateUpdates.clearError);
  }, []);

  const clearSelection = useCallback(() => {
    setState(decryptionStateUpdates.clearSelection);
  }, []);

  return {
    ...state,
    selectEncryptedFile,
    setSelectedFile,
    setKeyId: (keyId: string) => setKeyId(keyId),
    setPassphrase: (passphrase: string) => setPassphrase(passphrase),
    setOutputPath: (path: string) => setOutputPath(path),
    setForceOverwrite: (force: boolean | null) => setForceOverwrite(force),
    decryptFile,
    reset,
    clearError,
    clearSelection,
  };
};
