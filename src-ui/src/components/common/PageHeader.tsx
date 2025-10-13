import React from 'react';
import { LucideIcon } from 'lucide-react';
import { KeyMenuBar } from '../keys/KeyMenuBar';

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
}

/**
 * Unified header component used across all screens (Setup, Encrypt, Decrypt)
 * Now with interactive key menu instead of static badges
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  titleTooltip,
  icon: Icon,
  skipNavTarget = '#main-content',
  className = '',
  onKeySelect,
}) => {
  return (
    <header className={`bg-white border-b border-slate-200 ${className}`}>
      {/* Skip Navigation Link - Hidden until focused */}
      <a
        href={skipNavTarget}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Skip to main content
      </a>

      <div className="mx-auto max-w-[960px] px-6 h-16 flex items-center justify-between">
        {/* Left side: Icon and Title */}
        <h1
          className="flex items-center gap-3 text-2xl font-semibold"
          style={{ color: '#565555' }}
          title={titleTooltip}
        >
          <Icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
          {title}
        </h1>

        {/* Right side: Interactive Key Menu (hidden on mobile, shown on md+ screens) */}
        <div className="hidden md:block">
          <KeyMenuBar onKeySelect={onKeySelect} />
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
