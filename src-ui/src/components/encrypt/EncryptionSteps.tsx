import React from 'react';
import { Check, Info } from 'lucide-react';
import FileDropZone from '../common/FileDropZone';
import { KeySelectionDropdown } from '../forms/KeySelectionDropdown';
import DestinationSelector from './DestinationSelector';

interface EncryptionStepsProps {
  selectedFiles: any;
  selectedKeyId: string;
  outputPath: string;
  archiveName: string;
  isLoading: boolean;
  onFilesSelected: (paths: string[], selectionType: 'Files' | 'Folder') => void;
  onDropZoneError: (error: Error) => void;
  onClearSelection: () => void;
  onKeyChange: (keyId: string) => void;
  onPathChange: (path: string) => void;
  onNameChange: (name: string) => void;
}

/**
 * Multi-step form component for encryption workflow
 * Extracted from EncryptPage to reduce component size
 */
const EncryptionSteps: React.FC<EncryptionStepsProps> = ({
  selectedFiles,
  selectedKeyId,
  outputPath,
  archiveName,
  isLoading,
  onFilesSelected,
  onDropZoneError,
  onClearSelection,
  onKeyChange,
  onPathChange,
  onNameChange,
}) => {
  return (
    <>
      {/* Step 1: File Selection */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center w-6 h-6">
            {selectedFiles ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <span className="text-lg font-bold text-blue-600">1</span>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-800">
            {selectedFiles ? 'Files Selected' : 'Select What to Encrypt'}
          </h3>
          {selectedFiles && (
            <button
              onClick={onClearSelection}
              className="ml-auto text-sm text-gray-500 hover:text-gray-700"
            >
              Change
            </button>
          )}
        </div>

        {!selectedFiles && (
          <p className="text-sm text-gray-600 mb-4">
            Select files or folders to encrypt - drag & drop or browse:
          </p>
        )}

        <FileDropZone
          onFilesSelected={onFilesSelected}
          selectedFiles={selectedFiles}
          onClearFiles={onClearSelection}
          onError={onDropZoneError}
          disabled={isLoading}
        />
      </div>

      {/* Step 2: Key Selection */}
      {selectedFiles && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-6 h-6">
              {selectedKeyId ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <span className="text-lg font-bold text-blue-600">2</span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              {selectedKeyId ? 'Encryption Key Selected' : 'Choose Your Encryption Key'}
            </h3>
            {selectedKeyId && (
              <button
                onClick={() => onKeyChange('')}
                className="ml-auto text-sm text-gray-500 hover:text-gray-700"
              >
                Change
              </button>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Select the key that will be used to encrypt your files:
          </p>

          <KeySelectionDropdown
            value={selectedKeyId}
            onChange={onKeyChange}
            placeholder="Select an encryption key..."
          />

          <div className="flex items-start gap-2 mt-3">
            <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500">
              Files encrypted with this key can only be decrypted by the matching private key. Make
              sure you have access to the private key before encrypting.
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Output Configuration */}
      {selectedFiles && selectedKeyId && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-6 h-6">
              {outputPath ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <span className="text-lg font-bold text-blue-600">3</span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              {outputPath ? 'Output Configured' : 'Set Output Destination'} (Optional)
            </h3>
          </div>

          <p className="text-sm text-gray-600 mb-4">Where should your encrypted vault be saved?</p>

          <DestinationSelector
            outputPath={outputPath}
            onPathChange={onPathChange}
            archiveName={archiveName}
            onNameChange={onNameChange}
            disabled={isLoading}
          />
        </div>
      )}
    </>
  );
};

export default EncryptionSteps;
