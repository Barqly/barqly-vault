import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Fingerprint,
  Loader2,
  AlertCircle,
  Info,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { logger } from '../../lib/logger';
import { commands, YubiKeyStateInfo, YubiKeyState } from '../../bindings';

interface YubiKeyRegistryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Get simplified badge for YubiKey registration
 * Philosophy: Don't make users think - all non-registered YubiKeys just need to be "registered"
 * The form will handle device-specific setup after selection
 */
const getYubiKeyBadge = (state: YubiKeyState) => {
  if (state === 'registered') {
    return {
      label: 'Registered',
      bgClass: 'bg-green-100',
      textClass: 'text-green-700',
    };
  }

  // All other states (new, reused, orphaned) = ready to register
  // Use premium blue CTA styling for clear call-to-action
  return {
    label: 'Register',
    bgClass: '', // Custom inline style
    textClass: '', // Custom inline style
    customStyle: {
      backgroundColor: '#1D4ED8',
      color: '#ffffff',
    },
  };
};

/**
 * Get simplified description for YubiKey
 */
const getYubiKeyDescription = (state: YubiKeyState) => {
  if (state === 'registered') {
    return 'Already in registry';
  }
  return 'New device - ready to register';
};

/**
 * Dialog for registering YubiKeys to the global registry (vault-agnostic)
 * Handles both new and existing YubiKey registration without vault context
 */
