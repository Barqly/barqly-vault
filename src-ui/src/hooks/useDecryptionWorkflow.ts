import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { useFileDecryption } from './useFileDecryption';
import type { CommandError } from '../bindings';
import { commands } from '../bindings';
import { createCommandError } from '../lib/errors/command-error';
import { confirm } from '@tauri-apps/plugin-dialog';
import { executeDecryptionWithProgress } from '../lib/decryption/decryption-workflow';
import { prepareDecryptionInput } from '../lib/validation/decryption-validation';
import { useVault } from '../contexts/VaultContext';
import type { KeyReference } from '../lib/key-types';
import { logger } from '../lib/logger';

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
  const { globalKeyCache, isInitialized: vaultContextInitialized } = useVault();

  const {
    setSelectedFile,
    setKeyId,
    setPassphrase,
    setOutputPath,
    setForceOverwrite,
    decryptFile,
    isLoading,
    error,
    success: decryptionSuccess,
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
  const [conflictResolveSuccess, setConflictResolveSuccess] = useState<any>(null); // Track successful retry after conflict

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
  const checkVaultRecognition = useCallback(
    async (filePath: string) => {
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
          // Recovery mode: Use global key cache from VaultContext (cache-first approach)
          // Filter out destroyed keys (not usable)
          const usableKeys = globalKeyCache.filter((k) => k.lifecycle_status !== 'destroyed');

          if (usableKeys.length > 0) {
            // Transform GlobalKey to KeyReference format
            const registeredKeys = usableKeys.map((keyInfo) => ({
              id: keyInfo.id,
              label: keyInfo.label,
              type: keyInfo.key_type.type,
              data: keyInfo.key_type.data,
              lifecycle_status: keyInfo.lifecycle_status,
              created_at: keyInfo.created_at,
              last_used: keyInfo.last_used,
            }));
            setAvailableKeys(registeredKeys);
            setSuggestedKeys(registeredKeys);
          } else if (!vaultContextInitialized) {
            // VaultContext might still be loading, fall back to direct API call
            const allKeysResult = await commands.listUnifiedKeys({ type: 'All' });
            if (allKeysResult.status === 'ok') {
              const usableGlobalKeys = allKeysResult.data.filter(
                (k) => k.lifecycle_status !== 'destroyed',
              );
              const registeredKeys = usableGlobalKeys.map((keyInfo) => ({
                id: keyInfo.id,
                label: keyInfo.label,
                type: keyInfo.key_type.type,
                data: keyInfo.key_type.data,
                lifecycle_status: keyInfo.lifecycle_status,
                created_at: keyInfo.created_at,
                last_used: keyInfo.last_used,
              }));
              setAvailableKeys(registeredKeys);
              setSuggestedKeys(registeredKeys);
            } else {
              // No keys in registry
              setAvailableKeys([]);
              setSuggestedKeys([]);
            }
          } else {
            // VaultContext is initialized but cache is empty
            setAvailableKeys([]);
            setSuggestedKeys([]);
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
        logger.error('useDecryptionWorkflow', 'Error checking vault recognition', error as Error);
        setIsKnownVault(false);
        setIsRecoveryMode(true);
      }
    },
    [globalKeyCache, vaultContextInitialized],
  );

  // Sync recovery keys with global cache when in recovery mode
  useEffect(() => {
    if (isRecoveryMode && selectedFile && vaultContextInitialized) {
      // Use globalKeyCache directly (reactive to cache updates)
      // Filter out destroyed keys (not usable for recovery)
      const usableKeys = globalKeyCache.filter((k) => k.lifecycle_status !== 'destroyed');

      if (usableKeys.length > 0) {
        // Transform GlobalKey to KeyReference format
        const registeredKeys = usableKeys.map((keyInfo) => ({
          id: keyInfo.id,
          label: keyInfo.label,
          type: keyInfo.key_type.type,
          data: keyInfo.key_type.data,
          lifecycle_status: keyInfo.lifecycle_status,
          created_at: keyInfo.created_at,
          last_used: keyInfo.last_used,
        }));
        setAvailableKeys(registeredKeys);
        setSuggestedKeys(registeredKeys);
      } else {
        // Cache is empty
        setAvailableKeys([]);
        setSuggestedKeys([]);
      }
    }
  }, [isRecoveryMode, selectedFile, vaultContextInitialized, globalKeyCache]);

  // Handle file selection
  const handleFileSelected = useCallback(
    async (paths: string[]) => {
      // Clear any previous file validation errors
      setFileValidationError(null);
      clearError(); // Clear any existing errors from useFileDecryption

      if (paths.length !== 1) {
        const error = createCommandError(
          'INVALID_INPUT',
          'Invalid file selection',
          'Please select only one encrypted .age file',
        );
        setFileValidationError(error);
        return;
      }

      const filePath = paths[0];
      if (!filePath.toLowerCase().endsWith('.age')) {
        const error = createCommandError(
          'INVALID_INPUT',
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
        logger.error('useDecryptionWorkflow', 'File selection error', error as Error);
        const commandError = createCommandError(
          'INTERNAL_ERROR',
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
    if (!selectedKeyId || !passphrase) {
      const error = createCommandError(
        'MISSING_PARAMETER',
        'Missing information',
        'Please select a key and enter your passphrase',
      );
      setFileValidationError(error);
      return;
    }
    // outputPath is optional - backend generates default if null

    // Set decrypting state immediately for instant UI feedback
    setIsDecrypting(true);

    // Small delay to ensure UI updates before heavy operation
    await new Promise((resolve) => setTimeout(resolve, 10));

    try {
      // Call backend API directly to intercept conflict response before it becomes "success"
      const decryptionInput = prepareDecryptionInput({
        selectedFile,
        selectedKeyId,
        passphrase,
        outputPath,
        forceOverwrite: null, // First attempt - let backend detect conflict
      });

      const result = await executeDecryptionWithProgress(decryptionInput, () => {
        // Progress callback - no-op as progress is handled via state
      });

      // Check for conflict: output_exists is true but no files extracted
      if (result && result.output_exists && result.extracted_files.length === 0) {
        // Show conflict dialog: Replace or Cancel
        const shouldReplace = await confirm(
          `The folder for "${detectedVaultName || 'vault'}" already exists.\n\nWould you like to replace it with the newly decrypted files?`,
          {
            title: 'Folder Already Exists',
            kind: 'warning',
            okLabel: 'Replace Existing',
            cancelLabel: 'Cancel',
          },
        );

        if (!shouldReplace) {
          // User cancelled - stay on decrypt page
          setIsDecrypting(false);
          return;
        }

        // User chose Replace - retry with force_overwrite: true

        // Clear any existing success state to show progress view
        setConflictResolveSuccess(null);
        setIsDecrypting(true);
        await new Promise((resolve) => setTimeout(resolve, 10));

        try {
          // Prepare decryption input with force_overwrite explicitly set to true
          const decryptionInput = prepareDecryptionInput({
            selectedFile,
            selectedKeyId,
            passphrase,
            outputPath,
            forceOverwrite: true, // Explicitly set to true for replacement
          });

          // Call backend API directly with explicit parameters
          const retryResult = await executeDecryptionWithProgress(decryptionInput, () => {
            // Progress callback - no-op as progress is handled via state
          });

          // Update state to reflect success
          setForceOverwrite(true);
          setConflictResolveSuccess(retryResult);

          // Check if recovery items were restored (backend automatically does this)
          if (isRecoveryMode && retryResult) {
            setRecoveredItems({
              manifest: detectedVaultName ? { name: detectedVaultName } : undefined,
              keys: ['passphrase key'], // Backend will have imported these
              files: retryResult.extracted_files || [],
            });
            setWillRestoreManifest(true);
            setWillRestoreKeys(true);
          }
        } catch (err) {
          logger.error('useDecryptionWorkflow', 'Retry decryption error', err as Error);

          // Set error state for retry failures too
          const commandError =
            err && typeof err === 'object' && 'code' in err
              ? (err as CommandError)
              : createCommandError(
                  'DECRYPTION_FAILED',
                  err instanceof Error ? err.message : 'Decryption failed',
                  'Please check your key and try again',
                );

          setFileValidationError(commandError);
          setIsDecrypting(false);
          return;
        } finally {
          setIsDecrypting(false);
        }
        return;
      }

      // No conflict - successful decryption
      setConflictResolveSuccess(result);

      // Check if recovery items were restored (backend automatically does this)
      if (isRecoveryMode && result) {
        // In recovery mode, backend automatically:
        // - Restores vault manifest if missing
        // - Imports keys from bundle
        // - Extracts all files
        setRecoveredItems({
          manifest: detectedVaultName ? { name: detectedVaultName } : undefined,
          keys: ['passphrase key'], // Backend will have imported these
          files: result.extracted_files || [],
        });
        setWillRestoreManifest(true);
        setWillRestoreKeys(true);
      }

      // Success panel provides comprehensive feedback
    } catch (err) {
      logger.error('useDecryptionWorkflow', 'Decryption error', err as Error);

      // Increment passphrase attempts for tracking
      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof (err as any).message === 'string'
      ) {
        const message = (err as any).message.toLowerCase();

        if (message.includes('passphrase') || message.includes('pin')) {
          setPassphraseAttempts((prev) => prev + 1);
        }
      }

      // Set error state so DecryptError view can display it
      // The error is already a CommandError from executeDecryptionWithProgress
      const commandError =
        err && typeof err === 'object' && 'code' in err
          ? (err as CommandError)
          : createCommandError(
              'DECRYPTION_FAILED',
              err instanceof Error ? err.message : 'Decryption failed',
              'Please check your key and try again',
            );

      setFileValidationError(commandError);
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
    setForceOverwrite,
    setOutputPath,
  ]);

  // Generate default output path
  // Path generation removed - backend now handles default paths
  // Backend generates: ~/Documents/Barqly-Recovery/{vault_name}/

  // Handle reset
  const handleReset = useCallback(() => {
    reset();
    setPassphraseAttempts(0);
    setIsDecrypting(false);
    setVaultMetadata({});
    setCurrentStep(1);
    setPrevSelectedFile(null);
    setFileValidationError(null);
    setConflictResolveSuccess(null);
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
    setForceOverwrite(null);
  }, [reset, setForceOverwrite]);

  // Handle decrypt another
  const handleDecryptAnother = useCallback(() => {
    handleReset();
    // UI reset to step 1 provides clear visual feedback
  }, [handleReset]);

  // Handle try again after error (go back to key selection, keep file)
  const handleTryAgain = useCallback(() => {
    // Clear error and passphrase
    setFileValidationError(null);
    clearError();
    setPassphrase('');
    setKeyId('');
    // Go back to step 2 (Choose Key) - keep the selected file
    handleStepNavigation(2);
  }, [setPassphrase, setKeyId, clearError, handleStepNavigation]);

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

  // Determine selected key type for touch prompt
  const selectedKeyType = React.useMemo(() => {
    if (!selectedKeyId) return null;

    // First check in availableKeys (recovery mode)
    const recoveryKey = availableKeys.find((k) => k.id === selectedKeyId);
    if (recoveryKey) {
      return recoveryKey.type; // 'YubiKey' or 'Passphrase'
    }

    // Then check in globalKeyCache (normal mode)
    const globalKey = globalKeyCache.find((k) => k.id === selectedKeyId);
    if (globalKey) {
      return globalKey.key_type.type; // 'YubiKey' or 'Passphrase'
    }

    return null;
  }, [selectedKeyId, availableKeys, globalKeyCache]);

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
    success: conflictResolveSuccess || decryptionSuccess, // Use conflict resolution success if available
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
    selectedKeyType, // For YubiKey touch prompt

    // Handlers
    handleFileSelected,
    handleDecryption,
    handleReset,
    handleDecryptAnother,
    handleTryAgain,
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
