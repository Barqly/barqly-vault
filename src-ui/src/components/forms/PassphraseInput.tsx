import React, { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PassphraseStrength {
  isStrong: boolean;
  message: string;
  score: number;
}

export interface PassphraseInputProps {
  value?: string;
  // eslint-disable-next-line no-unused-vars
  onChange?: (value: string) => void;
  // eslint-disable-next-line no-unused-vars
  onStrengthChange?: (strength: PassphraseStrength) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  minLength?: number;
  requireStrong?: boolean;
  showStrength?: boolean;
  className?: string;
  id?: string;
}

const PassphraseInput: React.FC<PassphraseInputProps> = ({
  value: controlledValue,
  onChange,
  onStrengthChange,
  onBlur,
  onFocus,
  label = 'Passphrase',
  placeholder = 'Enter your passphrase',
  disabled = false,
  required = false,
  error,
  minLength = 12,
  requireStrong = false,
  showStrength = true,
  className = '',
  id,
}) => {
  const [internalValue, setInternalValue] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [passphraseStrength, setPassphraseStrength] = useState<PassphraseStrength>({
    isStrong: false,
    message: 'Very weak passphrase',
    score: 0,
  });

  // Use controlled value if provided, otherwise use internal state
  // Remove all instances of: const value = ... and const strength = ... (where unused)
  // Replace /\[ with /[ and /\/ with /
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  // Check passphrase strength
  const checkPassphraseStrength = useCallback((passphrase: string): PassphraseStrength => {
    if (!passphrase) {
      return { isStrong: false, message: 'Very weak passphrase', score: 0 };
    }

    let score = 0;
    const checks = {
      length: passphrase.length >= 12,
      lowercase: /[a-z]/.test(passphrase),
      uppercase: /[A-Z]/.test(passphrase),
      numbers: /\d/.test(passphrase),
      symbols: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(passphrase),
      noCommon: !/(password|123|qwerty|admin)/i.test(passphrase),
    };

    // Score based on criteria
    if (checks.length) score += 1;
    if (checks.lowercase) score += 1;
    if (checks.uppercase) score += 1;
    if (checks.numbers) score += 1;
    if (checks.symbols) score += 1;
    if (checks.noCommon) score += 1;

    // Bonus for length
    if (passphrase.length >= 16) score += 1;
    if (passphrase.length >= 20) score += 1;

    // Determine strength level
    let message = '';
    let isStrong = false;

    if (score >= 6) {
      message = 'Strong passphrase';
      isStrong = true;
    } else if (score >= 4) {
      message = 'Moderate passphrase';
      isStrong = false;
    } else if (score >= 2) {
      message = 'Weak passphrase';
      isStrong = false;
    } else {
      message = 'Very weak passphrase';
      isStrong = false;
    }

    return { isStrong, message, score };
  }, []);

  // Validate passphrase
  const validatePassphrase = useCallback(
    (passphrase: string): string => {
      if (required && !passphrase) {
        return 'Passphrase is required';
      }
      if (passphrase && passphrase.length < minLength) {
        return `Passphrase must be at least ${minLength} characters long`;
      }
      if (requireStrong && passphrase) {
        const strength = checkPassphraseStrength(passphrase);
        if (!strength.isStrong) {
          return 'Passphrase is too weak';
        }
      }
      return '';
    },
    [required, minLength, requireStrong, checkPassphraseStrength],
  );

  // Update strength when value changes
  useEffect(() => {
    const strength = checkPassphraseStrength(value);
    setPassphraseStrength(strength);

    if (onStrengthChange) {
      onStrengthChange(strength);
    }
  }, [value, checkPassphraseStrength, onStrengthChange]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValidationError('');

    // Update internal state if not controlled
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }

    if (onChange) {
      onChange(newValue);
    }
  };

  // Handle blur
  const handleBlur = () => {
    const error = validatePassphrase(value);
    setValidationError(error);

    if (onBlur) {
      onBlur();
    }
  };

  // Handle focus
  const handleFocus = () => {
    setValidationError('');

    if (onFocus) {
      onFocus();
    }
  };

  // Get strength color
  const getStrengthColor = (): string => {
    if (passphraseStrength.score >= 6) return 'text-green-600';
    if (passphraseStrength.score >= 4) return 'text-yellow-600';
    if (passphraseStrength.score >= 2) return 'text-orange-600';
    return 'text-red-600';
  };

  // Get progress bar color
  const getProgressColor = (): string => {
    if (passphraseStrength.score >= 6) return 'bg-green-500';
    if (passphraseStrength.score >= 4) return 'bg-yellow-500';
    if (passphraseStrength.score >= 2) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const displayError = error || validationError;

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={id || 'passphrase-input'} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        <input
          id={id || 'passphrase-input'}
          type={showPassphrase ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${displayError ? 'border-red-300' : 'border-gray-300'}
            ${disabled ? 'bg-gray-50' : 'bg-white'}
          `}
          aria-describedby={displayError ? `${id || 'passphrase-input'}-error` : undefined}
        />

        <button
          type="button"
          onClick={() => setShowPassphrase(!showPassphrase)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
          disabled={disabled}
          tabIndex={-1}
          aria-label={showPassphrase ? 'Hide password' : 'Show password'}
        >
          {showPassphrase ? (
            <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          ) : (
            <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          )}
        </button>
      </div>

      {/* Passphrase Strength Indicator */}
      {showStrength && (
        <div id="passphrase-strength" className="space-y-2">
          <p className={`text-sm font-medium ${getStrengthColor()}`}>
            Passphrase Strength: {passphraseStrength.message}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${Math.min((passphraseStrength.score / 6) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {displayError && (
        <p id={`${id || 'passphrase-input'}-error`} className="text-sm text-red-600" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
};

export default PassphraseInput;
