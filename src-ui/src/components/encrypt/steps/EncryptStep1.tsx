import React, { useCallback, useEffect } from 'react';
import { FileText, FolderOpen, Check } from 'lucide-react';
import FileDropZone from '../../common/FileDropZone';
import AnimatedTransition from '../../ui/AnimatedTransition';
import { useEncryptFlow } from '../../../contexts/EncryptFlowContext';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import { useToast } from '../../../hooks/useToast';

/**
 * Step 1: File Selection
 * Progressive disclosure pattern - only shows next step when complete
 */
const EncryptStep1: React.FC = () => {
  const { selectedFiles, setSelectedFiles, navigateToStep, markStepCompleted } = useEncryptFlow();

  const fileEncryption = useFileEncryption();
  const { showSuccess, showError } = useToast();

  // Sync file selection state with context
  useEffect(() => {
    if (fileEncryption.selectedFiles && !selectedFiles) {
      setSelectedFiles(fileEncryption.selectedFiles);
      markStepCompleted(1);

      // Auto-advance to next step
      setTimeout(() => navigateToStep(2), 500);
    }
  }, [
    fileEncryption.selectedFiles,
    selectedFiles,
    setSelectedFiles,
    markStepCompleted,
    navigateToStep,
  ]);

  const handleFilesSelected = useCallback(
    async (paths: string[], selectionType: 'Files' | 'Folder') => {
      try {
        await fileEncryption.selectFiles(paths, selectionType);

        showSuccess(
          'Files selected',
          `${paths.length} ${paths.length === 1 ? 'item' : 'items'} ready for encryption`,
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to select files';
        showError('File selection failed', errorMessage);
      }
    },
    [fileEncryption, showSuccess, showError],
  );

  const handleClearFiles = useCallback(() => {
    fileEncryption.clearSelection();
    setSelectedFiles(null);
  }, [fileEncryption, setSelectedFiles]);

  const handleDropZoneError = useCallback(
    (error: Error) => {
      showError('Unable to process files', error.message);
    },
    [showError],
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                selectedFiles ? 'bg-green-100' : 'bg-blue-100'
              }`}
            >
              {selectedFiles ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <span className="text-blue-600 font-semibold">1</span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedFiles ? 'Files Selected' : 'What Would You Like to Encrypt?'}
              </h2>
              {!selectedFiles && (
                <p className="text-sm text-gray-600 mt-0.5">
                  Choose files or folders to protect with encryption
                </p>
              )}
            </div>
          </div>

          {selectedFiles && (
            <button
              onClick={handleClearFiles}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Change selection
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatedTransition show={!selectedFiles} duration={300}>
          <div className="space-y-4">
            {/* Instruction text */}
            <p className="text-sm text-gray-600">
              Drag and drop your files here, or click to browse:
            </p>

            {/* Drop zone */}
            <FileDropZone
              onFilesSelected={handleFilesSelected}
              selectedFiles={null}
              onClearFiles={handleClearFiles}
              onError={handleDropZoneError}
              disabled={false}
            />

            {/* Quick tips */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Quick Tips:</h3>
              <ul className="space-y-1.5 text-xs text-blue-700">
                <li className="flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Select multiple files by holding Cmd/Ctrl while clicking</span>
                </li>
                <li className="flex items-start gap-2">
                  <FolderOpen className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>Entire folders can be encrypted to keep directory structure intact</span>
                </li>
              </ul>
            </div>
          </div>
        </AnimatedTransition>

        <AnimatedTransition show={!!selectedFiles} duration={300}>
          {selectedFiles && (
            <div className="space-y-4">
              {/* Selected files summary */}
              <FileDropZone
                onFilesSelected={handleFilesSelected}
                selectedFiles={selectedFiles}
                onClearFiles={handleClearFiles}
                onError={handleDropZoneError}
                disabled={false}
              />

              {/* Continue button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => navigateToStep(2)}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                           transition-colors font-medium shadow-sm hover:shadow-md"
                >
                  Continue to Key Selection
                </button>
              </div>
            </div>
          )}
        </AnimatedTransition>
      </div>
    </div>
  );
};

export default EncryptStep1;
