import { useState, useCallback, useMemo } from 'react';
import { useVault } from '../contexts/VaultContext';
import { useUI } from '../contexts/UIContext';

export type FilterType = 'all' | 'passphrase' | 'yubikey' | 'suspended';

export const useManageKeysWorkflow = () => {
  const { getGlobalKeys, refreshGlobalKeys } = useVault();
  const { keyViewMode, setKeyViewMode } = useUI();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  // New: Multi-select filter state
  const [showPassphraseKeys, setShowPassphraseKeys] = useState(true);
  const [showYubiKeyKeys, setShowYubiKeyKeys] = useState(true);
  const [showRecipientKeys, setShowRecipientKeys] = useState(true);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDetectingYubiKey, setIsDetectingYubiKey] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(new Set<string>());
  const [error, setError] = useState<string | null>(null);

  // Read from global cache (instant, no async!)
  const allKeys = getGlobalKeys();

  // Get vault attachments for a key
  const getKeyVaultAttachments = useCallback(
    (keyId: string) => {
      const key = allKeys.find((k) => k.id === keyId);
      if (!key) {
        return [];
      }
      // Use vault_associations (multi-vault support)
      return key.vault_associations;
    },
    [allKeys],
  );

  // Toggle filter functions - Prevent all from being deactivated
  const togglePassphraseFilter = useCallback(() => {
    setShowPassphraseKeys((prev) => {
      // If trying to deactivate Passphrase, only allow if at least one other is active
      if (prev && !showYubiKeyKeys && !showRecipientKeys) {
        return true; // Keep Passphrase active (can't deactivate all)
      }
      return !prev;
    });
  }, [showYubiKeyKeys, showRecipientKeys]);

  const toggleYubiKeyFilter = useCallback(() => {
    setShowYubiKeyKeys((prev) => {
      // If trying to deactivate YubiKey, only allow if at least one other is active
      if (prev && !showPassphraseKeys && !showRecipientKeys) {
        return true; // Keep YubiKey active (can't deactivate all)
      }
      return !prev;
    });
  }, [showPassphraseKeys, showRecipientKeys]);

  const toggleRecipientFilter = useCallback(() => {
    setShowRecipientKeys((prev) => {
      // If trying to deactivate Recipient, only allow if at least one other is active
      if (prev && !showPassphraseKeys && !showYubiKeyKeys) {
        return true; // Keep Recipient active (can't deactivate all)
      }
      return !prev;
    });
  }, [showPassphraseKeys, showYubiKeyKeys]);

  // Filter and search keys
  const filteredKeys = useMemo(() => {
    // Filter out destroyed keys (per NIST spec - not shown in UI)
    let keys = allKeys.filter((k) => k.lifecycle_status !== 'destroyed');

    // Apply multi-select filter - show keys that match ANY active filter
    const allSelected = showPassphraseKeys && showYubiKeyKeys && showRecipientKeys;
    const noneSelected = !showPassphraseKeys && !showYubiKeyKeys && !showRecipientKeys;

    if (allSelected || noneSelected) {
      // Show all keys (no filter)
    } else {
      // Filter to show only selected types
      keys = keys.filter((k) => {
        if (showPassphraseKeys && k.key_type.type === 'Passphrase') return true;
        if (showYubiKeyKeys && k.key_type.type === 'YubiKey') return true;
        if (showRecipientKeys && k.key_type.type === 'Recipient') return true;
        return false;
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

    // Sort: YubiKey first (hardware), then Passphrase, then Recipient (alphabetically within type)
    const sortedKeys = uniqueKeys.sort((a, b) => {
      const typeOrder: Record<string, number> = { YubiKey: 0, Passphrase: 1, Recipient: 2 };
      const aOrder = typeOrder[a.key_type.type] ?? 3;
      const bOrder = typeOrder[b.key_type.type] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      // Then, sort alphabetically by label
      return a.label.localeCompare(b.label);
    });

    return sortedKeys;
  }, [
    allKeys,
    showPassphraseKeys,
    showYubiKeyKeys,
    showRecipientKeys,
    searchQuery,
    getKeyVaultAttachments,
  ]);

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
    showPassphraseKeys,
    showYubiKeyKeys,
    showRecipientKeys,

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
    refreshAllKeys: refreshGlobalKeys,
    clearError,
    togglePassphraseFilter,
    toggleYubiKeyFilter,
    toggleRecipientFilter,
  };
};
