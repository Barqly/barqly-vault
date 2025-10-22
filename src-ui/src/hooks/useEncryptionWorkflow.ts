import { useState, useEffect, useCallback } from 'react';
import { documentDir, join } from '@tauri-apps/api/path';
import { useFileEncryption } from './useFileEncryption';
import type { CommandError, VaultSummary } from '../bindings';
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
  recoveryItemsIncluded: string[]; // Track what recovery items were included
}

interface BundleContents {
  userFiles: { count: number; totalSize: number };
  manifest: boolean;
  passphraseKeys: number;
  recoveryGuide: boolean;
  totalSize: number;
}

/**
 * Custom hook to manage the encryption workflow state and logic
 * Mirrors useDecryptionWorkflow architecture exactly for consistency
 */
export const useEncryptionWorkflow = () => {
  const { vaults, keyCache, refreshVaultStatistics } = useVault();
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
  const [bundleContents, setBundleContents] = useState<BundleContents | null>(null);
  const [sessionVaultId, setSessionVaultId] = useState<string | null>(null); // Track vault selected in THIS session
  const [workflowVault, setWorkflowVault] = useState<VaultSummary | null>(null); // Local vault selection for this workflow

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

  // Calculate bundle contents when files are selected or vault keys change
  useEffect(() => {
    if (selectedFiles && workflowVault) {
      // Get keys for the workflow-selected vault, not the global current vault
      const keys = keyCache.get(workflowVault.id) || [];
      const passphraseKeyCount = keys.filter((key) => key.type === 'Passphrase').length;

      setBundleContents({
        userFiles: {
          count: selectedFiles.file_count,
          totalSize: selectedFiles.total_size,
        },
        manifest: true, // Always included by backend
        passphraseKeys: passphraseKeyCount,
        recoveryGuide: true, // Always included by backend
        totalSize: selectedFiles.total_size, // Will be updated after encryption
      });
    }
  }, [selectedFiles, workflowVault, keyCache]);

  // Check if user can navigate to a specific step
  const canNavigateToStep = useCallback(
    (step: number) => {
      switch (step) {
        case 1:
          return true; // Can always go back to step 1
        case 2:
          return !!selectedFiles; // Can go to step 2 if files are selected
        case 3:
          return !!selectedFiles; // Can go to step 3 if files are selected
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
          'INTERNAL_ERROR',
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
        'MISSING_PARAMETER',
        'Missing files',
        'Please select files to encrypt before proceeding',
      );
      setFileValidationError(error);
      return;
    }

    if (!workflowVault) {
      const error = createCommandError(
        'MISSING_PARAMETER',
        'No vault selected',
        'Please select a vault before encrypting files',
      );
      setFileValidationError(error);
      return;
    }

    // Set encrypting state immediately for instant UI feedback
    setIsEncrypting(true);
    setCurrentStep(3); // Move to step 3 to show encrypt is active in stepper

    // Small delay to ensure UI updates before heavy operation
    await new Promise((resolve) => setTimeout(resolve, 10));

    try {
      console.log('[DEBUG] Starting multi-key encryption, isEncrypting=true');
      setStartTime(Date.now());

      const input: EncryptFilesMultiInput = {
        vault_id: workflowVault.id,
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

      // Build list of recovery items included
      const recoveryItemsIncluded: string[] = ['Vault manifest'];
      const keys = keyCache.get(workflowVault.id) || [];
      const passphraseKeyCount = keys.filter((key) => key.type === 'Passphrase').length;
      if (passphraseKeyCount > 0) {
        recoveryItemsIncluded.push(
          `${passphraseKeyCount} passphrase key${passphraseKeyCount > 1 ? 's' : ''} (.enc)`,
        );
      }
      recoveryItemsIncluded.push('RECOVERY.txt guide');

      setEncryptionResult({
        outputPath: response.encrypted_file_path,
        fileName: response.encrypted_file_path.split('/').pop() || 'encrypted-file.age',
        fileCount: selectedFiles.file_count,
        originalSize: selectedFiles.total_size,
        encryptedSize: Math.round(selectedFiles.total_size * 0.75),
        duration,
        keyUsed: response.keys_used.join(', '),
        recoveryItemsIncluded,
      });

      // Refresh statistics cache after successful encryption
      console.log(
        '[DEBUG] Refreshing vault statistics for vault:',
        workflowVault.id,
        workflowVault.name,
      );
      await refreshVaultStatistics(workflowVault.id);
      console.log('[DEBUG] Vault statistics refresh completed');

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
              'INTERNAL_ERROR',
              'Encryption failed',
              err instanceof Error ? err.message : 'Please try again',
            );
      setFileValidationError(commandError);
    } finally {
      console.log('[DEBUG] Finally block: setting isEncrypting=false');
      setIsEncrypting(false);
    }
  }, [selectedFiles, archiveName, outputPath, workflowVault, keyCache, startTime]);

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

  // Set default archive name based on vault name
  useEffect(() => {
    if (workflowVault && !archiveName) {
      setArchiveName(workflowVault.name);
    }
  }, [workflowVault, archiveName]);

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
    setSessionVaultId(null); // Clear session vault selection
    setWorkflowVault(null); // Clear workflow vault selection
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

  // Handle vault change - track session-specific vault selection (called from Step 2)
  const handleVaultChange = useCallback(
    (vaultId: string) => {
      // Find vault in the vaults list
      const selectedVault = vaults.find((v) => v.id === vaultId);
      if (!selectedVault) {
        console.error('[EncryptionWorkflow] Vault not found:', vaultId);
        return;
      }

      // Track that vault was selected in THIS session
      setSessionVaultId(vaultId);
      setWorkflowVault(selectedVault); // Set local workflow vault

      // Reset archive name to match new vault
      setArchiveName('');

      console.log('[EncryptionWorkflow] Vault selected in Step 2', {
        vaultId,
        vaultName: selectedVault.name,
      });
    },
    [vaults],
  );

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
    bundleContents, // Recovery bundle contents
    workflowVault, // Local vault selection for this workflow
    sessionVaultId, // Track if vault was selected in THIS session (for display logic)

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
    handleVaultChange,

    // Navigation handlers
    handleStepNavigation,
    canNavigateToStep,

    // Overwrite confirmation handlers
    handleOverwriteConfirm,
    handleOverwriteCancel,
  };
};
