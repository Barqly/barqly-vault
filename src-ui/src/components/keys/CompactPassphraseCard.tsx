import React from 'react';
import { Key, Circle } from 'lucide-react';

interface CompactPassphraseSlotProps {
  vaultId?: string;
  isConfigured?: boolean;
  label?: string;
  onClick?: () => void;
  isInteractive?: boolean; // NEW: Control whether slot is clickable
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

  // Inline styles for brand colors (Passphrase = Teal)
  const getInlineStyles = () => {
    if (isConfigured) {
      // Brand teal colors (from styleguide)
      return {
        backgroundColor: 'rgba(15, 118, 110, 0.1)',
        color: '#13897F',
        border: '1px solid #B7E1DD',
      };
    }

    // Empty state - Theme-aware using CSS variables
    return {
      backgroundColor: 'rgb(var(--surface-hover))',
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
      className={`${getSlotStyles()} ${className}`}
      style={getInlineStyles()}
      aria-label={isConfigured ? `Passphrase: ${label || 'Configured'}` : 'Add passphrase'}
      title={getTooltipText()}
    >
      {/* Icon - Brand teal Key icon for configured, empty circle for empty */}
      {isConfigured ? (
        <Key className="h-3 w-3 flex-shrink-0" style={{ color: '#13897F' }} />
      ) : (
        <Circle className="h-3 w-3 flex-shrink-0" />
      )}

      {/* Label with truncation */}
      <span className="text-xs font-medium truncate">{getDisplayLabel()}</span>
    </button>
  );
};
