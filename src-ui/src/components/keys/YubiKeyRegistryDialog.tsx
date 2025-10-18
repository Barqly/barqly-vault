import React, { useState, useEffect, useRef } from 'react';
import { X, Fingerprint, Loader2, AlertCircle, CheckCircle2, Info, RefreshCw, Copy, Check, ChevronDown, Eye, EyeOff } from 'lucide-react';
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
  return {
    label: 'Register',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
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

  // Refs for focus trap
  const firstFocusableRef = useRef<HTMLInputElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      detectYubiKeys();
    }
  }, [isOpen]);

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

      logger.info('YubiKeyRegistryDialog', 'Available YubiKeys after filtering', {
        count: availableKeys.length,
        availableKeys: availableKeys,
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

  const validatePin = (): string | null => {
    if (!label.trim()) {
      return 'Label is required';
    }

    // For orphaned keys, we only need to verify the PIN
    if (selectedKey?.state === 'orphaned') {
      if (!pin) {
        return 'PIN is required to verify YubiKey ownership';
      }
      return null;
    }

    // For new/reused keys, validate PIN creation
    if (pin.length < 6 || pin.length > 8) {
      return 'PIN must be 6-8 digits';
    }
    if (!/^\d+$/.test(pin)) {
      return 'PIN must contain only numbers';
    }
    if (pin !== confirmPin) {
      return 'PINs do not match';
    }

    // Validate Recovery PIN
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
      if (selectedKey.state === 'new' || selectedKey.state === 'reused') {
        // Initialize new/reused YubiKey
        logger.info('YubiKeyRegistryDialog', 'Initializing YubiKey', {
          serial: selectedKey.serial,
          state: selectedKey.state,
        });

        const initResult = await commands.initYubikey(
          selectedKey.serial,
          pin,
          recoveryPin,
          label.trim()
        );

        if (initResult.status === 'error') {
          throw new Error(initResult.error.message || 'Failed to initialize YubiKey');
        }

        // Success - no recovery code step needed
        handleSuccess();
      } else if (selectedKey.state === 'orphaned') {
        // Register orphaned YubiKey
        logger.info('YubiKeyRegistryDialog', 'Registering orphaned YubiKey', {
          serial: selectedKey.serial,
        });

        const registerResult = await commands.registerYubikey(
          selectedKey.serial,
          label.trim(),
          pin,
        );

        if (registerResult.status === 'error') {
          throw new Error(registerResult.error.message || 'Failed to register YubiKey');
        }

        // No recovery code for orphaned keys (already initialized)
        handleSuccess();
      }
    } catch (err: any) {
      logger.error('YubiKeyRegistryDialog', 'Failed to setup YubiKey', err);
      setError(err.message || 'Failed to setup YubiKey');
    } finally {
      setIsSetupInProgress(false);
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
      logger.error('YubiKeyRegistryDialog', 'Failed to copy public key', err);
    }
  };

  // Focus trap: cycle focus within modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isOrphaned = selectedKey?.state === 'orphaned';

    // Enter key submission
    if (e.key === 'Enter' && !isSetupInProgress) {
      let isFormValid = false;

      if (isOrphaned) {
        // Orphaned: only need label and PIN
        isFormValid = !!(label.trim() && pin);
      } else {
        // New/Reused: need all PIN fields valid
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

    if (isOrphaned) {
      // Orphaned form: Label + PIN
      isButtonEnabled = !!(label.trim() && pin && !isSetupInProgress);
      lastInputId = 'yubikey-pin-orphaned';
    } else {
      // New/Reused form: Label + PIN + Confirm + Recovery PIN + Confirm
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={handleBackdropClick} />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none">
        <div className="bg-elevated rounded-lg shadow-xl w-full pointer-events-auto" style={{ maxWidth: '600px', border: '1px solid #ffd4a3' }}>
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
                    <div
                      className={`${error ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'} border rounded-lg p-4`}
                    >
                      <div className="flex gap-3">
                        <AlertCircle
                          className={`h-5 w-5 ${error ? 'text-blue-600' : 'text-amber-600'} flex-shrink-0 mt-0.5`}
                        />
                        <div>
                          <p
                            className={`text-sm ${error ? 'text-blue-800' : 'text-amber-800'} font-medium`}
                          >
                            {error || 'No YubiKeys available for registration'}
                          </p>
                          {!error && (
                            <p className="text-sm text-amber-700 mt-1">
                              Insert your YubiKey to add it to the registry. The green light should
                              be blinking.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={detectYubiKeys}
                        className="flex-1 px-4 py-2 bg-hover text-gray-800 rounded-lg hover:bg-gray-300"
                      >
                        <RefreshCw className="h-4 w-4 inline mr-2" />
                        Refresh
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex-1 px-4 py-2 bg-hover text-main rounded-lg hover:bg-hover"
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
                      {yubikeys.map((yk) => (
                        <button
                          key={yk.serial}
                          onClick={() => {
                            setSelectedKey(yk);
                            setLabel(yk.label || `YubiKey-${yk.serial}`);
                            setStep('setup');
                          }}
                          className={`w-full p-3 border rounded-lg text-left transition-colors hover:bg-blue-50 hover:border-blue-300 ${
                            selectedKey?.serial === yk.serial
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-default'
                          }`}
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
                                <span className={`text-xs px-2 py-1 rounded ${badge.bgClass} ${badge.textClass}`}>
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

            {/* Setup Step - For NEW/REUSED YubiKeys */}
            {step === 'setup' &&
              selectedKey &&
              (selectedKey.state === 'new' || selectedKey.state === 'reused') && (
                <div className="space-y-4" onKeyDown={handleKeyDown}>
                  {/* S/N */}
                  <div>
                    <p className="text-sm text-main">
                      <span className="font-medium">S/N:</span> {selectedKey.serial}
                    </p>
                  </div>

                  {/* YubiKey Label */}
                  <div>
                    <label className="block text-sm font-medium text-main mb-2">YubiKey Label *</label>
                    <input
                      ref={firstFocusableRef}
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      maxLength={24}
                      className="w-full px-3 py-2 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Personal YubiKey"
                    />
                  </div>

                  {/* PIN Fields - 2 Column Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-main mb-2">
                        Create PIN *
                      </label>
                      <div className="relative">
                        <input
                          type={showPin ? 'text' : 'password'}
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          maxLength={8}
                          className="w-full px-3 py-2 pr-10 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2"
                          style={
                            confirmPin
                              ? pin === confirmPin
                                ? { borderColor: 'rgb(var(--border-default))', '--tw-ring-color': 'rgb(59, 130, 246)' } as React.CSSProperties
                                : { borderColor: '#FCA5A5', '--tw-ring-color': '#B91C1C' } as React.CSSProperties
                              : { borderColor: 'rgb(var(--border-default))', '--tw-ring-color': 'rgb(59, 130, 246)' } as React.CSSProperties
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
                        <p className="text-xs mt-1" style={{ color: pin === confirmPin ? 'inherit' : '#B91C1C' }}>
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
                          className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2"
                          style={
                            recoveryPin && pin
                              ? recoveryPin !== pin
                                ? { borderColor: 'rgb(var(--border-default))', '--tw-ring-color': 'rgb(59, 130, 246)' } as React.CSSProperties
                                : { borderColor: '#FCA5A5', '--tw-ring-color': '#B91C1C' } as React.CSSProperties
                              : { borderColor: 'rgb(var(--border-default))', '--tw-ring-color': 'rgb(59, 130, 246)' } as React.CSSProperties
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
                          {showRecoveryPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {recoveryPin && pin && recoveryPin === pin && (
                        <p className="text-xs mt-1" style={{ color: '#B91C1C' }}>
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
                          className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2"
                          style={
                            confirmRecoveryPin
                              ? recoveryPin === confirmRecoveryPin
                                ? { borderColor: 'rgb(var(--border-default))', '--tw-ring-color': 'rgb(59, 130, 246)' } as React.CSSProperties
                                : { borderColor: '#FCA5A5', '--tw-ring-color': '#B91C1C' } as React.CSSProperties
                              : { borderColor: 'rgb(var(--border-default))', '--tw-ring-color': 'rgb(59, 130, 246)' } as React.CSSProperties
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
                          {showRecoveryPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {confirmRecoveryPin && (
                        <p className="text-xs mt-1" style={{ color: recoveryPin === confirmRecoveryPin ? 'inherit' : '#B91C1C' }}>
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
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.05)'
                        }}
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="mb-1 flex items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-heading border" style={{ backgroundColor: 'rgb(var(--surface-card))', borderColor: 'rgb(var(--border-default))' }}>
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
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-heading border" style={{ backgroundColor: 'rgb(var(--surface-card))', borderColor: 'rgb(var(--border-default))' }}>
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

                        <p className="mt-4 border-t pt-3 text-xs text-secondary italic" style={{ borderColor: 'rgb(var(--border-default))' }}>
                          <span className="font-semibold">Security Note:</span> Store both PINs securely in a password manager. Keep them separate from your YubiKey.
                        </p>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{error}</p>
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
                          : { backgroundColor: 'rgb(var(--surface-hover))', color: 'rgb(var(--text-muted))', borderColor: 'rgb(var(--border-default))' }
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
                    <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50">
                      <p className="flex-1 font-mono text-sm text-main truncate">
                        {selectedKey.recipient}
                      </p>
                      <button
                        onClick={() => handleCopyPublicKey(selectedKey.recipient!)}
                        className="flex-shrink-0 p-1.5 text-muted hover:text-secondary hover:bg-blue-100 rounded transition-colors"
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
                  <label className="block text-sm font-medium text-main mb-2">YubiKey Label *</label>
                  <input
                    ref={firstFocusableRef}
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Personal YubiKey"
                  />
                </div>

                {/* YubiKey PIN */}
                <div>
                  <label className="block text-sm font-medium text-main mb-2">YubiKey PIN *</label>
                  <input
                    id="yubikey-pin-orphaned"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={8}
                    className="w-full px-3 py-2 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Buttons with Premium Blue */}
                <div className="flex gap-3">
                  <button
                    ref={lastFocusableRef}
                    onClick={handleSetup}
                    disabled={isSetupInProgress || !label.trim() || !pin}
                    className="flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-default flex items-center justify-center gap-2 border"
                    style={
                      !(isSetupInProgress || !label.trim() || !pin)
                        ? { backgroundColor: '#1D4ED8', color: '#ffffff', borderColor: '#1D4ED8' }
                        : { backgroundColor: 'rgb(var(--surface-hover))', color: 'rgb(var(--text-muted))', borderColor: 'rgb(var(--border-default))' }
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
                      setPin('');
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
