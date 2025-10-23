import React, { useRef, useEffect } from 'react';
import { ChevronDown, Key } from 'lucide-react';
import { KeyMetadata } from '../../bindings';

export interface DropdownButtonProps {
  selectedKey?: KeyMetadata;
  loading: boolean;
  disabled: boolean;
  isOpen: boolean;
  placeholder: string;
  errorMessage?: string;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  autoFocus?: boolean;
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
  autoFocus = false,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the button when requested and component is enabled
  useEffect(() => {
    if (autoFocus && !disabled && !loading && buttonRef.current) {
      // Use a small timeout to ensure the component is fully rendered
      const timeoutId = setTimeout(() => {
        buttonRef.current?.focus();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [autoFocus, disabled, loading]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      onKeyDown={onKeyDown}
      disabled={disabled || loading}
      className={`
        w-full px-3 py-2 border rounded-lg shadow-sm text-left
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        disabled:bg-slate-50 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed
        ${errorMessage ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'}
        ${disabled ? 'bg-slate-50 dark:bg-slate-700' : 'bg-white dark:bg-slate-800'}
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
              <span className="truncate text-slate-800 dark:text-slate-200 font-medium">{selectedKey.label}</span>
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
