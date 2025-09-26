import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  Eye,
  EyeOff,
  Zap,
  AlertCircle,
  CheckCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { YubiKeyDecryptParams, ConnectionStatus } from '../../bindings';
import { commands } from '../../bindings';
import type { YubiKeyStateInfo } from '../../bindings';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorMessage } from '../ui/error-message';
import EnhancedInput from '../forms/EnhancedInput';

interface YubiKeyDecryptionProps {
  filePath: string;
  outputDir: string;
  selectedDevice?: YubiKeyStateInfo | null;
  onDecryptionStart?: (params: YubiKeyDecryptParams) => void;
  onDeviceSelect?: (device: YubiKeyStateInfo) => void;
  isLoading?: boolean;
}

/**
 * Component for YubiKey-based decryption
 * Handles device selection, PIN entry, and touch confirmation
 */
const YubiKeyDecryption: React.FC<YubiKeyDecryptionProps> = ({
  filePath,
  outputDir,
  selectedDevice,
  onDecryptionStart,
  onDeviceSelect,
  isLoading = false,
}) => {
  const [availableDevices, setAvailableDevices] = useState<YubiKeyStateInfo[]>([]);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [touchRequired, setTouchRequired] = useState(false);

  // Load available devices on mount
  useEffect(() => {
    loadAvailableDevices();
  }, []);

  // Test connection when device is selected
  useEffect(() => {
    if (selectedDevice) {
      testDeviceConnection(selectedDevice);
    }
  }, [selectedDevice]);

  const loadAvailableDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const result = await commands.yubikeyListDevices();

      if (result.status === 'error') {
        throw new Error(result.error.message || 'Failed to load YubiKey devices');
      }

      setAvailableDevices(result.data);

      // Auto-select first device if none selected
      if (result.data.length > 0 && !selectedDevice && onDeviceSelect) {
        onDeviceSelect(result.data[0]);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const testDeviceConnection = async (device: YubiKeyStateInfo) => {
    setIsTestingConnection(true);
    setConnectionStatus(null);

    try {
      // For connection testing, we need the PIN. If not provided, show error.
      if (!pin) {
        setConnectionStatus({
          is_connected: false,
          error_message: 'PIN required for connection test',
        });
        return;
      }

      const result = await commands.checkYubikeyAvailability({ serial: device.serial });

      if (result.status === 'error') {
        throw new Error(result.error.message || 'Connection test failed');
      }

      // Convert from YubiKeyConnectionTest to ConnectionStatus format
      const connectionStatus: ConnectionStatus = {
        is_connected: result.data.status === 'Success',
        error_message:
          result.data.status !== 'Success' && 'Failed' in result.data.status
            ? result.data.status.Failed.reason
            : undefined,
      };

      setConnectionStatus(connectionStatus);
    } catch (error: any) {
      setConnectionStatus({
        is_connected: false,
        error_message: error.message,
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handlePinChange = (value: string) => {
    // Only allow numeric input for PIN
    const numericValue = value.replace(/\D/g, '');
    setPin(numericValue);
    setError(null);
  };

  const validatePin = (): boolean => {
    if (pin.length < 6 || pin.length > 8) {
      setError('YubiKey PIN must be 6-8 digits');
      return false;
    }
    if (!/^\d+$/.test(pin)) {
      setError('YubiKey PIN must contain only digits');
      return false;
    }
    return true;
  };

  const handleDecrypt = async () => {
    if (!selectedDevice || !validatePin() || !onDecryptionStart) return;

    const decryptParams: YubiKeyDecryptParams = {
      file_path: filePath,
      device_id: selectedDevice.serial,
      pin: pin,
      output_dir: outputDir,
    };

    setTouchRequired(true);
    onDecryptionStart(decryptParams);
  };

  const canDecrypt = selectedDevice && pin.length >= 6 && connectionStatus?.is_connected;

  if (isLoadingDevices) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Loading YubiKey Devices</h3>
        <div className="flex items-center justify-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <LoadingSpinner size="md" className="mr-3" />
          <span className="text-gray-600">Detecting YubiKey devices...</span>
        </div>
      </div>
    );
  }

  if (availableDevices.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">YubiKey Required</h3>
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <Fingerprint className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            Please insert your YubiKey device to decrypt this vault.
          </p>
          <button
            onClick={loadAvailableDevices}
            disabled={isLoadingDevices}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            {isLoadingDevices ? 'Checking...' : 'Check Again'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">YubiKey Decryption</h3>
        <p className="text-sm text-gray-600">
          Use your YubiKey hardware device to securely decrypt your vault.
        </p>
      </div>

      {/* Device Selection */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Select YubiKey Device</h4>
        <div className="grid grid-cols-1 gap-3">
          {availableDevices.map((device) => {
            const isSelected = selectedDevice?.serial === device.serial;
            const deviceConnectionStatus = isSelected ? connectionStatus : null;

            return (
              <div
                key={device.serial}
                className={`
                  relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200
                  ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }
                  ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                `}
                onClick={() => !isLoading && onDeviceSelect && onDeviceSelect(device)}
                role="radio"
                aria-checked={isSelected}
                tabIndex={isLoading ? -1 : 0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !isLoading && onDeviceSelect) {
                    e.preventDefault();
                    onDeviceSelect(device);
                  }
                }}
              >
                <div className="flex items-start space-x-4">
                  <div
                    className={`
                    p-3 rounded-lg flex-shrink-0
                    ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
                  `}
                  >
                    <Fingerprint className="w-6 h-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h5
                        className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}
                      >
                        {device.label || `YubiKey (${device.serial})`}
                      </h5>

                      {/* Connection Status */}
                      {isSelected && (
                        <div className="flex items-center space-x-2">
                          {isTestingConnection ? (
                            <LoadingSpinner size="sm" />
                          ) : deviceConnectionStatus?.is_connected ? (
                            <div className="flex items-center text-green-600">
                              <Wifi className="w-4 h-4 mr-1" />
                              <span className="text-xs">Connected</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-red-600">
                              <WifiOff className="w-4 h-4 mr-1" />
                              <span className="text-xs">Disconnected</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mt-1">Serial: {device.serial}</p>

                    {isSelected && connectionStatus?.error_message && (
                      <div className="mt-2 flex items-center text-red-600 text-sm">
                        <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                        <span className="truncate">{connectionStatus.error_message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PIN Entry */}
      {selectedDevice && connectionStatus?.is_connected && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Enter YubiKey PIN</h4>

          <div className="space-y-3">
            <div>
              <label htmlFor="yubikey-pin" className="block text-sm font-medium text-gray-700 mb-2">
                PIN (6-8 digits)
              </label>
              <div className="relative">
                <EnhancedInput
                  id="yubikey-pin"
                  label=""
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="Enter your YubiKey PIN"
                  maxLength={8}
                  disabled={isLoading}
                  className="pr-10"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* PIN Requirements */}
            <div className="bg-blue-50 rounded p-3 border border-blue-200">
              <div className="flex items-start">
                <AlertCircle className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">PIN Requirements:</p>
                  <ul className="space-y-0.5 list-disc list-inside">
                    <li>6-8 digits only</li>
                    <li>Use the PIN you set up with this YubiKey</li>
                    <li>Limited attempts - be careful not to lock your device</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Touch Required Notice */}
      {touchRequired && isLoading && (
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Zap className="w-6 h-6 text-green-600 animate-pulse" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Touch Your YubiKey</h3>
              <p className="text-sm text-green-700 mt-1">
                Touch the gold contact on your YubiKey when it starts blinking to complete
                decryption.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <ErrorMessage
          error={{
            code: 'YUBIKEY_OPERATION_FAILED' as any,
            message: error,
            user_actionable: true,
            recovery_guidance: 'Check your YubiKey connection and PIN, then try again',
          }}
          showRecoveryGuidance={true}
          onClose={() => setError(null)}
        />
      )}

      {/* Decrypt Button */}
      {selectedDevice && (
        <div className="flex justify-center pt-4 border-t border-gray-200">
          <button
            onClick={handleDecrypt}
            disabled={!canDecrypt || isLoading}
            className="px-8 py-3 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Decrypting with YubiKey...
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5 mr-2" />
                Decrypt with YubiKey
              </>
            )}
          </button>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-medium text-gray-900 mb-2">How to Use Your YubiKey</h4>
        <div className="text-sm text-gray-700 space-y-2">
          <div className="flex items-start">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
            <span>Make sure your YubiKey is inserted and recognized</span>
          </div>
          <div className="flex items-start">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
            <span>Enter the PIN you set up during vault creation</span>
          </div>
          <div className="flex items-start">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
            <span>Touch the gold contact when your YubiKey blinks</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YubiKeyDecryption;
