import React, { useState } from 'react';
import { X, Database, Loader2 } from 'lucide-react';
import { useVault } from '../../contexts/VaultContext';

interface CreateVaultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Dialog for creating a new vault
 */
export const CreateVaultDialog: React.FC<CreateVaultDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createVault } = useVault();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Vault name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await createVault(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create vault');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    if (!isCreating) {
      setName('');
      setDescription('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={handleCancel} />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Create New Vault</h2>
            </div>
            <button
              onClick={handleCancel}
              disabled={isCreating}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="vault-name" className="block text-sm font-medium text-gray-700 mb-2">
                Vault Name *
              </label>
              <input
                id="vault-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isCreating}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                placeholder="e.g., Personal Documents"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="vault-description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Description (optional)
              </label>
              <textarea
                id="vault-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isCreating}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 resize-none"
                placeholder="Brief description of what this vault is for..."
                rows={3}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isCreating || !name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Vault'
                )}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCreating}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
