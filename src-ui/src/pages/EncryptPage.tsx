import React, { useState, useEffect } from 'react';
import { useFileEncryption } from '../hooks/useFileEncryption';
import { KeySelectionDropdown } from '../components/forms/KeySelectionDropdown';
import { ProgressBar } from '../components/ui/progress-bar';
import { ErrorMessage } from '../components/ui/error-message';
import { SuccessMessage } from '../components/ui/success-message';
import { LoadingSpinner } from '../components/ui/loading-spinner';

const EncryptPage: React.FC = () => {
  const {
    selectFiles,
    encryptFiles,
    isLoading,
    error,
    success,
    progress,
    selectedFiles,
    reset,
    clearError,
  } = useFileEncryption();

  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [outputPath, setOutputPath] = useState<string>('');
  const [archiveName, setArchiveName] = useState<string>('');

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  const handleFileSelection = async (mode: 'Files' | 'Folder') => {
    try {
      await selectFiles(mode);
    } catch (err) {
      // Error is already handled by the hook
      console.error('File selection error:', err);
    }
  };

  const handleEncryption = async () => {
    if (!selectedKeyId || !outputPath) {
      // Show error for missing required fields
      return;
    }

    try {
      await encryptFiles(selectedKeyId, outputPath, archiveName || undefined);
    } catch (err) {
      // Error is already handled by the hook
      console.error('Encryption error:', err);
    }
  };

  const handleReset = () => {
    reset();
    setSelectedKeyId('');
    setOutputPath('');
    setArchiveName('');
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Encrypt Files</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select files or folders to encrypt with your chosen key for secure Bitcoin custody
            backup.
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
                title="Encryption Successful"
                message={`Files encrypted successfully! Saved to: ${success}`}
                onClose={handleReset}
                showCloseButton={true}
              />
            )}

            {/* Progress Display */}
            {progress && (
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Encryption Progress</h3>
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
                    1. Select Files to Encrypt
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleFileSelection('Files')}
                        disabled={isLoading || !!selectedFiles}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Choose Files
                      </button>
                      <span className="text-sm text-gray-600">
                        Select one or more files to encrypt
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleFileSelection('Folder')}
                        disabled={isLoading || !!selectedFiles}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Choose Folder
                      </button>
                      <span className="text-sm text-gray-600">
                        Select a folder to encrypt all its contents
                      </span>
                    </div>
                  </div>

                  {/* Selected Files Display */}
                  {selectedFiles && (
                    <div className="mt-4 bg-gray-50 rounded p-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Selected ({selectedFiles.file_count} files,{' '}
                        {(selectedFiles.total_size / 1024 / 1024).toFixed(2)} MB):
                      </p>
                      <ul className="text-sm text-gray-600 font-mono space-y-1 max-h-32 overflow-y-auto">
                        {selectedFiles.paths.map((path: string, index: number) => (
                          <li key={index} className="break-all">
                            {path}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Key Selection */}
                {selectedFiles && (
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                      2. Select Encryption Key
                    </h2>
                    <KeySelectionDropdown
                      value={selectedKeyId}
                      onChange={setSelectedKeyId}
                      placeholder="Choose a key for encryption"
                    />
                  </div>
                )}

                {/* Output Options */}
                {selectedFiles && selectedKeyId && (
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">3. Output Options</h2>
                    <div className="space-y-4">
                      <div>
                        <label
                          htmlFor="output-path"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Output Directory <span className="text-red-500">*</span>
                        </label>
                        <input
                          id="output-path"
                          type="text"
                          value={outputPath}
                          onChange={(e) => setOutputPath(e.target.value)}
                          placeholder="Enter output directory path"
                          className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="archive-name"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Archive Name (Optional)
                        </label>
                        <input
                          id="archive-name"
                          type="text"
                          value={archiveName}
                          onChange={(e) => setArchiveName(e.target.value)}
                          placeholder="Leave empty for auto-generated name"
                          className="w-full px-3 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          The encrypted file will have a .age extension
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedFiles && (
                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-400 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleEncryption}
                      disabled={!selectedKeyId || !outputPath || isLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <LoadingSpinner size="sm" />
                          Encrypting...
                        </span>
                      ) : (
                        'Encrypt Files'
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
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">Encryption Tips</h2>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                • <strong>File Selection:</strong> Choose either individual files or a complete
                folder
              </p>
              <p>
                • <strong>Key Selection:</strong> Make sure you have the public key of the recipient
              </p>
              <p>
                • <strong>Output Directory:</strong> Specify where the encrypted archive should be
                saved
              </p>
              <p>
                • <strong>Security:</strong> Files are encrypted using the age encryption standard
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EncryptPage;
