import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ShieldAlert } from 'lucide-react';
import FileDropZone from '../common/FileDropZone';
import { KeySelectionDropdown } from '../forms/KeySelectionDropdown';
import PassphraseInput from '../forms/PassphraseInput';
import { VaultKey } from '../../bindings';
import VaultRecognition from './VaultRecognition';
import KeyDiscovery from './KeyDiscovery';

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
  // New props for recovery
  isKnownVault?: boolean | null;
  detectedVaultName?: string | null;
  detectedVaultId?: string | null;
  isRecoveryMode?: boolean;
  availableKeysForDiscovery?: VaultKey[];
  keyAttempts?: Map<string, boolean>;
  willRestoreManifest?: boolean;
  onImportKey?: () => void;
  onDetectYubiKey?: () => void;
  onConfirmRestoration?: () => void;
  onDecrypt?: () => void;
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
  // Recovery props
  isKnownVault = null,
  detectedVaultName = null,
  detectedVaultId = null,
  isRecoveryMode = false,
  availableKeysForDiscovery = [],
  keyAttempts = new Map(),
  willRestoreManifest: _willRestoreManifest = false,
  onImportKey = () => {},
  onDetectYubiKey,
  onConfirmRestoration: _onConfirmRestoration = () => {},
  onDecrypt,
}) => {
  const canGoToPreviousStep = currentStep > 1;
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const [isValidatingPassphrase, setIsValidatingPassphrase] = useState(false);
  const [availableKeys, setAvailableKeys] = useState<VaultKey[]>([]);
  const [selectedKey, setSelectedKey] = useState<VaultKey | null>(null);

  // Update selected key when selectedKeyId changes
  useEffect(() => {
    if (selectedKeyId) {
      // Check both normal keys and recovery keys
      const foundKey =
        availableKeys.find((key) => key.id === selectedKeyId) ||
        availableKeysForDiscovery.find((key) => key.id === selectedKeyId);
      setSelectedKey(foundKey || null);
    } else {
      setSelectedKey(null);
    }
  }, [selectedKeyId, availableKeys, availableKeysForDiscovery]);

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
      // Clear the file selection when going back to step 1
      if (currentStep === 2) {
        onClearFiles();
      }
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

          // If we get here, passphrase is correct, trigger decryption directly
          // Skip step 3 (Ready to Decrypt panel) and go straight to decryption
          if (onDecrypt) {
            onDecrypt();
          } else {
            // Fallback to step navigation if onDecrypt not provided
            onStepChange(currentStep + 1);
          }
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
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

            {/* Show vault recognition after file selection - it will auto-advance */}
            {selectedFile && isKnownVault !== null && (
              <div className="mt-4">
                <VaultRecognition
                  file={selectedFile}
                  isKnown={isKnownVault}
                  vaultName={detectedVaultName}
                  onContinue={() => onStepChange(2)}
                />
              </div>
            )}
          </>
        );

      case 2:
        // Recovery mode: Use KeySelectionDropdown with recovery keys
        if (isRecoveryMode) {
          // If keys available, show dropdown with banner
          if (availableKeysForDiscovery.length > 0) {
            return (
              <div className="space-y-4">
                {/* Recovery Mode Banner */}
                <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-orange-200 dark:border-orange-700/50 p-4">
                  <div className="flex items-center gap-2 font-medium mb-2 text-orange-200 dark:text-orange-700/50">
                    <ShieldAlert className="w-5 h-5" />
                    Recovery Mode
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    This vault's manifest is missing. Select the key that was used to encrypt this
                    vault.
                  </p>
                </div>

                {/* Reuse existing KeySelectionDropdown with recovery keys */}
                <div>
                  <KeySelectionDropdown
                    value={selectedKeyId || ''}
                    onChange={onKeyChange}
                    placeholder="Select recovery key"
                    label="Recovery Keys"
                    autoFocus={currentStep === 2}
                    includeAllKeys={true}
                    recoveryKeys={availableKeysForDiscovery}
                  />
                </div>

                {/* PIN/Passphrase Field */}
                {selectedKeyId && (
                  <div>
                    <PassphraseInput
                      value={passphrase}
                      onChange={onPassphraseChange}
                      label={selectedKey?.type === 'YubiKey' ? 'PIN' : 'Passphrase'}
                      placeholder={
                        selectedKey?.type === 'YubiKey'
                          ? 'Enter your YubiKey PIN'
                          : 'Enter your key passphrase'
                      }
                      showStrength={false}
                      autoFocus={true}
                      disableValidation={true}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && canContinue) {
                          e.preventDefault();
                          handleContinue();
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            );
          }

          // No keys - show KeyDiscovery empty state
          return (
            <KeyDiscovery
              availableKeys={[]}
              suggestedKeys={[]}
              keyAttempts={keyAttempts}
              onKeySelected={onKeyChange}
              onImportKey={onImportKey}
              onDetectYubiKey={onDetectYubiKey}
              isRecoveryMode={isRecoveryMode}
            />
          );
        }

        // Normal key selection for known vaults
        return (
          <div className="space-y-4">
            <div>
              <KeySelectionDropdown
                value={selectedKeyId || ''}
                onChange={onKeyChange}
                placeholder="Choose the key used for encryption"
                autoFocus={currentStep === 2}
                onKeysLoaded={setAvailableKeys}
                includeAllKeys={true}
                vaultId={detectedVaultId}
              />
            </div>

            {selectedKeyId && (
              <>
                <div>
                  <PassphraseInput
                    value={passphrase}
                    onChange={onPassphraseChange}
                    label={selectedKey?.type === 'YubiKey' ? 'PIN' : 'Passphrase'}
                    placeholder={
                      selectedKey?.type === 'YubiKey'
                        ? 'Enter your YubiKey PIN'
                        : 'Enter your key passphrase'
                    }
                    showStrength={false}
                    autoFocus={true}
                    disableValidation={true}
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
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
      {/* Card Content */}
      <div className="p-6">
        <div className="mb-6">{renderStepContent()}</div>

        {/* Navigation Buttons - Only show on Step 2 */}
        {currentStep === 2 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
            {/* Previous button */}
            <button
              onClick={handlePrevious}
              className="h-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-1 transition-colors"
              disabled={isLoading}
              tabIndex={2}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {/* Decrypt Vault button */}
            <button
              ref={continueButtonRef}
              onClick={handleContinue}
              className={`h-10 rounded-xl px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                canContinue && !isValidatingPassphrase
                  ? 'text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
              }`}
              style={{
                backgroundColor: canContinue && !isValidatingPassphrase ? '#1D4ED8' : '',
              }}
              onMouseEnter={(e) => {
                if (canContinue && !isValidatingPassphrase) {
                  e.currentTarget.style.backgroundColor = '#1E40AF';
                }
              }}
              onMouseLeave={(e) => {
                if (canContinue && !isValidatingPassphrase) {
                  e.currentTarget.style.backgroundColor = '#1D4ED8';
                }
              }}
              disabled={isLoading || !canContinue || isValidatingPassphrase}
              tabIndex={canContinue ? 1 : -1}
            >
              {isValidatingPassphrase ? 'Validating...' : 'Decrypt Vault'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressiveDecryptionCards;
