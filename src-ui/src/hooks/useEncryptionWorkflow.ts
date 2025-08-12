import { useState, useEffect, useCallback } from 'react';
import { documentDir, join } from '@tauri-apps/api/path';
import { useFileEncryption } from './useFileEncryption';
import { useToast } from './useToast';
import { ErrorCode, CommandError } from '../lib/api-types';
import { createCommandError } from '../lib/errors/command-error';

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
 * Mirrors useDecryptionWorkflow architecture exactly for consistency
 */
export const useEncryptionWorkflow = () => {
  const fileEncryptionHook = useFileEncryption();
  const {
    selectFiles,
    encryptFiles,
    isLoading,
    error,
    success,
    progress,
    selectedFiles,
    reset,
    clearError: clearFileError,
    clearSelection,
  } = fileEncryptionHook;

  const { toasts, showError, showInfo, removeToast } = useToast();

  // Workflow state - mirrors useDecryptionWorkflow
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [outputPath, setOutputPath] = useState<string>('');
  const [archiveName, setArchiveName] = useState<string>('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [fileValidationError, setFileValidationError] = useState<CommandError | null>(null);
  const [encryptionResult, setEncryptionResult] = useState<EncryptionResult | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  // Track previous selectedFiles to distinguish between initial selection and navigation
  const [prevSelectedFiles, setPrevSelectedFiles] = useState<{
    paths: string[];
    file_count: number;
    total_size: number;
  } | null>(null);

  // Auto-advance to step 2 only when files are initially selected (not when navigating back)
  useEffect(() => {
    if (selectedFiles && !prevSelectedFiles && currentStep === 1) {
      setCurrentStep(2);
    }
    setPrevSelectedFiles(selectedFiles);
  }, [selectedFiles, prevSelectedFiles, currentStep]);

  // Check if user can navigate to a specific step
  const canNavigateToStep = useCallback(
    (step: number) => {
      switch (step) {
        case 1:
          return true; // Can always go back to step 1
        case 2:
          return !!selectedFiles; // Can go to step 2 if files are selected
        case 3:
          return !!(selectedFiles && selectedKeyId); // Can go to step 3 if files and key are selected
        default:
          return false;
      }
    },
    [selectedFiles, selectedKeyId],
  );

  // Handle step navigation - only way to change steps
  const handleStepNavigation = useCallback(
    (step: number) => {
      if (canNavigateToStep(step)) {
        setCurrentStep(step);
      }
    },
    [canNavigateToStep],
  );

  // Handle file selection
  const handleFilesSelected = useCallback(
    async (paths: string[], selectionType: 'Files' | 'Folder') => {
      console.log('[EncryptionWorkflow] Files selected:', {
        paths,
        selectionType,
        timestamp: Date.now(),
      });

      // Clear any previous file validation errors
      setFileValidationError(null);
      clearFileError(); // Clear any existing errors from useFileEncryption

      try {
        await selectFiles(paths, selectionType);
        // Visual feedback from UI transition is sufficient
      } catch (err) {
        console.error('[EncryptionWorkflow] File selection error:', err);
        const commandError = createCommandError(
          ErrorCode.INTERNAL_ERROR,
          'File selection failed',
          err instanceof Error ? err.message : 'Please try again',
        );
        setFileValidationError(commandError);
      }
    },
    [selectFiles, clearFileError],
  );

  // Handle encryption
  const handleEncryption = useCallback(async () => {
    if (!selectedKeyId) {
      const error = createCommandError(
        ErrorCode.MISSING_PARAMETER,
        'Missing encryption key',
        'Please select an encryption key before proceeding',
      );
      setFileValidationError(error);
      return;
    }

    if (!selectedFiles) {
      const error = createCommandError(
        ErrorCode.MISSING_PARAMETER,
        'Missing files',
        'Please select files to encrypt before proceeding',
      );
      setFileValidationError(error);
      return;
    }

    // Set encrypting state immediately for instant UI feedback
    setIsEncrypting(true);

    // Small delay to ensure UI updates before heavy operation
    await new Promise((resolve) => setTimeout(resolve, 10));

    try {
      console.log('[DEBUG] Starting encryption, isEncrypting=true');
      setStartTime(Date.now());
      await encryptFiles(selectedKeyId, archiveName || undefined, outputPath || undefined);
      console.log('[DEBUG] Encryption completed, setting result');

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

      // Success panel provides comprehensive feedback
    } catch (err) {
      console.error('[EncryptionWorkflow] Encryption error:', err);
      // Error is handled by useFileEncryption hook
    } finally {
      console.log('[DEBUG] Finally block: setting isEncrypting=false');
      setIsEncrypting(false);
    }
  }, [selectedKeyId, selectedFiles, archiveName, outputPath, encryptFiles, startTime]);

  // Generate default output path
  const getDefaultOutputPath = useCallback(async () => {
    try {
      const docsPath = await documentDir();
      const vaultsPath = await join(docsPath, 'Barqly-Vaults');
      return vaultsPath;
    } catch (error) {
      console.error('Error getting default path:', error);
      return '~/Documents/Barqly-Vaults';
    }
  }, []);

  // Set default output path when files are selected
  useEffect(() => {
    if (selectedFiles && !outputPath) {
      getDefaultOutputPath().then(setOutputPath);
    }
  }, [selectedFiles, outputPath, getDefaultOutputPath]);

  // Handle reset
  const handleReset = useCallback(() => {
    reset();
    setSelectedKeyId('');
    setOutputPath('');
    setArchiveName('');
    setIsEncrypting(false);
    setShowAdvancedOptions(false);
    setCurrentStep(1);
    setPrevSelectedFiles(null);
    setFileValidationError(null);
    setEncryptionResult(null);
  }, [reset]);

  // Handle encrypt another
  const handleEncryptAnother = useCallback(() => {
    handleReset();
    // UI reset to step 1 provides clear visual feedback
  }, [handleReset]);

  // Handle key selection
  const handleKeyChange = useCallback((keyId: string) => {
    setSelectedKeyId(keyId);
  }, []);

  // Handle file validation errors from FileDropZone
  const handleFileValidationError = useCallback((error: CommandError) => {
    setFileValidationError(error);
  }, []);

  return {
    // State - mirrors useDecryptionWorkflow
    selectedFiles,
    selectedKeyId,
    outputPath,
    archiveName,
    isEncrypting,
    showAdvancedOptions,
    setShowAdvancedOptions,
    encryptionResult,

    // From useFileEncryption
    isLoading,
    error: fileValidationError || error, // File validation errors take precedence
    success,
    progress,
    clearError: () => {
      clearFileError();
      setFileValidationError(null);
    },
    clearSelection,
    setOutputPath,
    setArchiveName,

    // From useToast
    toasts,
    removeToast,
    showInfo,
    showError,

    // Computed
    currentStep,

    // Handlers
    handleFilesSelected,
    handleEncryption,
    handleReset,
    handleEncryptAnother,
    handleKeyChange,
    handleFileValidationError,

    // Navigation handlers
    handleStepNavigation,
    canNavigateToStep,
  };
};
