import React, { useState, useEffect } from 'react';
import { X, Fingerprint, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useVault } from '../../contexts/VaultContext';
import { logger } from '../../lib/logger';
import { safeInvoke } from '../../lib/tauri-safe';
import {
  YubiKeyStateInfo,
  YubiKeyInitForVaultParams,
  RegisterYubiKeyForVaultParams,
  YubiKeyInitResult,
} from '../../lib/api-types';

interface YubiKeySetupDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  slotIndex: number; // 0, 1, or 2
}

/**
 * Dialog for setting up a YubiKey for the current vault
 * Handles both new and existing YubiKey registration
 */
export const YubiKeySetupDialog: React.FC<YubiKeySetupDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  slotIndex,
}) => {
  const { currentVault, refreshKeys } = useVault();
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

  useEffect(() => {
    if (isOpen) {
      detectYubiKeys();
    }
  }, [isOpen]);

  const detectYubiKeys = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get available YubiKeys for this vault
      if (!currentVault?.id) {
        setError('No vault selected');
        setIsLoading(false);
        return;
      }

      // Tauri v2 expects camelCase from JS even though Rust uses snake_case
      const keys = await safeInvoke<YubiKeyStateInfo[]>(
        'list_available_yubikeys',
        { vaultId: currentVault.id },
        'YubiKeySetupDialog.detectYubiKeys',
      );

      // Filter out already registered keys for this vault
      const availableKeys = keys.filter(
        (k) => k.state === 'NEW' || k.state === 'REUSED' || k.state === 'UNKNOWN',
      );

      setYubikeys(availableKeys);

      // Auto-select if only one available
      if (availableKeys.length === 1) {
        setSelectedKey(availableKeys[0]);
        setLabel(`YubiKey-${availableKeys[0].serial.substring(0, 6)}`);
      }
    } catch (err: any) {
      logger.error('YubiKeySetupDialog', 'Failed to detect YubiKeys', err);
      setError('Failed to detect YubiKeys. Please ensure one is connected.');
    } finally {
      setIsLoading(false);
    }
  };

  const validatePin = (): string | null => {
    if (!label.trim()) {
      return 'Label is required';
    }
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

    if (!selectedKey || !currentVault) {
      setError('No YubiKey or vault selected');
      return;
    }

    setIsSetupInProgress(true);
    setError(null);

    try {
      if (selectedKey.state === 'NEW') {
        // Initialize new YubiKey
        logger.info('YubiKeySetupDialog', 'Initializing new YubiKey', {
          serial: selectedKey.serial,
        });

        const initParams: YubiKeyInitForVaultParams = {
          serial: selectedKey.serial,
          pin,
          label: label.trim(),
          vault_id: currentVault.id,
          slot_index: slotIndex,
        };

        const result = await safeInvoke<YubiKeyInitResult>(
          'init_yubikey_for_vault',
          initParams,
          'YubiKeySetupDialog.initYubiKey',
        );

        if (result.recovery_code) {
          setRecoveryCode(result.recovery_code);
          setStep('recovery');

          // Refresh keys to show the newly added YubiKey
          await refreshKeys();
          return;
        }
      } else {
        // Register existing YubiKey (REUSED or ORPHANED)
        logger.info('YubiKeySetupDialog', 'Registering existing YubiKey', {
          serial: selectedKey.serial,
          state: selectedKey.state,
        });

        const registerParams: RegisterYubiKeyForVaultParams = {
          serial: selectedKey.serial,
          pin,
          label: label.trim(),
          vault_id: currentVault.id,
          slot_index: slotIndex,
        };

        await safeInvoke<{ success: boolean }>(
          'register_yubikey_for_vault',
          registerParams,
          'YubiKeySetupDialog.registerYubiKey',
        );
      }

      // Refresh keys to show the newly added YubiKey
      await refreshKeys();
      handleSuccess();
    } catch (err: any) {
      logger.error('YubiKeySetupDialog', 'Failed to setup YubiKey', err);
      setError(err.message || 'Failed to setup YubiKey');
    } finally {
      setIsSetupInProgress(false);
    }
  };

  const handleRecoveryAcknowledge = async () => {
    // Keys are already refreshed when recovery code is generated
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

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={handleCancel} />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Fingerprint className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Setup YubiKey {slotIndex + 1}</h2>
            </div>
            <button
              onClick={handleCancel}
              disabled={isSetupInProgress}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
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
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-yellow-800">No YubiKey detected</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            Please insert a YubiKey and click Refresh
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={detectYubiKeys}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Refresh
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Select a YubiKey to register with this vault:
                    </p>
                    <div className="space-y-2">
                      {yubikeys.map((yk) => (
                        <button
                          key={yk.serial}
                          onClick={() => {
                            setSelectedKey(yk);
                            setLabel(`YubiKey-${yk.serial.substring(0, 6)}`);
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
                                {yk.state === 'NEW'
                                  ? 'New device - will be initialized'
                                  : yk.state === 'UNKNOWN'
                                    ? 'Needs recovery'
                                    : 'Ready to register'}
                              </p>
                            </div>
                            {yk.state === 'NEW' && (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                New
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}
              </div>
            )}

            {/* Setup Step */}
            {step === 'setup' && selectedKey && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    Setting up: <strong>YubiKey {selectedKey.serial.substring(0, 8)}</strong>
                  </p>
                </div>

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
                    {selectedKey.state === 'NEW' ? 'Create PIN' : 'Enter PIN'}
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

                {selectedKey.state === 'NEW' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex gap-2">
                      <Info className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <p className="text-sm text-green-800">
                        A recovery code will be generated for PIN recovery
                      </p>
                    </div>
                  </div>
                )}

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
