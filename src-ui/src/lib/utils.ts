import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { logger } from './logger';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Enhanced safe invoke wrapper for Tauri commands with comprehensive logging
 */
export async function safeInvoke<T>(
  command: string,
  args?: any,
  context: string = 'Unknown',
): Promise<T> {
  const startTime = performance.now();

  // Log the invocation attempt
  logger.info('SafeInvoke', `Attempting to invoke command: ${command}`, {
    context,
    args,
    timestamp: new Date().toISOString(),
  });

  try {
    // Check if we're in Tauri environment
    if (typeof window === 'undefined' || !(window as any).__TAURI__) {
      const error = new Error('Tauri API not available - not running in desktop app context');
      logger.error('SafeInvoke', 'Tauri environment check failed', error, {
        command,
        context,
        windowDefined: typeof window !== 'undefined',
        tauriDefined: typeof window !== 'undefined' && !!(window as any).__TAURI__,
      });
      throw error;
    }

    // Check if we have the Tauri core module
    if (!(window as any).__TAURI__.core) {
      const error = new Error('Tauri core module not available');
      logger.error('SafeInvoke', 'Core module not found', error, {
        command,
        context,
        tauriKeys: Object.keys((window as any).__TAURI__),
        coreType: typeof (window as any).__TAURI__.core,
      });
      throw error;
    }

    // Get invoke from core
    const { invoke } = (window as any).__TAURI__.core;
    if (!invoke) {
      const error = new Error('Tauri invoke function not available');
      logger.error('SafeInvoke', 'Invoke function not found', error, {
        command,
        context,
        coreAvailable: !!(window as any).__TAURI__.core,
        coreKeys: Object.keys((window as any).__TAURI__.core),
        invokeType: typeof invoke,
      });
      throw error;
    }

    logger.debug('SafeInvoke', `Calling Tauri command: ${command}`, {
      argsStringified: JSON.stringify(args),
      argTypes: args ? Object.entries(args).map(([k, v]) => [k, typeof v]) : null,
    });

    // Execute the command
    const result = (await invoke(command, args)) as T;

    const duration = performance.now() - startTime;

    logger.info('SafeInvoke', `Command successful: ${command}`, {
      context,
      duration: `${duration.toFixed(2)}ms`,
      resultType: typeof result,
      resultKeys: result && typeof result === 'object' ? Object.keys(result) : null,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    // Enhanced error logging
    const errorDetails = {
      command,
      context,
      args,
      duration: `${duration.toFixed(2)}ms`,
      errorType: error?.constructor?.name,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      tauriError:
        error && typeof error === 'object' && 'code' in error ? (error as any).code : undefined,
    };

    logger.error(
      'SafeInvoke',
      `Command failed: ${command}`,
      error instanceof Error ? error : new Error(String(error)),
      errorDetails,
    );

    // Log additional debugging info
    if (error && typeof error === 'object') {
      logger.debug('SafeInvoke', 'Error object details', {
        keys: Object.keys(error),
        entries: Object.entries(error).map(([k, v]) => [
          k,
          typeof v === 'object' ? JSON.stringify(v) : v,
        ]),
      });
    }

    throw error;
  }
}
