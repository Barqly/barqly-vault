import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetupWorkflow } from '../hooks/useSetupWorkflow';
import { ErrorMessage } from '../components/ui/error-message';
import { Shield } from 'lucide-react';
import SetupForm from '../components/setup/SetupForm';
import SetupProgressPanel from '../components/setup/SetupProgressPanel';
import SetupSuccessPanel from '../components/setup/SetupSuccessPanel';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import UniversalHeader from '../components/common/UniversalHeader';
import { logger } from '../lib/logger';

/**
 * Main setup page component for key generation
 * Refactored from 313 lines to ~140 lines by extracting logic and sub-components
 */
const SetupPage: React.FC = () => {
  logger.logComponentLifecycle('SetupPage', 'Mount');
  const navigate = useNavigate();

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

  const handleEncryptVault = () => {
    navigate('/encrypt');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Unified header component */}
      <UniversalHeader title="Create Your Vault Key" icon={Shield} skipNavTarget="#main-content" />

      {/* Main content container */}
      <main className="mx-auto max-w-[960px] px-6" id="main-content">
        {/* Error Display */}
        {error && (
          <div className="mt-6">
            <ErrorMessage
              error={error}
              showRecoveryGuidance={true}
              showCloseButton={true}
              onClose={clearError}
            />
          </div>
        )}

        {/* Success Display - replaces form card when shown */}
        {success ? (
          <div className="mt-6">
            <SetupSuccessPanel success={success} onClose={handleReset} onEncryptVault={handleEncryptVault} />
          </div>
        ) : (
          <>
            {/* Form card with consistent spacing */}
            <section
              className="relative rounded-2xl border border-slate-200 bg-white shadow-sm py-6 px-6 md:py-6 md:px-7 mt-6"
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
              {/* Progress Display */}
              {progress && <SetupProgressPanel progress={progress} />}

              {/* Key Generation Form */}
              {!isLoading && (
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
            </section>
          </>
        )}

        {/* "How does this work?" expandable help section */}
        {!success && (
          <section className="mt-[var(--space-6)]">
            <CollapsibleHelp triggerText="How does this work?" />
          </section>
        )}
      </main>
    </div>
  );
};

export default SetupPage;
