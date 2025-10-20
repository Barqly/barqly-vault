import React from 'react';
import { Key, X, AlertCircle } from 'lucide-react';

interface ExportKeyWarningDialogProps {
  isOpen: boolean;
  keyLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Security warning dialog shown before exporting a passphrase key file
 *
 * Educates users about the sensitivity of the exported file and best practices
 * for secure storage without being overly prescriptive.
 */
export const ExportKeyWarningDialog: React.FC<ExportKeyWarningDialogProps> = ({
  isOpen,
  keyLabel,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity z-40"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none"
        onClick={onCancel}
      >
        <div
          className="relative w-full max-w-lg rounded-lg shadow-xl pointer-events-auto"
          style={{
            backgroundColor: 'rgb(var(--surface-elevated))',
            border: '1px solid #B7E1DD',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 transition-colors"
            style={{ color: 'rgb(var(--text-muted))' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgb(var(--text-primary))';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgb(var(--text-muted))';
            }}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 px-6 pt-6 pb-4">
            <div
              className="rounded-lg p-2 flex-shrink-0"
              style={{
                backgroundColor: 'rgba(15, 118, 110, 0.1)',
                border: '1px solid #B7E1DD',
              }}
            >
              <Key className="h-5 w-5" style={{ color: '#13897F' }} />
            </div>
            <h2 className="text-lg font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
              Export Encryption Key
            </h2>
          </div>

          {/* Content */}
          <div className="px-6 pb-4">
            <p className="text-sm mb-3" style={{ color: 'rgb(var(--text-secondary))' }}>
              You are about to export{' '}
              <span className="font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                "{keyLabel}"
              </span>{' '}
              as an encrypted file.
            </p>

            <div
              className="rounded-lg p-4 mb-4"
              style={{
                backgroundColor: 'rgba(15, 118, 110, 0.05)',
                border: '1px solid rgba(15, 118, 110, 0.2)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4" style={{ color: '#13897F' }} />
                <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                  Security Considerations:
                </p>
              </div>
              <ul className="text-sm space-y-1.5" style={{ color: 'rgb(var(--text-secondary))' }}>
                <li>• This file remains sensitive despite being encrypted</li>
                <li>• Possession of this file plus your passphrase grants vault access</li>
                <li>• Store separately from your passphrase in a secure location</li>
              </ul>
            </div>

            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
              The exported file will remain encrypted with your passphrase.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 px-6 pb-6">
            {/* Cancel Button - Ghost style */}
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium rounded-lg border transition-colors"
              style={{
                borderColor: 'rgb(var(--border-default))',
                color: 'rgb(var(--text-secondary))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(var(--surface-hover))';
                e.currentTarget.style.color = 'rgb(var(--text-primary))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'rgb(var(--text-secondary))';
              }}
            >
              Cancel
            </button>

            {/* Confirm Button - Premium blue */}
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
              style={{
                backgroundColor: '#1D4ED8',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1E40AF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1D4ED8';
              }}
            >
              Continue with Export
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
