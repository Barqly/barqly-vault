import React from 'react';
import { CheckCircle } from 'lucide-react';

interface CompactPassphraseSlotProps {
  vaultId?: string;
  isConfigured?: boolean;
  label?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * Compact passphrase slot for horizontal key menu bar
 * Small icon-based design for header placement
 */
export const CompactPassphraseSlot: React.FC<CompactPassphraseSlotProps> = ({
  vaultId: _vaultId,
  isConfigured = false,
  label,
  onClick,
  className = '',
}) => {
  const getSlotStyles = () => {
    if (isConfigured) {
      return 'bg-green-50 hover:bg-green-100 border-green-200';
    }
    return 'bg-slate-50 hover:bg-slate-100 border-slate-200';
  };

  const displayLabel = label
    ? label.length > 12
      ? label.substring(0, 12) + '...'
      : label
    : 'Passphrase';

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-200 ${getSlotStyles()} ${className}`}
      aria-label={isConfigured ? `Passphrase: ${label || 'Configured'}` : 'Add passphrase'}
      title={isConfigured ? label || 'Passphrase configured' : 'Click to add passphrase'}
    >
      {/* Emoji icon and check status */}
      <div className="relative">
        <span className="text-base" role="img" aria-label={isConfigured ? 'Lock' : 'Key'}>
          {isConfigured ? '🔐' : '🗝️'}
        </span>
        {isConfigured && (
          <CheckCircle className="h-2.5 w-2.5 text-green-600 absolute -top-1 -right-1 bg-white rounded-full" />
        )}
      </div>

      {/* Label */}
      <span className={`text-xs font-medium ${isConfigured ? 'text-slate-700' : 'text-slate-500'}`}>
        {isConfigured ? displayLabel : 'Add'}
      </span>
    </button>
  );
};
