import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Lock } from 'lucide-react';
import { useKeyGeneration } from '../hooks/useKeyGeneration';
import { ProgressBar } from '../components/ui/progress-bar';
import { ErrorMessage } from '../components/ui/error-message';
import { SuccessMessage } from '../components/ui/success-message';
import CompactSetupHeader from '../components/layout/CompactSetupHeader';
import PrimaryButton from '../components/ui/PrimaryButton';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import ProgressContext from '../components/ui/ProgressContext';
import EnhancedInput from '../components/forms/EnhancedInput';
import PassphraseField from '../components/forms/PassphraseField';
import FormSection from '../components/forms/FormSection';

const SetupPage: React.FC = () => {
  const { generateKey, isLoading, error, success, progress, reset, clearError } =
    useKeyGeneration();

  const [keyLabel, setKeyLabel] = useState<string>('');
  const [passphrase, setPassphrase] = useState<string>('');
  const [confirmPassphrase, setConfirmPassphrase] = useState<string>('');
  const successMessageRef = useRef<HTMLDivElement>(null);

  const isFormValid =
    keyLabel.trim() && passphrase && confirmPassphrase && passphrase === confirmPassphrase;

  const handleReset = useCallback(() => {
    reset();
    setKeyLabel('');
    setPassphrase('');
    setConfirmPassphrase('');
  }, [reset]);

  const handleKeyGeneration = useCallback(async () => {
    // Validate inputs
    if (!keyLabel.trim()) {
      return;
    }

    if (passphrase !== confirmPassphrase) {
      return;
    }

    try {
      // Set the state first
      setKeyLabel(keyLabel.trim());
      setPassphrase(passphrase);

      // Then generate the key
      await generateKey();
    } catch (err) {
      // Error is already handled by the hook
      console.error('Key generation error:', err);
    }
  }, [keyLabel, passphrase, confirmPassphrase, generateKey]);

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

      // Enter key submits form when valid (and not in an input field)
      if (
        e.key === 'Enter' &&
        isFormValid &&
        !isLoading &&
        !success &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        handleKeyGeneration();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFormValid, isLoading, success, handleReset, handleKeyGeneration]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Compact Header with Trust Building */}
      <CompactSetupHeader />

      {/* Main content - fills remaining height */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <FormSection
            title="Create Your Security Identity"
            subtitle=""
            showTrustBadges={true}
            className="h-[85vh] max-h-[700px]"
          >
            {/* Skip navigation target */}
            <div id="main-form" tabIndex={-1} className="sr-only">
              Main form content
            </div>
            {/* Error Display */}
            {error && (
              <ErrorMessage error={error} showRecoveryGuidance={true} onClose={clearError} />
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
              <>
                {/* Key Label Input - Enhanced */}
                <EnhancedInput
                  id="key-label"
                  label="Key Label"
                  value={keyLabel}
                  onChange={(e) => setKeyLabel(e.target.value)}
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
                    onChange={setPassphrase}
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
                      onClick={handleKeyGeneration}
                      disabled={!isFormValid}
                      loading={isLoading}
                      loadingText="Creating Key..."
                      size="large"
                    >
                      Create Key
                    </PrimaryButton>
                  </div>
                </div>
              </>
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
