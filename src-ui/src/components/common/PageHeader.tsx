import React, { useMemo } from 'react';
import { LucideIcon } from 'lucide-react';
import { KeyMenuBar } from '../keys/KeyMenuBar';
import { useVault } from '../../contexts/VaultContext';

interface PageHeaderProps {
  /** The title to display (e.g., "Create Your Vault Key", "Encrypt Your Vault") */
  title: string;
  /** The icon to display next to the title */
  icon: LucideIcon;
  /** Optional tooltip for full title (if truncated) */
  titleTooltip?: string;
  /** Optional skip navigation target ID */
  skipNavTarget?: string;
  /** Additional CSS classes for the container */
  className?: string;
  /** Optional callback when a key is selected */
  onKeySelect?: (keyType: 'passphrase' | 'yubikey', index?: number) => void;
  /** Show vault selector dropdown */
  showVaultSelector?: boolean;
  /** Callback when vault changes */
  onVaultChange?: (vaultId: string) => void;
  /** Whether there are selected files (for confirmation on vault change) */
  hasSelectedFiles?: boolean;
}

/**
 * Unified header component used across all screens (Setup, Encrypt, Decrypt)
 * Now with interactive key menu and optional vault selector
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  titleTooltip,
  icon: Icon,
  skipNavTarget = '#main-content',
  className = '',
  onKeySelect,
  showVaultSelector = false,
  onVaultChange,
  hasSelectedFiles = false,
}) => {
  const { currentVault, vaults, setCurrentVault, keyCache } = useVault();

  // Filter to only vaults with keys, then sort alphabetically
  const vaultsWithKeys = useMemo(() => {
    return [...vaults]
      .filter((vault) => {
        const keyCount = keyCache.get(vault.id)?.length || 0;
        return keyCount > 0;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [vaults, keyCache]);

  const handleVaultChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newVaultId = event.target.value;

    if (!newVaultId) return;

    // If on Encrypt page with selected files, show confirmation
    if (hasSelectedFiles && onVaultChange) {
      if (confirm('⚠️ Changing vault will clear selected files. Continue?')) {
        setCurrentVault(newVaultId);
        onVaultChange(newVaultId);
      } else {
        // Reset the dropdown to current value
        event.target.value = currentVault?.id || '';
      }
    } else {
      setCurrentVault(newVaultId);
      onVaultChange?.(newVaultId);
    }
  };

  return (
    <header className={`bg-white border-b border-slate-200 ${className}`}>
      {/* Skip Navigation Link - Hidden until focused */}
      <a
        href={skipNavTarget}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Skip to main content
      </a>

      <div className="px-6 h-16 flex items-center justify-between">
        {/* Left side: Title + Vault Selector */}
        <div className="flex items-center gap-4">
          <h1
            className="flex items-center gap-3 text-2xl font-semibold"
            style={{ color: '#565555' }}
            title={titleTooltip}
          >
            <Icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
            {title}
          </h1>

          {showVaultSelector && vaultsWithKeys.length > 0 && (
            <select
              className="px-3 py-1 border border-gray-300 rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={currentVault?.id || ''}
              onChange={handleVaultChange}
              style={{ height: '28px' }}
            >
              <option value="" disabled>
                Select vault...
              </option>
              {vaultsWithKeys.map((vault) => {
                const displayName =
                  vault.name.length > 20 ? vault.name.substring(0, 20) + '...' : vault.name;

                return (
                  <option key={vault.id} value={vault.id} title={vault.name}>
                    {displayName}
                  </option>
                );
              })}
            </select>
          )}
        </div>

        {/* Right side: Interactive Key Menu (hidden on mobile, shown on md+ screens) */}
        <div className="hidden md:block">
          <KeyMenuBar onKeySelect={onKeySelect} />
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
