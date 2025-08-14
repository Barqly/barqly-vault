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
      w-full rounded-lg px-4 py-3 pr-12
      text-[15px] text-slate-800 placeholder:text-slate-400
      bg-white border
      outline-none transition
      focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white
    `.trim();

    if (matchValue !== null && value.length > 0) {
      return isMatch ? `${baseClasses} border-green-600` : `${baseClasses} border-red-600`;
    }

    // Show green border for strong passphrase when showing strength
    if (showStrength && strength && strength.isStrong && value.length > 0) {
      return `${baseClasses} border-green-600`;
    }

    return `${baseClasses} border-slate-200`;
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
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-md transition-colors"
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
        <div className="mt-2 inline-flex items-center gap-2 text-sm">
          {isMatch ? (
            <>
              <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
              <span className="text-green-600">Passphrases match</span>
            </>
          ) : (
            <>
              <X className="h-4 w-4 text-red-600" aria-hidden="true" />
              <span className="text-red-600">Passphrases don't match</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PassphraseField;
