import React from 'react';
import { useDecryptionWorkflow } from '../hooks/useDecryptionWorkflow';
import { ErrorMessage } from '../components/ui/error-message';
import { ErrorCode } from '../lib/api-types';
import ToastContainer from '../components/ui/ToastContainer';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import AppHeader from '../components/common/AppHeader';
import DecryptionProgressBar from '../components/decrypt/DecryptionProgressBar';
import ProgressiveDecryptionCards from '../components/decrypt/ProgressiveDecryptionCards';
import DecryptionReadyPanel from '../components/decrypt/DecryptionReadyPanel';
import DecryptProgress from '../components/decrypt/DecryptProgress';
import DecryptSuccess from '../components/decrypt/DecryptSuccess';
import AnimatedTransition from '../components/ui/AnimatedTransition';

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

    // From useToast
    toasts,
    removeToast,
    showInfo,

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Unified App Header */}
      <AppHeader screen="decrypt" includeSkipNav={true} skipNavTarget="#main-content" />

      {/* Progress indicator */}
      <DecryptionProgressBar currentStep={currentStep} />

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-6 py-8" id="main-content">
        <div className="space-y-6">
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
                onClose={handleReset}
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
                    showInfo(
                      'Passphrase Recovery',
                      'Check your password manager, backup notes, or contact support for assistance',
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
                <CollapsibleHelp triggerText="Decryption Tips" detailed={false} />
              </>
            )}
          </AnimatedTransition>
        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default DecryptPage;
