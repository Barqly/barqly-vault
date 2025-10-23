import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Filter, Key, Archive } from 'lucide-react';

export type VaultFilterValue = 'all' | 'unattached' | string; // 'all', 'unattached', or vault ID

interface VaultFilterOption {
  value: VaultFilterValue;
  label: string;
  type: 'all' | 'vault' | 'unattached';
}

interface VaultFilterDropdownProps {
  value: VaultFilterValue;
  onChange: (value: VaultFilterValue) => void;
  vaults: Array<{ id: string; name: string }>;
  className?: string;
}

/**
 * Vault filter dropdown for Manage Keys page
 * Allows filtering keys by vault association
 */
export const VaultFilterDropdown: React.FC<VaultFilterDropdownProps> = ({
  value,
  onChange,
  vaults,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build filter options
  const options: VaultFilterOption[] = [
    { value: 'all', label: 'All Keys', type: 'all' },
    ...vaults.map((v) => ({ value: v.id, label: v.name, type: 'vault' as const })),
    { value: 'unattached', label: 'Unattached Keys', type: 'unattached' },
  ];

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (optionValue: VaultFilterValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 px-3 py-2 rounded-lg border
          bg-slate-700 border-slate-600 text-slate-200
          hover:bg-slate-600 hover:border-slate-500
          focus:outline-none focus:ring-2 focus:ring-blue-500
          transition-colors text-sm
        "
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Filter className="w-4 h-4" style={{ color: '#1D4ED8' }} />
        <span className="font-medium">{selectedOption.label}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="
            absolute top-full mt-1 right-0 z-50
            bg-slate-800 border border-slate-600 rounded-lg shadow-xl
            min-w-[200px] max-w-[280px]
            overflow-hidden
          "
          role="listbox"
        >
          {/* All Keys */}
          <button
            onClick={() => handleSelect('all')}
            className={`
              w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2
              ${
                value === 'all'
                  ? 'bg-blue-500/20 text-blue-300 font-medium'
                  : 'text-slate-200 hover:bg-slate-700'
              }
            `}
            role="option"
            aria-selected={value === 'all'}
          >
            <Key className="w-4 h-4 text-slate-500" />
            All Keys
          </button>

          {/* Separator */}
          {vaults.length > 0 && <div className="h-px bg-slate-600 my-1" />}

          {/* Vault options */}
          {vaults.map((vault) => (
            <button
              key={vault.id}
              onClick={() => handleSelect(vault.id)}
              className={`
                w-full px-4 py-2.5 text-left text-sm transition-colors truncate flex items-center gap-2
                ${
                  value === vault.id
                    ? 'bg-blue-500/20 text-blue-300 font-medium'
                    : 'text-slate-200 hover:bg-slate-700'
                }
              `}
              role="option"
              aria-selected={value === vault.id}
              title={vault.name}
            >
              <Archive className="w-4 h-4 flex-shrink-0" style={{ color: '#3B82F6' }} />
              <span className="truncate">{vault.name}</span>
            </button>
          ))}

          {/* Separator */}
          <div className="h-px bg-slate-600 my-1" />

          {/* Unattached Keys */}
          <button
            onClick={() => handleSelect('unattached')}
            className={`
              w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2
              ${
                value === 'unattached'
                  ? 'bg-blue-500/20 text-blue-300 font-medium'
                  : 'text-slate-200 hover:bg-slate-700'
              }
            `}
            role="option"
            aria-selected={value === 'unattached'}
          >
            <Key className="w-4 h-4 text-slate-500" />
            Unattached Keys
          </button>
        </div>
      )}
    </div>
  );
};

export default VaultFilterDropdown;
