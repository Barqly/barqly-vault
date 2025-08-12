import React, { useCallback, useState, useEffect } from 'react';
import { ChevronLeft, Lock, CheckCircle, Loader2 } from 'lucide-react';
import { documentDir, join } from '@tauri-apps/api/path';
import DestinationSelector from '../DestinationSelector';
import { useEncryptFlow } from '../../../contexts/EncryptFlowContext';

interface EncryptStep3Props {
  onEncrypt: () => Promise<void>;
  isLoading?: boolean;
}

/**
 * Step 3: Ready to Encrypt
 * Final confirmation panel with encryption action - mirrors DecryptionReadyPanel design
 */
const EncryptStep3: React.FC<EncryptStep3Props> = ({ onEncrypt, isLoading = false }) => {
  const {
    selectedFiles,
    selectedKeyId,
    outputPath,
    setOutputPath,
    archiveName,
    setArchiveName,
    navigateToStep,
    markStepCompleted,
  } = useEncryptFlow();

  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [defaultPath, setDefaultPath] = useState<string>('~/Documents/Barqly-Vaults');

  // Get platform-appropriate default path
  useEffect(() => {
    const getDefaultPath = async () => {
      try {
        const docsPath = await documentDir();
        const vaultsPath = await join(docsPath, 'Barqly-Vaults');
        setDefaultPath(vaultsPath);
      } catch (error) {
        console.error('Error getting default path:', error);
        // Fallback to platform-appropriate default
        setDefaultPath('~/Documents/Barqly-Vaults');
      }
    };
    getDefaultPath();
  }, []);

  const handleBack = useCallback(() => {
    navigateToStep(2);
  }, [navigateToStep]);

  const handleStartEncryption = useCallback(async () => {
    setIsEncrypting(true);
    markStepCompleted(3);

    try {
      await onEncrypt();
    } finally {
      setIsEncrypting(false);
    }
  }, [onEncrypt, markStepCompleted]);

  const formatPathDisplay = (path: string): string => {
    if (path.startsWith('/Users/')) {
      return path.replace(/^\/Users\/[^/]+/, '~');
    }
    if (path.startsWith('C:\\Users\\')) {
      const simplified = path.replace(/^C:\\Users\\[^\\]+/, '~');
      return simplified.replace(/\\/g, '/');
    }
    return path;
  };

  const displayPath = outputPath || defaultPath;
  const displayName = archiveName ? `${archiveName}.age` : 'Auto-generated filename';

  if (!selectedFiles || !selectedKeyId) {
    return null; // Should not render if prerequisites not met
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Ready to Encrypt Your Vault</h3>

      {/* Output location display */}
      <div className="bg-white border border-gray-200 rounded-md p-3 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Vault will be saved to:</p>
            <p className="text-sm font-mono text-gray-700">{formatPathDisplay(displayPath)}</p>
            {archiveName && <p className="text-xs text-gray-500 mt-1">Filename: {displayName}</p>}
          </div>
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="text-xs text-blue-600 hover:text-blue-700 ml-3"
          >
            {showAdvancedOptions ? 'Hide' : 'Change location'}
          </button>
        </div>
      </div>

      {/* Advanced options */}
      {showAdvancedOptions && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
          <DestinationSelector
            outputPath={outputPath}
            onPathChange={setOutputPath}
            archiveName={archiveName}
            onNameChange={setArchiveName}
            disabled={isLoading || isEncrypting}
          />
        </div>
      )}

      {/* Status checklist */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span>
            {selectedFiles.file_count} {selectedFiles.file_count === 1 ? 'file' : 'files'} selected
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span>Encryption key verified</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span>Output location ready</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
          disabled={isLoading || isEncrypting}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <button
          onClick={handleStartEncryption}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
          disabled={isLoading || isEncrypting}
        >
          {isEncrypting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Encrypting...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Encrypt Now
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default EncryptStep3;
