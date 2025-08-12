import React, { useCallback, useState } from 'react';
import { FolderOpen, FileArchive, Info, ChevronLeft, Lock, CheckCircle } from 'lucide-react';
import DestinationSelector from '../DestinationSelector';
import AnimatedTransition from '../../ui/AnimatedTransition';
import { useEncryptFlow } from '../../../contexts/EncryptFlowContext';
import { useEncryptionWorkflow } from '../../../hooks/useEncryptionWorkflow';
import { formatFileSize } from '../../../lib/format-utils';

/**
 * Step 3: Output Configuration & Review
 * Final step with optional output settings and encryption trigger
 */
const EncryptStep3: React.FC = () => {
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

  const { handleEncrypt, isLoading } = useEncryptionWorkflow();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);

  const handleBack = useCallback(() => {
    navigateToStep(2);
  }, [navigateToStep]);

  const handleStartEncryption = useCallback(async () => {
    setIsEncrypting(true);
    markStepCompleted(3);

    try {
      await handleEncrypt();
    } finally {
      setIsEncrypting(false);
    }
  }, [handleEncrypt, markStepCompleted]);

  if (!selectedFiles || !selectedKeyId) {
    return null; // Should not render if prerequisites not met
  }

  return (
    <div className="space-y-4">
      {/* Output Configuration Card */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                <span className="text-blue-600 font-semibold">3</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Configure Output (Optional)</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  Choose where to save your encrypted vault
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors font-medium"
            >
              {showAdvanced ? 'Hide' : 'Show'} advanced options
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Default message when not showing advanced */}
          <AnimatedTransition show={!showAdvanced} duration={300}>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex gap-3">
                  <FolderOpen className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-700 font-medium">Using Default Location</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Your encrypted vault will be saved to your Downloads folder with an
                      auto-generated name including today's date.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AnimatedTransition>

          {/* Advanced options */}
          <AnimatedTransition show={showAdvanced} duration={300}>
            <div className="space-y-4">
              <DestinationSelector
                outputPath={outputPath}
                onPathChange={setOutputPath}
                archiveName={archiveName}
                onNameChange={setArchiveName}
                disabled={isLoading || isEncrypting}
              />

              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex gap-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    Leave blank to use default location and auto-generated filename
                  </p>
                </div>
              </div>
            </div>
          </AnimatedTransition>
        </div>
      </div>

      {/* Ready to Encrypt Summary Card */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Ready to Encrypt</h2>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-gray-600">Files to encrypt:</span>
              <span className="text-sm font-medium text-gray-900">
                {selectedFiles.file_count} {selectedFiles.file_count === 1 ? 'file' : 'files'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-gray-600">Total size:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatFileSize(selectedFiles.total_size)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-gray-600">Encryption key:</span>
              <span className="text-sm font-medium text-gray-900">{selectedKeyId}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Output location:</span>
              <span className="text-sm font-medium text-gray-900">
                {outputPath || 'Default (Downloads)'}
              </span>
            </div>
          </div>

          {/* Security reminder */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <FileArchive className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-amber-900">Before You Encrypt</h3>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  Make sure you have backed up your private key. Without it, you won't be able to
                  decrypt these files later. Your encrypted vault will have a .age extension.
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              onClick={handleBack}
              disabled={isEncrypting}
              className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <button
              onClick={handleStartEncryption}
              disabled={isLoading || isEncrypting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md 
                       hover:bg-green-700 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              {isEncrypting ? 'Encrypting...' : 'Encrypt Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncryptStep3;
