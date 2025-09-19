import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { safeInvoke } from '../lib/tauri-safe';
import { logger } from '../lib/logger';
import {
  VaultSummary,
  KeyReference,
  CreateVaultRequest,
  ListVaultsResponse,
  GetCurrentVaultResponse,
  GetVaultKeysResponse,
  SetCurrentVaultRequest,
  AddKeyToVaultRequest,
  RemoveKeyFromVaultRequest,
} from '../lib/api-types';

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
  createVault: (name: string, description?: string) => Promise<void>;
  setCurrentVault: (vaultId: string) => Promise<void>;
  refreshVaults: () => Promise<void>;
  refreshKeys: () => Promise<void>;
  addKeyToVault: (keyType: 'passphrase' | 'yubikey', label: string, credentials?: any) => Promise<void>;
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
  }, [currentVault?.id]);

  const refreshVaults = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get all vaults
      const vaultsResponse = await safeInvoke<ListVaultsResponse>(
        'list_vaults',
        undefined,
        'VaultContext.refreshVaults'
      );
      setVaults(vaultsResponse.vaults);

      // Get current vault
      const currentResponse = await safeInvoke<GetCurrentVaultResponse>(
        'get_current_vault',
        undefined,
        'VaultContext.getCurrentVault'
      );

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

  const refreshKeys = async () => {
    if (!currentVault) return;

    setIsLoadingKeys(true);
    setError(null);

    try {
      const keysResponse = await safeInvoke<GetVaultKeysResponse>(
        'get_vault_keys',
        { vault_id: currentVault.id },
        'VaultContext.refreshKeys'
      );
      setVaultKeys(keysResponse.keys);
    } catch (err: any) {
      logger.error('VaultContext', 'Failed to refresh keys', err);
      setError(err.message || 'Failed to load keys');
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const createVault = async (name: string, description?: string) => {
    setError(null);

    try {
      const request: CreateVaultRequest = { name, description };
      await safeInvoke(
        'create_vault',
        request,
        'VaultContext.createVault'
      );
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
      const response = await safeInvoke<any>(
        'set_current_vault',
        request,
        'VaultContext.setCurrentVault'
      );

      if (response.vault) {
        setCurrentVaultState(response.vault);
      }
    } catch (err: any) {
      logger.error('VaultContext', 'Failed to set current vault', err);
      setError(err.message || 'Failed to set current vault');
      throw err;
    }
  };

  const addKeyToVault = async (
    keyType: 'passphrase' | 'yubikey',
    label: string,
    credentials?: any
  ) => {
    if (!currentVault) {
      setError('No vault selected');
      return;
    }

    setError(null);

    try {
      const request: AddKeyToVaultRequest = {
        vault_id: currentVault.id,
        key_type: keyType,
        label,
        ...credentials,
      };

      await safeInvoke(
        'add_key_to_vault',
        request,
        'VaultContext.addKeyToVault'
      );
      await refreshKeys();
    } catch (err: any) {
      logger.error('VaultContext', 'Failed to add key to vault', err);
      setError(err.message || 'Failed to add key');
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

      await safeInvoke(
        'remove_key_from_vault',
        request,
        'VaultContext.removeKeyFromVault'
      );
      await refreshKeys();
    } catch (err: any) {
      logger.error('VaultContext', 'Failed to remove key from vault', err);
      setError(err.message || 'Failed to remove key');
      throw err;
    }
  };

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
        addKeyToVault,
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