import React, { useMemo } from 'react';
import { CompactPassphraseCard } from './CompactPassphraseCard';
import { CompactYubiKeyCard } from './CompactYubiKeyCard';
import { useVault } from '../../contexts/VaultContext';
import { KeyState, type KeyReference } from '../../bindings';
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
  const { currentVault, getCurrentVaultKeys, keyCache, isLoadingKeys } = useVault();

  // Process keys from cache using type guards (instant, no async wait)
  const { passphraseKey, yubiKeys } = useMemo(() => {
    const currentKeys = getCurrentVaultKeys() as any as KeyReference[];
    console.log('KeyMenuBar: Processing keys from cache', currentKeys);

    const passphrase = currentKeys.find(isPassphraseKey);
    const yubis = currentKeys.filter(isYubiKey);

    console.log('KeyMenuBar: Found passphrase key?', !!passphrase, passphrase);
    console.log('KeyMenuBar: Found YubiKeys:', yubis.length);

    return { passphraseKey: passphrase, yubiKeys: yubis };
  }, [currentVault?.id, keyCache, getCurrentVaultKeys]);

  const handlePassphraseClick = () => {
    onKeySelect?.('passphrase');
  };

  const handleYubiKeyClick = (index: number) => {
    onKeySelect?.('yubikey', index);
  };

  // Helper to get YubiKey data for a specific display position
  const getYubiKeyForPosition = (displayIndex: number) => {
    return yubiKeys[displayIndex];
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
      <CompactPassphraseCard
        vaultId={currentVault.id}
        onClick={handlePassphraseClick}
        isConfigured={passphraseKey !== undefined}
        label={passphraseKey?.label}
      />

      <span className="text-slate-400 text-xs mx-1">|</span>

      {/* YubiKey Slot 1 */}
      {(() => {
        const yubiKey = getYubiKeyForPosition(0);
        return (
          <CompactYubiKeyCard
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
        const yubiKey = getYubiKeyForPosition(1);
        return (
          <CompactYubiKeyCard
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
        const yubiKey = getYubiKeyForPosition(2);
        return (
          <CompactYubiKeyCard
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
