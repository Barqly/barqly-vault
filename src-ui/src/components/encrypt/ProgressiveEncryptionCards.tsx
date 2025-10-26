import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, Archive, Lock, ChevronDown, Check, AlertTriangle } from 'lucide-react';
import FileDropZone from '../common/FileDropZone';
import RecoveryInfoPanel from './RecoveryInfoPanel';
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
  outputPath: _outputPath,
  archiveName: _archiveName,
  bundleContents,
  workflowVault,
}) => {
  const { vaults, keyCache } = useVault();
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const canGoToPreviousStep = currentStep > 1;

  // Get vaults with keys for dropdown
  const vaultsWithKeys = vaults.filter((v) => {
    const keys = keyCache.get(v.id) || [];
    return keys.length > 0;
  });

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Handle keyboard navigation in dropdown
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const sortedVaults = vaultsWithKeys.slice().sort((a, b) => a.name.localeCompare(b.name));
      const maxIndex = sortedVaults.length - 1;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          // If nothing is focused yet, focus the first item
          if (focusedIndex === -1) {
            setFocusedIndex(0);
          } else {
            setFocusedIndex((prev) => (prev < maxIndex ? prev + 1 : 0));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          // If nothing is focused yet, focus the last item
          if (focusedIndex === -1) {
            setFocusedIndex(maxIndex);
          } else {
            setFocusedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex));
          }
          break;
        case 'Enter':
        case ' ':
          // Only select if an item is actually focused (not -1)
          if (focusedIndex >= 0 && focusedIndex <= maxIndex) {
            e.preventDefault();
            e.stopPropagation(); // Stop the event from bubbling
            const selectedVault = sortedVaults[focusedIndex];
            onVaultChange(selectedVault.id);
            setIsDropdownOpen(false);
            setFocusedIndex(-1);
            // Focus the Encrypt Now button after selection
            setTimeout(() => {
              continueButtonRef.current?.focus();
            }, 50);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsDropdownOpen(false);
          setFocusedIndex(-1);
          dropdownButtonRef.current?.focus();
          break;
        case 'Tab':
          // Close dropdown on tab
          setIsDropdownOpen(false);
          setFocusedIndex(-1);
          break;
      }
    };

    // Use capture phase to intercept events before they bubble
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isDropdownOpen, focusedIndex, vaultsWithKeys, onVaultChange]);

  const handlePrevious = () => {
    if (canGoToPreviousStep) {
      // Clear the file selection when going back to step 1
      if (currentStep === 2) {
        onClearFiles();
      }
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

        return (
          <div className="space-y-4">
            {/* Vault Selection */}
            <div>
              <label className="block text-sm font-medium text-main mb-2">
                Select vault for these files:
              </label>
              <div className="relative" ref={dropdownRef}>
                {/* Custom Dropdown Button */}
                <button
                  ref={dropdownButtonRef}
                  type="button"
                  className="w-full px-4 py-3 border rounded-lg bg-white dark:bg-slate-800 text-main transition-colors focus:outline-none focus:ring-2 appearance-none cursor-pointer flex items-center justify-between"
                  style={{
                    borderColor: workflowVault ? '#3B82F6' : 'rgb(var(--border-default))',
                    boxShadow: workflowVault ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none',
                  }}
                  onClick={() => {
                    setIsDropdownOpen(!isDropdownOpen);
                    // Don't auto-focus any item when opening
                    setFocusedIndex(-1);
                  }}
                  disabled={vaultsWithKeys.length === 0}
                  autoFocus={currentStep === 2}
                  onKeyDown={(e) => {
                    // Only handle keyboard events when dropdown is closed
                    if (!isDropdownOpen) {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsDropdownOpen(true);
                        setFocusedIndex(-1);
                      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        setIsDropdownOpen(true);
                        // Start with the first/last item focused when opening with arrow key
                        setFocusedIndex(e.key === 'ArrowDown' ? 0 : vaultsWithKeys.length - 1);
                      }
                    }
                    // Let the document handler handle events when dropdown is open
                  }}
                >
                  <span className="flex items-center gap-2">
                    {workflowVault ? (
                      <>
                        <Archive className="h-4 w-4" style={{ color: '#3B82F6' }} />
                        <span>{workflowVault.name}</span>
                        <span style={{ color: 'rgb(var(--text-secondary))' }} className="text-sm">
                          ({keyCache.get(workflowVault.id)?.length || 0}{' '}
                          {keyCache.get(workflowVault.id)?.length === 1 ? 'key' : 'keys'})
                        </span>
                      </>
                    ) : (
                      <span style={{ color: 'rgb(var(--text-secondary))' }}>
                        {vaultsWithKeys.length === 0 ? 'No vaults available' : 'Choose vault...'}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    style={{ color: 'rgb(var(--text-secondary))' }}
                  />
                </button>

                {/* Custom Dropdown Menu */}
                {isDropdownOpen && vaultsWithKeys.length > 0 && (
                  <div
                    className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border rounded-lg shadow-lg max-h-64 overflow-auto"
                    style={{ borderColor: 'rgb(var(--border-default))' }}
                  >
                    {vaultsWithKeys
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((vault, index) => {
                        const keys = keyCache.get(vault.id) || [];
                        const isSelected = vault.id === workflowVault?.id;
                        const isFocused = index === focusedIndex;
                        return (
                          <button
                            key={vault.id}
                            type="button"
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-between ${
                              isFocused ? 'ring-2 ring-blue-500 ring-inset' : ''
                            }`}
                            style={{
                              backgroundColor: isSelected
                                ? 'rgba(59, 130, 246, 0.1)'
                                : isFocused
                                  ? 'rgba(59, 130, 246, 0.05)'
                                  : 'transparent',
                            }}
                            onClick={() => {
                              onVaultChange(vault.id);
                              setIsDropdownOpen(false);
                              setFocusedIndex(-1);
                              // Focus the Encrypt Now button after selection
                              setTimeout(() => {
                                continueButtonRef.current?.focus();
                              }, 50);
                            }}
                            onKeyDown={(e) => {
                              // Remove individual item keyboard handlers
                              // Let the document-level handler manage all keyboard navigation
                              e.stopPropagation();
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Archive
                                className={`h-4 w-4 ${
                                  isSelected ? 'text-blue-600' : 'text-gray-400'
                                }`}
                              />
                              <span className="font-medium">{vault.name}</span>
                              <span
                                className="text-sm"
                                style={{ color: 'rgb(var(--text-secondary))' }}
                              >
                                ({keys.length} {keys.length === 1 ? 'key' : 'keys'})
                              </span>
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                          </button>
                        );
                      })}
                  </div>
                )}

                {vaultsWithKeys.length === 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" style={{ color: '#DC2626' }} />
                    <p className="text-xs" style={{ color: '#DC2626' }}>
                      No vaults with keys available. Create a vault and add keys first.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Show recovery preview only after vault is selected */}
            {workflowVault && bundleContents && (
              <RecoveryInfoPanel
                fileCount={selectedFiles.file_count}
                totalSize={selectedFiles.total_size}
                hasPassphraseKeys={bundleContents.passphraseKeys > 0}
                passphraseKeyCount={bundleContents.passphraseKeys}
                vaultName={workflowVault.name}
              />
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
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
      {/* Card Content */}
      <div className="p-5">
        <div className={`${currentStep === 2 ? '' : 'min-h-[200px] max-h-[350px]'} mb-2`}>
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-1">
          {canGoToPreviousStep && (
            <button
              onClick={handlePrevious}
              className="h-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-1"
              disabled={isLoading}
              tabIndex={2}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
          )}

          {currentStep === 2 && (
            <button
              ref={continueButtonRef}
              onClick={handleContinue}
              className={`h-10 rounded-xl px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2 ${
                canContinue
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              } ${!canGoToPreviousStep ? 'ml-auto' : ''}`}
              disabled={isLoading || !canContinue}
              tabIndex={canContinue ? 1 : -1}
            >
              <Lock className="w-4 h-4" />
              Encrypt Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressiveEncryptionCards;
