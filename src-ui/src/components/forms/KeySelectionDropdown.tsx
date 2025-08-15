import React, { useRef, useEffect } from 'react';
import { KeyMetadata } from '../../lib/api-types';
import { useKeySelection } from '../../hooks/useKeySelection';
import { KeyOption } from './KeyOption';
import { PublicKeyPreview } from './PublicKeyPreview';
import { DropdownButton } from './DropdownButton';
import { ErrorMessage } from './ErrorMessage';

export interface KeySelectionDropdownProps {
  /** Currently selected key label */
  value?: string;
  /** Callback when a key is selected */
  onChange?: (keyLabel: string) => void;
  /** Whether the dropdown is disabled */
  disabled?: boolean;
  /** Whether to show the public key preview */
  showPublicKey?: boolean;
  /** Custom placeholder text */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Custom label text */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Additional CSS classes */
  className?: string;
  /** Callback when keys are loaded */
  onKeysLoaded?: (keys: KeyMetadata[]) => void;
  /** Callback when loading state changes */
  onLoadingChange?: (loading: boolean) => void;
  /** Whether to auto-focus the dropdown button */
  autoFocus?: boolean;
  /** Callback called when a key is selected (for focus management) */
  onKeySelected?: () => void;
  /** Tab index for the dropdown button */
  tabIndex?: number;
}

export const KeySelectionDropdown: React.FC<KeySelectionDropdownProps> = ({
  value,
  onChange,
  disabled = false,
  showPublicKey = true,
  placeholder = 'Select a key...',
  required = false,
  label = 'Encryption Key',
  error,
  className = '',
  onKeysLoaded,
  onLoadingChange,
  autoFocus = false,
  onKeySelected,
  tabIndex,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    keys,
    loading,
    error: loadError,
    isOpen,
    selectedKey,
    showPublicKeyPreview,
    setShowPublicKeyPreview,
    handleToggle,
    handleKeySelect,
    handleKeyDown,
    formatDate,
    truncatePublicKey,
  } = useKeySelection(value, onChange, disabled, showPublicKey, {
    onKeysLoaded,
    onLoadingChange,
  });

  const errorMessage = error || loadError;

  // Focus trap and arrow key navigation for dropdown when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const dropdown = dropdownRef.current;
      if (!dropdown) return;

      const focusableElements = dropdown.querySelectorAll('[role="option"]');
      const currentIndex = Array.from(focusableElements).findIndex(
        (el) => el === document.activeElement,
      );

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Move to next option (wrap to first if at end)
        const nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
        (focusableElements[nextIndex] as HTMLElement)?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Move to previous option (wrap to last if at beginning)
        const nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
        (focusableElements[nextIndex] as HTMLElement)?.focus();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        // Tab also moves through options (same as arrow keys for consistency)
        if (e.shiftKey) {
          // Shift+Tab (backward)
          const nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
          (focusableElements[nextIndex] as HTMLElement)?.focus();
        } else {
          // Tab (forward)
          const nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
          (focusableElements[nextIndex] as HTMLElement)?.focus();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleToggle(); // Close dropdown
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleToggle]);

  // Auto-focus first option when dropdown opens
  useEffect(() => {
    if (isOpen && keys.length > 0) {
      const firstOption = dropdownRef.current?.querySelector('[role="option"]') as HTMLElement;
      if (firstOption) {
        setTimeout(() => firstOption.focus(), 50);
      }
    }
  }, [isOpen, keys.length]);

  // Custom key select handler that includes focus management
  const handleKeySelectWithFocus = (keyLabel: string) => {
    handleKeySelect(keyLabel);
    // Call the callback for external focus management (e.g., focus Continue button)
    onKeySelected?.();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <div className="flex items-center gap-2">
        <label className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>

      {/* Dropdown Container */}
      <div className="relative">
        {/* Main Button */}
        <DropdownButton
          selectedKey={selectedKey}
          loading={loading}
          disabled={disabled}
          isOpen={isOpen}
          placeholder={placeholder}
          errorMessage={errorMessage}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          tabIndex={tabIndex}
        />

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-auto"
          >
            {keys.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">
                No keys available. Generate a key first.
              </div>
            ) : (
              <ul role="listbox" className="py-1">
                {keys.map((key) => (
                  <KeyOption
                    key={key.label}
                    keyData={key}
                    isSelected={key.label === value}
                    onSelect={handleKeySelectWithFocus}
                    formatDate={formatDate}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Public Key Preview */}
      {selectedKey && selectedKey.public_key && showPublicKey && (
        <PublicKeyPreview
          publicKey={selectedKey.public_key}
          showPreview={showPublicKeyPreview}
          onTogglePreview={() => setShowPublicKeyPreview(!showPublicKeyPreview)}
          truncateKey={truncatePublicKey}
        />
      )}

      {/* Error Messages */}
      {errorMessage && <ErrorMessage message={errorMessage} />}

      {/* Empty State */}
      {!loading && keys.length === 0 && !errorMessage && (
        <p className="text-sm text-slate-500">
          No encryption keys found. Generate a key to get started.
        </p>
      )}
    </div>
  );
};
