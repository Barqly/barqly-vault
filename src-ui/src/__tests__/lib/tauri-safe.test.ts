/* eslint-disable no-undef */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeInvoke, safeListen } from '../../lib/tauri-safe';
import { CommandError, ErrorCode } from '../../lib/api-types';

// Mock platform detection
vi.mock('../../lib/environment/platform', () => ({
  isTauri: vi.fn(),
}));

// Mock Tauri APIs - these should only be imported when isTauri() is true
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

import { isTauri } from '../../lib/environment/platform';

const mockIsTauri = vi.mocked(isTauri);

describe('tauri-safe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('safeInvoke', () => {
    describe('in Tauri environment', () => {
      beforeEach(() => {
        mockIsTauri.mockReturnValue(true);
      });

      it('should successfully invoke Tauri command', async () => {
        // Dynamic import mock - we need to mock the result of the import
        const mockInvoke = vi.fn().mockResolvedValue({ result: 'success' });

        // Mock the dynamic import
        vi.doMock('@tauri-apps/api/core', () => ({
          invoke: mockInvoke,
        }));

        const result = await safeInvoke('test_command', { param: 'value' });

        expect(result).toEqual({ result: 'success' });
        expect(mockInvoke).toHaveBeenCalledWith('test_command', { param: 'value' });
      });

      it('should handle Tauri command errors', async () => {
        const tauriError = new Error('Tauri command failed');
        const mockInvoke = vi.fn().mockRejectedValue(tauriError);

        vi.doMock('@tauri-apps/api/core', () => ({
          invoke: mockInvoke,
        }));

        await expect(safeInvoke('failing_command')).rejects.toThrow('Tauri command failed');
        expect(mockInvoke).toHaveBeenCalledWith('failing_command', undefined);
      });

      it('should pass through command arguments correctly', async () => {
        const mockInvoke = vi.fn().mockResolvedValue('ok');

        vi.doMock('@tauri-apps/api/core', () => ({
          invoke: mockInvoke,
        }));

        const args = {
          label: 'test-key',
          passphrase: 'secret123',
          options: { secure: true },
        };

        await safeInvoke('generate_key', args);

        expect(mockInvoke).toHaveBeenCalledWith('generate_key', args);
      });
    });

    describe('in web/browser environment', () => {
      beforeEach(() => {
        mockIsTauri.mockReturnValue(false);
      });

      it('should throw CommandError when not in Tauri environment', async () => {
        const expectedError: CommandError = {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'This feature requires the desktop application',
          recovery_guidance:
            'Please use the desktop version of Barqly Vault to access this feature',
          user_actionable: true,
        };

        await expect(safeInvoke('test_command')).rejects.toEqual(expectedError);
      });

      it('should not attempt to import Tauri APIs in web environment', async () => {
        // The key here is that we should get the error immediately without
        // any attempt to import @tauri-apps/api/core
        await expect(safeInvoke('test_command')).rejects.toMatchObject({
          code: ErrorCode.INTERNAL_ERROR,
          message: 'This feature requires the desktop application',
        });
      });

      it('should provide user-actionable error message', async () => {
        await expect(safeInvoke('generate_key')).rejects.toMatchObject({
          user_actionable: true,
          recovery_guidance:
            'Please use the desktop version of Barqly Vault to access this feature',
        });
      });
    });
  });

  describe('safeListen', () => {
    describe('in Tauri environment', () => {
      beforeEach(() => {
        mockIsTauri.mockReturnValue(true);
      });

      it('should successfully set up event listener', async () => {
        const mockUnlisten = vi.fn(() => Promise.resolve());
        const mockListen = vi.fn().mockResolvedValue(mockUnlisten);
        const mockHandler = vi.fn();

        vi.doMock('@tauri-apps/api/event', () => ({
          listen: mockListen,
        }));

        const unlisten = await safeListen('test-event', mockHandler);

        expect(mockListen).toHaveBeenCalledWith('test-event', mockHandler);
        expect(unlisten).toBe(mockUnlisten);
      });

      it('should handle event listener setup errors', async () => {
        const listenerError = new Error('Failed to set up listener');
        const mockListen = vi.fn().mockRejectedValue(listenerError);
        const mockHandler = vi.fn();

        vi.doMock('@tauri-apps/api/event', () => ({
          listen: mockListen,
        }));

        await expect(safeListen('test-event', mockHandler)).rejects.toThrow(
          'Failed to set up listener',
        );
      });

      it('should properly type the event handler', async () => {
        const mockUnlisten = vi.fn(() => Promise.resolve());
        const mockListen = vi.fn().mockResolvedValue(mockUnlisten);

        vi.doMock('@tauri-apps/api/event', () => ({
          listen: mockListen,
        }));

        interface TestPayload {
          progress: number;
          message: string;
        }

        const handler = vi.fn((event: { payload: TestPayload }) => {
          // This should be properly typed
          expect(typeof event.payload.progress).toBe('number');
          expect(typeof event.payload.message).toBe('string');
        });

        await safeListen<TestPayload>('progress-event', handler);

        expect(mockListen).toHaveBeenCalledWith('progress-event', handler);
      });
    });

    describe('in web/browser environment', () => {
      beforeEach(() => {
        mockIsTauri.mockReturnValue(false);
      });

      it('should return no-op unlisten function in web environment', async () => {
        const mockHandler = vi.fn();

        const unlisten = await safeListen('test-event', mockHandler);

        expect(typeof unlisten).toBe('function');

        // The unlisten function should be a no-op that returns a resolved promise
        const result = unlisten();
        expect(result).toBeInstanceOf(Promise);
        await expect(result).resolves.toBeUndefined();
      });

      it('should not attempt to import Tauri event APIs in web environment', async () => {
        const mockHandler = vi.fn();

        // Should not throw, should return gracefully
        const unlisten = await safeListen('test-event', mockHandler);
        expect(unlisten).toBeDefined();
        expect(typeof unlisten).toBe('function');
      });

      it('should handle multiple listeners in web environment', async () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        const unlisten1 = await safeListen('event1', handler1);
        const unlisten2 = await safeListen('event2', handler2);

        expect(unlisten1).toBeDefined();
        expect(unlisten2).toBeDefined();

        // Both should be no-op functions
        await expect(unlisten1()).resolves.toBeUndefined();
        await expect(unlisten2()).resolves.toBeUndefined();
      });
    });
  });

  describe('Environment Detection Integration', () => {
    it('should correctly switch behavior based on environment detection', async () => {
      // Test switching between environments
      mockIsTauri.mockReturnValue(true);

      const mockInvoke = vi.fn().mockResolvedValue('tauri-result');
      vi.doMock('@tauri-apps/api/core', () => ({
        invoke: mockInvoke,
      }));

      const tauriResult = await safeInvoke('test_command');
      expect(tauriResult).toBe('tauri-result');

      // Switch to web environment
      mockIsTauri.mockReturnValue(false);

      await expect(safeInvoke('test_command')).rejects.toMatchObject({
        code: ErrorCode.INTERNAL_ERROR,
      });
    });

    it('should handle edge case where isTauri returns undefined/null', async () => {
      // Test edge cases in environment detection
      mockIsTauri.mockReturnValue(undefined as any);

      await expect(safeInvoke('test_command')).rejects.toMatchObject({
        code: ErrorCode.INTERNAL_ERROR,
      });

      mockIsTauri.mockReturnValue(null as any);

      await expect(safeInvoke('test_command')).rejects.toMatchObject({
        code: ErrorCode.INTERNAL_ERROR,
      });
    });
  });

  describe('Critical Regression Prevention', () => {
    it('should prevent "Cannot read properties of undefined (reading \'invoke\')" error', async () => {
      // This test specifically prevents the regression where invoke was undefined
      mockIsTauri.mockReturnValue(false);

      // Should not throw undefined property error, should throw our controlled error
      await expect(safeInvoke('any_command')).rejects.toEqual({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'This feature requires the desktop application',
        recovery_guidance: 'Please use the desktop version of Barqly Vault to access this feature',
        user_actionable: true,
      });
    });

    it('should handle dynamic import failures gracefully', async () => {
      mockIsTauri.mockReturnValue(true);

      // Mock a dynamic import failure
      const originalImport = global.__vite_ssr_import__ || global.import;
      const mockImport = vi.fn().mockRejectedValue(new Error('Failed to import module'));

      // Override import temporarily - this simulates import failure
      (global as any).__vite_ssr_import__ = mockImport;

      try {
        await expect(safeInvoke('test_command')).rejects.toThrow('Failed to import module');
      } finally {
        // Restore original import
        if (originalImport) {
          (global as any).__vite_ssr_import__ = originalImport;
        } else {
          delete (global as any).__vite_ssr_import__;
        }
      }
    });

    it('should maintain consistent error format across all error scenarios', async () => {
      mockIsTauri.mockReturnValue(false);

      const error = await safeInvoke('test').catch((e) => e);

      // Ensure error follows our CommandError interface
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('recovery_guidance');
      expect(error).toHaveProperty('user_actionable');

      expect(typeof error.code).toBe('string');
      expect(typeof error.message).toBe('string');
      expect(typeof error.recovery_guidance).toBe('string');
      expect(typeof error.user_actionable).toBe('boolean');
    });
  });
});
