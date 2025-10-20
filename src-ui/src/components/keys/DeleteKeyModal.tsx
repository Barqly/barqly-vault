import React, { useState, useRef } from 'react';
import { X, AlertTriangle, Key, Fingerprint } from 'lucide-react';
import { commands, GlobalKey } from '../../bindings';
import { logger } from '../../lib/logger';

interface DeleteKeyModalProps {
  isOpen: boolean;
  keyRef: GlobalKey;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Modal for deleting unattached keys (PreActivation state)
 * Always immediate deletion - no 30-day grace period
 * Simpler than DeactivateKeyModal (no checkbox, always permanent)
 */
export const DeleteKeyModal: React.FC<DeleteKeyModalProps> = ({
  isOpen,
  keyRef,
  onClose,
  onSuccess,
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for focus trap
  const inputRef = useRef<HTMLInputElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  const expectedConfirmation = `DELETE ${keyRef.label}`;
  const isConfirmationValid = confirmationText === expectedConfirmation;
  const isPassphrase = keyRef.key_type.type === 'Passphrase';

  const handleDelete = async () => {
    // Frontend validation
    if (!isConfirmationValid) {
      setError(`Please type exactly: ${expectedConfirmation}`);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await commands.deleteKey({
        key_id: keyRef.id,
        reason: null,
      });

      if (result.status === 'error') {
        throw new Error(result.error.message || 'Failed to delete key');
      }

      logger.info('DeleteKeyModal', 'Key deleted successfully', {
        key_id: keyRef.id,
        new_status: result.data.new_status,
      });

      // Close modal and refresh
      onClose();
      onSuccess();
    } catch (err: any) {
      logger.error('DeleteKeyModal', 'Failed to delete key', err);
      setError(err.message || 'Failed to delete key');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (!isProcessing) {
      setConfirmationText('');
      setError(null);
      onClose();
    }
  };

  // Handle Enter key to submit form
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isConfirmationValid && !isProcessing) {
      e.preventDefault();
      handleDelete();
    }
  };

  // Focus trap: cycle focus within modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const isDeleteEnabled = isConfirmationValid && !isProcessing;

    // If going backwards (Shift+Tab) from input field
    if (e.shiftKey && document.activeElement === inputRef.current) {
      e.preventDefault();
      if (isDeleteEnabled && deleteButtonRef.current) {
        deleteButtonRef.current.focus();
      } else {
        // Stay on input if delete button is disabled
        inputRef.current?.focus();
      }
    }
    // If going forward (Tab) from delete button
    else if (!e.shiftKey && document.activeElement === deleteButtonRef.current) {
      e.preventDefault();
      inputRef.current?.focus();
    }
    // If going forward (Tab) from input and delete is disabled
    else if (!e.shiftKey && document.activeElement === inputRef.current && !isDeleteEnabled) {
      e.preventDefault();
      // Stay on input field if delete button is disabled
      inputRef.current?.focus();
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
          style={{ maxWidth: '500px' }}
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
              <h2 className="text-xl font-semibold text-main">Delete Unused Key?</h2>
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
                Not attached to any vaults • Never been used
              </p>
            </div>

            {/* Warning - Permanent Action */}
            <div
              className="rounded-lg p-4"
              style={{
                borderColor: 'rgba(239, 68, 68, 0.3)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-main">This action cannot be undone</p>
                  <p className="text-sm text-secondary mt-1">
                    This key will be permanently removed from your registry. Since it has never been
                    used, this is a safe operation.
                  </p>
                </div>
              </div>
            </div>

            {/* Typed Confirmation */}
            <div>
              <label className="block text-sm font-medium text-main mb-2">
                Type{' '}
                <code className="px-1.5 py-0.5 bg-hover rounded text-xs font-mono">
                  {expectedConfirmation}
                </code>{' '}
                to confirm:
              </label>
              <input
                ref={inputRef}
                type="text"
                value={confirmationText}
                onChange={(e) => {
                  setConfirmationText(e.target.value);
                  setError(null);
                }}
                onKeyPress={handleKeyPress}
                disabled={isProcessing}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-input text-main ${
                  confirmationText && !isConfirmationValid
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-default focus:ring-blue-500'
                }`}
                placeholder={expectedConfirmation}
                autoComplete="off"
                autoFocus
              />
              {confirmationText && !isConfirmationValid && (
                <p className="text-xs text-red-600 mt-1">Text must match exactly</p>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Footer - Delete button spans width, Cancel on right */}
          <div className="flex gap-3 p-6 border-t border-default">
            <button
              ref={deleteButtonRef}
              onClick={handleDelete}
              disabled={isProcessing || !isConfirmationValid}
              className="flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-default flex items-center justify-center gap-2 border"
              style={
                !(isProcessing || !isConfirmationValid)
                  ? { backgroundColor: '#1D4ED8', color: '#ffffff', borderColor: '#1D4ED8' }
                  : {
                      backgroundColor: 'rgb(var(--surface-hover))',
                      color: 'rgb(var(--text-muted))',
                      borderColor: 'rgb(var(--border-default))',
                    }
              }
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#1E40AF';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#1D4ED8';
                }
              }}
            >
              {isProcessing ? 'Deleting...' : 'Delete Permanently'}
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
