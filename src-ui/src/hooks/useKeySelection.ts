import { useState, useEffect, useCallback, useMemo } from 'react';
import React from 'react';
import type { KeyReference } from '../lib/key-types';
import { isOwnedKey } from '../lib/key-types';
import { useVault } from '../contexts/VaultContext';
import { logger } from '../lib/logger';

// Extended KeyReference with availability status from global key registry
export type KeyReferenceWithAvailability = KeyReference & {
  is_available: boolean;
};

export interface UseKeySelectionOptions {
  onKeysLoaded?: (keys: KeyReference[]) => void;
  onLoadingChange?: (loading: boolean) => void;
  includeAllKeys?: boolean; // If true, include all keys (passphrase + YubiKey), otherwise only passphrase
  vaultId?: string | null; // Optional: override vault ID (for decryption with detectedVaultId)
}

export interface UseKeySelectionResult {
  keys: KeyReferenceWithAvailability[];
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
  const {
    onKeysLoaded,
    onLoadingChange,
    includeAllKeys = false,
    vaultId: overrideVaultId,
  } = options;
  const { currentVault, keyCache, globalKeyCache, isInitialized } = useVault();

  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPublicKeyPreview, setShowPublicKeyPreview] = useState(showPublicKey);

  // Determine which vault ID to use:
  // 1. If overrideVaultId is provided (for decryption), use it
  // 2. Otherwise, use currentVault.id from context
  const targetVaultId = overrideVaultId !== undefined ? overrideVaultId : currentVault?.id;

  // Use cache-first architecture - get keys from VaultContext cache
  // Access keyCache directly like KeyMenuBar does to avoid memoization issues
  const keysFromCache = useMemo(() => {
    let allKeys: KeyReference[] = [];

    if (targetVaultId) {
      // Normal mode: Get keys from vault-specific cache
      allKeys = (keyCache.get(targetVaultId) || []) as KeyReference[];
    } else if (includeAllKeys) {
      // Shared bundle mode: No local vault, use global key registry
      // Convert GlobalKey to KeyReference (VaultKey) format for compatibility
      allKeys = globalKeyCache
        .filter((gk) => gk.key_type.type !== 'Recipient') // Only owned keys
        .map((gk) => {
          const keyType = gk.key_type;
          // Build the discriminated union part based on key type
          if (keyType.type === 'Passphrase') {
            return {
              type: 'Passphrase' as const,
              data: keyType.data,
              id: gk.id,
              label: gk.label,
              lifecycle_status: gk.lifecycle_status,
              created_at: gk.created_at,
              last_used: gk.last_used,
            };
          } else if (keyType.type === 'YubiKey') {
            return {
              type: 'YubiKey' as const,
              data: keyType.data,
              id: gk.id,
              label: gk.label,
              lifecycle_status: gk.lifecycle_status,
              created_at: gk.created_at,
              last_used: gk.last_used,
            };
          }
          // Should never reach here due to filter, but TypeScript needs this
          throw new Error(`Unexpected key type: ${keyType.type}`);
        });
    } else {
      return [];
    }

    // Debug: Check what's in the cache
    logger.debug('useKeySelection', 'Cache state', {
      vaultId: targetVaultId,
      cacheSize: keyCache.size,
      keysForThisVault: allKeys.length,
    });

    logger.debug('useKeySelection', 'Keys from cache', {
      vaultId: targetVaultId,
      totalKeys: allKeys.length,
      includeAllKeys,
      keys: allKeys.map((k) => ({
        id: k.id,
        type: k.type,
        label: k.label,
        status: k.lifecycle_status,
      })),
    });

    // Filter keys based on includeAllKeys parameter
    // For decryption, we want all owned keys (Passphrase + YubiKey) regardless of status
    // For encryption, we typically want only active keys
    // Always exclude Recipients - they can only encrypt, not decrypt
    const filteredKeys = includeAllKeys
      ? allKeys.filter((key) => isOwnedKey(key)) // Include only owned keys (exclude Recipients)
      : allKeys.filter((key) => key.lifecycle_status === 'active' && isOwnedKey(key));

    // Merge availability status from globalKeyCache
    const keysWithAvailability: KeyReferenceWithAvailability[] = filteredKeys.map((key) => {
      const globalKey = globalKeyCache.find((gk) => gk.id === key.id);
      return {
        ...key,
        is_available: globalKey?.is_available ?? false, // Default to false if not found
      };
    });

    // Sort keys: Available first (YubiKey → Passphrase), then Unavailable (YubiKey → Passphrase)
    const sortedKeys = keysWithAvailability.sort((a, b) => {
      // Primary sort: Available keys before unavailable
      if (a.is_available && !b.is_available) return -1;
      if (!a.is_available && b.is_available) return 1;

      // Secondary sort: YubiKey before Passphrase (within same availability group)
      const aIsYubiKey = a.type === 'YubiKey';
      const bIsYubiKey = b.type === 'YubiKey';
      if (aIsYubiKey && !bIsYubiKey) return -1;
      if (!aIsYubiKey && bIsYubiKey) return 1;

      // Tertiary sort: Alphabetically by label
      return (a.label || '').localeCompare(b.label || '');
    });

    logger.debug('useKeySelection', 'Sorted keys with availability', {
      filteredCount: sortedKeys.length,
      filtered: sortedKeys.map((k) => ({
        id: k.id,
        type: k.type,
        label: k.label,
        is_available: k.is_available,
      })),
    });

    return sortedKeys;
  }, [targetVaultId, keyCache, globalKeyCache, includeAllKeys]);

  // Loading state based on VaultContext initialization
  const loading = !isInitialized;

  // Update error state when no vault is selected
  // For shared bundles (includeAllKeys=true), no vault is expected - use global keys
  useEffect(() => {
    if (!targetVaultId && !includeAllKeys) {
      setError('No vault selected');
    } else {
      setError('');
    }
  }, [targetVaultId, includeAllKeys]);

  // Notify parent component when keys are loaded
  useEffect(() => {
    if (!loading && keysFromCache.length >= 0) {
      onKeysLoaded?.(keysFromCache);
    }
  }, [keysFromCache, loading, onKeysLoaded]);

  // Notify parent component about loading state changes
  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  // Get selected key data
  const selectedKey = keysFromCache.find((key) => key.id === value);

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
    keys: keysFromCache,
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
