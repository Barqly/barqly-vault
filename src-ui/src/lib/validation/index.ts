/**
 * Validation utilities barrel export
 */

// Passphrase validation
export {
  checkPassphraseStrength,
  checkConfirmationMatch,
  validatePassphrase,
  type PassphraseStrength,
  type ConfirmationMatch,
} from './passphrase-validation';

// Form validation
export {
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateSafeLabel,
  validateField,
  combineValidationResults,
  type ValidationResult,
} from './form-validation';
