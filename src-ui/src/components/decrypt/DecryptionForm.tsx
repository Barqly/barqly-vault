import React from 'react';
import FileDropZone from '../common/FileDropZone';
import FormSection from '../forms/FormSection';
import { KeySelectionDropdown } from '../forms/KeySelectionDropdown';
import PassphraseInput from '../forms/PassphraseInput';
import PassphraseMemoryHints from './PassphraseMemoryHints';

interface DecryptionFormProps {
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
}

/**
 * Main form component for the decryption workflow
 * Extracted from DecryptPage to reduce component size
 */
const DecryptionForm: React.FC<DecryptionFormProps> = ({
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
}) => {
  return (
    <>
      {/* Step 1: File Selection */}
      <FormSection
        title="Select Your Encrypted Vault"
        subtitle="Choose the .age file you want to decrypt"
      >
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
          acceptedFormats={[]}
          dropText="Drop your encrypted vault here (.age format)"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Key Selection</label>
              <KeySelectionDropdown
                value={selectedKeyId || ''}
                onChange={onKeyChange}
                placeholder="Choose the key used for encryption"
              />
            </div>

            {selectedKeyId && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passphrase</label>
                  <PassphraseInput
                    value={passphrase}
                    onChange={onPassphraseChange}
                    placeholder="Enter your key passphrase"
                    showStrength={false}
                  />
                </div>

                <PassphraseMemoryHints
                  vaultPath={selectedFile}
                  creationDate={vaultMetadata.creationDate}
                  keyLabel={vaultMetadata.keyLabel}
                  attemptCount={passphraseAttempts}
                  onNeedHelp={onNeedHelp}
                />
              </>
            )}
          </div>
        </FormSection>
      )}
    </>
  );
};

export default DecryptionForm;
