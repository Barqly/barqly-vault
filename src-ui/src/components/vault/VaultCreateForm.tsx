import React, { useEffect, useRef } from 'react';
import { Plus, X } from 'lucide-react';

interface VaultCreateFormProps {
  name: string;
  description: string;
  isSubmitting: boolean;
  error?: string | null;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onClear: () => void;
}

/**
 * VaultCreateForm Component - Centered Modal with Blur Backdrop
 *
 * Modal form for creating new vaults
 * Features:
 * - Centered on screen with blur backdrop
 * - Click outside to close
 * - Auto-focus on expand
 * - Validation feedback
 * - Theme-aware styling
 */
const VaultCreateForm: React.FC<VaultCreateFormProps> = ({
  name,
  description,
  isSubmitting,
  error,
  onNameChange,
  onDescriptionChange,
  onSubmit,
  onCancel,
  onClear,
}) => {
  const firstFocusableRef = useRef<HTMLInputElement>(null);
  const lastFocusableRef = useRef<HTMLButtonElement>(null);

  // Auto-focus name input when form opens
  useEffect(() => {
    firstFocusableRef.current?.focus();
  }, []);

  // Focus trap: cycle focus within modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const isSubmitEnabled = !isSubmitting && name.trim();

    // If going backwards (Shift+Tab) from first field
    if (e.shiftKey && document.activeElement === firstFocusableRef.current) {
      e.preventDefault();
      if (isSubmitEnabled && lastFocusableRef.current) {
        lastFocusableRef.current.focus();
      } else {
        firstFocusableRef.current?.focus();
      }
    }
    // If going forward (Tab) from last enabled element
    else if (!e.shiftKey) {
      if (isSubmitEnabled && document.activeElement === lastFocusableRef.current) {
        e.preventDefault();
        firstFocusableRef.current?.focus();
      } else if (!isSubmitEnabled && document.activeElement?.id === 'vault-description') {
        e.preventDefault();
        firstFocusableRef.current?.focus();
      }
    }
  };

  return (
    <>
      {/* Backdrop with blur */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onCancel} />

      {/* Centered Modal Container */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none">
        <div className="bg-elevated rounded-lg shadow-xl max-w-2xl w-full pointer-events-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-default">
            <h2 className="text-xl font-semibold text-main flex items-center gap-2">
              <Plus className="h-5 w-5" style={{ color: '#1D4ED8' }} />
              Create New Vault
            </h2>
            <button
              onClick={onCancel}
              className="text-muted hover:text-secondary transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={onSubmit} onKeyDown={handleKeyDown} className="p-6 space-y-4">
            {/* Error Display */}
            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Name Field */}
            <div>
              <label htmlFor="vault-name" className="block text-sm font-medium text-main mb-1.5">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                ref={firstFocusableRef}
                id="vault-name"
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                disabled={isSubmitting}
                maxLength={24}
                className="w-full px-3 py-2 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input text-main disabled:opacity-50"
                placeholder="e.g., Personal Documents"
              />
              <p className={`mt-1 text-xs ${name.length >= 24 ? 'text-red-600' : 'text-muted'}`}>
                {name.length}/24 characters
              </p>
            </div>

            {/* Description Field */}
            <div>
              <label
                htmlFor="vault-description"
                className="block text-sm font-medium text-main mb-1.5"
              >
                Description <span className="text-muted">(optional)</span>
              </label>
              <input
                type="text"
                id="vault-description"
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                disabled={isSubmitting}
                maxLength={70}
                className="w-full px-3 py-2 border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input text-main disabled:opacity-50"
                placeholder="Brief description of what this vault contains..."
              />
              <p
                className={`mt-1 text-xs ${description.length >= 70 ? 'text-red-600' : 'text-muted'}`}
              >
                {description.length}/70 characters
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                ref={lastFocusableRef}
                disabled={isSubmitting || !name.trim()}
                className="flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-default flex items-center justify-center gap-2 border"
                style={
                  !isSubmitting && name.trim()
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
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Vault...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Vault
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
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

export default VaultCreateForm;
