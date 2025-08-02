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

      // Mock all hooks to return the same web environment error
      mockSafeInvoke.mockRejectedValue(webEnvironmentError);

      // Test useKeyGeneration
      const keyGenResult = renderHook(() => useKeyGeneration());

      act(() => {
        keyGenResult.result.current.setLabel('test');
        keyGenResult.result.current.setPassphrase('test123');
      });

      await act(async () => {
        await expect(keyGenResult.result.current.generateKey()).rejects.toEqual(
          webEnvironmentError,
        );
      });

      expect(keyGenResult.result.current.error).toEqual(webEnvironmentError);

      // Test useFileEncryption
      const fileEncResult = renderHook(() => useFileEncryption());

      await act(async () => {
        await expect(fileEncResult.result.current.selectFiles('Files')).rejects.toEqual(
          webEnvironmentError,
        );
      });

      expect(fileEncResult.result.current.error).toEqual(webEnvironmentError);

      // Test useFileDecryption
      const fileDecResult = renderHook(() => useFileDecryption());

      await act(async () => {
        await expect(fileDecResult.result.current.selectEncryptedFile()).rejects.toEqual(
          webEnvironmentError,
        );
      });

      expect(fileDecResult.result.current.error).toEqual(webEnvironmentError);
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
        const current = result.current as any;
        if ('setLabel' in current && 'setPassphrase' in current) {
          act(() => {
            current.setLabel('test-key-label');
            current.setPassphrase('StrongPassword123!');
          });
        }

        // Try to perform an operation that would trigger the API
        let operationPromise: Promise<any>;
        if ('generateKey' in current) {
          operationPromise = current.generateKey();
        } else if ('selectFiles' in current) {
          operationPromise = current.selectFiles('Files');
        } else if ('selectEncryptedFile' in current) {
          operationPromise = current.selectEncryptedFile();
        } else {
          continue;
        }

        await act(async () => {
          await expect(operationPromise).rejects.toThrow();
        });

        // All hooks should handle the error and set appropriate error state
        expect(current.error).toBeTruthy();
        expect(current.isLoading).toBe(false);
      }
    });
  });

  describe('API Call Consistency', () => {
    it('should use safeInvoke for all Tauri commands across hooks', async () => {
      // Test that all hooks consistently use safeInvoke instead of direct invoke

      // Setup successful responses
      mockSafeInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' }) // useKeyGeneration validation
        .mockResolvedValueOnce({ key_id: 'test', public_key: 'age1test', saved_path: '/path' }) // useKeyGeneration generate
        .mockResolvedValueOnce({
          paths: ['/test'],
          selection_type: 'Files',
          total_size: 100,
          file_count: 1,
        }) // useFileEncryption select
        .mockResolvedValueOnce({ output_path: '/encrypted.age', file_size: 200 }) // useFileEncryption encrypt
        .mockResolvedValueOnce({
          paths: ['/test.age'],
          selection_type: 'Files',
          total_size: 200,
          file_count: 1,
        }) // useFileDecryption select
        .mockResolvedValueOnce({
          output_dir: '/decrypted',
          extracted_files: ['file.txt'],
          manifest_verified: true,
        }); // useFileDecryption decrypt

      // Test useKeyGeneration
      const keyGenResult = renderHook(() => useKeyGeneration());
      act(() => {
        keyGenResult.result.current.setLabel('test-key-label');
        keyGenResult.result.current.setPassphrase('StrongPassword123!');
      });

      await act(async () => {
        await keyGenResult.result.current.generateKey();
      });

      expect(mockSafeInvoke).toHaveBeenCalledWith(
        'validate_passphrase',
        expect.any(Object),
        expect.any(String),
      );
      expect(mockSafeInvoke).toHaveBeenCalledWith(
        'generate_key',
        expect.any(Object),
        expect.any(String),
      );

      // Test useFileEncryption
      const fileEncResult = renderHook(() => useFileEncryption());

      await act(async () => {
        await fileEncResult.result.current.selectFiles('Files');
      });

      expect(mockSafeInvoke).toHaveBeenCalledWith(
        'select_files',
        expect.any(Object),
        expect.any(String),
      );

      await act(async () => {
        await fileEncResult.result.current.encryptFiles('age1test', '/output');
      });

      expect(mockSafeInvoke).toHaveBeenCalledWith(
        'encrypt_files',
        expect.any(Object),
        expect.any(String),
      );

      // Test useFileDecryption
      const fileDecResult = renderHook(() => useFileDecryption());

      await act(async () => {
        await fileDecResult.result.current.selectEncryptedFile();
      });

      expect(mockSafeInvoke).toHaveBeenCalledWith(
        'select_files',
        expect.any(Object),
        expect.any(String),
      );

      act(() => {
        fileDecResult.result.current.setPassphrase('password');
        fileDecResult.result.current.setOutputPath('/output');
        fileDecResult.result.current.setKeyId('age1test');
      });

      await act(async () => {
        await fileDecResult.result.current.decryptFile();
      });

      expect(mockSafeInvoke).toHaveBeenCalledWith(
        'decrypt_data',
        expect.any(Object),
        expect.any(String),
      );
    });

    it('should use safeListen for progress tracking across hooks', async () => {
      let progressHandlers: Array<(event: { payload: any }) => void> = [];

      mockSafeListen.mockImplementation(async (_event, handler) => {
        progressHandlers.push(handler);
        return () => Promise.resolve();
      });

      // Mock successful operations
      mockSafeInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' })
        .mockResolvedValueOnce({ key_id: 'test', public_key: 'age1test', saved_path: '/path' });

      const keyGenResult = renderHook(() => useKeyGeneration());

      act(() => {
        keyGenResult.result.current.setLabel('test-key-label');
        keyGenResult.result.current.setPassphrase('StrongPassword123!');
      });

      const generatePromise = await act(async () => {
        return keyGenResult.result.current.generateKey();
      });

      // Should set up progress listener
      expect(mockSafeListen).toHaveBeenCalledWith('key-generation-progress', expect.any(Function));

      // Simulate progress event
      if (progressHandlers.length > 0) {
        act(() => {
          progressHandlers[0]({ payload: { progress: 50, message: 'Generating...' } });
        });

        expect(keyGenResult.result.current.progress).toEqual({
          progress: 50,
          message: 'Generating...',
        });
      }

      await generatePromise;

      // Similar pattern should work for other hooks
      expect(keyGenResult.result.current.success).toBeTruthy();
    });
  });

  describe('Error Recovery Across Hooks', () => {
    it('should allow error recovery and retry for all hooks after API failures', async () => {
      // Test error recovery pattern is consistent across all hooks

      // First attempt fails for all hooks
      mockSafeInvoke.mockRejectedValueOnce(new Error('Network error'));

      const keyGenResult = renderHook(() => useKeyGeneration());

      act(() => {
        keyGenResult.result.current.setLabel('test-key-label');
        keyGenResult.result.current.setPassphrase('StrongPassword123!');
      });

      await act(async () => {
        await expect(keyGenResult.result.current.generateKey()).rejects.toThrow('Network error');
      });

      expect(keyGenResult.result.current.error).toBeTruthy();

      // Clear error and retry
      act(() => {
        keyGenResult.result.current.clearError();
      });

      expect(keyGenResult.result.current.error).toBeNull();

      // Second attempt succeeds
      mockSafeInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' })
        .mockResolvedValueOnce({ key_id: 'test', public_key: 'age1test', saved_path: '/path' });

      await act(async () => {
        await keyGenResult.result.current.generateKey();
      });

      expect(keyGenResult.result.current.success).toBeTruthy();
      expect(keyGenResult.result.current.error).toBeNull();
    });

    it('should handle state cleanup properly across hooks when errors occur', async () => {
      const networkError = new Error('Connection failed');

      // Test each hook's state cleanup after errors
      const hooks = [
        {
          factory: () => useKeyGeneration(),
          setup: (result: any) => {
            result.current.setLabel('test-key-label');
            result.current.setPassphrase('StrongPassword123!');
          },
          operation: (result: any) => result.current.generateKey(),
        },
        {
          factory: () => useFileEncryption(),
          setup: () => {},
          operation: (result: any) => result.current.selectFiles('Files'),
        },
        {
          factory: () => useFileDecryption(),
          setup: () => {},
          operation: (result: any) => result.current.selectEncryptedFile(),
        },
      ];

      for (const { factory, setup, operation } of hooks) {
        mockSafeInvoke.mockRejectedValueOnce(networkError);

        const { result } = renderHook(factory as () => any);

        setup(result);

        await act(async () => {
          await expect(operation(result)).rejects.toThrow('Connection failed');
        });

        // All hooks should have consistent error state handling
        const current = result.current as any;
        expect(current.error).toBeTruthy();
        expect(current.isLoading).toBe(false);
        expect(current.progress).toBeNull();

        // Reset should clear all error state
        act(() => {
          current.reset();
        });

        expect(current.error).toBeNull();
        expect(current.isLoading).toBe(false);
        expect(current.progress).toBeNull();
      }
    });
  });

  describe('Memory and Resource Management', () => {
    it('should properly clean up progress listeners across all hooks', async () => {
      const mockUnlisten = vi.fn(() => Promise.resolve());
      mockSafeListen.mockResolvedValue(mockUnlisten);

      // Test that all hooks that use progress tracking clean up properly
      mockSafeInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' })
        .mockRejectedValueOnce(new Error('Operation cancelled'));

      const keyGenResult = renderHook(() => useKeyGeneration());

      act(() => {
        keyGenResult.result.current.setLabel('test-key-label');
        keyGenResult.result.current.setPassphrase('StrongPassword123!');
      });

      await act(async () => {
        await expect(keyGenResult.result.current.generateKey()).rejects.toThrow(
          'Operation cancelled',
        );
      });

      // Unlisten should be called even when operation fails
      expect(mockUnlisten).toHaveBeenCalledTimes(1);
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
      const generatePromise = act(async () => {
        return result.current.generateKey().catch(() => {
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
      await generatePromise;
    });
  });
});
