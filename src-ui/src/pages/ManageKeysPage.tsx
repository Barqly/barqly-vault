import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Plus, Lock, Unlock, Info } from 'lucide-react';
import { VaultSelector } from '../components/vault/VaultSelector';
import { CreateVaultDialog } from '../components/vault/CreateVaultDialog';
import { PassphraseKeyDialog } from '../components/keys/PassphraseKeyDialog';
import { YubiKeySetupDialog } from '../components/keys/YubiKeySetupDialog';
import { useVault } from '../contexts/VaultContext';
import UniversalHeader from '../components/common/UniversalHeader';
import { LoadingSpinner } from '../components/ui/loading-spinner';
import { ErrorMessage } from '../components/ui/error-message';
import AppPrimaryContainer from '../components/layout/AppPrimaryContainer';

/**
 * Manage Keys Page - For managing encryption keys within the current vault
 * Users can add passphrase keys or YubiKeys to the selected vault
 */
const ManageKeysPage: React.FC = () => {
  const navigate = useNavigate();
  const { vaults, currentVault, vaultKeys, isLoading, error, refreshVaults } = useVault();
  const [showCreateVault, setShowCreateVault] = useState(false);
  const [showPassphraseDialog, setShowPassphraseDialog] = useState(false);
  const [showYubiKeyDialog, setShowYubiKeyDialog] = useState(false);
  const [selectedYubiKeyIndex, setSelectedYubiKeyIndex] = useState<number>(0);

  useEffect(() => {
    refreshVaults();
  }, []);

  const handleVaultCreated = async () => {
    setShowCreateVault(false);
    await refreshVaults();
  };

  const handleNavigateToEncrypt = () => {
    navigate('/encrypt');
  };

  const handleNavigateToDecrypt = () => {
    navigate('/decrypt');
  };

  const handleKeySelect = (keyType: 'passphrase' | 'yubikey', index?: number) => {
    if (keyType === 'passphrase') {
      setShowPassphraseDialog(true);
    } else if (keyType === 'yubikey' && index !== undefined) {
      setSelectedYubiKeyIndex(index);
      setShowYubiKeyDialog(true);
    }
  };

  if (isLoading && !currentVault) {
    return (
      <AppPrimaryContainer>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" showText text="Loading vaults..." />
        </div>
      </AppPrimaryContainer>
    );
  }

  return (
    <AppPrimaryContainer>
      <UniversalHeader title="Vault Setup" icon={Shield} onKeySelect={handleKeySelect} />

      {error && (
        <div className="mb-6">
          <ErrorMessage error={error} />
        </div>
      )}

      <div className="space-y-8">
        {/* Vault Selection Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              Select Vault
            </h2>
            <button
              onClick={() => setShowCreateVault(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Vault
            </button>
          </div>

          {vaults.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Vaults Yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first vault to start protecting your data
              </p>
              <button
                onClick={() => setShowCreateVault(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Vault
              </button>
            </div>
          ) : (
            <VaultSelector onCreateVault={() => setShowCreateVault(true)} />
          )}
        </div>

        {/* Key Instructions Section - Replaces large grid */}
        {currentVault && (
          <div className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-start gap-4">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Managing Keys</h3>
                <p className="text-sm text-slate-600">
                  Use the key menu in the header above to add or manage encryption keys for{' '}
                  <strong>{currentVault.name}</strong>. You can configure one passphrase and up to
                  three YubiKeys per vault.
                </p>
                {vaultKeys.length === 0 && (
                  <p className="text-sm text-amber-700 mt-2">
                    ⚠️ Add at least one key before you can encrypt files.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {currentVault && vaultKeys.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ready to Use Your Vault</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleNavigateToEncrypt}
                className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <Lock className="h-8 w-8 text-blue-600 mb-2" />
                <h4 className="font-medium text-gray-900">Encrypt Files</h4>
                <p className="text-sm text-gray-600">Protect your sensitive data</p>
              </button>

              <button
                onClick={handleNavigateToDecrypt}
                className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <Unlock className="h-8 w-8 text-green-600 mb-2" />
                <h4 className="font-medium text-gray-900">Decrypt Files</h4>
                <p className="text-sm text-gray-600">Restore your protected data</p>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateVaultDialog
        isOpen={showCreateVault}
        onClose={() => setShowCreateVault(false)}
        onSuccess={handleVaultCreated}
      />

      {currentVault && (
        <>
          <PassphraseKeyDialog
            isOpen={showPassphraseDialog}
            onClose={() => setShowPassphraseDialog(false)}
            onSuccess={() => {
              setShowPassphraseDialog(false);
              refreshVaults();
            }}
          />

          <YubiKeySetupDialog
            isOpen={showYubiKeyDialog}
            onClose={() => setShowYubiKeyDialog(false)}
            slotIndex={selectedYubiKeyIndex}
            onSuccess={() => {
              setShowYubiKeyDialog(false);
              refreshVaults();
            }}
          />
        </>
      )}
    </AppPrimaryContainer>
  );
};

export default ManageKeysPage;
