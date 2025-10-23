import React from 'react';
import { Key, Calendar, Usb } from 'lucide-react';
import { KeyReference } from '../../bindings';

export interface KeyOptionProps {
  keyData: KeyReference;
  isSelected: boolean;
  onSelect: (keyId: string) => void;
  formatDate: (dateString: string) => string;
}

export const KeyOption: React.FC<KeyOptionProps> = ({
  keyData,
  isSelected,
  onSelect,
  formatDate,
}) => {
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
      tabIndex={0}
      className={`
        px-3 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 focus:bg-slate-50 dark:focus:bg-slate-700 focus:outline-none border-b border-slate-100 dark:border-slate-700 last:border-b-0
        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}
      `}
      onClick={() => onSelect(keyData.id)}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center gap-2">
        {keyData.type === 'YubiKey' ? (
          <Usb className="h-4 w-4 text-green-600 dark:text-green-500 flex-shrink-0" />
        ) : (
          <Key className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{keyData.label}</div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(keyData.created_at)}</span>
            {keyData.type === 'YubiKey' && (
              <span className="text-green-600 dark:text-green-500 font-medium">• YubiKey</span>
            )}
            {keyData.lifecycle_status === 'pre_activation' && (
              <span className="text-orange-600 dark:text-orange-500 font-medium">• Not Available</span>
            )}
            {keyData.lifecycle_status === 'suspended' && (
              <span className="text-yellow-600 dark:text-yellow-500 font-medium">• Suspended</span>
            )}
            {(keyData.lifecycle_status === 'deactivated' ||
              keyData.lifecycle_status === 'destroyed' ||
              keyData.lifecycle_status === 'compromised') && (
              <span className="text-red-600 dark:text-red-500 font-medium">• Unavailable</span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
};
