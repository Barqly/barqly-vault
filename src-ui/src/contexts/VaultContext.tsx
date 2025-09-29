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
  GetVaultKeysRequest,
  GetKeyMenuDataRequest,
  KeyMenuInfo,
  KeyState,
} from '../bindings';
import { logger } from '../lib/logger';

interface VaultContextType {
  // Current vault state
  currentVault: VaultSummary | null;
  vaults: VaultSummary[];
  vaultKeys: KeyReference[];

  // Loading states
  isLoading: boolean;
  isLoadingKeys: boolean;

  // Error state
  error: string | null;

  // Actions
  createVault: (name: string, description?: string | null) => Promise<void>;
  setCurrentVault: (vaultId: string) => Promise<void>;
  refreshVaults: () => Promise<void>;
  refreshKeys: () => Promise<void>;
  removeKeyFromVault: (keyId: string) => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentVault, setCurrentVaultState] = useState<VaultSummary | null>(null);
  const [vaults, setVaults] = useState<VaultSummary[]>([]);
  const [vaultKeys, setVaultKeys] = useState<KeyReference[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshVaults = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get all vaults
      const vaultsResult = await commands.listVaults();
      if (vaultsResult.status === 'error') {
        throw new Error(vaultsResult.error.message || 'Failed to list vaults');
      }
      const vaultsResponse = vaultsResult.data;
      setVaults(vaultsResponse.vaults);

      // Get current vault
      const currentResult = await commands.getCurrentVault();
      if (currentResult.status === 'error') {
        throw new Error(currentResult.error.message || 'Failed to get current vault');
      }
      const currentResponse = currentResult.data;

      if (currentResponse.vault) {
        setCurrentVaultState(currentResponse.vault);
      } else if (vaultsResponse.vaults.length > 0) {
        // If no current vault but vaults exist, set the first one
        await setCurrentVault(vaultsResponse.vaults[0].id);
      }
    } catch (err: any) {
      logger.error('VaultContext', 'Failed to refresh vaults', err);
      setError(err.message || 'Failed to load vaults');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshKeys = useCallback(async () => {
    if (!currentVault) return;

    setIsLoadingKeys(true);
    setError(null);

    try {
      const menuRequest: GetKeyMenuDataRequest = { vault_id: currentVault.id };
      const menuResult = await commands.getKeyMenuData(menuRequest);
      if (menuResult.status === 'error') {
        throw new Error(menuResult.error.message || 'Failed to get key menu data');
      }
      const menuResponse = menuResult.data;
      logger.info('VaultContext', 'Key menu data loaded for vault', {
        vaultId: currentVault.id,
        keyCount: menuResponse.keys.length,
        keys: menuResponse.keys,
      });
      // Convert KeyMenuInfo to KeyReference for backward compatibility
      const keyRefs = menuResponse.keys.map((keyMenuInfo: KeyMenuInfo) => ({
        id: keyMenuInfo.internal_id,
        label: keyMenuInfo.label, // Now uses actual label from registry!
        state: keyMenuInfo.state as KeyState,
        key_type: keyMenuInfo.key_type === 'passphrase'
          ? { type: 'passphrase' as const, key_id: keyMenuInfo.internal_id }
          : {
              type: 'yubikey' as const,
              serial: keyMenuInfo.metadata.type === 'YubiKey' ? keyMenuInfo.metadata.serial : '',
              firmware_version: keyMenuInfo.metadata.type === 'YubiKey' ? keyMenuInfo.metadata.firmware_version : null
            },
        created_at: keyMenuInfo.created_at,
        last_used: null
      } as KeyReference));
      setVaultKeys(keyRefs);
    } catch (err: any) {
      logger.error('VaultContext', 'Failed to refresh keys', err);
      setError(err.message || 'Failed to load keys');
    } finally {
      setIsLoadingKeys(false);
    }
  }, [currentVault]);

  const createVault = async (name: string, description?: string | null) => {
    setError(null);

    try {
      const request: CreateVaultRequest = { name, description: description ?? null };
      const result = await commands.createVault(request);
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Failed to create vault');
      }
      await refreshVaults();
    } catch (err: any) {
      logger.error('VaultContext', 'Failed to create vault', err);
      setError(err.message || 'Failed to create vault');
      throw err;
    }
  };

  const setCurrentVault = async (vaultId: string) => {
    setError(null);

    try {
      const request: SetCurrentVaultRequest = { vault_id: vaultId };
      const result = await commands.setCurrentVault(request);
      if (result.status === 'error') {
        throw new Error(result.error.message || 'Failed to set current vault');
      }
      const response = result.data;

      if (response.vault) {
        setCurrentVaultState(response.vault);
        // Immediately refresh keys when vault is selected
        await refreshKeys();
      }
    } catch (err: any) {
      logger.error('VaultContext', 'Failed to set current vault', err);
      setError(err.message || 'Failed to set current vault');
      throw err;
    }
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
      await refreshKeys();
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

  // Load keys when current vault changes
  useEffect(() => {
    if (currentVault) {
      refreshKeys();
    } else {
      setVaultKeys([]);
    }
  }, [currentVault?.id, refreshKeys]);

  return (
    <VaultContext.Provider
      value={{
        currentVault,
        vaults,
        vaultKeys,
        isLoading,
        isLoadingKeys,
        error,
        createVault,
        setCurrentVault,
        refreshVaults,
        refreshKeys,
        removeKeyFromVault,
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
