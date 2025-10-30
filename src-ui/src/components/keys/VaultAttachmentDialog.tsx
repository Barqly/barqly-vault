import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, Key, Shield, Fingerprint, Plus } from 'lucide-react';
import { commands, VaultSummary, GlobalKey } from '../../bindings';
import { logger } from '../../lib/logger';

interface VaultAttachmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  keyInfo: GlobalKey;
  onSuccess: () => void;
}

interface VaultCheckboxState {
  vault: VaultSummary;
  isAttached: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  tooltip: string;
  disabledReason?: 'encrypted' | 'max-keys' | null;
}

export const VaultAttachmentDialog: React.FC<VaultAttachmentDialogProps> = ({
  isOpen,
  onClose,
  keyInfo,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [vaultStates, setVaultStates] = useState<VaultCheckboxState[]>([]);
  const [isLoadingVaults, setIsLoadingVaults] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPassphrase = keyInfo.key_type.type === 'Passphrase';

  // Load vaults and determine checkbox states
  useEffect(() => {
    if (!isOpen) return;

    const loadVaults = async () => {
      try {
        setIsLoadingVaults(true);
        setError(null);

        logger.info('VaultAttachmentDialog', 'Loading vaults...', {
          keyInfo,
          hasVaultAssociations: 'vault_associations' in keyInfo,
          vaultAssociations: keyInfo.vault_associations,
        });

        // Get all vaults
        const vaultsResult = await commands.listVaults();
        logger.info('VaultAttachmentDialog', 'listVaults result', {
          status: vaultsResult.status,
          result: vaultsResult,
        });

        if (vaultsResult.status === 'error') {
          logger.error(
            'VaultAttachmentDialog',
            'Failed to load vaults',
            new Error(vaultsResult.error.message),
          );
          setError('Failed to load vaults');
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
            try {
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

              // Check if vault has been encrypted (immutability check)
              // Conservative model: Once encrypted, keyset is sealed (no attach or detach)
              logger.info('VaultAttachmentDialog', 'Fetching vault stats', {
                vaultId: vault.id,
              });
              const statsResult = await commands.getVaultStatistics({
                vault_id: vault.id,
              });
              logger.info('VaultAttachmentDialog', 'Vault stats result', {
                vaultId: vault.id,
                status: statsResult.status,
                result: statsResult,
              });

              let isDisabled = false;
              let tooltip = '';
              let disabledReason: 'encrypted' | 'max-keys' | null = null;

              // Check 1: Maximum 4 keys per vault policy
              const hasReachedMaxKeys = vault.key_count >= 4;

              if (statsResult.status === 'ok' && statsResult.data.statistics) {
                const encryptionCount = statsResult.data.statistics.encryption_count;
                // encryption_count: 0 = never encrypted, >0 = encrypted
                const isKeySetMutable = encryptionCount === 0;

                if (!isKeySetMutable) {
                  // Vault has been encrypted - keyset is sealed (immutable)
                  isDisabled = true;
                  disabledReason = 'encrypted';
                  tooltip = isAttached
                    ? 'This vault has already been encrypted with this key.'
                    : 'Vault already encrypted — key set is sealed. To add or remove keys, create a new vault or re-encrypt existing data.';
                } else if (hasReachedMaxKeys && !isAttached) {
                  // Check 2: Max keys reached - can't attach new key
                  isDisabled = true;
                  disabledReason = 'max-keys';
                  tooltip = 'Maximum 4 keys reached. Remove a key to attach this one.';
                } else {
                  // Vault never encrypted and not at max - can attach or detach
                  tooltip = isAttached
                    ? 'Unlink key from vault (metadata only)'
                    : 'Attach this key to use it for encrypting this vault.';
                }
              } else {
                // Fallback if stats not available
                if (hasReachedMaxKeys && !isAttached) {
                  isDisabled = true;
                  disabledReason = 'max-keys';
                  tooltip = 'Maximum 4 keys reached. Remove a key to attach this one.';
                } else {
                  tooltip = isAttached
                    ? 'Unlink key from vault'
                    : 'Attach this key to use it for encrypting this vault.';
                }
              }

              return {
                vault,
                isAttached,
                isDisabled,
                isLoading: false,
                tooltip,
                disabledReason,
              };
            } catch (err) {
              logger.error('VaultAttachmentDialog', 'Error processing vault', err as Error);
              throw err; // Re-throw to mark as rejected
            }
          }),
        );

        // Filter successful results
        const allStates = results
          .filter((result) => result.status === 'fulfilled')
          .map((result) => (result as PromiseFulfilledResult<VaultCheckboxState>).value);

        // Filter to only show relevant vaults (reduce information overload):
        // 1. Available vaults (not attached, not encrypted, not at max) - can attach
        // 2. Attached vaults (any state) - can detach
        // 3. Sealed vaults with this key (attached and encrypted) - historical reference, view-only
        // 4. Max capacity vaults (not attached, at 4 keys) - show disabled for transparency
        // HIDE: Sealed vaults without this key (not attached AND encrypted) - irrelevant
        const relevantStates = allStates.filter((state) => {
          // Show all attached vaults (mutable or sealed)
          if (state.isAttached) return true;

          // Show vaults at max capacity (disabled but visible)
          if (state.disabledReason === 'max-keys') return true;

          // Show available vaults (not attached, not encrypted, not at max)
          if (!state.isDisabled) return true;

          // Hide: Not attached AND encrypted (irrelevant sealed vaults)
          return false;
        });

        // Sort alphabetically
        relevantStates.sort((a, b) => a.vault.name.localeCompare(b.vault.name));

        logger.info('VaultAttachmentDialog', 'States processed', {
          totalVaults: allVaults.length,
          successfulStates: allStates.length,
          relevantStates: relevantStates.length,
        });

        setVaultStates(relevantStates);
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
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none">
        <div
          className="bg-elevated rounded-lg shadow-xl w-full pointer-events-auto"
          style={{
            maxWidth: '500px',
            border: isPassphrase ? '1px solid #B7E1DD' : '1px solid #ffd4a3',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-default">
            <div className="flex items-center gap-3">
              <div
                className="rounded-lg p-2 flex-shrink-0"
                style={{
                  backgroundColor: isPassphrase
                    ? 'rgba(15, 118, 110, 0.1)'
                    : 'rgba(249, 139, 28, 0.08)',
                  border: isPassphrase ? '1px solid #B7E1DD' : '1px solid #ffd4a3',
                }}
              >
                {isPassphrase ? (
                  <Key className="h-5 w-5" style={{ color: '#13897F' }} />
                ) : (
                  <Fingerprint className="h-5 w-5" style={{ color: '#F98B1C' }} />
                )}
              </div>
              <h2 className="text-xl font-semibold text-main">Attach to Vaults</h2>
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-secondary transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Key Info */}
            <div className="mb-4 p-3 rounded-lg border border-default">
              <div>
                <div className="text-xs text-secondary font-medium">Key:</div>
                <div className="font-semibold text-main">{keyInfo.label}</div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="mb-4 p-3 rounded-lg border"
                style={{
                  backgroundColor: 'rgba(185, 28, 28, 0.1)',
                  borderColor: '#FCA5A5',
                }}
              >
                <p className="text-sm" style={{ color: '#B91C1C' }}>
                  {error}
                </p>
              </div>
            )}

            {/* Vault List */}
            {isLoadingVaults ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                <span className="ml-2 text-sm text-secondary">Loading vaults...</span>
              </div>
            ) : vaultStates.length === 0 ? (
              <div className="py-8 text-center space-y-4">
                <div>
                  <p className="text-sm font-medium text-main">No Available Vaults</p>
                  <p className="text-xs text-secondary mt-2">
                    All vaults have reached the maximum of 4 keys.
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Create a new vault or remove a key from an existing vault.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    navigate('/vault-hub');
                  }}
                  className="
                    inline-flex items-center gap-2 px-4 py-2
                    text-sm font-medium text-white
                    rounded-lg transition-colors
                  "
                  style={{
                    backgroundColor: '#1D4ED8',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1E40AF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1D4ED8';
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Create New Vault
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {vaultStates.map((state) => (
                  <label
                    key={state.vault.id}
                    className="flex items-center gap-3 p-3 rounded-lg border transition-all"
                    style={{
                      borderColor: state.isDisabled
                        ? 'rgb(var(--border-default))'
                        : 'rgba(59, 130, 246, 0.3)',
                      backgroundColor: state.isDisabled
                        ? 'rgb(var(--surface-hover))'
                        : 'transparent',
                      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (!state.isDisabled) {
                        e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        e.currentTarget.style.borderColor = '#3B82F6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!state.isDisabled) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                      }
                    }}
                    title={state.tooltip}
                  >
                    <input
                      type="checkbox"
                      checked={state.isAttached}
                      disabled={state.isDisabled || state.isLoading}
                      onChange={() => handleToggle(state.vault.id)}
                      className={`
                      h-4 w-4 rounded focus:ring-2 focus:ring-blue-500 flex-shrink-0
                      ${
                        state.isDisabled
                          ? 'text-blue-600 border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed'
                          : 'text-blue-600 border-blue-400 cursor-pointer'
                      }
                    `}
                    />
                    <Shield
                      className={`h-4 w-4 flex-shrink-0 ${
                        state.isDisabled ? 'text-muted' : 'text-blue-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-main truncate">
                          {state.vault.name}
                        </div>
                        <span className="text-xs text-muted flex-shrink-0">
                          ({state.vault.key_count}/4 keys)
                        </span>
                      </div>
                      {state.vault.description && (
                        <div className="text-xs text-secondary truncate">
                          {state.vault.description}
                        </div>
                      )}
                    </div>
                    {state.isLoading && (
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
                    )}
                    {state.isDisabled && (
                      <span className="text-xs text-secondary ml-2 flex-shrink-0">🔒 Locked</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-default">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-main bg-hover rounded-lg hover:bg-elevated transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
