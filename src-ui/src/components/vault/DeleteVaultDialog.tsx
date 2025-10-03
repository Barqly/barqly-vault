import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

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

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmationText('');
      setIsDeleting(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900">Delete Vault</h2>
          </div>
          <button
            onClick={handleCancel}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-700 mb-4">
            You are about to delete{' '}
            <span className="font-medium text-slate-900">"{vaultName}"</span>.
          </p>
          <p className="text-sm text-slate-600 mb-4">
            This will permanently delete the encrypted vault file (.age) and its manifest. This
            action cannot be undone.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800 font-medium mb-2">⚠️ Important:</p>
            <p className="text-sm text-red-700">
              All data in this vault will be permanently lost. Make sure you have backups if needed.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmation" className="block text-sm font-medium text-slate-700">
              Type <span className="font-mono text-red-600">{expectedText}</span> to confirm:
            </label>
            <input
              id="confirmation"
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={isDeleting}
              placeholder={expectedText}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-50 disabled:text-slate-500"
              autoFocus
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={handleCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isConfirmationValid || isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
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
        </div>
      </div>
    </div>
  );
};

export default DeleteVaultDialog;
