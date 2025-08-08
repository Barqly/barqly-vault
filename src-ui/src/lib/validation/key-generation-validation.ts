/**
 * Validation utilities specific to key generation form
 */

import { ValidationResult } from './form-validation';

/**
 * Validate key label format and constraints
 *
 * @param label - The key label to validate
 * @returns ValidationResult with validation status
 */
export function validateKeyLabel(label: string): ValidationResult {
  if (!label.trim()) {
    return {
      isValid: false,
      error: 'Key label is required',
    };
  }

  if (label.length < 3) {
    return {
      isValid: false,
      error: 'Key label must be at least 3 characters long',
    };
  }

  if (label.length > 50) {
    return {
      isValid: false,
      error: 'Key label must be less than 50 characters',
    };
  }

  if (!/^[a-zA-Z0-9\s\-_]+$/.test(label)) {
    return {
      isValid: false,
      error:
        'Key label contains invalid characters (only letters, numbers, spaces, hyphens, and underscores allowed)',
    };
  }

  return { isValid: true };
}

/**
 * Validate passphrase requirements for key generation
 *
 * @param passphrase - The passphrase to validate
 * @returns ValidationResult with validation status
 */
export function validateKeyPassphrase(passphrase: string): ValidationResult {
  if (!passphrase) {
    return {
      isValid: false,
      error: 'Passphrase is required',
    };
  }

  if (passphrase.length < 8) {
    return {
      isValid: false,
      error: 'Passphrase must be at least 8 characters long',
    };
  }

  return { isValid: true };
}

/**
 * Validate passphrase confirmation matches
 *
 * @param confirmPassphrase - The confirmation passphrase
 * @param originalPassphrase - The original passphrase to match against
 * @returns ValidationResult with validation status
 */
export function validateConfirmPassphrase(
  confirmPassphrase: string,
  originalPassphrase: string,
): ValidationResult {
  if (!confirmPassphrase) {
    return {
      isValid: false,
      error: 'Please confirm your passphrase',
    };
  }

  if (confirmPassphrase !== originalPassphrase) {
    return {
      isValid: false,
      error: 'Passphrases do not match',
    };
  }

  return { isValid: true };
}

/**
 * Validate entire key generation form
 *
 * @param label - The key label
 * @param passphrase - The passphrase
 * @param confirmPassphrase - The confirmation passphrase
 * @returns Object with validation results for each field
 */
export function validateKeyGenerationForm(
  label: string,
  passphrase: string,
  confirmPassphrase: string,
): {
  label?: string;
  passphrase?: string;
  confirmPassphrase?: string;
  isValid: boolean;
} {
  const errors: {
    label?: string;
    passphrase?: string;
    confirmPassphrase?: string;
  } = {};

  const labelResult = validateKeyLabel(label);
  if (!labelResult.isValid) {
    errors.label = labelResult.error;
  }

  const passphraseResult = validateKeyPassphrase(passphrase);
  if (!passphraseResult.isValid) {
    errors.passphrase = passphraseResult.error;
  }

  const confirmResult = validateConfirmPassphrase(confirmPassphrase, passphrase);
  if (!confirmResult.isValid) {
    errors.confirmPassphrase = confirmResult.error;
  }

  return {
    ...errors,
    isValid: Object.keys(errors).length === 0,
  };
}
