import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileDecryption } from '../../../hooks/useFileDecryption';
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

describe('useFileDecryption - Decryption Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should validate required inputs before decryption', async () => {
    const { result } = renderHook(() => useFileDecryption());

    await act(async () => {
      try {
        await result.current.decryptFile();
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toEqual({
      code: ErrorCode.INVALID_INPUT,
      message: 'No encrypted file selected',
      recovery_guidance: 'Please select an encrypted .age file to decrypt',
      user_actionable: true,
    });
  });

  it('should validate key ID is provided', async () => {
    const { result } = renderHook(() => useFileDecryption());

    // First select a file
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/encrypted.age'],
      total_size: 1024,
      file_count: 1,
      selection_type: 'Files',
    };

    mockInvoke.mockResolvedValueOnce(mockFileSelection);

    await act(async () => {
      await result.current.selectEncryptedFile();
    });

    await act(async () => {
      try {
        await result.current.decryptFile();
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toEqual({
      code: ErrorCode.INVALID_INPUT,
      message: 'No decryption key selected',
      recovery_guidance: 'Please select the key that was used to encrypt this file',
      user_actionable: true,
    });
  });

  it('should validate passphrase is provided', async () => {
    const { result } = renderHook(() => useFileDecryption());

    // First select a file
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/encrypted.age'],
      total_size: 1024,
      file_count: 1,
      selection_type: 'Files',
    };

    mockInvoke.mockResolvedValueOnce(mockFileSelection);

    await act(async () => {
      await result.current.selectEncryptedFile();
    });

    // Set key ID but not passphrase
    act(() => {
      result.current.setKeyId('test-key');
    });

    await act(async () => {
      try {
        await result.current.decryptFile();
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toEqual({
      code: ErrorCode.INVALID_INPUT,
      message: 'Passphrase is required',
      recovery_guidance: 'Please enter the passphrase for the selected key',
      user_actionable: true,
    });
  });

  it('should validate output path is provided', async () => {
    const { result } = renderHook(() => useFileDecryption());

    // First select a file
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/encrypted.age'],
      total_size: 1024,
      file_count: 1,
      selection_type: 'Files',
    };

    mockInvoke.mockResolvedValueOnce(mockFileSelection);

    await act(async () => {
      await result.current.selectEncryptedFile();
    });

    // Set key ID and passphrase but not output path
    act(() => {
      result.current.setKeyId('test-key');
      result.current.setPassphrase('test-passphrase');
    });

    await act(async () => {
      try {
        await result.current.decryptFile();
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toEqual({
      code: ErrorCode.INVALID_INPUT,
      message: 'Output directory is required',
      recovery_guidance: 'Please select where to save the decrypted files',
      user_actionable: true,
    });
  });

  it('should handle validation errors without calling backend', async () => {
    const { result } = renderHook(() => useFileDecryption());

    await act(async () => {
      try {
        await result.current.decryptFile();
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.current.error).not.toBe(null);
  });
});
