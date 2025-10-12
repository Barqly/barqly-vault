import React from 'react';
import { Shield } from 'lucide-react';
import { useVault } from '../../contexts/VaultContext';

const TopStatusBar: React.FC = () => {
  const { currentVault } = useVault();

  return (
    <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center">
      {/* App Title + Active Vault Name */}
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-blue-600" />
        <h1 className="text-lg font-semibold text-slate-800">Barqly Vault</h1>
        {currentVault && <span className="text-sm text-slate-500">- {currentVault.name}</span>}
      </div>
    </header>
  );
};

export default TopStatusBar;
