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
        px-3 py-2 cursor-pointer hover:bg-blue-50 focus:bg-blue-50 focus:outline-none focus:border-l-2 focus:border-blue-400
        ${isSelected ? 'bg-blue-100 text-blue-900' : 'text-slate-800'}
      `}
      onClick={() => onSelect(keyData.id)}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center gap-2">
        {keyData.type === 'yubikey' ? (
          <Usb className="h-4 w-4 text-green-600 flex-shrink-0" />
        ) : (
          <Key className="h-4 w-4 text-blue-600 flex-shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{keyData.label}</div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(keyData.created_at)}</span>
            {keyData.type === 'yubikey' && (
              <span className="text-green-600 font-medium">• YubiKey</span>
            )}
            {keyData.state === 'registered' && (
              <span className="text-orange-600 font-medium">• Not Available</span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
};
