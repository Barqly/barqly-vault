/**
 * Safe wrappers for Tauri API calls that work in both desktop and web environments
 *
 * This file provides RUNTIME EXECUTION wrappers for Tauri commands.
 * For TYPE DEFINITIONS, see api-types.ts
 *
 * Key features:
 * - Environment detection (desktop vs web)
 * - Safe dynamic imports with fallbacks
 * - Command parameter mapping
 * - Comprehensive error handling and logging
 * - Mock responses for web preview mode
 */

import { isTauri } from './environment/platform';
import { CommandError, ErrorCode, CommandResult, CommandErrorClass } from './api-types';
import { logger } from './logger';
import type { UnlistenFn } from '@tauri-apps/api/event';

/**
 * Safe invoke wrapper that handles both Tauri desktop and web preview modes
 */
export async function safeInvoke<T>(
  cmd: string,
  args?: any,
  context: string = 'Unknown',
): Promise<T> {
  const startTime = performance.now();

  logger.info('TauriSafe', `Attempting to invoke command: ${cmd}`, {
    context,
    args,
    isTauriEnvironment: isTauri(),
  });

  if (!isTauri()) {
    // In web preview mode, return a mock error
    const error: CommandError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'This feature requires the desktop application',
      recovery_guidance: 'Please use the desktop version of Barqly Vault to access this feature',
      user_actionable: true,
    };
    logger.error('TauriSafe', 'Not in Tauri environment', new Error('Not in Tauri environment'), {
      cmd,
      context,
    });
    throw error;
  }

  try {
    let invoke;

    // Try different import paths for Tauri v2
    try {
      const { invoke: coreInvoke } = await import('@tauri-apps/api/core');
      logger.debug('TauriSafe', 'Tauri core module imported successfully', {
        invokeType: typeof coreInvoke,
        invokeAvailable: !!coreInvoke,
      });
      invoke = coreInvoke;
    } catch (coreError) {
      logger.warn('TauriSafe', 'Core import failed, trying main API', {
        error: coreError instanceof Error ? coreError.message : String(coreError),
      });

      // In Tauri v2, invoke is only available in @tauri-apps/api/core
      logger.error(
        'TauriSafe',
        'Failed to import from @tauri-apps/api/core',
        coreError instanceof Error ? coreError : new Error(String(coreError)),
      );
      throw new Error('Failed to import Tauri invoke function from @tauri-apps/api/core');
    }

    if (!invoke) {
      const error = new Error('Tauri invoke function not found in any import path');
      logger.error('TauriSafe', 'Invoke function is null/undefined', error);
      throw error;
    }

    // Map commands to their expected parameter names
    // Most crypto commands expect 'input', while others have specific parameter names
    const commandParameterMap: Record<string, string | null> = {
      // Crypto commands with 'input' parameter
      generate_key: 'input',
      generate_key_multi: 'input',
      validate_passphrase: 'input',
      verify_key_passphrase: 'input',
      encrypt_files: 'input', // Takes EncryptDataInput wrapped in 'input'
      decrypt_data: 'input',
      get_encryption_status: 'input',
      verify_manifest: 'input',
      get_progress: 'input',

      // Storage commands
      update_config: 'config',
      delete_key_command: null, // Takes key_id as a direct string parameter
      list_keys_command: null, // No parameters
      get_config: null, // No parameters
      get_cache_metrics: null, // No parameters

      // File commands
      select_files: 'selectionType', // Takes SelectionType wrapped in 'selectionType' parameter
      get_file_info: 'paths',
      create_manifest: 'file_paths',

      // YubiKey commands (legacy)
      yubikey_list_devices: null, // No parameters
      yubikey_devices_available: null, // No parameters
      yubikey_get_device_info: null, // Takes device_id directly
      yubikey_test_connection: null, // Takes device_id and pin
      yubikey_initialize: null, // Takes device_id, pin, slot

      // Streamlined YubiKey commands
      list_yubikeys: null, // No parameters - returns intelligent state info
      init_yubikey: null, // Takes serial, new_pin, label
      register_yubikey: null, // Takes serial, label
      get_identities: null, // Takes serial

      // Vault commands
      create_vault: 'input', // Takes CreateVaultRequest
      list_vaults: null, // No parameters
      get_current_vault: null, // No parameters
      set_current_vault: 'input', // Takes SetCurrentVaultRequest
      delete_vault: 'input', // Takes DeleteVaultRequest
      get_vault_keys: 'input', // Takes GetVaultKeysRequest
      add_key_to_vault: 'input', // Takes AddKeyToVaultRequest
      remove_key_from_vault: 'input', // Takes RemoveKeyFromVaultRequest
      update_key_label: 'input', // Takes UpdateKeyLabelRequest
      check_yubikey_availability: 'input', // Takes CheckYubiKeyAvailabilityRequest

      // New passphrase/YubiKey vault integration commands
      validate_passphrase_strength: null, // Takes passphrase as string directly
      add_passphrase_key_to_vault: 'input', // Takes AddPassphraseKeyRequest
      validate_vault_passphrase_key: null, // Takes vault_id as string
      init_yubikey_for_vault: 'params', // Takes YubiKeyInitForVaultParams wrapped in 'params'
      register_yubikey_for_vault: 'params', // Takes RegisterYubiKeyForVaultParams wrapped in 'params'
      list_available_yubikeys: null, // Takes vault_id as string directly
      check_yubikey_slot_availability: null, // Takes vault_id as string
    };

    let invokeArgs = args;
    const paramName = commandParameterMap[cmd];

    // Special handling for commands that take strings directly
    if (cmd === 'delete_key_command' && typeof args === 'object' && 'key_id' in args) {
      invokeArgs = args.key_id;
    } else if (cmd === 'list_available_yubikeys' && typeof args === 'object' && 'vaultId' in args) {
      // Tauri v2 expects camelCase for parameters
      invokeArgs = args;
    } else if (paramName && args) {
      // If the command expects a specific parameter name and args don't already have it
      if (typeof args !== 'object' || !(paramName in args)) {
        invokeArgs = { [paramName]: args };
      }
    } else if (paramName === null && !args) {
      // Commands with no parameters
      invokeArgs = undefined;
    }

    logger.debug('TauriSafe', `Invoking Tauri command: ${cmd}`, {
      argsStringified: JSON.stringify(invokeArgs),
      argTypes: invokeArgs ? Object.entries(invokeArgs).map(([k, v]) => [k, typeof v]) : null,
      wrapped: invokeArgs !== args,
    });

    // Extra debug for specific commands
    if (cmd === 'generate_key_multi' || cmd === 'list_available_yubikeys') {
      console.log(`🔍 TauriSafe: ${cmd} debug:`, {
        originalArgs: args,
        finalInvokeArgs: invokeArgs,
        paramName,
        hasVaultId: invokeArgs && 'vault_id' in invokeArgs,
        hasInput: invokeArgs && 'input' in invokeArgs,
        allKeys: invokeArgs ? Object.keys(invokeArgs) : [],
      });
    }

    const result = await invoke<T>(cmd, invokeArgs);
    const duration = performance.now() - startTime;

    logger.info('TauriSafe', `Command successful: ${cmd}`, {
      context,
      duration: `${duration.toFixed(2)}ms`,
      resultType: typeof result,
      resultKeys: result && typeof result === 'object' ? Object.keys(result) : null,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    logger.error(
      'TauriSafe',
      `Command failed: ${cmd}`,
      error instanceof Error ? error : new Error(String(error)),
      {
        context,
        cmd,
        args,
        duration: `${duration.toFixed(2)}ms`,
        errorType: error?.constructor?.name,
        errorDetails: error,
      },
    );

    throw error;
  }
}

/**
 * Safe listen wrapper that handles both Tauri desktop and web preview modes
 */
export async function safeListen<T>(
  event: string,
  handler: (event: { payload: T }) => void,
): Promise<UnlistenFn> {
  if (!isTauri()) {
    // In web preview mode, return a no-op unlisten function
    return () => Promise.resolve();
  }

  const { listen } = await import('@tauri-apps/api/event');
  return listen<T>(event, handler);
}

/**
 * Safe invoke command wrapper that uses the CommandResult pattern
 */
export async function safeInvokeCommand<T>(cmd: string, args?: any): Promise<T> {
  if (!isTauri()) {
    // In web preview mode, return a mock error
    throw {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'This feature requires the desktop application',
      recovery_guidance: 'Please use the desktop version of Barqly Vault to access this feature',
      user_actionable: true,
    } as CommandError;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    console.log(`[DEBUG] Invoking command (CommandResult): ${cmd}`, args);
    const result = await invoke<CommandResult<T>>(cmd, args);
    console.log(`[DEBUG] Command ${cmd} result:`, result);

    if (result.status === 'error') {
      throw new CommandErrorClass(result.data);
    }

    console.log(`[DEBUG] Command ${cmd} succeeded:`, result.data);
    return result.data;
  } catch (error) {
    console.error(`[ERROR] Command ${cmd} failed:`, error);
    console.error('[ERROR] Error details:', {
      type: typeof error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      fullError: error,
    });
    throw error;
  }
}
