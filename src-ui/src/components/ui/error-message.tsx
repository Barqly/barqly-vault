import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, X, AlertTriangle, Info, Shield } from 'lucide-react';

import { cn } from '../../lib/utils';
import { CommandError, ErrorCode } from '../../lib/api-types';

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

  // Parse error to get structured information
  const getErrorInfo = () => {
    if (typeof error === 'string') {
      return {
        message: error,
        code: null,
        details: null,
        recovery_guidance: null,
        user_actionable: true,
      };
    }
    return error;
  };

  const errorInfo = getErrorInfo();

  // Determine variant based on error code
  const getVariant = (): VariantProps<typeof errorMessageVariants>['variant'] => {
    if (variant) return variant;

    if (errorInfo.code) {
      // Security errors
      if (
        [
          ErrorCode.INVALID_KEY,
          ErrorCode.WRONG_PASSPHRASE,
          ErrorCode.TAMPERED_DATA,
          ErrorCode.UNAUTHORIZED_ACCESS,
        ].includes(errorInfo.code)
      ) {
        return 'security';
      }

      // Warning-level errors
      if (
        [
          ErrorCode.WEAK_PASSPHRASE,
          ErrorCode.FILE_TOO_LARGE,
          ErrorCode.TOO_MANY_FILES,
          ErrorCode.CONCURRENT_OPERATION,
        ].includes(errorInfo.code)
      ) {
        return 'warning';
      }

      // Info-level errors
      if (
        [
          ErrorCode.MISSING_PARAMETER,
          ErrorCode.INVALID_PATH,
          ErrorCode.KEY_NOT_FOUND,
          ErrorCode.FILE_NOT_FOUND,
        ].includes(errorInfo.code)
      ) {
        return 'info';
      }
    }

    return 'default';
  };

  // Get appropriate icon based on variant
  const getIcon = () => {
    const currentVariant = getVariant();
    switch (currentVariant) {
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      case 'security':
        return Shield;
      default:
        return AlertCircle;
    }
  };

  const IconComponent = getIcon();
  const currentVariant = getVariant();

  // Format error code for display
  const formatErrorCode = (code: ErrorCode): string => {
    return code
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

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
        <div className="flex-1 min-w-0">
          {/* Title */}
          {(title || errorInfo.code) && (
            <div className="flex items-center gap-2 mb-1">
              {title && <h4 className="font-semibold leading-tight">{title}</h4>}
              {errorInfo.code && (
                <span className="text-xs font-mono opacity-70">
                  {formatErrorCode(errorInfo.code)}
                </span>
              )}
            </div>
          )}

          {/* Message */}
          <p className="text-sm leading-relaxed">{errorInfo.message}</p>

          {/* Recovery Guidance */}
          {showRecoveryGuidance && errorInfo.recovery_guidance && (
            <div className="mt-2">
              <p className="text-sm opacity-80">
                <strong>Suggestion:</strong> {errorInfo.recovery_guidance}
              </p>
            </div>
          )}

          {/* Technical Details (for debugging) */}
          {showDetails && errorInfo.details && (
            <details className="mt-3">
              <summary className="text-xs font-medium cursor-pointer opacity-70 hover:opacity-100">
                Technical Details
              </summary>
              <pre className="mt-2 text-xs bg-black/5 dark:bg-white/5 p-2 rounded overflow-x-auto">
                {errorInfo.details}
              </pre>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-3">
            {onRetry && errorInfo.user_actionable && (
              <button
                type="button"
                onClick={onRetry}
                className="text-xs font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
                data-testid="retry-button"
              >
                {retryLabel}
              </button>
            )}
          </div>
        </div>

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
