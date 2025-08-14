import React from 'react';
import { useSetupWorkflow } from '../hooks/useSetupWorkflow';
import { ErrorMessage } from '../components/ui/error-message';
import { Shield, Sparkles, Lock, Zap } from 'lucide-react';
import SetupForm from '../components/setup/SetupForm';
import SetupProgressPanel from '../components/setup/SetupProgressPanel';
import SetupSuccessPanel from '../components/setup/SetupSuccessPanel';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
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
      {/* Section header bar with tight spacing - matches Encrypt/Decrypt */}
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-[960px] px-6 h-16 flex items-center justify-between">
          <h1 className="flex items-center gap-3 text-2xl font-semibold text-slate-900">
            <Shield className="h-5 w-5 text-blue-600" />
            Create Your Vault Key
          </h1>
          <div className="hidden md:flex gap-2">
            {/* Trust badges on same row as title */}
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-700 px-3 h-8 text-sm">
              <Sparkles className="h-4 w-4 text-slate-600" />
              Military-grade
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-700 px-3 h-8 text-sm">
              <Lock className="h-4 w-4 text-slate-600" />
              Local-only
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-700 px-3 h-8 text-sm">
              <Zap className="h-4 w-4 text-slate-600" />
              Zero network
            </span>
          </div>
        </div>
      </header>

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
            <SetupSuccessPanel success={success} onClose={handleReset} />
          </div>
        ) : (
          <>
            {/* Form card with consistent spacing */}
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 md:p-8 mt-6">
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
        {!success && <CollapsibleHelp triggerText="How does this work?" />}
      </main>
    </div>
  );
};

export default SetupPage;
