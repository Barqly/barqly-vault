import React from 'react';
import { CheckCircle, AlertCircle, Info, Circle } from 'lucide-react';

export type YubiKeySlotState = 'empty' | 'active' | 'registered' | 'orphaned';

interface CompactYubiKeySlotProps {
  index: number; // 0, 1, or 2
  vaultId?: string;
  state?: YubiKeySlotState;
  serial?: string;
  label?: string;
  onClick?: () => void;
  isInteractive?: boolean; // NEW: Control whether slot is clickable
  className?: string;
}

/**
 * Compact YubiKey slot for horizontal key menu bar
 * Fixed width design with label truncation and context awareness
 */
export const CompactYubiKeyCard: React.FC<CompactYubiKeySlotProps> = ({
  index,
  vaultId: _vaultId,
  state = 'empty',
  serial,
  label,
  onClick,
  isInteractive = true, // Default to interactive for backward compatibility
  className = '',
}) => {
  // Fixed width slot with responsive styling
  const getSlotStyles = () => {
    const baseStyles =
      'w-32 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-200';

    if (!isInteractive && state === 'empty') {
      // Non-interactive empty slot (on non-Manage Keys pages)
      return `${baseStyles} bg-gray-50 border-gray-200 cursor-default`;
    }

    // State-based styling for configured or interactive slots
    switch (state) {
      case 'active':
        return `${baseStyles} bg-green-50 ${isInteractive ? 'hover:bg-green-100 cursor-pointer' : 'cursor-default'} border-green-200`;
      case 'registered':
        return `${baseStyles} bg-blue-50 ${isInteractive ? 'hover:bg-blue-100 cursor-pointer' : 'cursor-default'} border-blue-200`;
      case 'orphaned':
        return `${baseStyles} bg-yellow-50 ${isInteractive ? 'hover:bg-yellow-100 cursor-pointer' : 'cursor-default'} border-yellow-200`;
      default:
        // Empty interactive slot
        return `${baseStyles} bg-slate-50 ${isInteractive ? 'hover:bg-slate-100 cursor-pointer' : 'cursor-default'} border-slate-200`;
    }
  };

  // Status indicator for configured keys
  const getStatusIcon = () => {
    if (state === 'empty') return null;

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

  // Truncate label for display with fixed character count
  const getDisplayLabel = () => {
    if (state === 'empty') {
      return isInteractive ? 'Add' : 'Empty';
    }

    // Use label if provided, otherwise use serial or default
    let displayText = label;
    if (!displayText && serial) {
      displayText = `YK-${serial.substring(0, 4)}`;
    }
    if (!displayText) {
      displayText = `YubiKey ${index + 1}`;
    }

    // Truncate to 5 chars + ellipsis for consistency
    return displayText.length > 8 ? `${displayText.substring(0, 5)}...` : displayText;
  };

  // Full tooltip text with all details
  const getTooltipText = () => {
    if (state === 'empty') {
      return isInteractive
        ? `Click to add YubiKey ${index + 1}`
        : `YubiKey slot ${index + 1} empty`;
    }

    const statusText =
      state === 'active' ? 'Active' : state === 'registered' ? 'Registered' : 'Recovery needed';

    const keyName = label || `YubiKey ${index + 1}`;
    const serialInfo = serial ? ` (Serial: ${serial})` : '';

    return `${keyName} - ${statusText}${serialInfo}`;
  };

  // Determine text color based on state and interactivity
  const getTextStyles = () => {
    if (state === 'empty' && !isInteractive) {
      return 'text-gray-400'; // Grey for non-interactive empty slots
    }
    return state !== 'empty' ? 'text-slate-700' : 'text-slate-500';
  };

  const handleClick = () => {
    if (isInteractive && onClick) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!isInteractive}
      className={`${getSlotStyles()} ${className}`}
      aria-label={`YubiKey slot ${index + 1}: ${state}`}
      title={getTooltipText()}
    >
      {/* Icon with status indicator */}
      <div className="relative flex-shrink-0">
        {state === 'empty' && !isInteractive ? (
          <Circle className="h-3.5 w-3.5 text-gray-400" />
        ) : (
          <>
            <span
              className="text-base"
              role="img"
              aria-label={state === 'empty' ? 'Key' : 'YubiKey'}
            >
              {state === 'empty' ? '🗝️' : '🔑'}
            </span>
            {state !== 'empty' && getStatusIcon()}
          </>
        )}
      </div>

      {/* Label with truncation */}
      <span className={`text-xs font-medium truncate ${getTextStyles()}`}>{getDisplayLabel()}</span>
    </button>
  );
};
