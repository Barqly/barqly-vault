import React, { useState } from 'react';
import { ChevronDown, Plus, Database, Check } from 'lucide-react';
import { useVault } from '../../contexts/VaultContext';

interface VaultSelectorProps {
  onCreateVault?: () => void;
  className?: string;
}

/**
 * Vault selector dropdown component
 * Allows switching between vaults and creating new ones
 */
export const VaultSelector: React.FC<VaultSelectorProps> = ({
  onCreateVault,
  className = '',
}) => {
  const { currentVault, vaults, setCurrentVault, isLoading } = useVault();
  const [isOpen, setIsOpen] = useState(false);

  const handleVaultSelect = async (vaultId: string) => {
    await setCurrentVault(vaultId);
    setIsOpen(false);
  };

  const handleCreateClick = () => {
    setIsOpen(false);
    onCreateVault?.();
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 ${className}`}>
        <Database className="h-5 w-5 text-gray-400" />
        <span className="text-gray-500">Loading vaults...</span>
      </div>
    );
  }

  if (vaults.length === 0) {
    return (
      <button
        onClick={handleCreateClick}
        className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${className}`}
      >
        <Plus className="h-5 w-5" />
        <span>Create First Vault</span>
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:border-gray-400 transition-colors min-w-[200px]"
      >
        <Database className="h-5 w-5 text-blue-600" />
        <span className="flex-1 text-left text-gray-900">
          {currentVault?.name || 'Select Vault'}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
            {vaults.map((vault) => (
              <button
                key={vault.id}
                onClick={() => handleVaultSelect(vault.id)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${
                  vault.id === currentVault?.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database
                    className={`h-4 w-4 ${
                      vault.id === currentVault?.id
                        ? 'text-blue-600'
                        : 'text-gray-400'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{vault.name}</p>
                    {vault.description && (
                      <p className="text-xs text-gray-500">
                        {vault.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {vault.key_count} key{vault.key_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {vault.id === currentVault?.id && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </button>
            ))}

            <div className="border-t border-gray-200">
              <button
                onClick={handleCreateClick}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 text-blue-600"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Vault</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};