import React from 'react';
import { Shield, Lock, HardDrive, WifiOff } from 'lucide-react';

const TopStatusBar: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between">
      {/* Left: App Title */}
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-blue-600" />
        <h1 className="text-lg font-semibold text-slate-800">Barqly Vault</h1>
      </div>

      {/* Right: Security Badges */}
      <div className="hidden md:flex items-center gap-6 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-slate-400" />
          <span>Strong Encryption</span>
        </div>
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-slate-400" />
          <span>Local-Only Storage</span>
        </div>
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-slate-400" />
          <span>No Network Access</span>
        </div>
      </div>
    </header>
  );
};

export default TopStatusBar;
