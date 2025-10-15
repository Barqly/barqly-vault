import React, { useState, useEffect } from 'react';
import { X, Loader2, Key, Shield } from 'lucide-react';
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
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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

              if (statsResult.status === 'ok' && statsResult.data.statistics) {
                const encryptionCount = statsResult.data.statistics.encryption_count;
                // encryption_count: 0 = never encrypted, >0 = encrypted
                const isKeySetMutable = encryptionCount === 0;

                if (!isKeySetMutable) {
                  // Vault has been encrypted - keyset is sealed (immutable)
                  isDisabled = true;
                  tooltip =
                    'Vault already encrypted — key set is sealed. To add or remove keys, create a new vault or re-encrypt existing data.';
                } else {
                  // Vault never encrypted - can attach or detach
                  tooltip = isAttached
                    ? 'Unlink key from vault (metadata only)'
                    : 'Attach this key to use it for encrypting this vault.';
                }
              } else {
                // Fallback if stats not available - allow operation
                tooltip = isAttached
                  ? 'Unlink key from vault'
                  : 'Attach this key to use it for encrypting this vault.';
              }

              return {
                vault,
                isAttached,
                isDisabled,
                isLoading: false,
                tooltip,
              };
            } catch (err) {
              logger.error('VaultAttachmentDialog', 'Error processing vault', err as Error);
              throw err; // Re-throw to mark as rejected
            }
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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  // Reset position when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="bg-white rounded-lg shadow-2xl border border-slate-300 max-w-md w-full mx-4 transition-transform duration-150"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${isOpen ? 1 : 0.95})`,
        }}
      >
        {/* Header - Draggable Area */}
        <div
          className="flex items-center justify-between p-4 border-b border-slate-200 cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <h3 className="text-lg font-semibold text-slate-800">Attach to Vaults</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Key Info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-3">
            <div
              className={`rounded-lg p-2 ${
                keyInfo.key_type.type === 'Passphrase' ? 'bg-green-100' : 'bg-purple-100'
              }`}
            >
              <Key
                className={`h-4 w-4 ${
                  keyInfo.key_type.type === 'Passphrase' ? 'text-green-700' : 'text-purple-700'
                }`}
              />
            </div>
            <div>
              <div className="text-xs text-slate-600 font-medium">Key:</div>
              <div className="font-semibold text-slate-800">{keyInfo.label}</div>
            </div>
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
                    flex items-center gap-3 p-3 rounded-lg border transition-colors
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
                      disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0
                    "
                  />
                  <Shield
                    className={`h-4 w-4 flex-shrink-0 ${
                      state.isDisabled ? 'text-slate-400' : 'text-blue-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">
                      {state.vault.name}
                    </div>
                    {state.vault.description && (
                      <div className="text-xs text-slate-500 truncate">
                        {state.vault.description}
                      </div>
                    )}
                  </div>
                  {state.isLoading && (
                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
                  )}
                  {state.isDisabled && (
                    <span className="text-xs text-slate-500 ml-2 flex-shrink-0">🔒 Locked</span>
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
