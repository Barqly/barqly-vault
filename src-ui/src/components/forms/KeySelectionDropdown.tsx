import React, { useRef, useEffect, useMemo } from 'react';
import { KeyReference } from '../../bindings';
import { useKeySelection, KeyReferenceWithAvailability } from '../../hooks/useKeySelection';
import { KeyOption } from './KeyOption';
import { DropdownButton } from './DropdownButton';
import { ErrorMessage } from './ErrorMessage';
import { useVault } from '../../contexts/VaultContext';

export interface KeySelectionDropdownProps {
  /** Currently selected key ID */
  value?: string;
  /** Callback when a key is selected */
  onChange?: (keyId: string) => void;
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
  onKeysLoaded?: (keys: KeyReference[]) => void;
  /** Callback when loading state changes */
  onLoadingChange?: (loading: boolean) => void;
  /** Whether to auto-focus the dropdown button */
  autoFocus?: boolean;
  /** Callback called when a key is selected (for focus management) */
  onKeySelected?: () => void;
  /** Include all key types (passphrase + YubiKey) for decrypt operations */
  includeAllKeys?: boolean;
  /** Optional vault ID override (for decryption with detectedVaultId) */
  vaultId?: string | null;
  /** Optional: Pass keys directly for recovery mode (bypasses cache) */
  recoveryKeys?: KeyReference[];
  /** Optional: Recovery mode styling and behavior */
  isRecoveryMode?: boolean;
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
  includeAllKeys = false,
  vaultId,
  recoveryKeys,
  isRecoveryMode = false,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { globalKeyCache } = useVault();

  // Use recovery keys if provided, otherwise use useKeySelection hook
  const hookResult = useKeySelection(value, onChange, disabled, showPublicKey, {
    onKeysLoaded,
    onLoadingChange,
    includeAllKeys,
    vaultId,
  });

  // Transform recovery keys to include availability from globalKeyCache
  const keysWithAvailability = useMemo(() => {
    if (!recoveryKeys) return hookResult.keys;

    // Merge availability status from globalKeyCache
    return recoveryKeys.map((key) => {
      const globalKey = globalKeyCache.find((gk) => gk.id === key.id);
      return {
        ...key,
        is_available: globalKey?.is_available ?? false,
      } as KeyReferenceWithAvailability;
    });
  }, [recoveryKeys, hookResult.keys, globalKeyCache]);

  // Override keys with recovery keys if provided
  const keys = keysWithAvailability;
  const loading = recoveryKeys ? false : hookResult.loading;
  const loadError = recoveryKeys ? '' : hookResult.error;
  const {
    isOpen,
    selectedKey: hookSelectedKey,
    showPublicKeyPreview: _showPublicKeyPreview,
    setShowPublicKeyPreview: _setShowPublicKeyPreview,
    handleToggle,
    handleKeySelect,
    handleKeyDown,
    formatDate,
    truncatePublicKey: _truncatePublicKey,
  } = hookResult;

  // Override selectedKey when using recoveryKeys (hook looks in wrong array)
  const selectedKey = recoveryKeys ? keys.find((key) => key.id === value) : hookSelectedKey;

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
        // If no item is focused yet, focus the first one
        if (currentIndex === -1) {
          (focusableElements[0] as HTMLElement)?.focus();
        } else {
          // Move to next option (wrap to first if at end)
          const nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
          (focusableElements[nextIndex] as HTMLElement)?.focus();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // If no item is focused yet, focus the last one
        if (currentIndex === -1) {
          (focusableElements[focusableElements.length - 1] as HTMLElement)?.focus();
        } else {
          // Move to previous option (wrap to last if at beginning)
          const nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
          (focusableElements[nextIndex] as HTMLElement)?.focus();
        }
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

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Check if click is outside the dropdown container
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        // Also check if it's not the dropdown button itself
        const button = document.querySelector('[aria-expanded]');
        if (button && !button.contains(target)) {
          handleToggle(); // Close the dropdown
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleToggle]);

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
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
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
        />

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto"
          >
            {keys.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-500">
                No keys available. Generate a key first.
              </div>
            ) : (
              <ul role="listbox" className="py-1">
                {keys.map((key) => (
                  <KeyOption
                    key={key.id}
                    keyData={key}
                    isSelected={key.id === value}
                    onSelect={handleKeySelectWithFocus}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Public Key Preview - Not available for vault keys */}
      {/* KeyReference doesn't include public_key data */}

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
