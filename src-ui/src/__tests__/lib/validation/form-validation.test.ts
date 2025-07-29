import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateSafeLabel,
  validateField,
  combineValidationResults,
} from '../../../lib/validation/form-validation';

describe('validateRequired', () => {
  it('should return valid for non-empty value', () => {
    const result = validateRequired('test value', 'Test Field');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return invalid for empty string', () => {
    const result = validateRequired('', 'Test Field');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Test Field is required');
  });

  it('should return invalid for whitespace-only string', () => {
    const result = validateRequired('   ', 'Test Field');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Test Field is required');
  });
});

describe('validateMinLength', () => {
  it('should return valid for value meeting minimum length', () => {
    const result = validateMinLength('test', 4, 'Test Field');
    expect(result.isValid).toBe(true);
  });

  it('should return valid for value exceeding minimum length', () => {
    const result = validateMinLength('testing', 4, 'Test Field');
    expect(result.isValid).toBe(true);
  });

  it('should return invalid for value below minimum length', () => {
    const result = validateMinLength('test', 8, 'Test Field');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Test Field must be at least 8 characters long');
  });

  it('should return valid for empty string when no requirement', () => {
    const result = validateMinLength('', 4, 'Test Field');
    expect(result.isValid).toBe(true);
  });
});

describe('validateMaxLength', () => {
  it('should return valid for value within maximum length', () => {
    const result = validateMaxLength('test', 10, 'Test Field');
    expect(result.isValid).toBe(true);
  });

  it('should return valid for value at maximum length', () => {
    const result = validateMaxLength('test', 4, 'Test Field');
    expect(result.isValid).toBe(true);
  });

  it('should return invalid for value exceeding maximum length', () => {
    const result = validateMaxLength('testing', 4, 'Test Field');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Test Field must be no more than 4 characters long');
  });

  it('should return valid for empty string', () => {
    const result = validateMaxLength('', 4, 'Test Field');
    expect(result.isValid).toBe(true);
  });
});

describe('validateSafeLabel', () => {
  it('should return valid for alphanumeric string', () => {
    const result = validateSafeLabel('test123', 'Label');
    expect(result.isValid).toBe(true);
  });

  it('should return valid for string with allowed special characters', () => {
    const result = validateSafeLabel('test-label_123 name', 'Label');
    expect(result.isValid).toBe(true);
  });

  it('should return invalid for string with disallowed characters', () => {
    const result = validateSafeLabel('test@label', 'Label');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(
      'Label can only contain letters, numbers, spaces, hyphens, and underscores',
    );
  });

  it('should return invalid for string with symbols', () => {
    const result = validateSafeLabel('test!label', 'Label');
    expect(result.isValid).toBe(false);
  });

  it('should return valid for empty string', () => {
    const result = validateSafeLabel('', 'Label');
    expect(result.isValid).toBe(true);
  });
});

describe('combineValidationResults', () => {
  it('should return valid when all results are valid', () => {
    const results = [{ isValid: true }, { isValid: true }, { isValid: true }];
    const combined = combineValidationResults(results);
    expect(combined.isValid).toBe(true);
  });

  it('should return first invalid result when any result is invalid', () => {
    const results = [
      { isValid: true },
      { isValid: false, error: 'First error' },
      { isValid: false, error: 'Second error' },
    ];
    const combined = combineValidationResults(results);
    expect(combined.isValid).toBe(false);
    expect(combined.error).toBe('First error');
  });

  it('should return valid for empty results array', () => {
    const combined = combineValidationResults([]);
    expect(combined.isValid).toBe(true);
  });
});

describe('validateField', () => {
  it('should validate field with no rules', () => {
    const result = validateField('any value', 'Test Field');
    expect(result.isValid).toBe(true);
  });

  it('should validate field with required rule', () => {
    const result = validateField('', 'Test Field', { required: true });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Test Field is required');
  });

  it('should validate field with minLength rule', () => {
    const result = validateField('test', 'Test Field', { minLength: 8 });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Test Field must be at least 8 characters long');
  });

  it('should validate field with maxLength rule', () => {
    const result = validateField('testing', 'Test Field', { maxLength: 4 });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Test Field must be no more than 4 characters long');
  });

  it('should validate field with safeLabel rule', () => {
    const result = validateField('test@label', 'Test Field', { safeLabel: true });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe(
      'Test Field can only contain letters, numbers, spaces, hyphens, and underscores',
    );
  });

  it('should validate field with multiple rules and return first failure', () => {
    const result = validateField('', 'Test Field', {
      required: true,
      minLength: 5,
      safeLabel: true,
    });
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Test Field is required');
  });

  it('should validate field with multiple rules and pass all', () => {
    const result = validateField('test_label', 'Test Field', {
      required: true,
      minLength: 5,
      safeLabel: true,
    });
    expect(result.isValid).toBe(true);
  });
});
