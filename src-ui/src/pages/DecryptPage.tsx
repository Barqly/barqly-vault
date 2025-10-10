import React from 'react';
import { useDecryptionWorkflow } from '../hooks/useDecryptionWorkflow';
import { ErrorMessage } from '../components/ui/error-message';
import type { ErrorCode, CommandError } from '../bindings';
import { Unlock } from 'lucide-react';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import UniversalHeader from '../components/common/UniversalHeader';
import ProgressBar, { ProgressStep } from '../components/ui/ProgressBar';
import ProgressiveDecryptionCards from '../components/decrypt/ProgressiveDecryptionCards';
import DecryptionReadyPanel from '../components/decrypt/DecryptionReadyPanel';
import ManifestRestoration from '../components/decrypt/ManifestRestoration';
import DecryptProgress from '../components/decrypt/DecryptProgress';
import DecryptSuccess from '../components/decrypt/DecryptSuccess';
import AnimatedTransition from '../components/ui/AnimatedTransition';
import AppPrimaryContainer from '../components/layout/AppPrimaryContainer';

const DECRYPTION_STEPS: ProgressStep[] = [
  { id: 1, label: 'Select Vault', description: 'Choose vault to decrypt' },
  { id: 2, label: 'Choose Key', description: 'Enter passphrase' },
  { id: 3, label: 'Decrypt Vault', description: 'Configure output location' },
];

/**
 * Main decryption page component
 * Refactored from 465 lines to ~125 lines by extracting logic and sub-components
 */
const DecryptPage: React.FC = () => {
  const {
    // State
    selectedFile,
    selectedKeyId,
    passphrase,
    outputPath,
    isDecrypting,
    showAdvancedOptions,
    setShowAdvancedOptions,

    // Vault recognition state
    isKnownVault,
    detectedVaultName,
    detectedVaultId,

    // Key discovery state
    isDiscoveringKeys,
    availableKeys,
    suggestedKeys,
    keyAttempts,

    // Recovery state
    isRecoveryMode,
    willRestoreManifest,
    willRestoreKeys,
    recoveredItems,

    // From useFileDecryption
    isLoading,
    error,
    success,
    progress,
    clearError,
    clearSelection,
    setPassphrase,
    setOutputPath,

    // Computed
    currentStep,

    // Handlers
    handleFileSelected,
    handleDecryption,
    handleReset,
    handleDecryptAnother,
    handleKeyChange,
    handleFileValidationError,

    // Navigation handlers
    handleStepNavigation,

    // Setters
    setAvailableKeys,
    setIsDiscoveringKeys,
  } = useDecryptionWorkflow();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Unified App Header */}
      <UniversalHeader title="Decrypt Your Vault" icon={Unlock} skipNavTarget="#main-content" />

      {/* Progress Bar */}
      <ProgressBar
        steps={DECRYPTION_STEPS}
        currentStep={currentStep}
        completedSteps={new Set(Array.from({ length: currentStep - 1 }, (_, i) => i + 1))}
        onStepClick={undefined}
        isClickable={false}
        variant="compact"
      />

      {/* Main content */}
      <AppPrimaryContainer id="main-content">
        <div className="mt-6 space-y-6">
          {/* Error display */}
          {error && !isDecrypting && (
            <ErrorMessage error={error} showRecoveryGuidance={true} onClose={clearError} />
          )}

          {/* Success display with animation */}
          <AnimatedTransition show={!!success} duration={400}>
            {success && (
              <DecryptSuccess
                result={success}
                onDecryptAnother={handleDecryptAnother}
                isRecoveryMode={isRecoveryMode}
                recoveredItems={recoveredItems}
                vaultName={detectedVaultName}
              />
            )}
          </AnimatedTransition>

          {/* Progress display - show immediately when decrypting starts */}
          <AnimatedTransition show={isDecrypting && !success} duration={300}>
            <DecryptProgress
              progress={
                progress || {
                  operation_id: 'decrypt-init',
                  progress: 0,
                  message: 'Initializing decryption...',
                  timestamp: new Date().toISOString(),
                }
              }
              onCancel={!progress || progress.progress < 90 ? handleReset : undefined}
            />
          </AnimatedTransition>

          {/* Main form - hidden during success/progress with smooth transition */}
          <AnimatedTransition show={!success && !isDecrypting} duration={300}>
            {!success && !isDecrypting && (
              <>
                {/* Progressive Card System - Steps 1 & 2 */}
                <ProgressiveDecryptionCards
                  currentStep={currentStep}
                  selectedFile={selectedFile}
                  selectedKeyId={selectedKeyId}
                  passphrase={passphrase}
                  isLoading={isLoading}
                  onFileSelected={handleFileSelected}
                  onClearFiles={clearSelection}
                  onFileError={(error) => {
                    // Create inline error for file validation failures
                    const commandError: CommandError = {
                      code: 'INVALID_INPUT',
                      message: error.message,
                      user_actionable: true,
                    };
                    handleFileValidationError(commandError);
                  }}
                  onKeyChange={handleKeyChange}
                  onPassphraseChange={setPassphrase}
                  onPassphraseError={(error) => {
                    // Create command error for passphrase validation failures
                    const commandError: CommandError = {
                      code: 'WRONG_PASSPHRASE',
                      message: error.message,
                      user_actionable: true,
                    };
                    handleFileValidationError(commandError);
                  }}
                  onClearError={clearError}
                  onStepChange={handleStepNavigation}
                  // Recovery props
                  isKnownVault={isKnownVault}
                  detectedVaultName={detectedVaultName}
                  isRecoveryMode={isRecoveryMode}
                  availableKeysForDiscovery={availableKeys}
                  suggestedKeys={suggestedKeys}
                  keyAttempts={keyAttempts}
                  willRestoreManifest={willRestoreManifest}
                  onImportKey={() => {
                    // TODO: Implement key import dialog
                    console.log('Import key requested');
                  }}
                  onDetectYubiKey={() => {
                    // TODO: Implement YubiKey detection
                    console.log('Detect YubiKey requested');
                  }}
                  onConfirmRestoration={handleDecryption}
                />

                {/* Ready to decrypt panel or Manifest Restoration - Step 3 */}
                {currentStep === 3 && selectedFile && selectedKeyId && passphrase && outputPath && (
                  <>
                    {isRecoveryMode && willRestoreManifest ? (
                      <ManifestRestoration
                        vaultName={detectedVaultName}
                        keyCount={1}
                        onConfirm={handleDecryption}
                        onSkip={handleDecryption}
                      />
                    ) : (
                      <DecryptionReadyPanel
                        outputPath={outputPath}
                        showAdvancedOptions={showAdvancedOptions}
                        isLoading={isLoading}
                        onPathChange={setOutputPath}
                        onToggleAdvanced={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        onDecrypt={handleDecryption}
                        onPrevious={() => handleStepNavigation(2)}
                        autoFocus={currentStep === 3}
                      />
                    )}
                  </>
                )}

                {/* Help section */}
                <CollapsibleHelp triggerText="How Decryption Works" context="decrypt" />
              </>
            )}
          </AnimatedTransition>
        </div>
      </AppPrimaryContainer>
    </div>
  );
};

export default DecryptPage;
