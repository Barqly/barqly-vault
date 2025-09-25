import { useState, useEffect, useCallback } from 'react';
import { documentDir, join } from '@tauri-apps/api/path';
import { useFileEncryption } from './useFileEncryption';
import type { ErrorCode, CommandError } from '../bindings';
import { createCommandError } from '../lib/errors/command-error';
import { useVault } from '../contexts/VaultContext';
import { commands, EncryptFilesMultiInput } from '../bindings';

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
  const { currentVault } = useVault();
  const fileEncryptionHook = useFileEncryption();
  const {
    selectFiles,
    isLoading,
    error,
    success,
    progress,
    selectedFiles,
    reset,
    clearError: clearFileError,
    clearSelection,
  } = fileEncryptionHook;

  // Workflow state - simplified for multi-key encryption
  const [outputPath, setOutputPath] = useState<string>('');
  const [archiveName, setArchiveName] = useState<string>('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [fileValidationError, setFileValidationError] = useState<CommandError | null>(null);
  const [encryptionResult, setEncryptionResult] = useState<EncryptionResult | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [pendingOverwriteFile, setPendingOverwriteFile] = useState<string>('');

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
          return !!selectedFiles; // Can go to step 2 if files are selected (no key needed for multi-key encryption)
        default:
          return false;
      }
    },
    [selectedFiles],
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

  // Handle encryption using new multi-key command
  const handleEncryption = useCallback(async () => {
    if (!selectedFiles) {
      const error = createCommandError(
        ErrorCode.MISSING_PARAMETER,
        'Missing files',
        'Please select files to encrypt before proceeding',
      );
      setFileValidationError(error);
      return;
    }

    if (!currentVault) {
      const error = createCommandError(
        ErrorCode.MISSING_PARAMETER,
        'No vault selected',
        'Please select a vault before encrypting files',
      );
      setFileValidationError(error);
      return;
    }

    // Set encrypting state immediately for instant UI feedback
    setIsEncrypting(true);

    // Small delay to ensure UI updates before heavy operation
    await new Promise((resolve) => setTimeout(resolve, 10));

    try {
      console.log('[DEBUG] Starting multi-key encryption, isEncrypting=true');
      setStartTime(Date.now());

      const input: EncryptFilesMultiInput = {
        vault_id: currentVault.id,
        in_file_paths: selectedFiles.paths,
        out_encrypted_file_name: archiveName || null,
        out_encrypted_file_path: outputPath || null,
      };

      const result = await commands.encryptFilesMulti(input);
      if (result.status === 'error') {
        throw result.error;
      }

      console.log('[DEBUG] Multi-key encryption completed, setting result');
      const response = result.data;

      const duration = Math.round((Date.now() - startTime) / 1000);
      setEncryptionResult({
        outputPath: response.encrypted_file_path,
        fileName: response.encrypted_file_path.split('/').pop() || 'encrypted-file.age',
        fileCount: selectedFiles.file_count,
        originalSize: selectedFiles.total_size,
        encryptedSize: Math.round(selectedFiles.total_size * 0.75),
        duration,
        keyUsed: response.keys_used.join(', '),
      });

      // Check if there's an overwrite warning
      if (response.file_exists_warning) {
        // Show overwrite confirmation dialog
        const fileName = response.encrypted_file_path.split('/').pop() || 'encrypted-file.age';
        setPendingOverwriteFile(fileName);
        setShowOverwriteDialog(true);
        return; // Don't set success yet, wait for user confirmation
      }

      // Success panel provides comprehensive feedback
    } catch (err) {
      console.error('[EncryptionWorkflow] Multi-key encryption error:', err);
      const commandError =
        err instanceof Object && 'code' in err
          ? (err as CommandError)
          : createCommandError(
              ErrorCode.INTERNAL_ERROR,
              'Encryption failed',
              err instanceof Error ? err.message : 'Please try again',
            );
      setFileValidationError(commandError);
    } finally {
      console.log('[DEBUG] Finally block: setting isEncrypting=false');
      setIsEncrypting(false);
    }
  }, [selectedFiles, archiveName, outputPath, currentVault, startTime]);

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

  // Set default archive name based on vault label
  useEffect(() => {
    if (currentVault && !archiveName) {
      setArchiveName(currentVault.label);
    }
  }, [currentVault, archiveName]);

  // Handle overwrite confirmation
  const handleOverwriteConfirm = useCallback(() => {
    setShowOverwriteDialog(false);
    setPendingOverwriteFile('');
    // For now, just proceed with success since the file was already created
    // In a full implementation, we'd call the backend again with overwrite=true
    console.log('[DEBUG] User confirmed overwrite, proceeding with success');
  }, []);

  const handleOverwriteCancel = useCallback(() => {
    setShowOverwriteDialog(false);
    setPendingOverwriteFile('');
    setIsEncrypting(false);
    console.log('[DEBUG] User cancelled overwrite, resetting encryption state');
  }, []);

  // Handle reset
  const handleReset = useCallback(() => {
    reset();
    setOutputPath('');
    setArchiveName('');
    setIsEncrypting(false);
    setShowAdvancedOptions(false);
    setCurrentStep(1);
    setPrevSelectedFiles(null);
    setFileValidationError(null);
    setEncryptionResult(null);
    setShowOverwriteDialog(false);
    setPendingOverwriteFile('');
  }, [reset]);

  // Handle encrypt another
  const handleEncryptAnother = useCallback(() => {
    handleReset();
    // UI reset to step 1 provides clear visual feedback
  }, [handleReset]);

  // Handle key selection (no-op for multi-key encryption)
  const handleKeyChange = useCallback((keyId: string) => {
    // No longer needed since we encrypt to all vault keys
    console.log('[EncryptionWorkflow] Key selection ignored in multi-key mode:', keyId);
  }, []);

  // Handle file validation errors from FileDropZone
  const handleFileValidationError = useCallback((error: CommandError) => {
    setFileValidationError(error);
  }, []);

  return {
    // State - simplified for multi-key encryption
    selectedFiles,
    selectedKeyId: null, // Always null in multi-key mode
    outputPath,
    archiveName,
    isEncrypting,
    showAdvancedOptions,
    setShowAdvancedOptions,
    encryptionResult,
    showOverwriteDialog,
    pendingOverwriteFile,

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

    // Overwrite confirmation handlers
    handleOverwriteConfirm,
    handleOverwriteCancel,
  };
};
