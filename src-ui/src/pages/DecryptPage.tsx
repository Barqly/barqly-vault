import React from 'react';
import { useDecryptionWorkflow } from '../hooks/useDecryptionWorkflow';
import type { CommandError } from '../bindings';
import { Unlock } from 'lucide-react';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import PageHeader from '../components/common/PageHeader';
import ProgressBar, { ProgressStep } from '../components/ui/ProgressBar';
import ProgressiveDecryptionCards from '../components/decrypt/ProgressiveDecryptionCards';
import DecryptionReadyPanel from '../components/decrypt/DecryptionReadyPanel';
import ManifestRestoration from '../components/decrypt/ManifestRestoration';
import DecryptProgress from '../components/decrypt/DecryptProgress';
import DecryptSuccess from '../components/decrypt/DecryptSuccess';
import DecryptError from '../components/decrypt/DecryptError';
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
    isDiscoveringKeys: _isDiscoveringKeys,
    availableKeys,
    keyAttempts,

    // Recovery state
    isRecoveryMode,
    willRestoreManifest,
    willRestoreKeys: _willRestoreKeys,

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
    selectedKeyType, // For YubiKey touch prompt

    // Handlers
    handleFileSelected,
    handleDecryption,
    handleReset,
    handleDecryptAnother,
    handleTryAgain,
    handleKeyChange,
    handleFileValidationError,

    // Navigation handlers
    handleStepNavigation,

    // Attempt tracking
    passphraseAttempts,

    // Setters
    setAvailableKeys: _setAvailableKeys,
    setIsDiscoveringKeys: _setIsDiscoveringKeys,
  } = useDecryptionWorkflow();

  return (
    <div className="min-h-screen bg-app -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
      {/* Page Header with Vault Display - Full Width */}
      <PageHeader
        title="Decrypt Vault"
        icon={Unlock}
        skipNavTarget="#main-content"
        showVaultBadge={true}
        vaultName={selectedFile && detectedVaultName ? detectedVaultName : undefined}
        vaultVariant="normal"
        vaultId={detectedVaultId}
      />

      {/* Progress Bar - Full Width */}
      <div className="w-full">
        <ProgressBar
          steps={DECRYPTION_STEPS}
          currentStep={currentStep}
          completedSteps={new Set(Array.from({ length: currentStep - 1 }, (_, i) => i + 1))}
          onStepClick={undefined}
          isClickable={false}
          variant="compact"
        />
      </div>

      {/* Main content - Centered Container */}
      <AppPrimaryContainer id="main-content">
        <div className="mt-6 space-y-6">
          {/* Error view - shown after decryption attempt fails (full view like success) */}
          <AnimatedTransition show={!!error && !isDecrypting && !success} duration={400}>
            {error && !success && (
              <DecryptError
                error={error}
                passphraseAttempts={passphraseAttempts}
                onTryAgain={handleTryAgain}
              />
            )}
          </AnimatedTransition>

          {/* Success display with animation */}
          <AnimatedTransition show={!!success} duration={400}>
            {success && (
              <DecryptSuccess
                result={success}
                onDecryptAnother={handleDecryptAnother}
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
              selectedKeyType={selectedKeyType}
            />
          </AnimatedTransition>

          {/* Main form - hidden during success/progress/error with smooth transition */}
          <AnimatedTransition show={!success && !isDecrypting && !error} duration={300}>
            {!success && !isDecrypting && !error && (
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
                      details: null,
                      recovery_guidance: null,
                      trace_id: null,
                      span_id: null,
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
                      details: null,
                      recovery_guidance: null,
                      trace_id: null,
                      span_id: null,
                    };
                    handleFileValidationError(commandError);
                  }}
                  onClearError={clearError}
                  onStepChange={handleStepNavigation}
                  // Recovery props
                  isKnownVault={isKnownVault}
                  detectedVaultName={detectedVaultName}
                  detectedVaultId={detectedVaultId}
                  isRecoveryMode={isRecoveryMode}
                  availableKeysForDiscovery={availableKeys}
                  keyAttempts={keyAttempts}
                  willRestoreManifest={willRestoreManifest}
                  onImportKey={() => {}}
                  onDetectYubiKey={() => {}}
                  onConfirmRestoration={handleDecryption}
                  onDecrypt={handleDecryption}
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
