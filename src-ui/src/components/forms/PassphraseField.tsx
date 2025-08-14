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
      w-full rounded-lg h-12 px-4 pr-12
      text-slate-900 placeholder:text-slate-400
      bg-white border
      outline-none transition
      focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-500
    `.trim();

    if (matchValue !== null && value.length > 0) {
      return isMatch ? `${baseClasses} border-green-400` : `${baseClasses} border-red-400`;
    }

    // Show green border for strong passphrase when showing strength
    if (showStrength && strength && strength.isStrong && value.length > 0) {
      return `${baseClasses} border-green-400`;
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
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-md text-slate-500 hover:text-slate-700 transition-colors"
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

      {/* Match Validation - Reserved space to prevent jumps */}
      <div className="h-6 mt-1">
        {isMatch !== null && value && (
          <div className="inline-flex items-center gap-2 text-sm">
            {isMatch ? (
              <>
                <Check className="h-4 w-4 text-green-700" aria-hidden="true" />
                <span className="text-green-700">Passphrases match</span>
              </>
            ) : (
              <>
                <X className="h-4 w-4 text-red-700" aria-hidden="true" />
                <span className="text-red-700">Passphrases don't match</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PassphraseField;
