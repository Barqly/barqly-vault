import { useState, useEffect, useRef } from 'react';
import { commands, YubiKeyStateInfo } from '../../bindings';
import { logger } from '../../lib/logger';
import { getUserFriendlyError } from './yubikey-helpers';

interface UseYubiKeyRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Custom hook for YubiKey registration workflow
 * Manages all state, validation, and API interactions
 */
export const useYubiKeyRegistration = ({
  isOpen,
  onClose,
  onSuccess,
}: UseYubiKeyRegistrationProps) => {
  // State
  const [yubikeys, setYubikeys] = useState<YubiKeyStateInfo[]>([]);
  const [selectedKey, setSelectedKey] = useState<YubiKeyStateInfo | null>(null);
  const [label, setLabel] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [recoveryPin, setRecoveryPin] = useState('');
  const [confirmRecoveryPin, setConfirmRecoveryPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'detect' | 'setup'>('detect');
  const [isCopied, setIsCopied] = useState(false);
  const [showSecurityTips, setShowSecurityTips] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [showRecoveryPin, setShowRecoveryPin] = useState(false);
  const [showTouchPrompt, setShowTouchPrompt] = useState(false);

  // Refs for focus management
  const firstFocusableRef = useRef<HTMLInputElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const firstYubiKeyButtonRef = useRef<HTMLButtonElement>(null);

  // Detect YubiKeys when dialog opens
  useEffect(() => {
    if (isOpen) {
      detectYubiKeys();
    }
  }, [isOpen]);

  // Auto-focus appropriate element after detection completes
  useEffect(() => {
    if (!isLoading && step === 'detect') {
      if (yubikeys.length > 0 && firstYubiKeyButtonRef.current) {
        firstYubiKeyButtonRef.current.focus();
      } else if (yubikeys.length === 0 && refreshButtonRef.current) {
        refreshButtonRef.current.focus();
      }
    }
  }, [isLoading, step, yubikeys.length]);

  // Auto-focus first field when setup step is shown
  useEffect(() => {
    if (step === 'setup' && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [step]);

  const detectYubiKeys = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await commands.listYubikeys();
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Failed to list YubiKeys');
      }
      const allKeys = result.data;

      logger.info('YubiKeyRegistryDialog', 'YubiKeys returned from backend', {
        count: allKeys.length,
        keys: allKeys,
      });

      // Filter to exclude already registered keys
      const availableKeys = allKeys.filter((k) => k.state !== 'registered');

      logger.info(
        'YubiKeyRegistryDialog',
        `Found ${availableKeys.length} available YubiKey(s) after filtering`,
      );

      setYubikeys(availableKeys);

      // Set specific error message if YubiKeys were detected but all are already registered
      if (allKeys.length > 0 && availableKeys.length === 0) {
        setError('This YubiKey is already registered');
      }

      // Auto-select if only one available
      if (availableKeys.length === 1) {
        const key = availableKeys[0];
        setSelectedKey(key);
        setLabel(key.label || `YubiKey-${key.serial}`);
      }
    } catch (err: any) {
      logger.error('YubiKeyRegistryDialog', 'Failed to detect YubiKeys', err);
      setError('Failed to detect YubiKeys. Please ensure one is connected.');
    } finally {
      setIsLoading(false);
    }
  };

  const validatePin = (): string | null => {
    if (!label.trim()) {
      return 'Label is required';
    }

    // Scenario 4: ORPHANED - No PIN validation needed
    if (selectedKey?.state === 'orphaned') {
      return null; // Only label is required
    }

    // Scenario 1: NEW - Validate PIN + Recovery PIN
    if (selectedKey?.state === 'new') {
      if (pin.length < 6 || pin.length > 8) {
        return 'PIN must be 6-8 digits';
      }
      if (!/^\d+$/.test(pin)) {
        return 'PIN must contain only numbers';
      }
      if (pin !== confirmPin) {
        return 'PINs do not match';
      }

      // Validate Recovery PIN for NEW keys only
      if (recoveryPin.length < 6 || recoveryPin.length > 8) {
        return 'Recovery PIN must be 6-8 digits';
      }
      if (!/^\d+$/.test(recoveryPin)) {
        return 'Recovery PIN must contain only numbers';
      }
      if (recoveryPin !== confirmRecoveryPin) {
        return 'Recovery PINs do not match';
      }
      if (pin === recoveryPin) {
        return 'PIN and Recovery PIN cannot be the same';
      }

      return null;
    }

    // Scenario 2 & 3: REUSED (with or without TDES) - Validate PIN only
    if (selectedKey?.state === 'reused') {
      if (pin.length < 6 || pin.length > 8) {
        return 'PIN must be 6-8 digits';
      }
      if (!/^\d+$/.test(pin)) {
        return 'PIN must contain only numbers';
      }
      // No Recovery PIN validation for reused keys
      return null;
    }

    return null;
  };

  const handleSetup = async () => {
    const validationError = validatePin();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!selectedKey) {
      setError('No YubiKey selected');
      return;
    }

    setIsSetupInProgress(true);
    setError(null);

    try {
      // Scenario 1: NEW YubiKey (factory default)
      if (selectedKey.state === 'new') {
        setShowTouchPrompt(true); // Touch required
        logger.info('YubiKeyRegistryDialog', 'Initializing NEW YubiKey', {
          serial: selectedKey.serial,
        });

        const initResult = await commands.initYubikey(
          selectedKey.serial,
          pin,
          recoveryPin,
          label.trim(),
        );

        if (initResult.status === 'error') {
          throw new Error(initResult.error.message || 'Failed to initialize YubiKey');
        }

        handleSuccess();
      }
      // Scenario 2: REUSED without TDES (needs mgmt setup + key generation)
      else if (selectedKey.state === 'reused' && !selectedKey.has_tdes_protected_mgmt_key) {
        setShowTouchPrompt(true); // Touch required
        logger.info('YubiKeyRegistryDialog', 'Completing YubiKey setup (REUSED without TDES)', {
          serial: selectedKey.serial,
        });

        const completeResult = await commands.completeYubikeySetup(
          selectedKey.serial,
          pin,
          label.trim(),
        );

        if (completeResult.status === 'error') {
          throw new Error(completeResult.error.message || 'Failed to complete YubiKey setup');
        }

        handleSuccess();
      }
      // Scenario 3: REUSED with TDES (only needs key generation)
      else if (selectedKey.state === 'reused' && selectedKey.has_tdes_protected_mgmt_key) {
        setShowTouchPrompt(true); // Touch required
        logger.info('YubiKeyRegistryDialog', 'Generating age identity (REUSED with TDES)', {
          serial: selectedKey.serial,
        });

        const generateResult = await commands.generateYubikeyIdentity(
          selectedKey.serial,
          pin,
          label.trim(),
        );

        if (generateResult.status === 'error') {
          throw new Error(generateResult.error.message || 'Failed to generate YubiKey identity');
        }

        handleSuccess();
      }
      // Scenario 4: ORPHANED (already has key, just register)
      else if (selectedKey.state === 'orphaned') {
        // NO touch required for orphaned keys
        logger.info('YubiKeyRegistryDialog', 'Registering ORPHANED YubiKey', {
          serial: selectedKey.serial,
        });

        const registerResult = await commands.registerYubikey(
          selectedKey.serial,
          label.trim(),
          null, // No PIN needed for orphaned keys
        );

        if (registerResult.status === 'error') {
          throw new Error(registerResult.error.message || 'Failed to register YubiKey');
        }

        handleSuccess();
      }
    } catch (err: any) {
      logger.error('YubiKeyRegistryDialog', 'Failed to setup YubiKey', err);
      const friendlyError = getUserFriendlyError(err.message || 'Failed to setup YubiKey');
      setError(friendlyError);
    } finally {
      setIsSetupInProgress(false);
      setShowTouchPrompt(false);
    }
  };

  const handleSuccess = () => {
    // Clear form
    setSelectedKey(null);
    setLabel('');
    setPin('');
    setConfirmPin('');
    setRecoveryPin('');
    setConfirmRecoveryPin('');
    setStep('detect');

    onSuccess?.();
    onClose();
  };

  const handleCancel = () => {
    if (!isSetupInProgress) {
      setSelectedKey(null);
      setLabel('');
      setPin('');
      setConfirmPin('');
      setRecoveryPin('');
      setConfirmRecoveryPin('');
      setError(null);
      setStep('detect');
      onClose();
    }
  };

  const handleCopyPublicKey = async (publicKey: string) => {
    try {
      await navigator.clipboard.writeText(publicKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      logger.error('YubiKeyRegistryDialog', 'Failed to copy public key', err as Error);
    }
  };

  const handleSelectKey = (yubikey: YubiKeyStateInfo) => {
    setSelectedKey(yubikey);
    setLabel(yubikey.label || `YubiKey-${yubikey.serial}`);
    setStep('setup');
  };

  // Focus trap: cycle focus within modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter key submission
    if (e.key === 'Enter' && !isSetupInProgress) {
      let isFormValid = false;

      // Scenario 4: ORPHANED - Only label required
      if (selectedKey?.state === 'orphaned') {
        isFormValid = !!label.trim();
      }
      // Scenario 1: NEW - Need PIN + Recovery PIN
      else if (selectedKey?.state === 'new') {
        isFormValid = !!(
          label.trim() &&
          pin &&
          confirmPin &&
          recoveryPin &&
          confirmRecoveryPin &&
          pin === confirmPin &&
          recoveryPin === confirmRecoveryPin &&
          pin !== recoveryPin
        );
      }
      // Scenario 2 & 3: REUSED - Only need label and PIN
      else if (selectedKey?.state === 'reused') {
        isFormValid = !!(label.trim() && pin);
      }

      if (isFormValid) {
        e.preventDefault();
        handleSetup();
      }
      return;
    }

    // Tab key focus trap
    if (e.key !== 'Tab') return;

    let isButtonEnabled = false;
    let lastInputId = '';

    // Scenario 4: ORPHANED - Only label required
    if (selectedKey?.state === 'orphaned') {
      isButtonEnabled = !!(label.trim() && !isSetupInProgress);
      lastInputId = 'yubikey-label-orphaned';
    }
    // Scenario 1: NEW - Label + PIN + Recovery PIN
    else if (selectedKey?.state === 'new') {
      isButtonEnabled = !!(
        !isSetupInProgress &&
        label.trim() &&
        pin &&
        confirmPin &&
        recoveryPin &&
        confirmRecoveryPin &&
        pin === confirmPin &&
        recoveryPin === confirmRecoveryPin &&
        pin !== recoveryPin
      );
      lastInputId = 'confirm-recovery-pin';
    }
    // Scenario 2 & 3: REUSED - Label + PIN only
    else if (selectedKey?.state === 'reused') {
      isButtonEnabled = !!(label.trim() && pin && !isSetupInProgress);
      lastInputId = 'yubikey-pin-reused';
    }

    // If going backwards (Shift+Tab) from first field
    if (e.shiftKey && document.activeElement === firstFocusableRef.current) {
      e.preventDefault();
      if (isButtonEnabled && lastFocusableRef.current) {
        lastFocusableRef.current.focus();
      } else {
        firstFocusableRef.current?.focus();
      }
    }
    // If going forward (Tab) from last enabled element
    else if (!e.shiftKey) {
      if (isButtonEnabled && document.activeElement === lastFocusableRef.current) {
        e.preventDefault();
        firstFocusableRef.current?.focus();
      } else if (!isButtonEnabled && document.activeElement?.id === lastInputId) {
        e.preventDefault();
        firstFocusableRef.current?.focus();
      }
    }
  };

  // Handle backdrop click - progressive dismissal
  const handleBackdropClick = () => {
    if (step === 'detect') {
      // On detect step, close entire dialog
      handleCancel();
    } else if (step === 'setup') {
      // On setup step, go back to detect
      setStep('detect');
      setSelectedKey(null);
      setPin('');
      setConfirmPin('');
      setRecoveryPin('');
      setConfirmRecoveryPin('');
      setError(null);
    }
  };

  return {
    // State
    yubikeys,
    selectedKey,
    label,
    setLabel,
    pin,
    setPin,
    confirmPin,
    setConfirmPin,
    recoveryPin,
    setRecoveryPin,
    confirmRecoveryPin,
    setConfirmRecoveryPin,
    isLoading,
    isSetupInProgress,
    error,
    setError,
    step,
    setStep,
    isCopied,
    showSecurityTips,
    setShowSecurityTips,
    showPin,
    setShowPin,
    showRecoveryPin,
    setShowRecoveryPin,
    showTouchPrompt,

    // Refs
    firstFocusableRef,
    lastFocusableRef,
    refreshButtonRef,
    firstYubiKeyButtonRef,

    // Handlers
    detectYubiKeys,
    handleSetup,
    handleCancel,
    handleCopyPublicKey,
    handleSelectKey,
    handleKeyDown,
    handleBackdropClick,
  };
};
