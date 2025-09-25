import { useState, useCallback } from 'react';
import { CommandError, ErrorCode } from '../bindings';
import { logger } from '../lib/logger';
import { executeKeyGenerationWithProgress } from '../lib/key-generation/key-generation-workflow';
import { validateKeyGenerationInputs } from '../lib/key-generation/validation';
import {
  KeyGenerationState,
  createInitialKeyGenerationState,
  keyGenerationStateUpdates,
} from '../lib/key-generation/state-management';

// Re-export KeyGenerationState for consumers
export type { KeyGenerationState };

export interface KeyGenerationActions {
  setLabel: (label: string) => void;
  setPassphrase: (passphrase: string) => void;
  generateKey: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

export interface UseKeyGenerationReturn extends KeyGenerationState, KeyGenerationActions {}

/**
 * Hook for managing key generation workflow
 *
 * Provides a clean interface for generating encryption keys with:
 * - Loading states
 * - Error handling with recovery guidance
 * - Progress tracking for long operations
 * - Success state management
 *
 * @example
 * ```tsx
 * const {
 *  setLabel,
 *  setPassphrase,
 *  generateKey,
 *  isLoading,
 *  error,
 *  success,
 *  progress
 * } = useKeyGeneration();
 *
 * const handleSubmit = async (label: string, passphrase: string) => {
 *   setLabel(label);
 *   setPassphrase(passphrase);
 *   await generateKey();
 * };
 * ```
 */
export const useKeyGeneration = (): UseKeyGenerationReturn => {
  const [state, setState] = useState<KeyGenerationState>(createInitialKeyGenerationState());

  const setLabel = useCallback((label: string) => {
    logger.logHook('useKeyGeneration', 'setLabel', { label });
    setState((prev) => keyGenerationStateUpdates.setLabel(prev, label));
  }, []);

  const setPassphrase = useCallback((passphrase: string) => {
    logger.logHook('useKeyGeneration', 'setPassphrase', { length: passphrase.length });
    setState((prev) => keyGenerationStateUpdates.setPassphrase(prev, passphrase));
  }, []);

  const generateKey = useCallback(async (): Promise<void> => {
    logger.logHook('useKeyGeneration', 'generateKey started', {
      label: state.label,
      passphraseLength: state.passphrase.length,
    });

    // Validate inputs
    const validationError = validateKeyGenerationInputs(state.label, state.passphrase);
    if (validationError) {
      setState((prev) => keyGenerationStateUpdates.setError(prev, validationError));
      throw validationError;
    }

    // Start the generation process
    setState((prev) => keyGenerationStateUpdates.startGeneration(prev));

    try {
      // Execute key generation with progress tracking
      const result = await executeKeyGenerationWithProgress(
        state.label,
        state.passphrase,
        (progress) => {
          setState((prev) => keyGenerationStateUpdates.updateProgress(prev, progress));
        },
      );

      // Set success state
      setState((prev) => keyGenerationStateUpdates.setSuccess(prev, result));
    } catch (error) {
      logger.error(
        'useKeyGeneration',
        'Key generation process failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          errorType: error?.constructor?.name,
          errorDetails: error,
        },
      );

      // Convert error to CommandError if needed
      let commandError: CommandError;
      if (error && typeof error === 'object' && 'code' in error) {
        commandError = error as CommandError;
      } else {
        commandError = {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          recovery_guidance: 'Please try again. If the problem persists, restart the application.',
          user_actionable: true,
        };
      }

      setState((prev) => keyGenerationStateUpdates.setError(prev, commandError));
      throw commandError;
    }
  }, [state.label, state.passphrase]);

  const reset = useCallback(() => {
    setState(keyGenerationStateUpdates.reset());
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => keyGenerationStateUpdates.clearError(prev));
  }, []);

  return {
    ...state,
    setLabel,
    setPassphrase,
    generateKey,
    reset,
    clearError,
  };
};
