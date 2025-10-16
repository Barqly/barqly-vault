import React, { useEffect, useState, useCallback } from 'react';
import { Key, Fingerprint, Grid3x3, List, RefreshCcw } from 'lucide-react';
import { useVault } from '../contexts/VaultContext';
import { useManageKeysWorkflow } from '../hooks/useManageKeysWorkflow';
import PageHeader from '../components/common/PageHeader';
import AppPrimaryContainer from '../components/layout/AppPrimaryContainer';
import { KeyCard } from '../components/keys/KeyCard';
import { YubiKeyRegistryDialog } from '../components/keys/YubiKeyRegistryDialog';
import { PassphraseKeyRegistryDialog } from '../components/keys/PassphraseKeyRegistryDialog';
import { VaultAttachmentDialog } from '../components/keys/VaultAttachmentDialog';
import { logger } from '../lib/logger';
import { commands, GlobalKey, VaultStatistics } from '../bindings';

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
  const [showVaultAttachmentDialog, setShowVaultAttachmentDialog] = useState(false);
  const [selectedKeyForAttachment, setSelectedKeyForAttachment] = useState<GlobalKey | null>(null);

  // Vault statistics for deactivation eligibility checks
  const [vaultStats, setVaultStats] = useState<Map<string, VaultStatistics>>(new Map());
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Build vault name map for display
  const vaultNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    vaults.forEach((vault) => {
      map.set(vault.id, vault.name);
    });
    return map;
  }, [vaults]);

  // Fetch vault statistics for deactivation eligibility checks
  const fetchVaultStatistics = useCallback(async () => {
    if (vaults.length === 0) {
      setVaultStats(new Map());
      return;
    }

    setIsLoadingStats(true);
    try {
      const statsMap = new Map<string, VaultStatistics>();

      // Fetch statistics for all vaults in parallel
      const results = await Promise.all(
        vaults.map((vault) =>
          commands.getVaultStatistics({ vault_id: vault.id })
        )
      );

      results.forEach((result, index) => {
        if (result.status === 'ok' && result.data.statistics) {
          statsMap.set(vaults[index].id, result.data.statistics);
        }
      });

      setVaultStats(statsMap);
      logger.info('ManageKeysPage', 'Vault statistics loaded', {
        vaultCount: vaults.length,
        statsCount: statsMap.size,
      });
    } catch (err) {
      logger.error('ManageKeysPage', 'Failed to fetch vault statistics', err as Error);
    } finally {
      setIsLoadingStats(false);
    }
  }, [vaults]);

  // Refresh vault statistics when vaults change
  useEffect(() => {
    if (vaults.length > 0) {
      fetchVaultStatistics();
    }
  }, [vaults.length, fetchVaultStatistics]);

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
    (keyId: string) => {
      // allKeys is now GlobalKey[] - has all fields including vault_associations!
      const keyInfo = allKeys.find((k) => k.id === keyId);
      if (!keyInfo) {
        logger.error('ManageKeysPage', 'Key not found', { keyId });
        return;
      }

      // Open the vault attachment dialog - no reconstruction needed!
      setSelectedKeyForAttachment(keyInfo);
      setShowVaultAttachmentDialog(true);
    },
    [allKeys],
  );

  const handleVaultAttachmentSuccess = useCallback(async () => {
    // Refresh the UI after successful attachment/detachment
    await refreshAllKeys();
    // Also refresh vault statistics (attachment changes may affect eligibility)
    await fetchVaultStatistics();
    // Also refresh the vault cache if there's a current vault
    if (currentVault) {
      await refreshKeysForVault(currentVault.id);
    }
  }, [refreshAllKeys, fetchVaultStatistics, currentVault, refreshKeysForVault]);

  // Note: Physical key deletion is not supported by design
  // Keys can only be removed from vaults using removeKeyFromVault
  // Suspended keys remain in the registry for potential recovery
  const handleDeleteKey = useCallback(async (keyId: string) => {
    alert(
      'Physical key deletion is not supported.\n\n' +
        'Keys can be removed from vaults but remain in the registry for recovery purposes.\n' +
        'Suspended keys can be re-attached to vaults at any time.',
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
            <option value="suspended">Suspended Keys</option>
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
                const isSuspended = attachments.length === 0;

                return (
                  <KeyCard
                    key={key.id}
                    keyRef={key}
                    vaultAttachments={attachments}
                    isOrphan={isSuspended}
                    vaultStats={vaultStats}
                    onAttach={handleAttachKey}
                    onDelete={isSuspended ? handleDeleteKey : undefined}
                    onExport={handleExportKey}
                    onRefresh={async () => {
                      await refreshAllKeys();
                      await fetchVaultStatistics();
                    }}
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
        <PassphraseKeyRegistryDialog
          isOpen={showPassphraseDialog}
          onSuccess={handlePassphraseCreated}
          onClose={() => {
            setShowPassphraseDialog(false);
            setIsCreatingKey(false);
          }}
        />

        {/* YubiKey Registry Dialog */}
        <YubiKeyRegistryDialog
          isOpen={isDetectingYubiKey}
          onClose={() => setIsDetectingYubiKey(false)}
          onSuccess={refreshAllKeys}
        />

        {/* Vault Attachment Dialog */}
        {selectedKeyForAttachment && (
          <VaultAttachmentDialog
            isOpen={showVaultAttachmentDialog}
            onClose={() => {
              setShowVaultAttachmentDialog(false);
              setSelectedKeyForAttachment(null);
            }}
            keyInfo={selectedKeyForAttachment}
            onSuccess={handleVaultAttachmentSuccess}
          />
        )}
      </AppPrimaryContainer>
    </div>
  );
};

export default ManageKeysPage;
