import React, { useEffect, useState, useCallback } from 'react';
import { Key, Fingerprint, Grid3x3, List, RefreshCcw, Shield } from 'lucide-react';
import { useVault } from '../contexts/VaultContext';
import { useManageKeysWorkflow } from '../hooks/useManageKeysWorkflow';
import PageHeader from '../components/common/PageHeader';
import AppPrimaryContainer from '../components/layout/AppPrimaryContainer';
import { KeyCard } from '../components/keys/KeyCard';
import { KeyTable } from '../components/keys/KeyTable';
import { YubiKeyRegistryDialog } from '../components/keys/YubiKeyRegistryDialog';
import { PassphraseKeyRegistryDialog } from '../components/keys/PassphraseKeyRegistryDialog';
import { VaultAttachmentDialog } from '../components/keys/VaultAttachmentDialog';
import { CreateKeyModal } from '../components/keys/CreateKeyModal';
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
    showPassphraseKeys,
    showYubiKeyKeys,
    togglePassphraseFilter,
    toggleYubiKeyFilter,
  } = useManageKeysWorkflow();

  const [showPassphraseDialog, setShowPassphraseDialog] = useState(false);
  const [showVaultAttachmentDialog, setShowVaultAttachmentDialog] = useState(false);
  const [selectedKeyForAttachment, setSelectedKeyForAttachment] = useState<GlobalKey | null>(null);
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false);

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

  const handleCreatePassphrase = useCallback(() => {
    setShowPassphraseDialog(true);
    setIsCreatingKey(true);
  }, [setIsCreatingKey]);

  const handleDetectYubiKey = useCallback(() => {
    setIsDetectingYubiKey(true);
  }, [setIsDetectingYubiKey]);

  const handlePassphraseCreated = useCallback(async () => {
    setShowPassphraseDialog(false);
    setShowCreateKeyModal(false); // Close both modals on success
    setIsCreatingKey(false);
    await refreshAllKeys();
  }, [refreshAllKeys, setIsCreatingKey]);

  const handleAttachKey = useCallback(
    (keyId: string) => {
      // allKeys is now GlobalKey[] - has all fields including vault_associations!
      const keyInfo = allKeys.find((k) => k.id === keyId);
      if (!keyInfo) {
        logger.error('ManageKeysPage', 'Key not found', new Error(`Key not found: ${keyId}`));
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
    <div className="min-h-screen bg-app -mx-4 sm:-mx-6 lg:-mx-8 -my-6">
      <PageHeader
        title="Manage Keys"
        icon={Key}
        actions={
          <div className="flex items-center gap-3">
            {/* + New Key Button (always visible) */}
            <button
              onClick={() => setShowCreateKeyModal(true)}
              className="
                flex items-center gap-2 px-4 py-2
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
              + New Key
            </button>

            {/* View Toggle */}
            <div className="flex border border-default rounded-lg overflow-hidden">
              <button
                onClick={() => setKeyViewMode('cards')}
                className={`
                  p-2 transition-colors
                  ${
                    keyViewMode === 'cards'
                      ? 'text-white'
                      : 'bg-card text-secondary hover:bg-hover'
                  }
                `}
                style={{
                  backgroundColor: keyViewMode === 'cards' ? '#1D4ED8' : undefined,
                }}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setKeyViewMode('table')}
                className={`
                  p-2 transition-colors
                  ${
                    keyViewMode === 'table'
                      ? 'text-white'
                      : 'bg-card text-secondary hover:bg-hover'
                  }
                `}
                style={{
                  backgroundColor: keyViewMode === 'table' ? '#1D4ED8' : undefined,
                }}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {/* Filter - Icon Toggle (multi-select) */}
            <div className="flex border border-default rounded-lg overflow-hidden">
              {/* Passphrase Filter - Navy background with teal icon */}
              <button
                onClick={togglePassphraseFilter}
                className="p-2 transition-all"
                style={{
                  backgroundColor: showPassphraseKeys ? '#1A2238' : 'rgb(var(--surface-hover))',
                  border: showPassphraseKeys ? '1px solid #2C3E50' : undefined,
                  boxShadow: showPassphraseKeys ? 'inset -3px 0 6px -2px rgba(15, 118, 110, 0)' : undefined,
                }}
                onMouseEnter={(e) => {
                  if (showPassphraseKeys) {
                    e.currentTarget.style.boxShadow = 'inset -3px 0 6px -2px rgba(15, 118, 110, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (showPassphraseKeys) {
                    e.currentTarget.style.boxShadow = 'inset -3px 0 6px -2px rgba(15, 118, 110, 0)';
                  }
                }}
                title={showPassphraseKeys ? 'Hide Passphrase keys' : 'Show Passphrase keys'}
              >
                <Key
                  className="h-4 w-4"
                  style={{
                    color: showPassphraseKeys ? '#13897F' : '#94a3b8',
                  }}
                />
              </button>

              {/* YubiKey Filter - Dark background with bitcoin orange fingerprint */}
              <button
                onClick={toggleYubiKeyFilter}
                className="p-2 transition-all"
                style={{
                  backgroundColor: showYubiKeyKeys ? '#1E1E1E' : 'rgb(var(--surface-hover))',
                  border: showYubiKeyKeys ? '1px solid #2C2C2C' : undefined,
                  boxShadow: showYubiKeyKeys ? 'inset 3px 0 6px -2px rgba(255, 138, 0, 0)' : undefined,
                }}
                onMouseEnter={(e) => {
                  if (showYubiKeyKeys) {
                    e.currentTarget.style.boxShadow = 'inset 3px 0 6px -2px rgba(255, 138, 0, 0.6)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (showYubiKeyKeys) {
                    e.currentTarget.style.boxShadow = 'inset 3px 0 6px -2px rgba(255, 138, 0, 0)';
                  }
                }}
                title={showYubiKeyKeys ? 'Hide YubiKey keys' : 'Show YubiKey keys'}
              >
                <Fingerprint
                  className="h-4 w-4"
                  style={{
                    color: showYubiKeyKeys ? '#ff8a00' : '#94a3b8',
                  }}
                />
              </button>
            </div>
          </div>
        }
      />

      <AppPrimaryContainer>
        {/* Create New Key Section - Only show when no keys exist (empty state) */}
        {allKeys.length === 0 && (
          <div className="mt-6 border-2 border-dashed border-default rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-main mb-4 text-center">Create New Key</h3>

            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
              {/* YubiKey Card - LEFT (Most Secure) */}
              <button
                onClick={handleDetectYubiKey}
                className="group p-6 pt-8 border-2 border-default rounded-lg transition-all relative bg-card"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#ffd4a3';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 138, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgb(var(--border-default))';
                  e.currentTarget.style.backgroundColor = 'rgb(var(--surface-card))';
                }}
              >
                {/* Most Secure Badge - Centered on top border */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {/* Background to hide border */}
                  <div className="absolute inset-0 bg-card rounded-full" style={{ margin: '-2px' }} />
                  {/* Badge */}
                  <div className="relative flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(249, 139, 28, 0.08)', color: '#F98B1C', border: '1px solid #ffd4a3' }}>
                    <Shield className="h-3 w-3" />
                    Most Secure
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div
                    className="rounded-lg p-3"
                    style={{
                      backgroundColor: 'rgba(249, 139, 28, 0.08)',
                      border: '1px solid #ffd4a3',
                    }}
                  >
                    <Fingerprint className="h-12 w-12" style={{ color: '#F98B1C' }} />
                  </div>
                  <h4 className="font-semibold text-heading">
                    YubiKey
                  </h4>
                  <p className="text-sm text-secondary text-center">Hardware security key</p>
                </div>
              </button>

              {/* Passphrase Card - RIGHT */}
              <button
                onClick={handleCreatePassphrase}
                className="group p-6 border-2 border-default rounded-lg transition-all bg-card"
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#B7E1DD';
                  e.currentTarget.style.backgroundColor = 'rgba(15, 118, 110, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgb(var(--border-default))';
                  e.currentTarget.style.backgroundColor = 'rgb(var(--surface-card))';
                }}
              >
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="rounded-lg p-3"
                    style={{
                      backgroundColor: 'rgba(15, 118, 110, 0.1)',
                      border: '1px solid #B7E1DD',
                    }}
                  >
                    <Key className="h-12 w-12" style={{ color: '#13897F' }} />
                  </div>
                  <h4 className="font-semibold text-heading">
                    Passphrase
                  </h4>
                  <p className="text-sm text-secondary text-center">Password-protected key</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Key Display */}
        {keyViewMode === 'cards' ? (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allKeys.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Key className="h-12 w-12 text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary mb-2">No keys found</h3>
                <p className="text-sm text-secondary">
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
          <div className="mt-6">
            <KeyTable
              keys={allKeys}
              vaultAttachments={getKeyVaultAttachments}
              vaultStats={vaultStats}
              onAttach={handleAttachKey}
              onExport={handleExportKey}
              onRefresh={async () => {
                await refreshAllKeys();
                await fetchVaultStatistics();
              }}
              vaultNames={vaultNameMap}
            />
          </div>
        )}

        {/* Passphrase Dialog */}
        <PassphraseKeyRegistryDialog
          isOpen={showPassphraseDialog}
          onSuccess={handlePassphraseCreated}
          onClose={() => {
            setShowPassphraseDialog(false);
            setIsCreatingKey(false);
            // Don't close CreateKeyModal - return to it
          }}
        />

        {/* YubiKey Registry Dialog */}
        <YubiKeyRegistryDialog
          isOpen={isDetectingYubiKey}
          onClose={() => {
            setIsDetectingYubiKey(false);
            // Don't close CreateKeyModal - return to it
          }}
          onSuccess={async () => {
            setIsDetectingYubiKey(false);
            setShowCreateKeyModal(false); // Close both modals on success
            await refreshAllKeys();
          }}
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

        {/* Create Key Modal - Hide when nested dialog is open */}
        {showCreateKeyModal && !showPassphraseDialog && !isDetectingYubiKey && (
          <CreateKeyModal
            isOpen={showCreateKeyModal}
            onClose={() => setShowCreateKeyModal(false)}
            onCreatePassphrase={handleCreatePassphrase}
            onRegisterYubiKey={handleDetectYubiKey}
          />
        )}
      </AppPrimaryContainer>
    </div>
  );
};

export default ManageKeysPage;
