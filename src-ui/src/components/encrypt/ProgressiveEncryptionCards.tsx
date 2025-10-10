import React, { useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import FileDropZone from '../common/FileDropZone';
import RecoveryInfoPanel from './RecoveryInfoPanel';
import EncryptionSummary from './EncryptionSummary';
import { useVault } from '../../contexts/VaultContext';

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
  outputPath?: string;
  archiveName?: string;
  bundleContents?: {
    userFiles: { count: number; totalSize: number };
    manifest: boolean;
    passphraseKeys: number;
    recoveryGuide: boolean;
    totalSize: number;
  } | null;
}

/**
 * Progressive card system for encryption workflow
 * Shows only the active step's content, eliminating redundant boxes
 * Mirrors ProgressiveDecryptionCards architecture
 */
const ProgressiveEncryptionCards: React.FC<ProgressiveEncryptionCardsProps> = ({
  currentStep,
  selectedFiles,
  selectedKeyId: _selectedKeyId,
  isLoading,
  onFilesSelected,
  onClearFiles,
  onFileError,
  onKeyChange: _onKeyChange,
  onStepChange,
  outputPath,
  archiveName,
  bundleContents,
}) => {
  const { currentVault, getCurrentVaultKeys } = useVault();
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const canGoToPreviousStep = currentStep > 1;

  // Define continue conditions for each step
  const canContinue = (() => {
    switch (currentStep) {
      case 1:
        return !!selectedFiles; // Can continue from step 1 if files are selected
      case 2:
        return true; // Can always continue from step 2 (review is just informational)
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

  // Key selection is not used in multi-key encryption mode
  // Keeping interface for compatibility but not implementing

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
              subtitle="Files will be encrypted to all keys in your current vault."
              browseButtonText="Select Files"
              browseFolderButtonText="Select Folder"
              icon="upload"
              autoFocus={currentStep === 1}
            />
          </div>
        );

      case 2:
        // Step 2 shows recovery info and summary
        if (!selectedFiles || !currentVault || !bundleContents) {
          return null;
        }

        const keys = getCurrentVaultKeys();
        const fileName = archiveName ? `${archiveName}.age` : 'Auto-generated filename';

        return (
          <div className="space-y-4">
            {/* Encryption Summary */}
            <EncryptionSummary
              vaultName={currentVault.label}
              fileCount={selectedFiles.file_count}
              totalSize={selectedFiles.total_size}
              recipientCount={keys.length}
              outputFileName={fileName}
              outputPath={outputPath || '~/Documents/Barqly-Vaults'}
              hasRecoveryItems={true}
            />

            {/* Recovery Info Panel */}
            <RecoveryInfoPanel
              fileCount={selectedFiles.file_count}
              totalSize={selectedFiles.total_size}
              hasPassphraseKeys={bundleContents.passphraseKeys > 0}
              passphraseKeyCount={bundleContents.passphraseKeys}
              vaultName={currentVault.label}
            />
          </div>
        );

      default:
        return null;
    }
  };

  // Don't render if we're at step 3 or beyond (step 3 is handled by EncryptionReadyPanel)
  if (currentStep >= 3) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      {/* Card Content */}
      <div className="p-6">
        <div className={`${currentStep === 2 ? 'min-h-[400px]' : 'min-h-[200px] max-h-[350px]'} mb-6`}>{renderStepContent()}</div>

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
