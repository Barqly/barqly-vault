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
 * VaultCreateForm Component - R2 Phase 3 Inline Creation
 *
 * Collapsible inline form for creating new vaults
 * Features:
 * - Auto-focus on expand
 * - Validation feedback
 * - Clear/Create buttons
 * - Compact design
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
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus name input when form opens
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  return (
    <div className="bg-white rounded-lg border-2 border-blue-200 shadow-sm">
      {/* Form Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-blue-50">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold text-slate-800">Create New Vault</h3>
        </div>
        <button
          onClick={onCancel}
          className="p-1 rounded hover:bg-blue-100 transition-colors"
          aria-label="Close form"
        >
          <X className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={onSubmit} className="p-6 space-y-4">
        {/* Error Display */}
        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Name Field */}
        <div>
          <label htmlFor="vault-name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            ref={nameInputRef}
            id="vault-name"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            disabled={isSubmitting}
            maxLength={50}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
            placeholder="e.g., Personal Documents"
          />
          <p className="mt-1 text-xs text-slate-500">{name.length}/50 characters</p>
        </div>

        {/* Description Field */}
        <div>
          <label
            htmlFor="vault-description"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Description <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="vault-description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            disabled={isSubmitting}
            maxLength={200}
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 resize-none"
            placeholder="Brief description of what this vault contains..."
          />
          <p className="mt-1 text-xs text-slate-500">{description.length}/200 characters</p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={onClear}
            disabled={isSubmitting || (!name && !description)}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>

          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create Vault
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VaultCreateForm;
