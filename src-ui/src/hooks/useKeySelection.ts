import { useState, useEffect, useCallback, useMemo } from 'react';
import React from 'react';
import { KeyReference } from '../bindings';
import { useVault } from '../contexts/VaultContext';

// Extended KeyReference with availability status from global key registry
export interface KeyReferenceWithAvailability extends KeyReference {
  is_available: boolean;
}

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
  const { onKeysLoaded, onLoadingChange, includeAllKeys = false, vaultId: overrideVaultId } = options;
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
    if (!targetVaultId) {
      return [];
    }

    // Get keys from cache (instant, no async) - access cache directly
    const allKeys = (keyCache.get(targetVaultId) || []) as KeyReference[];

    // Debug: Check what's in the cache
    console.log('useKeySelection: Cache debug', {
      vaultId: targetVaultId,
      overrideVaultId,
      currentVaultId: currentVault?.id,
      cacheSize: keyCache.size,
      cacheKeys: Array.from(keyCache.keys()),
      keysForThisVault: allKeys.length,
    });

    console.log('useKeySelection: Keys from cache', {
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
    // For decryption, we want all keys regardless of status
    // For encryption, we typically want only active keys
    const filteredKeys = includeAllKeys
      ? allKeys // Include all keys for decryption
      : allKeys.filter((key) => key.lifecycle_status === 'active');

    // Merge availability status from globalKeyCache
    const keysWithAvailability: KeyReferenceWithAvailability[] = filteredKeys.map((key) => {
      const globalKey = globalKeyCache.find((gk) => gk.id === key.id);
      return {
        ...key,
        is_available: globalKey?.is_available ?? false, // Default to false if not found
      };
    });

    console.log('useKeySelection: Filtered keys with availability', {
      filteredCount: keysWithAvailability.length,
      filtered: keysWithAvailability.map((k) => ({
        id: k.id,
        type: k.type,
        label: k.label,
        is_available: k.is_available,
      })),
    });

    return keysWithAvailability;
  }, [targetVaultId, keyCache, globalKeyCache, includeAllKeys]);

  // Loading state based on VaultContext initialization
  const loading = !isInitialized;

  // Update error state when no vault is selected
  useEffect(() => {
    if (!targetVaultId) {
      setError('No vault selected');
    } else {
      setError('');
    }
  }, [targetVaultId]);

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
