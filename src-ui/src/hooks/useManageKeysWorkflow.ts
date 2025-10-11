import { useState, useCallback, useMemo } from 'react';
import { useVault } from '../contexts/VaultContext';
import { useUI } from '../contexts/UIContext';
import { logger } from '../lib/logger';

export type FilterType = 'all' | 'passphrase' | 'yubikey' | 'orphan';

export const useManageKeysWorkflow = () => {
  const { keyCache, refreshKeysForVault, vaults } = useVault();
  const { keyViewMode, setKeyViewMode } = useUI();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDetectingYubiKey, setIsDetectingYubiKey] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(new Set<string>());
  const [error, setError] = useState<string | null>(null);

  // Get all keys from cache across all vaults
  const allKeys = useMemo(() => {
    const keys = Array.from(keyCache.values()).flat();
    return keys;
  }, [keyCache]);

  // Get vault attachments for a key
  const getKeyVaultAttachments = useCallback(
    (keyId: string) => {
      const attachments: string[] = [];
      keyCache.forEach((keys, vaultId) => {
        if (keys.some((k) => k.id === keyId)) {
          attachments.push(vaultId);
        }
      });
      return attachments;
    },
    [keyCache],
  );

  // Filter and search keys
  const filteredKeys = useMemo(() => {
    let keys = allKeys;

    // Apply filter
    if (filterType === 'passphrase') {
      keys = keys.filter((k) => k.type === 'Passphrase');
    } else if (filterType === 'yubikey') {
      keys = keys.filter((k) => k.type === 'YubiKey');
    } else if (filterType === 'orphan') {
      keys = keys.filter((k) => {
        const attachments = getKeyVaultAttachments(k.id);
        return attachments.length === 0;
      });
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      keys = keys.filter(
        (k) => k.label.toLowerCase().includes(query) || k.id.toLowerCase().includes(query),
      );
    }

    // Remove duplicates (keys can be in multiple vaults)
    const uniqueKeys = Array.from(new Map(keys.map((k) => [k.id, k])).values());

    return uniqueKeys;
  }, [allKeys, filterType, searchQuery, getKeyVaultAttachments]);

  // Refresh all keys across all vaults
  const refreshAllKeys = useCallback(async () => {
    try {
      const promises = vaults.map((vault) => refreshKeysForVault(vault.id));
      await Promise.all(promises);
    } catch (err) {
      logger.error('ManageKeysWorkflow', 'Failed to refresh all keys', err as Error);
      setError('Failed to refresh keys');
    }
  }, [vaults, refreshKeysForVault]);

  // Toggle key selection
  const toggleKeySelection = useCallback((keyId: string) => {
    setSelectedKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  }, []);

  // Clear all selections
  const clearSelections = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    searchQuery,
    filterType,
    keyViewMode,
    isCreatingKey,
    isImporting,
    isDetectingYubiKey,
    selectedKeys,
    error,

    // Derived state
    allKeys: filteredKeys,
    getKeyVaultAttachments,

    // Actions
    setSearchQuery,
    setFilterType,
    setKeyViewMode,
    setIsCreatingKey,
    setIsImporting,
    setIsDetectingYubiKey,
    toggleKeySelection,
    clearSelections,
    refreshAllKeys,
    clearError,
  };
};
