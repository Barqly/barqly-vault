import { ParsedErrorInfo, formatErrorCode } from '../../lib/errors/error-formatting';

interface ErrorMessageContentProps {
  errorInfo: ParsedErrorInfo;
  title?: string;
  showRecoveryGuidance?: boolean;
  showDetails?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorMessageContent({
  errorInfo,
  title,
  showRecoveryGuidance = true,
  showDetails = false,
  onRetry,
  retryLabel = 'Retry',
}: ErrorMessageContentProps) {
  return (
    <div className="flex-1 min-w-0">
      {/* Title */}
      {(title || errorInfo.code) && (
        <div className="flex items-center gap-2 mb-1">
          {title && <h4 className="font-semibold leading-tight">{title}</h4>}
          {errorInfo.code && (
            <span className="text-xs font-mono opacity-70">{formatErrorCode(errorInfo.code)}</span>
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
      {onRetry && errorInfo.user_actionable && (
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={onRetry}
            className="text-xs font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded"
            data-testid="retry-button"
          >
            {retryLabel}
          </button>
        </div>
      )}
    </div>
  );
}
