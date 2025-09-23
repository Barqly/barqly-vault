/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFileDecryption } from '../../../hooks/useFileDecryption';
import { CommandError, ErrorCode, FileSelection } from '../../../lib/api-types';
import { mockInvoke } from '../../../test-setup';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

// Mock environment detection
vi.mock('../../../lib/environment/platform', () => ({
  isTauri: vi.fn().mockReturnValue(true),
  isWeb: vi.fn().mockReturnValue(false),
}));

// Import after mocking
import { safeListen } from '../../../lib/tauri-safe';

const mockSafeListen = vi.mocked(safeListen);

// Convenience references for consistency with new pattern
const mocks = {
  safeInvoke: mockInvoke,
  safeListen: mockSafeListen,
};

describe('useFileDecryption - Decryption Failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.safeListen.mockResolvedValue(() => Promise.resolve());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle decryption errors', async () => {
    const { result } = renderHook(() => useFileDecryption());
    const decryptionError: CommandError = {
      code: ErrorCode.DECRYPTION_FAILED,
      message: 'Failed to decrypt file',
      recovery_guidance:
        'Please check your key, passphrase, and file. If the problem persists, restart the application.',
      user_actionable: true,
    };

    // First select a file
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/encrypted.age'],
      total_size: 1024,
      file_count: 1,
      selection_type: 'Files',
    };

    mocks.safeInvoke.mockResolvedValueOnce(mockFileSelection);
    mocks.safeInvoke.mockRejectedValueOnce(decryptionError);

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
      recovery_guidance:
        'Please check your key, passphrase, and file. If the problem persists, restart the application.',
      user_actionable: true,
    };

    // First select a file
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/encrypted.age'],
      total_size: 1024,
      file_count: 1,
      selection_type: 'Files',
    };

    mocks.safeInvoke.mockResolvedValueOnce(mockFileSelection);
    mocks.safeInvoke.mockRejectedValueOnce(decryptionError);

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
