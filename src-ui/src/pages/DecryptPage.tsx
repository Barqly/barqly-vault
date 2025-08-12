import React from 'react';
import { useDecryptionWorkflow } from '../hooks/useDecryptionWorkflow';
import { ErrorMessage } from '../components/ui/error-message';
import ToastContainer from '../components/ui/ToastContainer';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import AppHeader from '../components/common/AppHeader';
import DecryptionProgressBar from '../components/decrypt/DecryptionProgressBar';
import ProgressiveDecryptionCards from '../components/decrypt/ProgressiveDecryptionCards';
import DecryptionReadyPanel from '../components/decrypt/DecryptionReadyPanel';
import DecryptProgress from '../components/decrypt/DecryptProgress';
import DecryptSuccess from '../components/decrypt/DecryptSuccess';

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
    showError,

    // Computed
    currentStep,

    // Handlers
    handleFileSelected,
    handleDecryption,
    handleReset,
    handleDecryptAnother,
    handleKeyChange,

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

          {/* Success display */}
          {success && (
            <DecryptSuccess
              result={success}
              onDecryptAnother={handleDecryptAnother}
              onClose={handleReset}
            />
          )}

          {/* Progress display */}
          {progress && isDecrypting && (
            <DecryptProgress
              progress={progress}
              onCancel={progress.progress < 90 ? handleReset : undefined}
            />
          )}

          {/* Main form - hidden during success/progress */}
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
                onFileError={(error) => showError('File selection error', error.message)}
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
        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default DecryptPage;
