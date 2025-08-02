/* eslint-disable no-undef */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isBrowser, isTauri, isTest } from '../../../lib/environment/platform';

// Save original values
const originalWindow = global.window;
const originalProcess = global.process;

describe('platform detection', () => {
  beforeEach(() => {
    // Clear any mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original globals
    global.window = originalWindow;
    global.process = originalProcess;
  });

  describe('isBrowser', () => {
    it('should return true in browser environment', () => {
      // Mock browser environment: window exists, no __TAURI__, no process
      global.window = {
        location: { href: 'http://localhost:3000' },
      } as any;
      delete (global as any).process;

      expect(isBrowser()).toBe(true);
    });

    it('should return false when __TAURI__ is present', () => {
      // Mock Tauri environment
      global.window = {
        __TAURI__: {},
        location: { href: 'tauri://localhost' },
      } as any;
      delete (global as any).process;

      expect(isBrowser()).toBe(false);
    });

    it('should return false when __TAURI_INTERNALS__ is present (Tauri v2)', () => {
      global.window = {
        __TAURI_INTERNALS__: {},
        location: { href: 'tauri://localhost' },
      } as any;
      delete (global as any).process;

      expect(isBrowser()).toBe(false);
    });

    it('should return false when window.isTauri is present (Tauri v2)', () => {
      global.window = {
        isTauri: true,
        location: { href: 'tauri://localhost' },
      } as any;
      delete (global as any).process;

      expect(isBrowser()).toBe(false);
    });

    it('should return false when process is defined (Node.js environment)', () => {
      global.window = {
        location: { href: 'http://localhost:3000' },
      } as any;
      global.process = {
        env: { NODE_ENV: 'test' },
      } as any;

      expect(isBrowser()).toBe(false);
    });

    it('should return false when window is undefined (SSR/Node.js)', () => {
      delete (global as any).window;
      delete (global as any).process;

      expect(isBrowser()).toBe(false);
    });

    it('should handle edge cases with window object', () => {
      // Test with empty window object
      global.window = {} as any;
      delete (global as any).process;

      expect(isBrowser()).toBe(true);

      // Test with null __TAURI__
      global.window = {
        __TAURI__: null,
      } as any;

      expect(isBrowser()).toBe(true);

      // Test with undefined __TAURI__
      global.window = {
        __TAURI__: undefined,
      } as any;

      expect(isBrowser()).toBe(true);
    });
  });

  describe('isTauri', () => {
    it('should return true when __TAURI__ is present and truthy', () => {
      global.window = {
        __TAURI__: {
          invoke: vi.fn(),
          listen: vi.fn(),
        },
      } as any;

      expect(isTauri()).toBe(true);
    });

    it('should return true when __TAURI_INTERNALS__ is present (Tauri v2)', () => {
      global.window = {
        __TAURI_INTERNALS__: {
          invoke: vi.fn(),
        },
      } as any;

      expect(isTauri()).toBe(true);
    });

    it('should return true when window.isTauri is present (Tauri v2)', () => {
      global.window = {
        isTauri: true,
      } as any;

      expect(isTauri()).toBe(true);
    });

    it('should return true when __TAURI_IPC__ is present (Tauri v2)', () => {
      global.window = {
        __TAURI_IPC__: {},
      } as any;

      expect(isTauri()).toBe(true);
    });

    it('should return false when window is undefined', () => {
      delete (global as any).window;

      expect(isTauri()).toBe(false);
    });

    it('should return false when all Tauri globals are falsy', () => {
      // Test with all globals null/undefined/false
      global.window = {
        __TAURI__: null,
        __TAURI_INTERNALS__: undefined,
        isTauri: false,
        __TAURI_IPC__: null,
      } as any;

      expect(isTauri()).toBe(false);

      // Test with empty string and 0
      global.window = {
        __TAURI__: '',
        __TAURI_INTERNALS__: 0,
        isTauri: null,
        __TAURI_IPC__: undefined,
      } as any;

      expect(isTauri()).toBe(false);
    });

    it('should return false when no Tauri globals are present', () => {
      global.window = {
        location: { href: 'http://localhost:3000' },
      } as any;

      expect(isTauri()).toBe(false);
    });

    it('should handle truthy __TAURI__ values correctly', () => {
      // Test with object
      global.window = {
        __TAURI__: { api: 'present' },
      } as any;

      expect(isTauri()).toBe(true);

      // Test with number
      global.window = {
        __TAURI__: 1,
      } as any;

      expect(isTauri()).toBe(true);

      // Test with string
      global.window = {
        __TAURI__: 'true',
      } as any;

      expect(isTauri()).toBe(true);

      // Test with array
      global.window = {
        __TAURI__: [],
      } as any;

      expect(isTauri()).toBe(true);
    });
  });

  describe('isTest', () => {
    it('should return true when NODE_ENV is test', () => {
      global.process = {
        env: { NODE_ENV: 'test' },
      } as any;

      expect(isTest()).toBe(true);
    });

    it('should return false when NODE_ENV is not test', () => {
      global.process = {
        env: { NODE_ENV: 'development' },
      } as any;

      expect(isTest()).toBe(false);

      global.process = {
        env: { NODE_ENV: 'production' },
      } as any;

      expect(isTest()).toBe(false);
    });

    it('should return false when process is undefined', () => {
      delete (global as any).process;

      expect(isTest()).toBe(false);
    });

    it('should return false when process.env is undefined', () => {
      global.process = {} as any;

      expect(isTest()).toBe(false);
    });

    it('should return false when NODE_ENV is undefined', () => {
      global.process = {
        env: {},
      } as any;

      expect(isTest()).toBe(false);
    });

    it('should handle edge cases with NODE_ENV values', () => {
      // Test with null
      global.process = {
        env: { NODE_ENV: null },
      } as any;

      expect(isTest()).toBe(false);

      // Test with empty string
      global.process = {
        env: { NODE_ENV: '' },
      } as any;

      expect(isTest()).toBe(false);

      // Test with 'Test' (case sensitivity)
      global.process = {
        env: { NODE_ENV: 'Test' },
      } as any;

      expect(isTest()).toBe(false);

      // Test with 'TEST'
      global.process = {
        env: { NODE_ENV: 'TEST' },
      } as any;

      expect(isTest()).toBe(false);
    });
  });

  describe('Environment Combinations', () => {
    it('should handle browser in development', () => {
      global.window = {
        location: { href: 'http://localhost:3000' },
      } as any;
      global.process = {
        env: { NODE_ENV: 'development' },
      } as any;

      expect(isBrowser()).toBe(false); // process is defined
      expect(isTauri()).toBe(false);
      expect(isTest()).toBe(false);
    });

    it('should handle Tauri in test environment', () => {
      global.window = {
        __TAURI__: { invoke: vi.fn() },
      } as any;
      global.process = {
        env: { NODE_ENV: 'test' },
      } as any;

      expect(isBrowser()).toBe(false);
      expect(isTauri()).toBe(true);
      expect(isTest()).toBe(true);
    });

    it('should handle SSR environment', () => {
      delete (global as any).window;
      global.process = {
        env: { NODE_ENV: 'production' },
      } as any;

      expect(isBrowser()).toBe(false);
      expect(isTauri()).toBe(false);
      expect(isTest()).toBe(false);
    });

    it('should handle browser production build', () => {
      global.window = {
        location: { href: 'https://app.example.com' },
      } as any;
      delete (global as any).process;

      expect(isBrowser()).toBe(true);
      expect(isTauri()).toBe(false);
      expect(isTest()).toBe(false);
    });
  });

  describe('Critical Regression Prevention', () => {
    it('should not throw when accessing undefined properties', () => {
      // Test accessing properties on undefined objects
      delete (global as any).window;
      delete (global as any).process;

      expect(() => isBrowser()).not.toThrow();
      expect(() => isTauri()).not.toThrow();
      expect(() => isTest()).not.toThrow();

      expect(isBrowser()).toBe(false);
      expect(isTauri()).toBe(false);
      expect(isTest()).toBe(false);
    });

    it('should handle malformed global objects', () => {
      // Test with malformed window
      global.window = null as any;

      expect(() => isBrowser()).not.toThrow();
      expect(() => isTauri()).not.toThrow();
      expect(isBrowser()).toBe(false);
      expect(isTauri()).toBe(false);

      // Test with malformed process
      global.process = null as any;

      expect(() => isTest()).not.toThrow();
      expect(isTest()).toBe(false);
    });

    it('should maintain consistent boolean return types', () => {
      // Ensure all functions always return boolean, never undefined or null
      const testCases = [
        () => {
          delete (global as any).window;
          delete (global as any).process;
        },
        () => {
          global.window = {} as any;
          global.process = {} as any;
        },
        () => {
          global.window = { __TAURI__: {} } as any;
          global.process = { env: { NODE_ENV: 'test' } } as any;
        },
      ];

      testCases.forEach((setup, index) => {
        setup();

        const browserResult = isBrowser();
        const tauriResult = isTauri();
        const testResult = isTest();

        expect(typeof browserResult).toBe(
          'boolean',
          `isBrowser should return boolean in case ${index}`,
        );
        expect(typeof tauriResult).toBe(
          'boolean',
          `isTauri should return boolean in case ${index}`,
        );
        expect(typeof testResult).toBe('boolean', `isTest should return boolean in case ${index}`);
      });
    });
  });
});
