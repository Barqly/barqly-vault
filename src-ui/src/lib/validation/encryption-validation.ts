import { CommandError, ErrorCode, FileSelection } from '../../bindings';
import { EncryptionInput } from '../encryption/encryption-workflow';

/**
 * Validation result for encryption inputs
 */
export interface EncryptionValidationResult {
  isValid: boolean;
  error?: CommandError;
}

/**
 * State required for encryption validation
 */
export interface EncryptionValidationState {
  selectedFiles: FileSelection | null;
}

/**
 * Validates that all required inputs for encryption are present and valid
 */
export const validateEncryptionInputs = (
  state: EncryptionValidationState,
  keyId: string,
): EncryptionValidationResult => {
  // Check if files are selected
  if (!state.selectedFiles || state.selectedFiles.paths.length === 0) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'No files selected for encryption',
        recovery_guidance: 'Please select files or folders to encrypt',
        user_actionable: true,
      },
    };
  }

  // Check if key ID is provided
  if (!keyId?.trim()) {
    return {
      isValid: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Encryption key is required',
        recovery_guidance: 'Please select an encryption key',
        user_actionable: true,
      },
    };
  }

  return { isValid: true };
};

/**
 * Prepares the encryption input from the current state
 */
export const prepareEncryptionInput = (
  selectedFiles: FileSelection,
  keyId: string,
  outputName?: string,
  outputPath?: string,
): EncryptionInput => {
  return {
    key_id: keyId,
    file_paths: selectedFiles.paths,
    output_name: outputName ?? null,
    output_path: outputPath ?? null,
  };
};
