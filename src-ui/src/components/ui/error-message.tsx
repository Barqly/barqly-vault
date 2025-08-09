import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '../../lib/utils';
import { CommandError } from '../../lib/api-types';
import {
  parseError,
  getErrorVariant,
  getErrorIcon,
  type ErrorVariant,
} from '../../lib/errors/error-formatting';
import { ErrorMessageContent } from './error-message-content';

const errorMessageVariants = cva(
  'relative w-full rounded-lg border p-4 transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-destructive/10 border-destructive/20 text-destructive-foreground',
        warning:
          'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800/30 dark:text-yellow-200',
        info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-200',
        security:
          'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-200',
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
      default: 'text-destructive',
      warning: 'text-yellow-600 dark:text-yellow-400',
      info: 'text-blue-600 dark:text-blue-400',
      security: 'text-red-600 dark:text-red-400',
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

export interface ErrorMessageProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof errorMessageVariants> {
  error?: CommandError | string | null;
  title?: string;
  showIcon?: boolean;
  showCloseButton?: boolean;
  showRecoveryGuidance?: boolean;
  showDetails?: boolean;
  onClose?: () => void;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}

function ErrorMessage({
  className,
  variant,
  size,
  error,
  title,
  showIcon = true,
  showCloseButton = false,
  showRecoveryGuidance = true,
  showDetails = false,
  onClose,
  onRetry,
  retryLabel = 'Retry',
  ref,
  ...props
}: ErrorMessageProps) {
  // Don't render if no error
  if (!error) return null;

  // Parse error and determine variant
  const errorInfo = parseError(error);
  const currentVariant: ErrorVariant = variant || getErrorVariant(errorInfo.code);
  const IconComponent = getErrorIcon(currentVariant);

  return (
    <div
      ref={ref}
      role="alert"
      aria-live="polite"
      className={cn(errorMessageVariants({ variant: currentVariant, size, className }))}
      {...props}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        {showIcon && (
          <IconComponent
            className={cn(iconVariants({ variant: currentVariant, size }))}
            aria-hidden="true"
            data-testid="error-icon"
          />
        )}

        {/* Content */}
        <ErrorMessageContent
          errorInfo={errorInfo}
          title={title}
          showRecoveryGuidance={showRecoveryGuidance}
          showDetails={showDetails}
          onRetry={onRetry}
          retryLabel={retryLabel}
        />

        {/* Close Button */}
        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-md opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-opacity"
            aria-label="Close error message"
            data-testid="close-button"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

ErrorMessage.displayName = 'ErrorMessage';

export { ErrorMessage, errorMessageVariants };
