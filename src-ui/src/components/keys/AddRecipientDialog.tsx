import React, { useState, useRef } from 'react';
import { X, Users, Copy } from 'lucide-react';
import { logger } from '../../lib/logger';
import { commands } from '../../bindings';
import { validateLabel } from '../../lib/sanitization';

interface AddRecipientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Dialog for adding a recipient (public-key-only) to the registry
 * Recipients are other people's keys that can only be used for encryption
 */
export const AddRecipientDialog: React.FC<AddRecipientDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [label, setLabel] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);

  const firstFocusableRef = useRef<HTMLInputElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setLabel('');
    setPublicKey('');
    setError(null);
    setLabelError(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLabel(value);
    const error = validateLabel(value);
    setLabelError(error);
  };

  // Validate age public key format
  // age keys have different lengths: standard (62), yubikey (71), other plugins vary
  const validatePublicKey = (key: string): string | null => {
    const trimmed = key.trim();
    if (!trimmed) {
      return 'Public key is required';
    }
    if (!trimmed.startsWith('age1')) {
      return 'Public key must start with "age1"';
    }
    // age keys are at least 62 chars (standard) but can be longer (yubikey: 71)
    if (trimmed.length < 62) {
      return `Public key too short (minimum 62 characters, current: ${trimmed.length})`;
    }
    // Bech32 encoding: only lowercase letters (except b, i, o) and digits 0-9
    // But we'll be permissive and let backend do strict validation
    if (!/^age1[a-z0-9]+$/.test(trimmed)) {
      return 'Public key contains invalid characters (must be lowercase alphanumeric)';
    }
    return null;
  };

  // Handle paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Extract age1... key from clipboard content (may have comments or whitespace)
      // Match age1 followed by at least 58 lowercase alphanumeric chars (supports standard and plugin keys)
      const match = text.match(/age1[a-z0-9]{58,}/);
      if (match) {
        setPublicKey(match[0]);
        setError(null);
        logger.info('AddRecipientDialog', 'Public key pasted from clipboard');
      } else if (text.trim().startsWith('age1')) {
        // Partial match - let user see it and validation will show error
        setPublicKey(text.trim());
        setError(null);
      } else {
        setError('No valid age public key found in clipboard');
      }
    } catch (err) {
      logger.error('AddRecipientDialog', 'Failed to paste from clipboard', err as Error);
      setError('Failed to access clipboard');
    }
  };

  const validateForm = (): string | null => {
    if (!label.trim()) {
      return 'Name is required';
    }
    if (labelError) {
      return labelError;
    }
    const keyError = validatePublicKey(publicKey);
    if (keyError) {
      return keyError;
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await commands.addRecipient({
        label: label.trim(),
        public_key: publicKey.trim(),
      });

      if (result.status === 'ok') {
        logger.info('AddRecipientDialog', 'Recipient added successfully', {
          label: label.trim(),
          keyId: result.data.key_id,
        });
        handleClose();
        onSuccess?.();
      } else {
        const errorMsg = result.error.message || 'Failed to add recipient';
        setError(errorMsg);
        logger.error('AddRecipientDialog', 'Add recipient failed', new Error(errorMsg));
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'An unexpected error occurred');
      logger.error('AddRecipientDialog', 'Unexpected error', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSubmitting && !validateForm()) {
        handleSubmit();
      }
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity z-40"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none"
        onClick={handleClose}
      >
        <div
          className="bg-elevated rounded-lg shadow-xl w-full pointer-events-auto"
          style={{ maxWidth: '500px', border: '1px solid rgb(var(--recipient-border))' }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-default">
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-2 flex-shrink-0 pill-recipient">
                <Users className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold text-main">Add Recipient</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-muted hover:text-main transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-main mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                ref={firstFocusableRef}
                type="text"
                value={label}
                onChange={handleLabelChange}
                onKeyPress={handleKeyPress}
                placeholder="e.g., Alice, Family Lawyer"
                maxLength={128}
                disabled={isSubmitting}
                className="w-full px-4 py-2 rounded-lg text-sm text-main placeholder-muted border transition-colors focus:outline-none"
                style={{
                  backgroundColor: 'rgb(var(--surface-input))',
                  borderColor: labelError ? '#B91C1C' : 'rgb(var(--border-default))',
                }}
              />
              {labelError && (
                <p className="text-xs mt-1" style={{ color: '#B91C1C' }}>
                  {labelError}
                </p>
              )}
              <p className="text-xs text-muted mt-1">{label.length}/128 characters</p>
            </div>

            {/* Public Key */}
            <div>
              <label className="block text-sm font-medium text-main mb-2">
                Public Key <span className="text-red-500">*</span>
              </label>
              <textarea
                value={publicKey}
                onChange={(e) => {
                  setPublicKey(e.target.value);
                  setError(null);
                }}
                onKeyPress={handleKeyPress}
                placeholder="Paste age public key (age1...)"
                rows={2}
                disabled={isSubmitting}
                className="w-full px-4 py-2 rounded-lg text-sm text-main placeholder-muted border transition-colors focus:outline-none font-mono resize-none"
                style={{
                  backgroundColor: 'rgb(var(--surface-input))',
                  borderColor: 'rgb(var(--border-default))',
                }}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted">Format: age1... (62+ characters)</p>
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 text-xs text-brand-recipient hover:underline"
                >
                  <Copy className="h-3 w-3" />
                  Paste from clipboard
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-default">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-secondary hover:text-main transition-colors rounded-lg border border-default hover:bg-hover"
            >
              Cancel
            </button>
            <button
              ref={lastFocusableRef}
              onClick={handleSubmit}
              disabled={isSubmitting || !!labelError}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isSubmitting
                  ? 'rgb(var(--brand-recipient))'
                  : 'rgb(var(--brand-recipient))',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.opacity = '0.9';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {isSubmitting ? 'Adding...' : 'Add Recipient'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
