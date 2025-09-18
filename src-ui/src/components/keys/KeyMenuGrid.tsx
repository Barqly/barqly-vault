import React from 'react';
import { PassphraseSlot } from './PassphraseSlot';
import { YubiKeySlot } from './YubiKeySlot';

interface KeyMenuGridProps {
  vaultId?: string; // TODO: Backend engineer needs to implement vault-centric data model
  onKeySelect?: (keyType: 'passphrase' | 'yubikey', index?: number) => void;
  className?: string;
}

/**
 * Unified Key Menu Grid Component
 * Displays a 2x2 grid with 1 passphrase slot and 3 YubiKey slots
 * Part of the new vault-centric architecture replacing protection modes
 */
export const KeyMenuGrid: React.FC<KeyMenuGridProps> = ({
  vaultId,
  onKeySelect,
  className = '',
}) => {
  // TODO: Backend engineer needs to provide API to fetch vault keys
  // Expected API: getVaultKeys(vaultId) returning key references

  const handlePassphraseClick = () => {
    onKeySelect?.('passphrase');
  };

  const handleYubiKeyClick = (index: number) => {
    onKeySelect?.('yubikey', index);
  };

  return (
    <div className={`w-full max-w-2xl ${className}`}>
      <div className="grid grid-cols-2 gap-4">
        {/* Top Left: Passphrase Slot */}
        <PassphraseSlot
          vaultId={vaultId}
          onClick={handlePassphraseClick}
          isConfigured={false} // TODO: Get from vault key state
        />

        {/* Top Right: YubiKey Slot 1 */}
        <YubiKeySlot
          index={0}
          vaultId={vaultId}
          onClick={() => handleYubiKeyClick(0)}
          state="empty" // TODO: Get from vault key state
        />

        {/* Bottom Left: YubiKey Slot 2 */}
        <YubiKeySlot
          index={1}
          vaultId={vaultId}
          onClick={() => handleYubiKeyClick(1)}
          state="empty" // TODO: Get from vault key state
        />

        {/* Bottom Right: YubiKey Slot 3 */}
        <YubiKeySlot
          index={2}
          vaultId={vaultId}
          onClick={() => handleYubiKeyClick(2)}
          state="empty" // TODO: Get from vault key state
        />
      </div>

      {/* Visual Key Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Key Status</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-gray-600">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-600">Registered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
            <span className="text-gray-600">Empty</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-gray-600">Needs Attention</span>
          </div>
        </div>
      </div>
    </div>
  );
};
