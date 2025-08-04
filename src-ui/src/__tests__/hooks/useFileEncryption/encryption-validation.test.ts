import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import { ErrorCode, FileSelection } from '../../../lib/api-types';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeInvoke = vi.mocked(await import('../../../lib/tauri-safe')).safeInvoke;
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

    // First select files to set up the state
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/file.txt'],
      selection_type: 'Files',
      total_size: 1024,
      file_count: 1,
    };

    mockSafeInvoke.mockResolvedValueOnce(mockFileSelection);

    await act(async () => {
      await result.current.selectFiles('Files');
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

  it.skip('should validate output path is provided - backend does not support output path yet', async () => {
    const { result } = renderHook(() => useFileEncryption());

    // First select files to set up the state
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/file.txt'],
      selection_type: 'Files',
      total_size: 1024,
      file_count: 1,
    };

    mockSafeInvoke.mockResolvedValueOnce(mockFileSelection);

    await act(async () => {
      await result.current.selectFiles('Files');
    });

    await act(async () => {
      try {
        await result.current.encryptFiles('test-key');
      } catch (_error) {
        // Expected to throw
      }
    });

    // This test is skipped until backend supports output path
    expect(result.current.error).toBe(null);
  });

  // Compression level is no longer part of the API, so this test is removed
  it.skip('should validate compression level range', async () => {
    // This test is skipped because compression level is not part of the new API
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
    expect(mockSafeInvoke).not.toHaveBeenCalledWith('encrypt_files', expect.anything());
    expect(result.current.error).not.toBe(null);
  });
});
