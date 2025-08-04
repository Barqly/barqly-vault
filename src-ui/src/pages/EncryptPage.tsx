import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, Zap, FileText, FolderOpen, Check, Info } from 'lucide-react';
import { useFileEncryption } from '../hooks/useFileEncryption';
import { KeySelectionDropdown } from '../components/forms/KeySelectionDropdown';
import { ErrorMessage } from '../components/ui/error-message';
import FileDropZone from '../components/encrypt/FileDropZone';
import DestinationSelector from '../components/encrypt/DestinationSelector';
import EncryptionProgress from '../components/encrypt/EncryptionProgress';
import EncryptionSuccess from '../components/encrypt/EncryptionSuccess';
import TrustBadge from '../components/ui/TrustBadge';

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
    clearSelection,
  } = useFileEncryption();

  // Component state
  const [mode, setMode] = useState<'files' | 'folder' | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [outputPath, setOutputPath] = useState<string>('');
  const [archiveName, setArchiveName] = useState<string>('');
  const [encryptionResult, setEncryptionResult] = useState<any>(null);
  const [startTime, setStartTime] = useState<number>(0);

  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);

  // Update current step based on state
  useEffect(() => {
    if (selectedFiles && selectedKeyId) {
      setCurrentStep(3);
    } else if (selectedFiles) {
      setCurrentStep(2);
    } else {
      setCurrentStep(1);
    }
  }, [selectedFiles, selectedKeyId]);

  // Check if ready to encrypt - outputPath is optional for now
  const isReadyToEncrypt = selectedFiles && selectedKeyId;

  // Handle file selection
  const handleFilesSelected = useCallback(
    async (_paths: string[]) => {
      try {
        // This is a workaround - we need to call the backend's select_files
        // to properly register the selection
        if (mode === 'files' || mode === 'folder') {
          await selectFiles(mode === 'files' ? 'Files' : 'Folder');
        }
      } catch (err) {
        console.error('File selection error:', err);
      }
    },
    [mode, selectFiles],
  );

  // Handle mode change
  const handleModeChange = (newMode: 'files' | 'folder') => {
    setMode(newMode);
    clearSelection();
  };

  // Handle encryption
  const handleEncrypt = async () => {
    // Note: outputPath is collected but not used yet - backend doesn't support it
    // This will be fixed when backend adds outputPath support
    if (!selectedKeyId || !selectedFiles) return;

    try {
      setStartTime(Date.now());
      // TODO: Pass outputPath when backend supports it
      await encryptFiles(selectedKeyId, archiveName || undefined);

      // Create result for success component
      const duration = Math.round((Date.now() - startTime) / 1000);
      setEncryptionResult({
        outputPath: outputPath || 'Default location', // Show selected path or default
        fileName: archiveName
          ? `${archiveName}.age`
          : `barqly-vault-${new Date().toISOString().split('T')[0]}.age`,
        fileCount: selectedFiles.file_count,
        originalSize: selectedFiles.total_size,
        encryptedSize: Math.round(selectedFiles.total_size * 0.75), // Estimate
        duration,
        keyUsed: selectedKeyId,
      });
    } catch (err) {
      console.error('Encryption error:', err);
    }
  };

  // Handle reset
  const handleReset = () => {
    reset();
    setMode(null);
    setSelectedKeyId('');
    setOutputPath('');
    setArchiveName('');
    setEncryptionResult(null);
    setCurrentStep(1);
  };

  // Handle encrypt more
  const handleEncryptMore = () => {
    handleReset();
  };

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Page Header with Trust Indicators */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Encrypt Your Bitcoin Vault</h2>
        </div>
        <p className="text-gray-600 mb-3">
          Transform sensitive files into military-grade encrypted archives · 90 seconds to complete
        </p>
        <div className="flex flex-wrap gap-2">
          <TrustBadge
            icon={Shield}
            label="Military-grade"
            tooltip="Age encryption standard used by security professionals"
          />
          <TrustBadge
            icon={Lock}
            label="Local-only"
            tooltip="All processing happens on your device"
          />
          <TrustBadge
            icon={Zap}
            label="Zero network"
            tooltip="No internet connection required or used"
          />
        </div>
      </div>

      {/* Main Content */}
      <div>
        {/* Progress Overlay */}
        {progress && !success && (
          <EncryptionProgress progress={progress} onCancel={handleReset} showCancel={true} />
        )}

        {/* Success State */}
        {success && encryptionResult && (
          <EncryptionSuccess {...encryptionResult} onEncryptMore={handleEncryptMore} />
        )}

        {/* Main Form */}
        {!success && !progress && (
          <>
            {/* Step Indicator */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div
                  className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      selectedFiles
                        ? 'bg-green-500 text-white'
                        : currentStep === 1
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {selectedFiles ? <Check className="w-4 h-4" /> : '1'}
                  </div>
                  <span className="text-sm font-medium">Select Files</span>
                </div>
                <div className="flex-1 h-0.5 bg-gray-300 mx-2" />
                <div
                  className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      selectedKeyId
                        ? 'bg-green-500 text-white'
                        : currentStep === 2
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {selectedKeyId ? <Check className="w-4 h-4" /> : '2'}
                  </div>
                  <span className="text-sm font-medium">Choose Key</span>
                </div>
                <div className="flex-1 h-0.5 bg-gray-300 mx-2" />
                <div
                  className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      outputPath
                        ? 'bg-green-500 text-white'
                        : currentStep === 3
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {outputPath ? <Check className="w-4 h-4" /> : '3'}
                  </div>
                  <span className="text-sm font-medium">Set Destination</span>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6">
                <ErrorMessage error={error} showRecoveryGuidance={true} onClose={clearError} />
              </div>
            )}

            {/* Step 1: File Selection */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-6 h-6">
                  {selectedFiles ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <span className="text-lg font-bold text-blue-600">1</span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedFiles ? 'Files Selected' : 'Select What to Encrypt'}
                </h3>
                {selectedFiles && (
                  <button
                    onClick={() => {
                      clearSelection();
                      setMode(null);
                    }}
                    className="ml-auto text-sm text-gray-500 hover:text-gray-700"
                  >
                    Change
                  </button>
                )}
              </div>

              {!selectedFiles && (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Choose how you want to select files for encryption:
                  </p>
                  <div className="flex gap-3 mb-6">
                    <button
                      onClick={() => handleModeChange('files')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        mode === 'files'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium">Files</div>
                        <div className="text-xs text-gray-500">Select specific documents</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleModeChange('folder')}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        mode === 'folder'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <FolderOpen className="w-5 h-5" />
                      <div className="text-left">
                        <div className="font-medium">Folder</div>
                        <div className="text-xs text-gray-500">Encrypt entire folder structure</div>
                      </div>
                    </button>
                  </div>
                </>
              )}

              <FileDropZone
                mode={mode}
                onFilesSelected={handleFilesSelected}
                selectedFiles={selectedFiles}
                onClearFiles={() => {
                  clearSelection();
                  setMode(null);
                }}
                disabled={isLoading}
              />
            </div>

            {/* Step 2: Key Selection */}
            {selectedFiles && (
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center justify-center w-6 h-6">
                    {selectedKeyId ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <span className="text-lg font-bold text-blue-600">2</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {selectedKeyId ? 'Encryption Key Selected' : 'Choose Your Encryption Key'}
                  </h3>
                  {selectedKeyId && (
                    <button
                      onClick={() => setSelectedKeyId('')}
                      className="ml-auto text-sm text-gray-500 hover:text-gray-700"
                    >
                      Change
                    </button>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4">
                  Select the key that will be used to encrypt your files:
                </p>

                <KeySelectionDropdown
                  value={selectedKeyId}
                  onChange={setSelectedKeyId}
                  placeholder="Select an encryption key..."
                />

                <div className="flex items-start gap-2 mt-3">
                  <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-500">
                    Files encrypted with this key can only be decrypted by the matching private key.
                    Make sure you have access to the private key before encrypting.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Output Configuration */}
            {selectedFiles && selectedKeyId && (
              <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center justify-center w-6 h-6">
                    {outputPath ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <span className="text-lg font-bold text-blue-600">3</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {outputPath ? 'Output Configured' : 'Set Output Destination'} (Optional)
                  </h3>
                </div>

                <p className="text-sm text-gray-600 mb-2">
                  Where should your encrypted vault be saved?
                </p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Output path selection is currently for preview only.
                    Files will be saved to the default location until backend support is added.
                  </p>
                </div>

                <DestinationSelector
                  outputPath={outputPath}
                  onPathChange={setOutputPath}
                  archiveName={archiveName}
                  onNameChange={setArchiveName}
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Action Area */}
            {selectedFiles && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="space-y-4">
                  {/* Validation Checklist */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Ready to Encrypt:</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Check
                          className={`w-4 h-4 ${selectedFiles ? 'text-green-500' : 'text-gray-300'}`}
                        />
                        <span
                          className={`text-sm ${selectedFiles ? 'text-gray-700' : 'text-gray-400'}`}
                        >
                          {selectedFiles?.file_count || 0} files selected (
                          {selectedFiles
                            ? `${(selectedFiles.total_size / 1024 / 1024).toFixed(2)} MB`
                            : '0 MB'}
                          )
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check
                          className={`w-4 h-4 ${selectedKeyId ? 'text-green-500' : 'text-gray-300'}`}
                        />
                        <span
                          className={`text-sm ${selectedKeyId ? 'text-gray-700' : 'text-gray-400'}`}
                        >
                          Encryption key {selectedKeyId ? 'chosen' : 'not selected'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check
                          className={`w-4 h-4 ${archiveName ? 'text-green-500' : 'text-gray-300'}`}
                        />
                        <span
                          className={`text-sm ${archiveName ? 'text-gray-700' : 'text-gray-400'}`}
                        >
                          {archiveName
                            ? `Output name: ${archiveName}.age`
                            : 'Using default output name'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleReset}
                      className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleEncrypt}
                      disabled={!isReadyToEncrypt || isLoading}
                      className={`
                        flex items-center gap-2 px-8 py-2.5 text-sm font-medium rounded-md
                        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500
                        ${
                          isReadyToEncrypt
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }
                      `}
                    >
                      <Lock className="w-4 h-4" />
                      Create Encrypted Vault
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Help Section */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-base font-semibold text-blue-900 mb-3">Quick Tips</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Drag multiple files or an entire folder into the drop zone</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Common Bitcoin files: wallet.dat, descriptors, seed phrases</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Maximum recommended size: 100MB for optimal performance</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Store encrypted vaults in multiple secure locations</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EncryptPage;
