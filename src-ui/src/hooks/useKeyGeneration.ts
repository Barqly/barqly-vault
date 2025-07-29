import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  GenerateKeyInput,
  GenerateKeyResponse,
  CommandError,
  ErrorCode,
  ProgressUpdate,
  ValidatePassphraseInput,
  ValidatePassphraseResponse,
} from '../lib/api-types';
import { validateField } from '../lib/validation';

export interface KeyGenerationState {
  isLoading: boolean;
  error: CommandError | null;
  success: GenerateKeyResponse | null;
  progress: ProgressUpdate | null;
  label: string;
  passphrase: string;
}

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
  const [state, setState] = useState<KeyGenerationState>({
    isLoading: false,
    error: null,
    success: null,
    progress: null,
    label: '',
    passphrase: '',
  });

  const setLabel = useCallback((label: string) => {
    setState((prev) => ({ ...prev, label, error: null }));
  }, []);

  const setPassphrase = useCallback((passphrase: string) => {
    setState((prev) => ({ ...prev, passphrase, error: null }));
  }, []);

  const generateKey = useCallback(async (): Promise<void> => {
    // Validate inputs using utility functions
    const labelValidation = validateField(state.label, 'Key label', {
      required: true,
      safeLabel: true,
    });

    if (!labelValidation.isValid) {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: labelValidation.error!,
        recovery_guidance: 'Please provide a unique label for the new key',
        user_actionable: true,
      };
      setState((prev) => ({ ...prev, error }));
      throw error;
    }

    const passphraseValidation = validateField(state.passphrase, 'Passphrase', {
      required: true,
    });

    if (!passphraseValidation.isValid) {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: passphraseValidation.error!,
        recovery_guidance: 'Please provide a strong passphrase to protect the key',
        user_actionable: true,
      };
      setState((prev) => ({ ...prev, error }));
      throw error;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: null,
    }));

    try {
      // First, validate the passphrase strength
      const validationInput: ValidatePassphraseInput = {
        passphrase: state.passphrase,
      };
      const validationResult = await invoke<ValidatePassphraseResponse>('validate_passphrase', {
        ...validationInput,
      });

      if (!validationResult.is_valid) {
        throw {
          code: ErrorCode.WEAK_PASSPHRASE,
          message: 'Passphrase is too weak',
          recovery_guidance: 'Please use a stronger passphrase',
          user_actionable: true,
        } as CommandError;
      }

      // If passphrase is valid, proceed with key generation
      const unlisten = await listen<ProgressUpdate>('key-generation-progress', (event) => {
        setState((prev) => ({
          ...prev,
          progress: event.payload,
        }));
      });

      try {
        const keyInput: GenerateKeyInput = {
          label: state.label,
          passphrase: state.passphrase,
        };
        const result = await invoke<GenerateKeyResponse>('generate_key', { ...keyInput });

        setState((prev) => ({
          ...prev,
          isLoading: false,
          success: result,
          progress: null,
        }));

        unlisten();
      } catch (commandError) {
        unlisten();
        throw commandError;
      }
    } catch (error) {
      let commandError: CommandError;

      if (error && typeof error === 'object' && 'code' in error) {
        commandError = error as CommandError;
      } else {
        commandError = {
          code: ErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          recovery_guidance: 'Please try again. If the problem persists, restart the application.',
          user_actionable: true,
        };
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: commandError,
        progress: null,
      }));

      throw commandError;
    }
  }, [state.label, state.passphrase]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      success: null,
      progress: null,
      label: '',
      passphrase: '',
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
    setLabel,
    setPassphrase,
    generateKey,
    reset,
    clearError,
  };
};
