import React, { useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import FileDropZone from '../common/FileDropZone';
import { KeySelectionDropdown } from '../forms/KeySelectionDropdown';

interface ProgressiveEncryptionCardsProps {
  currentStep: number;
  selectedFiles: { paths: string[]; file_count: number; total_size: number } | null;
  selectedKeyId: string | null;
  isLoading: boolean;
  onFilesSelected: (paths: string[], selectionType: 'Files' | 'Folder') => void;
  onClearFiles: () => void;
  onFileError: (error: Error) => void;
  onKeyChange: (keyId: string) => void;
  onStepChange: (step: number) => void;
}

/**
 * Progressive card system for encryption workflow
 * Shows only the active step's content, eliminating redundant boxes
 * Mirrors ProgressiveDecryptionCards architecture
 */
const ProgressiveEncryptionCards: React.FC<ProgressiveEncryptionCardsProps> = ({
  currentStep,
  selectedFiles,
  selectedKeyId,
  isLoading,
  onFilesSelected,
  onClearFiles,
  onFileError,
  onKeyChange,
  onStepChange,
}) => {
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const canGoToPreviousStep = currentStep > 1;

  // Define continue conditions for each step
  const canContinue = (() => {
    switch (currentStep) {
      case 1:
        return !!selectedFiles; // Can continue from step 1 if files are selected
      case 2:
        return !!selectedKeyId; // Can continue from step 2 if key is selected
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

  const handleKeySelected = () => {
    // Focus the Continue button after key selection
    setTimeout(() => {
      continueButtonRef.current?.focus();
    }, 100);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <FileDropZone
              onFilesSelected={onFilesSelected}
              selectedFiles={selectedFiles}
              onClearFiles={onClearFiles}
              onError={onFileError}
              disabled={isLoading}
              mode="multiple"
              acceptedFormats={[]}
              dropText="Drop your files and folders here (saved as a Barqly Vault .age file)"
              subtitle="All selected files will be encrypted together into a single vault."
              browseButtonText="Select Files"
              browseFolderButtonText="Select Folder"
              icon="upload"
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
                placeholder="Choose the key for encryption"
                autoFocus={currentStep === 2}
                onKeySelected={handleKeySelected}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Don't render if we're beyond step 2 (step 3 is handled by EncryptionReadyPanel)
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
                canContinue
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              } ${!canGoToPreviousStep ? 'ml-auto' : ''}`}
              disabled={isLoading || !canContinue}
              tabIndex={canContinue ? 1 : -1}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressiveEncryptionCards;
