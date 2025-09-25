/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import type { ErrorCode } from '../../bindings';
import { mockInvoke } from '../../../test-setup';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useFileEncryption - Encryption Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should validate required inputs before encryption', async () => {
    const { result } = renderHook(() => useFileEncryption());

    await act(async () => {
      try {
        await result.current.encryptFiles('');
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

  it('should validate key ID is provided', async () => {
    const { result } = renderHook(() => useFileEncryption());

    // Mock get_file_info response for file selection
    mockInvoke.mockResolvedValueOnce([
      {
        path: '/mock/path/file1.txt',
        name: 'file1.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
      {
        path: '/mock/path/file2.txt',
        name: 'file2.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ]);

    await act(async () => {
      await result.current.selectFiles(['/mock/path/file1.txt', '/mock/path/file2.txt'], 'Files');
    });

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

  it('should validate file selection exists before encryption', async () => {
    const { result } = renderHook(() => useFileEncryption());

    // Try to encrypt without selecting files first
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

    // Ensure backend encrypt command was never called
    expect(mockInvoke).not.toHaveBeenCalledWith('encrypt_files', expect.anything());
  });

  it('should handle multiple validation errors appropriately', async () => {
    const { result } = renderHook(() => useFileEncryption());

    // Try to encrypt with both missing files and missing key
    await act(async () => {
      try {
        await result.current.encryptFiles('');
      } catch (_error) {
        // Expected to throw
      }
    });

    // Should prioritize the first validation error (no files selected)
    expect(result.current.error).toEqual({
      code: ErrorCode.INVALID_INPUT,
      message: 'No files selected for encryption',
      recovery_guidance: 'Please select files or folders to encrypt',
      user_actionable: true,
    });

    // Ensure no backend calls were made due to validation failure
    expect(mockInvoke).not.toHaveBeenCalledWith('encrypt_files', expect.anything());
  });

  it('should handle validation errors without calling backend', async () => {
    const { result } = renderHook(() => useFileEncryption());

    await act(async () => {
      try {
        await result.current.encryptFiles('');
      } catch (_error) {
        // Expected to throw
      }
    });

    // safeInvoke is called once for file selection
    expect(mockInvoke).not.toHaveBeenCalledWith('encrypt_files', expect.anything());
    expect(result.current.error).not.toBe(null);
  });
});
