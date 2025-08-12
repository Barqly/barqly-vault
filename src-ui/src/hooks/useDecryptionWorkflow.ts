import { useState, useEffect, useCallback } from 'react';
import { documentDir, join } from '@tauri-apps/api/path';
import { useFileDecryption } from './useFileDecryption';
import { useToast } from './useToast';

interface VaultMetadata {
  creationDate?: string;
  keyLabel?: string;
}

/**
 * Custom hook to manage the decryption workflow state and logic
 * Extracted from DecryptPage to reduce component size
 */
export const useDecryptionWorkflow = () => {
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
  } = useFileDecryption();

  const { toasts, showError, showInfo, removeToast } = useToast();

  // Workflow state
  const [passphraseAttempts, setPassphraseAttempts] = useState(0);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [vaultMetadata, setVaultMetadata] = useState<VaultMetadata>({});
  const [currentStep, setCurrentStep] = useState(1);

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

      if (paths.length !== 1) {
        showError('Invalid selection', 'Please select only one encrypted .age file');
        return;
      }

      const filePath = paths[0];
      if (!filePath.toLowerCase().endsWith('.age')) {
        showError('Invalid file format', 'Please select a .age encrypted file');
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
        showError(
          'File selection failed',
          error instanceof Error ? error.message : 'Please try again',
        );
      }
    },
    [setSelectedFile, showError],
  );

  // Handle decryption
  const handleDecryption = useCallback(async () => {
    if (!selectedKeyId || !passphrase || !outputPath) {
      showError('Missing information', 'Please complete all required fields');
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
          showError(
            'Backend Update Needed',
            'The decrypt_data command needs to create directories like encrypt_files does',
          );
          return;
        }

        if (message.includes('passphrase')) {
          setPassphraseAttempts((prev) => prev + 1);
        }
      }
    } finally {
      setIsDecrypting(false);
    }
  }, [selectedKeyId, passphrase, outputPath, decryptFile, showError]);

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
    error,
    success,
    progress,
    clearError,
    clearSelection,
    setPassphrase,
    setOutputPath,

    // From useToast
    toasts,
    removeToast,
    showInfo,
    showError,

    // Computed
    currentStep,

    // Handlers
    handleFileSelected,
    handleDecryption,
    handleReset,
    handleDecryptAnother,
    handleKeyChange,

    // Navigation handlers
    handleStepNavigation,
    canNavigateToStep,
  };
};
