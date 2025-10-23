import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PassphraseVisibilityToggleProps {
  isVisible: boolean;
  onToggle: () => void;
  disabled?: boolean;
  className?: string;
}

const PassphraseVisibilityToggle: React.FC<PassphraseVisibilityToggleProps> = ({
  isVisible,
  onToggle,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`absolute inset-y-0 right-0 pr-3 flex items-center ${className}`}
      disabled={disabled}
      tabIndex={-1}
      aria-label={isVisible ? 'Hide password' : 'Show password'}
    >
      {isVisible ? (
        <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400" />
      ) : (
        <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400" />
      )}
    </button>
  );
};

export default PassphraseVisibilityToggle;
