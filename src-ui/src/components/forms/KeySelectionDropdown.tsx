import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChevronDown, Key, Calendar, Eye, EyeOff } from 'lucide-react';
import { KeyMetadata, CommandError } from '../../lib/api-types';

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
  const [isOpen, setIsOpen] = useState(false);
  const [keys, setKeys] = useState<KeyMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showPublicKeyPreview, setShowPublicKeyPreview] = useState(showPublicKey);

  // Load available keys
  useEffect(() => {
    const loadKeys = async () => {
      setLoading(true);
      onLoadingChange?.(true);
      setErrorMessage('');

      try {
        const result = await invoke<KeyMetadata[]>('list_keys_command');
        setKeys(result);
        onKeysLoaded?.(result);
      } catch (err) {
        const commandError = err as CommandError;
        setErrorMessage(commandError.message || 'Failed to load keys');
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    loadKeys();
  }, [onKeysLoaded, onLoadingChange]);

  // Get selected key data
  const selectedKey = keys.find((key) => key.label === value);

  // Format creation date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown date';
    }
  };

  // Truncate public key for display
  const truncatePublicKey = (publicKey: string) => {
    if (publicKey.length <= 20) return publicKey;
    return `${publicKey.substring(0, 10)}...${publicKey.substring(publicKey.length - 10)}`;
  };

  const handleKeySelect = (keyLabel: string) => {
    onChange?.(keyLabel);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!disabled && !loading) {
      setIsOpen(!isOpen);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    } else if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      <div className="flex items-center gap-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>

      {/* Dropdown Container */}
      <div className="relative">
        {/* Main Button */}
        <button
          type="button"
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading}
          className={`
            w-full px-3 py-2 border rounded-md shadow-sm text-left
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error || errorMessage ? 'border-red-300' : 'border-gray-300'}
            ${disabled ? 'bg-gray-50' : 'bg-white'}
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
                  <span className="text-gray-500">Loading keys...</span>
                </div>
              ) : selectedKey ? (
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Key className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="truncate">{selectedKey.label}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500">{placeholder}</span>
                </div>
              )}
            </div>
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {keys.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No keys available. Generate a key first.
              </div>
            ) : (
              <ul role="listbox" className="py-1">
                {keys.map((key) => (
                  <li
                    key={key.label}
                    role="option"
                    aria-selected={key.label === value}
                    className={`
                      px-3 py-2 cursor-pointer hover:bg-blue-50
                      ${key.label === value ? 'bg-blue-100 text-blue-900' : 'text-gray-900'}
                    `}
                    onClick={() => handleKeySelect(key.label)}
                  >
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{key.label}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(key.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Public Key Preview */}
      {selectedKey && selectedKey.public_key && showPublicKey && (
        <div className="mt-2 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Public Key</span>
            <button
              type="button"
              onClick={() => setShowPublicKeyPreview(!showPublicKeyPreview)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={showPublicKeyPreview ? 'Hide public key' : 'Show public key'}
            >
              {showPublicKeyPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {showPublicKeyPreview && (
            <div className="text-xs font-mono text-gray-600 break-all">
              {truncatePublicKey(selectedKey.public_key)}
            </div>
          )}
        </div>
      )}

      {/* Error Messages */}
      {(error || errorMessage) && (
        <p className="text-sm text-red-600 flex items-center">
          <svg
            aria-hidden="true"
            className="lucide lucide-circle-alert w-4 h-4 mr-1"
            fill="none"
            height="24"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          {error || errorMessage}
        </p>
      )}

      {/* Empty State */}
      {!loading && keys.length === 0 && !error && !errorMessage && (
        <p className="text-sm text-gray-500">
          No encryption keys found. Generate a key to get started.
        </p>
      )}
    </div>
  );
};
