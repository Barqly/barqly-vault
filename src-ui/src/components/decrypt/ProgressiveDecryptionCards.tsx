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

  const handlePrevious = () => {
    if (canGoToPreviousStep) {
      onStepChange(currentStep - 1);
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
      {/* Card Header with Navigation */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {canGoToPreviousStep && (
            <button
              onClick={handlePrevious}
              className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              disabled={isLoading}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        <div className="min-h-[200px] max-h-[400px]">{renderStepContent()}</div>
      </div>
    </div>
  );
};

export default ProgressiveDecryptionCards;
