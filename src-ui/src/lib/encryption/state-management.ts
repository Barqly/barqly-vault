import { CommandError, ProgressUpdate, FileSelection } from '../api-types';

/**
 * State management for file encryption operations
 */
export interface FileEncryptionState {
  isLoading: boolean;
  error: CommandError | null;
  selectedFiles: FileSelection | null;
  success: string | null; // Backend returns string path
  progress: ProgressUpdate | null;
}

/**
 * Creates the initial state for file encryption
 */
export const createInitialEncryptionState = (): FileEncryptionState => ({
  isLoading: false,
  error: null,
  selectedFiles: null,
  success: null,
  progress: null,
});

/**
 * State update functions for encryption operations
 */
export const encryptionStateUpdates = {
  startLoading: (prev: FileEncryptionState): FileEncryptionState => ({
    ...prev,
    isLoading: true,
    error: null,
  }),

  stopLoading: (prev: FileEncryptionState): FileEncryptionState => ({
    ...prev,
    isLoading: false,
  }),

  setSelectedFiles: (
    prev: FileEncryptionState,
    selectedFiles: FileSelection,
  ): FileEncryptionState => ({
    ...prev,
    isLoading: false,
    selectedFiles,
  }),

  startEncryption: (prev: FileEncryptionState): FileEncryptionState => ({
    ...prev,
    isLoading: true,
    error: null,
    progress: null,
  }),

  updateProgress: (prev: FileEncryptionState, progress: ProgressUpdate): FileEncryptionState => ({
    ...prev,
    progress,
  }),

  setSuccess: (prev: FileEncryptionState, result: string): FileEncryptionState => ({
    ...prev,
    isLoading: false,
    success: result,
    progress: null,
  }),

  setError: (prev: FileEncryptionState, error: CommandError): FileEncryptionState => ({
    ...prev,
    isLoading: false,
    error,
    progress: null,
  }),

  clearError: (prev: FileEncryptionState): FileEncryptionState => ({
    ...prev,
    error: null,
  }),

  clearSelection: (prev: FileEncryptionState): FileEncryptionState => ({
    ...prev,
    selectedFiles: null,
  }),
};
