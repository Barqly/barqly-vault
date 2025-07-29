/**
 * General form validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate required field
 *
 * @param value - The value to validate
 * @param fieldName - The name of the field for error messages
 * @returns ValidationResult with validation status
 */
export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value || !value.trim()) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
    };
  }
  return { isValid: true };
}

/**
 * Validate minimum length requirement
 *
 * @param value - The value to validate
 * @param minLength - Minimum required length
 * @param fieldName - The name of the field for error messages
 * @returns ValidationResult with validation status
 */
export function validateMinLength(
  value: string,
  minLength: number,
  fieldName: string,
): ValidationResult {
  if (value && value.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters long`,
    };
  }
  return { isValid: true };
}

/**
 * Validate maximum length requirement
 *
 * @param value - The value to validate
 * @param maxLength - Maximum allowed length
 * @param fieldName - The name of the field for error messages
 * @returns ValidationResult with validation status
 */
export function validateMaxLength(
  value: string,
  maxLength: number,
  fieldName: string,
): ValidationResult {
  if (value && value.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must be no more than ${maxLength} characters long`,
    };
  }
  return { isValid: true };
}

/**
 * Validate that a value contains only safe characters for labels/identifiers
 *
 * @param value - The value to validate
 * @param fieldName - The name of the field for error messages
 * @returns ValidationResult with validation status
 */
export function validateSafeLabel(value: string, fieldName: string): ValidationResult {
  // Allow alphanumeric, hyphens, underscores, and spaces
  const safePattern = /^[a-zA-Z0-9\s_-]+$/;

  if (value && !safePattern.test(value)) {
    return {
      isValid: false,
      error: `${fieldName} can only contain letters, numbers, spaces, hyphens, and underscores`,
    };
  }
  return { isValid: true };
}

/**
 * Combine multiple validation results
 *
 * @param results - Array of validation results to combine
 * @returns Combined ValidationResult (fails if any individual result fails)
 */
export function combineValidationResults(results: ValidationResult[]): ValidationResult {
  for (const result of results) {
    if (!result.isValid) {
      return result;
    }
  }
  return { isValid: true };
}

/**
 * Validate field with multiple rules
 *
 * @param value - The value to validate
 * @param fieldName - The name of the field for error messages
 * @param rules - Array of validation rules to apply
 * @returns ValidationResult with validation status
 */
export function validateField(
  value: string,
  fieldName: string,
  rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    safeLabel?: boolean;
  } = {},
): ValidationResult {
  const results: ValidationResult[] = [];

  if (rules.required) {
    results.push(validateRequired(value, fieldName));
  }

  if (rules.minLength !== undefined) {
    results.push(validateMinLength(value, rules.minLength, fieldName));
  }

  if (rules.maxLength !== undefined) {
    results.push(validateMaxLength(value, rules.maxLength, fieldName));
  }

  if (rules.safeLabel) {
    results.push(validateSafeLabel(value, fieldName));
  }

  return combineValidationResults(results);
}
