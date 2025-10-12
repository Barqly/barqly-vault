import React, { useMemo } from 'react';
import { CompactPassphraseCard } from './CompactPassphraseCard';
import { CompactYubiKeyCard } from './CompactYubiKeyCard';
import { useVault } from '../../contexts/VaultContext';
import { KeyLifecycleStatus, type KeyReference } from '../../bindings';
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
  const { currentVault, getCurrentVaultKeys, keyCache } = useVault();

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

  // Map KeyLifecycleStatus to slot state for UI display
  const mapKeyLifecycleStatus = (
    status: KeyLifecycleStatus,
  ): 'active' | 'registered' | 'orphaned' | 'empty' => {
    switch (status) {
      case 'active':
        return 'active';
      case 'pre_activation':
        return 'registered'; // New keys ready to use
      case 'suspended':
        return 'orphaned'; // Temporarily disabled keys
      case 'deactivated':
      case 'destroyed':
      case 'compromised':
        return 'orphaned'; // Keys that can't be used
      default:
        return 'empty';
    }
  };

  // CACHE-FIRST: Never show loading skeleton during navigation
  // The cache already has the data - show it immediately!
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
            state={yubiKey ? mapKeyLifecycleStatus(yubiKey.lifecycle_status) : 'empty'}
            serial={yubiKey?.type === 'YubiKey' ? yubiKey.data.serial : undefined}
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
            state={yubiKey ? mapKeyLifecycleStatus(yubiKey.lifecycle_status) : 'empty'}
            serial={yubiKey?.type === 'YubiKey' ? yubiKey.data.serial : undefined}
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
            state={yubiKey ? mapKeyLifecycleStatus(yubiKey.lifecycle_status) : 'empty'}
            serial={yubiKey?.type === 'YubiKey' ? yubiKey.data.serial : undefined}
            label={yubiKey?.label}
          />
        );
      })()}
    </div>
  );
};
