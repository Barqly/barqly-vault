import React, { useState } from 'react';
import { useFileEncryption } from '@/hooks/useFileEncryption';
import { FileText, Folder, Lock, RefreshCw } from 'lucide-react';

const FileEncryptionDemo: React.FC = () => {
  const [keyId, setKeyId] = useState('');
  const [outputPath, setOutputPath] = useState('');
  const [compressionLevel, setCompressionLevel] = useState(6);

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
    clearSelection,
  } = useFileEncryption();

  const handleFileSelection = async (type: 'Files' | 'Folder') => {
    try {
      await selectFiles(type);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleEncryption = async () => {
    try {
      await encryptFiles({
        key_id: keyId,
        output_path: outputPath,
        compression_level: compressionLevel,
      });
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleReset = () => {
    setKeyId('');
    setOutputPath('');
    setCompressionLevel(6);
    reset();
  };

  const mockKeys = [
    { id: 'key-1', label: 'Personal Backup Key' },
    { id: 'key-2', label: 'Work Documents Key' },
    { id: 'key-3', label: 'Family Photos Key' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-4">
        <a href="/demo" className="text-blue-600 hover:text-blue-800">
          ← Back to Demos
        </a>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">File Encryption Hook Demo</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Interactive demonstration of the useFileEncryption hook showing file selection, encryption
          workflow, progress tracking, and error handling.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Demo Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Lock className="w-5 h-5" />
              File Encryption Demo
            </h3>
            <p className="text-gray-600 text-sm">
              Test the file encryption workflow with selection, configuration, and progress tracking
            </p>
          </div>
          <div className="space-y-6">
            {/* File Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File Selection
                </label>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => handleFileSelection('Files')}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4 mr-2 inline" />
                    Select Files
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFileSelection('Folder')}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Folder className="w-4 h-4 mr-2 inline" />
                    Select Folder
                  </button>
                </div>
              </div>

              {/* Selected Files Display */}
              {selectedFiles && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Selected Items</span>
                    <button
                      onClick={clearSelection}
                      disabled={isLoading}
                      className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600">
                      {selectedFiles.paths.length} items selected
                    </div>
                    <div className="text-xs text-gray-500 max-h-20 overflow-y-auto">
                      {selectedFiles.paths.slice(0, 3).map((path: string, index: number) => (
                        <div key={index} className="font-mono">
                          {path}
                        </div>
                      ))}
                      {selectedFiles.paths.length > 3 && (
                        <div className="text-gray-400">
                          ... and {selectedFiles.paths.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Encryption Configuration */}
            <div className="space-y-4">
              <div>
                <label htmlFor="keyId" className="block text-sm font-medium text-gray-700 mb-1">
                  Encryption Key
                </label>
                <select
                  id="keyId"
                  value={keyId}
                  onChange={(e) => setKeyId(e.target.value)}
                  disabled={isLoading}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label
                  htmlFor="outputPath"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Output Path
                </label>
                <input
                  id="outputPath"
                  type="text"
                  value={outputPath}
                  onChange={(e) => setOutputPath(e.target.value)}
                  placeholder="/path/to/output/encrypted.age"
                  disabled={isLoading}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="compressionLevel"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Compression Level
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="range"
                    id="compressionLevel"
                    min="0"
                    max="9"
                    value={compressionLevel}
                    onChange={(e) => setCompressionLevel(Number(e.target.value))}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-8">{compressionLevel}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  0 = no compression, 9 = maximum compression
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleEncryption}
                disabled={isLoading || !selectedFiles || !keyId || !outputPath}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    Encrypting...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2 inline" />
                    Encrypt Files
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Progress */}
            {progress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(progress.progress * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progress * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">{progress.message}</p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Error</h4>
                    <p className="text-sm text-red-700 mt-1">{error.message}</p>
                  </div>
                  <button onClick={clearError} className="text-red-400 hover:text-red-600">
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Success Display */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-medium text-green-800">
                      Files Encrypted Successfully!
                    </h4>
                    <p className="text-sm text-green-700 mt-1">
                      Encrypted file saved to: {success.encrypted_file_path}
                    </p>
                  </div>
                  <button
                    onClick={() => console.log('Download encrypted file')}
                    className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                  >
                    Download
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Documentation Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Hook Features</h3>
            <p className="text-sm text-gray-600">Key capabilities of the useFileEncryption hook</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium">File Selection</h4>
                  <p className="text-sm text-gray-600">
                    Support for both individual files and folder selection with validation
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium">Encryption Configuration</h4>
                  <p className="text-sm text-gray-600">
                    Key selection, output path configuration, and compression settings
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <h4 className="font-medium">Progress Tracking</h4>
                  <p className="text-sm text-gray-600">
                    Real-time progress updates during encryption process
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
                  <span>Select files/folder to see selection state</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span>Try encryption without required fields to see validation</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span>Adjust compression level to see configuration</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                  <span>Start encryption to see progress and success states</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">State Management</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  • <strong>selectedFiles</strong>: Current file selection
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

export default FileEncryptionDemo;
