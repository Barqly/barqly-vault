import React, { useState, useEffect } from 'react';
import { X, Loader2, Users, Lock } from 'lucide-react';
import { commands, VaultSummary } from '../../bindings';
import { logger } from '../../lib/logger';
import { useVault } from '../../contexts/VaultContext';
import { filterRecipients, filterOwnedKeys, filterGlobalRecipients } from '../../lib/key-types';
import { useNavigate } from 'react-router-dom';
import { GlobalKey } from '../../bindings';

interface RecipientAttachmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vaultInfo: VaultSummary;
  onSuccess: () => void;
}

interface RecipientCheckboxState {
  key: GlobalKey;
  isAttached: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  tooltip: string;
  disabledReason?: 'immutable-vault' | 'max-recipients' | 'no-owned-keys' | null;
}

const MAX_RECIPIENTS = 10;

export const RecipientAttachmentDialog: React.FC<RecipientAttachmentDialogProps> = ({
  isOpen,
  onClose,
  vaultInfo,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { globalKeyCache, keyCache, statisticsCache } = useVault();
  const [recipientStates, setRecipientStates] = useState<RecipientCheckboxState[]>([]);
  const [hasOwnedKeys, setHasOwnedKeys] = useState(false);
  const [isVaultMutable, setIsVaultMutable] = useState(true);

  // Load recipients and determine checkbox states using CACHE-FIRST
  useEffect(() => {
    if (!isOpen) return;

    const loadRecipients = () => {
      try {
        logger.info('RecipientAttachmentDialog', 'Loading recipients from cache', {
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
        }

        // Get current vault keys from cache (instant)
        const currentVaultKeys = keyCache.get(vaultInfo.id) || [];
        const ownedVaultKeys = filterOwnedKeys(currentVaultKeys);
        const hasOwned = ownedVaultKeys.length > 0;
        setHasOwnedKeys(hasOwned);

        // Get all recipients from global cache (using GlobalKey filter)
        const allRecipients = filterGlobalRecipients(globalKeyCache);

        logger.info('RecipientAttachmentDialog', 'Recipients from global cache', {
          count: allRecipients.length,
        });

        if (allRecipients.length === 0) {
          setRecipientStates([]);
          return;
        }

        // Get current vault recipients from cache
        const currentVaultRecipients = filterRecipients(currentVaultKeys);
        const currentRecipientIds = currentVaultRecipients.map((k) => k.id);
        const currentRecipientCount = currentRecipientIds.length;
        const hasReachedMaxRecipients = currentRecipientCount >= MAX_RECIPIENTS;

        // Process each recipient
        const states: RecipientCheckboxState[] = allRecipients.map((recipient) => {
          const isAttached = currentRecipientIds.includes(recipient.id);
          let isDisabled = false;
          let tooltip = '';
          let disabledReason: RecipientCheckboxState['disabledReason'] = null;

          if (!vaultMutable) {
            isDisabled = true;
            disabledReason = 'immutable-vault';
            tooltip = isAttached
              ? 'This vault is sealed - recipients cannot be modified'
              : 'Vault already encrypted — recipients cannot be added';
          } else if (!hasOwned) {
            isDisabled = true;
            disabledReason = 'no-owned-keys';
            tooltip = 'Add an owned key to this vault first';
          } else if (hasReachedMaxRecipients && !isAttached) {
            isDisabled = true;
            disabledReason = 'max-recipients';
            tooltip = `Maximum ${MAX_RECIPIENTS} recipients per vault`;
          } else {
            tooltip = isAttached ? 'Click to remove recipient' : 'Click to add recipient';
          }

          return {
            key: recipient,
            isAttached,
            isDisabled,
            isLoading: false,
            tooltip,
            disabledReason,
          };
        });

        setRecipientStates(states);
      } catch (err) {
        logger.error('RecipientAttachmentDialog', 'Error loading recipients', err as Error);
      }
    };

    loadRecipients();
  }, [isOpen, vaultInfo.id]);

  const handleToggleRecipient = async (recipientId: string, currentlyAttached: boolean) => {
    try {
      // OPTIMISTIC UPDATE: Update UI immediately
      setRecipientStates((prev) =>
        prev.map((state) => {
          if (state.key.id === recipientId) {
            return { ...state, isLoading: true, isAttached: !currentlyAttached };
          }
          return state;
        }),
      );

      // Sync with backend
      if (currentlyAttached) {
        const result = await commands.removeKeyFromVault({
          vault_id: vaultInfo.id,
          key_id: recipientId,
        });

        if (result.status === 'error') {
          throw new Error(result.error.message || 'Failed to remove recipient');
        }
      } else {
        const result = await commands.attachKeyToVault({
          vault_id: vaultInfo.id,
          key_id: recipientId,
        });

        if (result.status === 'error') {
          throw new Error(result.error.message || 'Failed to add recipient');
        }
      }

      // Clear loading and update max state
      setRecipientStates((prev) => {
        const attachedCount = prev.filter((s) => s.isAttached).length;
        const hasReachedMax = attachedCount >= MAX_RECIPIENTS;

        return prev.map((state) => {
          if (state.key.id === recipientId) {
            return { ...state, isLoading: false };
          }

          // Update disabled state for other recipients based on max
          if (!isVaultMutable || !hasOwnedKeys) {
            return state;
          } else if (hasReachedMax && !state.isAttached) {
            return {
              ...state,
              isDisabled: true,
              disabledReason: 'max-recipients' as const,
              tooltip: `Maximum ${MAX_RECIPIENTS} recipients per vault`,
            };
          } else if (state.disabledReason === 'max-recipients' && !hasReachedMax) {
            return {
              ...state,
              isDisabled: false,
              disabledReason: null,
              tooltip: 'Click to add recipient',
            };
          }

          return state;
        });
      });

      onSuccess();
    } catch (err: unknown) {
      logger.error('RecipientAttachmentDialog', 'Toggle recipient failed', err as Error);

      // ROLLBACK on error
      setRecipientStates((prev) =>
        prev.map((state) =>
          state.key.id === recipientId
            ? { ...state, isLoading: false, isAttached: currentlyAttached }
            : state,
        ),
      );
    }
  };

  if (!isOpen) return null;

  // Check if we have any recipients in the global registry
  const allRecipients = filterGlobalRecipients(globalKeyCache);
  const noRecipientsInRegistry = allRecipients.length === 0;

  // Get current vault keys to check for owned keys
  const currentVaultKeys = keyCache.get(vaultInfo.id) || [];
  const ownedVaultKeys = filterOwnedKeys(currentVaultKeys);
  const noOwnedKeysInVault = ownedVaultKeys.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-violet-500/50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/20 rounded-lg">
              <Users className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Recipients</h2>
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
          {/* Vault sealed status */}
          {!isVaultMutable && (
            <div className="mb-4 p-3 bg-violet-500/10 border border-violet-500/30 rounded-lg flex items-start gap-2">
              <Lock className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-violet-300">
                This vault is <strong>sealed</strong> - recipients cannot be modified after
                encryption.
              </div>
            </div>
          )}

          {/* State A: No owned keys in vault */}
          {noOwnedKeysInVault && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No keys attached to this vault.</p>
              <p className="text-xs mt-1">Add a key first before adding recipients.</p>
            </div>
          )}

          {/* State B: No recipients in registry */}
          {!noOwnedKeysInVault && noRecipientsInRegistry && (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No recipients available.</p>
              <p className="text-xs mt-1">
                <button
                  onClick={() => {
                    onClose();
                    navigate('/manage-keys');
                  }}
                  className="text-violet-400 hover:underline"
                >
                  Add recipients in Manage Keys
                </button>
              </p>
            </div>
          )}

          {/* State C: Normal - Show recipient list */}
          {!noOwnedKeysInVault && !noRecipientsInRegistry && (
            <>
              {/* Policy info */}
              <div className="mb-3 text-sm text-slate-400">
                <p>Select recipients who can decrypt files from this vault.</p>
              </div>

              {/* Recipient list - 2 columns */}
              <div className="grid grid-cols-2 gap-2">
                {recipientStates.map((state) => (
                  <label
                    key={state.key.id}
                    className={`
                      flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer
                      ${
                        state.isDisabled
                          ? 'bg-slate-700/30 border-slate-600/50 cursor-not-allowed opacity-60'
                          : state.isAttached
                            ? 'bg-violet-500/10 border-violet-500/50 hover:bg-violet-500/20'
                            : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700'
                      }
                    `}
                    title={state.key.label}
                  >
                    {/* Checkbox */}
                    <div className="flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={state.isAttached}
                        disabled={state.isDisabled || state.isLoading}
                        onChange={() => handleToggleRecipient(state.key.id, state.isAttached)}
                        className="w-4 h-4 rounded border-slate-500 text-violet-600 focus:ring-2 focus:ring-violet-500 focus:ring-offset-0 disabled:opacity-50"
                      />
                    </div>

                    {/* Recipient icon */}
                    <div className="flex-shrink-0">
                      <Users className="w-4 h-4 text-violet-400" />
                    </div>

                    {/* Recipient label - truncated with tooltip */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div
                        className="text-sm font-medium text-slate-200 truncate"
                        style={{ maxWidth: '18ch' }}
                      >
                        {state.key.label}
                      </div>
                    </div>

                    {/* Loading indicator */}
                    {state.isLoading && (
                      <div className="flex-shrink-0">
                        <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                      </div>
                    )}
                  </label>
                ))}
              </div>

              {/* Count info */}
              <div className="mt-3 text-xs text-slate-500">
                {recipientStates.filter((s) => s.isAttached).length} of {MAX_RECIPIENTS} recipients
                assigned
              </div>
            </>
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

export default RecipientAttachmentDialog;
