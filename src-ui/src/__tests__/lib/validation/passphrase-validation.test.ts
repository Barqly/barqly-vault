import { describe, it, expect } from 'vitest';
import {
  checkPassphraseStrength,
  checkConfirmationMatch,
  validatePassphrase,
} from '../../../lib/validation/passphrase-validation';

describe('checkPassphraseStrength', () => {
  it('should return weak strength for empty passphrase', () => {
    const result = checkPassphraseStrength('');
    expect(result.isStrong).toBe(false);
    expect(result.message).toBe('Enter a passphrase');
    expect(result.score).toBe(0);
  });

  it('should return weak strength for short passphrase', () => {
    const result = checkPassphraseStrength('Abc123!');
    expect(result.isStrong).toBe(false);
    expect(result.message).toBe('Too short (7/12 characters)');
    expect(result.score).toBeLessThan(8);
  });

  it('should return weak strength for passphrase missing character types', () => {
    const result = checkPassphraseStrength('abcdefghijkl');
    expect(result.isStrong).toBe(false);
    expect(result.message).toBe('Add uppercase, numbers, symbols');
  });

  it('should return strong strength for valid passphrase', () => {
    const result = checkPassphraseStrength('MySecure123!Pass');
    expect(result.isStrong).toBe(true);
    expect(result.message).toBe('Strong passphrase');
    expect(result.score).toBe(12);
  });

  it('should handle passphrase with all character types but minimum length', () => {
    const result = checkPassphraseStrength('MySecure123!');
    expect(result.isStrong).toBe(true);
    expect(result.message).toBe('Strong passphrase');
    expect(result.score).toBe(12);
  });

  it('should provide specific feedback for missing uppercase', () => {
    const result = checkPassphraseStrength('mysecure123!pass');
    expect(result.isStrong).toBe(false);
    expect(result.message).toBe('Add uppercase');
  });

  it('should provide specific feedback for missing symbols', () => {
    const result = checkPassphraseStrength('MySecure123Pass');
    expect(result.isStrong).toBe(false);
    expect(result.message).toBe('Add symbols');
  });
});

describe('checkConfirmationMatch', () => {
  it('should return empty message for empty confirmation', () => {
    const result = checkConfirmationMatch('', 'original');
    expect(result.matches).toBe(false);
    expect(result.message).toBe('');
  });

  it('should return match for identical passphrases', () => {
    const result = checkConfirmationMatch('MySecure123!', 'MySecure123!');
    expect(result.matches).toBe(true);
    expect(result.message).toBe('Passphrases match');
  });

  it('should return no match for different passphrases', () => {
    const result = checkConfirmationMatch('MySecure123!', 'DifferentPass456@');
    expect(result.matches).toBe(false);
    expect(result.message).toBe("Passphrases don't match");
  });

  it('should be case sensitive', () => {
    const result = checkConfirmationMatch('MySecure123!', 'mysecure123!');
    expect(result.matches).toBe(false);
    expect(result.message).toBe("Passphrases don't match");
  });
});

describe('validatePassphrase', () => {
  it('should return empty string for valid passphrase with no requirements', () => {
    const result = validatePassphrase('any passphrase');
    expect(result).toBe('');
  });

  it('should return error for required but empty passphrase', () => {
    const result = validatePassphrase('', { required: true });
    expect(result).toBe('Passphrase is required');
  });

  it('should return error for passphrase below minimum length', () => {
    const result = validatePassphrase('short', { minLength: 10 });
    expect(result).toBe('Passphrase must be at least 10 characters long');
  });

  it('should return error for weak passphrase when strong required', () => {
    const result = validatePassphrase('weakpassword123', { requireStrong: true });
    expect(result).toBe('Passphrase is too weak');
  });

  it('should return empty string for strong passphrase when strong required', () => {
    const result = validatePassphrase('MySecure123!Pass', { requireStrong: true });
    expect(result).toBe('');
  });

  it('should validate with multiple requirements', () => {
    const result = validatePassphrase('', {
      required: true,
      minLength: 12,
      requireStrong: true,
    });
    expect(result).toBe('Passphrase is required');
  });

  it('should validate length before strength', () => {
    const result = validatePassphrase('weak', {
      minLength: 12,
      requireStrong: true,
    });
    expect(result).toBe('Passphrase must be at least 12 characters long');
  });
});
