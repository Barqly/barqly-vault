/**
 * Passphrase validation utilities for secure Bitcoin custody
 */

export interface PassphraseStrength {
  isStrong: boolean;
  message: string;
  score: number;
}

export interface ConfirmationMatch {
  matches: boolean;
  message: string;
}

/**
 * Check passphrase strength with clear Bitcoin custody requirements
 *
 * @param passphrase - The passphrase to validate
 * @returns PassphraseStrength object with validation results
 */
export function checkPassphraseStrength(passphrase: string): PassphraseStrength {
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

  return {
    isStrong,
    message,
    score,
  };
}

/**
 * Check if confirmation passphrase matches original
 *
 * @param confirmation - The confirmation passphrase
 * @param original - The original passphrase
 * @returns ConfirmationMatch object with match results
 */
export function checkConfirmationMatch(confirmation: string, original: string): ConfirmationMatch {
  if (!confirmation) return { matches: false, message: '' };
  if (confirmation === original) {
    return { matches: true, message: 'Passphrases match' };
  }
  return { matches: false, message: "Passphrases don't match" };
}

/**
 * Validate passphrase with configurable requirements
 *
 * @param passphrase - The passphrase to validate
 * @param options - Validation options
 * @returns Error message if invalid, empty string if valid
 */
export function validatePassphrase(
  passphrase: string,
  options: {
    required?: boolean;
    minLength?: number;
    requireStrong?: boolean;
  } = {},
): string {
  const { required = false, minLength = 12, requireStrong = false } = options;

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
}
