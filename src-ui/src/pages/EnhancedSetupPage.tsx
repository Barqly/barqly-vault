import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useYubiKeySetupWorkflow } from '../hooks/useYubiKeySetupWorkflow';
import { ErrorMessage } from '../components/ui/error-message';
import { Shield } from 'lucide-react';
import { ProtectionMode } from '../lib/api-types';

// Existing components
import SetupForm from '../components/setup/SetupForm';
import { YubiKeyOnlyForm } from '../components/setup/YubiKeyOnlyForm';
import SetupProgressPanel from '../components/setup/SetupProgressPanel';
import SetupSuccessPanel from '../components/setup/SetupSuccessPanel';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import UniversalHeader from '../components/common/UniversalHeader';
import ProgressBar, { ProgressStep } from '../components/ui/ProgressBar';
import AppPrimaryContainer from '../components/layout/AppPrimaryContainer';

// New YubiKey components
import ProtectionModeSelectorContainer from '../components/setup/ProtectionModeSelectorContainer';
import StreamlinedYubiKeySetup from '../components/setup/StreamlinedYubiKeySetup';
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

  // Combined YubiKey setup workflow
  const workflow = useYubiKeySetupWorkflow();

  // Extract state and actions
  const {
    // Form state
    keyLabel,
    passphrase,
    confirmPassphrase,
    isFormValid,
    canProceedToNextStep,
    isLoading,
    error,
    success,
    progress,

    // Form handlers
    handleKeyLabelChange,
    handlePassphraseChange,
    setConfirmPassphrase,
    handleKeyGeneration,
    handleReset,
    clearError,

    // YubiKey state
    protectionMode,
    availableDevices,
    yubiKeyStates,
    selectedDevice,
    // yubiKeyInfo,
    isCheckingDevices,
    hasCheckedDevices,
    // deviceError,
    setupStep,
    yubiKeyPin,

    // YubiKey actions
    handleProtectionModeChange,
    handleYubiKeyConfigured,
    // checkForYubiKeys,
    handleDeviceSelect,
    setSetupStep,
    setYubiKeyPin,
  } = workflow;

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
    console.log('👆 TRACER: EnhancedSetupPage handleNextStep clicked:', {
      setupStep,
      protectionMode,
      canProceedToNextStep,
      keyLabel,
      yubiKeyPin: yubiKeyPin ? `[${yubiKeyPin.length} chars]` : 'null/empty',
      selectedDevice: selectedDevice
        ? `${selectedDevice.name} (${selectedDevice.serial_number})`
        : 'null',
      availableDevices: availableDevices.length,
      yubiKeyStates: yubiKeyStates.length,
      hasCheckedDevices,
      timestamp: new Date().toISOString(),
    });

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
          // Move to configuration step
          setSetupStep('configuration');
        }
      }
    } else if (setupStep === 'configuration') {
      // For YubiKey modes, configuration step directly creates the key
      if (
        protectionMode === ProtectionMode.YUBIKEY_ONLY ||
        protectionMode === ProtectionMode.HYBRID
      ) {
        console.log(
          '🔑 "Create Key" clicked for YubiKey mode - calling handleKeyGeneration directly',
        );
        handleKeyGeneration();
      } else {
        // For passphrase-only, move to generation step
        setSetupStep('generation');
      }
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
    console.log('🖥️ EnhancedSetupPage renderStepContent:', {
      setupStep,
      protectionMode,
      keyLabel,
      isLoading,
      success,
      error,
      hasCheckedDevices,
      deviceCount: availableDevices.length,
    });

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
              {/* Show loading progress during YubiKey operations */}
              {isLoading ? (
                <SetupProgressPanel
                  progress={{
                    progress: 50,
                    message: 'Initializing YubiKey (TDES → PIN → PUK → age-plugin-yubikey)...',
                  }}
                />
              ) : (
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Configure YubiKey Protection
                    </h3>
                    <p className="text-sm text-gray-600">
                      Set up your YubiKey for hardware-only vault protection
                    </p>
                  </div>
                </>
              )}

              {!isLoading && (
                <>
                  {/* Key Label Input */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                    <div>
                      <label
                        htmlFor="key-label"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
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

                    {/* YubiKey PIN Input */}
                    <div>
                      <label
                        htmlFor="yubikey-pin"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        YubiKey PIN
                      </label>
                      <input
                        id="yubikey-pin"
                        type="password"
                        value={yubiKeyPin}
                        onChange={(e) => setYubiKeyPin(e.target.value)}
                        placeholder="Enter your YubiKey PIN (6-8 digits)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isLoading}
                        maxLength={8}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Your YubiKey PIN (default is 123456 for new YubiKeys)
                      </p>
                    </div>
                  </div>

                  {/* YubiKey Device Selection */}
                  <StreamlinedYubiKeySetup yubikeys={yubiKeyStates} isLoading={isCheckingDevices} />

                  {/* Debug: Manual YubiKey Detection Trigger */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">
                      Debug: YubiKey Detection
                    </h4>
                    <p className="text-xs text-yellow-700 mb-3">
                      States: hasChecked={hasCheckedDevices.toString()}, isChecking=
                      {isCheckingDevices.toString()}, devices={availableDevices.length},
                      selectedDevice={selectedDevice?.name || 'none'}
                    </p>
                    <button
                      onClick={() => {
                        console.log('🔄 Manual YubiKey detection triggered');
                        // checkForYubiKeys();
                      }}
                      className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm"
                    >
                      Trigger YubiKey Detection
                    </button>
                  </div>

                  {/* Streamlined: No separate initialization step - all handled by "Create Key" */}
                </>
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

            {/* Key Generation Form - Different forms based on protection mode */}
            {protectionMode === ProtectionMode.YUBIKEY_ONLY ? (
              <YubiKeyOnlyForm
                keyLabel={keyLabel}
                yubiKeyPin={yubiKeyPin}
                isLoading={isLoading}
                onKeyLabelChange={handleKeyLabelChange}
                onYubiKeyPinChange={setYubiKeyPin}
                onSubmit={handleKeyGeneration}
                onReset={handleReset}
              />
            ) : (
              /* Passphrase Only or Hybrid - Show full form */
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
            )}
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
                {isLoading &&
                  (setupStep === 'generation' ||
                    (setupStep === 'configuration' &&
                      (protectionMode === ProtectionMode.YUBIKEY_ONLY ||
                        protectionMode === ProtectionMode.HYBRID))) && (
                    <SetupProgressPanel
                      progress={
                        progress || {
                          operation_id: 'key-generation-init',
                          progress: 50,
                          message:
                            protectionMode === ProtectionMode.YUBIKEY_ONLY
                              ? 'Initializing YubiKey... Please touch your YubiKey when it lights up.'
                              : 'Initializing enhanced key generation...',
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
