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
      w-full h-11 pr-12 pl-3.5 py-2.5 text-base
      border rounded-md transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent
      hover:border-slate-400
      disabled:bg-gray-50 disabled:cursor-not-allowed
      placeholder:text-gray-400
    `.trim();

    if (matchValue !== null && value.length > 0) {
      return isMatch
        ? `${baseClasses} border-green-400 focus:ring-green-400`
        : `${baseClasses} border-red-300 bg-red-50 focus:ring-red-300`;
    }

    return `${baseClasses} border-slate-300`;
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${getInputClasses()} ${className}`}
          required={required}
          aria-describedby={showStrength ? `${id}-strength` : undefined}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-colors"
          aria-label={showPassword ? 'Hide passphrase' : 'Show passphrase'}
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
        <div id={`${id}-strength`}>
          <PassphraseStrengthIndicator strength={strength} hasUserTyped={value.length > 0} />
        </div>
      )}

      {/* Match Validation */}
      {isMatch !== null && value && (
        <div className="flex items-center gap-1.5 text-sm mt-2">
          {isMatch ? (
            <>
              <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
              <span className="text-green-600 font-normal">Passphrases match</span>
            </>
          ) : (
            <>
              <X className="h-4 w-4 text-red-400" aria-hidden="true" />
              <span className="text-red-500 font-normal">Passphrases don't match</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PassphraseField;
