import React, { useMemo } from 'react';

import { useLocation } from 'react-router-dom';
import { CompactPassphraseCard } from './CompactPassphraseCard';
import { CompactYubiKeyCard } from './CompactYubiKeyCard';
import { useVault } from '../../contexts/VaultContext';
import { KeyLifecycleStatus, type VaultKey } from '../../bindings';
import { isPassphraseKey, isYubiKey } from '../../lib/key-types';

interface KeyMenuBarProps {
  /** Optional vault ID - if provided, shows keys for this specific vault. If null, shows empty placeholders. */
  vaultId?: string | null;
  onKeySelect?: (keyType: 'passphrase' | 'yubikey', index?: number) => void;
  className?: string;
}

/**
 * Compact horizontal key menu bar that replaces static badges in header
 * Shows up to 4 keys in any combination (2-4 keys: Passphrase, YubiKey, or mixed)
 * Keys are displayed with YubiKeys first, then Passphrase keys, sorted alphabetically within each type
 * Context-aware: interactive on Manage Keys page, visual-only on other pages
 * Vault-aware: Shows empty placeholders when vaultId is null (smooth UX for Encrypt/Decrypt workflows)
 */
export const KeyMenuBar: React.FC<KeyMenuBarProps> = ({ vaultId, onKeySelect, className = '' }) => {
  const { currentVault, keyCache } = useVault();
  const location = useLocation();

  // Determine if we're on the Manage Keys page for interactive behavior
  const isManageKeysPage = location.pathname === '/keys';

  // Determine which vault to show keys for:
  // 1. If vaultId prop is explicitly provided (including null), use it
  // 2. Otherwise, fall back to currentVault from context (for Manage Keys page)
  const targetVaultId = vaultId !== undefined ? vaultId : currentVault?.id;

  // Process and sort keys from cache (instant, no async wait)
  const sortedKeys = useMemo(() => {
    // If no vault ID, return empty array (will show placeholders)
    if (!targetVaultId) {
      return [];
    }

    const currentKeys = (keyCache.get(targetVaultId) || []) as VaultKey[];
    console.log('KeyMenuBar: Processing keys from cache', {
      keyCount: currentKeys.length,
      keys: currentKeys.map((k) => ({ type: k.type, label: k.label })),
    });

    // Separate keys by type
    const yubiKeys = currentKeys.filter(isYubiKey);
    const passphraseKeys = currentKeys.filter(isPassphraseKey);

    // Sort each type alphabetically by label
    yubiKeys.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
    passphraseKeys.sort((a, b) => (a.label || '').localeCompare(b.label || ''));

    // Combine: YubiKeys first, then Passphrase keys
    const sorted = [...yubiKeys, ...passphraseKeys];

    console.log('KeyMenuBar: Sorted keys:', {
      yubiKeyCount: yubiKeys.length,
      passphraseCount: passphraseKeys.length,
      totalSorted: sorted.length,
      order: sorted.map((k) => `${k.type}: ${k.label}`),
    });

    return sorted;
  }, [targetVaultId, keyCache]);

  // Generic click handler for any key slot
  const handleKeyClick = (slotIndex: number) => {
    if (!isManageKeysPage) return;

    const key = sortedKeys[slotIndex];
    if (!key) {
      // Empty slot clicked - default to passphrase for "Add" functionality
      onKeySelect?.('passphrase');
    } else if (isPassphraseKey(key)) {
      onKeySelect?.('passphrase');
    } else if (isYubiKey(key)) {
      // For YubiKeys, we need to find its position among YubiKeys only
      const yubiKeys = sortedKeys.filter(isYubiKey);
      const yubiIndex = yubiKeys.findIndex((k) => k.id === key.id);
      onKeySelect?.('yubikey', yubiIndex);
    }
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

  // ALWAYS render the key menu bar (even with empty placeholders)
  // This provides smooth, non-jumpy UX during Encrypt/Decrypt workflows

  // Render 4 slots dynamically
  const renderKeySlot = (slotIndex: number) => {
    const key = sortedKeys[slotIndex];

    if (!key) {
      // Empty slot - show empty passphrase card as placeholder
      return (
        <CompactPassphraseCard
          key={`slot-${slotIndex}`}
          vaultId={targetVaultId || undefined}
          onClick={() => handleKeyClick(slotIndex)}
          isConfigured={false}
          isInteractive={isManageKeysPage}
        />
      );
    }

    // Render based on key type
    if (isPassphraseKey(key)) {
      return (
        <CompactPassphraseCard
          key={key.id}
          vaultId={targetVaultId || undefined}
          onClick={() => handleKeyClick(slotIndex)}
          isConfigured={true}
          label={key.label}
          isInteractive={isManageKeysPage}
        />
      );
    }

    if (isYubiKey(key)) {
      // Calculate the YubiKey-specific index (among YubiKeys only)
      const yubiKeys = sortedKeys.filter(isYubiKey);
      const yubiIndex = yubiKeys.findIndex((k) => k.id === key.id);

      return (
        <CompactYubiKeyCard
          key={key.id}
          index={yubiIndex}
          vaultId={targetVaultId || undefined}
          onClick={() => handleKeyClick(slotIndex)}
          state={mapKeyLifecycleStatus(key.lifecycle_status)}
          serial={key.data.serial}
          label={key.label}
          isInteractive={isManageKeysPage}
        />
      );
    }

    // Fallback (should not happen)
    return null;
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Render exactly 4 slots */}
      {[0, 1, 2, 3].map((slotIndex) => (
        <React.Fragment key={`slot-wrapper-${slotIndex}`}>
          {slotIndex > 0 && <span className="text-slate-400 text-xs mx-1">|</span>}
          {renderKeySlot(slotIndex)}
        </React.Fragment>
      ))}
    </div>
  );
};
