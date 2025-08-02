/**
 * Platform detection utilities
 *
 * Provides consistent platform detection across the application
 * to determine if we're running in Tauri desktop or browser environment
 */

/**
 * Check if we're running in a browser environment (not Tauri desktop)
 * In test environment, we should use the real Tauri commands
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && !isTauri() && typeof process === 'undefined';
};

/**
 * Check if we're running in Tauri desktop environment
 *
 * In Tauri v2, the primary detection method is through __TAURI_INTERNALS__
 * which is always available, while __TAURI__ requires explicit configuration.
 */
export const isTauri = (): boolean => {
  if (typeof window === 'undefined' || window === null) {
    return false;
  }

  const windowAny = window as any;

  // Log detailed window properties for debugging
  try {
    if (import.meta.env?.DEV) {
      console.log('[Platform Detection] Window properties:', {
        __TAURI_INTERNALS__: !!windowAny?.__TAURI_INTERNALS__,
        isTauri: !!windowAny?.isTauri,
        __TAURI_IPC__: !!windowAny?.__TAURI_IPC__,
        __TAURI__: !!windowAny?.__TAURI__,
        __TAURI_CORE__: !!windowAny?.__TAURI_CORE__,
        userAgent: navigator?.userAgent,
        windowKeys: Object.keys(windowAny).filter((key) => key.includes('TAURI')),
      });
    }
  } catch {
    // Ignore errors in test environment when import.meta.env is not available
  }

  // Primary detection methods for Tauri v2:
  // 1. __TAURI_INTERNALS__ - Always available in Tauri v2
  // 2. window.isTauri - Added in v2.0.0-beta.9 as official detection
  // 3. __TAURI_IPC__ - Alternative detection method
  // 4. __TAURI__ - Only available if withGlobalTauri is enabled
  return !!(
    windowAny?.__TAURI_INTERNALS__ ||
    windowAny?.isTauri ||
    windowAny?.__TAURI_IPC__ ||
    windowAny?.__TAURI__
  );
};

/**
 * Check if we're running in test environment
 */
export const isTest = (): boolean => {
  // eslint-disable-next-line no-undef
  return typeof process !== 'undefined' && process !== null && process.env?.NODE_ENV === 'test';
};
