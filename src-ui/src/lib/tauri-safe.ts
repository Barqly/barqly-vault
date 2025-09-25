/**
 * Safe wrappers for Tauri API calls that work in both desktop and web environments
 *
 * This file provides RUNTIME EXECUTION wrappers for Tauri commands.
 * For TYPE DEFINITIONS, see api-types.ts
 *
 * Key features:
 * - Environment detection (desktop vs web)
 * - Safe dynamic imports with fallbacks
 * - Comprehensive error handling and logging
 * - Mock responses for web preview mode
 */

import { isTauri } from './environment/platform';
import { CommandError, ErrorCode, Result } from '../bindings';
import { logger } from './logger';
import type { UnlistenFn } from '@tauri-apps/api/event';

/**
 * DEPRECATED: Safe invoke wrapper that handles both Tauri desktop and web preview modes
 * This function is being phased out - use generated commands from bindings.ts instead
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

    // DEPRECATED: This function no longer performs parameter wrapping
    // Most APIs have been migrated to use commands.xxx() from bindings.ts
    // Callers still using this function must provide the correct parameter structure
    const invokeArgs = args;

    logger.debug('TauriSafe', `Invoking Tauri command: ${cmd}`, {
      argsStringified: JSON.stringify(invokeArgs),
      argTypes: invokeArgs ? Object.entries(invokeArgs).map(([k, v]) => [k, typeof v]) : null,
    });

    const result = await invoke<T>(cmd, invokeArgs || {});
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
