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
  return (
    typeof window !== 'undefined' && !(window as any).__TAURI__ && typeof process === 'undefined'
  );
};

/**
 * Check if we're running in Tauri desktop environment
 */
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
};

/**
 * Check if we're running in test environment
 */
export const isTest = (): boolean => {
  // eslint-disable-next-line no-undef
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
};
