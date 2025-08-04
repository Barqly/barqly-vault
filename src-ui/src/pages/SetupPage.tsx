import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Lock } from 'lucide-react';
import { useKeyGeneration } from '../hooks/useKeyGeneration';
import { ProgressBar } from '../components/ui/progress-bar';
import { ErrorMessage } from '../components/ui/error-message';
import { SuccessMessage } from '../components/ui/success-message';
// CompactSetupHeader removed - functionality integrated into FormSection
import PrimaryButton from '../components/ui/PrimaryButton';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import ProgressContext from '../components/ui/ProgressContext';
import EnhancedInput from '../components/forms/EnhancedInput';
import PassphraseField from '../components/forms/PassphraseField';
import FormSection from '../components/forms/FormSection';
import { logger } from '../lib/logger';

const SetupPage: React.FC = () => {
  logger.logComponentLifecycle('SetupPage', 'Mount');

  const {
    generateKey,
    isLoading,
    error,
    success,
    progress,
    reset,
    clearError,
    setLabel,
    setPassphrase,
  } = useKeyGeneration();

  const [keyLabel, setKeyLabel] = useState<string>('');
  const [passphrase, setLocalPassphrase] = useState<string>('');
  const [confirmPassphrase, setConfirmPassphrase] = useState<string>('');
  const successMessageRef = useRef<HTMLDivElement>(null);

  const isFormValid =
    keyLabel.trim() && passphrase && confirmPassphrase && passphrase === confirmPassphrase;

  const handleReset = useCallback(() => {
    reset();
    setKeyLabel('');
    setLocalPassphrase('');
    setConfirmPassphrase('');
  }, [reset]);

  const handleKeyGeneration = useCallback(async () => {
    logger.logComponentLifecycle('SetupPage', 'handleKeyGeneration started', {
      keyLabel,
      passphraseLength: passphrase.length,
      confirmPassphraseLength: confirmPassphrase.length,
    });

    // Validate inputs
    if (!keyLabel.trim()) {
      logger.warn('SetupPage', 'Key generation aborted: empty key label');
      return;
    }

    if (passphrase !== confirmPassphrase) {
      logger.warn('SetupPage', 'Key generation aborted: passphrase mismatch');
      return;
    }

    try {
      logger.info('SetupPage', 'Setting hook state for key generation', {
        keyLabel: keyLabel.trim(),
      });

      // Set the hook's state
      setLabel(keyLabel.trim());
      setPassphrase(passphrase);

      logger.info('SetupPage', 'Calling generateKey function');
      // Then generate the key
      await generateKey();

      logger.info('SetupPage', 'generateKey completed successfully');
    } catch (err) {
      // Error is already handled by the hook
      logger.error(
        'SetupPage',
        'Key generation error caught in component',
        err instanceof Error ? err : new Error(String(err)),
        { error: err },
      );
    }
  }, [keyLabel, passphrase, confirmPassphrase, generateKey, setLabel, setPassphrase]);

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // Focus management for success state
  useEffect(() => {
    if (success && successMessageRef.current) {
      // Set focus to the success message for screen reader users
      successMessageRef.current.focus();
    }
  }, [success]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key clears form
      if (e.key === 'Escape' && !success && !isLoading) {
        e.preventDefault();
        handleReset();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [success, isLoading, handleReset]);

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
            {/* Skip navigation target */}
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
            {success && (
              <div
                className="animate-in slide-in-from-top-4 duration-500 ease-out"
                ref={successMessageRef}
                tabIndex={-1}
                aria-label="Key generation success notification"
              >
                <SuccessMessage
                  title="Key Generated Successfully!"
                  message="Your encryption keypair has been created and securely stored."
                  showCloseButton={true}
                  onClose={handleReset}
                  details={
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Your Public Key:</p>
                      <div className="bg-gray-50 p-3 rounded font-mono text-xs break-all border transition-colors hover:bg-gray-100">
                        {success.public_key}
                      </div>
                      <p className="mt-2 text-xs text-gray-600">
                        Share this public key with others who need to encrypt files for you.
                      </p>
                    </div>
                  }
                  showDetails={true}
                />
              </div>
            )}

            {/* Progress Display */}
            {progress && (
              <div className="border border-gray-200 rounded-lg p-6">
                <ProgressContext
                  variant="secure"
                  customMessage="Generating strong encryption keys..."
                />
                <div className="mt-4">
                  <ProgressBar
                    value={progress.progress}
                    statusMessage={progress.message}
                    showPercentage={true}
                    showStatus={true}
                  />
                </div>
              </div>
            )}

            {/* Key Generation Form */}
            {!success && !isLoading && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleKeyGeneration();
                }}
              >
                {/* Key Label Input - Enhanced */}
                <EnhancedInput
                  id="key-label"
                  label="Key Label"
                  value={keyLabel}
                  onChange={(e) => {
                    setKeyLabel(e.target.value);
                    setLabel(e.target.value);
                  }}
                  placeholder="e.g., Family Bitcoin Vault"
                  helper="Choose a memorable name to identify this key"
                  required={true}
                  size="large"
                  success={keyLabel.trim().length > 0}
                  autoFocus={true}
                />

                {/* Passphrase Input - Enhanced */}
                <div>
                  <label
                    htmlFor="passphrase"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Passphrase <span className="text-red-500">*</span>
                  </label>
                  <PassphraseField
                    id="passphrase"
                    value={passphrase}
                    onChange={(value) => {
                      setLocalPassphrase(value);
                      setPassphrase(value);
                    }}
                    placeholder="Enter a strong passphrase"
                    showStrength={true}
                    required={true}
                  />
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Shield className="w-3 h-3" />
                    <span>Encrypted locally on your device</span>
                  </div>
                </div>

                {/* Confirm Passphrase - Enhanced */}
                <div>
                  <label
                    htmlFor="confirm-passphrase"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Confirm Passphrase <span className="text-red-500">*</span>
                  </label>
                  <PassphraseField
                    id="confirm-passphrase"
                    value={confirmPassphrase}
                    onChange={setConfirmPassphrase}
                    placeholder="Re-enter your passphrase"
                    showStrength={false}
                    matchValue={passphrase}
                    required={true}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3" />
                      <span>Your keys never leave this device</span>
                    </div>
                    <div>
                      <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                        Esc
                      </kbd>{' '}
                      to clear •{' '}
                      <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                        Enter
                      </kbd>{' '}
                      to submit
                    </div>
                  </div>
                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-400 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      Clear
                    </button>
                    <PrimaryButton
                      type="submit"
                      disabled={!isFormValid}
                      loading={isLoading}
                      loadingText="Creating Key..."
                      size="large"
                    >
                      Create Key
                    </PrimaryButton>
                  </div>
                </div>
              </form>
            )}
          </FormSection>

          {/* Collapsible Help Section - Minimal */}
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
