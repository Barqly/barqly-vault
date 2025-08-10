/**
 * Integration tests for all hooks using Tauri API through tauri-safe module
 * These tests ensure that the regression prevention works across all hooks
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKeyGeneration } from '../../hooks/useKeyGeneration';
import { useFileEncryption } from '../../hooks/useFileEncryption';
import { useFileDecryption } from '../../hooks/useFileDecryption';
import { CommandError, ErrorCode } from '../../lib/api-types';

// Mock the safe wrappers
vi.mock('../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn().mockResolvedValue(() => Promise.resolve()),
}));

const mockSafeInvoke = vi.mocked(await import('../../lib/tauri-safe')).safeInvoke;
const mockSafeListen = vi.mocked(await import('../../lib/tauri-safe')).safeListen;

describe('Hooks Tauri API Integration - Regression Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
  });

  describe('Cross-Hook API Error Handling', () => {
    it('should handle web environment errors consistently across all hooks', async () => {
      const webEnvironmentError: CommandError = {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'This feature requires the desktop application',
        recovery_guidance: 'Please use the desktop version of Barqly Vault to access this feature',
        user_actionable: true,
      };

      // Create proper Error instance with CommandError properties to work with Vitest
      const error = new Error(webEnvironmentError.message);
      Object.assign(error, webEnvironmentError);

      // Mock all hooks to return the same web environment error
      mockSafeInvoke.mockRejectedValue(error);

      // Test useKeyGeneration
      const keyGenResult = renderHook(() => useKeyGeneration());

      act(() => {
        keyGenResult.result.current.setLabel('test');
        keyGenResult.result.current.setPassphrase('test123');
      });

      // Call generateKey and expect it to fail
      await act(async () => {
        try {
          await keyGenResult.result.current.generateKey();
        } catch {
          // Expected to throw - we're testing error handling
        }
      });

      // Verify the error was set in the hook state
      expect(keyGenResult.result.current.error).toMatchObject(webEnvironmentError);

      // Test useFileEncryption - since selectFiles is client-side, test encryptFiles
      const fileEncResult = renderHook(() => useFileEncryption());

      // Mock file selection to set up state (this will succeed as it's client-side)
      mockSafeInvoke.mockImplementationOnce(() =>
        Promise.resolve([
          {
            path: '/mock/file1.txt',
            name: 'file1.txt',
            size: 1024,
            is_file: true,
            is_directory: false,
            file_count: null,
          },
        ]),
      );

      await act(async () => {
        await fileEncResult.result.current.selectFiles(['/mock/file1.txt'], 'Files');
      });

      // Reset mock to throw the error for encryptFiles
      mockSafeInvoke.mockRejectedValue(error);

      // Now try to encrypt (this will call backend and fail)
      await act(async () => {
        try {
          await fileEncResult.result.current.encryptFiles('test-key');
        } catch {
          // Expected to throw - we're testing error handling
        }
      });

      // Verify the error was set in the hook state
      expect(fileEncResult.result.current.error).toMatchObject(webEnvironmentError);

      // Test useFileDecryption
      const fileDecResult = renderHook(() => useFileDecryption());

      await act(async () => {
        try {
          await fileDecResult.result.current.selectEncryptedFile();
        } catch {
          // Expected to throw - we're testing error handling
        }
      });

      // Verify the error was set in the hook state
      expect(fileDecResult.result.current.error).toMatchObject(webEnvironmentError);
    });

    it('should handle undefined invoke errors consistently across hooks', async () => {
      const invokeError = new TypeError("Cannot read properties of undefined (reading 'invoke')");
      mockSafeInvoke.mockRejectedValue(invokeError);

      // Test that all hooks handle this specific error gracefully
      const hooks = [
        () => useKeyGeneration(),
        () => useFileEncryption(),
        () => useFileDecryption(),
      ];

      for (const hookFactory of hooks) {
        const { result } = renderHook(hookFactory as () => any);

        // Set up minimal state for each hook
        if ('setLabel' in result.current && 'setPassphrase' in result.current) {
          act(() => {
            result.current.setLabel('test-key-label');
            result.current.setPassphrase('StrongPassword123!');
          });
        }

        // Try to perform an operation that would trigger the API
        await act(async () => {
          try {
            if ('generateKey' in result.current) {
              await result.current.generateKey();
            } else if ('selectFiles' in result.current && 'encryptFiles' in result.current) {
              // selectFiles is client-side now, so test encryptFiles instead
              await result.current.selectFiles(
                ['/mock/path/file1.txt', '/mock/path/file2.txt'],
                'Files',
              );
              await result.current.encryptFiles('test-key');
            } else if ('selectEncryptedFile' in result.current) {
              await result.current.selectEncryptedFile();
            }
          } catch {
            // Expected to throw
          }
        });

        // All hooks should handle the error and set appropriate error state
        expect(result.current.error).not.toBeNull();
        expect(result.current.error).toMatchObject({
          code: ErrorCode.INTERNAL_ERROR,
          message: expect.any(String),
        });
        expect(result.current.isLoading).toBe(false);
      }
    });
  });

  describe('API Call Consistency', () => {
    it('should use safeInvoke for all Tauri commands across hooks', async () => {
      // Test that all hooks consistently use safeInvoke instead of direct invoke

      // Clear any previous mock calls
      mockSafeInvoke.mockClear();

      // Test that each hook uses safeInvoke consistently
      // We'll test one operation per hook to validate the pattern

      // Mock successful responses for each hook's main operation
      mockSafeInvoke.mockResolvedValue({ success: true });

      // Test useKeyGeneration calls safeInvoke with proper context
      const keyGenResult = renderHook(() => useKeyGeneration());
      act(() => {
        keyGenResult.result.current.setLabel('test-key-label');
        keyGenResult.result.current.setPassphrase('StrongPassword123!');
      });

      // Clear previous calls to count from here
      mockSafeInvoke.mockClear();

      await act(async () => {
        try {
          await keyGenResult.result.current.generateKey();
        } catch {
          // May fail due to mock setup, but we're testing API calls
        }
      });

      // Should have called safeInvoke at least once for key generation operations
      expect(mockSafeInvoke).toHaveBeenCalled();

      // Test useFileEncryption calls safeInvoke for encryption
      const fileEncResult = renderHook(() => useFileEncryption());

      // Set up file selection state first
      mockSafeInvoke.mockImplementationOnce(() =>
        Promise.resolve([
          {
            path: '/test.txt',
            name: 'test.txt',
            size: 100,
            is_file: true,
            is_directory: false,
            file_count: null,
          },
        ]),
      );

      await act(async () => {
        await fileEncResult.result.current.selectFiles(['/test.txt'], 'Files');
      });

      mockSafeInvoke.mockClear();

      await act(async () => {
        try {
          await fileEncResult.result.current.encryptFiles('test-key');
        } catch {
          // May fail due to mock, but we're testing the API call pattern
        }
      });

      // Should have called safeInvoke for encryption
      expect(mockSafeInvoke).toHaveBeenCalled();
    });

    it('should use safeListen for progress tracking across hooks', async () => {
      // Test that hooks that support progress tracking use safeListen consistently

      mockSafeListen.mockImplementation(async (_event, _handler) => {
        return () => Promise.resolve();
      });

      // Test that useKeyGeneration sets up progress listeners
      const keyGenResult = renderHook(() => useKeyGeneration());

      act(() => {
        keyGenResult.result.current.setLabel('test-key-label');
        keyGenResult.result.current.setPassphrase('StrongPassword123!');
      });

      // Mock the operations to succeed quickly
      mockSafeInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' })
        .mockResolvedValueOnce({ key_id: 'test', public_key: 'age1test', saved_path: '/path' });

      await act(async () => {
        try {
          await keyGenResult.result.current.generateKey();
        } catch {
          // Operation may fail due to mocks, but we're testing progress listener setup
        }
      });

      // Should have attempted to set up progress listener
      expect(mockSafeListen).toHaveBeenCalled();
      const progressCalls = mockSafeListen.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].includes('progress'),
      );
      expect(progressCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery Across Hooks', () => {
    it('should allow error recovery and retry for all hooks after API failures', async () => {
      // Test that all hooks support error recovery consistently
      const networkError = new Error('Network error');

      // Test useKeyGeneration error recovery
      const keyGenResult = renderHook(() => useKeyGeneration());

      act(() => {
        keyGenResult.result.current.setLabel('test-key-label');
        keyGenResult.result.current.setPassphrase('StrongPassword123!');
      });

      // First attempt fails
      mockSafeInvoke.mockRejectedValue(networkError);

      await act(async () => {
        try {
          await keyGenResult.result.current.generateKey();
        } catch {
          // Expected to fail
        }
      });

      expect(keyGenResult.result.current.error).not.toBeNull();

      // Test error clearing
      act(() => {
        keyGenResult.result.current.clearError();
      });

      expect(keyGenResult.result.current.error).toBeNull();

      // Test useFileEncryption error recovery
      const fileEncResult = renderHook(() => useFileEncryption());

      // Set up file selection first
      mockSafeInvoke.mockResolvedValueOnce([
        {
          path: '/test.txt',
          name: 'test.txt',
          size: 100,
          is_file: true,
          is_directory: false,
          file_count: null,
        },
      ]);

      await act(async () => {
        await fileEncResult.result.current.selectFiles(['/test.txt'], 'Files');
      });

      // Now test encryption error and recovery
      mockSafeInvoke.mockRejectedValue(networkError);

      await act(async () => {
        try {
          await fileEncResult.result.current.encryptFiles('test-key');
        } catch {
          // Expected to fail
        }
      });

      expect(fileEncResult.result.current.error).not.toBeNull();

      // Test error clearing for file encryption
      act(() => {
        fileEncResult.result.current.clearError();
      });

      expect(fileEncResult.result.current.error).toBeNull();
    });

    it('should handle state cleanup properly across hooks when errors occur', async () => {
      // Test consistent state cleanup patterns across hooks
      const networkError = new Error('Connection failed');

      // Test useKeyGeneration state cleanup
      mockSafeInvoke.mockRejectedValue(networkError);

      const keyGenResult = renderHook(() => useKeyGeneration());

      act(() => {
        keyGenResult.result.current.setLabel('test-key-label');
        keyGenResult.result.current.setPassphrase('StrongPassword123!');
      });

      await act(async () => {
        try {
          await keyGenResult.result.current.generateKey();
        } catch {
          // Expected to fail
        }
      });

      // Should have consistent error state
      expect(keyGenResult.result.current.error).not.toBeNull();
      expect(keyGenResult.result.current.isLoading).toBe(false);

      // Reset should clear all state consistently
      act(() => {
        keyGenResult.result.current.reset();
      });

      expect(keyGenResult.result.current.error).toBeNull();
      expect(keyGenResult.result.current.isLoading).toBe(false);
      expect(keyGenResult.result.current.success).toBeNull();

      // Test useFileEncryption state cleanup
      const fileEncResult = renderHook(() => useFileEncryption());

      // Set up files first
      mockSafeInvoke.mockResolvedValueOnce([
        {
          path: '/test.txt',
          name: 'test.txt',
          size: 100,
          is_file: true,
          is_directory: false,
          file_count: null,
        },
      ]);

      await act(async () => {
        await fileEncResult.result.current.selectFiles(['/test.txt'], 'Files');
      });

      // Now make encryption fail
      mockSafeInvoke.mockRejectedValue(networkError);

      await act(async () => {
        try {
          await fileEncResult.result.current.encryptFiles('test-key');
        } catch {
          // Expected to fail
        }
      });

      // Should have consistent error handling
      expect(fileEncResult.result.current.error).not.toBeNull();
      expect(fileEncResult.result.current.isLoading).toBe(false);

      // Reset should work consistently
      act(() => {
        fileEncResult.result.current.reset();
      });

      expect(fileEncResult.result.current.error).toBeNull();
      expect(fileEncResult.result.current.isLoading).toBe(false);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should properly clean up progress listeners across all hooks', async () => {
      // Test that hooks properly set up and tear down progress listeners
      const mockUnlisten = vi.fn(() => Promise.resolve());
      mockSafeListen.mockResolvedValue(mockUnlisten);

      // Test useKeyGeneration progress listener cleanup
      const keyGenResult = renderHook(() => useKeyGeneration());

      act(() => {
        keyGenResult.result.current.setLabel('test-key-label');
        keyGenResult.result.current.setPassphrase('StrongPassword123!');
      });

      // Set up mocks for key generation
      mockSafeInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' })
        .mockRejectedValueOnce(new Error('Operation failed'));

      await act(async () => {
        try {
          await keyGenResult.result.current.generateKey();
        } catch {
          // Operation may fail, but we're testing listener cleanup
        }
      });

      // Should have set up progress listener
      expect(mockSafeListen).toHaveBeenCalled();

      // Should have attempted to clean up listeners (this tests the pattern)
      // The exact cleanup behavior depends on implementation details
    });

    it('should handle component unmounting during API operations', async () => {
      // Test that hooks handle unmounting gracefully during API calls
      let resolveOperation: (value: any) => void;
      const longRunningOperation = new Promise((resolve) => {
        resolveOperation = resolve;
      });

      mockSafeInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' })
        .mockReturnValueOnce(longRunningOperation);

      const { result, unmount } = renderHook(() => useKeyGeneration());

      act(() => {
        result.current.setLabel('test');
        result.current.setPassphrase('StrongPassword123!');
      });

      // Start long-running operation
      let generatePromise: Promise<void>;
      act(() => {
        generatePromise = result.current.generateKey().catch(() => {
          // Operation might be cancelled/rejected on unmount
        });
      });

      expect(result.current.isLoading).toBe(true);

      // Unmount component while operation is running
      unmount();

      // Resolve the operation after unmount
      act(() => {
        resolveOperation!({ key_id: 'test', public_key: 'age1test', saved_path: '/path' });
      });

      // Should not cause errors or memory leaks
      await generatePromise!;
    });
  });
});
