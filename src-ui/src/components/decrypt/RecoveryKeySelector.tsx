import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Key, Fingerprint } from 'lucide-react';
import { VaultKey } from '../../bindings';

interface RecoveryKeySelectorProps {
  keys: VaultKey[];
  value: string | null;
  onChange: (keyId: string) => void;
  label?: string;
  placeholder?: string;
}

/**
 * Simple key selector for recovery mode
 * Works with passed keys array instead of cache
 */
const RecoveryKeySelector: React.FC<RecoveryKeySelectorProps> = ({
  keys,
  value,
  onChange,
  label = 'Recovery Keys',
  placeholder = 'Select recovery key',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedKey = keys.find((k) => k.id === value);

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

  const handleSelect = (keyId: string) => {
    onChange(keyId);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        type="button"
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <span className="text-slate-900 dark:text-slate-100">
          {selectedKey ? selectedKey.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {keys.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
              No keys available
            </div>
          ) : (
            keys.map((key) => (
              <button
                key={key.id}
                onClick={() => handleSelect(key.id)}
                className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-b-0 ${
                  key.id === value ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  {key.type === 'YubiKey' ? (
                    <Fingerprint className="w-4 h-4" style={{ color: '#F98B1C' }} />
                  ) : (
                    <Key className="w-4 h-4" style={{ color: '#13897F' }} />
                  )}
                  <span className="font-medium text-slate-900 dark:text-slate-100">{key.label}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default RecoveryKeySelector;
