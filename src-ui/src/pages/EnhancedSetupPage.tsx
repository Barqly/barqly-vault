import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useYubiKeyWorkflow } from '../hooks/useYubiKeyWorkflow';
import { useSetupWorkflow } from '../hooks/useSetupWorkflow';
import { ErrorMessage } from '../components/ui/error-message';
import { Shield } from 'lucide-react';
import { ProtectionMode } from '../lib/api-types';

// Existing components
import SetupForm from '../components/setup/SetupForm';
import SetupProgressPanel from '../components/setup/SetupProgressPanel';
import SetupSuccessPanel from '../components/setup/SetupSuccessPanel';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import UniversalHeader from '../components/common/UniversalHeader';
import ProgressBar, { ProgressStep } from '../components/ui/ProgressBar';
import AppPrimaryContainer from '../components/layout/AppPrimaryContainer';

// New YubiKey components
import ProtectionModeSelectorContainer from '../components/setup/ProtectionModeSelectorContainer';
import YubiKeyDeviceList from '../components/setup/YubiKeyDeviceList';
import YubiKeyInitialization from '../components/setup/YubiKeyInitialization';
import HybridProtectionSetup from '../components/setup/HybridProtectionSetup';

import { logger } from '../lib/logger';

const ENHANCED_SETUP_STEPS: ProgressStep[] = [
  { id: 1, label: 'Choose Protection', description: 'Select security method' },
  { id: 2, label: 'Configure Security', description: 'Set up protection' },
  { id: 3, label: 'Create Key', description: 'Generate vault key' },
];

/**
 * Enhanced setup page with YubiKey support
 * Provides protection mode selection and YubiKey integration
 */
