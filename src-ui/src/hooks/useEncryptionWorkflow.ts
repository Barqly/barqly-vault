import { useState, useCallback } from 'react';
import { useFileEncryption } from './useFileEncryption';
import { useToast } from './useToast';

interface EncryptionResult {
  outputPath: string;
  fileName: string;
  fileCount: number;
  originalSize: number;
  encryptedSize: number;
  duration: number;
  keyUsed: string;
}

/**
 * Custom hook to manage the encryption workflow state and logic
 * Extracted from EncryptPage to reduce component size
 */
export const useEncryptionWorkflow = () => {
  const {
    selectFiles,
    encryptFiles,
    isLoading,
    error,
    success,
    progress,
    selectedFiles,
    reset,
    clearError,
    clearSelection,
  } = useFileEncryption();

  const { toasts, showError, showSuccess, showWarning, removeToast } = useToast();

  // Workflow state
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [outputPath, setOutputPath] = useState<string>('');
  const [archiveName, setArchiveName] = useState<string>('');
  const [encryptionResult, setEncryptionResult] = useState<EncryptionResult | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);

  // Computed states
  const isReadyToEncrypt = !!(selectedFiles && selectedKeyId);

  // Determine current step based on state
  const getCurrentStep = () => {
    if (selectedFiles && selectedKeyId) return 3;
    if (selectedFiles) return 2;
    return 1;
  };

  // Handle file selection
  const handleFilesSelected = useCallback(
    async (paths: string[], selectionType: 'Files' | 'Folder') => {
      console.log('[EncryptionWorkflow] handleFilesSelected:', {
        paths,
        selectionType,
        timestamp: Date.now(),
      });

      try {
        await selectFiles(paths, selectionType);
        showSuccess(
          'Files selected',
          `${paths.length} ${paths.length === 1 ? 'item' : 'items'} ready for encryption`,
        );
        setRetryCount(0);
      } catch (err) {
        console.error('[EncryptionWorkflow] File selection error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        showError('File selection failed', errorMessage, {
          action: {
            label: 'Retry',
            onClick: () => {
              setRetryCount((prev) => prev + 1);
              handleFilesSelected(paths, selectionType);
            },
          },
        });
      }
    },
    [selectFiles, showSuccess, showError],
  );

  // Handle encryption
  const handleEncrypt = useCallback(async () => {
    console.log('[useEncryptionWorkflow] handleEncrypt validation:', { selectedKeyId, selectedFiles });
    if (!selectedKeyId) {
      showWarning('Cannot encrypt', 'Please select an encryption key first');
      return;
    }
    if (!selectedFiles) {
      showWarning('Cannot encrypt', 'Please select files first');
      return;
    }

    try {
      setStartTime(Date.now());
      await encryptFiles(selectedKeyId, archiveName || undefined, outputPath || undefined);

      const duration = Math.round((Date.now() - startTime) / 1000);
      setEncryptionResult({
        outputPath: outputPath || 'Default location',
        fileName: archiveName
          ? `${archiveName}.age`
          : `barqly-vault-${new Date().toISOString().split('T')[0]}.age`,
        fileCount: selectedFiles.file_count,
        originalSize: selectedFiles.total_size,
        encryptedSize: Math.round(selectedFiles.total_size * 0.75),
        duration,
        keyUsed: selectedKeyId,
      });

      showSuccess(
        'Encryption successful',
        `Your vault has been created successfully in ${duration} seconds`,
      );
    } catch (err) {
      console.error('[EncryptionWorkflow] Encryption error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Encryption failed';
      showError('Encryption failed', errorMessage, {
        action: {
          label: 'Retry',
          onClick: () => handleEncrypt(),
        },
        duration: 10000,
      });
    }
  }, [
    selectedKeyId,
    selectedFiles,
    archiveName,
    outputPath,
    encryptFiles,
    showWarning,
    showSuccess,
    showError,
    startTime,
  ]);

  // Handle reset
  const handleReset = useCallback(() => {
    console.log('[EncryptionWorkflow] Resetting all state');
    reset();
    setSelectedKeyId('');
    setOutputPath('');
    setArchiveName('');
    setEncryptionResult(null);
  }, [reset]);

  // Handle drop zone errors
  const handleDropZoneError = useCallback(
    (error: Error) => {
      console.error('[EncryptionWorkflow] FileDropZone error:', error);
      const isTransientError =
        error.message.includes('backend') || error.message.includes('failed to process');

      if (isTransientError && retryCount < 3) {
        showWarning('Drop operation failed', `${error.message}. This might be a temporary issue.`, {
          duration: 6000,
        });
      } else {
        showError('Unable to process dropped files', error.message, {
          action: {
            label: 'Try browse instead',
            onClick: () => {
              console.log('[EncryptionWorkflow] User opted to use browse instead');
            },
          },
        });
      }
    },
    [showError, showWarning, retryCount],
  );

  return {
    // State
    selectedKeyId,
    setSelectedKeyId,
    outputPath,
    setOutputPath,
    archiveName,
    setArchiveName,
    encryptionResult,
    retryCount,

    // From useFileEncryption
    selectedFiles,
    isLoading,
    error,
    success,
    progress,
    clearError,
    clearSelection,

    // From useToast
    toasts,
    removeToast,

    // Computed
    isReadyToEncrypt,
    currentStep: getCurrentStep(),

    // Handlers
    handleFilesSelected,
    handleEncrypt,
    handleReset,
    handleDropZoneError,
  };
};
