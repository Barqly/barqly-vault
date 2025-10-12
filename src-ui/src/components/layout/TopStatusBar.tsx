import React, { useEffect, useState } from 'react';
import { Archive, Key, Shield, Usb } from 'lucide-react';
import { useVault } from '../../contexts/VaultContext';
import { commands } from '../../bindings';

const TopStatusBar: React.FC = () => {
  const { vaults, getCurrentVaultKeys, currentVault } = useVault();
  const [yubiKeyConnected, setYubiKeyConnected] = useState(false);

  // Poll for YubiKey status
  useEffect(() => {
    const checkYubiKey = async () => {
      try {
        const result = await commands.detectYubikey({});
        setYubiKeyConnected(result.success && result.data ? result.data.length > 0 : false);
      } catch {
        setYubiKeyConnected(false);
      }
    };

    checkYubiKey();
    const interval = setInterval(checkYubiKey, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const keyCount = getCurrentVaultKeys().length;

  return (
    <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between">
      {/* Left: App Title */}
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-blue-600" />
        <h1 className="text-lg font-semibold text-slate-800">Barqly Vault</h1>
        {currentVault && <span className="text-sm text-slate-500">- {currentVault.name}</span>}
      </div>

      {/* Right: Status Indicators */}
      <div className="flex items-center gap-4">
        {/* Key Count */}
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600">
            {keyCount} {keyCount === 1 ? 'Key' : 'Keys'}
          </span>
        </div>

        {/* Vault Count */}
        <div className="flex items-center gap-2">
          <Archive className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600">
            {vaults.length} {vaults.length === 1 ? 'Vault' : 'Vaults'}
          </span>
        </div>

        {/* YubiKey Status */}
        <div className="flex items-center gap-2">
          <Usb className={`w-4 h-4 ${yubiKeyConnected ? 'text-green-600' : 'text-slate-300'}`} />
          <span className={`text-sm ${yubiKeyConnected ? 'text-green-600' : 'text-slate-400'}`}>
            YubiKey: {yubiKeyConnected ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </div>
    </header>
  );
};

export default TopStatusBar;
