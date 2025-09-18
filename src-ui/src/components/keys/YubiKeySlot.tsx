import React from 'react';
import { Fingerprint, Plus, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type YubiKeySlotState = 'empty' | 'active' | 'registered' | 'orphaned';

interface YubiKeySlotProps {
  index: number; // 0, 1, or 2
  vaultId?: string;
  state?: YubiKeySlotState;
  serial?: string;
  label?: string;
  onClick?: () => void;
  className?: string;
}

/**
 * YubiKey slot component for the Unified Key Menu
 * Shows visual state for YubiKey configuration (1 of 3 slots)
 */
export const YubiKeySlot: React.FC<YubiKeySlotProps> = ({
  index,
  vaultId: _vaultId, // TODO: Will be used when backend vault API is ready
  state = 'empty',
  serial,
  label,
  onClick,
  className = '',
}) => {
  // Brand colors from design system
  const colors = {
    active: '#10B981', // Green - currently inserted and configured
    registered: '#3B82F6', // Blue - configured but not inserted
    empty: '#9CA3AF', // Gray - no key configured
    orphaned: '#F59E0B', // Yellow - needs recovery
  };

  const getSlotStyles = () => {
    switch (state) {
      case 'active':
        return 'border-green-500 bg-green-50 hover:bg-green-100';
      case 'registered':
        return 'border-blue-500 bg-blue-50 hover:bg-blue-100';
      case 'orphaned':
        return 'border-yellow-500 bg-yellow-50 hover:bg-yellow-100';
      default:
        return 'border-gray-300 bg-white hover:bg-gray-50';
    }
  };

  const getIcon = () => {
    if (state === 'empty') {
      return <Plus className="h-8 w-8 text-gray-400" />;
    }
    return <Fingerprint className={`h-8 w-8 ${getIconColor()}`} />;
  };

  const getIconColor = () => {
    switch (state) {
      case 'active':
        return 'text-green-600';
      case 'registered':
        return 'text-blue-600';
      case 'orphaned':
        return 'text-yellow-600';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (state) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'registered':
        return <Info className="h-5 w-5 text-blue-600" />;
      case 'orphaned':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (state) {
      case 'active':
        return 'Active';
      case 'registered':
        return 'Registered';
      case 'orphaned':
        return 'Recovery needed';
      default:
        return 'Click to add';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`relative p-6 rounded-lg border-2 transition-all duration-200 ${getSlotStyles()} ${className}`}
      aria-label={`YubiKey slot ${index + 1}: ${getStatusText()}`}
    >
      {/* Status indicator */}
      {state !== 'empty' && <div className="absolute top-2 right-2">{getStatusIcon()}</div>}

      {/* Main content */}
      <div className="flex flex-col items-center space-y-3">
        <div
          className={`p-3 rounded-full ${
            state !== 'empty' ? `bg-${getIconColor().split('-')[1]}-100` : 'bg-gray-100'
          }`}
        >
          {getIcon()}
        </div>

        {/* Label */}
        <div className="text-center">
          <h3 className="font-medium text-gray-900">{label || `YubiKey ${index + 1}`}</h3>
          <p className="text-xs text-gray-500 mt-1">{getStatusText()}</p>
          {serial && state !== 'empty' && (
            <p className="text-xs text-gray-400 mt-0.5">SN: {serial.substring(0, 6)}...</p>
          )}
        </div>
      </div>

      {/* Visual state indicator bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg"
        style={{ backgroundColor: colors[state] }}
      />
    </button>
  );
};
