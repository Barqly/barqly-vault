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

  if (!inputs.passphrase.trim()) {
    return {
      isValid: false,
      error: createValidationError(
        'Passphrase',
        'Please enter the passphrase for the selected key',
      ),
    };
  }

  if (!inputs.outputPath) {
    return {
      isValid: false,
      error: createValidationError(
        'Output directory',
        'Please select where to save the decrypted files',
      ),
    };
  }

  return { isValid: true };
};

/**
 * Prepares decryption input for backend API
 * Converts from frontend state to backend expected format
 */
export const prepareDecryptionInput = (inputs: DecryptionInputs) => {
  // Backend expects snake_case fields
  return {
    encrypted_file: inputs.selectedFile!,
    key_id: inputs.selectedKeyId || '',
    passphrase: inputs.passphrase,
    output_dir: inputs.outputPath || '',
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
      if (!value || !value.trim()) {
        return 'Please enter a passphrase';
      }
      if (value.length < 8) {
        return 'Passphrase must be at least 8 characters';
      }
      break;

    case 'outputPath':
      if (!value) {
        return 'Please select an output directory';
      }
      break;
  }

  return null;
};
