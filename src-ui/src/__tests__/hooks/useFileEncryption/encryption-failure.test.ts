import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import { CommandError, ErrorCode, FileSelection } from '../../../lib/api-types';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;
const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useFileEncryption - Encryption Failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
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

    mockInvoke.mockResolvedValueOnce(mockFileSelection);
    mockInvoke.mockRejectedValueOnce(encryptionError);

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

    mockInvoke.mockResolvedValueOnce(mockFileSelection);
    mockInvoke.mockRejectedValueOnce(encryptionError);

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
