import React from 'react';
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
}) => {
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
        />

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-auto">
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
                    onSelect={handleKeySelect}
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
