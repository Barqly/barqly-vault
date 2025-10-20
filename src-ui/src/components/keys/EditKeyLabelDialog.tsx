import React, { useState, useRef, useEffect } from 'react';
import { X, Key, Fingerprint } from 'lucide-react';
import { logger } from '../../lib/logger';
import { commands, GlobalKey } from '../../bindings';
import { validateLabel } from '../../lib/sanitization';

interface EditKeyLabelDialogProps {
  isOpen: boolean;
  keyRef: GlobalKey;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Dialog for editing key labels (only for non-Active keys)
 * Supports PreActivation, Suspended, and Deactivated keys
 */
export const EditKeyLabelDialog: React.FC<EditKeyLabelDialogProps> = ({
  isOpen,
  keyRef,
  onClose,
  onSuccess,
}) => {
  const [label, setLabel] = useState(keyRef.label);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);

  // Ref for focus trap
  const inputRef = useRef<HTMLInputElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  const isPassphrase = keyRef.key_type.type === 'Passphrase';

  // Reset label when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLabel(keyRef.label);
      setError(null);
      setLabelError(null);
    }
  }, [isOpen, keyRef.label]);

  if (!isOpen) return null;

  const handleClose = () => {
    setLabel(keyRef.label);
    setError(null);
    setLabelError(null);
    setIsUpdating(false);
    onClose();
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLabel(value);
    const error = validateLabel(value);
    setLabelError(error);
    setError(null);
  };

  const validateForm = (): string | null => {
    if (!label.trim()) {
      return 'Key label is required';
    }
    if (labelError) {
      return labelError;
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    // No change - just close
    if (label.trim() === keyRef.label) {
      handleClose();
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const result = await commands.updateGlobalKeyLabel({
        key_id: keyRef.id,
        new_label: label.trim(),
      });

      if (result.status === 'ok') {
        logger.info('EditKeyLabelDialog', 'Label updated successfully', {
          keyId: keyRef.id,
          oldLabel: keyRef.label,
          newLabel: label.trim(),
        });
        handleClose();
        onSuccess?.();
      } else {
        const errorMsg = result.error.message || 'Failed to update label';
        setError(errorMsg);
        logger.error('EditKeyLabelDialog', 'Update failed', new Error(errorMsg), result.error);
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'An unexpected error occurred');
      logger.error('EditKeyLabelDialog', 'Unexpected update error', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Enter key to submit
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isUpdating && !labelError && label.trim()) {
      e.preventDefault();
      handleSave();
    }
  };

  // Focus trap: Keep focus on input and save button
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const isSaveEnabled =
      !isUpdating && !labelError && label.trim() && label.trim() !== keyRef.label;

    // If going backwards (Shift+Tab) from input
    if (e.shiftKey && document.activeElement === inputRef.current) {
      e.preventDefault();
      if (isSaveEnabled && saveButtonRef.current) {
        saveButtonRef.current.focus();
      } else {
        inputRef.current?.focus();
      }
    }
    // If going forward (Tab) from save button
    else if (!e.shiftKey && document.activeElement === saveButtonRef.current) {
      e.preventDefault();
      inputRef.current?.focus();
    }
    // If going forward (Tab) from input and save is disabled
    else if (!e.shiftKey && document.activeElement === inputRef.current && !isSaveEnabled) {
      e.preventDefault();
      inputRef.current?.focus();
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
          style={{
            maxWidth: '500px',
            border: isPassphrase ? '1px solid #B7E1DD' : '1px solid #ffd4a3',
          }}
          onClick={(e) => e.stopPropagation()}
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
              <h2 className="text-xl font-semibold text-main">Edit Key Label</h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isUpdating}
              className="text-muted hover:text-main transition-colors disabled:opacity-50"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Key Label Input */}
            <div>
              <label className="block text-sm font-medium text-main mb-2">
                Key Label <span className="text-red-500">*</span>
              </label>
              <input
                ref={inputRef}
                type="text"
                value={label}
                onChange={handleLabelChange}
                onKeyPress={handleKeyPress}
                placeholder="e.g., My Backup Key 2024"
                maxLength={128}
                disabled={isUpdating}
                autoFocus
                className="
                  w-full px-4 py-2 rounded-lg
                  text-sm text-main placeholder-muted
                  border transition-colors
                  focus:outline-none
                "
                style={{
                  backgroundColor: 'rgb(var(--surface-input))',
                  borderColor: labelError
                    ? '#FCA5A5'
                    : isPassphrase
                      ? 'rgb(var(--border-default))'
                      : 'rgb(var(--border-default))',
                }}
                onFocus={(e) => {
                  if (!labelError) {
                    e.currentTarget.style.borderColor = isPassphrase ? '#B7E1DD' : '#ffd4a3';
                    e.currentTarget.style.boxShadow = isPassphrase
                      ? '0 0 0 2px rgba(19, 137, 127, 0.1)'
                      : '0 0 0 2px rgba(249, 139, 28, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  if (!labelError) {
                    e.currentTarget.style.borderColor = 'rgb(var(--border-default))';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              />
              {labelError && (
                <p className="text-xs mt-1" style={{ color: '#B91C1C' }}>
                  {labelError}
                </p>
              )}
              <p className="text-xs text-muted mt-1">{label.length}/128 characters</p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="p-3 rounded-lg border"
                style={{
                  backgroundColor: 'rgba(185, 28, 28, 0.1)',
                  borderColor: '#FCA5A5',
                }}
              >
                <p className="text-sm" style={{ color: '#B91C1C' }}>
                  {error}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 pb-6">
            {/* Save Button - Primary action, spans width */}
            <button
              ref={saveButtonRef}
              onClick={handleSave}
              disabled={
                isUpdating || !!labelError || !label.trim() || label.trim() === keyRef.label
              }
              className="
                flex-1 px-4 py-2 text-sm font-medium text-white
                rounded-lg transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              style={{
                backgroundColor: '#1D4ED8',
              }}
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
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>

            {/* Cancel Button - Ghost style, skip from tab */}
            <button
              onClick={handleClose}
              disabled={isUpdating}
              tabIndex={-1}
              className="
                px-4 py-2 text-sm font-medium
                border rounded-lg
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              style={{
                borderColor: 'rgb(var(--border-default))',
                color: 'rgb(var(--text-secondary))',
              }}
              onMouseEnter={(e) => {
                if (!isUpdating) {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--surface-hover))';
                  e.currentTarget.style.color = 'rgb(var(--text-primary))';
                }
              }}
              onMouseLeave={(e) => {
                if (!isUpdating) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgb(var(--text-secondary))';
                }
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
