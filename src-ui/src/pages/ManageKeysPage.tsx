import React, { useEffect, useState, useCallback } from 'react';
import { Key, Plus, Upload, Search, Grid3x3, List, RefreshCcw } from 'lucide-react';
import { useVault } from '../contexts/VaultContext';
import { useManageKeysWorkflow } from '../hooks/useManageKeysWorkflow';
import UniversalHeader from '../components/common/UniversalHeader';
import AppPrimaryContainer from '../components/layout/AppPrimaryContainer';
import { KeyCard } from '../components/keys/KeyCard';
import { KeyImportDialog } from '../components/keys/KeyImportDialog';
import { YubiKeyDetector } from '../components/keys/YubiKeyDetector';
import { PassphraseKeyDialog } from '../components/keys/PassphraseKeyDialog';
import { logger } from '../lib/logger';

/**
 * Manage Keys Page - Central registry for all encryption keys
 * Users can create, import, and manage keys across all vaults
 */
const ManageKeysPage: React.FC = () => {
  const { vaults, currentVault, refreshKeysForVault } = useVault();
  const {
    searchQuery,
    filterType,
    keyViewMode,
    isImporting,
    isDetectingYubiKey,
    error,
    allKeys,
    getKeyVaultAttachments,
    setSearchQuery,
    setFilterType,
    setKeyViewMode,
    setIsCreatingKey,
    setIsImporting,
    setIsDetectingYubiKey,
    refreshAllKeys,
  } = useManageKeysWorkflow();

  const [showPassphraseDialog, setShowPassphraseDialog] = useState(false);

  // Build vault name map for display
  const vaultNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    vaults.forEach(vault => {
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

  const handleImportKey = useCallback(() => {
    setIsImporting(true);
  }, [setIsImporting]);

  const handleDetectYubiKey = useCallback(() => {
    setIsDetectingYubiKey(true);
  }, [setIsDetectingYubiKey]);

  const handlePassphraseCreated = useCallback(async () => {
    setShowPassphraseDialog(false);
    setIsCreatingKey(false);
    await refreshAllKeys();
  }, [refreshAllKeys, setIsCreatingKey]);

  const handleKeyImport = useCallback(async (filePath: string) => {
    try {
      // TODO: Implement actual import when backend command is available
      logger.info('ManageKeysPage', 'Importing key file', { filePath });
      await refreshAllKeys();
    } catch (err) {
      logger.error('ManageKeysPage', 'Failed to import key', err as Error);
      throw err;
    }
  }, [refreshAllKeys]);

  const handleYubiKeyAdd = useCallback(async (yubikey: any) => {
    try {
      // TODO: Implement actual YubiKey addition when backend command is available
      logger.info('ManageKeysPage', 'Adding YubiKey to registry', yubikey);
      await refreshAllKeys();
    } catch (err) {
      logger.error('ManageKeysPage', 'Failed to add YubiKey', err as Error);
      throw err;
    }
  }, [refreshAllKeys]);

  const handleAttachKey = useCallback(async (keyId: string) => {
    if (!currentVault) {
      alert('Please select a vault first');
      return;
    }
    try {
      // TODO: Implement attach key to vault
      logger.info('ManageKeysPage', 'Attaching key to vault', { keyId, vaultId: currentVault.id });
      await refreshKeysForVault(currentVault.id);
      await refreshAllKeys();
    } catch (err) {
      logger.error('ManageKeysPage', 'Failed to attach key', err as Error);
    }
  }, [currentVault, refreshKeysForVault, refreshAllKeys]);

  const handleDeleteKey = useCallback(async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this orphan key? This action cannot be undone.')) {
      return;
    }
    try {
      // TODO: Implement delete orphan key when backend command is available
      logger.info('ManageKeysPage', 'Deleting orphan key', { keyId });
      await refreshAllKeys();
    } catch (err) {
      logger.error('ManageKeysPage', 'Failed to delete key', err as Error);
    }
  }, [refreshAllKeys]);

  const handleExportKey = useCallback(async (keyId: string) => {
    try {
      // TODO: Implement key export when backend command is available
      logger.info('ManageKeysPage', 'Exporting key', { keyId });
    } catch (err) {
      logger.error('ManageKeysPage', 'Failed to export key', err as Error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <UniversalHeader title="Manage Keys" icon={Key} />

      <AppPrimaryContainer>
        {/* Action Bar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3">
            <button
              onClick={handleCreatePassphrase}
              className="
                flex items-center gap-2 px-4 py-2
                text-sm font-medium text-white
                bg-blue-600 rounded-lg
                hover:bg-blue-700 transition-colors
              "
            >
              <Plus className="h-4 w-4" />
              New Passphrase
            </button>
            <button
              onClick={handleImportKey}
              className="
                flex items-center gap-2 px-4 py-2
                text-sm font-medium text-blue-600
                border border-blue-600 rounded-lg
                hover:bg-blue-50 transition-colors
              "
            >
              <Upload className="h-4 w-4" />
              Import .enc
            </button>
            <button
              onClick={handleDetectYubiKey}
              className="
                flex items-center gap-2 px-4 py-2
                text-sm font-medium text-purple-600
                border border-purple-600 rounded-lg
                hover:bg-purple-50 transition-colors
              "
            >
              <Key className="h-4 w-4" />
              Detect YubiKey
            </button>
          </div>

          <div className="flex gap-3 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keys..."
                className="
                  pl-10 pr-4 py-2 w-64
                  text-sm border border-slate-200 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-600
                "
              />
            </div>

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
                  ${keyViewMode === 'cards'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'}
                `}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setKeyViewMode('table')}
                className={`
                  p-2 transition-colors
                  ${keyViewMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'}
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
              allKeys.map(key => {
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

        {isImporting && (
          <div className="mt-6">
            <KeyImportDialog
              onImport={handleKeyImport}
              onClose={() => setIsImporting(false)}
            />
          </div>
        )}

        {isDetectingYubiKey && (
          <div className="mt-6">
            <YubiKeyDetector
              onAddToRegistry={handleYubiKeyAdd}
              onCancel={() => setIsDetectingYubiKey(false)}
            />
          </div>
        )}
      </AppPrimaryContainer>
    </div>
  );
};

export default ManageKeysPage;