import React from 'react';
import { Sparkles, Lock, Zap } from 'lucide-react';

const AppHeader: React.FC = () => {
  return (
    <header className="bg-card border-b border-default px-6 py-3 flex items-center justify-between">
      {/* Left: Logo + Tagline */}
      <div className="flex flex-col gap-1 items-start">
        <img src="/barqly-vault-text-hdr.svg" alt="Barqly Vault" className="h-8" />
        <p className="text-xs text-secondary font-light whitespace-nowrap pl-1">
          Secure backup for sensitive data & documents
        </p>
      </div>

      {/* Right: Security Badges */}
      <div className="hidden md:flex items-center gap-6">
        <div className="flex items-center gap-1.5 text-sm text-secondary">
          <Sparkles className="w-4 h-4 text-muted" />
          <span>Strong Encryption</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-secondary">
          <Lock className="w-4 h-4 text-muted" />
          <span>Local-Only Storage</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-secondary">
          <Zap className="w-4 h-4 text-muted" />
          <span>No Network Access</span>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
