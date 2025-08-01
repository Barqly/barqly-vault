import React, { forwardRef } from 'react';
import { Check, AlertCircle } from 'lucide-react';

interface EnhancedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'size'> {
  /** Input label text */
  label: string;
  /** Whether the field is required */
  required?: boolean;
  /** Helper text to show below input */
  helper?: string;
  /** Error message to display */
  error?: string;
  /** Success state indicator */
  success?: boolean;
  /** Input size variant */
  size?: 'default' | 'large';
  /** Full width input */
  fullWidth?: boolean;
  /** Input ID for label association */
  id: string;
}

const EnhancedInput = forwardRef<HTMLInputElement, EnhancedInputProps>(
  (
    {
      label,
      required = false,
      helper,
      error,
      success = false,
      size = 'default',
      fullWidth = true,
      id,
      className = '',
      ...props
    },
    ref,
  ) => {
    const sizeClasses = {
      default: 'h-10 px-3 py-2.5 text-sm',
      large: 'h-11 px-3.5 py-2.5 text-base',
    };

    const getInputClasses = () => {
      const baseClasses = `
      ${fullWidth ? 'w-full' : ''}
      ${sizeClasses[size]}
      border rounded-md transition-all duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      hover:border-gray-400 hover:shadow-sm
      disabled:bg-gray-50 disabled:cursor-not-allowed
      transform focus:scale-[1.02] hover:scale-[1.01]
    `.trim();

      if (error) {
        return `${baseClasses} border-red-400 bg-red-50 focus:ring-red-500`;
      } else if (success) {
        return `${baseClasses} border-green-500 focus:ring-green-500`;
      } else {
        return `${baseClasses} border-gray-400`;
      }
    };

    return (
      <div className="space-y-1" data-testid="enhanced-input-container">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700"
          data-testid="input-label"
        >
          {label}{' '}
          {required && (
            <span className="text-red-500" aria-label="required">
              *
            </span>
          )}
        </label>

        <div className="relative">
          <input
            ref={ref}
            id={id}
            className={`${getInputClasses()} ${className}`}
            data-testid="enhanced-input"
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={helper || error ? `${id}-description` : undefined}
            {...props}
          />

          {success && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Check
                className="h-5 w-5 text-green-500"
                aria-hidden="true"
                data-testid="success-icon"
              />
            </div>
          )}

          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <AlertCircle
                className="h-5 w-5 text-red-500"
                aria-hidden="true"
                data-testid="error-icon"
              />
            </div>
          )}
        </div>

        {(helper || error) && (
          <div id={`${id}-description`} className="space-y-1">
            {error && (
              <p className="text-xs text-red-600" role="alert" data-testid="error-message">
                {error}
              </p>
            )}
            {helper && !error && (
              <p className="text-xs text-gray-500" data-testid="helper-text">
                {helper}
              </p>
            )}
          </div>
        )}
      </div>
    );
  },
);

EnhancedInput.displayName = 'EnhancedInput';

export default EnhancedInput;
