import React, { useState, useEffect, useRef } from 'react';
import { Archive, X, Loader2, AlertTriangle } from 'lucide-react';

interface DeleteVaultDialogProps {
  isOpen: boolean;
  vaultName: string;
  vaultId: string;
  onConfirm: (vaultId: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * Dialog to confirm vault deletion with typed confirmation
 * User must type "DELETE {Vault Name}" to enable deletion
 */
const DeleteVaultDialog: React.FC<DeleteVaultDialogProps> = ({
  isOpen,
  vaultName,
  vaultId,
  onConfirm,
  onCancel,
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const firstFocusableRef = useRef<HTMLInputElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmationText('');
      setIsDeleting(false);
    } else {
      // Auto-focus confirmation input when dialog opens
      firstFocusableRef.current?.focus();
    }
  }, [isOpen]);

  const expectedText = `DELETE ${vaultName}`;
  const isConfirmationValid = confirmationText.trim().toLowerCase() === expectedText.toLowerCase();

  const handleConfirm = async () => {
    if (!isConfirmationValid) return;

    setIsDeleting(true);
    try {
      await onConfirm(vaultId);
      // Success - dialog will close via parent
    } catch (error) {
      // Error handling is done by parent
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    if (!isDeleting) {
      onCancel();
    }
  };

  // Focus trap: cycle focus within modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const isRemoveEnabled = isConfirmationValid && !isDeleting;

    // If going backwards (Shift+Tab) from first field
    if (e.shiftKey && document.activeElement === firstFocusableRef.current) {
      e.preventDefault();
      if (isRemoveEnabled && lastFocusableRef.current) {
        lastFocusableRef.current.focus();
      } else {
        firstFocusableRef.current?.focus();
      }
    }
    // If going forward (Tab) from last enabled element
    else if (!e.shiftKey) {
      if (isRemoveEnabled && document.activeElement === lastFocusableRef.current) {
        e.preventDefault();
        firstFocusableRef.current?.focus();
      } else if (!isRemoveEnabled && document.activeElement === firstFocusableRef.current) {
        e.preventDefault();
        firstFocusableRef.current?.focus();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={handleCancel} />

      {/* Centered Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-elevated rounded-lg shadow-xl max-w-md w-full pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-default">
            <div className="flex items-center gap-3">
              {/* Vault icon with brand blue (matches Delete Key pattern) */}
              <div
                className="rounded-lg p-2 flex-shrink-0"
                style={{
                  backgroundColor: 'rgba(29, 78, 216, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                }}
              >
                <Archive className="h-5 w-5" style={{ color: '#3B82F6' }} />
              </div>
              <h2 className="text-xl font-semibold text-main">Delete Vault</h2>
            </div>
            <button
              onClick={handleCancel}
              disabled={isDeleting}
              className="text-muted hover:text-secondary transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6" onKeyDown={handleKeyDown}>
            <p className="text-main mb-4">
              You are about to delete <span className="font-medium text-main">"{vaultName}"</span>.
            </p>
            <p className="text-sm text-secondary mb-4">
              This will permanently delete the encrypted vault file (.age) and its manifest. This
              action cannot be undone.
            </p>

            {/* Warning Box - Deep red styling (matches Delete Key modal) */}
            <div
              className="rounded-lg p-4 mb-4"
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
                    All data in this vault will be permanently lost. Make sure you have backups if
                    needed.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmation" className="block text-sm font-medium text-main">
                Type{' '}
                <code className="px-1.5 py-0.5 bg-hover rounded text-xs font-mono text-main">
                  {expectedText}
                </code>{' '}
                to confirm:
              </label>
              <input
                ref={firstFocusableRef}
                id="confirmation"
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                disabled={isDeleting}
                placeholder={expectedText}
                className="w-full px-3 py-2 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input text-main disabled:opacity-50"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 p-6 border-t border-default">
            <button
              ref={lastFocusableRef}
              onClick={handleConfirm}
              disabled={!isConfirmationValid || isDeleting}
              className="flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-default flex items-center justify-center gap-2 border"
              style={
                !(isDeleting || !isConfirmationValid)
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
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Remove Vault'
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isDeleting}
              tabIndex={-1}
              className="px-4 py-2 text-main bg-hover rounded-lg hover:bg-elevated transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteVaultDialog;
