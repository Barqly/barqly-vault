import { useState, useCallback } from 'react';
import { safeInvoke, safeListen } from '../lib/tauri-safe';
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
import { logger } from '../lib/logger';

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
    logger.logHook('useKeyGeneration', 'setLabel', { label });
    setState((prev) => ({ ...prev, label, error: null }));
  }, []);

  const setPassphrase = useCallback((passphrase: string) => {
    logger.logHook('useKeyGeneration', 'setPassphrase', { length: passphrase.length });
    setState((prev) => ({ ...prev, passphrase, error: null }));
  }, []);

  const generateKey = useCallback(async (): Promise<void> => {
    logger.logHook('useKeyGeneration', 'generateKey started', {
      label: state.label,
      passphraseLength: state.passphrase.length,
    });

    // Validate inputs using utility functions
    const labelValidation = validateField(state.label, 'Key label', {
      required: true,
      safeLabel: true,
    });

    logger.debug('useKeyGeneration', 'Label validation result', {
      isValid: labelValidation.isValid,
      error: labelValidation.error,
    });

    if (!labelValidation.isValid) {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: labelValidation.error!,
        recovery_guidance: 'Please provide a unique label for the new key',
        user_actionable: true,
      };
      logger.error(
        'useKeyGeneration',
        'Label validation failed',
        new Error(labelValidation.error!),
        { error },
      );
      setState((prev) => ({ ...prev, error }));
      throw error;
    }

    const passphraseValidation = validateField(state.passphrase, 'Passphrase', {
      required: true,
    });

    logger.debug('useKeyGeneration', 'Passphrase validation result', {
      isValid: passphraseValidation.isValid,
      error: passphraseValidation.error,
    });

    if (!passphraseValidation.isValid) {
      const error: CommandError = {
        code: ErrorCode.INVALID_INPUT,
        message: passphraseValidation.error!,
        recovery_guidance: 'Please provide a strong passphrase to protect the key',
        user_actionable: true,
      };
      logger.error(
        'useKeyGeneration',
        'Passphrase validation failed',
        new Error(passphraseValidation.error!),
        { error },
      );
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
      logger.info('useKeyGeneration', 'Starting key generation process', { label: state.label });

      // First, validate the passphrase strength
      const validationInput: ValidatePassphraseInput = {
        passphrase: state.passphrase,
      };

      logger.debug('useKeyGeneration', 'Calling validate_passphrase command', {
        passphraseLength: state.passphrase.length,
      });

      const validationResult = await safeInvoke<ValidatePassphraseResponse>(
        'validate_passphrase',
        validationInput,
        'useKeyGeneration',
      );

      logger.info('useKeyGeneration', 'Passphrase validation complete', {
        isValid: validationResult.is_valid,
        message: validationResult.message,
      });

      if (!validationResult.is_valid) {
        const error: CommandError = {
          code: ErrorCode.WEAK_PASSPHRASE,
          message: 'Passphrase is too weak',
          recovery_guidance: 'Please use a stronger passphrase',
          user_actionable: true,
        };
        logger.error('useKeyGeneration', 'Weak passphrase detected', new Error('Weak passphrase'), {
          message: validationResult.message,
        });
        throw error;
      }

      // If passphrase is valid, proceed with key generation
      logger.debug('useKeyGeneration', 'Setting up progress listener');
      const unlisten = await safeListen<ProgressUpdate>('key-generation-progress', (event) => {
        logger.debug('useKeyGeneration', 'Progress update received', event.payload);
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

        logger.info('useKeyGeneration', 'Calling generate_key command', {
          label: keyInput.label,
          timestamp: new Date().toISOString(),
        });

        const result = await safeInvoke<GenerateKeyResponse>(
          'generate_key',
          keyInput,
          'useKeyGeneration',
        );

        logger.info('useKeyGeneration', 'Key generation successful', {
          publicKey: result.public_key.substring(0, 20) + '...',
          keyId: result.key_id,
          savedPath: result.saved_path,
        });

        setState((prev) => ({
          ...prev,
          isLoading: false,
          success: result,
          progress: null,
        }));

        unlisten();
      } catch (commandError) {
        logger.error(
          'useKeyGeneration',
          'Key generation command failed',
          commandError instanceof Error ? commandError : new Error(String(commandError)),
          { commandError },
        );
        unlisten();
        throw commandError;
      }
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
