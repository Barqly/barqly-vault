import React, { useState, useEffect } from 'react';
import { Shield, Key, Fingerprint, AlertCircle, CheckCircle } from 'lucide-react';
import { ProtectionMode, YubiKeyDevice, invokeCommand } from '../../lib/api-types';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorMessage } from '../ui/error-message';

interface ProtectionModeSelectorProps {
  selectedMode?: ProtectionMode;
  onModeChange: (mode: ProtectionMode) => void;
  onYubiKeySelected?: (device: YubiKeyDevice | null) => void;
  isLoading?: boolean;
}

interface ProtectionModeOption {
  mode: ProtectionMode;
  title: string;
  description: string;
  icon: React.ElementType;
  pros: string[];
  cons: string[];
  recommended?: boolean;
}

const PROTECTION_MODES: ProtectionModeOption[] = [
  {
    mode: ProtectionMode.PASSPHRASE_ONLY,
    title: 'Passphrase Only',
    description: 'Protect your vault with a strong passphrase',
    icon: Key,
    pros: ['Works on any device', 'No hardware required', 'Fastest setup'],
    cons: ['Must remember passphrase', 'Vulnerable to keyloggers'],
  },
  {
    mode: ProtectionMode.YUBIKEY_ONLY,
    title: 'YubiKey Only',
    description: 'Use YubiKey hardware authentication',
    icon: Fingerprint,
    pros: ['Maximum security', 'No passwords to remember', 'Phishing resistant'],
    cons: ['Requires YubiKey device', 'Can lose physical device'],
  },
  {
    mode: ProtectionMode.HYBRID,
    title: 'Hybrid Protection',
    description: 'Combine YubiKey + passphrase for ultimate security',
    icon: Shield,
    pros: ['Dual-factor protection', 'Recovery options', 'Enterprise grade'],
    cons: ['Requires YubiKey device', 'Slightly more complex setup'],
    recommended: true,
  },
];

/**
 * Protection mode selector component for Setup screen
 * Allows users to choose between passphrase-only, YubiKey-only, or hybrid protection
 */
const ProtectionModeSelector: React.FC<ProtectionModeSelectorProps> = ({
  selectedMode,
  onModeChange,
  onYubiKeySelected,
  isLoading = false,
}) => {
  const [availableDevices, setAvailableDevices] = useState<YubiKeyDevice[]>([]);
  const [isCheckingDevices, setIsCheckingDevices] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [hasCheckedDevices, setHasCheckedDevices] = useState(false);

  // Check for available YubiKey devices when component mounts
  useEffect(() => {
    checkForYubiKeys();
  }, []);

  const checkForYubiKeys = async () => {
    setIsCheckingDevices(true);
    setDeviceError(null);
    try {
      const devices = await invokeCommand<YubiKeyDevice[]>('yubikey_list_devices');
      setAvailableDevices(devices);
      setHasCheckedDevices(true);

      // Auto-select first device if available and YubiKey mode is selected
      if (devices.length > 0 && onYubiKeySelected) {
        onYubiKeySelected(devices[0]);
      }
    } catch (error: any) {
      console.warn('YubiKey detection failed:', error.message);
      setDeviceError(error.message);
      setAvailableDevices([]);
      setHasCheckedDevices(true);
    } finally {
      setIsCheckingDevices(false);
    }
  };

  const handleModeSelect = (mode: ProtectionMode) => {
    onModeChange(mode);

    // Auto-select first YubiKey device for YubiKey modes
    if (
      (mode === ProtectionMode.YUBIKEY_ONLY || mode === ProtectionMode.HYBRID) &&
      availableDevices.length > 0 &&
      onYubiKeySelected
    ) {
      onYubiKeySelected(availableDevices[0]);
    }
  };

  const isYubiKeyRequired = (mode: ProtectionMode) => {
    return mode === ProtectionMode.YUBIKEY_ONLY || mode === ProtectionMode.HYBRID;
  };

  const isModeAvailable = (mode: ProtectionMode) => {
    if (isYubiKeyRequired(mode)) {
      return hasCheckedDevices && availableDevices.length > 0;
    }
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Choose Your Protection Method</h3>
        <p className="text-sm text-gray-600">
          Select how you want to protect your vault. You can always change this later.
        </p>
      </div>

      {/* YubiKey Detection Status */}
      {isCheckingDevices && (
        <div className="flex items-center justify-center py-4 bg-blue-50 rounded-lg border border-blue-200">
          <LoadingSpinner size="sm" className="mr-2" />
          <span className="text-sm text-blue-700">Checking for YubiKey devices...</span>
        </div>
      )}

      {hasCheckedDevices && availableDevices.length > 0 && (
        <div className="flex items-center py-3 px-4 bg-green-50 rounded-lg border border-green-200">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
          <div>
            <span className="text-sm text-green-800 font-medium">
              YubiKey detected: {availableDevices[0].name}
            </span>
            {availableDevices[0].serial_number && (
              <span className="text-xs text-green-600 ml-2">
                (Serial: {availableDevices[0].serial_number})
              </span>
            )}
          </div>
        </div>
      )}

      {hasCheckedDevices && availableDevices.length === 0 && !deviceError && (
        <div className="flex items-center py-3 px-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" />
          <div>
            <span className="text-sm text-yellow-800 font-medium">No YubiKey detected</span>
            <p className="text-xs text-yellow-700 mt-1">
              Insert your YubiKey to enable hardware protection options
            </p>
          </div>
        </div>
      )}

      {deviceError && (
        <ErrorMessage
          error={{
            code: 'YUBIKEY_COMMUNICATION_ERROR' as any,
            message: 'Failed to check for YubiKey devices',
            details: deviceError,
            user_actionable: true,
            recovery_guidance: 'Make sure your YubiKey is properly inserted and try again',
          }}
          showRecoveryGuidance={true}
          onClose={() => setDeviceError(null)}
        />
      )}

      {/* Protection Mode Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PROTECTION_MODES.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedMode === option.mode;
          const isAvailable = isModeAvailable(option.mode);
          const isDisabled = isLoading || !isAvailable;

          return (
            <div
              key={option.mode}
              className={`
                relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : isDisabled
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
              onClick={() => !isDisabled && handleModeSelect(option.mode)}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={isDisabled}
              tabIndex={isDisabled ? -1 : 0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
                  e.preventDefault();
                  handleModeSelect(option.mode);
                }
              }}
            >
              {/* Recommended badge */}
              {option.recommended && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Recommended
                </div>
              )}

              {/* Header */}
              <div className="flex items-center mb-3">
                <div
                  className={`
                  p-2 rounded-lg mr-3
                  ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
                `}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                    {option.title}
                  </h4>
                  <p className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                    {option.description}
                  </p>
                </div>
                {isSelected && <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />}
              </div>

              {/* Availability warning for YubiKey modes */}
              {isYubiKeyRequired(option.mode) && !isAvailable && (
                <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Requires YubiKey device
                </div>
              )}

              {/* Pros and Cons */}
              <div className="space-y-2">
                <div>
                  <div className="text-xs font-medium text-green-700 mb-1">Benefits:</div>
                  <ul className="text-xs text-green-600 space-y-0.5">
                    {option.pros.map((pro, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-1">•</span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">Considerations:</div>
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    {option.cons.map((con, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-gray-400 mr-1">•</span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Retry button for device detection */}
      {hasCheckedDevices && availableDevices.length === 0 && (
        <div className="text-center">
          <button
            onClick={checkForYubiKeys}
            disabled={isCheckingDevices}
            className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
          >
            {isCheckingDevices ? 'Checking...' : 'Retry YubiKey Detection'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ProtectionModeSelector;
