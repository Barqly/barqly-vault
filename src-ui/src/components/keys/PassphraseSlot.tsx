import React from 'react';
import { Key, Plus, CheckCircle } from 'lucide-react';

interface PassphraseSlotProps {
  vaultId?: string;
  isConfigured?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Passphrase key slot component for the Unified Key Menu
 * Shows visual state for passphrase configuration
 */
export const PassphraseSlot: React.FC<PassphraseSlotProps> = ({
  vaultId: _vaultId, // TODO: Will be used when backend vault API is ready
  isConfigured = false,
  onClick,
  className = '',
}) => {
  // Brand colors from design system
  const activeColor = '#10B981'; // Success green
  const emptyColor = '#9CA3AF'; // Gray

  const getSlotStyles = () => {
    if (isConfigured) {
      return 'border-green-500 bg-green-50 hover:bg-green-100';
    }
    return 'border-gray-300 bg-white hover:bg-gray-50';
  };

  const getIconColor = () => {
    return isConfigured ? 'text-green-600' : 'text-gray-400';
  };

  return (
    <button
      onClick={onClick}
      className={`relative p-6 rounded-lg border-2 transition-all duration-200 ${getSlotStyles()} ${className}`}
      aria-label={isConfigured ? 'Passphrase configured' : 'Add passphrase'}
    >
      {/* Status indicator */}
      {isConfigured && (
        <div className="absolute top-2 right-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
        </div>
      )}

      {/* Main icon */}
      <div className="flex flex-col items-center space-y-3">
        <div className={`p-3 rounded-full ${isConfigured ? 'bg-green-100' : 'bg-gray-100'}`}>
          {isConfigured ? (
            <Key className={`h-8 w-8 ${getIconColor()}`} />
          ) : (
            <Plus className={`h-8 w-8 ${getIconColor()}`} />
          )}
        </div>

        {/* Label */}
        <div className="text-center">
          <h3 className="font-medium text-gray-900">Passphrase</h3>
          <p className="text-xs text-gray-500 mt-1">
            {isConfigured ? 'Configured' : 'Click to add'}
          </p>
        </div>
      </div>

      {/* Visual state indicator bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg"
        style={{ backgroundColor: isConfigured ? activeColor : emptyColor }}
      />
    </button>
  );
};
