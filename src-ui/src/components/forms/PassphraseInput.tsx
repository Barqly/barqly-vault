import React, { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import zxcvbn from 'zxcvbn';

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
  // New props for confirmation field behavior
  isConfirmationField?: boolean;
  originalPassphrase?: string;
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
  isConfirmationField = false,
  originalPassphrase = '',
}) => {
  const [internalValue, setInternalValue] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [validationError, setValidationError] = useState<string>('');
  const [passphraseStrength, setPassphraseStrength] = useState<PassphraseStrength>({
    isStrong: false,
    message: 'Very weak passphrase',
    score: 0,
  });
  const [hasUserTyped, setHasUserTyped] = useState(false);

  // Use controlled value if provided, otherwise use internal state
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  // Check passphrase strength using zxcvbn with Bitcoin custody requirements
  const checkPassphraseStrength = useCallback((passphrase: string): PassphraseStrength => {
    if (!passphrase) {
      return { isStrong: false, message: 'Very weak passphrase', score: 0 };
    }

    // Use zxcvbn for base assessment
    const result = zxcvbn(passphrase);

    // Bitcoin custody security requirements
    const hasUppercase = /[A-Z]/.test(passphrase);
    const hasLowercase = /[a-z]/.test(passphrase);
    const hasNumbers = /\d/.test(passphrase);
    const hasSymbols = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(passphrase);
    const isLongEnough = passphrase.length >= 16;

    // Count character types
    const charTypes = [hasUppercase, hasLowercase, hasNumbers, hasSymbols].filter(Boolean).length;

    // Additional security checks for Bitcoin custody
    const commonNames =
      /(alice|bob|charlie|david|eve|frank|grace|henry|iris|jack|kate|lisa|mary|nancy|oliver|peter|queen|robert|sarah|tom|una|victor|wendy|xavier|yuki|zoe)/i;
    const sequentialPatterns =
      /(123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i;
    const repeatingPatterns = /(.)\1{2,}/; // 3+ repeated characters
    const keyboardPatterns = /(qwerty|asdfgh|zxcvbn|123456|654321|qazwsx|edcrfv|tgbyhn|ujmikl)/i;

    // Check for specific security issues
    const hasCommonName = commonNames.test(passphrase);
    const hasSequentialPattern = sequentialPatterns.test(passphrase);
    const hasRepeatingPattern = repeatingPatterns.test(passphrase);
    const hasKeyboardPattern = keyboardPatterns.test(passphrase);

    // Bitcoin custody requirements: 16+ chars, 3+ character types, good zxcvbn score, no security issues
    const meetsBitcoinStandards =
      isLongEnough &&
      charTypes >= 3 &&
      result.score >= 3 &&
      !hasCommonName &&
      !hasSequentialPattern &&
      !hasRepeatingPattern &&
      !hasKeyboardPattern;

    let message = '';
    let isStrong = false;

    if (meetsBitcoinStandards) {
      if (result.score === 4 && charTypes === 4) {
        message = 'Excellent passphrase';
        isStrong = true;
      } else if (result.score >= 3) {
        message = 'Strong passphrase';
        isStrong = true;
      }
    } else {
      if (!isLongEnough) {
        message = 'Too short - use at least 16 characters';
      } else if (charTypes < 3) {
        message = `Include more character types (${charTypes}/4): uppercase, lowercase, numbers, symbols`;
      } else if (hasCommonName) {
        message = 'Avoid common names - use random words instead';
      } else if (hasSequentialPattern) {
        message = 'Avoid sequential patterns like "123" or "abc"';
      } else if (hasRepeatingPattern) {
        message = 'Avoid repeating characters';
      } else if (hasKeyboardPattern) {
        message = 'Avoid keyboard patterns';
      } else if (result.score < 3) {
        message = 'Too predictable - avoid patterns and common sequences';
      } else {
        message = 'Moderate passphrase';
      }
      isStrong = false;
    }

    return {
      isStrong,
      message,
      score: result.score * 3, // Scale to 0-12 for progress bar
    };
  }, []);

  // Check if confirmation matches
  const checkConfirmationMatch = useCallback((confirmation: string, original: string) => {
    if (!confirmation) return { matches: false, message: '' };
    if (confirmation === original) {
      return { matches: true, message: 'Passphrases match' };
    }
    return { matches: false, message: "Passphrases don't match" };
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
    setHasUserTyped(true);

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
    if (passphraseStrength.score >= 9) return 'text-green-600';
    if (passphraseStrength.score >= 6) return 'text-yellow-600';
    if (passphraseStrength.score >= 3) return 'text-orange-600';
    return 'text-red-600';
  };

  // Get progress bar color
  const getProgressColor = (): string => {
    if (passphraseStrength.score >= 9) return 'bg-green-500';
    if (passphraseStrength.score >= 6) return 'bg-yellow-500';
    if (passphraseStrength.score >= 3) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const displayError = error || validationError;

  // For confirmation field, check match status
  const confirmationMatch = isConfirmationField
    ? checkConfirmationMatch(value, originalPassphrase)
    : null;

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

      {/* Passphrase Strength Indicator - Only for first field */}
      {showStrength && !isConfirmationField && (
        <div id="passphrase-strength" className="space-y-2">
          {!hasUserTyped ? (
            // Default state - show neutral message
            <p className="text-sm font-medium text-gray-500">Passphrase Strength:</p>
          ) : (
            // User has typed - show strength with color and progress bar
            <>
              <p className={`text-sm font-medium ${getStrengthColor()}`}>
                Passphrase Strength: {passphraseStrength.message}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                  style={{ width: `${Math.min((passphraseStrength.score / 12) * 100, 100)}%` }}
                />
              </div>
              {/* Security guidance */}
              <div className="text-xs text-gray-600 space-y-1">
                <p>• Minimum 16 characters for Bitcoin custody security</p>
                <p>• Include at least 3 character types: uppercase, lowercase, numbers, symbols</p>
                <p>• You can use any words, but mix them with numbers and symbols</p>
                <p>• Avoid predictable patterns like "123" or "abc"</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Confirmation Match Indicator - Only for confirmation field */}
      {isConfirmationField && value && (
        <div id="passphrase-confirmation" className="space-y-2">
          <p
            className={`text-sm font-medium ${confirmationMatch?.matches ? 'text-green-600' : 'text-red-600'}`}
          >
            {confirmationMatch?.message}
          </p>
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
