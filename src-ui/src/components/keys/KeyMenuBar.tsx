import React, { useMemo } from 'react';
import { CompactPassphraseSlot } from './CompactPassphraseSlot';
import { CompactYubiKeySlot } from './CompactYubiKeySlot';
import { useVault } from '../../contexts/VaultContext';
import { KeyState } from '../../bindings';
import { isPassphraseKey, isYubiKey } from '../../lib/key-types';

interface KeyMenuBarProps {
  onKeySelect?: (keyType: 'passphrase' | 'yubikey', index?: number) => void;
  className?: string;
}

/**
 * Compact horizontal key menu bar that replaces static badges in header
 * Shows 1 passphrase + 3 YubiKey slots in a single row
 */
export const KeyMenuBar: React.FC<KeyMenuBarProps> = ({ onKeySelect, className = '' }) => {
  const { currentVault, vaultKeys, isLoadingKeys } = useVault();

  // Process keys from vault using type guards
  const { passphraseKey, yubiKeys } = useMemo(() => {
    console.log('KeyMenuBar: Processing vaultKeys', vaultKeys);

    const passphrase = vaultKeys.find(isPassphraseKey);
    const yubis = vaultKeys.filter(isYubiKey);

    console.log('KeyMenuBar: Found passphrase key?', !!passphrase, passphrase);
    console.log('KeyMenuBar: Found YubiKeys:', yubis.length);

    return { passphraseKey: passphrase, yubiKeys: yubis };
  }, [vaultKeys]);

  const handlePassphraseClick = () => {
    onKeySelect?.('passphrase');
  };

  const handleYubiKeyClick = (index: number) => {
    onKeySelect?.('yubikey', index);
  };

  // Helper to get YubiKey data for a specific slot
  const getYubiKeyForSlot = (slotIndex: number) => {
    return (
      yubiKeys.find((k) => k.slot_index === slotIndex) || yubiKeys[slotIndex]
    );
  };

  // Map KeyState enum to slot state
  const mapKeyState = (state: KeyState): 'active' | 'registered' | 'orphaned' | 'empty' => {
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

  if (isLoadingKeys) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-pulse flex gap-2">
          <div className="w-24 h-7 bg-slate-200 rounded-full"></div>
          <div className="w-24 h-7 bg-slate-200 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!currentVault) {
    return null; // Don't show key menu when no vault selected
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Passphrase Slot */}
      <CompactPassphraseSlot
        vaultId={currentVault.id}
        onClick={handlePassphraseClick}
        isConfigured={passphraseKey !== undefined}
        label={passphraseKey?.label}
      />

      <span className="text-slate-400 text-xs mx-1">|</span>

      {/* YubiKey Slot 1 */}
      {(() => {
        const yubiKey = getYubiKeyForSlot(0);
        return (
          <CompactYubiKeySlot
            index={0}
            vaultId={currentVault.id}
            onClick={() => handleYubiKeyClick(0)}
            state={yubiKey ? mapKeyState(yubiKey.state) : 'empty'}
            serial={yubiKey?.serial}
            label={yubiKey?.label}
          />
        );
      })()}

      <span className="text-slate-400 text-xs mx-1">|</span>

      {/* YubiKey Slot 2 */}
      {(() => {
        const yubiKey = getYubiKeyForSlot(1);
        return (
          <CompactYubiKeySlot
            index={1}
            vaultId={currentVault.id}
            onClick={() => handleYubiKeyClick(1)}
            state={yubiKey ? mapKeyState(yubiKey.state) : 'empty'}
            serial={yubiKey?.serial}
            label={yubiKey?.label}
          />
        );
      })()}

      <span className="text-slate-400 text-xs mx-1">|</span>

      {/* YubiKey Slot 3 */}
      {(() => {
        const yubiKey = getYubiKeyForSlot(2);
        return (
          <CompactYubiKeySlot
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
  );
};
