import React from 'react';
import { Key, Fingerprint, Check, X } from 'lucide-react';
import { KeyReferenceWithAvailability } from '../../hooks/useKeySelection';

export interface KeyOptionProps {
  keyData: KeyReferenceWithAvailability;
  isSelected: boolean;
  onSelect: (keyId: string) => void;
}

export const KeyOption: React.FC<KeyOptionProps> = ({ keyData, isSelected, onSelect }) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(keyData.id);
    }
  };

  return (
    <li
      role="option"
      aria-selected={isSelected}
      tabIndex={-1}
      className={`
        px-3 py-3 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-b-0 transition-colors
        text-slate-800 dark:text-slate-200
        hover:bg-slate-50 dark:hover:bg-slate-700
        focus:bg-slate-50 dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 !text-blue-900 dark:!text-blue-300' : ''}
      `}
      onClick={() => onSelect(keyData.id)}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center gap-2">
        {keyData.type === 'YubiKey' ? (
          <Fingerprint className="h-4 w-4 flex-shrink-0" style={{ color: '#F98B1C' }} />
        ) : (
          <Key className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        )}
        <div className="font-medium truncate">{keyData.label}</div>
        {/* Availability indicator next to label */}
        {keyData.is_available ? (
          <Check className="h-3.5 w-3.5 text-teal-600 dark:text-teal-500 flex-shrink-0" />
        ) : (
          <X className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
        )}
      </div>
    </li>
  );
};
