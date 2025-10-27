import React, { useState, useEffect, useRef } from 'react';
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

  // Refs for focus trap
  const firstFocusableRef = useRef<HTMLInputElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

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
        return ''; // Use inline style for muted red
      case 'fair':
        return 'bg-yellow-500';
      case 'good':
        return 'bg-blue-500';
      case 'strong':
        return ''; // Use inline style for teal
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

  // Focus trap: cycle focus within modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const isButtonEnabled =
      !isCreating &&
      label.trim() &&
      labelError === null &&
      validation?.is_valid &&
      passphrase === confirmPassphrase;

    // If going backwards (Shift+Tab) from first field
    if (e.shiftKey && document.activeElement === firstFocusableRef.current) {
      e.preventDefault();
      if (isButtonEnabled && lastFocusableRef.current) {
        lastFocusableRef.current.focus();
      } else {
        firstFocusableRef.current?.focus();
      }
    }
    // If going forward (Tab) from last enabled element
    else if (!e.shiftKey) {
      if (isButtonEnabled && document.activeElement === lastFocusableRef.current) {
        e.preventDefault();
        firstFocusableRef.current?.focus();
      } else if (!isButtonEnabled && document.activeElement?.id === 'confirm-passphrase') {
        e.preventDefault();
        firstFocusableRef.current?.focus();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={handleCancel} />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none">
        <div
          className="bg-elevated rounded-lg shadow-xl w-full pointer-events-auto"
          style={{ maxWidth: '600px', border: '1px solid #B7E1DD' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-default">
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
              <h2 className="text-xl font-semibold text-main">Create Passphrase Key</h2>
            </div>
            <button
              onClick={handleCancel}
              disabled={isCreating}
              className="text-muted hover:text-secondary transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-6 space-y-4">
            <div>
              <label htmlFor="key-label" className="block text-sm font-medium text-main mb-2">
                Key Label *
              </label>
              <input
                id="key-label"
                ref={firstFocusableRef}
                type="text"
                value={label}
                onChange={handleLabelChange}
                disabled={isCreating}
                maxLength={24}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 disabled:opacity-50 bg-input text-main ${
                  labelError ? 'border-default' : 'border-default focus:ring-blue-300'
                }`}
                style={labelError ? { borderColor: '#FCA5A5' } : undefined}
                placeholder="e.g., My Backup Key 2024"
                autoFocus
              />
              {labelError ? (
                <p className="text-xs mt-1" style={{ color: '#B91C1C' }}>
                  {labelError}
                </p>
              ) : (
                <p
                  className="mt-1 text-xs"
                  style={{ color: label.length >= 24 ? '#B91C1C' : '#64748b' }}
                >
                  {label.length}/24 characters
                </p>
              )}
            </div>

            <div>
              <label htmlFor="passphrase" className="block text-sm font-medium text-main mb-2">
                Passphrase * (min. 12 characters)
              </label>
              <div className="relative">
                <input
                  id="passphrase"
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  disabled={isCreating}
                  className="w-full px-3 py-2 pr-10 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 bg-input text-main"
                  placeholder="Enter secure passphrase"
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  tabIndex={-1}
                  className="absolute right-2 top-2.5 text-muted hover:text-secondary"
                  aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                >
                  {showPassphrase ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passphrase && passphrase.length < 12 && (
                <p className="text-xs mt-1" style={{ color: '#B91C1C' }}>
                  {12 - passphrase.length} more characters needed
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirm-passphrase"
                className="block text-sm font-medium text-main mb-2"
              >
                Confirm Passphrase *
              </label>
              <input
                id="confirm-passphrase"
                type={showPassphrase ? 'text' : 'password'}
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                disabled={isCreating}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none disabled:opacity-50 bg-input text-main ${
                  confirmPassphrase && passphrase !== confirmPassphrase
                    ? '' // Error state: no focus ring, just red border
                    : 'focus:ring-2 focus:ring-blue-300' // Default: blue focus ring
                }`}
                style={
                  confirmPassphrase && passphrase !== confirmPassphrase
                    ? ({ borderColor: '#B91C1C' } as React.CSSProperties) // Deep red border only
                    : undefined
                }
                placeholder="Re-enter passphrase"
              />
              {confirmPassphrase && (
                <p
                  className="text-xs mt-1"
                  style={{ color: passphrase === confirmPassphrase ? '#13897F' : '#B91C1C' }}
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
                  <span className="text-secondary">Strength:</span>
                  {isValidating ? (
                    <span className="text-secondary">Checking...</span>
                  ) : validation ? (
                    <span
                      className={`font-medium ${
                        validation.strength === 'weak'
                          ? ''
                          : validation.strength === 'fair'
                            ? 'text-yellow-600'
                            : validation.strength === 'good'
                              ? 'text-blue-600'
                              : ''
                      }`}
                      style={
                        validation.strength === 'weak'
                          ? { color: '#B91C1C' }
                          : validation.strength === 'strong'
                            ? { color: '#13897F' }
                            : undefined
                      }
                    >
                      {validation.strength.charAt(0).toUpperCase() + validation.strength.slice(1)}
                    </span>
                  ) : null}
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'rgb(var(--border-default))' }}
                >
                  <div
                    className={`h-full transition-all duration-300 ${getStrengthColor()} ${getStrengthWidth()}`}
                    style={
                      validation?.strength === 'weak'
                        ? { backgroundColor: '#B91C1C' }
                        : validation?.strength === 'strong'
                          ? { backgroundColor: '#13897F' }
                          : undefined
                    }
                  />
                </div>
                {validation?.feedback && validation.feedback.length > 0 && (
                  <ul className="text-xs text-secondary space-y-1">
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
                tabIndex={-1}
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
                <div
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: 'rgb(var(--border-default))',
                    backgroundColor: 'rgb(var(--info-panel-bg))',
                    boxShadow:
                      '0 1px 3px rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-heading border"
                          style={{
                            backgroundColor: 'rgb(var(--surface-card))',
                            borderColor: 'rgb(var(--border-default))',
                          }}
                        >
                          1
                        </span>
                        <span className="text-sm font-semibold text-heading">
                          Use Unique Passphrase
                        </span>
                      </div>
                      <p className="text-sm text-secondary leading-relaxed">
                        Never reuse from other accounts.
                      </p>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-heading border"
                          style={{
                            backgroundColor: 'rgb(var(--surface-card))',
                            borderColor: 'rgb(var(--border-default))',
                          }}
                        >
                          2
                        </span>
                        <span className="text-sm font-semibold text-heading">
                          Generate Strong One
                        </span>
                      </div>
                      <p className="text-sm text-secondary leading-relaxed">
                        Use a passphrase generator.
                      </p>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-heading border"
                          style={{
                            backgroundColor: 'rgb(var(--surface-card))',
                            borderColor: 'rgb(var(--border-default))',
                          }}
                        >
                          3
                        </span>
                        <span className="text-sm font-semibold text-heading">Store Securely</span>
                      </div>
                      <p className="text-sm text-secondary leading-relaxed">
                        Save in password manager.
                      </p>
                    </div>
                  </div>

                  <p
                    className="mt-4 border-t pt-3 text-xs text-secondary italic"
                    style={{ borderColor: 'rgb(var(--border-default))' }}
                  >
                    <span className="font-semibold">Security Note:</span> Your passphrase cannot be
                    recovered if lost. Store it carefully in a password manager.
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
                ref={lastFocusableRef}
                disabled={
                  isCreating ||
                  !label.trim() ||
                  labelError !== null ||
                  !validation?.is_valid ||
                  passphrase !== confirmPassphrase
                }
                className="flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-default flex items-center justify-center gap-2 border"
                style={
                  !(
                    isCreating ||
                    !label.trim() ||
                    labelError !== null ||
                    !validation?.is_valid ||
                    passphrase !== confirmPassphrase
                  )
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
                tabIndex={-1}
                className="px-4 py-2 text-main bg-transparent border border-default rounded-lg hover:bg-hover transition-colors disabled:opacity-50"
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
