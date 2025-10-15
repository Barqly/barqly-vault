import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { commands, VaultSummary, KeyInfo } from '../../bindings';
import { logger } from '../../lib/logger';

interface VaultAttachmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  keyInfo: KeyInfo;
  onSuccess: () => void;
}

interface VaultCheckboxState {
  vault: VaultSummary;
  isAttached: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  tooltip: string;
}

export const VaultAttachmentDialog: React.FC<VaultAttachmentDialogProps> = ({
  isOpen,
  onClose,
  keyInfo,
  onSuccess,
}) => {
  const [vaultStates, setVaultStates] = useState<VaultCheckboxState[]>([]);
  const [isLoadingVaults, setIsLoadingVaults] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load vaults and determine checkbox states
  useEffect(() => {
    if (!isOpen) return;

    const loadVaults = async () => {
      try {
        setIsLoadingVaults(true);
        setError(null);

        logger.info('VaultAttachmentDialog', 'Loading vaults...');

        // Get all vaults
        const vaultsResult = await commands.listVaults();
        logger.info('VaultAttachmentDialog', 'listVaults result', {
          status: vaultsResult.status,
          result: vaultsResult,
        });

        if (vaultsResult.status === 'error') {
          logger.error('VaultAttachmentDialog', 'Failed to load vaults', vaultsResult.error);
          setError(`Failed to load vaults: ${vaultsResult.error.message}`);
          setIsLoadingVaults(false);
          return;
        }

        const allVaults = vaultsResult.data.vaults;
        logger.info('VaultAttachmentDialog', 'Vaults loaded', {
          count: allVaults.length,
          vaults: allVaults,
        });

        if (allVaults.length === 0) {
          setVaultStates([]);
          setIsLoadingVaults(false);
          return;
        }

        // Process each vault (use allSettled to handle failures gracefully)
        const results = await Promise.allSettled(
          allVaults.map(async (vault) => {
            logger.info('VaultAttachmentDialog', 'Processing vault', {
              vaultId: vault.id,
              vaultName: vault.name,
            });

            const isAttached = keyInfo.vault_associations.includes(vault.id);
            logger.info('VaultAttachmentDialog', 'Attachment check', {
              vaultId: vault.id,
              isAttached,
              associations: keyInfo.vault_associations,
            });

            // Determine if vault has been encrypted (immutability check)
            let isDisabled = false;
            let tooltip = '';

            if (isAttached) {
              // Check if vault is encrypted
              logger.info('VaultAttachmentDialog', 'Fetching vault stats', {
                vaultName: vault.name,
              });
              const statsResult = await commands.getVaultStatistics({
                vault_name: vault.name,
              });
              logger.info('VaultAttachmentDialog', 'Vault stats result', {
                vaultName: vault.name,
                status: statsResult.status,
                result: statsResult,
              });

              if (statsResult.status === 'ok' && statsResult.data.statistics) {
                const encryptionCount = statsResult.data.statistics.encryption_count;
                const isKeySetMutable = encryptionCount === 0;

                if (!isKeySetMutable) {
                  // Vault has been encrypted - can't detach
                  isDisabled = true;
                  tooltip = 'This key was used to encrypt this vault. It cannot be removed.';
                } else {
                  // Vault never encrypted - can detach
                  tooltip = 'Unlink key from vault (metadata only)';
                }
              } else {
                // Fallback if stats not available - allow detach
                tooltip = 'Unlink key from vault';
              }
            } else {
              // Not attached - can attach
              tooltip = 'Attach this key to use it for encrypting this vault.';
            }

            return {
              vault,
              isAttached,
              isDisabled,
              isLoading: false,
              tooltip,
            };
          }),
        );

        // Filter successful results
        const states = results
          .filter((result) => result.status === 'fulfilled')
          .map((result) => (result as PromiseFulfilledResult<VaultCheckboxState>).value);

        logger.info('VaultAttachmentDialog', 'States processed', {
          totalVaults: allVaults.length,
          successfulStates: states.length,
        });

        setVaultStates(states);
      } catch (err) {
        logger.error('VaultAttachmentDialog', 'Failed to load vaults', err as Error);
        setError('An unexpected error occurred');
      } finally {
        setIsLoadingVaults(false);
      }
    };

    loadVaults();
  }, [isOpen, keyInfo]);

  const handleToggle = async (vaultId: string) => {
    const stateIndex = vaultStates.findIndex((s) => s.vault.id === vaultId);
    if (stateIndex === -1) return;

    const state = vaultStates[stateIndex];
    if (state.isDisabled || state.isLoading) return;

    // Set loading state
    setVaultStates((prev) =>
      prev.map((s, i) => (i === stateIndex ? { ...s, isLoading: true } : s)),
    );
    setError(null);

    try {
      if (state.isAttached) {
        // Detach/Unlink
        const result = await commands.removeKeyFromVault({
          vault_id: vaultId,
          key_id: keyInfo.id,
        });

        if (result.status === 'error') {
          const errorMsg =
            result.error.recovery_guidance || result.error.message || 'Failed to unlink key';
          setError(errorMsg);
          // Reset loading state
          setVaultStates((prev) =>
            prev.map((s, i) => (i === stateIndex ? { ...s, isLoading: false } : s)),
          );
          return;
        }

        // Success - update state
        setVaultStates((prev) =>
          prev.map((s, i) =>
            i === stateIndex
              ? {
                  ...s,
                  isAttached: false,
                  isLoading: false,
                  tooltip: 'Attach this key to use it for encrypting this vault.',
                }
              : s,
          ),
        );
      } else {
        // Attach
        const result = await commands.attachKeyToVault({
          key_id: keyInfo.id,
          vault_id: vaultId,
        });

        if (result.status === 'error') {
          const errorMsg =
            result.error.recovery_guidance || result.error.message || 'Failed to attach key';
          setError(errorMsg);
          // Reset loading state
          setVaultStates((prev) =>
            prev.map((s, i) => (i === stateIndex ? { ...s, isLoading: false } : s)),
          );
          return;
        }

        // Success - update state
        setVaultStates((prev) =>
          prev.map((s, i) =>
            i === stateIndex
              ? {
                  ...s,
                  isAttached: true,
                  isLoading: false,
                  tooltip: 'Unlink key from vault (metadata only)',
                }
              : s,
          ),
        );
      }

      // Notify parent of success
      onSuccess();
    } catch (err) {
      logger.error('VaultAttachmentDialog', 'Failed to toggle vault attachment', err as Error);
      setError('An unexpected error occurred');
      // Reset loading state
      setVaultStates((prev) =>
        prev.map((s, i) => (i === stateIndex ? { ...s, isLoading: false } : s)),
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">Attach to Vaults</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Key Info */}
          <div className="mb-4 p-3 bg-slate-50 rounded-lg">
            <div className="text-sm text-slate-600">Key:</div>
            <div className="font-medium text-slate-800">{keyInfo.label}</div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Vault List */}
          {isLoadingVaults ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
              <span className="ml-2 text-sm text-slate-600">Loading vaults...</span>
            </div>
          ) : vaultStates.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-500">No vaults available</p>
              <p className="text-xs text-slate-400 mt-1">Create a vault to attach this key</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {vaultStates.map((state) => (
                <label
                  key={state.vault.id}
                  className={`
                    flex items-center p-3 rounded-lg border transition-colors
                    ${
                      state.isDisabled
                        ? 'bg-slate-50 border-slate-200 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:bg-slate-50 cursor-pointer'
                    }
                  `}
                  title={state.tooltip}
                >
                  <input
                    type="checkbox"
                    checked={state.isAttached}
                    disabled={state.isDisabled || state.isLoading}
                    onChange={() => handleToggle(state.vault.id)}
                    className="
                      h-4 w-4 text-blue-600 rounded border-slate-300
                      focus:ring-2 focus:ring-blue-500
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-slate-800">{state.vault.name}</div>
                    {state.vault.description && (
                      <div className="text-xs text-slate-500">{state.vault.description}</div>
                    )}
                  </div>
                  {state.isLoading && <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />}
                  {state.isDisabled && (
                    <span className="text-xs text-slate-500 ml-2">🔒 Locked</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
