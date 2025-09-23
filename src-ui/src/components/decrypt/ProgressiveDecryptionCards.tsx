import React, { useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import FileDropZone from '../common/FileDropZone';
import { KeySelectionDropdown } from '../forms/KeySelectionDropdown';
import PassphraseInput from '../forms/PassphraseInput';

interface ProgressiveDecryptionCardsProps {
  currentStep: number;
  selectedFile: string | null;
  selectedKeyId: string | null;
  passphrase: string;
  isLoading: boolean;
  onFileSelected: (paths: string[]) => void;
  onClearFiles: () => void;
  onFileError: (error: Error) => void;
  onKeyChange: (keyId: string) => void;
  onPassphraseChange: (passphrase: string) => void;
  onPassphraseError: (error: { code: string; message: string; user_actionable: boolean }) => void;
  onClearError: () => void;
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
  isLoading,
  onFileSelected,
  onClearFiles,
  onFileError,
  onKeyChange,
  onPassphraseChange,
  onPassphraseError,
  onClearError,
  onStepChange,
}) => {
  const canGoToPreviousStep = currentStep > 1;
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const [isValidatingPassphrase, setIsValidatingPassphrase] = useState(false);

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

  const handleContinue = async () => {
    if (canContinue) {
      // For step 2, validate the passphrase with the selected key before proceeding
      if (currentStep === 2 && selectedKeyId && passphrase && selectedFile) {
        setIsValidatingPassphrase(true);

        try {
          // Import the generated commands
          const { commands } = await import('../../bindings');

          // Use dedicated validation command for efficient passphrase verification
          const result = await commands.verifyKeyPassphrase({
            key_id: selectedKeyId,
            passphrase: passphrase,
          });

          if (result.status === 'error') {
            throw new Error(result.error.message || 'Passphrase verification failed');
          }

          const validationData = result.data;

          // Check if validation was successful
          if (!validationData.is_valid) {
            throw new Error(validationData.message);
          }

          // Clear any previous errors since validation succeeded
          onClearError();

          // If we get here, passphrase is correct, proceed to next step
          onStepChange(currentStep + 1);
        } catch (error: any) {
          // Clear the passphrase field so user can retype without manual clearing
          onPassphraseChange('');

          // For validation failures (wrong passphrase), keep focus on passphrase field
          const passphraseInput = document.querySelector(
            'input[placeholder="Enter your key passphrase"]',
          ) as HTMLInputElement;
          if (passphraseInput) {
            passphraseInput.focus();
          }

          // Pass error to parent for display
          onPassphraseError({
            code: 'WRONG_PASSPHRASE',
            message: error.message || 'Incorrect passphrase for the selected key',
            user_actionable: true,
          });
        } finally {
          setIsValidatingPassphrase(false);
        }
      } else {
        // For other steps or missing data, proceed normally
        onStepChange(currentStep + 1);
      }
    }
  };

  const handleKeySelected = () => {
    // Focus the Passphrase field after key selection
    setTimeout(() => {
      const passphraseInput = document.querySelector(
        'input[placeholder="Enter your key passphrase"]',
      ) as HTMLInputElement;
      if (passphraseInput) {
        passphraseInput.focus();
      }
    }, 100);
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
              dropText="Drop your encrypted vault here (Barqly Vault .age format)"
              subtitle="All files in this vault will be restored to their original folder structure in the chosen recovery location."
              browseButtonText="Select Vault"
              icon="decrypt"
              autoFocus={currentStep === 1}
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
                autoFocus={currentStep === 2}
                onKeySelected={handleKeySelected}
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
                    autoFocus={false}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canContinue) {
                        e.preventDefault();
                        handleContinue();
                      }
                    }}
                  />
                </div>
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
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      {/* Card Content */}
      <div className="p-6">
        <div className="min-h-[200px] max-h-[350px] mb-6">{renderStepContent()}</div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {canGoToPreviousStep && (
            <button
              onClick={handlePrevious}
              className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-1"
              disabled={isLoading}
              tabIndex={2}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
          )}

          {(currentStep === 1 || currentStep === 2) && (
            <button
              ref={continueButtonRef}
              onClick={handleContinue}
              className={`h-10 rounded-xl px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                canContinue && !isValidatingPassphrase
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              } ${!canGoToPreviousStep ? 'ml-auto' : ''}`}
              disabled={isLoading || !canContinue || isValidatingPassphrase}
              tabIndex={canContinue ? 1 : -1}
            >
              {isValidatingPassphrase ? 'Validating...' : 'Continue'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressiveDecryptionCards;
