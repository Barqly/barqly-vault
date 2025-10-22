import React from 'react';
import { LucideIcon, Archive, AlertTriangle } from 'lucide-react';
import { KeyMenuBar } from '../keys/KeyMenuBar';

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
  /** Vault ID - Only show keys when vaultId is provided (prevents showing wrong vault's keys) */
  vaultId?: string | null;

  // Custom actions (for Manage Keys page)
  /** Optional custom actions to display on the right side instead of vault badge */
  actions?: React.ReactNode;
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
  actions,
}) => {
  return (
    <header className={`bg-card border-b border-default ${className}`}>
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
            className="flex items-center gap-3 text-2xl font-semibold leading-none text-heading"
            title={titleTooltip}
          >
            <Icon className="h-5 w-5 text-secondary" aria-hidden="true" />
            {title}
          </h1>
        </div>

        {/* Right side: Custom actions OR Vault Badge + Keys */}
        <div className="flex items-center gap-3">
          {/* Custom actions (if provided, replaces vault badge) */}
          {actions ? (
            actions
          ) : (
            <>
              {/* Vault Status Badge (readonly) */}
              {showVaultBadge && (
                <>
                  {!vaultName ? (
                    // No vault selected - theme-aware placeholder
                    <div
                      className="inline-flex items-center gap-2 px-4 py-1.5 border border-dashed rounded-full text-sm text-muted"
                      style={{
                        height: '32px',
                        width: '200px',
                        backgroundColor: 'rgb(var(--surface-hover))',
                        borderColor: 'rgb(var(--border-default))',
                      }}
                      title="No vault selected"
                    >
                      <Archive className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="font-medium">No Vault</span>
                    </div>
                  ) : vaultVariant === 'recovery' ? (
                    // Recovery mode - yellow warning badge (state-based, not theme-aware)
                    <div
                      className="inline-flex items-center gap-2 px-4 py-1.5 border border-yellow-200 rounded-full bg-yellow-50 text-sm whitespace-nowrap text-main"
                      style={{ height: '32px', width: '200px' }}
                      title="Vault manifest not found - recovery mode"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />
                      <span className="font-medium overflow-hidden text-ellipsis">
                        {vaultName.length > 20 ? vaultName.substring(0, 20) + '...' : vaultName}
                      </span>
                    </div>
                  ) : (
                    // Normal mode - blue badge with brand colors and theme-aware text
                    <div
                      className="inline-flex items-center gap-2 px-4 py-1.5 border rounded-full text-sm whitespace-nowrap text-main"
                      style={{
                        height: '32px',
                        width: '200px',
                        backgroundColor: 'rgba(29, 78, 216, 0.1)',
                        borderColor: 'rgba(59, 130, 246, 0.3)',
                      }}
                      title={vaultName}
                    >
                      <Archive className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#3B82F6' }} />
                      <span className="font-medium overflow-hidden text-ellipsis">
                        {vaultName.length > 20 ? vaultName.substring(0, 20) + '...' : vaultName}
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Separator between vault badge and keys */}
              {showVaultBadge && vaultVariant === 'normal' && (
                <span className="text-muted text-lg">|</span>
              )}

              {/* Key Status Badges (readonly) - Delegated to KeyMenuBar for DRY principle */}
              {/* KeyMenuBar is vault-aware: shows real keys if vaultId provided, placeholders if null */}
              {showVaultBadge && vaultVariant === 'normal' && (
                <div className="hidden md:block">
                  <KeyMenuBar vaultId={vaultId} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
