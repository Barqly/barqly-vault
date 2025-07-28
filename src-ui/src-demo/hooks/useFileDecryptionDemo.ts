/**
 * Demo wrapper for useFileDecryption hook
 *
 * Provides mock functionality for browser demos
 * without polluting the production hook
 */

import { useState, useCallback } from 'react';
import { FileDecryptionState, UseFileDecryptionReturn } from '@/hooks/useFileDecryption';
import {
  MOCK_ENCRYPTED_FILE,
  MOCK_DECRYPTION_RESULT,
  DEMO_FILE_SELECTION_DELAY,
  simulateDecryptionProgress,
} from '../data/decryption';
import { createValidationError } from '@/lib/errors/command-error';

/**
 * Demo version of useFileDecryption hook
 * Simulates file decryption workflow for browser demos
 */
export const useFileDecryptionDemo = (): UseFileDecryptionReturn => {
  const [state, setState] = useState<FileDecryptionState>({
    isLoading: false,
    error: null,
    success: null,
    progress: null,
    selectedFile: null,
    selectedKeyId: null,
    passphrase: '',
    outputPath: null,
  });

  const selectEncryptedFile = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    // Simulate file selection delay
    await new Promise((resolve) => setTimeout(resolve, DEMO_FILE_SELECTION_DELAY));

    setState((prev) => ({
      ...prev,
      isLoading: false,
      selectedFile: MOCK_ENCRYPTED_FILE,
    }));
  }, []);

  const setKeyId = useCallback((keyId: string) => {
    setState((prev) => ({ ...prev, selectedKeyId: keyId, error: null }));
  }, []);

  const setPassphrase = useCallback((passphrase: string) => {
    setState((prev) => ({ ...prev, passphrase, error: null }));
  }, []);

  const setOutputPath = useCallback((path: string) => {
    setState((prev) => ({ ...prev, outputPath: path, error: null }));
  }, []);

  const decryptFile = useCallback(async (): Promise<void> => {
    // Validate inputs
    if (!state.selectedFile) {
      const error = createValidationError(
        'Encrypted file',
        'Please select an encrypted .age file to decrypt',
      );
      setState((prev) => ({ ...prev, error }));
      throw error;
    }

    if (!state.selectedKeyId) {
      const error = createValidationError(
        'Decryption key',
        'Please select the key that was used to encrypt this file',
      );
      setState((prev) => ({ ...prev, error }));
      throw error;
    }

    if (!state.passphrase.trim()) {
      const error = createValidationError(
        'Passphrase',
        'Please enter the passphrase for the selected key',
      );
      setState((prev) => ({ ...prev, error }));
      throw error;
    }

    if (!state.outputPath) {
      const error = createValidationError(
        'Output directory',
        'Please select where to save the decrypted files',
      );
      setState((prev) => ({ ...prev, error }));
      throw error;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null, success: null, progress: null }));

    // Simulate decryption progress
    await simulateDecryptionProgress((update) => {
      setState((prev) => ({ ...prev, progress: update }));
    });

    setState((prev) => ({
      ...prev,
      isLoading: false,
      success: MOCK_DECRYPTION_RESULT,
      progress: null,
    }));
  }, [state.selectedFile, state.selectedKeyId, state.passphrase, state.outputPath]);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      success: null,
      progress: null,
      selectedFile: null,
      selectedKeyId: null,
      passphrase: '',
      outputPath: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedFile: null,
      selectedKeyId: null,
      passphrase: '',
      outputPath: null,
    }));
  }, []);

  return {
    ...state,
    selectEncryptedFile,
    setKeyId,
    setPassphrase,
    setOutputPath,
    decryptFile,
    reset,
    clearError,
    clearSelection,
  };
};
