import React, { useRef } from 'react';
import { ChevronLeft, Archive, Lock } from 'lucide-react';
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
  onVaultChange: (vaultId: string) => void;
  onEncrypt?: () => void; // New prop for encryption handler
  outputPath?: string;
  archiveName?: string;
  bundleContents?: {
    userFiles: { count: number; totalSize: number };
    manifest: boolean;
    passphraseKeys: number;
    recoveryGuide: boolean;
    totalSize: number;
  } | null;
  workflowVault?: { id: string; name: string } | null; // Pass workflow vault from parent
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
  onVaultChange,
  onEncrypt,
  outputPath,
  archiveName,
  bundleContents,
  workflowVault,
}) => {
  const { vaults, keyCache } = useVault();
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const vaultSelectorRef = useRef<HTMLSelectElement>(null);
  const canGoToPreviousStep = currentStep > 1;

  // Define continue conditions for each step
  const canContinue = (() => {
    switch (currentStep) {
      case 1:
        return !!selectedFiles; // Can continue from step 1 if files are selected
      case 2:
        return !!workflowVault; // Can continue from step 2 only if vault is selected
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
      // In step 2, trigger encryption instead of going to step 3
      if (currentStep === 2 && onEncrypt) {
        onEncrypt();
      } else {
        onStepChange(currentStep + 1);
      }
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

      case 2: {
        // Step 2: Select Vault & Review
        if (!selectedFiles) {
          return null;
        }

        // Get vaults with keys for dropdown
        const vaultsWithKeys = vaults.filter((v) => {
          const keys = keyCache.get(v.id) || [];
          return keys.length > 0;
        });

        return (
          <div className="space-y-6">
            {/* Vault Selection */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                Select vault for these files:
              </label>
              <div className="relative flex-1" style={{ maxWidth: '400px' }}>
                <Archive className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none z-10" />
                <select
                  ref={vaultSelectorRef}
                  className="w-full pl-11 pr-10 py-2.5 border border-slate-300 rounded-lg bg-white text-sm font-medium text-slate-700 hover:border-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
                  value={workflowVault?.id || ''}
                  onChange={(e) => {
                    onVaultChange(e.target.value);
                  }}
                  disabled={vaultsWithKeys.length === 0}
                  autoFocus={currentStep === 2}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '16px 16px',
                  }}
                >
                  <option value="" disabled>
                    {vaultsWithKeys.length === 0 ? 'No vaults available' : 'Choose vault...'}
                  </option>
                  {vaultsWithKeys.map((vault) => {
                    const keys = keyCache.get(vault.id) || [];
                    return (
                      <option key={vault.id} value={vault.id}>
                        {vault.name} ({keys.length} key{keys.length !== 1 ? 's' : ''})
                      </option>
                    );
                  })}
                </select>
                {vaultsWithKeys.length === 0 && (
                  <p className="text-sm text-orange-600 mt-2 absolute left-0">
                    ⚠️ No vaults with keys available. Please create a vault and add keys first.
                  </p>
                )}
              </div>
            </div>

            {/* Show summary only after vault is selected */}
            {workflowVault && bundleContents && (
              <>
                {/* Encryption Summary */}
                <EncryptionSummary
                  vaultName={workflowVault.name}
                  fileCount={selectedFiles.file_count}
                  totalSize={selectedFiles.total_size}
                  recipientCount={(keyCache.get(workflowVault.id) || []).length}
                  outputFileName={archiveName ? `${archiveName}.age` : 'Auto-generated filename'}
                  outputPath={outputPath || '~/Documents/Barqly-Vaults'}
                  hasRecoveryItems={true}
                />

                {/* Recovery Info Panel */}
                <RecoveryInfoPanel
                  fileCount={selectedFiles.file_count}
                  totalSize={selectedFiles.total_size}
                  hasPassphraseKeys={bundleContents.passphraseKeys > 0}
                  passphraseKeyCount={bundleContents.passphraseKeys}
                  vaultName={workflowVault.name}
                />
              </>
            )}
          </div>
        );
      }

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
        <div
          className={`${currentStep === 2 ? 'min-h-[400px]' : 'min-h-[200px] max-h-[350px]'} mb-6`}
        >
          {renderStepContent()}
        </div>

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
              className={`h-10 rounded-xl px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2 ${
                canContinue
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              } ${!canGoToPreviousStep ? 'ml-auto' : ''}`}
              disabled={isLoading || !canContinue}
              tabIndex={canContinue ? 1 : -1}
            >
              {currentStep === 2 && <Lock className="w-4 h-4" />}
              {currentStep === 2 ? 'Encrypt Now' : 'Continue'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressiveEncryptionCards;
