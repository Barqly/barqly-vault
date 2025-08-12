import React from 'react';
import { ChevronLeft } from 'lucide-react';
import FileDropZone from '../common/FileDropZone';
import { KeySelectionDropdown } from '../forms/KeySelectionDropdown';
import PassphraseInput from '../forms/PassphraseInput';
import PassphraseMemoryHints from './PassphraseMemoryHints';

interface ProgressiveDecryptionCardsProps {
  currentStep: number;
  selectedFile: string | null;
  selectedKeyId: string | null;
  passphrase: string;
  passphraseAttempts: number;
  vaultMetadata: {
    creationDate?: string;
    keyLabel?: string;
  };
  isLoading: boolean;
  onFileSelected: (paths: string[]) => void;
  onClearFiles: () => void;
  onFileError: (error: Error) => void;
  onKeyChange: (keyId: string) => void;
  onPassphraseChange: (passphrase: string) => void;
  onNeedHelp: () => void;
  onStepChange: (step: number) => void;
}

/**
 * Progressive card system for decryption workflow
 * Shows only the active step's content, eliminating redundant boxes
 */
const ProgressiveDecryptionCards: React.FC<ProgressiveDecryptionCardsProps> = ({
  currentStep,
  selectedFile,
  selectedKeyId,
  passphrase,
  passphraseAttempts,
  vaultMetadata,
  isLoading,
  onFileSelected,
  onClearFiles,
  onFileError,
  onKeyChange,
  onPassphraseChange,
  onNeedHelp,
  onStepChange,
}) => {
  const canGoToPreviousStep = currentStep > 1;

  // Define continue conditions for each step
  const canContinue = (() => {
    switch (currentStep) {
      case 1:
        return !!selectedFile; // Can continue from step 1 if file is selected
      case 2:
        return !!(selectedKeyId && passphrase.trim().length > 0); // Can continue from step 2 if key and passphrase are provided
      default:
        return false;
    }
  })();

  const handlePrevious = () => {
    if (canGoToPreviousStep) {
      onStepChange(currentStep - 1);
    }
  };

  const handleContinue = () => {
    if (canContinue) {
      onStepChange(currentStep + 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <FileDropZone
              onFilesSelected={onFileSelected}
              selectedFiles={
                selectedFile
                  ? {
                      paths: [selectedFile],
                      file_count: 1,
                      total_size: 0,
                    }
                  : null
              }
              onClearFiles={onClearFiles}
              onError={onFileError}
              disabled={isLoading}
              mode="single"
              acceptedFormats={['.age']}
              dropText="Drop your encrypted vault here"
              browseButtonText="Select Vault File"
              icon="decrypt"
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <KeySelectionDropdown
                value={selectedKeyId || ''}
                onChange={onKeyChange}
                placeholder="Choose the key used for encryption"
              />
            </div>

            {selectedKeyId && (
              <>
                <div>
                  <PassphraseInput
                    value={passphrase}
                    onChange={onPassphraseChange}
                    placeholder="Enter your key passphrase"
                    showStrength={false}
                  />
                </div>

                <PassphraseMemoryHints
                  vaultPath={selectedFile || undefined}
                  creationDate={vaultMetadata.creationDate}
                  keyLabel={vaultMetadata.keyLabel}
                  attemptCount={passphraseAttempts}
                  onNeedHelp={onNeedHelp}
                />
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Don't render if we're beyond step 2 (step 3 is handled by DecryptionReadyPanel)
  if (currentStep > 2) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Card Content */}
      <div className="p-6">
        <div className="min-h-[200px] max-h-[350px] mb-6">{renderStepContent()}</div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {canGoToPreviousStep && (
            <button
              onClick={handlePrevious}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
              disabled={isLoading}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
          )}

          {(currentStep === 1 || currentStep === 2) && (
            <button
              onClick={handleContinue}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                canContinue
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              } ${!canGoToPreviousStep ? 'ml-auto' : ''}`}
              disabled={isLoading || !canContinue}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressiveDecryptionCards;
