import { useState, useEffect, useCallback } from 'react';
import { documentDir, join } from '@tauri-apps/api/path';
import { useFileDecryption } from './useFileDecryption';
import { ErrorCode, CommandError } from '../bindings';
import { createCommandError } from '../lib/errors/command-error';

interface VaultMetadata {
  creationDate?: string;
  keyLabel?: string;
}

/**
 * Custom hook to manage the decryption workflow state and logic
 * Extracted from DecryptPage to reduce component size
 */
export const useDecryptionWorkflow = () => {
  const fileDecryptionHook = useFileDecryption();
  const {
    setSelectedFile,
    setKeyId,
    setPassphrase,
    setOutputPath,
    decryptFile,
    isLoading,
    error,
    success,
    progress,
    selectedFile,
    selectedKeyId,
    passphrase,
    outputPath,
    reset,
    clearError,
    clearSelection,
  } = fileDecryptionHook;

  // Workflow state
  const [passphraseAttempts, setPassphraseAttempts] = useState(0);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [vaultMetadata, setVaultMetadata] = useState<VaultMetadata>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [fileValidationError, setFileValidationError] = useState<CommandError | null>(null);

  // Steps are controlled by explicit user navigation only
  // No automatic transitions based on data

  // Track previous selectedFile to distinguish between initial selection and navigation
  const [prevSelectedFile, setPrevSelectedFile] = useState<string | null>(null);

  // Auto-advance to step 2 only when file is initially selected (not when navigating back)
  useEffect(() => {
    if (selectedFile && !prevSelectedFile && currentStep === 1) {
      setCurrentStep(2);
    }
    setPrevSelectedFile(selectedFile);
  }, [selectedFile, prevSelectedFile, currentStep]);

  // Check if user can navigate to a specific step
  const canNavigateToStep = useCallback(
    (step: number) => {
      switch (step) {
        case 1:
          return true; // Can always go back to step 1
        case 2:
          return !!selectedFile; // Can go to step 2 if file is selected
        case 3:
          return !!(selectedFile && selectedKeyId && passphrase); // Can go to step 3 if all data is available
        default:
          return false;
      }
    },
    [selectedFile, selectedKeyId, passphrase],
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
  const handleFileSelected = useCallback(
    async (paths: string[]) => {
      console.log('[DecryptionWorkflow] File selected:', paths);

      // Clear any previous file validation errors
      setFileValidationError(null);
      clearError(); // Clear any existing errors from useFileDecryption

      if (paths.length !== 1) {
        const error = createCommandError(
          ErrorCode.INVALID_INPUT,
          'Invalid file selection',
          'Please select only one encrypted .age file',
        );
        setFileValidationError(error);
        return;
      }

      const filePath = paths[0];
      if (!filePath.toLowerCase().endsWith('.age')) {
        const error = createCommandError(
          ErrorCode.INVALID_INPUT,
          'Invalid file format. Please select .age files only.',
          'Only encrypted .age files are supported for decryption',
        );
        setFileValidationError(error);
        return;
      }

      try {
        setSelectedFile(filePath);

        // Extract metadata from filename
        const fileName = filePath.split('/').pop() || '';
        const match = fileName.match(/(\d{4}-\d{2}-\d{2})/);
        if (match) {
          setVaultMetadata((prev) => ({
            ...prev,
            creationDate: match[1],
          }));
        }

        // Visual feedback from UI transition is sufficient
      } catch (error) {
        console.error('[DecryptionWorkflow] File selection error:', error);
        const commandError = createCommandError(
          ErrorCode.INTERNAL_ERROR,
          'File selection failed',
          error instanceof Error ? error.message : 'Please try again',
        );
        setFileValidationError(commandError);
      }
    },
    [setSelectedFile, clearError],
  );

  // Handle decryption
  const handleDecryption = useCallback(async () => {
    if (!selectedKeyId || !passphrase || !outputPath) {
      const error = createCommandError(
        ErrorCode.MISSING_PARAMETER,
        'Missing information',
        'Please complete all required fields before decrypting',
      );
      setFileValidationError(error);
      return;
    }

    // Set decrypting state immediately for instant UI feedback
    setIsDecrypting(true);

    // Small delay to ensure UI updates before heavy operation
    await new Promise((resolve) => setTimeout(resolve, 10));

    try {
      await decryptFile();
      // Success panel provides comprehensive feedback
    } catch (err) {
      console.error('[DecryptionWorkflow] Decryption error:', err);

      // Special error handling
      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof (err as any).message === 'string'
      ) {
        const message = (err as any).message.toLowerCase();

        if (message.includes('directory not found')) {
          // This error will be handled by the main error handling mechanism
          // via the error state in the component
          return;
        }

        if (message.includes('passphrase')) {
          setPassphraseAttempts((prev) => prev + 1);
        }
      }
    } finally {
      setIsDecrypting(false);
    }
  }, [selectedKeyId, passphrase, outputPath, decryptFile]);

  // Generate default output path
  const getDefaultOutputPath = useCallback(async () => {
    try {
      const docsPath = await documentDir();
      const date = new Date().toISOString().split('T')[0];
      const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
      const recoveryPath = await join(docsPath, 'Barqly-Recovery', `${date}_${time}`);
      return recoveryPath;
    } catch (error) {
      console.error('Error getting default path:', error);
      return `~/Documents/Barqly-Recovery/${new Date().toISOString().split('T')[0]}`;
    }
  }, []);

  // Set default output path when file is selected
  useEffect(() => {
    if (selectedFile && !outputPath) {
      getDefaultOutputPath().then(setOutputPath);
    }
  }, [selectedFile, outputPath, setOutputPath, getDefaultOutputPath]);

  // Handle reset
  const handleReset = useCallback(() => {
    reset();
    setPassphraseAttempts(0);
    setIsDecrypting(false);
    setVaultMetadata({});
    setCurrentStep(1);
    setPrevSelectedFile(null);
    setFileValidationError(null);
  }, [reset]);

  // Handle decrypt another
  const handleDecryptAnother = useCallback(() => {
    handleReset();
    // UI reset to step 1 provides clear visual feedback
  }, [handleReset]);

  // Handle key selection
  const handleKeyChange = useCallback(
    (keyId: string) => {
      setKeyId(keyId);
      setVaultMetadata((prev) => ({
        ...prev,
        keyLabel: keyId,
      }));
    },
    [setKeyId],
  );

  // Handle file validation errors from FileDropZone
  const handleFileValidationError = useCallback((error: CommandError) => {
    setFileValidationError(error);
  }, []);

  return {
    // State
    selectedFile,
    selectedKeyId,
    passphrase,
    outputPath,
    passphraseAttempts,
    isDecrypting,
    showAdvancedOptions,
    setShowAdvancedOptions,
    vaultMetadata,

    // From useFileDecryption
    isLoading,
    error: fileValidationError || error, // File validation errors take precedence
    success,
    progress,
    clearError: () => {
      clearError();
      setFileValidationError(null);
    },
    clearSelection,
    setPassphrase,
    setOutputPath,

    // Computed
    currentStep,

    // Handlers
    handleFileSelected,
    handleDecryption,
    handleReset,
    handleDecryptAnother,
    handleKeyChange,
    handleFileValidationError,

    // Navigation handlers
    handleStepNavigation,
    canNavigateToStep,
  };
};
