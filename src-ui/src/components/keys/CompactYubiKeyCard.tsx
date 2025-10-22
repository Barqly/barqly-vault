import React from 'react';
import { Fingerprint, Circle } from 'lucide-react';

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
  // Fixed width and height slot with brand colors and theme-awareness
  const getSlotStyles = () => {
    const baseStyles =
      'w-32 h-8 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-200';

    if (state !== 'empty') {
      // All configured states use same orange styling (no state-based colors)
      return `${baseStyles} ${isInteractive ? 'hover:opacity-90 cursor-pointer' : 'cursor-default'}`;
    }

    // Empty slot - Theme-aware (adapts to light/dark mode)
    return `${baseStyles} ${isInteractive ? 'hover:opacity-90 cursor-pointer' : 'cursor-default'}`;
  };

  // Inline styles for brand colors (YubiKey = Orange) - Transparent with light borders
  const getInlineStyles = () => {
    if (state !== 'empty') {
      // Transparent background with light orange border (matches KeyCard)
      return {
        backgroundColor: 'transparent',
        color: '#F98B1C',
        border: '1px solid #ffd4a3', // Light orange border (from styleguide)
      };
    }

    // Empty state - Theme-aware using CSS variables
    return {
      backgroundColor: 'transparent',
      borderColor: 'rgb(var(--border-default))',
      color: 'rgb(var(--text-muted))',
    };
  };

  // Status icon overlays removed - state only affects tooltip text

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

  // Tooltip text includes state info (no visual icon, just tooltip)
  const getTooltipText = () => {
    if (state === 'empty') {
      return isInteractive ? 'Click to add YubiKey' : 'No key configured';
    }

    const keyName = label || `YubiKey ${index + 1}`;
    const serialInfo = serial ? ` (S/N: ${serial})` : '';

    // State-specific suffix (informational only)
    switch (state) {
      case 'active':
        return `${keyName}${serialInfo}`;
      case 'registered':
        return `${keyName} - New YubiKey${serialInfo}`;
      case 'orphaned':
        return `${keyName} - Disconnected${serialInfo}`;
      default:
        return `${keyName}${serialInfo}`;
    }
  };

  // Text styles handled by inline styles (brand colors or theme variables)

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
      style={getInlineStyles()}
      aria-label={`YubiKey slot ${index + 1}: ${state}`}
      title={getTooltipText()}
    >
      {/* Icon - Brand orange Fingerprint icon for configured, empty circle for empty */}
      {state !== 'empty' ? (
        <Fingerprint className="h-3 w-3 flex-shrink-0" style={{ color: '#F98B1C' }} />
      ) : (
        <Circle className="h-3 w-3 flex-shrink-0" />
      )}

      {/* Label with truncation */}
      <span className="text-xs font-medium truncate">{getDisplayLabel()}</span>
    </button>
  );
};
