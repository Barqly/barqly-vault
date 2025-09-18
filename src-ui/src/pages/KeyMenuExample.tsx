import React, { useState } from 'react';
import { KeyMenuGrid } from '../components/keys/KeyMenuGrid';
import { Shield } from 'lucide-react';

/**
 * Example page demonstrating the Unified Key Menu Grid
 * This replaces the old protection mode selection UI
 */
export const KeyMenuExample: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<string>('');

  const handleKeySelect = (keyType: 'passphrase' | 'yubikey', index?: number) => {
    const keyId = keyType === 'yubikey' ? `${keyType}-${index}` : keyType;
    setSelectedKey(keyId);

    // TODO: Backend engineer needs to implement key setup flow
    // This would trigger the appropriate setup modal:
    // - PassphraseSetup for passphrase
    // - YubiKeyStreamlined for yubikey
    console.log(`Selected key: ${keyId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Vault Key Management</h1>
          <p className="text-gray-600 mt-2">Configure your vault keys for secure encryption</p>
        </div>

        {/* Key Menu Grid */}
        <div className="flex justify-center">
          <KeyMenuGrid
            vaultId="example-vault-id" // TODO: Get from vault context
            onKeySelect={handleKeySelect}
          />
        </div>

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
              <span className="text-yellow-600 mr-2">⏳</span>
              <span>Awaiting backend vault APIs</span>
            </div>
            <div className="flex items-center">
              <span className="text-yellow-600 mr-2">⏳</span>
              <span>Awaiting key state management</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            See /docs/engineering/frontend-backend-api-requirements.md for backend requirements
          </p>
        </div>
      </div>
    </div>
  );
};