const EnhancedSetupPage: React.FC = () => {
  logger.logComponentLifecycle('EnhancedSetupPage', 'Mount');
  const navigate = useNavigate();

  // Separate workflows for cleaner architecture
  const yubiKeyWorkflow = useYubiKeyWorkflow();
  const setupWorkflow = useSetupWorkflow();

  // Extract state from workflows
  const { state: yubiKeyState, context: yubiKeyContext, actions: yubiKeyActions } = yubiKeyWorkflow;

  const {
    keyLabel,
    passphrase,
    confirmPassphrase,
    isFormValid,
    canProceedToNextStep,
    isLoading: setupLoading,
    error,
    success,
    progress,
    handleKeyLabelChange,
    handlePassphraseChange,
    setConfirmPassphrase,
    handleKeyGeneration,
    handleReset,
    clearError,
  } = setupWorkflow;

  // Derived state for backward compatibility
  const protectionMode = yubiKeyContext.selectedMode;
  const availableDevices = yubiKeyContext.availableDevices;
  const selectedDevice = yubiKeyContext.selectedDevice;
  const isCheckingDevices = yubiKeyState === 'hardware_detecting';
  const isLoading = setupLoading || yubiKeyWorkflow.isLoading;

  // Simple step management (will be enhanced with proper state machine later)
  const [setupStep, setSetupStep] = useState<'mode-selection' | 'configuration' | 'generation'>(
    'mode-selection',
  );

  // Handler for protection mode changes
  const handleProtectionModeChange = (mode: ProtectionMode) => {
    yubiKeyActions.selectProtectionMode(mode);
    // Don't auto-navigate - wait for user to click Continue
    // setSetupStep('configuration');
  };

  // Handler for device selection
  const handleDeviceSelect = (device: any) => {
    yubiKeyActions.selectDevice(device);
  };

  // Handler for YubiKey configuration completion
  const handleYubiKeyConfigured = () => {
    setSetupStep('generation');
  };

  const handleEncryptVault = () => {
    navigate('/encrypt');
  };

  const getCurrentStepNumber = (): number => {
    switch (setupStep) {
      case 'mode-selection':
        return 1;
      case 'configuration':
        return 2;
      case 'generation':
        return 3;
      default:
        return 1;
    }
  };

  const getCompletedSteps = (): Set<number> => {
    const completed = new Set<number>();
    if (protectionMode !== undefined) completed.add(1);
    if (setupStep === 'generation') {
      completed.add(1);
      completed.add(2);
    }
    return completed;
  };

  const handleNextStep = () => {
    if (setupStep === 'mode-selection') {
      if (protectionMode === ProtectionMode.PASSPHRASE_ONLY) {
        setSetupStep('generation');
      } else {
        setSetupStep('configuration');
        // When user commits to YubiKey mode, trigger hardware detection
        if (
          protectionMode === ProtectionMode.YUBIKEY_ONLY ||
          protectionMode === ProtectionMode.HYBRID
        ) {
          yubiKeyActions.commitToYubiKey();
        }
      }
    } else if (setupStep === 'configuration') {
      setSetupStep('generation');
    }
  };

  const handlePreviousStep = () => {
    if (setupStep === 'generation') {
      if (protectionMode === ProtectionMode.PASSPHRASE_ONLY) {
        setSetupStep('mode-selection');
      } else {
        setSetupStep('configuration');
      }
    } else if (setupStep === 'configuration') {
      setSetupStep('mode-selection');
    }
  };

  const renderStepContent = () => {
    switch (setupStep) {
      case 'mode-selection':
        return (
          <ProtectionModeSelectorContainer
            selectedMode={protectionMode || undefined}
            onModeChange={handleProtectionModeChange}
            onYubiKeySelected={(device) => device && handleDeviceSelect(device)}
            availableDevices={availableDevices}
            isCheckingDevices={isCheckingDevices}
            isLoading={isLoading}
          />
        );

      case 'configuration':
        if (protectionMode === ProtectionMode.PASSPHRASE_ONLY) {
          return (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Configure Passphrase Protection
                </h3>
                <p className="text-sm text-gray-600">
                  Set up your vault with passphrase-only protection
                </p>
              </div>

              {/* SetupForm for passphrase configuration */}
              <SetupForm
                keyLabel={keyLabel}
                passphrase={passphrase}
                confirmPassphrase={confirmPassphrase}
                isFormValid={Boolean(isFormValid)}
                isLoading={isLoading}
                onKeyLabelChange={handleKeyLabelChange}
                onPassphraseChange={handlePassphraseChange}
                onConfirmPassphraseChange={setConfirmPassphrase}
                onSubmit={handleKeyGeneration}
                onReset={handleReset}
              />
            </div>
          );
        } else if (protectionMode === ProtectionMode.HYBRID) {
          return (
            <HybridProtectionSetup
              keyLabel={keyLabel}
              passphrase={passphrase}
              confirmPassphrase={confirmPassphrase}
              onPassphraseChange={handlePassphraseChange}
              onConfirmPassphraseChange={setConfirmPassphrase}
              onYubiKeyConfigured={handleYubiKeyConfigured}
              availableDevices={availableDevices}
              isLoading={isLoading}
            />
          );
        } else if (protectionMode === ProtectionMode.YUBIKEY_ONLY) {
          return (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Configure YubiKey Protection
                </h3>
                <p className="text-sm text-gray-600">
                  Set up your YubiKey for hardware-only vault protection
                </p>
              </div>

              {/* Key Label Input */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <label htmlFor="key-label" className="block text-sm font-medium text-gray-700 mb-2">
                  Vault Key Label
                </label>
                <input
                  id="key-label"
                  type="text"
                  value={keyLabel}
                  onChange={(e) => handleKeyLabelChange(e.target.value)}
                  placeholder="Enter a name for your vault key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>

              {/* YubiKey Device Selection */}
              <YubiKeyDeviceList
                devices={availableDevices}
                selectedDevice={selectedDevice}
                onDeviceSelect={handleDeviceSelect}
                isLoading={isLoading}
              />

              {/* YubiKey Initialization */}
              {selectedDevice && Boolean(keyLabel.trim().length > 0) && (
                <YubiKeyInitialization
                  device={selectedDevice}
                  onInitializationComplete={handleYubiKeyConfigured}
                  onCancel={handlePreviousStep}
                  isLoading={isLoading}
                />
              )}
            </div>
          );
        }
        return null;

      case 'generation':
        return (
          <div className="space-y-6">
            {/* Protection Mode Summary */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Selected Protection Mode</h4>
              <div className="text-sm text-blue-800">
                <p className="font-medium">
                  {protectionMode === ProtectionMode.PASSPHRASE_ONLY
                    ? 'Passphrase Only'
                    : protectionMode === ProtectionMode.YUBIKEY_ONLY
                      ? 'YubiKey Only'
                      : 'Hybrid Protection (Passphrase + YubiKey)'}
                </p>
                {selectedDevice && <p className="mt-1">YubiKey: {selectedDevice.name}</p>}
              </div>
            </div>

            {/* Key Generation Form */}
            <SetupForm
              keyLabel={keyLabel}
              passphrase={passphrase}
              confirmPassphrase={confirmPassphrase}
              isFormValid={Boolean(isFormValid)}
              isLoading={isLoading}
              onKeyLabelChange={handleKeyLabelChange}
              onPassphraseChange={handlePassphraseChange}
              onConfirmPassphraseChange={setConfirmPassphrase}
              onSubmit={handleKeyGeneration}
              onReset={handleReset}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Unified header component */}
      <UniversalHeader title="Create Your Vault Key" icon={Shield} skipNavTarget="#main-content" />

      {/* Enhanced Progress Bar */}
      <ProgressBar
        steps={ENHANCED_SETUP_STEPS}
        currentStep={getCurrentStepNumber()}
        completedSteps={getCompletedSteps()}
        onStepClick={undefined}
        isClickable={false}
        variant="compact"
      />

      {/* Main content */}
      <AppPrimaryContainer id="main-content">
        <div className="mt-6 space-y-6">
          {/* Error Display */}
          {error && (
            <ErrorMessage
              error={error}
              showRecoveryGuidance={true}
              showCloseButton={true}
              onClose={clearError}
            />
          )}

          {/* Success Display - replaces form card when shown */}
          {success ? (
            <SetupSuccessPanel
              success={success}
              onClose={handleReset}
              onEncryptVault={handleEncryptVault}
            />
          ) : (
            <>
              {/* Main Setup Card */}
              <section
                className="relative rounded-2xl border border-slate-200 bg-white shadow-sm py-6 px-6 md:py-6 md:px-7"
                style={
                  {
                    '--space-1': '4px',
                    '--space-2': '8px',
                    '--space-3': '12px',
                    '--space-4': '16px',
                    '--space-5': '20px',
                    '--space-6': '24px',
                  } as React.CSSProperties
                }
              >
                {/* Progress Display - show immediately when loading starts */}
                {isLoading && setupStep === 'generation' && (
                  <SetupProgressPanel
                    progress={
                      progress || {
                        operation_id: 'key-generation-init',
                        progress: 0,
                        message: 'Initializing enhanced key generation...',
                        timestamp: new Date().toISOString(),
                      }
                    }
                  />
                )}

                {/* Step Content */}
                {!isLoading && renderStepContent()}

                {/* Navigation Buttons */}
                {!isLoading && !success && setupStep !== 'generation' && (
                  <div className="flex justify-between pt-6 border-t border-gray-200 mt-6">
                    <button
                      onClick={handlePreviousStep}
                      disabled={setupStep === 'mode-selection'}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    <button
                      onClick={handleNextStep}
                      disabled={
                        setupStep === 'mode-selection' ? !protectionMode : !canProceedToNextStep
                      }
                      className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {setupStep === 'mode-selection'
                        ? 'Continue'
                        : setupStep === 'configuration'
                          ? 'Create Key'
                          : 'Next'}
                    </button>
                  </div>
                )}
              </section>

              {/* Help Section */}
              <section>
                <CollapsibleHelp triggerText="How YubiKey Setup Works" context="setup" />
              </section>
            </>
          )}
        </div>
      </AppPrimaryContainer>
    </div>
  );
};

export default EnhancedSetupPage;
