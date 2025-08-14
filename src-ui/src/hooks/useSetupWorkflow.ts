import { useState, useEffect, useCallback } from 'react';
import { useKeyGeneration } from './useKeyGeneration';
import { checkPassphraseStrength } from '../lib/validation/passphrase-validation';
import { logger } from '../lib/logger';

/**
 * Custom hook to manage the setup workflow state and logic
 * Extracted from SetupPage to reduce complexity
 */
export const useSetupWorkflow = () => {
  const {
    generateKey,
    isLoading,
    error,
    success,
    progress,
    reset,
    clearError,
    setLabel,
    setPassphrase: setHookPassphrase,
  } = useKeyGeneration();

  // Form state
  const [keyLabel, setKeyLabel] = useState<string>('');
  const [passphrase, setPassphrase] = useState<string>('');
  const [confirmPassphrase, setConfirmPassphrase] = useState<string>('');

  // Validation - form is valid only when passphrase is strong
  const passphraseStrength = checkPassphraseStrength(passphrase);
  const isFormValid =
    !!keyLabel.trim() &&
    passphraseStrength.isStrong &&
    !!confirmPassphrase &&
    passphrase === confirmPassphrase;

  // Reset handler
  const handleReset = useCallback(() => {
    reset();
    setKeyLabel('');
    setPassphrase('');
    setConfirmPassphrase('');
  }, [reset]);

  // Key generation handler
  const handleKeyGeneration = useCallback(async () => {
    logger.logComponentLifecycle('useSetupWorkflow', 'handleKeyGeneration started', {
      keyLabel,
      passphraseLength: passphrase.length,
      confirmPassphraseLength: confirmPassphrase.length,
    });

    // Validate inputs
    if (!keyLabel.trim()) {
      logger.warn('useSetupWorkflow', 'Key generation aborted: empty key label');
      return;
    }

    if (passphrase !== confirmPassphrase) {
      logger.warn('useSetupWorkflow', 'Key generation aborted: passphrase mismatch');
      return;
    }

    try {
      logger.info('useSetupWorkflow', 'Setting hook state for key generation', {
        keyLabel: keyLabel.trim(),
      });

      // Set the hook's state
      setLabel(keyLabel.trim());
      setHookPassphrase(passphrase);

      logger.info('useSetupWorkflow', 'Calling generateKey function');
      // Then generate the key
      await generateKey();

      logger.info('useSetupWorkflow', 'generateKey completed successfully');
    } catch (err) {
      // Error is already handled by the hook
      logger.error(
        'useSetupWorkflow',
        'Key generation error caught in hook',
        err instanceof Error ? err : new Error(String(err)),
        { error: err },
      );
    }
  }, [keyLabel, passphrase, confirmPassphrase, generateKey, setLabel, setHookPassphrase]);

  // Update key label handler
  const handleKeyLabelChange = useCallback(
    (value: string) => {
      setKeyLabel(value);
      setLabel(value);
    },
    [setLabel],
  );

  // Update passphrase handler
  const handlePassphraseChange = useCallback(
    (value: string) => {
      setPassphrase(value);
      setHookPassphrase(value);
    },
    [setHookPassphrase],
  );

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key clears form
      if (e.key === 'Escape' && !success && !isLoading) {
        e.preventDefault();
        handleReset();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [success, isLoading, handleReset]);

  return {
    // State
    keyLabel,
    passphrase,
    confirmPassphrase,
    isFormValid,
    isLoading,
    error,
    success,
    progress,

    // Handlers
    handleKeyLabelChange,
    handlePassphraseChange,
    setConfirmPassphrase,
    handleKeyGeneration,
    handleReset,
    clearError,
  };
};
