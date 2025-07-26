import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileDecryption } from '../../../hooks/useFileDecryption';
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

describe('useFileDecryption - Decryption Failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should handle decryption errors', async () => {
    const { result } = renderHook(() => useFileDecryption());
    const decryptionError: CommandError = {
      code: ErrorCode.DECRYPTION_FAILED,
      message: 'Failed to decrypt file',
      recovery_guidance: 'Please check your key and passphrase',
      user_actionable: true,
    };

    // First select a file
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/encrypted.age'],
      total_size: 1024,
      file_count: 1,
      selection_type: 'Files',
    };

    mockInvoke.mockResolvedValueOnce(mockFileSelection);
    mockInvoke.mockRejectedValueOnce(decryptionError);

    await act(async () => {
      await result.current.selectEncryptedFile();
    });

    // Set all required inputs
    act(() => {
      result.current.setKeyId('test-key');
      result.current.setPassphrase('test-passphrase');
      result.current.setOutputPath('/output');
    });

    await act(async () => {
      try {
        await result.current.decryptFile();
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toEqual(decryptionError);
    expect(result.current.isLoading).toBe(false);
  });

  it('should re-throw errors for component handling', async () => {
    const { result } = renderHook(() => useFileDecryption());
    const decryptionError: CommandError = {
      code: ErrorCode.DECRYPTION_FAILED,
      message: 'Failed to decrypt file',
      recovery_guidance: 'Please check your key and passphrase',
      user_actionable: true,
    };

    // First select a file
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/encrypted.age'],
      total_size: 1024,
      file_count: 1,
      selection_type: 'Files',
    };

    mockInvoke.mockResolvedValueOnce(mockFileSelection);
    mockInvoke.mockRejectedValueOnce(decryptionError);

    await act(async () => {
      await result.current.selectEncryptedFile();
    });

    // Set all required inputs
    act(() => {
      result.current.setKeyId('test-key');
      result.current.setPassphrase('test-passphrase');
      result.current.setOutputPath('/output');
    });

    let thrownError: CommandError | null = null;

    await act(async () => {
      try {
        await result.current.decryptFile();
      } catch (error) {
        thrownError = error as CommandError;
      }
    });

    expect(thrownError).toEqual(decryptionError);
  });
});
