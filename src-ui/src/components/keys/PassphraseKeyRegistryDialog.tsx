import React, { useState, useEffect } from 'react';
import { X, Key, Loader2, Info, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { logger } from '../../lib/logger';
import { commands, PassphraseValidationResult, GenerateKeyInput } from '../../bindings';
import { validateLabel } from '../../lib/sanitization';

interface PassphraseKeyRegistryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Dialog for creating a passphrase key in the global registry (vault-agnostic)
 * Creates keys without vault context for later attachment to vaults
 */
export const PassphraseKeyRegistryDialog: React.FC<PassphraseKeyRegistryDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [label, setLabel] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validation, setValidation] = useState<PassphraseValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false); // Loading state for validation
  const [labelError, setLabelError] = useState<string | null>(null);
  const [showSecurityTips, setShowSecurityTips] = useState(false);

  // Real-time passphrase validation
  useEffect(() => {
    if (!passphrase) {
      setValidation(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidating(true);
      try {
        const result = await commands.validatePassphraseStrength(passphrase);
        if (result.status === 'error') {
          throw new Error(result.error.message || 'Validation failed');
        }
        setValidation(result.data);
      } catch (err) {
        logger.error('PassphraseKeyRegistryDialog', 'Failed to validate passphrase', err as Error);
      } finally {
        setIsValidating(false);
      }
    }, 300); // Debounce for 300ms

    return () => clearTimeout(timer);
  }, [passphrase]);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLabel(value);
    // Use shared validation - allows spaces, emojis, same as vault labels
    const error = validateLabel(value);
    setLabelError(error);
  };

  const validateForm = (): string | null => {
    if (!label.trim()) {
      return 'Key label is required';
    }
    if (labelError) {
      return labelError;
    }
    if (!validation?.is_valid) {
      return 'Passphrase does not meet security requirements';
    }
    if (passphrase !== confirmPassphrase) {
      return 'Passphrases do not match';
    }
    return null;
  };

  const getStrengthColor = () => {
    if (!validation) return 'bg-gray-200';
    switch (validation.strength) {
      case 'weak':
        return 'bg-red-500';
      case 'fair':
        return 'bg-yellow-500';
      case 'good':
        return 'bg-blue-500';
      case 'strong':
        return 'bg-green-500';
      default:
        return 'bg-gray-200';
    }
  };

  const getStrengthWidth = () => {
    if (!validation) return 'w-0';
    const percentage = Math.min(validation.score, 100);
    if (percentage <= 25) return 'w-1/4';
    if (percentage <= 50) return 'w-1/2';
    if (percentage <= 75) return 'w-3/4';
    return 'w-full';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const request: GenerateKeyInput = {
        label: label.trim(),
        passphrase,
      };

      const result = await commands.generateKey(request);
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Failed to create passphrase key');
      }

      logger.info('PassphraseKeyRegistryDialog', 'Passphrase key created successfully', result);

      // Clear form
      setLabel('');
      setPassphrase('');
      setConfirmPassphrase('');
      setShowSecurityTips(false); // Reset to collapsed

      onSuccess?.();
      onClose();
    } catch (err: any) {
      logger.error('PassphraseKeyRegistryDialog', 'Failed to create passphrase key', err);
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
      setLabelError(null);
      setValidation(null);
      setShowSecurityTips(false); // Reset to collapsed
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={handleCancel} />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full" style={{ maxWidth: '600px', border: '1px solid #B7E1DD' }}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div
                className="rounded-lg p-2 flex-shrink-0"
                style={{
                  backgroundColor: 'rgba(15, 118, 110, 0.1)',
                  border: '1px solid #B7E1DD',
                }}
              >
                <Key className="h-5 w-5" style={{ color: '#13897F' }} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Create Passphrase Key</h2>
            </div>
            <button
              onClick={handleCancel}
              disabled={isCreating}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label htmlFor="key-label" className="block text-sm font-medium text-gray-700 mb-2">
                Key Label *
              </label>
              <input
                id="key-label"
                type="text"
                value={label}
                onChange={handleLabelChange}
                disabled={isCreating}
                maxLength={24}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 disabled:bg-gray-50 ${
                  labelError
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-300'
                }`}
                placeholder="e.g., My Backup Key 2024"
                autoFocus
              />
              {labelError ? (
                <p className="text-xs text-red-600 mt-1">{labelError}</p>
              ) : (
                <p
                  className={`mt-1 text-xs ${label.length >= 24 ? 'text-red-600' : 'text-gray-500'}`}
                >
                  {label.length}/24 characters
                </p>
              )}
            </div>

            <div>
              <label htmlFor="passphrase" className="block text-sm font-medium text-gray-700 mb-2">
                Passphrase * (min. 12 characters)
              </label>
              <div className="relative">
                <input
                  id="passphrase"
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  disabled={isCreating}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-50"
                  placeholder="Enter secure passphrase"
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  tabIndex={-1}
                  className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                  aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
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
              <label
                htmlFor="confirm-passphrase"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Passphrase *
              </label>
              <input
                id="confirm-passphrase"
                type={showPassphrase ? 'text' : 'password'}
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                disabled={isCreating}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 disabled:bg-gray-50 ${
                  confirmPassphrase
                    ? passphrase === confirmPassphrase
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-300'
                }`}
                placeholder="Re-enter passphrase"
              />
              {confirmPassphrase && (
                <p
                  className={`text-xs mt-1 ${passphrase === confirmPassphrase ? 'text-green-600' : 'text-red-600'}`}
                >
                  {passphrase === confirmPassphrase
                    ? '✓ Passphrases match'
                    : 'Passphrases do not match'}
                </p>
              )}
            </div>

            {/* Passphrase Strength Indicator */}
            {passphrase && (validation || isValidating) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Strength:</span>
                  {isValidating ? (
                    <span className="text-gray-500">Checking...</span>
                  ) : validation ? (
                    <span
                      className={`font-medium ${
                        validation.strength === 'weak'
                          ? 'text-red-600'
                          : validation.strength === 'fair'
                            ? 'text-yellow-600'
                            : validation.strength === 'good'
                              ? 'text-blue-600'
                              : 'text-green-600'
                      }`}
                    >
                      {validation.strength.charAt(0).toUpperCase() + validation.strength.slice(1)}
                    </span>
                  ) : null}
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getStrengthColor()} ${getStrengthWidth()}`}
                  />
                </div>
                {validation?.feedback && validation.feedback.length > 0 && (
                  <ul className="text-xs text-gray-600 space-y-1">
                    {validation.feedback.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Security Tips - Collapsible */}
            <div>
              <button
                type="button"
                onClick={() => setShowSecurityTips(!showSecurityTips)}
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-md"
                aria-expanded={showSecurityTips}
                aria-controls="security-tips-content"
              >
                <Info className="h-4 w-4" aria-hidden="true" />
                <span>Security Tips</span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-200 ${showSecurityTips ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>

              <div
                id="security-tips-content"
                className={`
                  overflow-hidden transition-all duration-300 ease-in-out
                  ${showSecurityTips ? 'max-h-48 opacity-100 mt-4' : 'max-h-0 opacity-0'}
                `}
                aria-hidden={!showSecurityTips}
              >
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-semibold text-blue-800 ring-1 ring-slate-200">
                          1
                        </span>
                        <span className="text-sm font-semibold text-blue-800">
                          Use Unique Passphrase
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        Never reuse from other accounts.
                      </p>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-semibold text-blue-800 ring-1 ring-slate-200">
                          2
                        </span>
                        <span className="text-sm font-semibold text-blue-800">
                          Generate Strong One
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        Use a passphrase generator.
                      </p>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-semibold text-blue-800 ring-1 ring-slate-200">
                          3
                        </span>
                        <span className="text-sm font-semibold text-blue-800">
                          Store Securely
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        Save in password manager.
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500 italic">
                    <span className="font-semibold">Security Note:</span> Your passphrase cannot be recovered if lost. Store it carefully in a password manager.
                  </p>
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
                disabled={
                  isCreating ||
                  !label.trim() ||
                  labelError !== null ||
                  !validation?.is_valid ||
                  passphrase !== confirmPassphrase
                }
                className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={
                  !(isCreating ||
                    !label.trim() ||
                    labelError !== null ||
                    !validation?.is_valid ||
                    passphrase !== confirmPassphrase)
                    ? { backgroundColor: '#1D4ED8' }
                    : undefined
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
                className="px-4 py-2 text-gray-700 bg-transparent border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
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
