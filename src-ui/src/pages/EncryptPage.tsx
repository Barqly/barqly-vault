import React, { useEffect } from 'react';
import { useEncryptionWorkflow } from '../hooks/useEncryptionWorkflow';
import { ErrorMessage } from '../components/ui/error-message';
import ToastContainer from '../components/ui/ToastContainer';
import AppHeader from '../components/common/AppHeader';
import StepIndicator from '../components/encrypt/StepIndicator';
import EncryptionSteps from '../components/encrypt/EncryptionSteps';
import EncryptionActions from '../components/encrypt/EncryptionActions';
import EncryptionProgress from '../components/encrypt/EncryptionProgress';
import EncryptionSuccess from '../components/encrypt/EncryptionSuccess';
import HelpSection from '../components/encrypt/HelpSection';

/**
 * Main encryption page component
 * Refactored from 592 lines to ~140 lines by extracting logic and sub-components
 */
const EncryptPage: React.FC = () => {
  const {
    // State
    selectedKeyId,
    setSelectedKeyId,
    outputPath,
    setOutputPath,
    archiveName,
    setArchiveName,
    encryptionResult,

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
    currentStep,

    // Handlers
    handleFilesSelected,
    handleEncrypt,
    handleReset,
    handleDropZoneError,
  } = useEncryptionWorkflow();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleReset();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Unified App Header */}
      <AppHeader screen="encrypt" includeSkipNav={true} skipNavTarget="#main-content" />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6" id="main-content">
        {/* Progress Overlay */}
        {progress && !success && (
          <EncryptionProgress progress={progress} onCancel={handleReset} showCancel={true} />
        )}

        {/* Success State */}
        {success && encryptionResult && (
          <EncryptionSuccess {...encryptionResult} onEncryptMore={handleReset} />
        )}

        {/* Main Form */}
        {!success && !progress && (
          <>
            {/* Step Indicator */}
            <StepIndicator
              currentStep={currentStep}
              selectedFiles={!!selectedFiles}
              selectedKeyId={!!selectedKeyId}
              outputPath={!!outputPath}
            />

            {/* Error Display */}
            {error && (
              <div className="mb-6">
                <ErrorMessage error={error} showRecoveryGuidance={true} onClose={clearError} />
              </div>
            )}

            {/* Multi-Step Form */}
            <EncryptionSteps
              selectedFiles={selectedFiles}
              selectedKeyId={selectedKeyId}
              outputPath={outputPath}
              archiveName={archiveName}
              isLoading={isLoading}
              onFilesSelected={handleFilesSelected}
              onDropZoneError={handleDropZoneError}
              onClearSelection={clearSelection}
              onKeyChange={(keyId) => {
                console.log('[EncryptPage] Key selected:', keyId);
                setSelectedKeyId(keyId);
              }}
              onPathChange={(path) => {
                console.log('[EncryptPage] Output path changed:', path);
                setOutputPath(path);
              }}
              onNameChange={(name) => {
                console.log('[EncryptPage] Archive name changed:', name);
                setArchiveName(name);
              }}
            />

            {/* Action Area */}
            {selectedFiles && (
              <EncryptionActions
                selectedFiles={selectedFiles}
                selectedKeyId={selectedKeyId}
                archiveName={archiveName}
                isReadyToEncrypt={isReadyToEncrypt}
                isLoading={isLoading}
                onReset={handleReset}
                onEncrypt={handleEncrypt}
              />
            )}

            {/* Help Section */}
            <HelpSection />
          </>
        )}
      </div>
    </div>
  );
};

export default EncryptPage;
