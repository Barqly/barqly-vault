import React, { useState, useEffect } from 'react';
import { useFileDecryption } from '../hooks/useFileDecryption';
import { KeySelectionDropdown } from '../components/forms/KeySelectionDropdown';
import PassphraseInput from '../components/forms/PassphraseInput';
import { ProgressBar } from '../components/ui/progress-bar';
import { ErrorMessage } from '../components/ui/error-message';
import { SuccessMessage } from '../components/ui/success-message';
import { LoadingSpinner } from '../components/ui/loading-spinner';

const DecryptPage: React.FC = () => {
  const {
    selectEncryptedFile,
    setKeyId,
    setPassphrase,
    setOutputPath,
    decryptFile,
    isLoading,
    error,
    success,
    progress,
    selectedFile,
    selectedKeyId,
    passphrase,
    outputPath,
    reset,
    clearError,
  } = useFileDecryption();

  const [showOutputDialog, setShowOutputDialog] = useState(false);

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const handleFileSelection = async () => {
    try {
      await selectEncryptedFile();
    } catch (err) {
      // Error is already handled by the hook
      console.error('File selection error:', err);
    }
  };

  const handleOutputSelection = () => {
    // For now, we'll use a simple input
    // In a real app, this would open a directory picker
    setShowOutputDialog(true);
  };

  const handleDecryption = async () => {
    if (!selectedKeyId || !passphrase || !outputPath) {
      // Show error for missing required fields
      return;
    }

    try {
      await decryptFile();
    } catch (err) {
      // Error is already handled by the hook
      console.error('Decryption error:', err);
    }
  };

  const handleReset = () => {
    reset();
    setShowOutputDialog(false);
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Decrypt Files</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select an encrypted file to decrypt with your passphrase for Bitcoin custody
            restoration.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="space-y-8">
            {/* Error Display */}
            {error && (
              <ErrorMessage error={error} showRecoveryGuidance={true} onClose={clearError} />
            )}

            {/* Success Display */}
            {success && (
              <SuccessMessage
                title="Decryption Successful"
                message={`Successfully decrypted ${success.total_files} files!`}
                showCloseButton={true}
                onClose={handleReset}
                details={
                  <div className="mt-2 text-sm">
                    <p>Total files extracted: {success.total_files}</p>
                    <p>Total size: {(success.total_size / 1024 / 1024).toFixed(2)} MB</p>
                    <p>Files extracted to: {outputPath}</p>
                  </div>
                }
                showDetails={true}
              />
            )}

            {/* Progress Display */}
            {progress && (
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Decryption Progress</h3>
                <ProgressBar
                  value={progress.progress}
                  statusMessage={progress.message}
                  showPercentage={true}
                  showStatus={true}
                />
              </div>
            )}

            {/* File Selection */}
            {!success && !isLoading && (
              <>
                <div className="border border-gray-200 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    1. Select Encrypted File
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleFileSelection}
                        disabled={isLoading || !!selectedFile}
                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Choose Encrypted File
                      </button>
                      <span className="text-sm text-gray-600">Select a .age file to decrypt</span>
                    </div>

                    {/* Selected File Display */}
                    {selectedFile && (
                      <div className="mt-4 bg-gray-50 rounded p-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Selected File:</p>
                        <p className="text-sm text-gray-600 font-mono break-all">{selectedFile}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Key Selection */}
                {selectedFile && (
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                      2. Select Decryption Key
                    </h2>
                    <KeySelectionDropdown
                      value={selectedKeyId || ''}
                      onChange={setKeyId}
                      placeholder="Choose the key used for encryption"
                    />
                  </div>
                )}

                {/* Passphrase Input */}
                {selectedFile && selectedKeyId && (
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                      3. Enter Passphrase
                    </h2>
                    <PassphraseInput
                      value={passphrase}
                      onChange={setPassphrase}
                      placeholder="Enter your key passphrase"
                      showStrength={false}
                    />
                  </div>
                )}

                {/* Output Directory Selection */}
                {selectedFile && selectedKeyId && passphrase && (
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                      4. Select Output Directory
                    </h2>
                    <div className="space-y-4">
                      {!outputPath && !showOutputDialog && (
                        <div className="flex items-center gap-4">
                          <button
                            onClick={handleOutputSelection}
                            disabled={isLoading}
                            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Choose Output Directory
                          </button>
                          <span className="text-sm text-gray-600">
                            Where to extract the decrypted files
                          </span>
                        </div>
                      )}

                      {/* Output Path Input (temporary solution) */}
                      {showOutputDialog && !outputPath && (
                        <div>
                          <label
                            htmlFor="output-path"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Output Directory Path
                          </label>
                          <input
                            id="output-path"
                            type="text"
                            placeholder="Enter output directory path"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.currentTarget.value) {
                                setOutputPath(e.currentTarget.value);
                                setShowOutputDialog(false);
                              }
                            }}
                          />
                          <p className="mt-1 text-xs text-gray-500">Press Enter to confirm</p>
                        </div>
                      )}

                      {/* Selected Directory Display */}
                      {outputPath && (
                        <div className="mt-4 bg-gray-50 rounded p-3">
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            Output Directory:
                          </p>
                          <p className="text-sm text-gray-600 font-mono break-all">{outputPath}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedFile && selectedKeyId && passphrase && outputPath && (
                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDecryption}
                      disabled={isLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <LoadingSpinner size="sm" />
                          Decrypting...
                        </span>
                      ) : (
                        'Decrypt Files'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Help Section */}
        {!success && (
          <div className="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-purple-900 mb-3">Decryption Tips</h2>
            <div className="text-sm text-purple-800 space-y-2">
              <p>
                • <strong>File Selection:</strong> Choose a .age encrypted file
              </p>
              <p>
                • <strong>Key Selection:</strong> Use the same key that was used for encryption
              </p>
              <p>
                • <strong>Passphrase:</strong> Enter the correct passphrase for your private key
              </p>
              <p>
                • <strong>Security:</strong> Files are decrypted locally using the age standard
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DecryptPage;
