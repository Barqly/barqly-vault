import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CommandError, ErrorCode } from '../../lib/api-types';

// Unmock tauri-safe since we're testing it
vi.unmock('../../lib/tauri-safe');

// Mock platform detection
const mockIsTauri = vi.fn();
vi.mock('../../lib/environment/platform', () => ({
  isTauri: mockIsTauri,
}));

// Mock logger to avoid console noise
vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('tauri-safe', () => {
  // Import after mocks are set up
  let safeInvoke: any;
  let safeListen: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockIsTauri.mockReset();

    // Clear module cache to ensure fresh import
    vi.resetModules();

    // Dynamic import after mocks are established
    const module = await import('../../lib/tauri-safe');
    safeInvoke = module.safeInvoke;
    safeListen = module.safeListen;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('safeInvoke', () => {
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

    describe('Environment Detection Integration', () => {
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
          recovery_guidance:
            'Please use the desktop version of Barqly Vault to access this feature',
          user_actionable: true,
        });
      });

      it('should maintain consistent error format across all error scenarios', async () => {
        mockIsTauri.mockReturnValue(false);

        const error = await safeInvoke('test').catch((e: any) => e);

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

  describe('safeListen', () => {
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
        expect(unlisten).not.toBeNull();
        expect(typeof unlisten).toBe('function');
      });

      it('should handle multiple listeners in web environment', async () => {
        const handler1 = vi.fn();
        const handler2 = vi.fn();

        const unlisten1 = await safeListen('event1', handler1);
        const unlisten2 = await safeListen('event2', handler2);

        expect(unlisten1).not.toBeNull();
        expect(typeof unlisten1).toBe('function');
        expect(unlisten2).not.toBeNull();
        expect(typeof unlisten2).toBe('function');

        // Both should be no-op functions
        await expect(unlisten1()).resolves.toBeUndefined();
        await expect(unlisten2()).resolves.toBeUndefined();
      });
    });
  });
});
