import React, { useState, useEffect } from 'react';
import { Plus, Vault, Trash2, Settings, Key, Shield, AlertCircle } from 'lucide-react';
import { useVault } from '../contexts/VaultContext';
import { CreateVaultDialog } from '../components/vault/CreateVaultDialog';
import { logger } from '../lib/logger';

/**
 * VaultHub - Main landing page for managing vaults
 *
 * This is the primary interface where users:
 * - Create new vaults
 * - Select active vault
 * - Delete vaults
 * - View vault details and status
 */
const VaultHub: React.FC = () => {
  const { vaults, currentVault, setCurrentVault, refreshVaults, vaultKeys } = useVault();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    refreshVaults();
  }, []);

  const handleVaultSelect = (vaultId: string) => {
    setCurrentVault(vaultId);
  };

  const handleDeleteVault = async (vaultId: string) => {
    if (!confirm('Are you sure you want to delete this vault? This action cannot be undone.')) {
      return;
    }

    try {
      // TODO: Implement vault deletion
      logger.warn('VaultHub', 'Vault deletion not yet implemented', { vaultId });
      alert('Vault deletion will be available in the next update');
    } catch (error) {
      logger.error('VaultHub', 'Failed to delete vault', error as Error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Shield className="h-8 w-8 text-blue-600" />
          Vault Hub
        </h1>
        <p className="text-gray-600">
          Manage your encrypted vaults. Each vault can have multiple keys for secure access.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Vault-Centric Architecture</p>
            <p>
              Vaults are your primary containers for encrypted data. You can attach multiple keys
              (passphrase or YubiKey) to each vault, allowing flexible access control and backup
              options.
            </p>
          </div>
        </div>
      </div>

      {/* Create New Vault Button */}
      <div className="mb-8">
        <button
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Create New Vault
        </button>
      </div>

      {/* Vaults Grid */}
      {vaults.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <Vault className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Vaults Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first vault to start encrypting and protecting your data
          </p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create First Vault
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vaults.map((vault) => {
            const isSelected = vault.id === currentVault?.id;
            // Since vault is selected, we can check the keys from vaultKeys context
            const keyCount = isSelected ? vaultKeys?.length || 0 : 0;
            const hasPassphrase =
              isSelected && vaultKeys?.some((k) => k.key_type?.type === 'passphrase');
            const hasYubikey = isSelected && vaultKeys?.some((k) => k.key_type?.type === 'yubikey');

            return (
              <div
                key={vault.id}
                className={`border rounded-lg p-6 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                }`}
                onClick={() => handleVaultSelect(vault.id)}
              >
                {/* Vault Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Vault
                      className={`h-8 w-8 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{vault.name}</h3>
                      {isSelected && (
                        <span className="text-xs text-blue-600 font-medium">Active</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVault(vault.id);
                    }}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    aria-label="Delete vault"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Vault Details */}
                {vault.description && (
                  <p className="text-sm text-gray-600 mb-3">{vault.description}</p>
                )}

                {/* Key Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Keys:</span>
                    <span className="font-medium text-gray-700">{keyCount}</span>
                  </div>

                  {keyCount > 0 && (
                    <div className="flex gap-2">
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
                    </div>
                  )}
                </div>

                {/* Vault Actions */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Navigate to manage keys for this vault
                      handleVaultSelect(vault.id);
                      // TODO: Navigate to ManageKeys page
                    }}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Manage Keys
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Vault Dialog */}
      <CreateVaultDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          setShowCreateDialog(false);
          refreshVaults();
        }}
      />
    </div>
  );
};

export default VaultHub;
