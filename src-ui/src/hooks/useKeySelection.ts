import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { commands, KeyReference, GetKeyMenuDataRequest, KeyMenuInfo } from '../bindings';
import { useVault } from '../contexts/VaultContext';

export interface UseKeySelectionOptions {
  onKeysLoaded?: (keys: KeyReference[]) => void;
  onLoadingChange?: (loading: boolean) => void;
  includeAllKeys?: boolean; // If true, include all keys (passphrase + YubiKey), otherwise only passphrase
}

export interface UseKeySelectionResult {
  keys: KeyReference[];
  loading: boolean;
  error: string;
  isOpen: boolean;
  selectedKey: KeyReference | undefined;
  showPublicKeyPreview: boolean;
  setIsOpen: (open: boolean) => void;
  setShowPublicKeyPreview: (show: boolean) => void;
  handleToggle: () => void;
  handleKeySelect: (keyId: string) => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  formatDate: (dateString: string) => string;
  truncatePublicKey: (publicKey: string) => string;
}

export function useKeySelection(
  value?: string,
  onChange?: (keyId: string) => void,
  disabled = false,
  showPublicKey = true,
  options: UseKeySelectionOptions = {},
): UseKeySelectionResult {
  const { onKeysLoaded, onLoadingChange, includeAllKeys = false } = options;
  const { currentVault } = useVault();

  const [isOpen, setIsOpen] = useState(false);
  const [keys, setKeys] = useState<KeyReference[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPublicKeyPreview, setShowPublicKeyPreview] = useState(showPublicKey);

  // Load available keys from current vault
  useEffect(() => {
    const loadKeys = async () => {
      if (!currentVault) {
        setKeys([]);
        setError('No vault selected');
        return;
      }

      setLoading(true);
      onLoadingChange?.(true);
      setError('');

      try {
        // Use new KeyMenuInfo API for consistent data
        const menuRequest: GetKeyMenuDataRequest = { vault_id: currentVault.id };
        const menuResult = await commands.getKeyMenuData(menuRequest);

        if (menuResult.status === 'error') {
          throw new Error(menuResult.error.message || 'Failed to load key menu data');
        }

        // Filter for active keys only (for decryption dropdown)
        const activeKeys = menuResult.data.keys.filter((key) => key.state === 'active');

        // Convert KeyMenuInfo to KeyReference for backward compatibility
        const keyRefs: KeyReference[] = activeKeys.map((keyMenuInfo: KeyMenuInfo) => {
          const baseRef = {
            id: keyMenuInfo.internal_id,
            label: keyMenuInfo.label, // Now uses proper labels!
            state: keyMenuInfo.state as any,
            created_at: keyMenuInfo.created_at,
            last_used: null,
          };

          if (keyMenuInfo.key_type === 'passphrase') {
            return {
              ...baseRef,
              type: 'passphrase' as const,
              key_id: keyMenuInfo.internal_id,
            };
          } else {
            // YubiKey type - properly handle discriminated union
            if ('serial' in keyMenuInfo.metadata) {
              return {
                ...baseRef,
                type: 'yubikey' as const,
                serial: keyMenuInfo.metadata.serial,
                firmware_version: keyMenuInfo.metadata.firmware_version || null,
              };
            } else {
              return {
                ...baseRef,
                type: 'yubikey' as const,
                serial: '',
                firmware_version: null,
              };
            }
          }
        });

        setKeys(keyRefs);
        onKeysLoaded?.(keyRefs);
      } catch (err: any) {
        setError(err.message || 'Failed to load keys');
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    loadKeys();
  }, [currentVault, includeAllKeys, onKeysLoaded, onLoadingChange]);

  // Get selected key data
  const selectedKey = keys.find((key) => key.id === value);

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
    (keyId: string) => {
      onChange?.(keyId);
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
