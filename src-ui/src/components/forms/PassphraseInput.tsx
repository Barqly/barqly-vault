import React, { useState, useEffect, useCallback } from 'react';
import PassphraseStrengthIndicator from './PassphraseStrengthIndicator';
import PassphraseVisibilityToggle from './PassphraseVisibilityToggle';
import PassphraseValidationFeedback from './PassphraseValidationFeedback';
import PassphraseRequirementsTooltip from './PassphraseRequirementsTooltip';
import {
  checkPassphraseStrength,
  checkConfirmationMatch,
  validatePassphrase,
  type PassphraseStrength,
  type ConfirmationMatch,
} from '../../lib/validation';

export type { PassphraseStrength };

export interface PassphraseInputProps {
  value?: string;

  onChange?: (value: string) => void;

  onStrengthChange?: (strength: PassphraseStrength) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
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
  // Focus management props
  autoFocus?: boolean;
  tabIndex?: number;
  // Decrypt mode - disable validation (backend validates)
  disableValidation?: boolean;
}

const PassphraseInput: React.FC<PassphraseInputProps> = ({
  value: controlledValue,
  onChange,
  onStrengthChange,
  onBlur,
  onFocus,
  onKeyDown,
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
  autoFocus = false,
  tabIndex,
  disableValidation = false,
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

  // Validate passphrase using utility function
  const validateCurrentPassphrase = useCallback(
    (passphrase: string): string => {
      return validatePassphrase(passphrase, {
        required,
        minLength,
        requireStrong,
      });
    },
    [required, minLength, requireStrong],
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
    // Skip validation if disabled (decrypt mode lets backend validate)
    if (!disableValidation) {
      const error = validateCurrentPassphrase(value);
      setValidationError(error);
    }

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
  const confirmationMatch: ConfirmationMatch | null = isConfirmationField
    ? checkConfirmationMatch(value, originalPassphrase)
    : null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <label
          htmlFor={id || 'passphrase-input'}
          className="block text-sm font-medium text-slate-700"
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
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoFocus={autoFocus}
            tabIndex={tabIndex}
            className={`
              block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-slate-500
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-slate-50 dark:disabled:bg-slate-700 disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed
              ${displayError ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}
              ${disabled ? 'bg-slate-50 dark:bg-slate-700' : 'bg-white dark:bg-slate-800'}
              text-slate-900 dark:text-slate-100
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
