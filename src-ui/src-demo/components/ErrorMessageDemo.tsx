import React, { useState } from 'react';
import { ErrorMessage } from '@/components/ui/error-message';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, Info, Shield, RefreshCw } from 'lucide-react';
import BackToDemos from './back-to-demos';
import { CommandError, ErrorCode } from '@/lib/api-types';

const ErrorMessageDemo: React.FC = () => {
  const [currentError, setCurrentError] = useState<CommandError | string | null>(null);
  const [currentScenario, setCurrentScenario] = useState<string>('');

  const demoScenarios = [
    {
      name: 'File Not Found Error',
      description: 'Shows file system error with recovery guidance',
      error: {
        code: ErrorCode.FILE_NOT_FOUND,
        message: 'The specified file could not be found',
        details: 'wallet.dat',
        recovery_guidance: 'Please check the file path and ensure the file exists',
        user_actionable: true,
      } as CommandError,
      variant: 'default' as const,
      showRecoveryGuidance: true,
      showDetails: true,
    },
    {
      name: 'Invalid Passphrase Error',
      description: 'Shows authentication error with retry option',
      error: {
        code: ErrorCode.WRONG_PASSPHRASE,
        message: 'The provided passphrase is incorrect',
        details: 'Attempt 3 of 5',
        recovery_guidance: 'Please verify your passphrase and try again',
        user_actionable: true,
      } as CommandError,
      variant: 'security' as const,
      showRecoveryGuidance: true,
      showDetails: false,
    },
    {
      name: 'Network Connection Error',
      description: 'Shows network error with retry functionality',
      error: {
        code: ErrorCode.NETWORK_ERROR,
        message: 'Failed to connect to the server',
        details: 'Connection timeout after 30 seconds',
        recovery_guidance: 'Please check your internet connection and try again',
        user_actionable: true,
      } as CommandError,
      variant: 'warning' as const,
      showRecoveryGuidance: true,
      showDetails: true,
    },
    {
      name: 'Permission Denied Error',
      description: 'Shows permission error with guidance',
      error: {
        code: ErrorCode.PERMISSION_DENIED,
        message: 'Access denied to the specified directory',
        details: '/usr/local/bin/',
        recovery_guidance: 'Please run the application with appropriate permissions',
        user_actionable: true,
      } as CommandError,
      variant: 'default' as const,
      showRecoveryGuidance: true,
      showDetails: true,
    },
    {
      name: 'Simple String Error',
      description: 'Shows basic string error message',
      error: 'Something went wrong. Please try again later.',
      variant: 'info' as const,
      showRecoveryGuidance: false,
      showDetails: false,
    },
    {
      name: 'Encryption Failed Error',
      description: 'Shows encryption error with technical details',
      error: {
        code: ErrorCode.ENCRYPTION_FAILED,
        message: 'Failed to encrypt the file',
        details: 'age encryption library error: invalid recipient key format',
        recovery_guidance: 'Please verify your encryption key and try again',
        user_actionable: true,
      } as CommandError,
      variant: 'security' as const,
      showRecoveryGuidance: true,
      showDetails: true,
    },
  ];

  const handleShowError = (scenario: (typeof demoScenarios)[0]) => {
    setCurrentScenario(scenario.name);
    setCurrentError(scenario.error);
  };

  const handleRetry = () => {
    console.log('Retry action triggered');
    // Simulate retry logic
    setTimeout(() => {
      setCurrentError(null);
      setCurrentScenario('');
    }, 1000);
  };

  const handleClose = () => {
    setCurrentError(null);
    setCurrentScenario('');
  };

  const getErrorIcon = (variant: string) => {
    switch (variant) {
      case 'security':
        return Shield;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return AlertCircle;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <BackToDemos className="mb-4" />

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">ErrorMessage Component Demo</h2>
            <p className="text-gray-600">
              Interactive demonstration of the ErrorMessage component with various error scenarios.
            </p>
          </div>
          <div className="text-sm text-gray-500 font-mono">Task 4.2.2.2</div>
        </div>
      </div>

      {/* Demo Controls */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Demo Scenarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demoScenarios.map((scenario, index) => {
            const Icon = getErrorIcon(scenario.variant);
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4 text-gray-500" />
                    <h4 className="font-medium">{scenario.name}</h4>
                  </div>
                  <Button
                    onClick={() => handleShowError(scenario)}
                    size="sm"
                    className="inline-flex items-center space-x-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Show Error</span>
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      scenario.variant === 'security'
                        ? 'bg-red-100 text-red-700'
                        : scenario.variant === 'warning'
                          ? 'bg-yellow-100 text-yellow-700'
                          : scenario.variant === 'info'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {scenario.variant}
                  </span>
                  {scenario.showRecoveryGuidance && (
                    <span className="text-green-600">• Recovery Guidance</span>
                  )}
                  {scenario.showDetails && (
                    <span className="text-blue-600">• Technical Details</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center space-x-4">
        <Button
          onClick={handleClose}
          disabled={!currentError}
          variant="outline"
          className="inline-flex items-center space-x-2"
        >
          <AlertCircle className="w-4 h-4" />
          <span>Clear Error</span>
        </Button>
        <Button
          onClick={handleRetry}
          disabled={!currentError}
          variant="outline"
          className="inline-flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Simulate Retry</span>
        </Button>
      </div>

      {/* Current Error Display */}
      {currentError && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Current Error: {currentScenario}</h3>
            <div className="text-sm text-gray-500">
              {typeof currentError === 'string' ? 'String Error' : `Code: ${currentError.code}`}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            <ErrorMessage
              error={currentError}
              showRecoveryGuidance={true}
              showDetails={true}
              onRetry={handleRetry}
              onClose={handleClose}
              showCloseButton={true}
              retryLabel="Try Again"
            />
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <div>
              <strong>Error Type:</strong>{' '}
              {typeof currentError === 'string' ? 'String' : 'CommandError'}
            </div>
            {typeof currentError !== 'string' && (
              <>
                <div>
                  <strong>Error Code:</strong> {currentError.code}
                </div>
                <div>
                  <strong>Details:</strong> {currentError.details}
                </div>
                <div>
                  <strong>Suggestion:</strong> {currentError.recovery_guidance}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Component Features */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Component Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">Error Types</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• CommandError - Structured backend errors</li>
              <li>• String errors - Simple text messages</li>
              <li>• Error codes - Categorized error types</li>
              <li>• Error details - Technical information</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Visual Variants</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Default - Standard error styling</li>
              <li>• Security - Red styling for security issues</li>
              <li>• Warning - Yellow styling for warnings</li>
              <li>• Info - Blue styling for information</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Interactive Features</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Retry button with custom labels</li>
              <li>• Close button to dismiss errors</li>
              <li>• Expandable technical details</li>
              <li>• Recovery guidance suggestions</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Accessibility</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• ARIA live regions for screen readers</li>
              <li>• Proper error role and labels</li>
              <li>• Keyboard navigation support</li>
              <li>• Focus management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessageDemo;
