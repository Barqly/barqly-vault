import React from 'react';
import { Sparkles, Lock, Zap } from 'lucide-react';

const TopStatusBar: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
      {/* Left: Logo + Tagline */}
      <div className="flex flex-col gap-1 items-start">
        <img
          src="/barqly-vault-text-hdr.svg"
          alt="Barqly Vault"
          className="h-8"
        />
        <p className="text-xs text-slate-500 font-light whitespace-nowrap pl-0.5">
          Secure backup for sensitive data & documents
        </p>
      </div>

      {/* Right: Security Badges */}
      <div className="hidden md:flex items-center gap-6">
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Sparkles className="w-4 h-4 text-slate-400" />
          <span>Strong Encryption</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Lock className="w-4 h-4 text-slate-400" />
          <span>Local-Only Storage</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Zap className="w-4 h-4 text-slate-400" />
          <span>No Network Access</span>
        </div>
      </div>
    </header>
  );
};

export default TopStatusBar;
