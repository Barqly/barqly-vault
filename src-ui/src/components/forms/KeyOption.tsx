import React from 'react';
import { Key, Calendar } from 'lucide-react';
import { KeyMetadata } from '../../lib/api-types';

export interface KeyOptionProps {
  keyData: KeyMetadata;
  isSelected: boolean;
  onSelect: (keyLabel: string) => void;
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
      onSelect(keyData.label);
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
      onClick={() => onSelect(keyData.label)}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 text-blue-600 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{keyData.label}</div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(keyData.created_at)}</span>
          </div>
        </div>
      </div>
    </li>
  );
};
