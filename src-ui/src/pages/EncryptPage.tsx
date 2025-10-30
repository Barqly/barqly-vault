import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useVault } from '../contexts/VaultContext';
import { useEncryptionWorkflow } from '../hooks/useEncryptionWorkflow';
import { ErrorMessage } from '../components/ui/error-message';
import type { CommandError } from '../bindings';
import { Lock } from 'lucide-react';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import PageHeader from '../components/common/PageHeader';
import ProgressBar, { ProgressStep } from '../components/ui/ProgressBar';
import ProgressiveEncryptionCards from '../components/encrypt/ProgressiveEncryptionCards';
import EncryptionProgress from '../components/encrypt/EncryptionProgress';
import EncryptionSuccess from '../components/encrypt/EncryptionSuccess';
import AnimatedTransition from '../components/ui/AnimatedTransition';
import AppPrimaryContainer from '../components/layout/AppPrimaryContainer';
import { logger } from '../lib/logger';
// Removed OverwriteConfirmationDialog - using native Tauri dialog instead

const ENCRYPTION_STEPS: ProgressStep[] = [
  { id: 1, label: 'Select Files', description: 'Choose what to encrypt' },
  { id: 2, label: 'Select Vault', description: 'Select vault and verify bundle' },
  { id: 3, label: 'Encrypt', description: 'Ready to encrypt' },
];

/**
 * Main encryption page component
 * Uses step-based progressive disclosure pattern, symmetric with DecryptPage
 */
const EncryptPage: React.FC = () => {
  const navigate = useNavigate();
  const { keyCache } = useVault();
  const {
    // State
    selectedFiles,
    outputPath,
    archiveName,
    isEncrypting,
    bundleContents,
    workflowVault,
    sessionVaultId,

    // From useFileEncryption
    isLoading,
    error,
    success,
    progress,
    clearError,
    clearSelection,

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
    encryptionResult,
  } = useEncryptionWorkflow();

  // Navigation handler for decrypt flow
  const handleNavigateToDecrypt = () => {
    navigate('/decrypt');
  };

  // Debug logging
  logger.debug('EncryptPage', 'Component render state', {
    success: !!success,
    isEncrypting,
    hasEncryptionResult: !!encryptionResult,
  });

  return (
    <div className="min-h-screen bg-app -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
      {/* Page Header with Vault Display - Full Width */}
      <PageHeader
        title="Encrypt Vault"
        icon={Lock}
        skipNavTarget="#main-content"
        showVaultBadge={true}
        vaultName={sessionVaultId && workflowVault ? workflowVault.name : undefined}
        vaultVariant="normal"
        vaultId={sessionVaultId && workflowVault ? workflowVault.id : null}
      />

      {/* Progress Bar - Full Width */}
      <div className="w-full">
        <ProgressBar
          steps={ENCRYPTION_STEPS}
          currentStep={currentStep}
          completedSteps={
            new Set(
              Array.from({ length: currentStep - 1 }, (_, i) => i + 1).concat(
                // Mark step 3 as completed when encryption is successful
                encryptionResult && !isEncrypting ? [3] : [],
              ),
            )
          }
          onStepClick={undefined}
          isClickable={false}
          variant="compact"
        />
      </div>

      {/* Main content - Centered Container */}
      <AppPrimaryContainer id="main-content">
        <div className="mt-6 space-y-6">
          {/* Error display */}
          {error && !isEncrypting && (
            <ErrorMessage error={error} showRecoveryGuidance={true} onClose={clearError} />
          )}

          {/* Success display with animation */}
          <AnimatedTransition show={!!encryptionResult && !isEncrypting} duration={400}>
            {encryptionResult && !isEncrypting && workflowVault && (
              <>
                <EncryptionSuccess
                  {...encryptionResult}
                  vaultName={workflowVault.name}
                  recipientCount={(keyCache.get(workflowVault.id) || []).length}
                  archiveName={archiveName}
                  onEncryptMore={handleEncryptAnother}
                  onNavigateToDecrypt={handleNavigateToDecrypt}
                />
                {/* Help section - also shown on success */}
                <CollapsibleHelp triggerText="How Encryption Works" context="encrypt" />
              </>
            )}
          </AnimatedTransition>

          {/* Progress display - show immediately when encrypting starts */}
          {!encryptionResult && isEncrypting && (
            <>
              <EncryptionProgress
                progress={
                  progress || {
                    operation_id: 'encrypt-init',
                    progress: 0,
                    message: 'Initializing encryption...',
                    details: null,
                    timestamp: new Date().toISOString(),
                    estimated_time_remaining: null,
                    is_complete: false,
                  }
                }
                onCancel={!progress || progress.progress < 90 ? handleReset : undefined}
              />
              {/* Help section - also shown during encryption */}
              <CollapsibleHelp triggerText="How Encryption Works" context="encrypt" />
            </>
          )}

          {/* Main form - show without animation for instant transition */}
          {!encryptionResult && !isEncrypting && (
            <>
              {/* Progressive Card System - Steps 1 and 2 */}
              <ProgressiveEncryptionCards
                currentStep={currentStep}
                selectedFiles={selectedFiles}
                selectedKeyId={null}
                isLoading={isLoading}
                onFilesSelected={handleFilesSelected}
                onClearFiles={clearSelection}
                onFileError={(error) => {
                  // Create inline error for file validation failures
                  const commandError: CommandError = {
                    code: 'INVALID_INPUT',
                    message: error.message,
                    details: null,
                    recovery_guidance: 'Please select valid files and try again',
                    user_actionable: true,
                    trace_id: null,
                    span_id: null,
                  };
                  handleFileValidationError(commandError);
                }}
                onKeyChange={handleKeyChange}
                onStepChange={handleStepNavigation}
                onVaultChange={handleVaultChange}
                onEncrypt={handleEncryption}
                outputPath={outputPath}
                archiveName={archiveName}
                bundleContents={bundleContents}
                workflowVault={workflowVault}
              />

              {/* Help section */}
              <CollapsibleHelp triggerText="How Encryption Works" context="encrypt" />
            </>
          )}
        </div>
      </AppPrimaryContainer>
    </div>
  );
};

export default EncryptPage;
