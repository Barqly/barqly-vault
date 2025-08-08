import React from 'react';
import { useSetupWorkflow } from '../hooks/useSetupWorkflow';
import { ErrorMessage } from '../components/ui/error-message';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import FormSection from '../components/forms/FormSection';
import SetupForm from '../components/setup/SetupForm';
import SetupProgressPanel from '../components/setup/SetupProgressPanel';
import SetupSuccessPanel from '../components/setup/SetupSuccessPanel';
import { logger } from '../lib/logger';

/**
 * Main setup page component for key generation
 * Refactored from 313 lines to ~140 lines by extracting logic and sub-components
 */
const SetupPage: React.FC = () => {
  logger.logComponentLifecycle('SetupPage', 'Mount');

  const {
    // State
    keyLabel,
    passphrase,
    confirmPassphrase,
    isFormValid,
    isLoading,
    error,
    success,
    progress,

    // Handlers
    handleKeyLabelChange,
    handlePassphraseChange,
    setConfirmPassphrase,
    handleKeyGeneration,
    handleReset,
    clearError,
  } = useSetupWorkflow();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content */}
      <div className="p-4">
        <div className="w-full max-w-2xl mx-auto">
          <FormSection
            title="Create Your Security Identity"
            subtitle=""
            showTrustBadges={true}
            showNavigation={false}
            showBrandHeader={false}
          >
            {/* Skip navigation target for accessibility */}
            <div id="main-form" tabIndex={-1} className="sr-only">
              Main form content
            </div>

            {/* Error Display */}
            {error && (
              <ErrorMessage
                error={error}
                showRecoveryGuidance={true}
                showCloseButton={true}
                onClose={clearError}
              />
            )}

            {/* Success Display */}
            {success && <SetupSuccessPanel success={success} onClose={handleReset} />}

            {/* Progress Display */}
            {progress && <SetupProgressPanel progress={progress} />}

            {/* Key Generation Form */}
            {!success && !isLoading && (
              <SetupForm
                keyLabel={keyLabel}
                passphrase={passphrase}
                confirmPassphrase={confirmPassphrase}
                isFormValid={isFormValid}
                isLoading={isLoading}
                onKeyLabelChange={handleKeyLabelChange}
                onPassphraseChange={handlePassphraseChange}
                onConfirmPassphraseChange={setConfirmPassphrase}
                onSubmit={handleKeyGeneration}
                onReset={handleReset}
              />
            )}
          </FormSection>

          {/* Collapsible Help Section */}
          {!success && (
            <div className="mt-4 text-center">
              <CollapsibleHelp triggerText="How does this work?" detailed={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
