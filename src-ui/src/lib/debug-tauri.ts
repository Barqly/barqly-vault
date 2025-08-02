/**
 * Debug utilities for Tauri API troubleshooting
 */

import { logger } from './logger';

export async function debugTauriEnvironment(): Promise<void> {
  logger.info('DebugTauri', 'Starting Tauri environment diagnostics');

  // Check window object
  if (typeof window === 'undefined') {
    logger.error('DebugTauri', 'Window object is undefined');
    return;
  }

  const windowAny = window as any;

  // Log all Tauri-related properties
  logger.info('DebugTauri', 'Window Tauri properties', {
    __TAURI__: !!windowAny.__TAURI__,
    __TAURI_INTERNALS__: !!windowAny.__TAURI_INTERNALS__,
    __TAURI_IPC__: !!windowAny.__TAURI_IPC__,
    __TAURI_CORE__: !!windowAny.__TAURI_CORE__,
    isTauri: !!windowAny.isTauri,
    tauriKeys: Object.keys(windowAny).filter((key) => key.includes('TAURI')),
  });

  // Check if __TAURI__ is available
  if (!windowAny.__TAURI__) {
    logger.error('DebugTauri', '__TAURI__ global not found');
    return;
  }

  // Log __TAURI__ structure
  logger.info('DebugTauri', '__TAURI__ structure', {
    keys: Object.keys(windowAny.__TAURI__),
    core: !!windowAny.__TAURI__.core,
    coreKeys: windowAny.__TAURI__.core ? Object.keys(windowAny.__TAURI__.core) : [],
    invoke: typeof windowAny.__TAURI__.core?.invoke,
  });

  // Try to access invoke directly
  if (windowAny.__TAURI__.core?.invoke) {
    logger.info('DebugTauri', 'Direct invoke function found', {
      invokeType: typeof windowAny.__TAURI__.core.invoke,
      invokeString: windowAny.__TAURI__.core.invoke.toString().substring(0, 100),
    });

    // Try a simple test command
    try {
      logger.info('DebugTauri', 'Testing direct invoke with validate_passphrase command');
      const result = await windowAny.__TAURI__.core.invoke('validate_passphrase', {
        passphrase: 'test123',
      });
      logger.info('DebugTauri', 'Direct invoke test successful', { result });
    } catch (error) {
      logger.error(
        'DebugTauri',
        'Direct invoke test failed',
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  // Try dynamic import
  try {
    logger.info('DebugTauri', 'Testing dynamic import @tauri-apps/api/core');
    const tauriCore = await import('@tauri-apps/api/core');
    logger.info('DebugTauri', 'Dynamic import successful', {
      keys: Object.keys(tauriCore),
      invoke: typeof tauriCore.invoke,
    });

    if (tauriCore.invoke) {
      // Test with a simple command
      try {
        logger.info('DebugTauri', 'Testing imported invoke with validate_passphrase command');
        const result = await tauriCore.invoke('validate_passphrase', {
          passphrase: 'test123',
        });
        logger.info('DebugTauri', 'Imported invoke test successful', { result });
      } catch (error) {
        logger.error(
          'DebugTauri',
          'Imported invoke test failed',
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
  } catch (error) {
    logger.error(
      'DebugTauri',
      'Dynamic import failed',
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  // Check IPC mechanism
  if (windowAny.__TAURI_IPC__) {
    logger.info('DebugTauri', '__TAURI_IPC__ found', {
      type: typeof windowAny.__TAURI_IPC__,
      keys: typeof windowAny.__TAURI_IPC__ === 'object' ? Object.keys(windowAny.__TAURI_IPC__) : [],
    });
  }

  // Check internals
  if (windowAny.__TAURI_INTERNALS__) {
    logger.info('DebugTauri', '__TAURI_INTERNALS__ found', {
      type: typeof windowAny.__TAURI_INTERNALS__,
      keys:
        typeof windowAny.__TAURI_INTERNALS__ === 'object'
          ? Object.keys(windowAny.__TAURI_INTERNALS__)
          : [],
    });
  }

  logger.info('DebugTauri', 'Tauri environment diagnostics complete');
}

// Auto-run in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      debugTauriEnvironment().catch(console.error);
    }, 1000);
  });
}
