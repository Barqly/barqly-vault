import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';

export interface PassphraseStrength {
  isStrong: boolean;
  message: string;
  score: number;
}

export interface PassphraseInputProps {
  value?: string;

  onChange?: (value: string) => void;

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
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  // Use controlled value if provided, otherwise use internal state
  const value = controlledValue !== undefined ? controlledValue : internalValue;

  // Check passphrase strength with clear Bitcoin custody requirements
  const checkPassphraseStrength = useCallback((passphrase: string): PassphraseStrength => {
    if (!passphrase) {
      return { isStrong: false, message: 'Enter a passphrase', score: 0 };
    }

    // Clear security requirements - ALL must be true for strong passphrase
    const hasUppercase = /[A-Z]/.test(passphrase);
    const hasLowercase = /[a-z]/.test(passphrase);
    const hasNumbers = /\d/.test(passphrase);
    const hasSymbols = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(passphrase);
    const isLongEnough = passphrase.length >= 12;

    // Count how many character types are present
    const charTypes = [hasUppercase, hasLowercase, hasNumbers, hasSymbols].filter(Boolean).length;

    // For Bitcoin custody: MUST have 12+ chars AND all 4 character types
    const isStrong = isLongEnough && charTypes === 4;

    let message = '';
    let score = 0;

    if (isStrong) {
      message = 'Strong passphrase';
      score = 12; // Full score for progress bar
    } else {
      // Provide specific feedback on what's missing
      if (!isLongEnough) {
        message = `Too short (${passphrase.length}/12 characters)`;
        score = Math.min((passphrase.length / 12) * 8, 8); // Partial score based on length
      } else {
        // Length is good, but missing character types
        const missing = [];
        if (!hasUppercase) missing.push('uppercase');
        if (!hasLowercase) missing.push('lowercase');
        if (!hasNumbers) missing.push('numbers');
        if (!hasSymbols) missing.push('symbols');

        message = `Add ${missing.join(', ')}`;
        score = 8 + (charTypes - 1); // 8 for length + 1 point per character type
      }
    }

    // Remove debug code
    return {
      isStrong,
      message,
      score,
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

  // Handle tooltip visibility
  const handleTooltipToggle = () => {
    setShowTooltip(!showTooltip);
  };

  // Handle click outside to close tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        infoButtonRef.current &&
        !infoButtonRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false);
      }
    };

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTooltip]);

  const displayError = error || validationError;

  // For confirmation field, check match status
  const confirmationMatch = isConfirmationField
    ? checkConfirmationMatch(value, originalPassphrase)
    : null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <label
          htmlFor={id || 'passphrase-input'}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
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
              pr-10
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

        {/* Info icon with tooltip - only show for first field, positioned outside input */}
        {showStrength && !isConfirmationField && (
          <div className="relative flex-shrink-0">
            <button
              ref={infoButtonRef}
              type="button"
              onClick={handleTooltipToggle}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              aria-label="Passphrase requirements"
              tabIndex={0}
            >
              <Info className="h-4 w-4" />
            </button>

            {/* Tooltip */}
            {showTooltip && (
              <div
                ref={tooltipRef}
                className="absolute z-50 mt-2 w-80 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg border border-gray-700"
                style={{
                  left: '0',
                  top: '100%',
                }}
              >
                <div className="space-y-2">
                  <p className="font-medium text-gray-100">Passphrase Requirements:</p>
                  <ul className="space-y-1 text-gray-300">
                    <li>• Minimum 12 characters</li>
                    <li>• Must include ALL: uppercase, lowercase, numbers, and symbols</li>
                  </ul>
                </div>

                {/* Tooltip arrow */}
                <div
                  className="absolute w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"
                  style={{
                    left: '8px',
                    top: '-4px',
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Passphrase strength indicator - Only for first field */}
      {showStrength && !isConfirmationField && (
        <div className="space-y-2" id="passphrase-strength">
          {!hasUserTyped ? (
            // Default state - show neutral message
            <p className="text-sm font-medium text-gray-500">Passphrase Strength:</p>
          ) : (
            // User has typed - show strength with color and progress bar
            <>
              <p
                className={`text-sm font-medium ${
                  passphraseStrength.isStrong ? 'text-green-600' : 'text-red-600'
                }`}
              >
                Passphrase Strength: {passphraseStrength.message}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    passphraseStrength.isStrong ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min((passphraseStrength.score / 12) * 100, 100)}%` }}
                />
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
