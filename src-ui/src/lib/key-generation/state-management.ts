import { CommandError, GenerateKeyResponse, GetProgressResponse } from '../../bindings';

/**
 * State management for key generation operations
 */
export interface KeyGenerationState {
  isLoading: boolean;
  error: CommandError | null;
  success: GenerateKeyResponse | null;
  progress: GetProgressResponse | null;
  label: string;
  passphrase: string;
}

/**
 * Creates the initial state for key generation
 */
export const createInitialKeyGenerationState = (): KeyGenerationState => ({
  isLoading: false,
  error: null,
  success: null,
  progress: null,
  label: '',
  passphrase: '',
});

/**
 * State update functions for key generation operations
 */
export const keyGenerationStateUpdates = {
  setLabel: (prev: KeyGenerationState, label: string): KeyGenerationState => ({
    ...prev,
    label,
    error: null,
  }),

  setPassphrase: (prev: KeyGenerationState, passphrase: string): KeyGenerationState => ({
    ...prev,
    passphrase,
    error: null,
  }),

  startGeneration: (prev: KeyGenerationState): KeyGenerationState => ({
    ...prev,
    isLoading: true,
    error: null,
    progress: null,
  }),

  updateProgress: (
    prev: KeyGenerationState,
    progress: GetProgressResponse,
  ): KeyGenerationState => ({
    ...prev,
    progress,
  }),

  setSuccess: (prev: KeyGenerationState, result: GenerateKeyResponse): KeyGenerationState => ({
    ...prev,
    isLoading: false,
    success: result,
    progress: null,
  }),

  setError: (prev: KeyGenerationState, error: CommandError): KeyGenerationState => ({
    ...prev,
    isLoading: false,
    error,
    progress: null,
  }),

  clearError: (prev: KeyGenerationState): KeyGenerationState => ({
    ...prev,
    error: null,
  }),

  reset: (): KeyGenerationState => createInitialKeyGenerationState(),
};
