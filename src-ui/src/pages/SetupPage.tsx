import React, { useState, useEffect } from 'react';
import { useKeyGeneration } from '../hooks/useKeyGeneration';
import { ProgressBar } from '../components/ui/progress-bar';
import { ErrorMessage } from '../components/ui/error-message';
import { SuccessMessage } from '../components/ui/success-message';
import SetupHeader from '../components/layout/SetupHeader';
import TrustIndicators from '../components/ui/TrustIndicators';
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

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const handleKeyGeneration = async () => {
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
  };

  const handleReset = () => {
    reset();
    setKeyLabel('');
    setPassphrase('');
    setConfirmPassphrase('');
  };

  const isFormValid =
    keyLabel.trim() && passphrase && confirmPassphrase && passphrase === confirmPassphrase;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Compact Header with Trust Building */}
      <SetupHeader />

      <div className="p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Trust Indicators */}
          <TrustIndicators />

          {/* Progress Context */}
          {!success && !isLoading && <ProgressContext variant="quick" estimatedTime={90} />}

          <FormSection
            title="Create Your Encryption Identity"
            subtitle="Set up your secure identity with a memorable label and strong passphrase"
          >
            {/* Error Display */}
            {error && (
              <ErrorMessage error={error} showRecoveryGuidance={true} onClose={clearError} />
            )}

            {/* Success Display */}
            {success && (
              <div className="animate-in slide-in-from-top-4 duration-500 ease-out">
                <SuccessMessage
                  title="🎉 Key Generated Successfully!"
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
                        💡 Share this public key with others who need to encrypt files for you.
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
                  placeholder="e.g., My Bitcoin Vault Key"
                  helper="A descriptive name to identify this key"
                  required={true}
                  size="large"
                  success={keyLabel.trim().length > 0}
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
                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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
                    Create Security Identity
                  </PrimaryButton>
                </div>
              </>
            )}
          </FormSection>

          {/* Collapsible Help Section */}
          {!success && (
            <CollapsibleHelp
              triggerText="Learn how Bitcoin legacy protection works"
              detailed={true}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupPage;
