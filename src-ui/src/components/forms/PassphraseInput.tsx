import React, { useState, useEffect, useCallback } from 'react';
import PassphraseStrengthIndicator, { PassphraseStrength } from './PassphraseStrengthIndicator';
import PassphraseVisibilityToggle from './PassphraseVisibilityToggle';
import PassphraseValidationFeedback, { ConfirmationMatch } from './PassphraseValidationFeedback';
import PassphraseRequirementsTooltip from './PassphraseRequirementsTooltip';

export type { PassphraseStrength };

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
  const checkConfirmationMatch = useCallback(
    (confirmation: string, original: string): ConfirmationMatch => {
      if (!confirmation) return { matches: false, message: '' };
      if (confirmation === original) {
        return { matches: true, message: 'Passphrases match' };
      }
      return { matches: false, message: "Passphrases don't match" };
    },
    [],
  );

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

          <PassphraseVisibilityToggle
            isVisible={showPassphrase}
            onToggle={() => setShowPassphrase(!showPassphrase)}
            disabled={disabled}
          />
        </div>

        {/* Info icon with tooltip - only show for first field, positioned outside input */}
        {showStrength && !isConfirmationField && (
          <PassphraseRequirementsTooltip show={showTooltip} onToggle={handleTooltipToggle} />
        )}
      </div>

      {/* Passphrase strength indicator - Only for first field */}
      {showStrength && !isConfirmationField && (
        <PassphraseStrengthIndicator strength={passphraseStrength} hasUserTyped={hasUserTyped} />
      )}

      {/* Validation Feedback */}
      <PassphraseValidationFeedback
        error={displayError}
        isConfirmationField={isConfirmationField}
        confirmationMatch={confirmationMatch}
        value={value}
        inputId={id}
      />
    </div>
  );
};

export default PassphraseInput;
