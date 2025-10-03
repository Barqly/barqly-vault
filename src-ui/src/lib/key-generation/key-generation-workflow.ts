import { safeListen } from '../tauri-safe';
import {
  commands,
  GenerateKeyInput,
  GenerateKeyResponse,
  ValidatePassphraseInput,
  ValidatePassphraseResponse,
} from '../../bindings';
import { CommandError, ErrorCode, GetProgressResponse } from '../../bindings';
import { logger } from '../logger';

/**
 * Validates passphrase strength using the backend service
 *
 * @param passphrase - The passphrase to validate
 * @returns Validation result with strength information
 */
export const validatePassphraseStrength = async (
  passphrase: string,
): Promise<ValidatePassphraseResponse> => {
  const validationInput: ValidatePassphraseInput = {
    passphrase,
  };

  logger.debug('key-generation-workflow', 'Calling validate_passphrase command', {
    passphraseLength: passphrase.length,
  });

  const result = await commands.validatePassphrase(validationInput);

  if (result.status === 'error') {
    throw new Error(result.error.message || 'Passphrase validation failed');
  }

  logger.info('key-generation-workflow', 'Passphrase validation complete', {
    isValid: result.data.is_valid,
    message: result.data.message,
  });

  return result.data;
};

/**
 * Executes key generation with progress tracking
 *
 * @param label - The label for the key
 * @param passphrase - The passphrase to protect the key
 * @param onProgress - Callback for progress updates
 * @returns The generated key information
 */
export const executeKeyGenerationWithProgress = async (
  label: string,
  passphrase: string,
  onProgress: (progress: GetProgressResponse) => void,
): Promise<GenerateKeyResponse> => {
  logger.info('key-generation-workflow', 'Starting key generation process', {
    label,
    timestamp: new Date().toISOString(),
  });

  // First validate the passphrase
  const validationResult = await validatePassphraseStrength(passphrase);

  if (!validationResult.is_valid) {
    const error: CommandError = {
      code: 'WEAK_PASSPHRASE' as ErrorCode,
      message: 'Passphrase is too weak',
      details: null,
      recovery_guidance: validationResult.message || 'Please use a stronger passphrase',
      user_actionable: true,
      trace_id: null,
      span_id: null,
    };
    logger.error(
      'key-generation-workflow',
      'Weak passphrase detected',
      new Error('Weak passphrase'),
      {
        message: validationResult.message,
      },
    );
    throw error;
  }

  // Set up progress listener
  logger.debug('key-generation-workflow', 'Setting up progress listener');
  const unlisten = await safeListen<GetProgressResponse>('key-generation-progress', (event) => {
    logger.debug('key-generation-workflow', 'Progress update received', event.payload);
    onProgress(event.payload);
  });

  try {
    const keyInput: GenerateKeyInput = {
      label,
      passphrase,
    };

    logger.info('key-generation-workflow', 'Calling generate_key command', {
      label: keyInput.label,
    });

    const result = await commands.generateKey(keyInput);

    if (result.status === 'error') {
      throw result.error;
    }

    logger.info('key-generation-workflow', 'Key generation successful', {
      publicKey: result.data.public_key.substring(0, 20) + '...',
      keyId: result.data.key_id,
      savedPath: result.data.saved_path,
    });

    // Clean up progress listener
    unlisten();

    return result.data;
  } catch (error) {
    // Clean up progress listener on error
    unlisten();

    logger.error(
      'key-generation-workflow',
      'Key generation command failed',
      error instanceof Error ? error : new Error(String(error)),
      { error },
    );

    throw error;
  }
};
