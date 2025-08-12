import React, { useCallback, useEffect } from 'react';
import FileDropZone from '../../common/FileDropZone';
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
    }
  }, [fileEncryption.selectedFiles, selectedFiles, setSelectedFiles, markStepCompleted]);

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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Card Content */}
      <div className="p-6">
        <div className="min-h-[200px] max-h-[350px] mb-6">
          <FileDropZone
            onFilesSelected={handleFilesSelected}
            selectedFiles={selectedFiles}
            onClearFiles={handleClearFiles}
            onError={handleDropZoneError}
            disabled={false}
            dropText="Drop files here"
            browseButtonText="Browse Files"
            browseFolderButtonText="Browse Folder"
            icon={selectedFiles ? 'decrypt' : 'upload'}
          />
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-end pt-4 border-t border-gray-100">
          <button
            onClick={() => navigateToStep(2)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              selectedFiles
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            disabled={!selectedFiles}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default EncryptStep1;
