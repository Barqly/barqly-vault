import { useState, useCallback, useMemo, useEffect } from 'react';
import { useVault } from '../contexts/VaultContext';
import { useUI } from '../contexts/UIContext';
import { logger } from '../lib/logger';
import { commands, type KeyInfo } from '../bindings';

export type FilterType = 'all' | 'passphrase' | 'yubikey' | 'suspended';

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
  const [globalKeys, setGlobalKeys] = useState<KeyInfo[]>([]);

  // Convert KeyInfo to KeyReference-like structure for compatibility with existing components
  const allKeys = useMemo(() => {
    return globalKeys.map((keyInfo) => {
      // Create a KeyReference-like object from KeyInfo
      const keyRef: any = {
        id: keyInfo.id,
        label: keyInfo.label,
        type: keyInfo.key_type.type, // Extract type from key_type
        created_at: keyInfo.created_at,
        lifecycle_status: keyInfo.lifecycle_status,
        is_available: keyInfo.is_available,
      };

      // Add type-specific data
      if (keyInfo.key_type.type === 'YubiKey') {
        keyRef.data = {
          serial: keyInfo.key_type.data.serial,
          firmware_version: keyInfo.key_type.data.firmware_version || null,
        };
      } else if (keyInfo.key_type.type === 'Passphrase') {
        keyRef.data = {
          key_id: keyInfo.key_type.data.key_id,
        };
      }

      return keyRef;
    });
  }, [globalKeys]);

  // Get vault attachments for a key
  const getKeyVaultAttachments = useCallback(
    (keyId: string) => {
      const key = globalKeys.find((k) => k.id === keyId);
      if (!key) {
        return [];
      }
      // Use vault_associations (multi-vault support)
      return key.vault_associations;
    },
    [globalKeys],
  );

  // Filter and search keys
  const filteredKeys = useMemo(() => {
    let keys = allKeys;

    // Apply filter
    if (filterType === 'passphrase') {
      keys = keys.filter((k) => k.type === 'Passphrase');
    } else if (filterType === 'yubikey') {
      keys = keys.filter((k) => k.type === 'YubiKey');
    } else if (filterType === 'suspended') {
      // Keys without vault attachment
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

    // Remove duplicates (keys should already be unique from global registry)
    const uniqueKeys = Array.from(new Map(keys.map((k) => [k.id, k])).values());

    return uniqueKeys;
  }, [allKeys, filterType, searchQuery, getKeyVaultAttachments]);

  // Refresh all keys from global registry
  const refreshAllKeys = useCallback(async () => {
    try {
      // Get ALL keys from global registry
      const result = await commands.listUnifiedKeys({ type: 'All' });

      if (result.status === 'ok') {
        setGlobalKeys(result.data);
        logger.info('ManageKeysWorkflow', 'Refreshed global keys', {
          keyCount: result.data.length,
        });
      } else {
        throw new Error(result.error.message);
      }
    } catch (err) {
      logger.error('ManageKeysWorkflow', 'Failed to refresh all keys', err as Error);
      setError('Failed to refresh keys');
    }
  }, []);

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

  // Load keys on mount
  useEffect(() => {
    refreshAllKeys();
  }, [refreshAllKeys]);

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
