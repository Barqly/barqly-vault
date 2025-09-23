/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import { CommandError, ErrorCode } from '../../../lib/api-types';
import { mockInvoke } from '../../../test-setup';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useFileEncryption - Encryption Failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should handle encryption errors', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const encryptionError: CommandError = {
      code: ErrorCode.ENCRYPTION_FAILED,
      message: 'Failed to encrypt files',
      recovery_guidance: 'Please check your files and try again',
      user_actionable: true,
    };

    // Mock get_file_info for file selection
    mockInvoke.mockResolvedValueOnce([
      {
        path: '/path/to/file.txt',
        name: 'file.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ]);

    // Select files first
    await act(async () => {
      await result.current.selectFiles(['/path/to/file.txt'], 'Files');
    });

    // Mock the encryption to fail
    mockInvoke.mockRejectedValueOnce(encryptionError);

    // Try to encrypt
    await act(async () => {
      try {
        await result.current.encryptFiles('test-key', 'output');
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toEqual(encryptionError);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.success).toBe(null);
  });

  it('should re-throw errors for component handling', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const encryptionError: CommandError = {
      code: ErrorCode.ENCRYPTION_FAILED,
      message: 'Failed to encrypt files',
      recovery_guidance: 'Please check your files and try again',
      user_actionable: true,
    };

    // Mock get_file_info for file selection
    mockInvoke.mockResolvedValueOnce([
      {
        path: '/path/to/file.txt',
        name: 'file.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ]);

    // Select files first
    await act(async () => {
      await result.current.selectFiles(['/path/to/file.txt'], 'Files');
    });

    // Mock the encryption to fail
    mockInvoke.mockRejectedValueOnce(encryptionError);

    // Verify the error is thrown
    await expect(
      act(async () => {
        await result.current.encryptFiles('test-key');
      }),
    ).rejects.toEqual(encryptionError);
  });

  it('should handle generic errors and convert them to CommandError', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const genericError = new Error('Something went wrong');

    // Mock get_file_info for file selection
    mockInvoke.mockResolvedValueOnce([
      {
        path: '/path/to/file.txt',
        name: 'file.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ]);

    // Select files first
    await act(async () => {
      await result.current.selectFiles(['/path/to/file.txt'], 'Files');
    });

    // Mock encryption to fail with generic error
    mockInvoke.mockRejectedValueOnce(genericError);

    await act(async () => {
      try {
        await result.current.encryptFiles('test-key');
      } catch (_error) {
        // Expected to throw
      }
    });

    // Should convert generic error to CommandError
    expect(result.current.error).toEqual({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Something went wrong',
      recovery_guidance: 'Please try again. If the problem persists, check your system.',
      user_actionable: true,
    });
  });

  it('should validate that files are selected before encryption', async () => {
    const { result } = renderHook(() => useFileEncryption());

    // Try to encrypt without selecting files
    await act(async () => {
      try {
        await result.current.encryptFiles('test-key');
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toEqual({
      code: ErrorCode.INVALID_INPUT,
      message: 'No files selected for encryption',
      recovery_guidance: 'Please select files or folders to encrypt',
      user_actionable: true,
    });
  });

  it('should validate that key is provided', async () => {
    const { result } = renderHook(() => useFileEncryption());

    // Mock get_file_info for file selection
    mockInvoke.mockResolvedValueOnce([
      {
        path: '/path/to/file.txt',
        name: 'file.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ]);

    // Select files first
    await act(async () => {
      await result.current.selectFiles(['/path/to/file.txt'], 'Files');
    });

    // Try to encrypt without key
    await act(async () => {
      try {
        await result.current.encryptFiles('');
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toEqual({
      code: ErrorCode.INVALID_INPUT,
      message: 'Encryption key is required',
      recovery_guidance: 'Please select an encryption key',
      user_actionable: true,
    });
  });

  it('should clean up progress listener on error', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const encryptionError = new Error('Encryption failed');

    // Mock the listener to return an unlisten function
    const mockUnlisten = vi.fn();
    mockSafeListen.mockResolvedValueOnce(mockUnlisten);

    // Mock get_file_info for file selection
    mockInvoke.mockResolvedValueOnce([
      {
        path: '/file.txt',
        name: 'file.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ]);

    // Select files
    await act(async () => {
      await result.current.selectFiles(['/file.txt'], 'Files');
    });

    // Mock encryption to fail
    mockInvoke.mockRejectedValueOnce(encryptionError);

    await act(async () => {
      try {
        await result.current.encryptFiles('test-key');
      } catch (_error) {
        // Expected to throw
      }
    });

    // Verify the listener was cleaned up
    expect(mockUnlisten).toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });

  it('should handle errors during different stages of encryption', async () => {
    const { result } = renderHook(() => useFileEncryption());

    // Mock get_file_info for empty selection
    mockInvoke.mockResolvedValueOnce([]);

    // Test 1: Error when files are empty array
    await act(async () => {
      await result.current.selectFiles([], 'Files');
    });

    await act(async () => {
      try {
        await result.current.encryptFiles('test-key');
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error?.code).toBe(ErrorCode.INVALID_INPUT);

    // Clear error
    act(() => {
      result.current.clearError();
    });

    // Mock get_file_info for second selection
    mockInvoke.mockResolvedValueOnce([
      {
        path: '/valid/file.txt',
        name: 'file.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ]);

    // Test 2: Successful file selection but encryption fails
    await act(async () => {
      await result.current.selectFiles(['/valid/file.txt'], 'Files');
    });

    const networkError: CommandError = {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Network error',
      recovery_guidance: 'Check your connection',
      user_actionable: true,
    };

    mockInvoke.mockRejectedValueOnce(networkError);

    await act(async () => {
      try {
        await result.current.encryptFiles('test-key');
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toEqual(networkError);
  });
});
