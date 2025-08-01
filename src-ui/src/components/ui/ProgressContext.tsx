import React from 'react';
import { Clock, Zap } from 'lucide-react';

interface ProgressContextProps {
  /** Estimated time in seconds */
  estimatedTime?: number;
  /** Context variant */
  variant?: 'quick' | 'secure' | 'custom';
  /** Custom message */
  customMessage?: string;
  /** Show icon */
  showIcon?: boolean;
}

const ProgressContext: React.FC<ProgressContextProps> = ({
  estimatedTime = 90,
  variant = 'quick',
  customMessage,
  showIcon = true,
}) => {
  const getVariantConfig = () => {
    switch (variant) {
      case 'quick':
        return {
          icon: Zap,
          label: 'Quick Setup',
          message: customMessage || `Takes about ${estimatedTime} seconds`,
          iconColor: 'text-blue-500',
        };
      case 'secure':
        return {
          icon: Clock,
          label: 'Secure Generation',
          message: customMessage || 'Generating strong encryption keys',
          iconColor: 'text-green-500',
        };
      default:
        return {
          icon: Clock,
          label: 'Processing',
          message: customMessage || 'Please wait...',
          iconColor: 'text-gray-500',
        };
    }
  };

  const config = getVariantConfig();
  const Icon = config.icon;

  return (
    <div
      className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-4"
      role="status"
      aria-live="polite"
      data-testid="progress-context"
    >
      {showIcon && (
        <Icon
          className={`h-4 w-4 ${config.iconColor}`}
          aria-hidden="true"
          data-testid="progress-icon"
        />
      )}
      <span className="font-medium" data-testid="progress-label">
        {config.label}
      </span>
      <span className="text-gray-400" aria-hidden="true">
        •
      </span>
      <span data-testid="progress-message">{config.message}</span>
    </div>
  );
};

export default ProgressContext;
