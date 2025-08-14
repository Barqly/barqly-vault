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
            <section 
              className="relative rounded-2xl border border-slate-200 bg-white shadow-sm py-6 px-6 md:py-6 md:px-7 mt-6"
              style={{"--space-1":"4px", "--space-2":"8px", "--space-3":"12px", "--space-4":"16px", "--space-5":"20px", "--space-6":"24px"} as React.CSSProperties}
            >
              {/* Security badge (top-right) */}
              <div 
                className="absolute top-6 right-6 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/70 px-3 py-1 text-[13px] leading-5 text-slate-600"
                aria-label="Keys stay on this device. Nothing is sent over the network."
              >
                <svg aria-hidden="true" className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 2a6 6 0 00-6 6v2.5a2.5 2.5 0 002 2.45V15a4 4 0 108 0v-2.05a2.5 2.5 0 002-2.45V8a6 6 0 00-6-6zm2 13a2 2 0 11-4 0v-2h4v2z"/>
                </svg>
                <span>Keys stay on this device</span>
              </div>

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
