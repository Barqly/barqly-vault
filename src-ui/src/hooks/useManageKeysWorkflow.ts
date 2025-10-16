import { useState, useCallback, useMemo, useEffect } from 'react';
import { useVault } from '../contexts/VaultContext';
import { useUI } from '../contexts/UIContext';
import { logger } from '../lib/logger';
import { commands, type GlobalKey } from '../bindings';

export type FilterType = 'all' | 'passphrase' | 'yubikey' | 'suspended';

export const useManageKeysWorkflow = () => {
  const { keyCache, refreshKeysForVault, vaults } = useVault();
  const { keyViewMode, setKeyViewMode } = useUI();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  // New: Multi-select filter state
  const [showPassphraseKeys, setShowPassphraseKeys] = useState(true);
  const [showYubiKeyKeys, setShowYubiKeyKeys] = useState(true);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDetectingYubiKey, setIsDetectingYubiKey] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(new Set<string>());
  const [error, setError] = useState<string | null>(null);
  const [globalKeys, setGlobalKeys] = useState<GlobalKey[]>([]);

  // Use GlobalKey directly - no conversion needed!
  const allKeys = globalKeys;

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

  // Toggle filter functions
  const togglePassphraseFilter = useCallback(() => {
    setShowPassphraseKeys((prev) => !prev);
  }, []);

  const toggleYubiKeyFilter = useCallback(() => {
    setShowYubiKeyKeys((prev) => !prev);
  }, []);

  // Filter and search keys
  const filteredKeys = useMemo(() => {
    let keys = allKeys;

    // Apply multi-select filter
    // If both are selected or both are unselected = show all
    // If only one is selected = show only that type
    const bothSelected = showPassphraseKeys && showYubiKeyKeys;
    const noneSelected = !showPassphraseKeys && !showYubiKeyKeys;

    if (bothSelected || noneSelected) {
      // Show all keys (no filter)
    } else if (showPassphraseKeys) {
      keys = keys.filter((k) => k.key_type.type === 'Passphrase');
    } else if (showYubiKeyKeys) {
      keys = keys.filter((k) => k.key_type.type === 'YubiKey');
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

    // Sort: Passphrase first (alphabetically), then YubiKey (alphabetically)
    const sortedKeys = uniqueKeys.sort((a, b) => {
      // First, sort by type (Passphrase before YubiKey)
      if (a.key_type.type !== b.key_type.type) {
        return a.key_type.type === 'Passphrase' ? -1 : 1;
      }
      // Then, sort alphabetically by label
      return a.label.localeCompare(b.label);
    });

    return sortedKeys;
  }, [allKeys, showPassphraseKeys, showYubiKeyKeys, searchQuery, getKeyVaultAttachments]);

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
    showPassphraseKeys,
    showYubiKeyKeys,

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
    togglePassphraseFilter,
    toggleYubiKeyFilter,
  };
};
