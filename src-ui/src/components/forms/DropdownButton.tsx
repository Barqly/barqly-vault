import React from 'react';
import { ChevronDown, Key } from 'lucide-react';
import { KeyMetadata } from '../../lib/api-types';

export interface DropdownButtonProps {
  selectedKey?: KeyMetadata;
  loading: boolean;
  disabled: boolean;
  isOpen: boolean;
  placeholder: string;
  errorMessage?: string;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

export const DropdownButton: React.FC<DropdownButtonProps> = ({
  selectedKey,
  loading,
  disabled,
  isOpen,
  placeholder,
  errorMessage,
  onClick,
  onKeyDown,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      disabled={disabled || loading}
      className={`
        w-full px-3 py-2 border rounded-lg shadow-sm text-left
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
        ${errorMessage ? 'border-red-400' : 'border-slate-300'}
        ${disabled ? 'bg-slate-50' : 'bg-white'}
        ${loading ? 'cursor-wait' : 'cursor-pointer'}
      `}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-labelledby="key-selection-label"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-slate-500">Loading keys...</span>
            </div>
          ) : selectedKey ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Key className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="truncate text-slate-800 font-medium">{selectedKey.label}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <span className="text-slate-500 italic">{placeholder}</span>
            </div>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>
    </button>
  );
};
