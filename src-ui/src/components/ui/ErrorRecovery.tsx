import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorRecoveryProps {
  error: Error | string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  recoverySteps?: string[];
  context?: string;
}

const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({
  error,
  onRetry,
  onDismiss,
  showDetails = true,
  recoverySteps = [],
  context,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Default recovery steps based on error type
  const getDefaultRecoverySteps = (): string[] => {
    if (recoverySteps.length > 0) return recoverySteps;

    const steps: string[] = [];
    const lowerMessage = errorMessage.toLowerCase();

    if (lowerMessage.includes('permission') || lowerMessage.includes('access')) {
      steps.push('Check that you have permission to access the selected files');
      steps.push('Try running the application with administrator privileges');
      steps.push('Ensure the files are not open in another application');
    } else if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      steps.push('Check your internet connection');
      steps.push('Verify that your firewall is not blocking the application');
      steps.push('Try again in a few moments');
    } else if (lowerMessage.includes('backend') || lowerMessage.includes('tauri')) {
      steps.push('Restart the application');
      steps.push('Check that all application components are running');
      steps.push('Try using the browse buttons instead of drag-and-drop');
    } else if (lowerMessage.includes('file') || lowerMessage.includes('path')) {
      steps.push('Verify that the file or folder exists');
      steps.push('Check that the path does not contain special characters');
      steps.push('Try selecting a different file or folder');
    } else {
      steps.push('Try the operation again');
      steps.push('Restart the application if the problem persists');
      steps.push('Contact support if the issue continues');
    }

    return steps;
  };

  const steps = getDefaultRecoverySteps();

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-900 mb-1">
            {context || 'An error occurred'}
          </h3>
          <p className="text-sm text-red-700">{errorMessage}</p>

          {/* Recovery Steps */}
          {steps.length > 0 && (
            <div className="mt-3 bg-white bg-opacity-50 rounded p-3">
              <h4 className="text-xs font-semibold text-red-900 mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Suggested Recovery Steps:
              </h4>
              <ol className="list-decimal list-inside space-y-1">
                {steps.map((step, index) => (
                  <li key={index} className="text-xs text-red-700">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Technical Details (Expandable) */}
          {showDetails && errorStack && (
            <div className="mt-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium"
              >
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
                {isExpanded ? 'Hide' : 'Show'} Technical Details
              </button>
              {isExpanded && (
                <div className="mt-2 p-2 bg-red-100 rounded">
                  <pre className="text-xs text-red-800 whitespace-pre-wrap break-words font-mono">
                    {errorStack}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-4">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 text-xs font-medium text-red-700 bg-white hover:bg-red-50 border border-red-300 rounded transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorRecovery;
