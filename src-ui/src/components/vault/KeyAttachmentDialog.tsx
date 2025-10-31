import React, { useState, useEffect } from 'react';
import { X, Loader2, Key, Fingerprint, Lock } from 'lucide-react';
import { commands, VaultSummary, GlobalKey } from '../../bindings';
import { logger } from '../../lib/logger';
import { useVault } from '../../contexts/VaultContext';

interface KeyAttachmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vaultInfo: VaultSummary;
  onSuccess: () => void;
}

interface KeyCheckboxState {
  key: GlobalKey;
  isAttached: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  tooltip: string;
  disabledReason?: 'immutable-vault' | 'max-keys' | null;
}

export const KeyAttachmentDialog: React.FC<KeyAttachmentDialogProps> = ({
  isOpen,
  onClose,
  vaultInfo,
  onSuccess,
}) => {
  const { globalKeyCache, keyCache, statisticsCache } = useVault();
  const [keyStates, setKeyStates] = useState<KeyCheckboxState[]>([]);
  const [isVaultMutable, setIsVaultMutable] = useState(true);

  // Load keys and determine checkbox states using CACHE-FIRST
  useEffect(() => {
    if (!isOpen) return;

    const loadKeys = () => {
      try {
        logger.info('KeyAttachmentDialog', 'Loading keys from cache', {
          vaultId: vaultInfo.id,
          vaultName: vaultInfo.name,
        });

        // Check vault mutability from cache (instant)
        const stats = statisticsCache.get(vaultInfo.id);
        let vaultMutable = true;
        if (stats) {
          const encryptionCount = stats.encryption_count;
          vaultMutable = encryptionCount === 0;
          setIsVaultMutable(vaultMutable);

          logger.info('KeyAttachmentDialog', 'Vault mutability from cache', {
            vaultId: vaultInfo.id,
            encryptionCount,
            isMutable: vaultMutable,
          });
        }

        // Get all keys from global cache (instant)
        const allKeys = globalKeyCache;

        logger.info('KeyAttachmentDialog', 'Keys from global cache', {
          count: allKeys.length,
        });

        if (allKeys.length === 0) {
          setKeyStates([]);
          return;
        }

        // Get current vault keys from cache (instant)
        const currentVaultKeys = keyCache.get(vaultInfo.id) || [];
        const currentVaultKeyIds = currentVaultKeys.map((k) => k.id);

        const currentKeyCount = currentVaultKeyIds.length;
        const hasReachedMaxKeys = currentKeyCount >= 4;

        logger.info('KeyAttachmentDialog', 'Current vault keys from cache', {
          vaultId: vaultInfo.id,
          currentKeyCount,
          hasReachedMaxKeys,
          keyIds: currentVaultKeyIds,
        });

        // Process each key (all synchronous, instant)
        const states: KeyCheckboxState[] = allKeys.map((key) => {
          const isAttached = currentVaultKeyIds.includes(key.id);
          let isDisabled = false;
          let tooltip = '';
          let disabledReason: 'immutable-vault' | 'max-keys' | 'unavailable' | null = null;

          if (!vaultMutable) {
            // Vault is immutable - all keys disabled
            isDisabled = true;
            disabledReason = 'immutable-vault';
            tooltip = isAttached
              ? 'This vault is sealed - key set cannot be modified'
              : 'Vault already encrypted — key set is sealed';
          } else if (hasReachedMaxKeys && !isAttached) {
            // Vault at max capacity - can't attach new keys
            isDisabled = true;
            disabledReason = 'max-keys';
            tooltip = 'Maximum 4 keys reached. Detach a key to attach this one.';
          } else {
            // Normal state - can attach or detach
            // Note: Availability check removed - users can attach any registered key
            // Availability only matters during actual encrypt/decrypt operations
            tooltip = isAttached
              ? 'Click to detach key from vault'
              : 'Click to attach key to vault';
          }

          return {
            key,
            isAttached,
            isDisabled,
            isLoading: false,
            tooltip,
            disabledReason,
          };
        });

        // Sort keys as requested:
        // 1. YubiKeys first, then Passphrase
        // 2. Within each type: Available (not attached) → Attached
        const sortedStates = states.sort((a, b) => {
          // Primary sort: YubiKey before Passphrase
          const aIsYubiKey = a.key.key_type.type === 'YubiKey';
          const bIsYubiKey = b.key.key_type.type === 'YubiKey';

          if (aIsYubiKey && !bIsYubiKey) return -1;
          if (!aIsYubiKey && bIsYubiKey) return 1;

          // Secondary sort within type: Available (not attached) before Attached
          if (!a.isAttached && b.isAttached) return -1;
          if (a.isAttached && !b.isAttached) return 1;

          // Tertiary sort: Alphabetically by label
          return (a.key.label || '').localeCompare(b.key.label || '');
        });

        setKeyStates(sortedStates);
      } catch (err) {
        logger.error('KeyAttachmentDialog', 'Error loading keys from cache', err as Error);
      }
    };

    loadKeys();
    // Only run when dialog opens, not when cache changes
    // This preserves the sort order and prevents re-rendering during toggles
  }, [isOpen, vaultInfo.id]);

  const handleToggleKey = async (keyId: string, currentlyAttached: boolean) => {
    try {
      // OPTIMISTIC UPDATE: Update UI immediately for instant feedback
      // Don't re-sort - preserve the initial display order
      setKeyStates((prev) =>
        prev.map((state) => {
          if (state.key.id === keyId) {
            return { ...state, isLoading: true, isAttached: !currentlyAttached };
          }
          return state;
        }),
      );

      // Then sync with backend in background
      if (currentlyAttached) {
        logger.info('KeyAttachmentDialog', 'Detaching key from vault', {
          keyId,
          vaultId: vaultInfo.id,
        });

        const result = await commands.removeKeyFromVault({
          vault_id: vaultInfo.id,
          key_id: keyId,
        });

        if (result.status === 'error') {
          throw new Error(result.error.message || 'Failed to detach key');
        }

        logger.info('KeyAttachmentDialog', 'Key detached successfully');
      } else {
        logger.info('KeyAttachmentDialog', 'Attaching key to vault', {
          keyId,
          vaultId: vaultInfo.id,
        });

        const result = await commands.attachKeyToVault({
          vault_id: vaultInfo.id,
          key_id: keyId,
        });

        if (result.status === 'error') {
          throw new Error(result.error.message || 'Failed to attach key');
        }

        logger.info('KeyAttachmentDialog', 'Key attached successfully');
      }

      // Clear loading spinner and recalculate disabled states after backend sync
      setKeyStates((prev) => {
        // Count currently attached keys
        const attachedCount = prev.filter((s) => s.isAttached).length;
        const hasReachedMax = attachedCount >= 4;

        return prev.map((state) => {
          if (state.key.id === keyId) {
            // Clear loading for the toggled key
            return { ...state, isLoading: false };
          }

          // Update disabled state for other keys based on new max status
          if (!isVaultMutable) {
            // Vault immutable - keep disabled
            return state;
          } else if (hasReachedMax && !state.isAttached) {
            // Max reached - disable non-attached keys
            return {
              ...state,
              isDisabled: true,
              disabledReason: 'max-keys' as const,
              tooltip: 'Maximum 4 keys reached. Detach a key to attach this one.',
            };
          } else if (state.disabledReason === 'max-keys' && !hasReachedMax) {
            // Max no longer reached - re-enable previously disabled keys
            return {
              ...state,
              isDisabled: false,
              disabledReason: null,
              tooltip: 'Click to attach key to vault',
            };
          }

          return state;
        });
      });

      // Notify parent to refresh cache (async, non-blocking)
      onSuccess();
    } catch (err: any) {
      logger.error('KeyAttachmentDialog', 'Toggle key failed', err);

      // ROLLBACK: Revert optimistic update on error
      setKeyStates((prev) =>
        prev.map((state) =>
          state.key.id === keyId
            ? { ...state, isLoading: false, isAttached: currentlyAttached }
            : state,
        ),
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-slate-600">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700 rounded-lg">
              <Key className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Attach Keys</h2>
              <p className="text-sm text-slate-400">{vaultInfo.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {/* Vault mutability status */}
          {!isVaultMutable && (
            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-2">
              <Lock className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-300">
                This vault is <strong>sealed</strong> - the key set cannot be modified after
                encryption.
              </div>
            </div>
          )}

          {/* Policy info - always visible */}
          <div className="mb-3 text-sm text-slate-400">
            <p>Select 2-4 keys for this vault (preferably hardware keys).</p>
          </div>

          {/* Key list */}
          {keyStates.length > 0 && (
            <div className="space-y-2">
              {keyStates.map((state) => (
                <label
                  key={state.key.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer
                    ${
                      state.isDisabled
                        ? 'bg-slate-700/30 border-slate-600/50 cursor-not-allowed opacity-60'
                        : state.isAttached
                          ? 'bg-blue-500/10 border-blue-500/50 hover:bg-blue-500/20'
                          : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700'
                    }
                  `}
                  title={state.tooltip}
                >
                  {/* Checkbox */}
                  <div className="flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={state.isAttached}
                      disabled={state.isDisabled || state.isLoading}
                      onChange={() => handleToggleKey(state.key.id, state.isAttached)}
                      className="w-4 h-4 rounded border-slate-500 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-50"
                    />
                  </div>

                  {/* Key icon */}
                  <div className="flex-shrink-0">
                    {state.key.key_type.type === 'YubiKey' ? (
                      <Fingerprint className="w-4 h-4" style={{ color: '#F98B1C' }} />
                    ) : (
                      <Key className="w-4 h-4 text-teal-600" />
                    )}
                  </div>

                  {/* Key info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-200 truncate">{state.key.label}</div>
                  </div>

                  {/* Loading indicator (only when toggling this specific key) */}
                  {state.isLoading && (
                    <div className="flex-shrink-0">
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    </div>
                  )}
                </label>
              ))}
            </div>
          )}

          {/* Empty state */}
          {keyStates.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No keys available.</p>
              <p className="text-xs mt-1">Create keys in Manage Keys page.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-600 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyAttachmentDialog;
