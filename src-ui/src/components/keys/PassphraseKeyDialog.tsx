import React, { useState } from 'react';
import { X, Key, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useVault } from '../../contexts/VaultContext';
import { logger } from '../../lib/logger';

interface PassphraseKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Dialog for creating a passphrase key for the current vault
 */
export const PassphraseKeyDialog: React.FC<PassphraseKeyDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentVault, addKeyToVault } = useVault();
  const [label, setLabel] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validatePassphrase = (): string | null => {
    if (!label.trim()) {
      return 'Key label is required';
    }
    if (passphrase.length < 12) {
      return 'Passphrase must be at least 12 characters';
    }
    if (passphrase !== confirmPassphrase) {
      return 'Passphrases do not match';
    }
    // TODO: Backend engineer needs to implement validate_passphrase API
    // See /docs/handoff/passphrase-validation-api.md
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validatePassphrase();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!currentVault) {
      setError('No vault selected');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // TODO: Backend engineer needs to integrate with generate_key command
      // Currently addKeyToVault creates placeholder, needs actual key generation
      // See /docs/handoff/passphrase-key-creation-api.md
      await addKeyToVault('passphrase', label.trim(), { passphrase });

      logger.info('PassphraseKeyDialog', 'Passphrase key created successfully');

      // Clear form
      setLabel('');
      setPassphrase('');
      setConfirmPassphrase('');

      onSuccess?.();
      onClose();
    } catch (err: any) {
      logger.error('PassphraseKeyDialog', 'Failed to create passphrase key', err);
      setError(err.message || 'Failed to create passphrase key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    if (!isCreating) {
      setLabel('');
      setPassphrase('');
      setConfirmPassphrase('');
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
              <Key className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Add Passphrase Key
              </h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Key Label *
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={isCreating}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                placeholder="e.g., Main Password"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passphrase * (min. 12 characters)
              </label>
              <div className="relative">
                <input
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  disabled={isCreating}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="Enter secure passphrase"
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassphrase ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passphrase && passphrase.length < 12 && (
                <p className="text-xs text-red-600 mt-1">
                  {12 - passphrase.length} more characters needed
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Passphrase *
              </label>
              <input
                type={showPassphrase ? 'text' : 'password'}
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                disabled={isCreating}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                placeholder="Re-enter passphrase"
              />
              {confirmPassphrase && passphrase !== confirmPassphrase && (
                <p className="text-xs text-red-600 mt-1">Passphrases do not match</p>
              )}
            </div>

            {/* Security Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Security Tips:</p>
                  <ul className="text-xs mt-1 space-y-0.5">
                    <li>• Use a unique passphrase you haven't used elsewhere</li>
                    <li>• Consider using a passphrase generator</li>
                    <li>• Store it securely (password manager recommended)</li>
                  </ul>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isCreating || !label.trim() || !passphrase || !confirmPassphrase}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Key...
                  </>
                ) : (
                  'Create Passphrase Key'
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