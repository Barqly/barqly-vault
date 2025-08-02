import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import { CommandError, ErrorCode, FileSelection } from '../../../lib/api-types';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeInvoke = vi.mocked(await import('../../../lib/tauri-safe')).safeInvoke;
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

    // First select files to set up the state
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/file.txt'],
      selection_type: 'Files',
      total_size: 1024,
      file_count: 1,
    };

    mockSafeInvoke.mockResolvedValueOnce(mockFileSelection);
    mockSafeInvoke.mockRejectedValueOnce(encryptionError);

    await act(async () => {
      await result.current.selectFiles('Files');
    });

    await act(async () => {
      try {
        await result.current.encryptFiles('test-key', '/output');
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toEqual(encryptionError);
    expect(result.current.isLoading).toBe(false);
  });

  it('should re-throw errors for component handling', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const encryptionError: CommandError = {
      code: ErrorCode.ENCRYPTION_FAILED,
      message: 'Failed to encrypt files',
      recovery_guidance: 'Please check your files and try again',
      user_actionable: true,
    };

    // First select files to set up the state
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/file.txt'],
      selection_type: 'Files',
      total_size: 1024,
      file_count: 1,
    };

    mockSafeInvoke.mockResolvedValueOnce(mockFileSelection);
    mockSafeInvoke.mockRejectedValueOnce(encryptionError);

    await act(async () => {
      await result.current.selectFiles('Files');
    });

    let thrownError: CommandError | null = null;

    await act(async () => {
      try {
        await result.current.encryptFiles('test-key', '/output');
      } catch (error) {
        thrownError = error as CommandError;
      }
    });

    expect(thrownError).toEqual(encryptionError);
  });

  it('should clear error correctly', async () => {
    const { result } = renderHook(() => useFileEncryption());

    // First, create an error
    await act(async () => {
      try {
        await result.current.encryptFiles('', '/output');
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).not.toBe(null);

    // Clear the error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });
});
