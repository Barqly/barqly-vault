import React from 'react';
import { Sparkles, Lock, Zap } from 'lucide-react';

const TopStatusBar: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between">
      {/* Right: Tagline */}
      <div className="text-sm text-slate-500 italic">
        Secure backup and restore for sensitive data & documents
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
