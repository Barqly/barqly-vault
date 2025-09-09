import React, { useState, useEffect } from 'react';
import { Shield, Eye, EyeOff, CheckCircle, AlertCircle, Info, Lock } from 'lucide-react';
import {
  YubiKeyDevice,
  YubiKeyInfo,
  YubiKeyInitParams,
  SetupRecommendations,
  ValidationResult,
  invokeCommand,
} from '../../lib/api-types';
import { LoadingSpinner } from '../ui/loading-spinner';
import { ErrorMessage } from '../ui/error-message';
import EnhancedInput from '../forms/EnhancedInput';

interface YubiKeyInitializationProps {
  device: YubiKeyDevice;
  onInitializationComplete: (info: YubiKeyInfo) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface PinValidation {
  isValid: boolean;
  message: string;
  strength: 'weak' | 'medium' | 'strong';
}

/**
 * Component for initializing YubiKey device with PIN setup
 * Handles PIN validation, slot selection, and device initialization
 */
const YubiKeyInitialization: React.FC<YubiKeyInitializationProps> = ({
  device,
  onInitializationComplete,
  onCancel,
  isLoading = false,
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number>(0x9c); // Default to 9c slot
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<SetupRecommendations | null>(null);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true);

  // Load setup recommendations when component mounts
  useEffect(() => {
    loadSetupRecommendations();
  }, []);

  const loadSetupRecommendations = async () => {
    try {
      const recs = await invokeCommand<SetupRecommendations>('yubikey_get_setup_recommendations');
      setRecommendations(recs);

      // Use recommended slot if available
      if (recs.recommended_slots && recs.recommended_slots.length > 0) {
        setSelectedSlot(recs.recommended_slots[0]);
      }
    } catch (error: any) {
      console.warn('Failed to load setup recommendations:', error.message);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const validatePin = (pinValue: string): PinValidation => {
    if (pinValue.length < 6) {
      return {
        isValid: false,
        message: 'PIN must be at least 6 digits',
        strength: 'weak',
      };
    }

    if (pinValue.length > 8) {
      return {
        isValid: false,
        message: 'PIN must be no more than 8 digits',
        strength: 'weak',
      };
    }

    if (!/^\d+$/.test(pinValue)) {
      return {
        isValid: false,
        message: 'PIN must contain only digits',
        strength: 'weak',
      };
    }

    // Check for weak patterns
    const hasRepeating = /(\d)\1{2,}/.test(pinValue);
    const isSequential = /123456|654321|012345|543210/.test(pinValue);

    if (hasRepeating || isSequential) {
      return {
        isValid: true,
        message: 'PIN is valid but consider using a less predictable pattern',
        strength: 'medium',
      };
    }

    return {
      isValid: true,
      message: 'Strong PIN',
      strength: 'strong',
    };
  };

  const handlePinChange = (value: string) => {
    // Only allow numeric input
    const numericValue = value.replace(/\D/g, '');
    setPin(numericValue);
    setError(null);
  };

  const handleConfirmPinChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    setConfirmPin(numericValue);
  };

  const handleInitialization = async () => {
    if (!isFormValid) return;

    setIsInitializing(true);
    setError(null);

    try {
      // Validate PIN with backend
      const validation = await invokeCommand<ValidationResult>('yubikey_validate_pin', {
        pin: pin,
      });

      if (!validation.is_valid) {
        setError(validation.message);
        return;
      }

      // Initialize YubiKey
      const initParams: YubiKeyInitParams = {
        device_id: device.device_id,
        pin: pin,
        slot: selectedSlot,
        force_overwrite: false,
      };

      const deviceInfo = await invokeCommand<YubiKeyInfo>('yubikey_initialize', initParams);

      onInitializationComplete(deviceInfo);
    } catch (error: any) {
      setError(error.message || 'Failed to initialize YubiKey');
    } finally {
      setIsInitializing(false);
    }
  };

  const pinValidation = validatePin(pin);
  const isPinMatch = confirmPin.length > 0 && pin === confirmPin;
  const isFormValid = pinValidation.isValid && isPinMatch && selectedSlot !== undefined;

  const getStrengthColor = (strength: 'weak' | 'medium' | 'strong') => {
    switch (strength) {
      case 'weak':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'strong':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const availableSlots = recommendations?.recommended_slots || [0x9a, 0x9c, 0x9d, 0x9e];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Initialize YubiKey</h3>
        <p className="text-sm text-gray-600">Set up your {device.name} for vault protection</p>
      </div>

      {/* Loading State */}
      {isLoadingRecommendations && (
        <div className="text-center py-8">
          <LoadingSpinner />
          <p className="text-sm text-gray-600 mt-2">Loading setup recommendations...</p>
        </div>
      )}

      {!isLoadingRecommendations && (
        <>
          {/* Device Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Device Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Name:</span>
                <span className="ml-2 text-gray-600">{device.name}</span>
              </div>
              {device.serial_number && (
                <div>
                  <span className="font-medium text-gray-700">Serial:</span>
                  <span className="ml-2 text-gray-600">{device.serial_number}</span>
                </div>
              )}
              {device.firmware_version && (
                <div>
                  <span className="font-medium text-gray-700">Firmware:</span>
                  <span className="ml-2 text-gray-600">{device.firmware_version}</span>
                </div>
              )}
            </div>
          </div>

          {/* PIN Setup */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Set YubiKey PIN</h4>

            {/* PIN Requirements */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">PIN Requirements:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>6-8 digits only</li>
                    <li>Avoid repeating patterns (111111, 123456)</li>
                    <li>Remember this PIN - you'll need it to decrypt files</li>
                    <li>Can be changed later if needed</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* PIN Input */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="yubikey-pin"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  YubiKey PIN
                </label>
                <div className="relative">
                  <EnhancedInput
                    id="yubikey-pin"
                    label=""
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => handlePinChange(e.target.value)}
                    placeholder="Enter 6-8 digit PIN"
                    maxLength={8}
                    disabled={isLoading || isInitializing}
                    className="pr-10"
                    autoComplete="new-password"
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

                {/* PIN Validation Feedback */}
                {pin && (
                  <div
                    className={`mt-2 text-sm flex items-center ${getStrengthColor(pinValidation.strength)}`}
                  >
                    {pinValidation.isValid ? (
                      <CheckCircle className="w-4 h-4 mr-1" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mr-1" />
                    )}
                    {pinValidation.message}
                  </div>
                )}
              </div>

              {/* Confirm PIN */}
              <div>
                <label
                  htmlFor="yubikey-confirm-pin"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirm PIN
                </label>
                <EnhancedInput
                  id="yubikey-confirm-pin"
                  label=""
                  type={showPin ? 'text' : 'password'}
                  value={confirmPin}
                  onChange={(e) => handleConfirmPinChange(e.target.value)}
                  placeholder="Confirm your PIN"
                  maxLength={8}
                  disabled={isLoading || isInitializing}
                  autoComplete="new-password"
                />

                {/* PIN Match Feedback */}
                {confirmPin && (
                  <div
                    className={`mt-2 text-sm flex items-center ${isPinMatch ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {isPinMatch ? (
                      <CheckCircle className="w-4 h-4 mr-1" />
                    ) : (
                      <AlertCircle className="w-4 h-4 mr-1" />
                    )}
                    {isPinMatch ? 'PINs match' : 'PINs do not match'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Slot Selection */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">PIV Slot Selection</h4>
            <p className="text-sm text-gray-600">
              Choose which PIV slot to use for key storage (recommended: 9c)
            </p>
            <div className="grid grid-cols-2 gap-3">
              {availableSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(slot)}
                  disabled={isLoading || isInitializing}
                  className={`
                    p-3 rounded-lg border-2 text-left transition-all duration-200
                    ${
                      selectedSlot === slot
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Slot {slot.toString(16).toUpperCase()}</span>
                    {slot === 0x9c && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {slot === 0x9c
                      ? 'Digital Signature'
                      : slot === 0x9a
                        ? 'PIV Authentication'
                        : slot === 0x9d
                          ? 'Key Management'
                          : slot === 0x9e
                            ? 'Card Authentication'
                            : 'General Purpose'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <ErrorMessage
              error={{
                code: 'YUBIKEY_INITIALIZATION_FAILED' as any,
                message: error,
                user_actionable: true,
                recovery_guidance: 'Check your PIN and try again, or use a different slot',
              }}
              showRecoveryGuidance={true}
              onClose={() => setError(null)}
            />
          )}

          {/* Security Notes */}
          {recommendations?.security_notes && recommendations.security_notes.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-start">
                <Lock className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-2">Security Recommendations:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    {recommendations.security_notes.map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-6 border-t border-gray-200">
            <button
              onClick={onCancel}
              disabled={isInitializing}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              onClick={handleInitialization}
              disabled={!isFormValid || isInitializing}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isInitializing && <LoadingSpinner size="sm" className="mr-2" />}
              {isInitializing ? 'Initializing...' : 'Initialize YubiKey'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default YubiKeyInitialization;
