import React, { useEffect } from 'react';
import { Shield, Key, Fingerprint, CheckCircle } from 'lucide-react';
import type { ProtectionMode, YubiKeyStateInfo } from '../../bindings';
import { LoadingSpinner } from '../ui/loading-spinner';

interface ProtectionModeSelectorProps {
  selectedMode?: ProtectionMode;
  onModeChange: (mode: ProtectionMode) => void;
  onYubiKeySelected?: (device: YubiKeyStateInfo | null) => void;
  availableDevices?: YubiKeyStateInfo[];
  isCheckingDevices?: boolean;
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
    recommended: true, // Make passphrase the default recommended option
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
  availableDevices = [],
  isCheckingDevices = false,
  isLoading = false,
}) => {
  // Auto-select passphrase-only mode as smart default
  useEffect(() => {
    if (!selectedMode) {
      onModeChange(ProtectionMode.PASSPHRASE_ONLY);
    }
  }, [selectedMode, onModeChange]);

  const handleModeSelect = (mode: ProtectionMode) => {
    onModeChange(mode);

    // Auto-select first device when available YubiKey modes are selected
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
      // Truly lazy approach - always show as available until user tries to use them
      // This follows the "no upfront blocking" principle in the test
      return true;
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

      {/* YubiKey Detection Status - Only show when actively checking */}
      {isCheckingDevices && (
        <div className="flex items-center justify-center py-4 bg-blue-50 rounded-lg border border-blue-200">
          <LoadingSpinner size="sm" className="mr-2" />
          <span className="text-sm text-blue-700">Checking for YubiKey devices...</span>
        </div>
      )}

      {/* Success message - only show when devices found and not loading */}
      {availableDevices.length > 0 && !isCheckingDevices && (
        <div className="flex items-center py-3 px-4 bg-green-50 rounded-lg border border-green-200">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
          <div>
            <span className="text-sm text-green-800 font-medium">
              YubiKey detected: {availableDevices[0].label || `YubiKey (${availableDevices[0].serial})`}
            </span>
            {availableDevices[0].serial && (
              <span className="text-xs text-green-600 ml-2">
                (Serial: {availableDevices[0].serial})
              </span>
            )}
          </div>
        </div>
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

              {/* Simplified key benefits - only show most important */}
              <div className="text-xs text-gray-600">
                {option.pros.slice(0, 2).map((pro, index) => (
                  <div key={index} className="flex items-start mb-1">
                    <span className="text-green-500 mr-1 mt-0.5">•</span>
                    {pro}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProtectionModeSelector;
