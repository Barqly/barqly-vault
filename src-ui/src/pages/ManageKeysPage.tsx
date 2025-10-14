import React, { useEffect, useState, useCallback } from 'react';
import { Key, Fingerprint, Grid3x3, List, RefreshCcw } from 'lucide-react';
import { useVault } from '../contexts/VaultContext';
import { useManageKeysWorkflow } from '../hooks/useManageKeysWorkflow';
import PageHeader from '../components/common/PageHeader';
import AppPrimaryContainer from '../components/layout/AppPrimaryContainer';
import { KeyCard } from '../components/keys/KeyCard';
import { YubiKeySetupDialog } from '../components/keys/YubiKeySetupDialog';
import { PassphraseKeyDialog } from '../components/keys/PassphraseKeyDialog';
import { logger } from '../lib/logger';
import { commands } from '../bindings';

/**
 * Manage Keys Page - Central registry for all encryption keys
 * Users can create, import, and manage keys across all vaults
 */
const ManageKeysPage: React.FC = () => {
  const { vaults, currentVault, refreshKeysForVault } = useVault();
  const {
    filterType,
    keyViewMode,
    isDetectingYubiKey,
    error,
    allKeys,
    getKeyVaultAttachments,
    setFilterType,
    setKeyViewMode,
    setIsCreatingKey,
    setIsDetectingYubiKey,
    refreshAllKeys,
  } = useManageKeysWorkflow();

  const [showPassphraseDialog, setShowPassphraseDialog] = useState(false);

  // Build vault name map for display
  const vaultNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    vaults.forEach((vault) => {
      map.set(vault.id, vault.name);
    });
    return map;
  }, [vaults]);

  // Refresh all keys on mount
  useEffect(() => {
    refreshAllKeys();
  }, []);

  const handleCreatePassphrase = useCallback(() => {
    setShowPassphraseDialog(true);
    setIsCreatingKey(true);
  }, [setIsCreatingKey]);

  const handleDetectYubiKey = useCallback(() => {
    setIsDetectingYubiKey(true);
  }, [setIsDetectingYubiKey]);

  const handlePassphraseCreated = useCallback(async () => {
    setShowPassphraseDialog(false);
    setIsCreatingKey(false);
    await refreshAllKeys();
  }, [refreshAllKeys, setIsCreatingKey]);

  const handleAttachKey = useCallback(
    async (keyId: string) => {
      // If no current vault or multiple vaults, show selection dialog
      let targetVaultId: string | null = null;

      if (!currentVault && vaults.length === 1) {
        // Only one vault exists, use it
        targetVaultId = vaults[0].id;
      } else if (!currentVault && vaults.length > 1) {
        // Multiple vaults, need user to select
        // For now, use a simple prompt - in production, use a proper modal
        const vaultNames = vaults.map((v, i) => `${i + 1}. ${v.name}`).join('\n');
        const selection = prompt(
          `Select a vault to attach this key to:\n\n${vaultNames}\n\nEnter the number:`,
        );

        if (!selection) return;

        const index = parseInt(selection) - 1;
        if (index >= 0 && index < vaults.length) {
          targetVaultId = vaults[index].id;
        } else {
          alert('Invalid selection');
          return;
        }
      } else if (currentVault) {
        targetVaultId = currentVault.id;
      } else {
        alert('No vaults available. Please create a vault first.');
        return;
      }

      try {
        logger.info('ManageKeysPage', 'Attaching key to vault', {
          keyId,
          vaultId: targetVaultId,
        });

        const result = await commands.attachKeyToVault({
          key_id: keyId,
          vault_id: targetVaultId,
        });

        if (result.status === 'ok' && result.data.success) {
          // Show success message
          logger.info('ManageKeysPage', 'Key attached successfully', {
            keyId: result.data.key_id,
            vaultId: result.data.vault_id,
          });

          // Show any warnings if present
          if (result.data.message) {
            alert(`Success: ${result.data.message}`);
          }

          // Refresh the UI
          if (targetVaultId) {
            await refreshKeysForVault(targetVaultId);
          }
          await refreshAllKeys();
        } else if (result.status === 'error') {
          const error = result.error as any;
          logger.error('ManageKeysPage', 'Failed to attach key', error);

          // Show user-friendly error with recovery guidance
          const errorMessage = error.recovery_guidance
            ? `${error.message}\n\n${error.recovery_guidance}`
            : error.message || 'Failed to attach key';

          alert(errorMessage);
        }
      } catch (err) {
        logger.error('ManageKeysPage', 'Failed to attach key', err as Error);
        alert('An unexpected error occurred while attaching the key');
      }
    },
    [currentVault, vaults, refreshKeysForVault, refreshAllKeys],
  );

  // Note: Physical key deletion is not supported by design
  // Keys can only be removed from vaults using removeKeyFromVault
  // Orphaned keys remain in the registry for potential recovery
  const handleDeleteKey = useCallback(async (keyId: string) => {
    alert(
      'Physical key deletion is not supported.\n\n' +
        'Keys can be removed from vaults but remain in the registry for recovery purposes.\n' +
        'Orphaned keys can be re-attached to vaults at any time.',
    );
    logger.info('ManageKeysPage', 'Delete requested but not supported', { keyId });
  }, []);

  // Note: Key export is handled by .enc files which are already created
  // No separate export functionality is needed
  const handleExportKey = useCallback(async (keyId: string) => {
    alert(
      'Key files are already stored as encrypted .enc files.\n\n' +
        'You can find your key files in the Barqly vault directory.\n' +
        'These files can be backed up and imported on other systems.',
    );
    logger.info('ManageKeysPage', 'Export info requested', { keyId });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
      <PageHeader title="Manage Keys" icon={Key} />

      <AppPrimaryContainer>
        {/* Create New Key Section - Like Vault Hub */}
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-slate-700 mb-4 text-center">Create New Key</h3>

          <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
            {/* Passphrase Card */}
            <button
              onClick={handleCreatePassphrase}
              className="group p-6 border-2 border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <div className="flex flex-col items-center gap-3">
                <Key className="h-12 w-12 text-slate-400 group-hover:text-blue-600 transition-colors" />
                <h4 className="font-semibold text-slate-700 group-hover:text-blue-700">
                  Passphrase
                </h4>
                <p className="text-sm text-slate-500 text-center">Password-protected key</p>
              </div>
            </button>

            {/* YubiKey Card */}
            <button
              onClick={handleDetectYubiKey}
              className="group p-6 border-2 border-slate-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all"
            >
              <div className="flex flex-col items-center gap-3">
                <Fingerprint className="h-12 w-12 text-slate-400 group-hover:text-purple-600 transition-colors" />
                <h4 className="font-semibold text-slate-700 group-hover:text-purple-700">
                  YubiKey
                </h4>
                <p className="text-sm text-slate-500 text-center">Hardware security key</p>
              </div>
            </button>
          </div>
        </div>

        {/* Action Bar - Right-aligned only */}
        <div className="flex gap-3 items-center justify-end mb-6">
          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="
                px-3 py-2 text-sm
                border border-slate-200 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-blue-600
              "
          >
            <option value="all">All Keys</option>
            <option value="passphrase">Passphrase Only</option>
            <option value="yubikey">YubiKey Only</option>
            <option value="orphan">Orphan Keys</option>
          </select>

          {/* View Toggle */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setKeyViewMode('cards')}
              className={`
                  p-2 transition-colors
                  ${
                    keyViewMode === 'cards'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }
                `}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setKeyViewMode('table')}
              className={`
                  p-2 transition-colors
                  ${
                    keyViewMode === 'table'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }
                `}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={refreshAllKeys}
            className="
                p-2 text-slate-600
                border border-slate-200 rounded-lg
                hover:bg-slate-50 transition-colors
              "
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Key Display */}
        {keyViewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allKeys.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Key className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">No keys found</h3>
                <p className="text-sm text-slate-500">
                  Create a new passphrase key or detect a YubiKey to get started
                </p>
              </div>
            ) : (
              allKeys.map((key) => {
                const attachments = getKeyVaultAttachments(key.id);
                const isOrphan = attachments.length === 0;

                return (
                  <KeyCard
                    key={key.id}
                    keyRef={key}
                    vaultAttachments={attachments}
                    isOrphan={isOrphan}
                    onAttach={handleAttachKey}
                    onDelete={isOrphan ? handleDeleteKey : undefined}
                    onExport={handleExportKey}
                    vaultNames={vaultNameMap}
                  />
                );
              })
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-sm text-slate-500">Table view coming soon...</p>
          </div>
        )}

        {/* Passphrase Dialog */}
        <PassphraseKeyDialog
          isOpen={showPassphraseDialog}
          onSuccess={handlePassphraseCreated}
          onClose={() => {
            setShowPassphraseDialog(false);
            setIsCreatingKey(false);
          }}
        />

        {/* YubiKey Setup Dialog */}
        <YubiKeySetupDialog
          isOpen={isDetectingYubiKey}
          onClose={() => setIsDetectingYubiKey(false)}
          onSuccess={refreshAllKeys}
        />
      </AppPrimaryContainer>
    </div>
  );
};

export default ManageKeysPage;
