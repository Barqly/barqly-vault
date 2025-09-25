import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2, CheckCircle } from 'lucide-react';

import { cn } from '../../lib/utils';
import { ProgressUpdate } from '../../bindings';

const progressBarVariants = cva('relative w-full overflow-hidden rounded-full bg-secondary', {
  variants: {
    size: {
      default: 'h-2',
      sm: 'h-1',
      lg: 'h-3',
    },
    variant: {
      default: 'bg-secondary',
      success: 'bg-green-100 dark:bg-green-900/20',
      error: 'bg-red-100 dark:bg-red-900/20',
      warning: 'bg-yellow-100 dark:bg-yellow-900/20',
    },
  },
  defaultVariants: {
    size: 'default',
    variant: 'default',
  },
});

const progressIndicatorVariants = cva('h-full transition-all duration-300 ease-out', {
  variants: {
    variant: {
      default: 'bg-primary',
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
    },
    animated: {
      true: 'animate-pulse',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    animated: false,
  },
});

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressBarVariants> {
  value?: number; // 0.0 to 1.0
  indeterminate?: boolean;
  showPercentage?: boolean;
  showStatus?: boolean;
  statusMessage?: string;
  estimatedTimeRemaining?: number; // seconds
  onComplete?: () => void;
  progressUpdate?: ProgressUpdate;
  ref?: React.Ref<HTMLDivElement>;
}

function ProgressBar({
  className,
  size,
  variant,
  value = 0,
  indeterminate = false,
  showPercentage = true,
  showStatus = true,
  statusMessage,
  estimatedTimeRemaining,
  onComplete,
  progressUpdate,
  ref,
  ...props
}: ProgressBarProps) {
  // Determine variant based on progress update or props
  const getVariant = (): VariantProps<typeof progressBarVariants>['variant'] => {
    if (progressUpdate) {
      // Use progress update data to determine variant
      if (progressUpdate.progress >= 1.0) return 'success';
      // Could add error detection here based on progress update
    }
    return variant || 'default';
  };

  // Format time remaining
  const formatTimeRemaining = (seconds?: number): string => {
    if (!seconds || seconds <= 0) return '';

    if (seconds < 60) {
      return `${Math.round(seconds)}s remaining`;
    } else if (seconds < 3600) {
      const minutes = Math.round(seconds / 60);
      return `${minutes}m remaining`;
    } else {
      const hours = Math.round(seconds / 3600);
      return `${hours}h remaining`;
    }
  };

  // Get status message from progress update or props
  const getStatusMessage = (): string => {
    if (progressUpdate?.message) {
      return progressUpdate.message;
    }
    if (statusMessage) {
      return statusMessage;
    }
    if (indeterminate) {
      return 'Processing...';
    }
    if (value >= 1.0) {
      return 'Complete';
    }
    return 'In progress...';
  };

  // Get time remaining from progress update or props
  const getTimeRemaining = (): string => {
    if (progressUpdate?.estimated_time_remaining) {
      return formatTimeRemaining(progressUpdate.estimated_time_remaining);
    }
    return formatTimeRemaining(estimatedTimeRemaining);
  };

  // Call onComplete when progress reaches 100%
  React.useEffect(() => {
    if (value >= 1.0 && onComplete) {
      onComplete();
    }
  }, [value, onComplete]);

  const currentVariant = getVariant();
  const isComplete = value >= 1.0;
  const isIndeterminate = indeterminate;

  // Get the actual progress value to display
  const getProgressValue = (): number => {
    if (progressUpdate) {
      return progressUpdate.progress;
    }
    return value;
  };

  const progressValue = getProgressValue();
  const clampedProgress = Math.min(Math.max(progressValue, 0), 1);

  return (
    <div
      ref={ref}
      className={cn('w-full space-y-2', className)}
      role="progressbar"
      aria-valuenow={isIndeterminate ? undefined : Math.round(clampedProgress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={getStatusMessage()}
      {...props}
    >
      {/* Progress Bar */}
      <div className={cn(progressBarVariants({ size, variant: currentVariant }))}>
        {isIndeterminate ? (
          // Indeterminate progress (spinning animation)
          <div className="h-full w-full">
            <div className="h-full w-1/3 bg-primary animate-pulse rounded-full" />
          </div>
        ) : (
          // Determinate progress
          <div
            className={cn(
              progressIndicatorVariants({
                variant: currentVariant,
                animated: !isComplete,
              }),
            )}
            style={{ width: `${clampedProgress * 100}%` }}
          />
        )}
      </div>

      {/* Status Information */}
      {showStatus && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {isIndeterminate ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isComplete ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <div className="h-4 w-4" />
            )}
            <span className="font-medium">{getStatusMessage()}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Percentage */}
            {showPercentage && !isIndeterminate && (
              <span className="font-mono text-xs">{Math.round(clampedProgress * 100)}%</span>
            )}

            {/* Time Remaining */}
            {getTimeRemaining() && <span className="text-xs opacity-75">{getTimeRemaining()}</span>}
          </div>
        </div>
      )}

      {/* Progress Details (if available) */}
      {progressUpdate?.details && (
        <div className="text-xs text-muted-foreground space-y-1">
          {progressUpdate.details.type === 'FileOperation' && (
            <div className="flex justify-between">
              <span>
                File {progressUpdate.details.current_file_progress} of{' '}
                {progressUpdate.details.total_files}
              </span>
              <span>{progressUpdate.details.current_file}</span>
            </div>
          )}
          {progressUpdate.details.type === 'Encryption' && (
            <div className="flex justify-between">
              <span>Encrypting...</span>
              <span>
                {Math.round(progressUpdate.details.bytes_processed / 1024 / 1024)}MB /
                {Math.round(progressUpdate.details.total_bytes / 1024 / 1024)}MB
              </span>
            </div>
          )}
          {progressUpdate.details.type === 'Decryption' && (
            <div className="flex justify-between">
              <span>Decrypting...</span>
              <span>
                {Math.round(progressUpdate.details.bytes_processed / 1024 / 1024)}MB /
                {Math.round(progressUpdate.details.total_bytes / 1024 / 1024)}MB
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

ProgressBar.displayName = 'ProgressBar';

export { ProgressBar, progressBarVariants, progressIndicatorVariants };
