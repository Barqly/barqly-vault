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
      {/* Global header row - in app bar */}
      <div className="absolute top-4 right-6">
        <p className="text-sm text-slate-500">Secure file encryption for Bitcoin custody</p>
      </div>

      {/* Main content container with proper spacing */}
      <div className="py-10" id="main-content">
        {/* Section header bar */}
        <section className="max-w-[960px] mx-auto px-6">
          <div className="rounded-xl border border-slate-200 bg-white px-6 py-4">
            <h2 className="flex items-center gap-2 text-[28px] leading-8 font-semibold text-slate-800">
              <Shield className="h-5 w-5 text-blue-600" />
              Create Your Vault Key
            </h2>

            <div className="mt-4 flex gap-3">
              {/* Security badges */}
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-700">
                <Sparkles className="h-3.5 w-3.5 text-slate-500" />
                Military-grade
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-700">
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                Local-only
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-700">
                <Zap className="h-3.5 w-3.5 text-slate-500" />
                Zero network
              </span>
            </div>
          </div>
        </section>

        {/* Form content container */}
        <div className="max-w-[960px] mx-auto px-6">
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
              {/* Form card */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] p-6">
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
              </div>
            </>
          )}

          {/* "How does this work?" link */}
          {!success && <CollapsibleHelp triggerText="How does this work?" />}
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
