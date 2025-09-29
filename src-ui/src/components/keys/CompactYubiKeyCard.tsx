import React from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export type YubiKeySlotState = 'empty' | 'active' | 'registered' | 'orphaned';

interface CompactYubiKeySlotProps {
  index: number; // 0, 1, or 2
  vaultId?: string;
  state?: YubiKeySlotState;
  serial?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Compact YubiKey slot for horizontal key menu bar
 * Small icon-based design for header placement
 */
export const CompactYubiKeyCard: React.FC<CompactYubiKeySlotProps> = ({
  index,
  vaultId: _vaultId,
  state = 'empty',
  serial,
  label,
  onClick,
  className = '',
}) => {
  const getSlotStyles = () => {
    switch (state) {
      case 'active':
        return 'bg-green-50 hover:bg-green-100 border-green-200';
      case 'registered':
        return 'bg-blue-50 hover:bg-blue-100 border-blue-200';
      case 'orphaned':
        return 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200';
      default:
        return 'bg-slate-50 hover:bg-slate-100 border-slate-200';
    }
  };

  const getEmojiIcon = () => {
    return state === 'empty' ? '🗝️' : '🔑';
  };

  const getStatusIcon = () => {
    switch (state) {
      case 'active':
        return (
          <CheckCircle className="h-2.5 w-2.5 text-green-600 absolute -top-1 -right-1 bg-white rounded-full" />
        );
      case 'registered':
        return (
          <Info className="h-2.5 w-2.5 text-blue-600 absolute -top-1 -right-1 bg-white rounded-full" />
        );
      case 'orphaned':
        return (
          <AlertCircle className="h-2.5 w-2.5 text-yellow-600 absolute -top-1 -right-1 bg-white rounded-full" />
        );
      default:
        return null;
    }
  };

  const getTooltipText = () => {
    if (state === 'empty') return `Click to add YubiKey ${index + 1}`;

    const statusText =
      state === 'active' ? 'Active' : state === 'registered' ? 'Registered' : 'Recovery needed';

    return `${label || `YubiKey ${index + 1}`} - ${statusText}${serial ? ` (SN: ${serial.substring(0, 6)}...)` : ''}`;
  };

  const displayLabel = () => {
    if (state === 'empty') return 'Add';
    if (label) {
      // Don't truncate labels - let them display fully
      return label;
    }
    return `YubiKey ${index + 1}`;
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-200 ${getSlotStyles()} ${className}`}
      aria-label={`YubiKey slot ${index + 1}: ${state}`}
      title={getTooltipText()}
    >
      {/* Emoji icon with status indicator */}
      <div className="relative">
        <span className="text-base" role="img" aria-label={state === 'empty' ? 'Key' : 'YubiKey'}>
          {getEmojiIcon()}
        </span>
        {state !== 'empty' && getStatusIcon()}
      </div>

      {/* Label */}
      <span
        className={`text-xs font-medium ${state !== 'empty' ? 'text-slate-700' : 'text-slate-500'}`}
      >
        {displayLabel()}
      </span>
    </button>
  );
};
