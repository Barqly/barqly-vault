import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus } from 'lucide-react';
import { useVault } from '../contexts/VaultContext';
import { useVaultHubWorkflow } from '../hooks/useVaultHubWorkflow';
import { logger } from '../lib/logger';
import UniversalHeader from '../components/common/UniversalHeader';
import AppPrimaryContainer from '../components/layout/AppPrimaryContainer';
import CollapsibleHelp from '../components/ui/CollapsibleHelp';
import { ErrorMessage } from '../components/ui/error-message';
import DeleteVaultDialog from '../components/vault/DeleteVaultDialog';
import VaultCard from '../components/vault/VaultCard';
import VaultCreateForm from '../components/vault/VaultCreateForm';
import VaultEmptyState from '../components/vault/VaultEmptyState';

/**
 * VaultHub - R2 Phase 3 Redesigned Landing Page
 *
 * Vault-centric interface with:
 * - Visual vault cards with key badges
 * - Inline vault creation (no modal)
 * - Quick actions per vault
 * - Responsive grid layout
 * - Cache-first architecture for instant updates
 */
const VaultHub: React.FC = () => {
  const navigate = useNavigate();
  const { keyCache, refreshKeysForVault, getVaultStatistics } = useVault();
  const {
    // Form state
    name,
    description,
    isSubmitting,
    error,
    isCreatingVault,

    // Vault data
    vaults,
    currentVault,
    isLoading,

    // Deletion state
    vaultToDelete,

    // Form setters
    setName,
    setDescription,

    // Handlers
    handleSubmit,
    handleClear,
    clearError,
    handleVaultSelect,
    handleDeleteVault,
    prepareDeleteVault,
    cancelDeleteVault,
    toggleCreateForm,
    refreshVaults,
  } = useVaultHubWorkflow();

  // Load vaults on mount
  useEffect(() => {
    refreshVaults();
  }, []);

  // Refresh keys for all vaults periodically to ensure cache is fresh
  useEffect(() => {
    const refreshAllKeys = async () => {
      for (const vault of vaults) {
        try {
          await refreshKeysForVault(vault.id);
        } catch (error) {
          logger.error('VaultHub', `Failed to refresh keys for vault ${vault.id}`, error as Error);
        }
      }
    };

    if (vaults.length > 0) {
      refreshAllKeys();
    }
  }, [vaults.length]);

  // Handle quick encrypt action
  const handleQuickEncrypt = (vaultId: string) => {
    handleVaultSelect(vaultId);
    navigate('/encrypt');
  };

  // Handle manage keys action
  const handleManageKeys = (vaultId: string) => {
    handleVaultSelect(vaultId);
    navigate('/manage-keys');
  };

  // Handle delete click
  const handleDeleteClick = (vaultId: string, vaultName: string) => {
    prepareDeleteVault(vaultId, vaultName);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async (vaultId: string) => {
    try {
      await handleDeleteVault(vaultId);
      // Refresh vaults after deletion
      await refreshVaults();
    } catch (error) {
      logger.error('VaultHub', 'Failed to delete vault', error as Error);
      // Error handling is done in the workflow hook
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Unified App Header */}
      <UniversalHeader
        title={currentVault ? currentVault.name : "Create New Vault"}
        icon={Shield}
        description="Manage your encrypted vaults"
        skipNavTarget="#main-content"
      />

      {/* Main content */}
      <AppPrimaryContainer id="main-content">
        <div className="space-y-6">
          {/* Error display */}
          {error && (
            <ErrorMessage error={error} showRecoveryGuidance={false} onClose={clearError} />
          )}

          {/* Inline Create Form or Create Button */}
          {isCreatingVault ? (
            <VaultCreateForm
              name={name}
              description={description}
              isSubmitting={isSubmitting}
              error={error}
              onNameChange={setName}
              onDescriptionChange={setDescription}
              onSubmit={handleSubmit}
              onCancel={toggleCreateForm}
              onClear={handleClear}
            />
          ) : (
            <button
              onClick={toggleCreateForm}
              className="w-full p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center justify-center gap-3">
                <Plus className="h-6 w-6 text-slate-400 group-hover:text-blue-600" />
                <span className="text-base font-medium text-slate-600 group-hover:text-blue-600">
                  Create New Vault
                </span>
              </div>
            </button>
          )}

          {/* Vaults Display */}
          {isLoading && vaults.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <div className="inline-flex items-center gap-2 text-slate-600">
                <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                Loading vaults...
              </div>
            </div>
          ) : vaults.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200">
              <VaultEmptyState onCreateClick={toggleCreateForm} />
            </div>
          ) : (
            <>
              {/* Vault Grid - Responsive 1-3 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {vaults.map((vault) => {
                  const isActive = vault.id === currentVault?.id;
                  // Get keys from cache for this vault (instant, no async)
                  const keys = keyCache.get(vault.id) || [];
                  // Get statistics from cache for this vault (instant, no async)
                  const statistics = getVaultStatistics(vault.id);

                  return (
                    <VaultCard
                      key={vault.id}
                      vault={vault}
                      keys={keys}
                      statistics={statistics}
                      isActive={isActive}
                      onSelect={() => handleVaultSelect(vault.id)}
                      onEncrypt={() => handleQuickEncrypt(vault.id)}
                      onManageKeys={() => handleManageKeys(vault.id)}
                      onDelete={() => handleDeleteClick(vault.id, vault.name)}
                    />
                  );
                })}
              </div>
            </>
          )}

          {/* Help section */}
          <CollapsibleHelp triggerText="Understanding Vaults" context="vault-management" />
        </div>
      </AppPrimaryContainer>

      {/* Delete Vault Dialog */}
      {vaultToDelete && (
        <DeleteVaultDialog
          isOpen={!!vaultToDelete}
          vaultName={vaultToDelete.name}
          vaultId={vaultToDelete.id}
          onConfirm={handleDeleteConfirm}
          onCancel={cancelDeleteVault}
        />
      )}
    </div>
  );
};

export default VaultHub;
