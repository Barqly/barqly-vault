import React, { useEffect } from 'react';
import { useEncryptionWorkflow } from '../hooks/useEncryptionWorkflow';
import { EncryptFlowProvider, useEncryptFlow } from '../contexts/EncryptFlowContext';
import { ErrorMessage } from '../components/ui/error-message';
import ToastContainer from '../components/ui/ToastContainer';
import AppHeader from '../components/common/AppHeader';
import ProgressBar, { ProgressStep } from '../components/ui/ProgressBar';
import AnimatedTransition from '../components/ui/AnimatedTransition';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import EncryptionProgress from '../components/encrypt/EncryptionProgress';
import EncryptionSuccess from '../components/encrypt/EncryptionSuccess';

// Step components
import EncryptStep1 from '../components/encrypt/steps/EncryptStep1';
import EncryptStep2 from '../components/encrypt/steps/EncryptStep2';
import EncryptStep3 from '../components/encrypt/steps/EncryptStep3';

const ENCRYPTION_STEPS: ProgressStep[] = [
  { id: 1, label: 'Select Files', description: 'Choose what to encrypt' },
  { id: 2, label: 'Choose Key', description: 'Select encryption key' },
  { id: 3, label: 'Encrypt Vault', description: 'Set output and start' },
];

/**
 * Inner component that uses the EncryptFlow context
 */
const EncryptPageContent: React.FC = () => {
  const { currentStep, completedSteps, resetFlow } = useEncryptFlow();

  const {
    // From useFileEncryption
    error,
    success,
    progress,
    clearError,

    // From useToast
    toasts,
    removeToast,

    // Handlers
    handleReset,
    encryptionResult,
  } = useEncryptionWorkflow();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleReset();
    };
  }, [handleReset]);

  const handleEncryptMore = () => {
    resetFlow();
    handleReset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Unified App Header */}
      <AppHeader screen="encrypt" includeSkipNav={true} skipNavTarget="#main-content" />

      {/* Progress Bar */}
      <ProgressBar
        steps={ENCRYPTION_STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={undefined}
        isClickable={false}
        variant="compact"
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8" id="main-content">
        <div className="space-y-6">
          {/* Error Display */}
          {error && !progress && (
            <ErrorMessage error={error} showRecoveryGuidance={true} onClose={clearError} />
          )}

          {/* Progress Overlay */}
          <AnimatedTransition show={!!progress && !success} duration={300}>
            {progress && !success && (
              <EncryptionProgress progress={progress} onCancel={handleReset} showCancel={true} />
            )}
          </AnimatedTransition>

          {/* Success State */}
          <AnimatedTransition show={!!success && !!encryptionResult} duration={400}>
            {success && encryptionResult && (
              <EncryptionSuccess {...encryptionResult} onEncryptMore={handleEncryptMore} />
            )}
          </AnimatedTransition>

          {/* Step-based Form */}
          <AnimatedTransition show={!success && !progress} duration={300}>
            {!success && !progress && (
              <>
                {/* Step 1: File Selection */}
                <AnimatedTransition show={currentStep === 1} duration={300}>
                  {currentStep === 1 && <EncryptStep1 />}
                </AnimatedTransition>

                {/* Step 2: Key Selection */}
                <AnimatedTransition show={currentStep === 2} duration={300}>
                  {currentStep === 2 && <EncryptStep2 />}
                </AnimatedTransition>

                {/* Step 3: Output Configuration & Encryption */}
                <AnimatedTransition show={currentStep === 3} duration={300}>
                  {currentStep === 3 && <EncryptStep3 />}
                </AnimatedTransition>

                {/* Help Section */}
                <CollapsibleHelp triggerText="Encryption Guide" detailed={true} />
              </>
            )}
          </AnimatedTransition>
        </div>
      </div>
    </div>
  );
};

/**
 * Main encryption page component
 * Uses step-based progressive disclosure pattern, symmetric with DecryptPage
 */
const EncryptPage: React.FC = () => {
  return (
    <EncryptFlowProvider>
      <EncryptPageContent />
    </EncryptFlowProvider>
  );
};

export default EncryptPage;
