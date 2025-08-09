import React from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button content */
  children: React.ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Show arrow icon */
  showIcon?: boolean;
  /** Button size variant */
  size?: 'small' | 'default' | 'large';
  /** Full width button */
  fullWidth?: boolean;
  /** Loading text override */
  loadingText?: string;
}

const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  loading = false,
  showIcon = true,
  size = 'default',
  fullWidth = false,
  loadingText = 'Processing...',
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    small: 'h-10 px-4 text-sm',
    default: 'h-12 px-6 text-base',
    large: 'h-14 px-8 text-lg',
  };

  const baseClasses = `
    inline-flex items-center justify-center gap-2
    font-medium text-white
    bg-blue-600 hover:bg-blue-700
    rounded-md transition-all duration-200 ease-in-out
    hover:shadow-md hover:-translate-y-0.5
    active:translate-y-0 active:shadow-sm active:scale-95
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    disabled:hover:translate-y-0 disabled:hover:shadow-none
    disabled:hover:bg-blue-600
    min-h-[44px] touch-manipulation
  `.trim();

  const widthClass = fullWidth ? 'w-full' : '';
  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${widthClass}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <>
          <Loader2
            className="h-5 w-5 animate-spin"
            aria-hidden="true"
          />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          {showIcon && (
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          )}
        </>
      )}
    </button>
  );
};

export default PrimaryButton;
