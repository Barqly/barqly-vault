import React from 'react';
import { Key, Circle, Check, X } from 'lucide-react';

interface CompactPassphraseSlotProps {
  vaultId?: string;
  isConfigured?: boolean;
  label?: string;
  onClick?: () => void;
  isInteractive?: boolean; // NEW: Control whether slot is clickable
  isAvailable?: boolean; // NEW: Availability status from global key cache
  className?: string;
}

/**
 * Compact passphrase slot for horizontal key menu bar
 * Fixed width design with label truncation and context awareness
 */
export const CompactPassphraseCard: React.FC<CompactPassphraseSlotProps> = ({
  vaultId: _vaultId,
  isConfigured = false,
  label,
  onClick,
  isInteractive = true, // Default to interactive for backward compatibility
  isAvailable,
  className = '',
}) => {
  // Fixed width and height slot with brand colors and theme-awareness
  const getSlotStyles = () => {
    const baseStyles =
      'w-32 h-8 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-200';

    if (isConfigured) {
      // Configured slot - Teal brand colors (fixed, theme-independent)
      return `${baseStyles} ${isInteractive ? 'hover:opacity-90 cursor-pointer' : 'cursor-default'}`;
    }

    // Empty slot - Theme-aware (adapts to light/dark mode)
    return `${baseStyles} ${isInteractive ? 'hover:opacity-90 cursor-pointer' : 'cursor-default'}`;
  };

  // Inline styles for brand colors (Passphrase = Teal) - Transparent with light borders
  const getInlineStyles = () => {
    if (isConfigured) {
      // Transparent background with soft teal border (matches KeyCard)
      return {
        backgroundColor: 'transparent',
        color: '#13897F',
        border: '1px solid #B7E1DD', // Soft teal border (from styleguide)
      };
    }

    // Empty state - Theme-aware using CSS variables
    return {
      backgroundColor: 'transparent',
      borderColor: 'rgb(var(--border-default))',
      color: 'rgb(var(--text-muted))',
    };
  };

  // Truncate label for display with fixed character count
  const getDisplayLabel = () => {
    if (!isConfigured) {
      return isInteractive ? 'Add' : 'Empty';
    }

    const displayText = label || 'Passphrase';
    // Truncate to 5 chars + ellipsis for consistency
    return displayText.length > 8 ? `${displayText.substring(0, 5)}...` : displayText;
  };

  // Full tooltip text with context
  const getTooltipText = () => {
    if (!isConfigured) {
      return isInteractive ? 'Click to add passphrase' : 'No passphrase configured';
    }
    return label || 'Passphrase configured';
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
      className={`${getSlotStyles()} ${className} justify-between`}
      style={getInlineStyles()}
      aria-label={isConfigured ? `Passphrase: ${label || 'Configured'}` : 'Add passphrase'}
      title={getTooltipText()}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Icon - Brand teal Key icon for configured, empty circle for empty */}
        {isConfigured ? (
          <Key className="h-3 w-3 flex-shrink-0" style={{ color: '#13897F' }} />
        ) : (
          <Circle className="h-3 w-3 flex-shrink-0" />
        )}

        {/* Label with truncation */}
        <span className="text-xs font-medium truncate">{getDisplayLabel()}</span>
      </div>

      {/* Availability indicator on the right (only for configured keys) */}
      {isConfigured && isAvailable !== undefined && (
        <div className="flex-shrink-0">
          {isAvailable ? (
            <Check className="h-3 w-3 text-teal-600" />
          ) : (
            <X className="h-3 w-3 text-slate-400" />
          )}
        </div>
      )}
    </button>
  );
};
