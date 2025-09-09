import React, { useState } from 'react';
import { Shield, Key, Fingerprint, ArrowRight, CheckCircle } from 'lucide-react';
import { YubiKeyDevice, YubiKeyInfo } from '../../lib/api-types';
import PassphraseField from '../forms/PassphraseField';
import YubiKeyDeviceList from './YubiKeyDeviceList';
import YubiKeyInitialization from './YubiKeyInitialization';
import { checkPassphraseStrength } from '../../lib/validation/passphrase-validation';

interface HybridProtectionSetupProps {
  keyLabel: string;
  passphrase: string;
  confirmPassphrase: string;
  onPassphraseChange: (value: string) => void;
  onConfirmPassphraseChange: (value: string) => void;
  onYubiKeyConfigured: (device: YubiKeyDevice, info: YubiKeyInfo) => void;
  availableDevices: YubiKeyDevice[];
  isLoading?: boolean;
}

interface SetupStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
}

/**
 * Component for setting up hybrid protection (passphrase + YubiKey)
 * Guides users through both passphrase and YubiKey configuration
 */
const HybridProtectionSetup: React.FC<HybridProtectionSetupProps> = ({
  keyLabel: _keyLabel,
  passphrase,
  confirmPassphrase,
  onPassphraseChange,
  onConfirmPassphraseChange,
  onYubiKeyConfigured,
  availableDevices,
  isLoading = false,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDevice, setSelectedDevice] = useState<YubiKeyDevice | null>(
    availableDevices.length > 0 ? availableDevices[0] : null,
  );
  const [yubiKeyInfo, setYubiKeyInfo] = useState<YubiKeyInfo | null>(null);

  const passphraseStrength = checkPassphraseStrength(passphrase);
  const isPassphraseValid = passphraseStrength.isStrong;
  const isPassphraseMatch = confirmPassphrase.length > 0 && passphrase === confirmPassphrase;
  const isStep1Complete = isPassphraseValid && isPassphraseMatch;
  const isStep2Complete = selectedDevice !== null;
  const isStep3Complete = yubiKeyInfo !== null;

  const steps: SetupStep[] = [
    {
      id: 1,
      title: 'Set Passphrase',
      description: 'Create a strong passphrase for vault access',
      icon: Key,
      completed: isStep1Complete,
    },
    {
      id: 2,
      title: 'Select YubiKey',
      description: 'Choose your YubiKey device',
      icon: Fingerprint,
      completed: isStep2Complete,
    },
    {
      id: 3,
      title: 'Configure YubiKey',
      description: 'Initialize YubiKey with PIN',
      icon: Shield,
      completed: isStep3Complete,
    },
  ];

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDeviceSelect = (device: YubiKeyDevice) => {
    setSelectedDevice(device);
  };

  const handleYubiKeyInitialized = (info: YubiKeyInfo) => {
    setYubiKeyInfo(info);
    if (selectedDevice) {
      onYubiKeyConfigured(selectedDevice, info);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return isStep1Complete;
      case 2:
        return isStep2Complete;
      case 3:
        return true; // Always can proceed from step 3 (will be handled by parent)
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-100 to-green-100 rounded-full">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Hybrid Protection Setup</h3>
        <p className="text-sm text-gray-600">
          The most secure option: passphrase + YubiKey hardware authentication
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = step.completed;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step Circle */}
              <div
                className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200
                  ${
                    isCompleted
                      ? 'bg-green-500 border-green-500 text-white'
                      : isActive
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-500'
                  }
                `}
              >
                {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>

              {/* Step Label */}
              <div className="ml-3 min-w-0">
                <p
                  className={`text-sm font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-gray-500 truncate max-w-32">{step.description}</p>
              </div>

              {/* Arrow */}
              {index < steps.length - 1 && <ArrowRight className="w-5 h-5 text-gray-400 mx-4" />}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {currentStep === 1 && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Step 1: Create Your Passphrase
            </h4>
            <p className="text-sm text-gray-600 mb-6">
              Even with YubiKey protection, we recommend setting a strong passphrase as a backup
              method. This allows you to access your vault if your YubiKey is unavailable.
            </p>

            <div className="space-y-4">
              <PassphraseField
                id="hybrid-passphrase"
                value={passphrase}
                onChange={onPassphraseChange}
                placeholder="Enter a strong passphrase"
                showStrength={true}
              />

              <PassphraseField
                id="hybrid-confirm-passphrase"
                value={confirmPassphrase}
                onChange={onConfirmPassphraseChange}
                placeholder="Confirm your passphrase"
                matchValue={passphrase}
              />
            </div>

            {isStep1Complete && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center text-green-700">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">Passphrase configured successfully!</span>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Step 2: Select Your YubiKey</h4>
            <p className="text-sm text-gray-600 mb-6">
              Choose the YubiKey device you want to use for vault protection. Make sure it's the
              device you'll have access to when you need to decrypt files.
            </p>

            <YubiKeyDeviceList
              devices={availableDevices}
              selectedDevice={selectedDevice}
              onDeviceSelect={handleDeviceSelect}
              isLoading={isLoading}
            />

            {isStep2Complete && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center text-green-700">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="text-sm font-medium">
                    YubiKey selected: {selectedDevice?.name}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && selectedDevice && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Step 3: Configure Your YubiKey
            </h4>
            <p className="text-sm text-gray-600 mb-6">
              Set up a PIN for your YubiKey and initialize it for use with your vault. This PIN will
              be required each time you decrypt files with your YubiKey.
            </p>

            <YubiKeyInitialization
              device={selectedDevice}
              onInitializationComplete={handleYubiKeyInitialized}
              onCancel={handlePreviousStep}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>

      {/* Benefits Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 border border-blue-200">
        <h4 className="text-lg font-medium text-gray-900 mb-3">Hybrid Protection Benefits</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <h5 className="font-medium text-blue-800">Security Features:</h5>
            <ul className="space-y-1 text-blue-700">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Two-factor authentication
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Hardware-backed cryptography
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                Phishing resistance
              </li>
            </ul>
          </div>
          <div className="space-y-2">
            <h5 className="font-medium text-green-800">Recovery Options:</h5>
            <ul className="space-y-1 text-green-700">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                Passphrase backup access
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                Multiple unlock methods
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                Enterprise-grade flexibility
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      {currentStep < 3 && (
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <button
            onClick={handlePreviousStep}
            disabled={currentStep === 1 || isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <button
            onClick={handleNextStep}
            disabled={!canProceed() || isLoading}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {currentStep === 2 ? 'Configure YubiKey' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
};

export default HybridProtectionSetup;
