import React, { useState, useEffect } from 'react';
import { useKeyGeneration } from '../hooks/useKeyGeneration';
import PassphraseInput from '../components/forms/PassphraseInput';
import { ProgressBar } from '../components/ui/progress-bar';
import { ErrorMessage } from '../components/ui/error-message';
import { SuccessMessage } from '../components/ui/success-message';
import { LoadingSpinner } from '../components/ui/loading-spinner';

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
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Setup Barqly Vault</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Generate your first encryption key to get started with secure file encryption for
            Bitcoin custody backup.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="space-y-6">
            {/* Error Display */}
            {error && (
              <ErrorMessage error={error} showRecoveryGuidance={true} onClose={clearError} />
            )}

            {/* Success Display */}
            {success && (
              <SuccessMessage
                title="Key Generated Successfully!"
                message="Your encryption keypair has been created and securely stored."
                showCloseButton={true}
                onClose={handleReset}
                details={
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Your Public Key:</p>
                    <div className="bg-gray-50 p-3 rounded font-mono text-xs break-all">
                      {success.public_key}
                    </div>
                    <p className="mt-2 text-xs text-gray-600">
                      Share this public key with others who need to encrypt files for you.
                    </p>
                  </div>
                }
                showDetails={true}
              />
            )}

            {/* Progress Display */}
            {progress && (
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Generating Key...</h3>
                <ProgressBar
                  value={progress.progress}
                  statusMessage={progress.message}
                  showPercentage={true}
                  showStatus={true}
                />
              </div>
            )}

            {/* Key Generation Form */}
            {!success && !isLoading && (
              <>
                {/* Key Label Input */}
                <div>
                  <label
                    htmlFor="key-label"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Key Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="key-label"
                    type="text"
                    value={keyLabel}
                    onChange={(e) => setKeyLabel(e.target.value)}
                    placeholder="e.g., My Bitcoin Vault Key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    A descriptive name to identify this key
                  </p>
                </div>

                {/* Passphrase Input */}
                <div>
                  <label
                    htmlFor="passphrase"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Passphrase <span className="text-red-500">*</span>
                  </label>
                  <PassphraseInput
                    id="passphrase"
                    value={passphrase}
                    onChange={setPassphrase}
                    placeholder="Enter a strong passphrase"
                    showStrength={true}
                  />
                </div>

                {/* Confirm Passphrase */}
                <div>
                  <label
                    htmlFor="confirm-passphrase"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Confirm Passphrase <span className="text-red-500">*</span>
                  </label>
                  <PassphraseInput
                    id="confirm-passphrase"
                    value={confirmPassphrase}
                    onChange={setConfirmPassphrase}
                    placeholder="Re-enter your passphrase"
                    showStrength={false}
                  />
                  {confirmPassphrase && passphrase !== confirmPassphrase && (
                    <p className="mt-1 text-xs text-red-600">Passphrases do not match</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleKeyGeneration}
                    disabled={!isFormValid || isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Generating...
                      </span>
                    ) : (
                      'Generate Key'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* What happens next section */}
        {!success && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">What happens next?</h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-800">
              <div>
                <h3 className="font-medium mb-2">1. Key Generation</h3>
                <p>Your encryption keypair is created and securely stored on your device.</p>
              </div>
              <div>
                <h3 className="font-medium mb-2">2. File Encryption</h3>
                <p>
                  Use your key to encrypt important files like wallet backups and recovery
                  information.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-2">3. Secure Storage</h3>
                <p>
                  Store encrypted files safely and share the public key with trusted family members.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupPage;
