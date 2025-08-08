import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { KeyMetadata, CommandError } from '../lib/api-types';

export interface UseKeySelectionOptions {
  onKeysLoaded?: (keys: KeyMetadata[]) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export interface UseKeySelectionResult {
  keys: KeyMetadata[];
  loading: boolean;
  error: string;
  isOpen: boolean;
  selectedKey: KeyMetadata | undefined;
  showPublicKeyPreview: boolean;
  setIsOpen: (open: boolean) => void;
  setShowPublicKeyPreview: (show: boolean) => void;
  handleToggle: () => void;
  handleKeySelect: (keyLabel: string) => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  formatDate: (dateString: string) => string;
  truncatePublicKey: (publicKey: string) => string;
}

export function useKeySelection(
  value?: string,
  onChange?: (keyLabel: string) => void,
  disabled = false,
  showPublicKey = true,
  options: UseKeySelectionOptions = {},
): UseKeySelectionResult {
  const { onKeysLoaded, onLoadingChange } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [keys, setKeys] = useState<KeyMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPublicKeyPreview, setShowPublicKeyPreview] = useState(showPublicKey);

  // Load available keys
  useEffect(() => {
    const loadKeys = async () => {
      setLoading(true);
      onLoadingChange?.(true);
      setError('');

      try {
        const result = await invoke<KeyMetadata[]>('list_keys_command');
        setKeys(result);
        onKeysLoaded?.(result);
      } catch (err) {
        const commandError = err as CommandError;
        setError(commandError.message || 'Failed to load keys');
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
  const formatDate = useCallback((dateString: string) => {
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
  }, []);

  // Truncate public key for display
  const truncatePublicKey = useCallback((publicKey: string) => {
    if (publicKey.length <= 20) return publicKey;
    return `${publicKey.substring(0, 10)}...${publicKey.substring(publicKey.length - 10)}`;
  }, []);

  const handleKeySelect = useCallback(
    (keyLabel: string) => {
      onChange?.(keyLabel);
      setIsOpen(false);
    },
    [onChange],
  );

  const handleToggle = useCallback(() => {
    if (!disabled && !loading) {
      setIsOpen(!isOpen);
    }
  }, [disabled, loading, isOpen]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleToggle();
      } else if (event.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [handleToggle],
  );

  return {
    keys,
    loading,
    error,
    isOpen,
    selectedKey,
    showPublicKeyPreview,
    setIsOpen,
    setShowPublicKeyPreview,
    handleToggle,
    handleKeySelect,
    handleKeyDown,
    formatDate,
    truncatePublicKey,
  };
}
