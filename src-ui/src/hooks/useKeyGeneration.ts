import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  GenerateKeyInput,
  GenerateKeyResponse,
  CommandError,
  ErrorCode,
  ProgressUpdate,
} from '../lib/api-types';

export interface KeyGenerationState {
  isLoading: boolean;
  error: CommandError | null;
  success: GenerateKeyResponse | null;
  progress: ProgressUpdate | null;
}

export interface KeyGenerationActions {
  generateKey: (input: GenerateKeyInput) => Promise<void>;
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
 * const { generateKey, isLoading, error, success, progress } = useKeyGeneration();
 *
 * const handleSubmit = async (label: string, passphrase: string) => {
 *   await generateKey({ label, passphrase });
 * };
 * ```
 */
export const useKeyGeneration = (): UseKeyGenerationReturn => {
  const [state, setState] = useState<KeyGenerationState>({
    isLoading: false,
    error: null,
    success: null,
    progress: null,
  });

  const generateKey = useCallback(async (input: GenerateKeyInput): Promise<void> => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: null,
    }));

    try {
      // Validate input before sending to backend
      if (!input.label?.trim()) {
        throw {
          code: ErrorCode.INVALID_INPUT,
          message: 'Key label is required',
          recovery_guidance: 'Please enter a label for your encryption key',
          user_actionable: true,
        } as CommandError;
      }

      if (!input.passphrase?.trim()) {
        throw {
          code: ErrorCode.INVALID_INPUT,
          message: 'Passphrase is required',
          recovery_guidance: 'Please enter a passphrase to protect your private key',
          user_actionable: true,
        } as CommandError;
      }

      if (input.label.length < 3) {
        throw {
          code: ErrorCode.INVALID_KEY_LABEL,
          message: 'Key label must be at least 3 characters long',
          recovery_guidance: 'Please enter a longer label for your key',
          user_actionable: true,
        } as CommandError;
      }

      if (input.label.length > 50) {
        throw {
          code: ErrorCode.INVALID_KEY_LABEL,
          message: 'Key label must be less than 50 characters',
          recovery_guidance: 'Please enter a shorter label for your key',
          user_actionable: true,
        } as CommandError;
      }

      // Validate label format (only letters, numbers, spaces, hyphens, underscores)
      if (!/^[a-zA-Z0-9\s\-_]+$/.test(input.label)) {
        throw {
          code: ErrorCode.INVALID_KEY_LABEL,
          message: 'Key label contains invalid characters',
          recovery_guidance: 'Only letters, numbers, spaces, hyphens, and underscores are allowed',
          user_actionable: true,
        } as CommandError;
      }

      if (input.passphrase.length < 8) {
        throw {
          code: ErrorCode.WEAK_PASSPHRASE,
          message: 'Passphrase must be at least 8 characters long',
          recovery_guidance: 'Please choose a longer passphrase for better security',
          user_actionable: true,
        } as CommandError;
      }

      // If in browser environment, use mock data
      if (
        typeof window !== 'undefined' &&
        !(window as any).__TAURI__ &&
        typeof process === 'undefined'
      ) {
        // Simulate key generation delay
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Mock success response
        const mockResult: GenerateKeyResponse = {
          public_key: 'age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p',
          key_label: input.label,
          key_id: 'key_' + Date.now(),
        };

        setState((prev) => ({
          ...prev,
          isLoading: false,
          success: mockResult,
          progress: null,
        }));

        return;
      }

      // Create a progress listener
      const unlisten = await listen<ProgressUpdate>('key-generation-progress', (event) => {
        setState((prev) => ({
          ...prev,
          progress: event.payload,
        }));
      });

      try {
        // Call the backend command
        const result = await invoke<GenerateKeyResponse>('generate_key', { input });

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
          message: error instanceof Error ? error.message : 'Key generation failed',
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

      // Re-throw for components that need to handle errors
      throw commandError;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
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

  return {
    ...state,
    generateKey,
    reset,
    clearError,
  };
};
