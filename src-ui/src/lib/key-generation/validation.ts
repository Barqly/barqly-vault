import { CommandError } from '../../bindings';
import { validateField } from '../validation';
import { logger } from '../logger';

/**
 * Validates key generation inputs
 *
 * @param label - The key label to validate
 * @param passphrase - The passphrase to validate
 * @returns Validation error if invalid, null if valid
 */
export const validateKeyGenerationInputs = (
  label: string,
  passphrase: string,
): CommandError | null => {
  // Validate label
  const labelValidation = validateField(label, 'Key label', {
    required: true,
    safeLabel: true,
  });

  logger.debug('key-generation-validation', 'Label validation result', {
    isValid: labelValidation.isValid,
    error: labelValidation.error,
  });

  if (!labelValidation.isValid) {
    const error: CommandError = {
      code: 'INVALID_INPUT',
      message: labelValidation.error!,
      details: null,
      recovery_guidance: 'Please provide a unique label for the new key',
      user_actionable: true,
      trace_id: null,
      span_id: null,
    };
    logger.error(
      'key-generation-validation',
      'Label validation failed',
      new Error(labelValidation.error!),
      { error },
    );
    return error;
  }

  // Validate passphrase
  const passphraseValidation = validateField(passphrase, 'Passphrase', {
    required: true,
  });

  logger.debug('key-generation-validation', 'Passphrase validation result', {
    isValid: passphraseValidation.isValid,
    error: passphraseValidation.error,
  });

  if (!passphraseValidation.isValid) {
    const error: CommandError = {
      code: 'INVALID_INPUT',
      message: passphraseValidation.error!,
      details: null,
      recovery_guidance: 'Please provide a strong passphrase to protect the key',
      user_actionable: true,
      trace_id: null,
      span_id: null,
    };
    logger.error(
      'key-generation-validation',
      'Passphrase validation failed',
      new Error(passphraseValidation.error!),
      { error },
    );
    return error;
  }

  return null;
};
