import React, { useState, useRef } from 'react';
import { X, AlertCircle, Info, Key, Fingerprint } from 'lucide-react';
import { commands, GlobalKey } from '../../bindings';
import { logger } from '../../lib/logger';

interface DeactivateKeyModalProps {
  isOpen: boolean;
  keyRef: GlobalKey;
  vaultCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Modal for deactivating/deleting keys
 * Supports two modes:
 * 1. Normal deactivation (30-day grace period)
 * 2. Immediate deletion (with typed confirmation)
 */
export const DeactivateKeyModal: React.FC<DeactivateKeyModalProps> = ({
  isOpen,
  keyRef,
  vaultCount,
  onClose,
  onSuccess,
}) => {
  const [deleteImmediately, setDeleteImmediately] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for focus trap
  const deactivateButtonRef = useRef<HTMLButtonElement>(null);

  const expectedConfirmation = `DELETE ${keyRef.label}`;
  const isConfirmationValid = confirmationText === expectedConfirmation;
  const isPassphrase = keyRef.key_type.type === 'Passphrase';
  const _isYubiKey = keyRef.key_type.type === 'YubiKey';

  const handleDeactivate = async () => {
    // Frontend validation for delete immediately
    if (deleteImmediately && !isConfirmationValid) {
      setError(`Please type exactly: ${expectedConfirmation}`);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await commands.deactivateKey({
        key_id: keyRef.id,
        reason: null,
        delete_immediately: deleteImmediately,
      });

      if (result.status === 'error') {
        throw new Error(result.error.message || 'Failed to deactivate key');
      }

      logger.info('DeactivateKeyModal', 'Key deactivated successfully', {
        key_id: keyRef.id,
        new_status: result.data.new_status,
        deleted_immediately: deleteImmediately,
      });

      // Close modal and refresh
      onClose();
      onSuccess();
    } catch (err: any) {
      logger.error('DeactivateKeyModal', 'Failed to deactivate key', err);
      setError(err.message || 'Failed to deactivate key');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (!isProcessing) {
      setDeleteImmediately(false);
      setConfirmationText('');
      setError(null);
      onClose();
    }
  };

  // Focus trap: Keep focus on Deactivate button only (single primary action)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      deactivateButtonRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={handleCancel} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none">
        <div
          className="bg-elevated rounded-lg shadow-xl w-full pointer-events-auto"
          style={{ maxWidth: '550px' }}
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-default">
            <div className="flex items-center gap-3">
              <div
                className="rounded-lg p-2 flex-shrink-0"
                style={{
                  backgroundColor: isPassphrase
                    ? 'rgba(15, 118, 110, 0.1)'
                    : 'rgba(249, 139, 28, 0.08)',
                  border: isPassphrase ? '1px solid #B7E1DD' : '1px solid #ffd4a3',
                }}
              >
                {isPassphrase ? (
                  <Key className="h-5 w-5" style={{ color: '#13897F' }} />
                ) : (
                  <Fingerprint className="h-5 w-5" style={{ color: '#F98B1C' }} />
                )}
              </div>
              <h2 className="text-xl font-semibold text-main">Deactivate Key?</h2>
            </div>
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="text-muted hover:text-secondary transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Key Info */}
            <div>
              <p className="text-lg font-medium text-main">{keyRef.label}</p>
              <p className="text-sm text-secondary mt-1">
                Attached to: {vaultCount} {vaultCount === 1 ? 'vault' : 'vaults'}
              </p>
            </div>

            {/* Grace Period Info */}
            {!deleteImmediately && (
              <div
                className="rounded-lg p-4"
                style={{
                  borderColor: 'rgb(var(--border-default))',
                  backgroundColor: 'rgba(var(--info-panel-bg))',
                  border: '1px solid rgb(var(--border-default))',
                }}
              >
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-heading">30-Day Grace Period</p>
                    <p className="text-sm text-secondary mt-1">
                      You can restore this key within 30 days. After that, it will be permanently
                      removed from your registry.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Encryption Warning */}
            <div
              className="rounded-lg p-4"
              style={{
                borderColor: 'rgba(251, 191, 36, 0.3)',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
              }}
            >
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-main">Important</p>
                  <p className="text-sm text-secondary mt-1">
                    Your encrypted vaults remain encrypted using this key. Any existing backup
                    copies of this key file can still decrypt them.
                  </p>
                </div>
              </div>
            </div>

            {/* Delete Immediately Checkbox */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="delete-immediately"
                checked={deleteImmediately}
                onChange={(e) => {
                  setDeleteImmediately(e.target.checked);
                  setConfirmationText('');
                  setError(null);
                }}
                disabled={isProcessing}
                className="mt-0.5"
              />
              <label htmlFor="delete-immediately" className="text-sm text-main cursor-pointer">
                Delete immediately (cannot undo)
              </label>
            </div>

            {/* Typed Confirmation (conditional) */}
            {deleteImmediately && (
              <div>
                <label className="block text-sm font-medium text-main mb-2">
                  Type{' '}
                  <code className="px-1.5 py-0.5 bg-hover rounded text-xs font-mono">
                    {expectedConfirmation}
                  </code>{' '}
                  to confirm:
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => {
                    setConfirmationText(e.target.value);
                    setError(null);
                  }}
                  disabled={isProcessing}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-input text-main ${
                    confirmationText && !isConfirmationValid
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-default focus:ring-blue-500'
                  }`}
                  placeholder={expectedConfirmation}
                  autoComplete="off"
                />
                {confirmationText && !isConfirmationValid && (
                  <p className="text-xs text-red-600 mt-1">Text must match exactly</p>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Footer - Deactivate button spans width, Cancel on right */}
          <div className="flex gap-3 p-6 border-t border-default">
            <button
              ref={deactivateButtonRef}
              onClick={handleDeactivate}
              disabled={isProcessing || (deleteImmediately && !isConfirmationValid)}
              autoFocus
              className="flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-default flex items-center justify-center gap-2 border"
              style={
                deleteImmediately
                  ? // Red for permanent deletion
                    !(isProcessing || !isConfirmationValid)
                    ? { backgroundColor: '#DC2626', color: '#ffffff', borderColor: '#DC2626' }
                    : {
                        backgroundColor: 'rgb(var(--surface-hover))',
                        color: 'rgb(var(--text-muted))',
                        borderColor: 'rgb(var(--border-default))',
                      }
                  : // Blue for reversible deactivation
                    !isProcessing
                    ? { backgroundColor: '#1D4ED8', color: '#ffffff', borderColor: '#1D4ED8' }
                    : {
                        backgroundColor: 'rgb(var(--surface-hover))',
                        color: 'rgb(var(--text-muted))',
                        borderColor: 'rgb(var(--border-default))',
                      }
              }
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = deleteImmediately ? '#B91C1C' : '#1E40AF';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = deleteImmediately ? '#DC2626' : '#1D4ED8';
                }
              }}
            >
              {isProcessing
                ? 'Processing...'
                : deleteImmediately
                  ? 'Delete Permanently'
                  : 'Deactivate Key'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              tabIndex={-1}
              className="px-4 py-2 text-main bg-hover rounded-lg hover:bg-elevated transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
