import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

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
  // Fixed width and height slot with responsive styling
  const getSlotStyles = () => {
    const baseStyles =
      'w-32 h-8 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-200';

    if (!isInteractive && !isConfigured) {
      // Non-interactive empty slot (on non-Manage Keys pages)
      return `${baseStyles} bg-gray-50 border-gray-200 cursor-default`;
    }

    if (isConfigured) {
      // Configured slot (always shows as active)
      return `${baseStyles} bg-green-50 ${isInteractive ? 'hover:bg-green-100 cursor-pointer' : 'cursor-default'} border-green-200`;
    }

    // Empty interactive slot (on Manage Keys page)
    return `${baseStyles} bg-slate-50 hover:bg-slate-100 border-slate-200 cursor-pointer`;
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

  // Determine text color based on state
  const getTextStyles = () => {
    if (!isConfigured && !isInteractive) {
      return 'text-gray-400'; // Grey for non-interactive empty slots
    }
    return isConfigured ? 'text-slate-700' : 'text-slate-500';
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
      aria-label={isConfigured ? `Passphrase: ${label || 'Configured'}` : 'Add passphrase'}
      title={getTooltipText()}
    >
      {/* Icon with status indicator */}
      <div className="relative flex-shrink-0">
        {isConfigured ? (
          <>
            <span className="text-base" role="img" aria-label="Lock">
              🔐
            </span>
            <CheckCircle className="h-2.5 w-2.5 text-green-600 absolute -top-1 -right-1 bg-white rounded-full" />
          </>
        ) : (
          <>
            {isInteractive ? (
              <span className="text-base" role="img" aria-label="Key">
                🗝️
              </span>
            ) : (
              <span className="text-base text-gray-400" role="img" aria-label="Empty">
                ○
              </span>
            )}
          </>
        )}
      </div>

      {/* Label with truncation */}
      <span className={`text-xs font-medium truncate ${getTextStyles()}`}>{getDisplayLabel()}</span>
    </button>
  );
};
