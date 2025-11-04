import React from 'react';
import { X, Fingerprint } from 'lucide-react';
import { YubiKeyDetectionStep } from './YubiKeyDetectionStep';
import { YubiKeyNewForm } from './YubiKeyNewForm';
import { YubiKeyReusedWithoutTdesForm } from './YubiKeyReusedWithoutTdesForm';
import { YubiKeyReusedWithTdesForm } from './YubiKeyReusedWithTdesForm';
import { YubiKeyOrphanedForm } from './YubiKeyOrphanedForm';
import { useYubiKeyRegistration } from './useYubiKeyRegistration';

interface YubiKeyRegistryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Dialog for registering YubiKeys to the global registry (vault-agnostic)
 * Handles 4 scenarios: NEW, REUSED without TDES, REUSED with TDES, ORPHANED
 *
 * Refactored into clean component architecture:
 * - YubiKeyDetectionStep: YubiKey selection UI
 * - YubiKeyNewForm: Scenario 1 (factory default)
 * - YubiKeyReusedWithoutTdesForm: Scenario 2 (partial init)
 * - YubiKeyReusedWithTdesForm: Scenario 3 (needs age key)
 * - YubiKeyOrphanedForm: Scenario 4 (already has key)
 * - useYubiKeyRegistration: State management and business logic
 * - yubikey-helpers: Utility functions
 */
export const YubiKeyRegistryDialog: React.FC<YubiKeyRegistryDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    // State
    yubikeys,
    selectedKey,
    label,
    setLabel,
    pin,
    setPin,
    confirmPin,
    setConfirmPin,
    recoveryPin,
    setRecoveryPin,
    confirmRecoveryPin,
    setConfirmRecoveryPin,
    isLoading,
    isSetupInProgress,
    error,
    step,
    isCopied,
    showSecurityTips,
    setShowSecurityTips,
    showPin,
    setShowPin,
    showRecoveryPin,
    setShowRecoveryPin,
    showTouchPrompt,
    setError,
    setStep,
    formReadOnly,
    // Refs
    firstFocusableRef,
    lastFocusableRef,
    refreshButtonRef,
    firstYubiKeyButtonRef,
    // Handlers
    detectYubiKeys,
    handleSetup,
    handleCancel,
    handleCopyPublicKey,
    handleSelectKey,
    handleKeyDown,
    handleBackdropClick,
  } = useYubiKeyRegistration({ isOpen, onClose, onSuccess });

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur - progressive dismissal */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
        onClick={handleBackdropClick}
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none">
        <div
          className="bg-elevated rounded-lg shadow-xl w-full pointer-events-auto"
          style={{ maxWidth: '600px', border: '1px solid #ffd4a3' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-default">
            <div className="flex items-center gap-3">
              <div
                className="rounded-lg p-2 flex-shrink-0"
                style={{
                  backgroundColor: 'rgba(249, 139, 28, 0.08)',
                  border: '1px solid #ffd4a3',
                }}
              >
                <Fingerprint className="h-5 w-5" style={{ color: '#F98B1C' }} />
              </div>
              <h2 className="text-xl font-semibold text-main">Register YubiKey</h2>
            </div>
            <button
              onClick={handleCancel}
              disabled={isSetupInProgress}
              className="text-muted hover:text-secondary transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6">
            {/* Detection Step */}
            {step === 'detect' && (
              <YubiKeyDetectionStep
                isLoading={isLoading}
                yubikeys={yubikeys}
                selectedKey={selectedKey}
                error={error}
                onRefresh={detectYubiKeys}
                onCancel={handleCancel}
                onSelectKey={handleSelectKey}
                refreshButtonRef={refreshButtonRef}
                firstYubiKeyButtonRef={firstYubiKeyButtonRef}
              />
            )}

            {/* Setup Step - Scenario 1: NEW YubiKey */}
            {step === 'setup' && selectedKey && selectedKey.state === 'new' && (
              <YubiKeyNewForm
                selectedKey={selectedKey}
                label={label}
                setLabel={setLabel}
                pin={pin}
                setPin={setPin}
                confirmPin={confirmPin}
                setConfirmPin={setConfirmPin}
                recoveryPin={recoveryPin}
                setRecoveryPin={setRecoveryPin}
                confirmRecoveryPin={confirmRecoveryPin}
                setConfirmRecoveryPin={setConfirmRecoveryPin}
                showPin={showPin}
                setShowPin={setShowPin}
                showRecoveryPin={showRecoveryPin}
                setShowRecoveryPin={setShowRecoveryPin}
                showSecurityTips={showSecurityTips}
                setShowSecurityTips={setShowSecurityTips}
                isSetupInProgress={isSetupInProgress}
                showTouchPrompt={showTouchPrompt}
                error={error}
                onSubmit={handleSetup}
                onCancel={() => {
                  setStep('detect');
                  setPin('');
                  setConfirmPin('');
                  setRecoveryPin('');
                  setConfirmRecoveryPin('');
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                firstFocusableRef={firstFocusableRef}
                lastFocusableRef={lastFocusableRef}
                formReadOnly={formReadOnly}
              />
            )}

            {/* Setup Step - Scenario 2: REUSED without TDES */}
            {step === 'setup' &&
              selectedKey &&
              selectedKey.state === 'reused' &&
              !selectedKey.has_tdes_protected_mgmt_key && (
                <YubiKeyReusedWithoutTdesForm
                  selectedKey={selectedKey}
                  label={label}
                  setLabel={setLabel}
                  pin={pin}
                  setPin={setPin}
                  showPin={showPin}
                  setShowPin={setShowPin}
                  isSetupInProgress={isSetupInProgress}
                  showTouchPrompt={showTouchPrompt}
                  error={error}
                  onSubmit={handleSetup}
                  onCancel={() => {
                    setStep('detect');
                    setPin('');
                    setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  firstFocusableRef={firstFocusableRef}
                  lastFocusableRef={lastFocusableRef}
                  formReadOnly={formReadOnly}
                />
              )}

            {/* Setup Step - Scenario 3: REUSED with TDES */}
            {step === 'setup' &&
              selectedKey &&
              selectedKey.state === 'reused' &&
              selectedKey.has_tdes_protected_mgmt_key && (
                <YubiKeyReusedWithTdesForm
                  selectedKey={selectedKey}
                  label={label}
                  setLabel={setLabel}
                  pin={pin}
                  setPin={setPin}
                  showPin={showPin}
                  setShowPin={setShowPin}
                  isSetupInProgress={isSetupInProgress}
                  showTouchPrompt={showTouchPrompt}
                  error={error}
                  onSubmit={handleSetup}
                  onCancel={() => {
                    setStep('detect');
                    setPin('');
                    setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  firstFocusableRef={firstFocusableRef}
                  lastFocusableRef={lastFocusableRef}
                  formReadOnly={formReadOnly}
                />
              )}

            {/* Setup Step - Scenario 4: ORPHANED */}
            {step === 'setup' && selectedKey && selectedKey.state === 'orphaned' && (
              <YubiKeyOrphanedForm
                selectedKey={selectedKey}
                label={label}
                setLabel={setLabel}
                isSetupInProgress={isSetupInProgress}
                error={error}
                isCopied={isCopied}
                onSubmit={handleSetup}
                onCancel={() => {
                  setStep('detect');
                  setError(null);
                }}
                onCopyPublicKey={handleCopyPublicKey}
                onKeyDown={handleKeyDown}
                firstFocusableRef={firstFocusableRef}
                lastFocusableRef={lastFocusableRef}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};