export const YubiKeyRegistryDialog: React.FC<YubiKeyRegistryDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
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

  // Refs for focus trap
  const firstFocusableRef = useRef<HTMLInputElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);
  const refreshButtonRef = useRef<HTMLButtonElement>(null);
  const firstYubiKeyButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      detectYubiKeys();
    }
  }, [isOpen]);

  // Auto-focus appropriate element after detection completes
  useEffect(() => {
    if (!isLoading && step === 'detect') {
      if (yubikeys.length > 0 && firstYubiKeyButtonRef.current) {
        // Focus first YubiKey button if available
        firstYubiKeyButtonRef.current.focus();
      } else if (yubikeys.length === 0 && refreshButtonRef.current) {
        // Focus Refresh button if no YubiKeys found
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
      // Get all YubiKeys using vault-agnostic API
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
      // Include: new, reused, orphaned
      // Exclude: registered (already in registry)
      const availableKeys = allKeys.filter((k) => k.state !== 'registered');

      logger.info(
        'YubiKeyRegistryDialog',
        `Found ${availableKeys.length} available YubiKey(s) after filtering`,
      );
      logger.debug('YubiKeyRegistryDialog', 'Available YubiKeys details', {
        count: availableKeys.length,
        keys: availableKeys,
      });

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

  /**
   * Convert backend errors into user-friendly messages
   * Order matters: Check specific errors before generic patterns
   */
  const getUserFriendlyError = (errorMessage: string): string => {
    const lowerError = errorMessage.toLowerCase();

    // PIN blocked - critical error requiring recovery PIN (Check FIRST)
    if (lowerError.includes('pin is blocked') || lowerError.includes('pin blocked')) {
      return 'PIN is blocked due to too many incorrect attempts. Use your Recovery PIN to unblock it, or reset the YubiKey.';
    }

    // Wrong PIN - Check BEFORE touch timeout (more specific)
    if (
      lowerError.includes('invalid pin') ||
      lowerError.includes('incorrect pin') ||
      lowerError.includes('wrong pin') ||
      lowerError.includes('pin verification failed') ||
      lowerError.includes('tries remaining')
    ) {
      return 'Incorrect PIN. Please check your PIN and try again.';
    }

    // Device not found
    if (lowerError.includes('device not found') || lowerError.includes('no yubikey')) {
      return 'YubiKey not found. Please ensure your YubiKey is connected and try again.';
    }

    // Touch timeout errors - Check AFTER PIN errors (less specific)
    if (
      lowerError.includes('touch') ||
      lowerError.includes('timeout') ||
      lowerError.includes('failed to decrypt yubikey stanza') || // age CLI error
      lowerError.includes('yubikey plugin') || // age plugin error
      lowerError.includes('pty operation failed') ||
      lowerError.includes('authentication error') ||
      lowerError.includes('communicating with yubikey')
    ) {
      return 'YubiKey touch not detected. Please touch your YubiKey when the light blinks and try again.';
    }

    // Generic fallback
    return errorMessage;
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

  if (!isOpen) return null;

  // Copy public key to clipboard
  const handleCopyPublicKey = async (publicKey: string) => {
    try {
      await navigator.clipboard.writeText(publicKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      logger.error('YubiKeyRegistryDialog', 'Failed to copy public key', err as Error);
    }
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

  return (
    <>
      {/* Backdrop with blur - progressive dismissal */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
        onClick={handleBackdropClick}
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none">
        <div
          className="bg-elevated rounded-lg shadow-xl w-full pointer-events-auto"
          style={{ maxWidth: '600px', border: '1px solid #ffd4a3' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-default">
            <div className="flex items-center gap-3">
              <div
                className="rounded-lg p-2 flex-shrink-0"
                style={{
                  backgroundColor: 'rgba(249, 139, 28, 0.08)',
                  border: '1px solid #ffd4a3',
                }}
              >
                <Fingerprint className="h-5 w-5" style={{ color: '#F98B1C' }} />
              </div>
              <h2 className="text-xl font-semibold text-main">Register YubiKey</h2>
            </div>
            <button
              onClick={handleCancel}
              disabled={isSetupInProgress}
              className="text-muted hover:text-secondary transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            {/* Detection Step */}
            {step === 'detect' && (
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : yubikeys.length === 0 ? (
                  <>
                    {/* Info Panel - Theme-aware */}
                    <div
                      className="border rounded-lg p-4"
                      style={{
                        backgroundColor: error
                          ? 'rgb(var(--surface-hover))'
                          : 'rgba(234, 179, 8, 0.1)',
                        borderColor: error
                          ? 'rgb(var(--border-default))'
                          : 'rgba(234, 179, 8, 0.3)',
                      }}
                    >
                      <div className="flex gap-3">
                        <AlertCircle
                          className="h-5 w-5 flex-shrink-0 mt-0.5"
                          style={{
                            color: error ? 'rgb(var(--text-secondary))' : '#D97706',
                          }}
                        />
                        <div>
                          <p
                            className="text-sm font-medium"
                            style={{
                              color: error ? 'rgb(var(--text-primary))' : '#B45309',
                            }}
                          >
                            {error || 'No YubiKeys available for registration'}
                          </p>
                          {!error && (
                            <p
                              className="text-sm mt-1"
                              style={{
                                color: '#B45309',
                              }}
                            >
                              Insert your YubiKey to add it to the registry. The green light should
                              be blinking.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Buttons - Refresh spans, Cancel compact */}
                    <div
                      className="flex gap-3"
                      onKeyDown={(e) => {
                        // Focus trap for detect step - Tab stays on Refresh button
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          refreshButtonRef.current?.focus();
                        }
                      }}
                    >
                      <button
                        ref={refreshButtonRef}
                        onClick={detectYubiKeys}
                        autoFocus
                        className="flex-1 px-4 py-2 text-white rounded-lg transition-colors"
                        style={{
                          backgroundColor: '#1D4ED8',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#1E40AF';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#1D4ED8';
                        }}
                      >
                        <RefreshCw className="h-4 w-4 inline mr-2" />
                        Refresh
                      </button>
                      <button
                        onClick={handleCancel}
                        tabIndex={-1}
                        className="px-4 py-2 border rounded-lg transition-colors"
                        style={{
                          borderColor: 'rgb(var(--border-default))',
                          color: 'rgb(var(--text-secondary))',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgb(var(--surface-hover))';
                          e.currentTarget.style.color = 'rgb(var(--text-primary))';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'rgb(var(--text-secondary))';
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-secondary">
                      Select a YubiKey to add to the registry:
                    </p>
                    <div className="space-y-2">
                      {yubikeys.map((yk, index) => (
                        <button
                          key={yk.serial}
                          ref={index === 0 ? firstYubiKeyButtonRef : null}
                          onClick={() => {
                            setSelectedKey(yk);
                            setLabel(yk.label || `YubiKey-${yk.serial}`);
                            setStep('setup');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setSelectedKey(yk);
                              setLabel(yk.label || `YubiKey-${yk.serial}`);
                              setStep('setup');
                            }
                          }}
                          className="w-full p-3 border rounded-lg text-left transition-colors"
                          style={{
                            borderColor:
                              selectedKey?.serial === yk.serial
                                ? '#3B82F6'
                                : 'rgb(var(--border-default))',
                            backgroundColor:
                              selectedKey?.serial === yk.serial
                                ? 'rgba(59, 130, 246, 0.1)'
                                : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                            e.currentTarget.style.borderColor = '#3B82F6';
                          }}
                          onMouseLeave={(e) => {
                            if (selectedKey?.serial !== yk.serial) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.borderColor = 'rgb(var(--border-default))';
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-main">
                                YubiKey {yk.serial.substring(0, 8)}
                              </p>
                              <p className="text-xs text-secondary">
                                {getYubiKeyDescription(yk.state)}
                              </p>
                            </div>
                            {(() => {
                              const badge = getYubiKeyBadge(yk.state);
                              return (
                                <span
                                  className={`text-xs px-2 py-1 rounded font-medium ${badge.bgClass} ${badge.textClass}`}
                                  style={badge.customStyle}
                                >
                                  {badge.label}
                                </span>
                              );
                            })()}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Setup Step - For NEW YubiKeys (Scenario 1) */}
            {step === 'setup' && selectedKey && selectedKey.state === 'new' && (
              <div className="space-y-4" onKeyDown={handleKeyDown}>
                {/* S/N */}
                <div>
                  <p className="text-sm text-main">
                    <span className="font-medium">S/N:</span> {selectedKey.serial}
                  </p>
                </div>

                {/* YubiKey Label */}
                <div>
                  <label className="block text-sm font-medium text-main mb-2">
                    YubiKey Label *
                  </label>
                  <input
                    ref={firstFocusableRef}
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    maxLength={24}
                    className="w-full px-3 py-2 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input text-main"
                    placeholder="e.g., Personal YubiKey"
                  />
                  <p
                    className="mt-1 text-xs"
                    style={{ color: label.length >= 24 ? '#B91C1C' : '#64748b' }}
                  >
                    {label.length}/24 characters
                  </p>
                </div>

                {/* PIN Fields - 2 Column Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-main mb-2">Create PIN *</label>
                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        maxLength={8}
                        className="w-full px-3 py-2 pr-10 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input text-main placeholder-gray-400"
                        placeholder="6-8 digits"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        tabIndex={-1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-secondary transition-colors"
                        aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                      >
                        {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-main mb-2">
                      Confirm PIN *
                    </label>
                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        maxLength={8}
                        className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 bg-input text-main placeholder-gray-400"
                        style={
                          confirmPin
                            ? pin === confirmPin
                              ? ({
                                  borderColor: 'rgb(var(--border-default))',
                                  '--tw-ring-color': 'rgb(59, 130, 246)',
                                } as React.CSSProperties)
                              : ({
                                  borderColor: '#991B1B',
                                  '--tw-ring-color': '#991B1B',
                                } as React.CSSProperties)
                            : ({
                                borderColor: 'rgb(var(--border-default))',
                                '--tw-ring-color': 'rgb(59, 130, 246)',
                              } as React.CSSProperties)
                        }
                        placeholder="6-8 digits"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        tabIndex={-1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-secondary transition-colors"
                        aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                      >
                        {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPin && (
                      <p
                        className="text-xs mt-1"
                        style={{ color: pin === confirmPin ? 'inherit' : '#991B1B' }}
                      >
                        {pin === confirmPin ? '' : 'PINs do not match'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Recovery PIN Fields - 2 Column Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-main mb-2">
                      Recovery PIN *
                    </label>
                    <div className="relative">
                      <input
                        type={showRecoveryPin ? 'text' : 'password'}
                        value={recoveryPin}
                        onChange={(e) => setRecoveryPin(e.target.value)}
                        maxLength={8}
                        className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 bg-input text-main placeholder-gray-400"
                        style={
                          recoveryPin && pin
                            ? recoveryPin !== pin
                              ? ({
                                  borderColor: 'rgb(var(--border-default))',
                                  '--tw-ring-color': 'rgb(59, 130, 246)',
                                } as React.CSSProperties)
                              : ({
                                  borderColor: '#991B1B',
                                  '--tw-ring-color': '#991B1B',
                                } as React.CSSProperties)
                            : ({
                                borderColor: 'rgb(var(--border-default))',
                                '--tw-ring-color': 'rgb(59, 130, 246)',
                              } as React.CSSProperties)
                        }
                        placeholder="6-8 digits"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRecoveryPin(!showRecoveryPin)}
                        tabIndex={-1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-secondary transition-colors"
                        aria-label={showRecoveryPin ? 'Hide Recovery PIN' : 'Show Recovery PIN'}
                      >
                        {showRecoveryPin ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {recoveryPin && pin && recoveryPin === pin && (
                      <p className="text-xs mt-1" style={{ color: '#991B1B' }}>
                        Cannot be same as PIN
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-main mb-2">
                      Confirm Recovery PIN *
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-recovery-pin"
                        type={showRecoveryPin ? 'text' : 'password'}
                        value={confirmRecoveryPin}
                        onChange={(e) => setConfirmRecoveryPin(e.target.value)}
                        maxLength={8}
                        className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 bg-input text-main placeholder-gray-400"
                        style={
                          confirmRecoveryPin
                            ? recoveryPin === confirmRecoveryPin
                              ? ({
                                  borderColor: 'rgb(var(--border-default))',
                                  '--tw-ring-color': 'rgb(59, 130, 246)',
                                } as React.CSSProperties)
                              : ({
                                  borderColor: '#991B1B',
                                  '--tw-ring-color': '#991B1B',
                                } as React.CSSProperties)
                            : ({
                                borderColor: 'rgb(var(--border-default))',
                                '--tw-ring-color': 'rgb(59, 130, 246)',
                              } as React.CSSProperties)
                        }
                        placeholder="6-8 digits"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRecoveryPin(!showRecoveryPin)}
                        tabIndex={-1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-secondary transition-colors"
                        aria-label={showRecoveryPin ? 'Hide Recovery PIN' : 'Show Recovery PIN'}
                      >
                        {showRecoveryPin ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {confirmRecoveryPin && (
                      <p
                        className="text-xs mt-1"
                        style={{
                          color: recoveryPin === confirmRecoveryPin ? 'inherit' : '#991B1B',
                        }}
                      >
                        {recoveryPin === confirmRecoveryPin ? '' : 'Recovery PINs do not match'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Security Tips - Collapsible */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowSecurityTips(!showSecurityTips)}
                    tabIndex={-1}
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                    aria-expanded={showSecurityTips}
                  >
                    <Info className="h-4 w-4" />
                    <span>Security Tips</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${showSecurityTips ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <div
                    className={`
                        overflow-hidden transition-all duration-300 ease-in-out
                        ${showSecurityTips ? 'max-h-48 opacity-100 mt-4' : 'max-h-0 opacity-0'}
                      `}
                    aria-hidden={!showSecurityTips}
                  >
                    <div
                      className="rounded-xl border p-4"
                      style={{
                        borderColor: 'rgb(var(--border-default))',
                        backgroundColor: 'rgba(var(--info-panel-bg))',
                        boxShadow:
                          '0 1px 3px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <span
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-heading border"
                              style={{
                                backgroundColor: 'rgb(var(--surface-card))',
                                borderColor: 'rgb(var(--border-default))',
                              }}
                            >
                              1
                            </span>
                            <span className="text-sm font-semibold text-heading">
                              PIN for Daily Use
                            </span>
                          </div>
                          <p className="text-sm text-secondary leading-relaxed">
                            Use your PIN for regular encryption and decryption operations.
                          </p>
                        </div>

                        <div>
                          <div className="mb-1 flex items-center gap-2">
                            <span
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-heading border"
                              style={{
                                backgroundColor: 'rgb(var(--surface-card))',
                                borderColor: 'rgb(var(--border-default))',
                              }}
                            >
                              2
                            </span>
                            <span className="text-sm font-semibold text-heading">
                              Recovery PIN for Emergencies
                            </span>
                          </div>
                          <p className="text-sm text-secondary leading-relaxed">
                            Needed only if your PIN is blocked after failed attempts.
                          </p>
                        </div>
                      </div>

                      <p
                        className="mt-4 border-t pt-3 text-xs text-secondary italic"
                        style={{ borderColor: 'rgb(var(--border-default))' }}
                      >
                        <span className="font-semibold">Security Note:</span> Store both PINs
                        securely in a password manager. Keep them separate from your YubiKey.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Touch YubiKey Prompt */}
                {showTouchPrompt && (
                  <div
                    className="p-4 rounded-lg border-2 animate-pulse"
                    style={{
                      backgroundColor: 'rgba(249, 139, 28, 0.1)',
                      borderColor: '#F98B1C',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Fingerprint className="h-6 w-6 flex-shrink-0" style={{ color: '#F98B1C' }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#F98B1C' }}>
                          Touch your YubiKey now
                        </p>
                        <p className="text-xs text-secondary mt-0.5">
                          The green light should be blinking
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: 'rgba(185, 28, 28, 0.15)',
                      borderColor: '#991B1B',
                    }}
                  >
                    <div className="flex gap-3">
                      <AlertTriangle
                        className="h-5 w-5 flex-shrink-0 mt-0.5"
                        style={{ color: '#991B1B' }}
                      />
                      <p className="text-sm" style={{ color: '#FCA5A5' }}>
                        {error}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    ref={lastFocusableRef}
                    onClick={handleSetup}
                    disabled={
                      isSetupInProgress ||
                      !label.trim() ||
                      !pin ||
                      !confirmPin ||
                      !recoveryPin ||
                      !confirmRecoveryPin ||
                      pin !== confirmPin ||
                      recoveryPin !== confirmRecoveryPin ||
                      pin === recoveryPin
                    }
                    className="flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-default flex items-center justify-center gap-2 border"
                    style={
                      !(
                        isSetupInProgress ||
                        !label.trim() ||
                        !pin ||
                        !confirmPin ||
                        !recoveryPin ||
                        !confirmRecoveryPin ||
                        pin !== confirmPin ||
                        recoveryPin !== confirmRecoveryPin ||
                        pin === recoveryPin
                      )
                        ? { backgroundColor: '#1D4ED8', color: '#ffffff', borderColor: '#1D4ED8' }
                        : {
                            backgroundColor: 'rgb(var(--surface-hover))',
                            color: 'rgb(var(--text-muted))',
                            borderColor: 'rgb(var(--border-default))',
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = '#1E40AF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = '#1D4ED8';
                      }
                    }}
                  >
                    {isSetupInProgress ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      'Setup YubiKey'
                    )}
                  </button>
                  <button
                    onClick={() => setStep('detect')}
                    disabled={isSetupInProgress}
                    tabIndex={-1}
                    className="px-4 py-2 text-main bg-hover rounded-lg hover:bg-hover"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Setup Step - For REUSED YubiKeys without TDES (Scenario 2) */}
            {step === 'setup' &&
              selectedKey &&
              selectedKey.state === 'reused' &&
              !selectedKey.has_tdes_protected_mgmt_key && (
                <div className="space-y-4" onKeyDown={handleKeyDown}>
                  {/* S/N */}
                  <div>
                    <p className="text-sm text-main">
                      <span className="font-medium">S/N:</span> {selectedKey.serial}
                    </p>
                  </div>

                  {/* YubiKey Label */}
                  <div>
                    <label className="block text-sm font-medium text-main mb-2">
                      YubiKey Label *
                    </label>
                    <input
                      ref={firstFocusableRef}
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      maxLength={24}
                      className="w-full px-3 py-2 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input text-main"
                      placeholder="e.g., Personal YubiKey"
                    />
                    <p
                      className="mt-1 text-xs"
                      style={{ color: label.length >= 24 ? '#B91C1C' : '#64748b' }}
                    >
                      {label.length}/24 characters
                    </p>
                  </div>

                  {/* PIN Field (your custom PIN) */}
                  <div>
                    <label className="block text-sm font-medium text-main mb-2">
                      PIN (your custom PIN) *
                    </label>
                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        maxLength={8}
                        className="w-full px-3 py-2 pr-10 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input text-main placeholder-gray-400"
                        placeholder="Enter your PIN"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        tabIndex={-1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-secondary transition-colors"
                        aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                      >
                        {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Touch Prompt */}
                  {showTouchPrompt && (
                    <div
                      className="p-4 rounded-lg border-2 animate-pulse"
                      style={{
                        backgroundColor: 'rgba(249, 139, 28, 0.1)',
                        borderColor: '#F98B1C',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Fingerprint
                          className="h-6 w-6 flex-shrink-0"
                          style={{ color: '#F98B1C' }}
                        />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#F98B1C' }}>
                            Touch your YubiKey now
                          </p>
                          <p className="text-xs text-secondary mt-0.5">
                            The green light should be blinking
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div
                      className="p-4 rounded-lg border"
                      style={{
                        backgroundColor: 'rgba(185, 28, 28, 0.15)',
                        borderColor: '#991B1B',
                      }}
                    >
                      <div className="flex gap-3">
                        <AlertTriangle
                          className="h-5 w-5 flex-shrink-0 mt-0.5"
                          style={{ color: '#991B1B' }}
                        />
                        <p className="text-sm" style={{ color: '#FCA5A5' }}>
                          {error}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      ref={lastFocusableRef}
                      onClick={handleSetup}
                      disabled={isSetupInProgress || !label.trim() || !pin}
                      className="flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-default flex items-center justify-center gap-2 border"
                      style={
                        !(isSetupInProgress || !label.trim() || !pin)
                          ? { backgroundColor: '#1D4ED8', color: '#ffffff', borderColor: '#1D4ED8' }
                          : {
                              backgroundColor: 'rgb(var(--surface-hover))',
                              color: 'rgb(var(--text-muted))',
                              borderColor: 'rgb(var(--border-default))',
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = '#1E40AF';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = '#1D4ED8';
                        }
                      }}
                    >
                      {isSetupInProgress ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        'Setup YubiKey'
                      )}
                    </button>
                    <button
                      onClick={() => setStep('detect')}
                      disabled={isSetupInProgress}
                      tabIndex={-1}
                      className="px-4 py-2 text-main bg-hover rounded-lg hover:bg-hover"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

            {/* Setup Step - For REUSED YubiKeys with TDES (Scenario 3) */}
            {step === 'setup' &&
              selectedKey &&
              selectedKey.state === 'reused' &&
              selectedKey.has_tdes_protected_mgmt_key && (
                <div className="space-y-4" onKeyDown={handleKeyDown}>
                  {/* S/N */}
                  <div>
                    <p className="text-sm text-main">
                      <span className="font-medium">S/N:</span> {selectedKey.serial}
                    </p>
                  </div>

                  {/* YubiKey Label */}
                  <div>
                    <label className="block text-sm font-medium text-main mb-2">
                      YubiKey Label *
                    </label>
                    <input
                      ref={firstFocusableRef}
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      maxLength={24}
                      className="w-full px-3 py-2 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input text-main"
                      placeholder="e.g., Personal YubiKey"
                    />
                    <p
                      className="mt-1 text-xs"
                      style={{ color: label.length >= 24 ? '#B91C1C' : '#64748b' }}
                    >
                      {label.length}/24 characters
                    </p>
                  </div>

                  {/* PIN Field (your custom PIN) */}
                  <div>
                    <label className="block text-sm font-medium text-main mb-2">
                      PIN (your custom PIN) *
                    </label>
                    <div className="relative">
                      <input
                        id="yubikey-pin-reused"
                        type={showPin ? 'text' : 'password'}
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        maxLength={8}
                        className="w-full px-3 py-2 pr-10 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input text-main placeholder-gray-400"
                        placeholder="Enter your PIN"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        tabIndex={-1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-secondary transition-colors"
                        aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                      >
                        {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Touch Prompt */}
                  {showTouchPrompt && (
                    <div
                      className="p-4 rounded-lg border-2 animate-pulse"
                      style={{
                        backgroundColor: 'rgba(249, 139, 28, 0.1)',
                        borderColor: '#F98B1C',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <Fingerprint
                          className="h-6 w-6 flex-shrink-0"
                          style={{ color: '#F98B1C' }}
                        />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#F98B1C' }}>
                            Touch your YubiKey now
                          </p>
                          <p className="text-xs text-secondary mt-0.5">
                            The green light should be blinking
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div
                      className="p-4 rounded-lg border"
                      style={{
                        backgroundColor: 'rgba(185, 28, 28, 0.15)',
                        borderColor: '#991B1B',
                      }}
                    >
                      <div className="flex gap-3">
                        <AlertTriangle
                          className="h-5 w-5 flex-shrink-0 mt-0.5"
                          style={{ color: '#991B1B' }}
                        />
                        <p className="text-sm" style={{ color: '#FCA5A5' }}>
                          {error}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      ref={lastFocusableRef}
                      onClick={handleSetup}
                      disabled={isSetupInProgress || !label.trim() || !pin}
                      className="flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-default flex items-center justify-center gap-2 border"
                      style={
                        !(isSetupInProgress || !label.trim() || !pin)
                          ? { backgroundColor: '#1D4ED8', color: '#ffffff', borderColor: '#1D4ED8' }
                          : {
                              backgroundColor: 'rgb(var(--surface-hover))',
                              color: 'rgb(var(--text-muted))',
                              borderColor: 'rgb(var(--border-default))',
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = '#1E40AF';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!e.currentTarget.disabled) {
                          e.currentTarget.style.backgroundColor = '#1D4ED8';
                        }
                      }}
                    >
                      {isSetupInProgress ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        'Setup YubiKey'
                      )}
                    </button>
                    <button
                      onClick={() => setStep('detect')}
                      disabled={isSetupInProgress}
                      tabIndex={-1}
                      className="px-4 py-2 text-main bg-hover rounded-lg hover:bg-hover"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

            {/* Setup Step - For ORPHANED YubiKeys */}
            {step === 'setup' && selectedKey && selectedKey.state === 'orphaned' && (
              <div className="space-y-4" onKeyDown={handleKeyDown}>
                {/* S/N */}
                <div>
                  <p className="text-sm text-main">
                    <span className="font-medium">S/N:</span> {selectedKey.serial}
                  </p>
                </div>

                {/* Public Key with Copy Box */}
                {selectedKey.recipient && (
                  <div>
                    <label className="block text-sm font-medium text-main mb-2">Public Key:</label>
                    <div
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border"
                      style={{
                        borderColor: 'rgba(59, 130, 246, 0.3)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      }}
                    >
                      <p className="flex-1 font-mono text-sm text-main truncate">
                        {selectedKey.recipient}
                      </p>
                      <button
                        onClick={() => handleCopyPublicKey(selectedKey.recipient!)}
                        className="flex-shrink-0 p-1.5 rounded transition-colors"
                        style={{ color: 'rgb(var(--text-muted))' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                          e.currentTarget.style.color = 'rgb(var(--text-secondary))';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = 'rgb(var(--text-muted))';
                        }}
                        aria-label="Copy public key"
                        title="Copy public key"
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* YubiKey Label */}
                <div>
                  <label className="block text-sm font-medium text-main mb-2">
                    YubiKey Label *
                  </label>
                  <input
                    id="yubikey-label-orphaned"
                    ref={firstFocusableRef}
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    maxLength={24}
                    className="w-full px-3 py-2 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input text-main"
                    placeholder="e.g., Personal YubiKey"
                  />
                  <p
                    className="mt-1 text-xs"
                    style={{ color: label.length >= 24 ? '#B91C1C' : '#64748b' }}
                  >
                    {label.length}/24 characters
                  </p>
                </div>

                {error && (
                  <div
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: 'rgba(185, 28, 28, 0.15)',
                      borderColor: '#991B1B',
                    }}
                  >
                    <div className="flex gap-3">
                      <AlertTriangle
                        className="h-5 w-5 flex-shrink-0 mt-0.5"
                        style={{ color: '#991B1B' }}
                      />
                      <p className="text-sm" style={{ color: '#FCA5A5' }}>
                        {error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Buttons with Premium Blue */}
                <div className="flex gap-3">
                  <button
                    ref={lastFocusableRef}
                    onClick={handleSetup}
                    disabled={isSetupInProgress || !label.trim()}
                    className="flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-default flex items-center justify-center gap-2 border"
                    style={
                      !(isSetupInProgress || !label.trim())
                        ? { backgroundColor: '#1D4ED8', color: '#ffffff', borderColor: '#1D4ED8' }
                        : {
                            backgroundColor: 'rgb(var(--surface-hover))',
                            color: 'rgb(var(--text-muted))',
                            borderColor: 'rgb(var(--border-default))',
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = '#1E40AF';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.currentTarget.disabled) {
                        e.currentTarget.style.backgroundColor = '#1D4ED8';
                      }
                    }}
                  >
                    {isSetupInProgress ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      'Add to Registry'
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setStep('detect');
                      setError(null);
                    }}
                    disabled={isSetupInProgress}
                    tabIndex={-1}
                    className="px-4 py-2 text-main bg-hover rounded-lg hover:bg-hover"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
