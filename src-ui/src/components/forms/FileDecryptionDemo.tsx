import React, { useState } from 'react';
import { useFileDecryption } from '@/hooks/useFileDecryption';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ErrorMessage } from '@/components/ui/error-message';
import { SuccessMessage } from '@/components/ui/success-message';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FileText, Unlock, RefreshCw } from 'lucide-react';
import BackToDemos from '@/components/ui/back-to-demos';

const FileDecryptionDemo: React.FC = () => {
  const [keyId, setKeyId] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [outputPath, setOutputPath] = useState('');

  const {
    selectEncryptedFile,
    setKeyId: setDecryptionKeyId,
    setPassphrase: setDecryptionPassphrase,
    setOutputPath: setDecryptionOutputPath,
    decryptFile,
    isLoading,
    error,
    success,
    progress,
    selectedFile,
    reset,
    clearError,
  } = useFileDecryption();

  const handleFileSelection = async () => {
    try {
      await selectEncryptedFile();
    } catch (_error) {
      // Error is handled by the hook
    }
  };

  const handleDecryption = async () => {
    try {
      setDecryptionKeyId(keyId);
      setDecryptionPassphrase(passphrase);
      setDecryptionOutputPath(outputPath);
      await decryptFile();
    } catch (_error) {
      // Error is handled by the hook
    }
  };

  const handleReset = () => {
    setKeyId('');
    setPassphrase('');
    setOutputPath('');
    reset();
  };

  const mockKeys = [
    { id: 'key-1', label: 'Personal Backup Key' },
    { id: 'key-2', label: 'Work Documents Key' },
    { id: 'key-3', label: 'Family Photos Key' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <BackToDemos />

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">File Decryption Hook Demo</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Interactive demonstration of the useFileDecryption hook showing encrypted file selection,
          decryption workflow, progress tracking, and error handling.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Demo Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Unlock className="w-5 h-5" />
              File Decryption Demo
            </h3>
            <p className="text-gray-600 text-sm">
              Test the file decryption workflow with file selection, key configuration, and progress
              tracking
            </p>
          </div>
          <div className="space-y-6">
            {/* File Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Encrypted File Selection
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleFileSelection}
                  disabled={isLoading}
                  className="w-full"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Select Encrypted File (.age)
                </Button>
              </div>

              {/* Selected File Display */}
              {selectedFile && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Selected File</span>
                  </div>
                  <div className="text-sm text-gray-600 font-mono break-all">{selectedFile}</div>
                </div>
              )}
            </div>

            {/* Decryption Configuration */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Decryption Key
                </label>
                <select
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a key</option>
                  {mockKeys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passphrase</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter the key passphrase"
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Output Directory
                </label>
                <input
                  type="text"
                  value={outputPath}
                  onChange={(e) => setOutputPath(e.target.value)}
                  placeholder="/path/to/output/directory"
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleDecryption}
                disabled={isLoading || !selectedFile || !keyId || !passphrase || !outputPath}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Decrypting...
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    Decrypt File
                  </>
                )}
              </Button>

              <Button type="button" variant="outline" onClick={handleReset} disabled={isLoading}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress */}
            {progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(progress.progress * 100)}%</span>
                </div>
                <ProgressBar value={progress.progress} />
                <p className="text-sm text-gray-600">{progress.message}</p>
              </div>
            )}

            {/* Error Display */}
            {error && <ErrorMessage error={error} onClose={clearError} showCloseButton />}

            {/* Success Display */}
            {success && (
              <SuccessMessage
                title="Files Decrypted Successfully!"
                message={`Files extracted to: ${success.output_dir}`}
                showCloseButton
                actions={[
                  {
                    label: 'Open Folder',
                    action: () => console.log('Open output folder'),
                    variant: 'primary',
                  },
                ]}
              />
            )}
          </div>
        </div>

        {/* Documentation Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Hook Features</h3>
            <p className="text-gray-600 text-sm">Key capabilities of the useFileDecryption hook</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium">File Selection</h4>
                  <p className="text-sm text-gray-600">
                    Select encrypted .age files with validation and error handling
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium">Key Configuration</h4>
                  <p className="text-sm text-gray-600">
                    Key selection, passphrase input, and output directory configuration
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium">Progress Tracking</h4>
                  <p className="text-sm text-gray-600">
                    Real-time progress updates during decryption process
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium">Error Handling</h4>
                  <p className="text-sm text-gray-600">
                    Comprehensive error handling with recovery guidance
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Test Scenarios</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span>Select encrypted file to see file validation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span>Try decryption without required fields to see validation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span>Use wrong passphrase to see error handling</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span>Start decryption to see progress and success states</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">State Management</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  • <strong>selectedFile</strong>: Currently selected encrypted file
                </div>
                <div>
                  • <strong>isLoading</strong>: Operation in progress
                </div>
                <div>
                  • <strong>progress</strong>: Real-time progress updates
                </div>
                <div>
                  • <strong>error</strong>: Error state with details
                </div>
                <div>
                  • <strong>success</strong>: Success state with results
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileDecryptionDemo;
