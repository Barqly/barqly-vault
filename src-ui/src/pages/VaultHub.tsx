import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Vault, Trash2, Settings, Key, Shield, RotateCw } from 'lucide-react';
import { useVault } from '../contexts/VaultContext';
import { useVaultHubWorkflow } from '../hooks/useVaultHubWorkflow';
import { logger } from '../lib/logger';
import { isPassphraseKey, isYubiKey } from '../lib/key-types';
import { commands } from '../bindings';
import UniversalHeader from '../components/common/UniversalHeader';
import AppPrimaryContainer from '../components/layout/AppPrimaryContainer';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import { ErrorMessage } from '../components/ui/error-message';
import DeleteVaultDialog from '../components/vault/DeleteVaultDialog';

/**
 * VaultHub - Main landing page for managing vaults
 *
 * This is the primary interface where users:
 * - Create new vaults (inline form)
 * - Select active vault
 * - Delete vaults
 * - View vault details and status
 *
 * Refactored to match EncryptPage/DecryptPage architecture:
 * - UniversalHeader for consistency
 * - AppPrimaryContainer for layout
 * - useVaultHubWorkflow for centralized state
 * - CollapsibleHelp for educational content
 * - Inline form instead of modal dialog
 */
const VaultHub: React.FC = () => {
  const navigate = useNavigate();
  const { currentVault, setCurrentVault, keyCache } = useVault();
  const {
    // Form state
    name,
    description,
    isSubmitting,
    error,

    // Vault data
    vaults,
    isLoading,

    // Form setters
    setName,
    setDescription,

    // Handlers
    handleSubmit,
    handleClear,
    clearError,
    refreshVaults,
  } = useVaultHubWorkflow();

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [vaultToDelete, setVaultToDelete] = useState<{ id: string; name: string } | null>(null);

  // Flip card state - tracks which vaults are flipped (allow multiple)
  const [flippedVaults, setFlippedVaults] = useState<Set<string>>(new Set());

  useEffect(() => {
    refreshVaults();
  }, []);

  const handleFlipCard = (vaultId: string) => {
    setFlippedVaults((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(vaultId)) {
        newSet.delete(vaultId); // Unflip if already flipped
      } else {
        newSet.add(vaultId); // Flip if not flipped
      }
      return newSet;
    });
  };

  const handleVaultSelect = (vaultId: string) => {
    setCurrentVault(vaultId);
  };

  const handleManageKeys = (vaultId: string) => {
    // Set the vault as current, then navigate to manage keys
    setCurrentVault(vaultId);
    navigate('/manage-keys');
  };

  const handleDeleteClick = (vaultId: string, vaultName: string) => {
    setVaultToDelete({ id: vaultId, name: vaultName });
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async (vaultId: string) => {
    try {
      logger.info('VaultHub', 'Deleting vault', { vaultId });

      const result = await commands.deleteVault({ vault_id: vaultId, force: true });

      if (result.status === 'error') {
        throw new Error(result.error.message || 'Failed to delete vault');
      }

      logger.info('VaultHub', 'Vault deleted successfully', { vaultId });

      // Close dialog
      setShowDeleteDialog(false);
      setVaultToDelete(null);

      // Refresh vaults list
      await refreshVaults();
    } catch (error) {
      logger.error('VaultHub', 'Failed to delete vault', error as Error);
      throw error; // Let dialog handle the error state
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setVaultToDelete(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Unified App Header */}
      <UniversalHeader title="Vault Hub" icon={Shield} skipNavTarget="#main-content" />

      {/* Main content */}
      <AppPrimaryContainer id="main-content">
        <div className="mt-6 space-y-6">
          {/* Error display */}
          {error && (
            <ErrorMessage error={error} showRecoveryGuidance={false} onClose={clearError} />
          )}

          {/* Inline Create Vault Form */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="vault-name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Vault Name *
                </label>
                <input
                  id="vault-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="e.g., Personal Documents"
                  autoFocus
                />
                {name.length >= 50 && (
                  <p className="text-xs text-red-600 mt-1">Maximum 50 characters</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="vault-description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description (optional)
                </label>
                <input
                  id="vault-description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={70}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                  placeholder="Brief description of what this vault is for..."
                />
                {description.length >= 70 && (
                  <p className="text-xs text-red-600 mt-1">Maximum 70 characters</p>
                )}
              </div>

              {/* Buttons: Clear (left) / Create Vault (right) */}
              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Vault'}
                </button>
              </div>
            </form>
          </div>

          {/* Vaults Grid */}
          {isLoading && vaults.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <p className="text-gray-600">Loading vaults...</p>
            </div>
          ) : vaults.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-12 text-center">
              <Vault className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No Vaults Yet</h3>
              <p className="text-gray-600">
                Create your first vault using the form above to start encrypting and protecting your
                data
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vaults.map((vault) => {
                const isSelected = vault.id === currentVault?.id;
                const isFlipped = flippedVaults.has(vault.id);
                // Use key_count from VaultSummary (sync, no async call needed)
                const keyCount = vault.key_count;
                // Use cached keys for badge display (instant, no flickering)
                const cachedKeys = keyCache.get(vault.id) || [];
                const hasPassphrase = cachedKeys.some(isPassphraseKey);
                const hasYubikey = cachedKeys.some(isYubiKey);

                // Shared header component (used on both front and back)
                const cardHeader = (
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Vault
                        className={`h-8 w-8 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}
                      />
                      <h3 className="text-lg font-semibold text-gray-900">{vault.name}</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVaultSelect(vault.id);
                          handleFlipCard(vault.id);
                        }}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        aria-label="Flip card"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(vault.id, vault.name);
                        }}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        aria-label="Delete vault"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );

                // Shared footer component (used on both front and back)
                const cardFooter = (
                  <div
                    className={`mt-3 pt-3 border-t ${
                      isSelected ? 'border-blue-200' : 'border-gray-100'
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleManageKeys(vault.id);
                      }}
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      {keyCount === 0 ? 'Add Keys' : 'Manage Keys'}
                    </button>
                  </div>
                );

                return (
                  <div key={vault.id} className="perspective-1000">
                    <div
                      className={`relative preserve-3d transition-transform duration-500 ${
                        isFlipped ? 'rotate-y-180' : ''
                      }`}
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      {/* FRONT FACE */}
                      <div
                        className={`backface-hidden border rounded-lg p-6 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-lg'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                        }`}
                        onClick={() => handleVaultSelect(vault.id)}
                      >
                        {cardHeader}

                        {/* Key Status */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Keys:</span>
                            <span className="font-medium text-gray-700">{keyCount}</span>
                          </div>

                          {/* Fixed height badge container for symmetric card layout */}
                          <div className="flex gap-2 min-h-[28px]">
                            {keyCount > 0 && (
                              <>
                                {hasPassphrase && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                    <Key className="h-3 w-3" />
                                    Passphrase
                                  </div>
                                )}
                                {hasYubikey && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                    <Shield className="h-3 w-3" />
                                    YubiKey
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {cardFooter}
                      </div>

                      {/* BACK FACE */}
                      <div
                        className={`absolute inset-0 backface-hidden rotate-y-180 border rounded-lg p-6 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-lg'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                        }`}
                        style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                        onClick={() => handleVaultSelect(vault.id)}
                      >
                        {cardHeader}

                        {/* Description (Read-Only) */}
                        <div className="mb-0">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Description:</h4>
                          <div className="min-h-[32px] max-h-[32px] overflow-y-auto text-sm text-gray-600 leading-tight">
                            {vault.description ? (
                              <p className="m-0 p-0">{vault.description}</p>
                            ) : (
                              <p className="text-gray-400 italic m-0 p-0">No description provided</p>
                            )}
                          </div>
                        </div>

                        {cardFooter}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Help section */}
          <CollapsibleHelp triggerText="How Vault Hub Works" context="vault-hub" />
        </div>
      </AppPrimaryContainer>

      {/* Delete Vault Dialog */}
      {vaultToDelete && (
        <DeleteVaultDialog
          isOpen={showDeleteDialog}
          vaultName={vaultToDelete.name}
          vaultId={vaultToDelete.id}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
};

export default VaultHub;
