import React from 'react';
import { Check, Lock } from 'lucide-react';

interface EncryptionActionsProps {
  selectedFiles: any;
  selectedKeyId: string;
  archiveName: string;
  isReadyToEncrypt: boolean;
  isLoading: boolean;
  onReset: () => void;
  onEncrypt: () => void;
}

/**
 * Action area component with validation checklist and buttons
 * Extracted from EncryptPage to reduce component size
 */
const EncryptionActions: React.FC<EncryptionActionsProps> = ({
  selectedFiles,
  selectedKeyId,
  archiveName,
  isReadyToEncrypt,
  isLoading,
  onReset,
  onEncrypt,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="space-y-4">
        {/* Validation Checklist */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Ready to Encrypt:</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Check className={`w-4 h-4 ${selectedFiles ? 'text-green-500' : 'text-gray-300'}`} />
              <span className={`text-sm ${selectedFiles ? 'text-gray-700' : 'text-gray-400'}`}>
                {selectedFiles?.file_count || 0} files selected (
                {selectedFiles
                  ? `${(selectedFiles.total_size / 1024 / 1024).toFixed(2)} MB`
                  : '0 MB'}
                )
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check className={`w-4 h-4 ${selectedKeyId ? 'text-green-500' : 'text-gray-300'}`} />
              <span className={`text-sm ${selectedKeyId ? 'text-gray-700' : 'text-gray-400'}`}>
                Encryption key {selectedKeyId ? 'chosen' : 'not selected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Check className={`w-4 h-4 ${archiveName ? 'text-green-500' : 'text-gray-300'}`} />
              <span className={`text-sm ${archiveName ? 'text-gray-700' : 'text-gray-400'}`}>
                {archiveName ? `Output name: ${archiveName}.age` : 'Using default output name'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onReset}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onEncrypt}
            disabled={!isReadyToEncrypt || isLoading}
            className={`
              flex items-center gap-2 px-8 py-2.5 text-sm font-medium rounded-md
              transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500
              ${
                isReadyToEncrypt
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Lock className="w-4 h-4" />
            Create Encrypted Vault
          </button>
        </div>
      </div>
    </div>
  );
};

export default EncryptionActions;
