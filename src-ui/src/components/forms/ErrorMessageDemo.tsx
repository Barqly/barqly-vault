import React, { useState } from 'react';
import { ErrorMessage } from '@/components/ui/error-message';
import { Button } from '@/components/ui/button';
import { CommandError, ErrorCode } from '@/lib/api-types';

const ErrorMessageDemo: React.FC = () => {
  const [currentError, setCurrentError] = useState<CommandError | string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const demoErrors: Array<{
    name: string;
    error: CommandError | string;
    description: string;
  }> = [
    {
      name: 'Validation Error',
      error: {
        code: ErrorCode.INVALID_INPUT,
        message: 'Please provide a valid key label',
        recovery_guidance: 'Use only letters, numbers, and dashes for key labels',
        user_actionable: true,
      },
      description: 'User can fix this by correcting their input',
    },
    {
      name: 'Security Error',
      error: {
        code: ErrorCode.WRONG_PASSPHRASE,
        message: 'Incorrect passphrase provided',
        recovery_guidance: 'Please check your passphrase and try again',
        user_actionable: true,
      },
      description: 'Critical security error with user guidance',
    },
    {
      name: 'Warning Error',
      error: {
        code: ErrorCode.WEAK_PASSPHRASE,
        message: 'Your passphrase is weak',
        recovery_guidance: 'Use a stronger passphrase with letters, numbers, and symbols',
        user_actionable: true,
      },
      description: 'Warning-level error with improvement suggestions',
    },
    {
      name: 'Info Error',
      error: {
        code: ErrorCode.FILE_NOT_FOUND,
        message: 'The selected file could not be found',
        recovery_guidance: 'Please check the file path and try again',
        user_actionable: true,
      },
      description: 'Informational error with helpful guidance',
    },
    {
      name: 'System Error',
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An internal error occurred',
        details:
          'Error ID: ERR-12345\nTimestamp: 2024-01-15T10:30:00Z\nComponent: crypto_ops.rs:45',
        recovery_guidance: 'Please restart the application and try again',
        user_actionable: false,
      },
      description: 'System error that requires application restart',
    },
    {
      name: 'Simple String Error',
      error: 'Something went wrong with the operation',
      description: 'Basic string error for simple cases',
    },
  ];

  const handleRetry = () => {
    console.log('Retry action triggered');
    setCurrentError(null);
  };

  const handleClose = () => {
    setCurrentError(null);
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">ErrorMessage Component Demo</h2>
        <p className="text-muted-foreground">
          Explore different error types and their display variations
        </p>
      </div>

      {/* Error Display Area */}
      <div className="border rounded-lg p-4 bg-muted/20">
        <h3 className="text-lg font-semibold mb-4">Current Error Display</h3>
        <ErrorMessage
          error={currentError}
          showCloseButton={true}
          showDetails={showDetails}
          onClose={handleClose}
          onRetry={handleRetry}
          retryLabel="Try Again"
        />
        {!currentError && (
          <p className="text-muted-foreground text-center py-8">
            Select an error type below to see it displayed
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 justify-center">
        <Button
          variant="outline"
          onClick={() => setShowDetails(!showDetails)}
          disabled={!currentError}
        >
          {showDetails ? 'Hide' : 'Show'} Technical Details
        </Button>
        <Button variant="outline" onClick={() => setCurrentError(null)} disabled={!currentError}>
          Clear Error
        </Button>
      </div>

      {/* Error Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {demoErrors.map((demoError, index) => (
          <div
            key={index}
            className="border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => setCurrentError(demoError.error)}
          >
            <h4 className="font-semibold mb-2">{demoError.name}</h4>
            <p className="text-sm text-muted-foreground mb-3">{demoError.description}</p>
            <div className="text-xs font-mono bg-muted p-2 rounded">
              {typeof demoError.error === 'string'
                ? 'String Error'
                : `Code: ${demoError.error.code}`}
            </div>
          </div>
        ))}
      </div>

      {/* Variant Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">All Variants</h3>
        <div className="space-y-4">
          <ErrorMessage error="This is a default error message" title="Default Error" />
          <ErrorMessage error="This is a warning message" variant="warning" title="Warning" />
          <ErrorMessage
            error="This is an informational message"
            variant="info"
            title="Information"
          />
          <ErrorMessage
            error="This is a security-related error"
            variant="security"
            title="Security Alert"
          />
        </div>
      </div>

      {/* Size Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Different Sizes</h3>
        <div className="space-y-4">
          <ErrorMessage error="Small error message" size="sm" title="Small" />
          <ErrorMessage error="Default size error message" title="Default" />
          <ErrorMessage error="Large error message with more content" size="lg" title="Large" />
        </div>
      </div>

      {/* Interactive Example */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Interactive Example</h3>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() =>
                setCurrentError({
                  code: ErrorCode.ENCRYPTION_FAILED,
                  message: 'Encryption failed due to insufficient disk space',
                  recovery_guidance: 'Please free up some disk space and try again',
                  user_actionable: true,
                })
              }
            >
              Show Encryption Error
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setCurrentError({
                  code: ErrorCode.PERMISSION_DENIED,
                  message: 'Permission denied for the selected file',
                  recovery_guidance: 'Please check file permissions or select a different file',
                  user_actionable: true,
                })
              }
            >
              Show Permission Error
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessageDemo;
