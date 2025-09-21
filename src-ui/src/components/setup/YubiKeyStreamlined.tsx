import React, { useState, useEffect } from 'react';
import { Key, Shield, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { YubiKeyStateInfo, YubiKeyInitResult } from '../../lib/api-types';
import { safeInvoke } from '../../lib/tauri-safe';
import { logger } from '../../lib/logger';

interface YubiKeyStreamlinedProps {
  onComplete?: (result: YubiKeyInitResult) => void;
  onCancel?: () => void;
}

/**
 * Minimal YubiKey setup component with PIN confirmation
 * Supports multiple YubiKeys for backup
 */
export const YubiKeyStreamlined: React.FC<YubiKeyStreamlinedProps> = ({ onComplete, onCancel }) => {
  const [yubikeys, setYubikeys] = useState<YubiKeyStateInfo[]>([]);
  const [selectedKey, setSelectedKey] = useState<YubiKeyStateInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PIN entry state
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [label, setLabel] = useState('');
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [showRecoveryWarning, setShowRecoveryWarning] = useState(false);

  // Operation state
  const [operation, setOperation] = useState<'detect' | 'setup' | 'recovery' | 'complete'>(
    'detect',
  );

  useEffect(() => {
    detectYubiKeys();
  }, []);

  const detectYubiKeys = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const keys = await safeInvoke<YubiKeyStateInfo[]>(
        'list_yubikeys',
        undefined,
        'YubiKeyStreamlined.detectYubiKeys',
      );

      setYubikeys(keys);

      // Auto-select if only one key
      if (keys.length === 1) {
        setSelectedKey(keys[0]);
        setLabel(`YubiKey-${keys[0].serial.substring(0, 6)}`);
      }
    } catch (err) {
      logger.error('YubiKeyStreamlined', 'Failed to detect YubiKeys', err as Error);
      setError('Failed to detect YubiKeys. Please ensure one is connected.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialize = async () => {
    if (!selectedKey || !pin || pin !== pinConfirm) return;

    setIsLoading(true);
    setError(null);

    try {
      let result: YubiKeyInitResult;

      if (selectedKey.state === 'new') {
        // Initialize new YubiKey
        result = await safeInvoke<YubiKeyInitResult>(
          'init_yubikey',
          {
            serial: selectedKey.serial,
            new_pin: pin,
            label: label || `YubiKey-${selectedKey.serial.substring(0, 6)}`,
          },
          'YubiKeyStreamlined.initYubiKey',
        );
      } else if (selectedKey.state === 'reused') {
        // Register reused YubiKey
        result = await safeInvoke<YubiKeyInitResult>(
          'register_yubikey',
          {
            serial: selectedKey.serial,
            label: label || `YubiKey-${selectedKey.serial.substring(0, 6)}`,
            pin: pin,
          },
          'YubiKeyStreamlined.registerYubiKey',
        );
      } else {
        throw new Error('YubiKey is already registered');
      }

      // Store recovery code for display if present
      if (result.recovery_code) {
        setRecoveryCode(result.recovery_code);
        setShowRecoveryWarning(true);
        setOperation('recovery');
      } else {
        setOperation('complete');
        onComplete?.(result);
      }
    } catch (err: any) {
      logger.error('YubiKeyStreamlined', 'Failed to setup YubiKey', err as Error);
      setError(err.message || 'Failed to setup YubiKey');
    } finally {
      setIsLoading(false);
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'new':
        return 'text-green-600';
      case 'reused':
        return 'text-blue-600';
      case 'initialized':
        return 'text-gray-500';
      case 'UNKNOWN':
        return 'text-yellow-600';
      default:
        return 'text-gray-400';
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'new':
        return 'New (Ready for setup)';
      case 'reused':
        return 'Reused (Needs registration)';
      case 'initialized':
        return 'Already registered';
      case 'UNKNOWN':
        return 'Needs recovery (manifest missing)';
      default:
        return 'Unknown';
    }
  };

  const isPinValid = pin.length >= 6 && pin.length <= 8 && /^\d+$/.test(pin);
  const isPinMatch = pin === pinConfirm;
  const canProceed = selectedKey && isPinValid && isPinMatch && label.trim();

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-blue-600" />
          <h2 className="text-2xl font-semibold text-gray-900">YubiKey Setup</h2>
        </div>

        {operation === 'detect' && (
          <>
            {/* YubiKey Detection */}
            <div className="space-y-4">
              <p className="text-gray-600">
                Connect your YubiKey to set up hardware-based encryption. We recommend having at
                least 2 YubiKeys for backup.
              </p>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : yubikeys.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-800">No YubiKey detected</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Please insert your YubiKey and click "Refresh"
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {yubikeys.map((yk) => (
                    <button
                      key={yk.serial}
                      onClick={() => {
                        if (yk.state !== 'initialized') {
                          setSelectedKey(yk);
                          setLabel(`YubiKey-${yk.serial.substring(0, 6)}`);
                          setOperation('setup');
                        }
                      }}
                      disabled={yk.state === 'initialized'}
                      className={`w-full p-4 border rounded-lg text-left transition-colors ${
                        yk.state === 'initialized'
                          ? 'bg-gray-50 border-gray-200 cursor-not-allowed'
                          : 'hover:bg-blue-50 hover:border-blue-300 cursor-pointer'
                      } ${selectedKey?.serial === yk.serial ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Key className="h-5 w-5 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {(yk as any).label || `YubiKey ${yk.serial.substring(0, 8)}`}
                            </p>
                            <p className={`text-sm ${getStateColor(yk.state)}`}>
                              {getStateLabel(yk.state)}
                            </p>
                          </div>
                        </div>
                        {yk.state === 'initialized' && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={detectYubiKeys}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Refresh
                </button>
                {onCancel && (
                  <button
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {operation === 'setup' && selectedKey && (
          <>
            {/* PIN Setup */}
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  Setting up:{' '}
                  <strong>
                    {(selectedKey as any).label || `YubiKey ${selectedKey.serial.substring(0, 8)}`}
                  </strong>
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  {selectedKey.state === 'new'
                    ? 'This is a new YubiKey. We will initialize it for you.'
                    : 'This YubiKey is already configured. Enter your existing PIN.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Label</label>
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
                  {selectedKey.state === 'new' ? 'Create PIN' : 'Enter PIN'}
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
                {pin && !isPinValid && (
                  <p className="text-sm text-red-600 mt-1">PIN must be 6-8 digits</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm PIN</label>
                <input
                  type="password"
                  value={pinConfirm}
                  onChange={(e) => setPinConfirm(e.target.value)}
                  maxLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••"
                />
                {pinConfirm && !isPinMatch && (
                  <p className="text-sm text-red-600 mt-1">PINs do not match</p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> We'll generate a secure recovery code for you. This code
                  can unlock your PIN if you forget it.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleInitialize}
                  disabled={!canProceed || isLoading}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    canProceed && !isLoading
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Setting up...
                    </span>
                  ) : (
                    'Initialize YubiKey'
                  )}
                </button>
                <button
                  onClick={() => setOperation('detect')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                  disabled={isLoading}
                >
                  Back
                </button>
              </div>
            </div>
          </>
        )}

        {operation === 'recovery' && recoveryCode && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-3 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Save Your Recovery Code</h3>
                  <p className="text-sm text-gray-700">
                    This recovery code can unlock your YubiKey PIN if you forget it.
                    <strong className="block mt-2 text-red-600">
                      This is the ONLY time you will see this code!
                    </strong>
                  </p>
                  <div className="bg-white border border-gray-300 rounded-lg p-4 font-mono text-2xl text-center">
                    {recoveryCode}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(recoveryCode);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Copy Code
                    </button>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1 mt-3">
                    <li>• Store this code in a safe place (password manager, safe, etc.)</li>
                    <li>• Do NOT store it with your YubiKey</li>
                    <li>• You will need this if you forget your PIN</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setOperation('complete');
                  if (selectedKey) {
                    const result = {
                      success: true,
                      key_reference: {
                        id: selectedKey.serial,
                        label: label,
                      } as any,
                      recovery_code: recoveryCode || undefined,
                    } as YubiKeyInitResult;
                    onComplete?.(result);
                  }
                }}
                disabled={!showRecoveryWarning}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  showRecoveryWarning
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                I Have Saved My Recovery Code
              </button>
            </div>
          </div>
        )}

        {operation === 'complete' && (
          <div className="text-center py-8">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">YubiKey Setup Complete!</h3>
            <p className="text-gray-600">
              Your YubiKey has been successfully configured for use with Barqly Vault.
            </p>
          </div>
        )}
      </div>

      {/* Multi-key recommendation */}
      {operation === 'detect' && yubikeys.length < 2 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Security Recommendation</p>
              <p className="text-sm text-blue-800 mt-1">
                We recommend setting up at least 2 YubiKeys. This ensures you have a backup if one
                is lost or damaged.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
