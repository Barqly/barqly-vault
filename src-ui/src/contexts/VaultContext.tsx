import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  commands,
  VaultSummary,
  KeyReference,
  CreateVaultRequest,
  SetCurrentVaultRequest,
  RemoveKeyFromVaultRequest,
  GetKeyMenuDataRequest,
  KeyMenuInfo,
  VaultStatistics,
} from '../bindings';
import { logger } from '../lib/logger';

interface VaultContextType {
  // Current vault state
  currentVault: VaultSummary | null;
  vaults: VaultSummary[];
  vaultKeys: KeyReference[]; // DEPRECATED: Use getCurrentVaultKeys() instead

  // NEW: Cache-first key access
  keyCache: Map<string, KeyReference[]>;
  getCurrentVaultKeys: () => KeyReference[];

  // NEW: Statistics cache
  statisticsCache: Map<string, VaultStatistics>;
  getVaultStatistics: (vaultId: string) => VaultStatistics | null;

  // Loading states
  isLoading: boolean;
  isLoadingKeys: boolean;
  isLoadingStatistics: boolean;

  // Error state
  error: string | null;

  // Actions
  createVault: (name: string, description?: string | null) => Promise<void>;
  setCurrentVault: (vaultId: string) => void; // Now synchronous!
  refreshVaults: () => Promise<void>;
  refreshKeys: () => Promise<void>; // DEPRECATED: Use refreshKeysForVault
  refreshKeysForVault: (vaultId: string) => Promise<void>;
  removeKeyFromVault: (keyId: string) => Promise<void>;
  refreshAllStatistics: () => Promise<void>; // NEW: Batch refresh all statistics
  refreshVaultStatistics: (vaultName: string) => Promise<void>; // NEW: Refresh single vault statistics
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentVault, setCurrentVaultState] = useState<VaultSummary | null>(null);
  const [vaults, setVaults] = useState<VaultSummary[]>([]);
  const [vaultKeys, setVaultKeys] = useState<KeyReference[]>([]); // DEPRECATED - use keyCache
  const [keyCache, setKeyCache] = useState<Map<string, KeyReference[]>>(new Map());
  const [statisticsCache, setStatisticsCache] = useState<Map<string, VaultStatistics>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isLoadingStatistics, setIsLoadingStatistics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get keys for current vault from cache (instant, no async)
  const getCurrentVaultKeys = useCallback((): KeyReference[] => {
    if (!currentVault) return [];
    return keyCache.get(currentVault.id) || [];
  }, [currentVault?.id, keyCache]);

  // Get statistics for a vault from cache (instant, no async)
  const getVaultStatistics = useCallback(
    (vaultId: string): VaultStatistics | null => {
      return statisticsCache.get(vaultId) || null;
    },
    [statisticsCache],
  );

  // Refresh all vault statistics using batch API
  const refreshAllStatistics = useCallback(async () => {
    setIsLoadingStatistics(true);
    setError(null);

    try {
      logger.info('VaultContext', 'Fetching statistics for all vaults');

      const result = await commands.getAllVaultStatistics({
        status_filter: null, // Get all vaults
      });

      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to get vault statistics');
      }

      if (result.data.success && result.data.statistics) {
        const stats = result.data.statistics;

        // Update cache with all vault statistics
        const newCache = new Map<string, VaultStatistics>();
        stats.vault_statistics.forEach((vaultStats) => {
          newCache.set(vaultStats.vault_id, vaultStats);
        });

        setStatisticsCache(newCache);

        logger.info('VaultContext', 'Statistics cached for all vaults', {
          vaultCount: stats.vault_statistics.length,
          totalFiles: stats.total_files,
          totalSize: stats.total_size_bytes,
        });
      }
    } catch (err: any) {
      logger.error('VaultContext', 'Failed to refresh all statistics', err);
      setError(err.message || 'Failed to load statistics');
    } finally {
      setIsLoadingStatistics(false);
    }
  }, []);

  // Refresh statistics for a single vault
  const refreshVaultStatistics = useCallback(async (vaultName: string) => {
    setIsLoadingStatistics(true);
    setError(null);

    try {
      logger.info('VaultContext', 'Fetching statistics for vault', { vaultName });

      const result = await commands.getVaultStatistics({
        vault_name: vaultName,
      });

      if (result.status === 'error') {
        throw new Error(result.error || 'Failed to get vault statistics');
      }

      if (result.data.success && result.data.statistics) {
        const vaultStats = result.data.statistics;

        // Update cache with this vault's statistics
        setStatisticsCache((prev) => {
          const newCache = new Map(prev);
          newCache.set(vaultStats.vault_id, vaultStats);
          return newCache;
        });

        logger.info('VaultContext', 'Statistics cached for vault', {
          vaultId: vaultStats.vault_id,
          status: vaultStats.status,
          fileCount: vaultStats.file_count,
        });
      }
    } catch (err: any) {
      logger.error('VaultContext', 'Failed to refresh vault statistics', err);
      setError(err.message || 'Failed to load statistics');
    } finally {
      setIsLoadingStatistics(false);
    }
  }, []);

  const refreshVaults = async () => {
    console.log('🔍 VaultContext: refreshVaults called');
    setIsLoading(true);
    setError(null);

    try {
      // Get all vaults
      console.log('🔍 VaultContext: Calling listVaults...');
      const vaultsResult = await commands.listVaults();
      console.log('🔍 VaultContext: listVaults response', vaultsResult);

      if (vaultsResult.status === 'error') {
        console.error('🚨 VaultContext: listVaults returned error', vaultsResult.error);
        throw new Error(vaultsResult.error.message || 'Failed to list vaults');
      }
      const vaultsResponse = vaultsResult.data;
      console.log('🔍 VaultContext: Vaults loaded', vaultsResponse.vaults);
      setVaults(vaultsResponse.vaults);

      // Get current vault
      console.log('🔍 VaultContext: Calling getCurrentVault...');
      const currentResult = await commands.getCurrentVault();
      console.log('🔍 VaultContext: getCurrentVault response', currentResult);

      if (currentResult.status === 'error') {
        console.error('🚨 VaultContext: getCurrentVault returned error', currentResult.error);
        throw new Error(currentResult.error.message || 'Failed to get current vault');
      }
      const currentResponse = currentResult.data;

      if (currentResponse.vault) {
        console.log('🔍 VaultContext: Setting current vault from backend', currentResponse.vault);
        setCurrentVaultState(currentResponse.vault);
      } else if (vaultsResponse.vaults.length > 0) {
        console.log(
          '🔍 VaultContext: No current vault, setting first one',
          vaultsResponse.vaults[0],
        );
        // If no current vault but vaults exist, set the first one
        setCurrentVaultState(vaultsResponse.vaults[0]);
        // Persist to backend in background
        const request: SetCurrentVaultRequest = { vault_id: vaultsResponse.vaults[0].id };
        commands.setCurrentVault(request).catch((err) => {
          console.error('🚨 VaultContext: Failed to persist initial vault selection', err);
          logger.error('VaultContext', 'Failed to persist initial vault selection', err);
        });
      }
      console.log('✅ VaultContext: refreshVaults completed successfully');
    } catch (err: any) {
      console.error('🚨 VaultContext: Error in refreshVaults', err);
      logger.error('VaultContext', 'Failed to refresh vaults', err);
      setError(err.message || 'Failed to load vaults');
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Refresh keys for a specific vault and update cache
  const refreshKeysForVault = useCallback(async (vaultId: string) => {
    setIsLoadingKeys(true);
    setError(null);

    try {
      console.log('🔍 VaultContext: Starting getKeyMenuData call for vault:', vaultId);

      const menuRequest: GetKeyMenuDataRequest = { vault_id: vaultId };
      console.log('🔍 VaultContext: Calling backend with request:', menuRequest);

      const menuResult = await commands.getKeyMenuData(menuRequest);
      console.log('🔍 VaultContext: Backend response received:', menuResult);

      if (menuResult.status === 'error') {
        console.error('🚨 VaultContext: Backend returned error:', menuResult.error);
        throw new Error(menuResult.error.message || 'Failed to get key menu data');
      }

      const menuResponse = menuResult.data;
      console.log('🔍 VaultContext: Processing menu response:', menuResponse);

      logger.info('VaultContext', 'Key menu data loaded for vault', {
        vaultId: vaultId,
        keyCount: menuResponse.keys.length,
        keys: menuResponse.keys,
      });

      // Convert KeyMenuInfo to KeyReference for backward compatibility
      console.log(
        '🔍 VaultContext: Starting key conversion, keys count:',
        menuResponse.keys.length,
      );

      const keyRefs = menuResponse.keys.map((keyMenuInfo: KeyMenuInfo, index: number) => {
        console.log(`🔍 VaultContext: Processing key ${index}:`, keyMenuInfo);

        const baseRef = {
          id: keyMenuInfo.internal_id,
          label: keyMenuInfo.label, // Now uses actual label from registry!
          lifecycle_status: keyMenuInfo.state as any, // Map from backend 'state' to frontend 'lifecycle_status'
          created_at: keyMenuInfo.created_at,
          last_used: null,
        };

        console.log(`🔍 VaultContext: Base ref for key ${index}:`, baseRef);
        console.log(`🔍 VaultContext: Key type for key ${index}:`, keyMenuInfo.key_type);
        console.log(`🔍 VaultContext: Metadata for key ${index}:`, keyMenuInfo.metadata);

        if (keyMenuInfo.key_type === 'passphrase') {
          console.log(`🔍 VaultContext: Creating passphrase key reference for key ${index}`);
          return {
            ...baseRef,
            type: 'Passphrase' as const,
            data: {
              key_id: keyMenuInfo.internal_id,
            },
          };
        } else {
          console.log(`🔍 VaultContext: Creating YubiKey reference for key ${index}`);
          console.log(
            `🔍 VaultContext: Metadata type check for key ${index}:`,
            keyMenuInfo.metadata,
          );

          // Properly handle discriminated union by checking property existence
          if ('serial' in keyMenuInfo.metadata) {
            console.log(`✅ VaultContext: YubiKey metadata detected for key ${index}`);
            return {
              ...baseRef,
              type: 'YubiKey' as const,
              data: {
                serial: keyMenuInfo.metadata.serial,
                firmware_version: keyMenuInfo.metadata.firmware_version || null,
              },
            };
          } else {
            console.warn(
              `⚠️ VaultContext: Unexpected metadata type for key ${index}:`,
              keyMenuInfo.metadata,
            );
            return {
              ...baseRef,
              type: 'YubiKey' as const,
              data: {
                serial: '',
                firmware_version: null,
              },
            };
          }
        }
      });

      console.log('🔍 VaultContext: Final key references:', keyRefs);

      // Update both cache and legacy vaultKeys state
      setKeyCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(vaultId, keyRefs as any); // Type assertion for bindings mismatch
        return newCache;
      });
      setVaultKeys(keyRefs as any); // For backward compatibility

      logger.info('VaultContext', 'Keys cached for vault', {
        vaultId,
        keyCount: keyRefs.length,
      });
    } catch (err: any) {
      logger.error('VaultContext', 'Failed to refresh keys', err);
      setError(err.message || 'Failed to load keys');
    } finally {
      setIsLoadingKeys(false);
    }
  }, []);

  // DEPRECATED: Wrapper for backward compatibility
  const refreshKeys = useCallback(async () => {
    if (!currentVault) return;
    await refreshKeysForVault(currentVault.id);
  }, [currentVault?.id, refreshKeysForVault]);

  const createVault = async (name: string, description?: string | null) => {
    console.log('🔍 VaultContext: createVault called', { name, description });
    setError(null);

    try {
      const request: CreateVaultRequest = { name, description: description ?? null };
      console.log('🔍 VaultContext: Calling backend createVault', request);

      const result = await commands.createVault(request);
      console.log('🔍 VaultContext: Backend response received', result);

      if (result.status === 'error') {
        console.error('🚨 VaultContext: Backend returned error', result.error);
        throw new Error(result.error.message || 'Failed to create vault');
      }

      console.log('✅ VaultContext: Vault created successfully, refreshing vaults...');
      await refreshVaults();
      console.log('✅ VaultContext: Vaults refreshed successfully');
    } catch (err: any) {
      console.error('🚨 VaultContext: Error in createVault', err);
      logger.error('VaultContext', 'Failed to create vault', err);
      setError(err.message || 'Failed to create vault');
      throw err;
    }
  };

  // NEW: Synchronous vault switching - reads from cache, no backend call for keys
  const setCurrentVault = (vaultId: string) => {
    setError(null);

    // Find vault in local state
    const vault = vaults.find((v) => v.id === vaultId);
    if (!vault) {
      logger.error(
        'VaultContext',
        `Vault not found in local state: ${vaultId}`,
        new Error('Vault not found'),
      );
      setError('Vault not found');
      return;
    }

    // Update local state immediately (sync)
    setCurrentVaultState(vault);

    // Update backend in background (don't wait)
    const request: SetCurrentVaultRequest = { vault_id: vaultId };
    commands
      .setCurrentVault(request)
      .then((result) => {
        if (result.status === 'error') {
          logger.error(
            'VaultContext',
            `Failed to persist current vault: ${result.error.message}`,
            new Error(result.error.message),
          );
        }
      })
      .catch((err) => {
        logger.error('VaultContext', 'Failed to set current vault', err as Error);
      });

    // Update vaultKeys from cache for backward compatibility
    const cachedKeys = keyCache.get(vaultId) || [];
    setVaultKeys(cachedKeys);

    logger.info('VaultContext', 'Switched to vault (sync)', {
      vaultId,
      cachedKeyCount: cachedKeys.length,
    });
  };

  const removeKeyFromVault = async (keyId: string) => {
    if (!currentVault) {
      setError('No vault selected');
      return;
    }

    setError(null);

    try {
      const request: RemoveKeyFromVaultRequest = {
        vault_id: currentVault.id,
        key_id: keyId,
      };

      const result = await commands.removeKeyFromVault(request);
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Failed to remove key from vault');
      }
      // Refresh keys and update cache
      await refreshKeysForVault(currentVault.id);
    } catch (err: any) {
      logger.error('VaultContext', 'Failed to remove key from vault', err);
      setError(err.message || 'Failed to remove key');
      throw err;
    }
  };

  // Load vaults on mount
  useEffect(() => {
    refreshVaults();
  }, []);

  // NEW: Initial cache population - load keys and statistics for all vaults on mount
  useEffect(() => {
    const loadAllVaultData = async () => {
      if (vaults.length === 0) return;

      logger.info('VaultContext', 'Populating cache for all vaults', {
        vaultCount: vaults.length,
      });

      // Load keys for all vaults in parallel
      const loadPromises = vaults.map(async (vault) => {
        try {
          await refreshKeysForVault(vault.id);
        } catch (err) {
          // Log but don't fail the entire cache load
          logger.error('VaultContext', `Failed to cache keys for vault: ${vault.id}`, err as Error);
        }
      });

      await Promise.all(loadPromises);

      // Load statistics for all vaults in one batch call
      try {
        await refreshAllStatistics();
      } catch (err) {
        logger.error('VaultContext', 'Failed to load statistics for all vaults', err as Error);
      }

      logger.info('VaultContext', 'Cache population complete', {
        cachedVaultCount: vaults.length,
      });
    };

    loadAllVaultData();
  }, [vaults.length]); // Only run when vault count changes

  // Update vaultKeys when currentVault changes (read from cache)
  useEffect(() => {
    if (currentVault) {
      const cachedKeys = keyCache.get(currentVault.id) || [];
      setVaultKeys(cachedKeys);
    } else {
      setVaultKeys([]);
    }
  }, [currentVault?.id, keyCache]);

  return (
    <VaultContext.Provider
      value={{
        currentVault,
        vaults,
        vaultKeys, // DEPRECATED - use getCurrentVaultKeys() instead
        keyCache,
        getCurrentVaultKeys,
        statisticsCache,
        getVaultStatistics,
        isLoading,
        isLoadingKeys,
        isLoadingStatistics,
        error,
        createVault,
        setCurrentVault, // Now synchronous!
        refreshVaults,
        refreshKeys, // DEPRECATED - use refreshKeysForVault
        refreshKeysForVault,
        removeKeyFromVault,
        refreshAllStatistics,
        refreshVaultStatistics,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
