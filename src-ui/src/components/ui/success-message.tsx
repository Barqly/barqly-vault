import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { CheckCircle, X } from 'lucide-react';

import { cn } from '../../lib/utils';

const successMessageVariants = cva(
  'relative w-full rounded-lg border p-4 transition-all duration-200',
  {
    variants: {
      variant: {
        default:
          'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800/30 dark:text-green-200',
        info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-200',
        warning:
          'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800/30 dark:text-yellow-200',
      },
      size: {
        default: 'p-4',
        sm: 'p-3 text-sm',
        lg: 'p-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const iconVariants = cva('flex-shrink-0', {
  variants: {
    variant: {
      default: 'text-green-600 dark:text-green-400',
      info: 'text-blue-600 dark:text-blue-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
    },
    size: {
      default: 'size-5',
      sm: 'size-4',
      lg: 'size-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface SuccessAction {
  label: string;
  action: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface SuccessMessageProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof successMessageVariants> {
  title?: string;
  message?: string;
  showIcon?: boolean;
  showCloseButton?: boolean;
  onClose?: () => void;
  actions?: SuccessAction[];
  details?: React.ReactNode;
  showDetails?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number; // milliseconds
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}

function SuccessMessage({
  className,
  variant,
  size,
  title,
  message,
  showIcon = true,
  showCloseButton = false,
  onClose,
  actions = [],
  details,
  showDetails = false,
  autoHide = false,
  autoHideDelay = 5000,
  ref,
  ...props
}: SuccessMessageProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  // Auto-hide functionality
  React.useEffect(() => {
    if (autoHide && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, onClose]);

  // Don't render if not visible
  if (!isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  return (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className={cn(successMessageVariants({ variant, size, className }))}
      {...props}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        {showIcon && (
          <CheckCircle
            className={cn(iconVariants({ variant, size }))}
            aria-hidden="true"
            data-testid="success-icon"
          />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          {title && <h4 className="font-semibold leading-tight mb-1">{title}</h4>}

          {/* Message */}
          {message && <p className="text-sm leading-relaxed">{message}</p>}

          {/* Details */}
          {showDetails && details && <div className="mt-3">{details}</div>}

          {/* Action Buttons */}
          {actions.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {actions.map((action, index) => {
                const IconComponent = action.icon;
                const buttonVariant = action.variant || 'primary';

                const buttonClasses = cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                  {
                    'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500':
                      buttonVariant === 'primary',
                    'bg-green-100 text-green-800 hover:bg-green-200 focus:ring-green-500':
                      buttonVariant === 'secondary',
                    'border border-green-300 bg-transparent text-green-700 hover:bg-green-50 focus:ring-green-500':
                      buttonVariant === 'outline',
                  },
                );

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={action.action}
                    className={buttonClasses}
                    data-testid={`success-action-${index}`}
                  >
                    {IconComponent && <IconComponent className="size-3" />}
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Close Button */}
        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={handleClose}
            className="flex-shrink-0 p-1 rounded-md opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-opacity"
            aria-label="Close success message"
            data-testid="close-button"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

SuccessMessage.displayName = 'SuccessMessage';

export { SuccessMessage, successMessageVariants };
