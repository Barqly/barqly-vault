import React, { useState } from 'react';
import { KeyMenuGrid } from '../components/keys/KeyMenuGrid';
import { VaultSelector } from '../components/vault/VaultSelector';
import { CreateVaultDialog } from '../components/vault/CreateVaultDialog';
import { PassphraseKeyDialog } from '../components/keys/PassphraseKeyDialog';
import { YubiKeySetupDialog } from '../components/keys/YubiKeySetupDialog';
import { VaultProvider, useVault } from '../contexts/VaultContext';
import { Shield } from 'lucide-react';

/**
 * Example page demonstrating the Unified Key Menu Grid with Vault Management
 * This replaces the old protection mode selection UI
 */
const KeyMenuContent: React.FC = () => {
  const { refreshKeys } = useVault();
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [showCreateVault, setShowCreateVault] = useState(false);
  const [showPassphraseDialog, setShowPassphraseDialog] = useState(false);
  const [showYubiKeyDialog, setShowYubiKeyDialog] = useState(false);
  const [yubiKeySlotIndex, setYubiKeySlotIndex] = useState(0);

  const handleKeySelect = (keyType: 'passphrase' | 'yubikey', index?: number) => {
    const keyId = keyType === 'yubikey' ? `${keyType}-${index}` : keyType;
    setSelectedKey(keyId);

    // Open appropriate dialog based on key type
    if (keyType === 'passphrase') {
      setShowPassphraseDialog(true);
    } else if (keyType === 'yubikey' && index !== undefined) {
      setYubiKeySlotIndex(index);
      setShowYubiKeyDialog(true);
    }

    console.log(`Selected key: ${keyId}`);
  };

  const handleKeyCreated = () => {
    // Refresh the keys to show the new one
    refreshKeys();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header with Vault Selector */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Vault Key Management</h1>
          <p className="text-gray-600 mt-2">Configure your vault keys for secure encryption</p>

          {/* Vault Selector */}
          <div className="flex justify-center mt-6">
            <VaultSelector onCreateVault={() => setShowCreateVault(true)} />
          </div>
        </div>

        {/* Key Menu Grid */}
        <div className="flex justify-center">
          <KeyMenuGrid onKeySelect={handleKeySelect} />
        </div>

        {/* Dialogs */}
        <CreateVaultDialog
          isOpen={showCreateVault}
          onClose={() => setShowCreateVault(false)}
          onSuccess={() => setShowCreateVault(false)}
        />

        <PassphraseKeyDialog
          isOpen={showPassphraseDialog}
          onClose={() => setShowPassphraseDialog(false)}
          onSuccess={handleKeyCreated}
        />

        <YubiKeySetupDialog
          isOpen={showYubiKeyDialog}
          onClose={() => setShowYubiKeyDialog(false)}
          onSuccess={handleKeyCreated}
          slotIndex={yubiKeySlotIndex}
        />

        {/* Selected Key Info (for demo) */}
        {selectedKey && (
          <div className="mt-8 p-4 bg-blue-50 rounded-lg max-w-2xl mx-auto">
            <p className="text-sm text-blue-800">
              Selected: <strong>{selectedKey}</strong>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              In a real implementation, this would open the appropriate setup dialog
            </p>
          </div>
        )}

        {/* Migration Note */}
        <div className="mt-12 p-6 bg-yellow-50 border border-yellow-200 rounded-lg max-w-2xl mx-auto">
          <h3 className="font-semibold text-yellow-900 mb-2">Migration from Protection Mode</h3>
          <p className="text-sm text-yellow-800">
            This new UI replaces the old "Protection Mode" selector. All keys are now managed at the
            vault level with support for:
          </p>
          <ul className="list-disc list-inside text-sm text-yellow-700 mt-2 space-y-1">
            <li>1 Passphrase key per vault</li>
            <li>Up to 3 YubiKey devices per vault</li>
            <li>Visual status indicators for each key</li>
            <li>Recovery support for orphaned keys</li>
          </ul>
        </div>

        {/* Implementation Status */}
        <div className="mt-8 p-6 bg-gray-100 rounded-lg max-w-2xl mx-auto">
          <h3 className="font-semibold text-gray-900 mb-3">Implementation Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              <span>Frontend components created</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              <span>Visual design implemented</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              <span>Backend vault APIs integrated</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              <span>Vault context and state management</span>
            </div>
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              <span>Key state visualization working</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Ready for testing! Try creating a vault and adding keys.
          </p>
        </div>
      </div>
    </div>
  );
};

// Main component wrapped with VaultProvider
export const KeyMenuExample: React.FC = () => {
  return (
    <VaultProvider>
      <KeyMenuContent />
    </VaultProvider>
  );
};
