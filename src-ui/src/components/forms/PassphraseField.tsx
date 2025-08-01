import React, { useState } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import PassphraseStrengthIndicator from './PassphraseStrengthIndicator';
import { checkPassphraseStrength } from '../../lib/validation/passphrase-validation';

interface PassphraseFieldProps {
  /** Input ID for label association */
  id: string;
  /** Current passphrase value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Input placeholder */
  placeholder?: string;
  /** Show strength indicator */
  showStrength?: boolean;
  /** Value to match against (for confirmation fields) */
  matchValue?: string | null;
  /** Whether the field is required */
  required?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const PassphraseField: React.FC<PassphraseFieldProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Enter passphrase',
  showStrength = false,
  matchValue = null,
  required = false,
  className = '',
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const strength = showStrength ? checkPassphraseStrength(value) : null;
  const isMatch = matchValue !== null ? value === matchValue && value.length > 0 : null;

  const getInputClasses = () => {
    const baseClasses = `
      w-full h-12 pr-12 pl-4 text-base
      border rounded-md transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      hover:border-gray-400
      disabled:bg-gray-50 disabled:cursor-not-allowed
    `.trim();

    if (matchValue !== null && value.length > 0) {
      return isMatch
        ? `${baseClasses} border-green-500 focus:ring-green-500`
        : `${baseClasses} border-red-400 bg-red-50 focus:ring-red-500`;
    }

    return `${baseClasses} border-gray-400`;
  };

  return (
    <div className="space-y-2" data-testid="passphrase-field">
      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${getInputClasses()} ${className}`}
          required={required}
          data-testid="passphrase-input"
          aria-describedby={showStrength ? `${id}-strength` : undefined}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-colors"
          aria-label={showPassword ? 'Hide passphrase' : 'Show passphrase'}
          data-testid="visibility-toggle"
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Eye className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Strength Indicator */}
      {showStrength && strength && (
        <div id={`${id}-strength`} data-testid="strength-indicator">
          <PassphraseStrengthIndicator strength={strength} hasUserTyped={value.length > 0} />
        </div>
      )}

      {/* Match Validation */}
      {isMatch !== null && value && (
        <div className="flex items-center gap-1.5 text-xs" data-testid="match-indicator">
          {isMatch ? (
            <>
              <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
              <span className="text-green-600">Passphrases match</span>
            </>
          ) : (
            <>
              <X className="h-4 w-4 text-red-500" aria-hidden="true" />
              <span className="text-red-600">Passphrases don't match</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PassphraseField;
