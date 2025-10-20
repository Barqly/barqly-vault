import React, { useState, useRef } from 'react';
import { X, Key, Upload, Eye, EyeOff, FileKey } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { logger } from '../../lib/logger';
import { commands } from '../../bindings';
import { validateLabel } from '../../lib/sanitization';

interface ImportPassphraseKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Dialog for importing a passphrase key file (.enc, .agekey)
 * Allows user to browse for file, provide label and passphrase
 */
export const ImportPassphraseKeyDialog: React.FC<ImportPassphraseKeyDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelError, setLabelError] = useState<string | null>(null);

  // Refs for focus trap
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  if (!isOpen) return null;

  // Reset state when dialog closes
  const handleClose = () => {
    setSelectedFile(null);
    setLabel('');
    setPassphrase('');
    setShowPassphrase(false);
    setError(null);
    setLabelError(null);
    setIsImporting(false);
    onClose();
  };

  // Open file picker for .enc files
  const handleBrowseFile = async () => {
    try {
      const filePath = await open({
        title: 'Select Key File',
        filters: [
          {
            name: 'Key Files',
            extensions: ['enc', 'agekey'],
          },
        ],
        multiple: false,
      });

      if (filePath && typeof filePath === 'string') {
        setSelectedFile(filePath);
        setError(null);

        // Extract filename and use as default label
        const filename = filePath.split('/').pop() || filePath.split('\\').pop() || '';
        const labelFromFile = filename
          .replace(/\.agekey\.enc$/, '')
          .replace(/\.enc$/, '')
          .replace(/\.agekey$/, '')
          .replace(/[-_]/g, ' ');

        setLabel(labelFromFile);
        logger.info('ImportPassphraseKeyDialog', 'File selected', {
          filePath,
          label: labelFromFile,
        });
      }
    } catch (err) {
      logger.error('ImportPassphraseKeyDialog', 'Failed to open file picker', err as Error);
      setError('Failed to open file picker');
    }
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLabel(value);
    const error = validateLabel(value);
    setLabelError(error);
  };

  const validateForm = (): string | null => {
    if (!selectedFile) {
      return 'Please select a key file to import';
    }
    if (!label.trim()) {
      return 'Key label is required';
    }
    if (labelError) {
      return labelError;
    }
    if (!passphrase.trim()) {
      return 'Passphrase is required to decrypt the key file';
    }
    return null;
  };

  const handleImport = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const result = await commands.importKeyFile({
        file_path: selectedFile!,
        passphrase: passphrase,
        override_label: label,
        attach_to_vault: null,
        validate_only: false,
      });

      if (result.status === 'ok') {
        logger.info('ImportPassphraseKeyDialog', 'Key imported successfully', {
          label,
          filePath: selectedFile,
        });
        handleClose();
        onSuccess?.();
      } else {
        const errorMsg = result.error.message || 'Failed to import key';
        setError(errorMsg);
        logger.error(
          'ImportPassphraseKeyDialog',
          'Import failed',
          new Error(errorMsg),
          result.error,
        );
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'An unexpected error occurred');
      logger.error('ImportPassphraseKeyDialog', 'Unexpected import error', error);
    } finally {
      setIsImporting(false);
    }
  };

  // Focus trap
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
      return;
    }

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        // Shift+Tab
        if (document.activeElement === firstFocusableRef.current) {
          e.preventDefault();
          lastFocusableRef.current?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusableRef.current) {
          e.preventDefault();
          firstFocusableRef.current?.focus();
        }
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
          style={{ maxWidth: '600px', border: '1px solid #B7E1DD' }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
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
              <h2 className="text-xl font-semibold text-main">Import Passphrase Key</h2>
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
          <div className="p-6 space-y-6">
            {/* File Selection */}
            <div>
              <label className="block text-sm font-medium text-main mb-2">
                Key File <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-3">
                <button
                  ref={firstFocusableRef}
                  onClick={handleBrowseFile}
                  className="
                    flex items-center gap-2 px-4 py-2
                    text-sm font-medium
                    border rounded-lg
                    transition-colors
                  "
                  style={{
                    borderColor: selectedFile ? '#B7E1DD' : 'rgb(var(--border-default))',
                    color: selectedFile ? '#13897F' : 'rgb(var(--text-secondary))',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgb(var(--surface-hover))';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  disabled={isImporting}
                >
                  <Upload className="h-4 w-4" />
                  Browse...
                </button>
                {selectedFile && (
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-surface-hover rounded-lg border border-default">
                    <FileKey className="h-4 w-4 text-secondary flex-shrink-0" />
                    <span className="text-sm text-main truncate" title={selectedFile}>
                      {selectedFile.split('/').pop() || selectedFile.split('\\').pop()}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted mt-1">
                Select an encrypted key file (.enc, .agekey)
              </p>
            </div>

            {/* Key Label */}
            <div>
              <label className="block text-sm font-medium text-main mb-2">
                Key Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={label}
                onChange={handleLabelChange}
                placeholder="e.g., My Backup Key 2024"
                maxLength={128}
                disabled={isImporting}
                className="
                  w-full px-4 py-2 rounded-lg
                  text-sm text-main placeholder-muted
                  border transition-colors
                  focus:outline-none
                "
                style={{
                  backgroundColor: 'rgb(var(--surface-input))',
                  borderColor: labelError ? '#B91C1C' : 'rgb(var(--border-default))',
                }}
                onFocus={(e) => {
                  if (!labelError) {
                    e.currentTarget.style.borderColor = '#B7E1DD';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(19, 137, 127, 0.1)';
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

            {/* Passphrase */}
            <div>
              <label className="block text-sm font-medium text-main mb-2">
                Passphrase <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassphrase ? 'text' : 'password'}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter passphrase to decrypt key file"
                  disabled={isImporting}
                  className="
                    w-full px-4 py-2 pr-12 rounded-lg
                    text-sm text-main placeholder-muted
                    border transition-colors
                    focus:outline-none
                  "
                  style={{
                    backgroundColor: 'rgb(var(--surface-input))',
                    borderColor: 'rgb(var(--border-default))',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#B7E1DD';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(19, 137, 127, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgb(var(--border-default))';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors"
                  tabIndex={-1}
                  aria-label={showPassphrase ? 'Hide passphrase' : 'Show passphrase'}
                >
                  {showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted mt-1">Required to decrypt and verify the key file</p>
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
          <div className="flex justify-end gap-3 px-6 pb-6">
            {/* Cancel Button */}
            <button
              onClick={handleClose}
              disabled={isImporting}
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
                if (!isImporting) {
                  e.currentTarget.style.backgroundColor = 'rgb(var(--surface-hover))';
                  e.currentTarget.style.color = 'rgb(var(--text-primary))';
                }
              }}
              onMouseLeave={(e) => {
                if (!isImporting) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgb(var(--text-secondary))';
                }
              }}
            >
              Cancel
            </button>

            {/* Import Button */}
            <button
              ref={lastFocusableRef}
              onClick={handleImport}
              disabled={
                isImporting || !selectedFile || !label.trim() || !passphrase.trim() || !!labelError
              }
              className="
                px-4 py-2 text-sm font-medium text-white
                rounded-lg transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
              style={{
                backgroundColor: '#1D4ED8',
              }}
              onMouseEnter={(e) => {
                if (
                  !isImporting &&
                  selectedFile &&
                  label.trim() &&
                  passphrase.trim() &&
                  !labelError
                ) {
                  e.currentTarget.style.backgroundColor = '#1E40AF';
                }
              }}
              onMouseLeave={(e) => {
                if (!isImporting) {
                  e.currentTarget.style.backgroundColor = '#1D4ED8';
                }
              }}
            >
              {isImporting ? 'Importing...' : 'Import Key'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
