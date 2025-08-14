import React from 'react';
import { useSetupWorkflow } from '../hooks/useSetupWorkflow';
import { ErrorMessage } from '../components/ui/error-message';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import AppHeader from '../components/common/AppHeader';
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
      {/* Unified App Header */}
      <AppHeader screen="setup" includeSkipNav={true} skipNavTarget="#main-content" />

      {/* Main content */}
      <div className="p-4">
        <div className="w-full max-w-2xl mx-auto">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Form content */}
            <div className="px-6 py-6">
              {/* Skip navigation target for accessibility */}
              <div id="main-content" tabIndex={-1} className="sr-only">
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
            </div>
          </div>

          {/* Collapsible Help Section */}
          {!success && (
            <div className="mt-4 text-center">
              <CollapsibleHelp triggerText="How does this work?" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
