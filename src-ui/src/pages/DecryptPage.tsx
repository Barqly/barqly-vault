import React from 'react';
import { useDecryptionWorkflow } from '../hooks/useDecryptionWorkflow';
import { ErrorMessage } from '../components/ui/error-message';
import { ErrorCode } from '../lib/api-types';
import { Unlock } from 'lucide-react';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import UniversalHeader from '../components/common/UniversalHeader';
import ProgressBar, { ProgressStep } from '../components/ui/ProgressBar';
import ProgressiveDecryptionCards from '../components/decrypt/ProgressiveDecryptionCards';
import DecryptionReadyPanel from '../components/decrypt/DecryptionReadyPanel';
import DecryptProgress from '../components/decrypt/DecryptProgress';
import DecryptSuccess from '../components/decrypt/DecryptSuccess';
import AnimatedTransition from '../components/ui/AnimatedTransition';

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
    passphraseAttempts,
    isDecrypting,
    showAdvancedOptions,
    setShowAdvancedOptions,
    vaultMetadata,

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
      <div className="max-w-4xl mx-auto px-6 py-8" id="main-content">
        <div className="space-y-6">
          {/* Error display */}
          {error && !isDecrypting && (
            <ErrorMessage error={error} showRecoveryGuidance={true} onClose={clearError} />
          )}

          {/* Success display with animation */}
          <AnimatedTransition show={!!success} duration={400}>
            {success && <DecryptSuccess result={success} onDecryptAnother={handleDecryptAnother} />}
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
                  passphraseAttempts={passphraseAttempts}
                  vaultMetadata={vaultMetadata}
                  isLoading={isLoading}
                  onFileSelected={handleFileSelected}
                  onClearFiles={clearSelection}
                  onFileError={(error) => {
                    // Create inline error for file validation failures
                    const commandError = {
                      code: ErrorCode.INVALID_INPUT,
                      message: error.message,
                      user_actionable: true,
                    };
                    handleFileValidationError(commandError);
                  }}
                  onKeyChange={handleKeyChange}
                  onPassphraseChange={setPassphrase}
                  onNeedHelp={() => {
                    // TODO: Consider implementing inline help panel instead of toast
                    console.log(
                      'Help requested: Check your password manager, backup notes, or contact support',
                    );
                  }}
                  onStepChange={handleStepNavigation}
                />

                {/* Ready to decrypt panel - Step 3 */}
                {currentStep === 3 && selectedFile && selectedKeyId && passphrase && outputPath && (
                  <DecryptionReadyPanel
                    outputPath={outputPath}
                    showAdvancedOptions={showAdvancedOptions}
                    isLoading={isLoading}
                    onPathChange={setOutputPath}
                    onToggleAdvanced={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    onDecrypt={handleDecryption}
                    onPrevious={() => handleStepNavigation(2)}
                  />
                )}

                {/* Help section */}
                <CollapsibleHelp triggerText="Decryption Tips" />
              </>
            )}
          </AnimatedTransition>
        </div>
      </div>
    </div>
  );
};

export default DecryptPage;
