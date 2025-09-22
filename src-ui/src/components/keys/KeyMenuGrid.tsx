import React, { useMemo } from 'react';
import { PassphraseSlot } from './PassphraseSlot';
import { YubiKeySlot, YubiKeySlotState } from './YubiKeySlot';
import { useVault } from '../../contexts/VaultContext';
import { Loader2 } from 'lucide-react';
import { KeyState } from '../../bindings';
import { isPassphraseKey, isYubiKey, YubiKeyReference } from '../../lib/key-types';

interface KeyMenuGridProps {
  onKeySelect?: (keyType: 'passphrase' | 'yubikey', index?: number) => void;
  className?: string;
}

/**
 * Unified Key Menu Grid Component
 * Displays a 2x2 grid with 1 passphrase slot and 3 YubiKey slots
 * Part of the new vault-centric architecture replacing protection modes
 */
export const KeyMenuGrid: React.FC<KeyMenuGridProps> = ({ onKeySelect, className = '' }) => {
  const { currentVault, vaultKeys, isLoadingKeys } = useVault();

  // Map KeyState enum to YubiKeySlotState
  const mapKeyState = (state: KeyState): YubiKeySlotState => {
    switch (state) {
      case 'active':
        return 'active';
      case 'registered':
        return 'registered';
      case 'orphaned':
        return 'orphaned';
      default:
        return 'empty';
    }
  };

  // Process keys from vault using type guards
  const { passphraseKey, yubiKeys } = useMemo(() => {
    const passphrase = vaultKeys.find(isPassphraseKey);
    const yubis = vaultKeys.filter(isYubiKey);

    return { passphraseKey: passphrase, yubiKeys: yubis };
  }, [vaultKeys]);

  const handlePassphraseClick = () => {
    onKeySelect?.('passphrase');
  };

  const handleYubiKeyClick = (index: number) => {
    onKeySelect?.('yubikey', index);
  };

  // Helper to get YubiKey data for a specific slot
  const getYubiKeyForSlot = (slotIndex: number): YubiKeyReference | undefined => {
    return (
      yubiKeys.find((k) => k.slot_index === slotIndex) || yubiKeys[slotIndex]
    ); // Fallback to array index if slot_index not set
  };

  if (isLoadingKeys) {
    return (
      <div className={`w-full max-w-2xl flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!currentVault) {
    return (
      <div className={`w-full max-w-2xl ${className}`}>
        <div className="text-center p-8 bg-yellow-50 rounded-lg">
          <p className="text-yellow-800">No vault selected. Please create or select a vault.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-2xl ${className}`}>
      <div className="grid grid-cols-2 gap-4">
        {/* Top Left: Passphrase Slot */}
        <PassphraseSlot
          vaultId={currentVault.id}
          onClick={handlePassphraseClick}
          isConfigured={passphraseKey !== undefined}
        />

        {/* Top Right: YubiKey Slot 1 */}
        {(() => {
          const yubiKey = getYubiKeyForSlot(0);
          return (
            <YubiKeySlot
              index={0}
              vaultId={currentVault.id}
              onClick={() => handleYubiKeyClick(0)}
              state={yubiKey ? mapKeyState(yubiKey.state) : 'empty'}
              serial={yubiKey?.serial}
              label={yubiKey?.label}
            />
          );
        })()}

        {/* Bottom Left: YubiKey Slot 2 */}
        {(() => {
          const yubiKey = getYubiKeyForSlot(1);
          return (
            <YubiKeySlot
              index={1}
              vaultId={currentVault.id}
              onClick={() => handleYubiKeyClick(1)}
              state={yubiKey ? mapKeyState(yubiKey.state) : 'empty'}
              serial={yubiKey?.serial}
              label={yubiKey?.label}
            />
          );
        })()}

        {/* Bottom Right: YubiKey Slot 3 */}
        {(() => {
          const yubiKey = getYubiKeyForSlot(2);
          return (
            <YubiKeySlot
              index={2}
              vaultId={currentVault.id}
              onClick={() => handleYubiKeyClick(2)}
              state={yubiKey ? mapKeyState(yubiKey.state) : 'empty'}
              serial={yubiKey?.serial}
              label={yubiKey?.label}
            />
          );
        })()}
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
