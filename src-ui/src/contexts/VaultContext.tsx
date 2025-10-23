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
  VaultStatistics,
  GlobalKey,
} from '../bindings';
import { logger } from '../lib/logger';

interface VaultContextType {
  // Current vault state
  currentVault: VaultSummary | null;
  vaults: VaultSummary[];

  // Cache-first key access
  keyCache: Map<string, KeyReference[]>;
  getCurrentVaultKeys: () => KeyReference[];

  // NEW: Global key registry cache
  globalKeyCache: GlobalKey[];
  getGlobalKeys: () => GlobalKey[];

  // NEW: Statistics cache
  statisticsCache: Map<string, VaultStatistics>;
  getVaultStatistics: (vaultId: string) => VaultStatistics | null;

  // Loading states
  isLoading: boolean;
  isLoadingKeys: boolean;
  isLoadingStatistics: boolean;
  isInitialized: boolean; // Has initial data been loaded?

  // Error state
  error: string | null;

  // Actions
  createVault: (name: string, description?: string | null) => Promise<void>;
  setCurrentVault: (vaultId: string) => void; // Synchronous vault switching
  refreshVaults: () => Promise<void>;
  refreshKeysForVault: (vaultId: string) => Promise<void>;
  refreshGlobalKeys: () => Promise<void>;
  removeKeyFromVault: (keyId: string) => Promise<void>;
  refreshAllStatistics: () => Promise<void>;
  refreshVaultStatistics: (vaultId: string) => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentVault, setCurrentVaultState] = useState<VaultSummary | null>(null);
  const [vaults, setVaults] = useState<VaultSummary[]>([]);
  const [keyCache, setKeyCache] = useState<Map<string, KeyReference[]>>(new Map());
  const [globalKeyCache, setGlobalKeyCache] = useState<GlobalKey[]>([]);
  const [statisticsCache, setStatisticsCache] = useState<Map<string, VaultStatistics>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [isLoadingStatistics, setIsLoadingStatistics] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasLoadedVaults, setHasLoadedVaults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get keys for current vault from cache (instant, no async)
  const getCurrentVaultKeys = useCallback((): KeyReference[] => {
    if (!currentVault) return [];
    return keyCache.get(currentVault.id) || [];
  }, [currentVault?.id, keyCache]);

  // Get all global keys from cache (instant, no async)
  const getGlobalKeys = useCallback((): GlobalKey[] => {
    return globalKeyCache;
  }, [globalKeyCache]);

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
  const refreshVaultStatistics = useCallback(async (vaultId: string) => {
    setIsLoadingStatistics(true);
    setError(null);

    try {
      logger.info('VaultContext', 'Fetching statistics for vault', { vaultId });

      const result = await commands.getVaultStatistics({
        vault_id: vaultId,
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

      // Restore current vault from localStorage (deprecated backend API)
      console.log('🔍 VaultContext: Restoring vault selection from localStorage...');

      if (vaultsResponse.vaults.length > 0) {
        let selectedVault = null;

        // Try to restore from localStorage
        try {
          const savedVaultId = localStorage.getItem('barqly_current_vault_id');
          if (savedVaultId) {
            selectedVault = vaultsResponse.vaults.find((v) => v.id === savedVaultId);
            console.log('🔍 VaultContext: Found saved vault in localStorage', {
              savedVaultId,
              found: !!selectedVault,
            });
          }
        } catch (err) {
          console.error('🚨 VaultContext: Failed to read localStorage', err);
        }

        // Fallback: First vault alphabetically (deterministic)
        if (!selectedVault) {
          const sortedVaults = [...vaultsResponse.vaults].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
          selectedVault = sortedVaults[0];
          console.log('🔍 VaultContext: No saved vault, using first alphabetically', {
            vaultName: selectedVault.name,
          });
        }

        setCurrentVaultState(selectedVault);

        // Persist to localStorage
        try {
          localStorage.setItem('barqly_current_vault_id', selectedVault.id);
        } catch (err) {
          console.error('🚨 VaultContext: Failed to write localStorage', err);
        }
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

      // Backend now returns KeyReference directly - no transformation needed!
      const keyRefs = menuResponse.keys;

      // Update cache
      setKeyCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(vaultId, keyRefs);
        return newCache;
      });

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

  // NEW: Refresh global key registry and update cache
  const refreshGlobalKeys = useCallback(async () => {
    setError(null);

    try {
      logger.info('VaultContext', 'Fetching all keys from global registry');

      const result = await commands.listUnifiedKeys({ type: 'All' });

      if (result.status === 'error') {
        throw new Error(result.error.message || 'Failed to list global keys');
      }

      setGlobalKeyCache(result.data);

      logger.info('VaultContext', 'Global keys cached', {
        keyCount: result.data.length,
      });
    } catch (err: any) {
      logger.error('VaultContext', 'Failed to refresh global keys', err);
      setError(err.message || 'Failed to load global keys');
    }
  }, []);

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

  // NEW: Synchronous vault switching - reads from cache, persists to localStorage
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

    // Persist to localStorage for session continuity
    try {
      localStorage.setItem('barqly_current_vault_id', vaultId);
    } catch (err) {
      logger.error('VaultContext', 'Failed to persist vault to localStorage', err as Error);
    }

    logger.info('VaultContext', 'Switched to vault (localStorage)', {
      vaultId,
      cachedKeyCount: (keyCache.get(vaultId) || []).length,
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
    const initializeData = async () => {
      console.log('🔍 VaultContext: Starting initialization...');
      await refreshVaults();
      console.log('🔍 VaultContext: Vaults loaded, marking hasLoadedVaults=true');
      setHasLoadedVaults(true);
      // Don't set isInitialized here - wait for keys to be cached (or no vaults)
    };
    initializeData();
  }, []);

  // NEW: Initial cache population - load keys and statistics for all vaults on mount
  useEffect(() => {
    // Don't run until vaults have been loaded at least once
    if (!hasLoadedVaults) {
      console.log('🔍 VaultContext: Waiting for initial vault load...');
      return;
    }

    const loadAllVaultData = async () => {
      // If no vaults, we're fully initialized (nothing to cache)
      if (vaults.length === 0) {
        console.log('🔍 VaultContext: No vaults to cache, marking as initialized');
        setIsInitialized(true);
        return;
      }

      console.log('🔍 VaultContext: Starting cache population for all vaults...');
      logger.info('VaultContext', 'Populating cache for all vaults', {
        vaultCount: vaults.length,
      });

      // Load data in parallel: vault keys + global keys + statistics
      const loadPromises = [
        // Load keys for all vaults
        ...vaults.map(async (vault) => {
          try {
            await refreshKeysForVault(vault.id);
          } catch (err) {
            logger.error(
              'VaultContext',
              `Failed to cache keys for vault: ${vault.id}`,
              err as Error,
            );
          }
        }),
        // Load global key registry
        (async () => {
          try {
            await refreshGlobalKeys();
          } catch (err) {
            logger.error('VaultContext', 'Failed to cache global keys', err as Error);
          }
        })(),
        // Load statistics for all vaults
        (async () => {
          try {
            await refreshAllStatistics();
          } catch (err) {
            logger.error('VaultContext', 'Failed to load statistics for all vaults', err as Error);
          }
        })(),
      ];

      await Promise.all(loadPromises);

      logger.info('VaultContext', 'Cache population complete', {
        cachedVaultCount: vaults.length,
      });

      // NOW we're fully initialized - vaults loaded AND keys cached
      console.log('🔍 VaultContext: All data loaded and cached, marking as initialized');
      setIsInitialized(true);
    };

    loadAllVaultData();
  }, [hasLoadedVaults, vaults.length]); // Run when vaults are first loaded OR vault count changes

  return (
    <VaultContext.Provider
      value={{
        currentVault,
        vaults,
        keyCache,
        getCurrentVaultKeys,
        globalKeyCache,
        getGlobalKeys,
        statisticsCache,
        getVaultStatistics,
        isLoading,
        isLoadingKeys,
        isLoadingStatistics,
        isInitialized,
        error,
        createVault,
        setCurrentVault,
        refreshVaults,
        refreshKeysForVault,
        refreshGlobalKeys,
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
