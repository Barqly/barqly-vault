/**
 * State management utilities for file decryption
 */

import { CommandError, DecryptionResult, ProgressUpdate } from '../api-types';

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

/**
 * Creates the initial state for file decryption
 */
export const createInitialDecryptionState = (): FileDecryptionState => ({
  isLoading: false,
  error: null,
  success: null,
  progress: null,
  selectedFile: null,
  selectedKeyId: null,
  passphrase: '',
  outputPath: null,
});

/**
 * State update helpers for common operations
 */
export const decryptionStateUpdates = {
  /**
   * Start loading state
   */
  startLoading: (prev: FileDecryptionState): FileDecryptionState => ({
    ...prev,
    isLoading: true,
    error: null,
  }),

  /**
   * Stop loading state
   */
  stopLoading: (prev: FileDecryptionState): FileDecryptionState => ({
    ...prev,
    isLoading: false,
  }),

  /**
   * Set error state
   */
  setError: (prev: FileDecryptionState, error: CommandError): FileDecryptionState => ({
    ...prev,
    isLoading: false,
    error,
  }),

  /**
   * Set success state
   */
  setSuccess: (prev: FileDecryptionState, result: DecryptionResult): FileDecryptionState => ({
    ...prev,
    isLoading: false,
    success: result,
    progress: null,
  }),

  /**
   * Update progress
   */
  updateProgress: (prev: FileDecryptionState, progress: ProgressUpdate): FileDecryptionState => ({
    ...prev,
    progress,
  }),

  /**
   * Set selected file
   */
  setSelectedFile: (prev: FileDecryptionState, path: string): FileDecryptionState => ({
    ...prev,
    selectedFile: path,
    error: null,
  }),

  /**
   * Set selected key ID
   */
  setKeyId: (prev: FileDecryptionState, keyId: string): FileDecryptionState => ({
    ...prev,
    selectedKeyId: keyId,
    error: null,
  }),

  /**
   * Set passphrase
   */
  setPassphrase: (prev: FileDecryptionState, passphrase: string): FileDecryptionState => ({
    ...prev,
    passphrase,
    error: null,
  }),

  /**
   * Set output path
   */
  setOutputPath: (prev: FileDecryptionState, path: string): FileDecryptionState => ({
    ...prev,
    outputPath: path,
    error: null,
  }),

  /**
   * Clear error
   */
  clearError: (prev: FileDecryptionState): FileDecryptionState => ({
    ...prev,
    error: null,
  }),

  /**
   * Clear selection (reset file, key, passphrase, output)
   */
  clearSelection: (prev: FileDecryptionState): FileDecryptionState => ({
    ...prev,
    selectedFile: null,
    selectedKeyId: null,
    passphrase: '',
    outputPath: null,
  }),

  /**
   * Start decryption operation
   */
  startDecryption: (prev: FileDecryptionState): FileDecryptionState => ({
    ...prev,
    isLoading: true,
    error: null,
    success: null,
    progress: null,
  }),
};
