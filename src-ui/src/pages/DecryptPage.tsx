import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, Clock, CheckCircle, Unlock } from 'lucide-react';
import { useFileDecryption } from '../hooks/useFileDecryption';
import { KeySelectionDropdown } from '../components/forms/KeySelectionDropdown';
import PassphraseInput from '../components/forms/PassphraseInput';
import { ErrorMessage } from '../components/ui/error-message';
import FileDropZone from '../components/common/FileDropZone';
import DestinationSelector from '../components/decrypt/DestinationSelector';
import DecryptProgress from '../components/decrypt/DecryptProgress';
import DecryptSuccess from '../components/decrypt/DecryptSuccess';
import PassphraseMemoryHints from '../components/decrypt/PassphraseMemoryHints';
import TrustBadge from '../components/ui/TrustBadge';
import PrimaryButton from '../components/ui/PrimaryButton';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import FormSection from '../components/forms/FormSection';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ui/ToastContainer';

const DecryptPage: React.FC = () => {
  const {
    setSelectedFile,
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
    clearSelection,
  } = useFileDecryption();

  // Toast notifications
  const { toasts, showError, showSuccess, showInfo, removeToast } = useToast();

  // Component state
  const [passphraseAttempts, setPassphraseAttempts] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [vaultMetadata, setVaultMetadata] = useState<{
    creationDate?: string;
    keyLabel?: string;
  }>({});

  // Update current step based on state
  useEffect(() => {
    let newStep = 1;
    if (selectedFile) {
      newStep = 2;
      if (selectedKeyId) {
        newStep = 3;
        if (passphrase && outputPath) {
          newStep = 4;
        }
      }
    }
    setCurrentStep(newStep);
  }, [selectedFile, selectedKeyId, passphrase, outputPath]);

  // Handle file selection through FileDropZone
  const handleFileSelected = useCallback(
    async (paths: string[]) => {
      console.log('[DecryptPage] File selected:', paths);

      // For decryption, we only accept single .age files
      if (paths.length !== 1) {
        showError('Invalid selection', 'Please select only one encrypted .age file');
        return;
      }

      const filePath = paths[0];
      if (!filePath.toLowerCase().endsWith('.age')) {
        showError('Invalid file format', 'Please select a .age encrypted file');
        return;
      }

      try {
        // Set the selected file directly since FileDropZone gives us the path
        setSelectedFile(filePath);

        // Extract metadata from filename (if available)
        const fileName = filePath.split('/').pop() || '';
        const match = fileName.match(/(\d{4}-\d{2}-\d{2})/);
        if (match) {
          setVaultMetadata((prev) => ({
            ...prev,
            creationDate: match[1],
          }));
        }

        showSuccess('File selected', 'Encrypted vault file ready for decryption');
      } catch (error) {
        console.error('[DecryptPage] File selection error:', error);
        showError(
          'File selection failed',
          error instanceof Error ? error.message : 'Please try again',
        );
      }
    },
    [setSelectedFile, showError, showSuccess],
  );

  // Handle decryption with error handling
  const handleDecryption = useCallback(async () => {
    if (!selectedKeyId || !passphrase || !outputPath) {
      showError('Missing information', 'Please complete all required fields');
      return;
    }

    setIsDecrypting(true);
    try {
      await decryptFile();
      showSuccess('Decryption successful', 'Your files have been recovered');
    } catch (err) {
      console.error('[DecryptPage] Decryption error:', err);

      // Track passphrase attempts for wrong passphrase errors
      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof (err as any).message === 'string' &&
        (err as any).message.toLowerCase().includes('passphrase')
      ) {
        setPassphraseAttempts((prev) => prev + 1);
      }

      // Error is already displayed by the hook
    } finally {
      setIsDecrypting(false);
    }
  }, [selectedKeyId, passphrase, outputPath, decryptFile, showError, showSuccess]);

  // Handle reset
  const handleReset = useCallback(() => {
    reset();
    setPassphraseAttempts(0);
    setCurrentStep(1);
    setIsDecrypting(false);
    setVaultMetadata({});
  }, [reset]);

  // Handle decrypt another
  const handleDecryptAnother = useCallback(() => {
    handleReset();
    showInfo('Ready for new decryption', 'Select another vault file to decrypt');
  }, [handleReset, showInfo]);

  // Generate default output path
  const getDefaultOutputPath = () => {
    const date = new Date().toISOString().split('T')[0];
    return `~/Desktop/Barqly-Recovery-${date}/`;
  };

  // Set default output path when file is selected
  useEffect(() => {
    if (selectedFile && !outputPath) {
      setOutputPath(getDefaultOutputPath());
    }
  }, [selectedFile, outputPath, setOutputPath]);

  // Calculate progress percentage for step indicator
  const getStepProgress = () => {
    const totalSteps = 4;
    return ((currentStep - 1) / (totalSteps - 1)) * 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header with trust indicators */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Unlock className="w-6 h-6 text-blue-600" />
                Decrypt Your Vault
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Recover your encrypted Bitcoin custody files
              </p>
            </div>
            <div className="flex items-center gap-4">
              <TrustBadge
                icon={Shield}
                label="Military-grade"
                tooltip="Military-grade decryption"
              />
              <TrustBadge icon={Lock} label="Local-only" tooltip="Local-only recovery" />
              <TrustBadge icon={Clock} label="Under 60s" tooltip="Typical decryption time" />
            </div>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span className={currentStep >= 1 ? 'text-blue-600 font-medium' : ''}>
              {currentStep > 1 ? <CheckCircle className="inline w-3 h-3 mr-1" /> : null}
              Step 1: Select Vault
            </span>
            <span className={currentStep >= 2 ? 'text-blue-600 font-medium' : ''}>
              {currentStep > 2 ? <CheckCircle className="inline w-3 h-3 mr-1" /> : null}
              Step 2: Enter Passphrase
            </span>
            <span className={currentStep >= 3 ? 'text-blue-600 font-medium' : ''}>
              {currentStep > 3 ? <CheckCircle className="inline w-3 h-3 mr-1" /> : null}
              Step 3: Choose Destination
            </span>
            <span className={currentStep >= 4 ? 'text-blue-600 font-medium' : ''}>
              Ready to Decrypt
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${getStepProgress()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Error display */}
          {error && !isDecrypting && (
            <ErrorMessage error={error} showRecoveryGuidance={true} onClose={clearError} />
          )}

          {/* Success display */}
          {success && (
            <DecryptSuccess
              result={success}
              onDecryptAnother={handleDecryptAnother}
              onClose={handleReset}
            />
          )}

          {/* Progress display */}
          {progress && isDecrypting && (
            <DecryptProgress
              progress={progress}
              onCancel={progress.progress < 90 ? handleReset : undefined}
            />
          )}

          {/* Main form - hidden during success/progress */}
          {!success && !isDecrypting && (
            <>
              {/* Step 1: File Selection */}
              <FormSection
                title="Select Your Encrypted Vault"
                subtitle="Choose the .age file you want to decrypt"
              >
                <FileDropZone
                  onFilesSelected={handleFileSelected}
                  selectedFiles={
                    selectedFile
                      ? {
                          paths: [selectedFile],
                          file_count: 1,
                          total_size: 0, // Would need actual size from backend
                        }
                      : null
                  }
                  onClearFiles={clearSelection}
                  onError={(error) => showError('File selection error', error.message)}
                  disabled={isLoading}
                  mode="single"
                  acceptedFormats={['.age']}
                  dropText="Drop your encrypted vault here"
                  browseButtonText="Select Vault File"
                  icon="decrypt"
                />
              </FormSection>

              {/* Step 2: Passphrase Entry */}
              {selectedFile && (
                <FormSection
                  title="Enter Your Vault Passphrase"
                  subtitle="The passphrase you used when creating this vault"
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Key Selection
                      </label>
                      <KeySelectionDropdown
                        value={selectedKeyId || ''}
                        onChange={(keyId) => {
                          setKeyId(keyId);
                          // Update metadata if key label is available
                          setVaultMetadata((prev) => ({
                            ...prev,
                            keyLabel: keyId, // In real app, would get label from key
                          }));
                        }}
                        placeholder="Choose the key used for encryption"
                      />
                    </div>

                    {selectedKeyId && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Passphrase
                          </label>
                          <PassphraseInput
                            value={passphrase}
                            onChange={setPassphrase}
                            placeholder="Enter your key passphrase"
                            showStrength={false}
                          />
                        </div>

                        <PassphraseMemoryHints
                          vaultPath={selectedFile}
                          creationDate={vaultMetadata.creationDate}
                          keyLabel={vaultMetadata.keyLabel}
                          attemptCount={passphraseAttempts}
                          onNeedHelp={() => {
                            showInfo(
                              'Passphrase Recovery',
                              'Check your password manager, backup notes, or contact support for assistance',
                            );
                          }}
                        />
                      </>
                    )}
                  </div>
                </FormSection>
              )}

              {/* Step 3: Destination Selection */}
              {selectedFile && selectedKeyId && passphrase && (
                <FormSection
                  title="Choose Recovery Location"
                  subtitle="Where to save your decrypted files"
                >
                  <DestinationSelector
                    outputPath={outputPath}
                    onPathChange={setOutputPath}
                    disabled={isLoading}
                    requiredSpace={1800000} // Would get actual size from backend
                  />
                </FormSection>
              )}

              {/* Action area */}
              {selectedFile && selectedKeyId && passphrase && outputPath && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Ready to Decrypt Your Vault
                  </h3>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Valid vault file selected</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Passphrase entered</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Destination folder selected</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                    >
                      Clear Form
                    </button>
                    <PrimaryButton
                      onClick={handleDecryption}
                      disabled={isLoading}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700"
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Begin Decryption
                    </PrimaryButton>
                  </div>
                </div>
              )}

              {/* Help section */}
              <CollapsibleHelp triggerText="Decryption Tips" detailed={false} />
            </>
          )}
        </div>
      </div>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

export default DecryptPage;
