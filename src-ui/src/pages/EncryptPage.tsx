import React from 'react';
import { useEncryptionWorkflow } from '../hooks/useEncryptionWorkflow';
import { ErrorMessage } from '../components/ui/error-message';
import { ErrorCode } from '../lib/api-types';
import ToastContainer from '../components/ui/ToastContainer';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import AppHeader from '../components/common/AppHeader';
import ProgressBar, { ProgressStep } from '../components/ui/ProgressBar';
import ProgressiveEncryptionCards from '../components/encrypt/ProgressiveEncryptionCards';
import EncryptionReadyPanel from '../components/encrypt/EncryptionReadyPanel';
import EncryptionProgress from '../components/encrypt/EncryptionProgress';
import EncryptionSuccess from '../components/encrypt/EncryptionSuccess';
import AnimatedTransition from '../components/ui/AnimatedTransition';

const ENCRYPTION_STEPS: ProgressStep[] = [
  { id: 1, label: 'Select Files', description: 'Choose what to encrypt' },
  { id: 2, label: 'Choose Key', description: 'Select encryption key' },
  { id: 3, label: 'Encrypt Vault', description: 'Set output and start' },
];

/**
 * Main encryption page component
 * Uses step-based progressive disclosure pattern, symmetric with DecryptPage
 */
const EncryptPage: React.FC = () => {
  const {
    // State
    selectedFiles,
    selectedKeyId,
    outputPath,
    archiveName,
    showAdvancedOptions,
    setShowAdvancedOptions,
    isEncrypting,

    // From useFileEncryption
    isLoading,
    error,
    success,
    progress,
    clearError,
    clearSelection,
    setOutputPath,
    setArchiveName,

    // From useToast
    toasts,
    removeToast,

    // Computed
    currentStep,

    // Handlers
    handleFilesSelected,
    handleEncryption,
    handleReset,
    handleEncryptAnother,
    handleKeyChange,
    handleFileValidationError,

    // Navigation handlers
    handleStepNavigation,
    encryptionResult,
  } = useEncryptionWorkflow();

  // Debug logging
  console.log('[DEBUG] EncryptPage render:', {
    success: !!success,
    isEncrypting,
    hasEncryptionResult: !!encryptionResult,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Unified App Header */}
      <AppHeader screen="encrypt" includeSkipNav={true} skipNavTarget="#main-content" />

      {/* Progress Bar */}
      <ProgressBar
        steps={ENCRYPTION_STEPS}
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
          {error && !isEncrypting && (
            <ErrorMessage error={error} showRecoveryGuidance={true} onClose={clearError} />
          )}

          {/* Success display with animation */}
          <AnimatedTransition show={!!success} duration={400}>
            {success && encryptionResult && (
              <EncryptionSuccess {...encryptionResult} onEncryptMore={handleEncryptAnother} />
            )}
          </AnimatedTransition>

          {/* Progress display - show immediately when encrypting starts */}
          <AnimatedTransition show={!success && isEncrypting} duration={300}>
            <EncryptionProgress
              progress={
                progress || {
                  operation_id: 'encrypt-init',
                  progress: 0,
                  message: 'Initializing encryption...',
                  timestamp: new Date().toISOString(),
                }
              }
              onCancel={!progress || progress.progress < 90 ? handleReset : undefined}
            />
          </AnimatedTransition>

          {/* Main form - hidden during success/progress with smooth transition */}
          <AnimatedTransition show={!success && !isEncrypting} duration={300}>
            {!success && !isEncrypting && (
              <>
                {/* Progressive Card System - Steps 1 & 2 */}
                <ProgressiveEncryptionCards
                  currentStep={currentStep}
                  selectedFiles={selectedFiles}
                  selectedKeyId={selectedKeyId}
                  isLoading={isLoading}
                  onFilesSelected={handleFilesSelected}
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
                  onStepChange={handleStepNavigation}
                />

                {/* Ready to encrypt panel - Step 3 */}
                {currentStep === 3 && selectedFiles && selectedKeyId && (
                  <EncryptionReadyPanel
                    outputPath={outputPath}
                    archiveName={archiveName}
                    showAdvancedOptions={showAdvancedOptions}
                    isLoading={isLoading}
                    onPathChange={setOutputPath}
                    onArchiveNameChange={setArchiveName}
                    onToggleAdvanced={() => setShowAdvancedOptions(!showAdvancedOptions)}
                    onEncrypt={handleEncryption}
                    onPrevious={() => handleStepNavigation(2)}
                  />
                )}

                {/* Help section */}
                <CollapsibleHelp triggerText="Encryption Guide" detailed={true} />
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

export default EncryptPage;
