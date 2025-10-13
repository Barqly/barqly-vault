import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
 * Context-aware: interactive on Manage Keys page, visual-only on other pages
 */
export const KeyMenuBar: React.FC<KeyMenuBarProps> = ({ onKeySelect, className = '' }) => {
  const { currentVault, getCurrentVaultKeys, keyCache } = useVault();
  const location = useLocation();

  // Determine if we're on the Manage Keys page for interactive behavior
  const isManageKeysPage = location.pathname === '/keys';

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

  // Only allow click handlers on the Manage Keys page
  const handlePassphraseClick = () => {
    if (isManageKeysPage) {
      onKeySelect?.('passphrase');
    }
  };

  const handleYubiKeyClick = (index: number) => {
    if (isManageKeysPage) {
      onKeySelect?.('yubikey', index);
    }
  };

  // Helper to get YubiKey data for a specific display position
  const getYubiKeyForPosition = (displayIndex: number) => {
    return yubiKeys[displayIndex];
  };

  // Map NIST KeyLifecycleStatus to slot state for UI display
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
      {/* Passphrase Slot - fixed width */}
      <CompactPassphraseCard
        vaultId={currentVault.id}
        onClick={handlePassphraseClick}
        isConfigured={passphraseKey !== undefined}
        label={passphraseKey?.label}
        isInteractive={isManageKeysPage}
      />

      <span className="text-slate-400 text-xs mx-1">|</span>

      {/* YubiKey Slot 1 - fixed width */}
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
            isInteractive={isManageKeysPage}
          />
        );
      })()}

      <span className="text-slate-400 text-xs mx-1">|</span>

      {/* YubiKey Slot 2 - fixed width */}
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
            isInteractive={isManageKeysPage}
          />
        );
      })()}

      <span className="text-slate-400 text-xs mx-1">|</span>

      {/* YubiKey Slot 3 - fixed width */}
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
            isInteractive={isManageKeysPage}
          />
        );
      })()}
    </div>
  );
};
