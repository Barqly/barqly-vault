import React from 'react';
import { LucideIcon, Lock, Zap, Sparkles } from 'lucide-react';

interface UniversalHeaderProps {
  /** The title to display (e.g., "Create Your Vault Key", "Encrypt Your Vault") */
  title: string;
  /** The icon to display next to the title */
  icon: LucideIcon;
  /** Optional skip navigation target ID */
  skipNavTarget?: string;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * Unified header component used across all screens (Setup, Encrypt, Decrypt)
 * Based on the Setup page design with consistent trust badges
 */
const UniversalHeader: React.FC<UniversalHeaderProps> = ({
  title,
  icon: Icon,
  skipNavTarget = '#main-content',
  className = '',
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
        <h1 className="flex items-center gap-3 text-2xl font-semibold text-slate-900">
          <Icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
          {title}
        </h1>

        {/* Right side: Trust badges (hidden on mobile, shown on md+ screens) */}
        <div className="hidden md:flex gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-700 px-3 h-8 text-sm">
            <Sparkles className="h-4 w-4 text-slate-600" aria-hidden="true" />
            Strong Encryption
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-700 px-3 h-8 text-sm">
            <Lock className="h-4 w-4 text-slate-600" aria-hidden="true" />
            Local-Only Storage
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-700 px-3 h-8 text-sm">
            <Zap className="h-4 w-4 text-slate-600" aria-hidden="true" />
            No Network Access
          </span>
        </div>
      </div>
    </header>
  );
};

export default UniversalHeader;
