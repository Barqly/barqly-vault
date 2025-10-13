import { useState, useEffect, useCallback } from 'react';
import { documentDir, join } from '@tauri-apps/api/path';
import { useFileDecryption } from './useFileDecryption';
import type { ErrorCode, CommandError, KeyReference } from '../bindings';
import { createCommandError } from '../lib/errors/command-error';
import { useVault } from '../contexts/VaultContext';
import { commands } from '../bindings';

interface VaultMetadata {
  creationDate?: string;
  keyLabel?: string;
}

interface RecoveredItems {
  manifest?: any; // VaultManifest type when available
  keys?: string[];
  files?: string[];
}

/**
 * Custom hook to manage the decryption workflow state and logic
 * Extracted from DecryptPage to reduce component size
 */
export const useDecryptionWorkflow = () => {
  const fileDecryptionHook = useFileDecryption();
  const { vaults } = useVault();

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

  // Vault recognition state
  const [isKnownVault, setIsKnownVault] = useState<boolean | null>(null);
  const [detectedVaultName, setDetectedVaultName] = useState<string | null>(null);
  const [detectedVaultId, setDetectedVaultId] = useState<string | null>(null);

  // Key discovery state
  const [isDiscoveringKeys, setIsDiscoveringKeys] = useState(false);
  const [availableKeys, setAvailableKeys] = useState<KeyReference[]>([]);
  const [suggestedKeys, setSuggestedKeys] = useState<KeyReference[]>([]);
  const [keyAttempts, setKeyAttempts] = useState<Map<string, boolean>>(new Map());

  // Recovery state
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [willRestoreManifest, setWillRestoreManifest] = useState(false);
  const [willRestoreKeys, setWillRestoreKeys] = useState(false);
  const [recoveredItems, setRecoveredItems] = useState<RecoveredItems | null>(null);

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

  // Check if vault is recognized using backend API
  const checkVaultRecognition = useCallback(async (filePath: string) => {
    try {
      // Use backend API to analyze encrypted vault file
      const analysisResult = await commands.analyzeEncryptedVault({
        encrypted_file_path: filePath,
      });

      if (analysisResult.status === 'error') {
        throw new Error(analysisResult.error.message);
      }

      const vaultInfo = analysisResult.data;

      // Set vault information from backend analysis
      setDetectedVaultName(vaultInfo.vault_name); // Already desanitized by backend
      setDetectedVaultId(vaultInfo.vault_id);
      setIsKnownVault(vaultInfo.manifest_exists);
      setIsRecoveryMode(vaultInfo.is_recovery_mode);

      // If normal mode, populate available keys from manifest
      if (!vaultInfo.is_recovery_mode && vaultInfo.associated_keys.length > 0) {
        setAvailableKeys(vaultInfo.associated_keys);
        setSuggestedKeys(vaultInfo.associated_keys);
      } else if (vaultInfo.is_recovery_mode) {
        // Recovery mode: Get ALL available keys
        const allKeysResult = await commands.listUnifiedKeys({ type: 'All' });

        if (allKeysResult.status === 'ok') {
          // Convert KeyInfo to KeyReference format
          const keyReferences: KeyReference[] = allKeysResult.data.map((keyInfo) => ({
            id: keyInfo.id,
            label: keyInfo.label,
            type: keyInfo.key_type.type,
            data: keyInfo.key_type.data,
            lifecycle_status: keyInfo.lifecycle_status,
            created_at: keyInfo.created_at,
            last_used: keyInfo.last_used,
          }));

          setAvailableKeys(keyReferences);
          setSuggestedKeys(keyReferences);
        }
      }

      // Extract creation date from analysis
      if (vaultInfo.creation_date) {
        setVaultMetadata((prev) => ({
          ...prev,
          creationDate: vaultInfo.creation_date || undefined,
        }));
      }
    } catch (error) {
      console.error('[DecryptionWorkflow] Error checking vault recognition:', error);
      setIsKnownVault(false);
      setIsRecoveryMode(true);
    }
  }, []);

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

        // Check if vault is recognized (also populates creation date and keys)
        await checkVaultRecognition(filePath);

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
    [setSelectedFile, clearError, checkVaultRecognition],
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
      const result = await decryptFile();

      // Check if recovery items were restored (backend automatically does this)
      if (isRecoveryMode && result) {
        // In recovery mode, backend automatically:
        // - Restores vault manifest if missing
        // - Imports keys from bundle
        // - Extracts all files
        setRecoveredItems({
          manifest: detectedVaultName ? { name: detectedVaultName } : undefined,
          keys: ['passphrase key'], // Backend will have imported these
          files: success?.extracted_files || [],
        });
        setWillRestoreManifest(true);
        setWillRestoreKeys(true);
      }

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
  }, [
    selectedKeyId,
    passphrase,
    outputPath,
    decryptFile,
    isRecoveryMode,
    detectedVaultName,
    success,
  ]);

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
    // Reset recovery state
    setIsKnownVault(null);
    setDetectedVaultName(null);
    setDetectedVaultId(null);
    setIsDiscoveringKeys(false);
    setAvailableKeys([]);
    setSuggestedKeys([]);
    setKeyAttempts(new Map());
    setIsRecoveryMode(false);
    setWillRestoreManifest(false);
    setWillRestoreKeys(false);
    setRecoveredItems(null);
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

    // Vault recognition state
    isKnownVault,
    detectedVaultName,
    detectedVaultId,

    // Key discovery state
    isDiscoveringKeys,
    availableKeys,
    suggestedKeys,
    keyAttempts,

    // Recovery state
    isRecoveryMode,
    willRestoreManifest,
    willRestoreKeys,
    recoveredItems,

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

    // Setters for components
    setAvailableKeys,
    setIsDiscoveringKeys,
  };
};
