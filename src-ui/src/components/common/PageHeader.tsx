import React from 'react';
import { LucideIcon, Archive, AlertTriangle } from 'lucide-react';
import { CompactPassphraseCard } from '../keys/CompactPassphraseCard';
import { CompactYubiKeyCard } from '../keys/CompactYubiKeyCard';
import { useVault } from '../../contexts/VaultContext';

interface PageHeaderProps {
  /** The title to display (e.g., "Encrypt Vault", "Decrypt Vault") */
  title: string;
  /** The icon to display next to the title */
  icon: LucideIcon;
  /** Optional tooltip for full title (if truncated) */
  titleTooltip?: string;
  /** Optional skip navigation target ID */
  skipNavTarget?: string;
  /** Additional CSS classes for the container */
  className?: string;

  // Vault display (readonly status badge)
  /** Show vault status badge */
  showVaultBadge?: boolean;
  /** Vault name to display (if not provided, shows "No Vault" placeholder) */
  vaultName?: string;
  /** Variant: 'normal' (blue) or 'recovery' (yellow) */
  vaultVariant?: 'normal' | 'recovery';
  /** Vault ID for displaying keys from cache */
  vaultId?: string | null;
}

/**
 * Unified header component - Pure info radiator (read-only status display)
 * Used across all screens: Encrypt, Decrypt, Vault Hub, Manage Keys
 *
 * Displays vault name and associated keys as status badges
 * All user interactions happen in page content, not in header
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  titleTooltip,
  icon: Icon,
  skipNavTarget = '#main-content',
  className = '',
  showVaultBadge = false,
  vaultName,
  vaultVariant = 'normal',
  vaultId,
}) => {
  const { keyCache } = useVault();

  return (
    <header className={`bg-white border-b border-slate-200 ${className}`}>
      {/* Skip Navigation Link - Hidden until focused */}
      <a
        href={skipNavTarget}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Skip to main content
      </a>

      <div className="px-2 h-16 flex items-center justify-between">
        {/* Left side: Title only */}
        <div className="flex items-center">
          <h1
            className="flex items-center gap-3 text-2xl font-semibold leading-none"
            style={{ color: '#565555' }}
            title={titleTooltip}
          >
            <Icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
            {title}
          </h1>
        </div>

        {/* Right side: Vault Badge + Keys grouped together */}
        <div className="flex items-center gap-3">
          {/* Vault Status Badge (readonly) */}
          {showVaultBadge && (
            <>
              {!vaultName ? (
                // No vault selected - show placeholder
                <div
                  className="inline-flex items-center gap-2 px-4 py-1.5 border border-dashed border-gray-300 rounded-full bg-gray-50 text-sm text-gray-400"
                  style={{ height: '32px', width: '200px' }}
                  title="No vault selected"
                >
                  <Archive className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <span className="font-medium">No Vault</span>
                </div>
              ) : vaultVariant === 'recovery' ? (
                // Recovery mode - yellow badge
                <div
                  className="inline-flex items-center gap-2 px-4 py-1.5 border border-yellow-200 rounded-full bg-yellow-50 text-sm text-slate-700 whitespace-nowrap"
                  style={{ height: '32px', width: '200px' }}
                  title="Vault manifest not found - recovery mode"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />
                  <span className="font-medium overflow-hidden text-ellipsis">
                    {vaultName.length > 20 ? vaultName.substring(0, 20) + '...' : vaultName}
                  </span>
                </div>
              ) : (
                // Normal mode - blue badge
                <div
                  className="inline-flex items-center gap-2 px-4 py-1.5 border border-blue-200 rounded-full bg-blue-50 text-sm text-slate-700 whitespace-nowrap"
                  style={{ height: '32px', width: '200px' }}
                  title={vaultName}
                >
                  <Archive className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                  <span className="font-medium overflow-hidden text-ellipsis">
                    {vaultName.length > 20 ? vaultName.substring(0, 20) + '...' : vaultName}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Separator between vault badge and keys */}
          {showVaultBadge && <span className="text-slate-300 text-lg">|</span>}

          {/* Key Status Badges (readonly) - Only show when showVaultBadge is true */}
          {showVaultBadge && (
            <div className="hidden md:block">
              {vaultId && vaultVariant === 'normal' ? (
                // Show keys from cache for this vault
                (() => {
                  const cachedKeys = keyCache.get(vaultId) || [];
                  const passphraseKey = cachedKeys.find((k) => k.type === 'Passphrase');
                  const yubiKeys = cachedKeys.filter((k) => k.type === 'YubiKey');

                  return (
                    <div className="flex items-center gap-1">
                      <CompactPassphraseCard
                        isConfigured={!!passphraseKey}
                        label={passphraseKey?.label}
                        isInteractive={false}
                      />
                      <span className="text-slate-400 text-xs mx-1">|</span>
                      <CompactYubiKeyCard
                        index={0}
                        state={yubiKeys[0] ? 'active' : 'empty'}
                        serial={
                          yubiKeys[0]?.type === 'YubiKey' ? yubiKeys[0].data.serial : undefined
                        }
                        label={yubiKeys[0]?.label}
                        isInteractive={false}
                      />
                      <span className="text-slate-400 text-xs mx-1">|</span>
                      <CompactYubiKeyCard
                        index={1}
                        state={yubiKeys[1] ? 'active' : 'empty'}
                        serial={
                          yubiKeys[1]?.type === 'YubiKey' ? yubiKeys[1].data.serial : undefined
                        }
                        label={yubiKeys[1]?.label}
                        isInteractive={false}
                      />
                      <span className="text-slate-400 text-xs mx-1">|</span>
                      <CompactYubiKeyCard
                        index={2}
                        state={yubiKeys[2] ? 'active' : 'empty'}
                        serial={
                          yubiKeys[2]?.type === 'YubiKey' ? yubiKeys[2].data.serial : undefined
                        }
                        label={yubiKeys[2]?.label}
                        isInteractive={false}
                      />
                    </div>
                  );
                })()
              ) : (
                // No vault or recovery mode - show empty slots
                <div className="flex items-center gap-1">
                  <CompactPassphraseCard isConfigured={false} isInteractive={false} />
                  <span className="text-slate-400 text-xs mx-1">|</span>
                  <CompactYubiKeyCard index={0} state="empty" isInteractive={false} />
                  <span className="text-slate-400 text-xs mx-1">|</span>
                  <CompactYubiKeyCard index={1} state="empty" isInteractive={false} />
                  <span className="text-slate-400 text-xs mx-1">|</span>
                  <CompactYubiKeyCard index={2} state="empty" isInteractive={false} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
