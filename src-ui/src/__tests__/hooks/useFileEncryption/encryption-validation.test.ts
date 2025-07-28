import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import { ErrorCode, FileSelection } from '../../../lib/api-types';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;
const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useFileEncryption - Encryption Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should validate required inputs before encryption', async () => {
    const { result } = renderHook(() => useFileEncryption());

    await act(async () => {
      try {
        await result.current.encryptFiles('', '/output');
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

    mockInvoke.mockResolvedValueOnce(mockFileSelection);

    await act(async () => {
      await result.current.selectFiles('Files');
    });

    await act(async () => {
      try {
        await result.current.encryptFiles('', '/output');
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

  it('should validate output path is provided', async () => {
    const { result } = renderHook(() => useFileEncryption());

    // First select files to set up the state
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/file.txt'],
      selection_type: 'Files',
      total_size: 1024,
      file_count: 1,
    };

    mockInvoke.mockResolvedValueOnce(mockFileSelection);

    await act(async () => {
      await result.current.selectFiles('Files');
    });

    await act(async () => {
      try {
        await result.current.encryptFiles('test-key', '');
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toEqual({
      code: ErrorCode.INVALID_INPUT,
      message: 'Output path is required',
      recovery_guidance: 'Please specify where to save the encrypted file',
      user_actionable: true,
    });
  });

  // Compression level is no longer part of the API, so this test is removed
  it.skip('should validate compression level range', async () => {
    // This test is skipped because compression level is not part of the new API
  });

  it('should handle validation errors without calling backend', async () => {
    const { result } = renderHook(() => useFileEncryption());

    await act(async () => {
      try {
        await result.current.encryptFiles('', '/output');
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.current.error).not.toBe(null);
  });
});
