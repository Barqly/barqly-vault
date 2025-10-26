/**
 * Validation utilities for decryption operations
 */

import { createValidationError } from '../errors/command-error';
import { CommandError } from '../../bindings';

export interface DecryptionInputs {
  selectedFile: string | null;
  selectedKeyId: string | null;
  passphrase: string;
  outputPath: string | null;
  forceOverwrite?: boolean | null; // For conflict resolution
}

export interface DecryptionValidationResult {
  isValid: boolean;
  error?: CommandError;
}

/**
 * Validates all required inputs for decryption
 * Returns validation result with specific error if invalid
 */
export const validateDecryptionInputs = (inputs: DecryptionInputs): DecryptionValidationResult => {
  if (!inputs.selectedFile) {
    return {
      isValid: false,
      error: createValidationError(
        'Encrypted file',
        'Please select an encrypted .age file to decrypt',
      ),
    };
  }

  if (!inputs.selectedKeyId) {
    return {
      isValid: false,
      error: createValidationError(
        'Decryption key',
        'Please select the key that was used to encrypt this file',
      ),
    };
  }

  // Passphrase/PIN validation removed - backend will validate
  // Ensures consistent UX (no pre-validation for either passphrase or PIN)
  // User sees progress → backend validates → error view if incorrect

  return { isValid: true };
};

/**
 * Prepares decryption input for backend API
 * Converts from frontend state to backend expected format
 */
export const prepareDecryptionInput = (inputs: DecryptionInputs) => {
  // Backend expects snake_case fields
  // output_dir is optional - null triggers backend default path generation
  // force_overwrite is for conflict resolution (Replace scenario)
  return {
    encrypted_file: inputs.selectedFile!,
    key_id: inputs.selectedKeyId || '',
    passphrase: inputs.passphrase,
    output_dir: inputs.outputPath || null, // Backend generates default if null
    force_overwrite: inputs.forceOverwrite || null, // User confirmation to overwrite
  };
};

/**
 * Validates a single decryption field
 * Useful for real-time validation
 */
export const validateDecryptionField = (
  fieldName: keyof DecryptionInputs,
  value: string | null,
): string | null => {
  switch (fieldName) {
    case 'selectedFile':
      if (!value) {
        return 'Please select an encrypted .age file';
      }
      if (!value.toLowerCase().endsWith('.age')) {
        return 'File must be a .age encrypted file';
      }
      break;

    case 'selectedKeyId':
      if (!value) {
        return 'Please select a decryption key';
      }
      break;

    case 'passphrase':
      // No client-side validation - backend will validate
      // Ensures consistent UX with PIN (no pre-validation)
      break;

    case 'outputPath':
      // outputPath is optional - backend generates default if not provided
      // No validation needed
      break;
  }

  return null;
};
