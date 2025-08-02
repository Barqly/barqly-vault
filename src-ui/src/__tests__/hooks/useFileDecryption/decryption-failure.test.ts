import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileDecryption } from '../../../hooks/useFileDecryption';
import { CommandError, ErrorCode, FileSelection } from '../../../lib/api-types';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeInvoke = vi.mocked(await import('../../../lib/tauri-safe')).safeInvoke;
const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useFileDecryption - Decryption Failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
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

    mockSafeInvoke.mockResolvedValueOnce(mockFileSelection);
    mockSafeInvoke.mockRejectedValueOnce(decryptionError);

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

    mockSafeInvoke.mockResolvedValueOnce(mockFileSelection);
    mockSafeInvoke.mockRejectedValueOnce(decryptionError);

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
