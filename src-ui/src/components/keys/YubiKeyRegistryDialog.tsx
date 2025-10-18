import React, { useState, useEffect } from 'react';
import { X, Fingerprint, Loader2, AlertCircle, CheckCircle2, Info, RefreshCw, Copy, Check, ChevronDown } from 'lucide-react';
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
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'detect' | 'setup' | 'recovery'>('detect');
  const [isCopied, setIsCopied] = useState(false);
  const [showSecurityTips, setShowSecurityTips] = useState(false);

  useEffect(() => {
    if (isOpen) {
      detectYubiKeys();
    }
  }, [isOpen]);

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

        const initResult = await commands.initYubikey(selectedKey.serial, pin, label.trim());

        if (initResult.status === 'error') {
          throw new Error(initResult.error.message || 'Failed to initialize YubiKey');
        }

        // Show recovery code step
        setRecoveryCode(initResult.data.recovery_code);
        setStep('recovery');
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

  const handleRecoveryAcknowledge = () => {
    handleSuccess();
  };

  const handleSuccess = () => {
    // Clear form
    setSelectedKey(null);
    setLabel('');
    setPin('');
    setConfirmPin('');
    setRecoveryCode(null);
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
      setRecoveryCode(null);
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
      setError(null);
    } else if (step === 'recovery') {
      // On recovery step, prevent closing (user must acknowledge)
      // Do nothing - user must click "I Have Saved My Recovery Code"
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
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                      >
                        <RefreshCw className="h-4 w-4 inline mr-2" />
                        Refresh
                      </button>
                      <button
                        onClick={handleCancel}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
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
                              : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">
                                YubiKey {yk.serial.substring(0, 8)}
                              </p>
                              <p className="text-xs text-gray-500">
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
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      Setting up YubiKey: <strong>{selectedKey.serial.substring(0, 8)}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Label *</label>
                    <input
                      type="text"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      maxLength={24}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Personal YubiKey"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Create PIN
                      <span className="text-gray-500 ml-2">(6-8 digits)</span>
                    </label>
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      maxLength={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm PIN *
                    </label>
                    <input
                      type="password"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      maxLength={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="••••••"
                    />
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex gap-2">
                      <Info className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <p className="text-sm text-green-800">
                        A recovery code will be generated for PIN recovery
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleSetup}
                      disabled={isSetupInProgress || !label.trim() || !pin || !confirmPin}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

            {/* Setup Step - For ORPHANED YubiKeys */}
            {step === 'setup' && selectedKey && selectedKey.state === 'orphaned' && (
              <div className="space-y-4">
                {/* YubiKey Info - S/N and Public Key */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">S/N:</span> {selectedKey.serial}
                  </p>
                  {selectedKey.recipient && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Public key:</span>{' '}
                          <span className="font-mono text-xs">{selectedKey.recipient.substring(0, 20)}...</span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopyPublicKey(selectedKey.recipient!)}
                        className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                        aria-label="Copy public key"
                        title="Copy public key"
                      >
                        {isCopied ? (
                          <Check className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Form Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Label *</label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Personal YubiKey"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter YubiKey PIN *
                    <span className="text-gray-500 ml-2">(to verify ownership)</span>
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••"
                  />
                </div>

                {/* YubiKey Ready - Collapsible */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowSecurityTips(!showSecurityTips)}
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                    aria-expanded={showSecurityTips}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>YubiKey Ready</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${showSecurityTips ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {showSecurityTips && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        This YubiKey is already initialized and ready to use. Once added to the registry, you can attach it to vaults for encryption operations.
                      </p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Buttons with Premium Blue */}
                <div className="flex gap-3">
                  <button
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
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {/* Recovery Code Step */}
            {step === 'recovery' && recoveryCode && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-3 flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Save Your Recovery Code
                      </h3>
                      <p className="text-sm text-gray-700">
                        This code can unlock your YubiKey PIN if you forget it.
                        <strong className="block mt-2 text-red-600">
                          This is the ONLY time you will see this code!
                        </strong>
                      </p>
                      <div className="bg-white border border-gray-300 rounded-lg p-4 font-mono text-xl text-center">
                        {recoveryCode}
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(recoveryCode)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Copy Code
                      </button>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Store in a password manager</li>
                        <li>• Keep separate from your YubiKey</li>
                        <li>• Required for PIN recovery</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRecoveryAcknowledge}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-5 w-5" />I Have Saved My Recovery Code
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
