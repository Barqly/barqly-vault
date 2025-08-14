import React from 'react';
import { LucideIcon, Shield, Lock, Unlock, Zap } from 'lucide-react';
import TrustBadge from '../ui/TrustBadge';

/**
 * Configuration for a trust badge
 */
export interface TrustBadgeConfig {
  icon: LucideIcon;
  label: string;
  tooltip: string;
}

/**
 * Props for the unified AppHeader component
 */
export interface AppHeaderProps {
  /** The screen type determines default values and styling */
  screen: 'setup' | 'encrypt' | 'decrypt';
  /** Optional custom title override */
  title?: string;
  /** Optional custom subtitle (only shown on setup screen) */
  subtitle?: string;
  /** Optional custom icon override */
  icon?: LucideIcon;
  /** Optional trust badges to display */
  trustBadges?: TrustBadgeConfig[];
  /** Additional CSS classes for the container */
  className?: string;
  /** Whether to include skip navigation link (for accessibility) */
  includeSkipNav?: boolean;
  /** Skip navigation target ID */
  skipNavTarget?: string;
}

/**
 * Default configurations for each screen type
 */
// Universal trust badges used across all screens for consistent messaging
const universalTrustBadges: TrustBadgeConfig[] = [
  {
    icon: Shield,
    label: 'Military-grade',
    tooltip: 'Military-grade age encryption standard',
  },
  {
    icon: Lock,
    label: 'Local-only',
    tooltip: 'All processing happens on your device',
  },
  {
    icon: Zap,
    label: 'Zero network',
    tooltip: 'No internet connection required or used',
  },
];

const screenDefaults: Record<
  AppHeaderProps['screen'],
  {
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    trustBadges: TrustBadgeConfig[];
  }
> = {
  setup: {
    title: 'Create Your Vault Key',
    // subtitle removed for consistent single-line headers across all screens
    icon: Shield,
    trustBadges: universalTrustBadges, // Shows unified trust indicators across all screens
  },
  encrypt: {
    title: 'Encrypt Your Vault',
    icon: Lock,
    trustBadges: universalTrustBadges, // Shows unified trust indicators across all screens
  },
  decrypt: {
    title: 'Decrypt Your Vault',
    icon: Unlock,
    trustBadges: universalTrustBadges, // Shows unified trust indicators across all screens
  },
};

/**
 * Unified header component that can be used across all screens
 * Features a clean, single-line layout with optional trust badges
 */
const AppHeader: React.FC<AppHeaderProps> = ({
  screen,
  title,
  subtitle,
  icon,
  trustBadges,
  className = '',
  includeSkipNav = false,
  skipNavTarget = '#main-content',
}) => {
  // Get defaults for the screen type
  const defaults = screenDefaults[screen];

  // Use provided values or fall back to defaults
  const finalTitle = title ?? defaults.title;
  const finalSubtitle = subtitle ?? defaults.subtitle;
  const finalIcon = icon ?? defaults.icon;
  const finalTrustBadges = trustBadges ?? defaults.trustBadges;

  // Determine if we should show subtitle (only for setup screen by default)
  const showSubtitle = screen === 'setup' && finalSubtitle;

  const Icon = finalIcon;

  return (
    <header className={`bg-white border-b border-slate-200 shadow-sm ${className}`}>
      {/* Skip Navigation Link - Hidden until focused */}
      {includeSkipNav && (
        <a
          href={skipNavTarget}
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Skip to main content
        </a>
      )}

      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side: Icon and Title */}
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 text-blue-600 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h1 className="text-slate-800 text-2xl md:text-[28px] font-semibold leading-tight">
                {finalTitle}
              </h1>
              {showSubtitle && (
                <p className="text-sm text-gray-700 mt-1 leading-tight">{finalSubtitle}</p>
              )}
            </div>
          </div>

          {/* Right side: Trust Badges */}
          {finalTrustBadges.length > 0 && (
            <div className="flex items-center gap-4 ml-6">
              {finalTrustBadges.map((badge, index) => (
                <TrustBadge
                  key={`${badge.label}-${index}`}
                  icon={badge.icon}
                  label={badge.label}
                  tooltip={badge.tooltip}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
