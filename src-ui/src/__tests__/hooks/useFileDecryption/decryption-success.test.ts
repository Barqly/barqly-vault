import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileDecryption } from '../../../hooks/useFileDecryption';
import { FileSelection, DecryptionResult } from '../../../lib/api-types';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;
const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useFileDecryption - Decryption Success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should decrypt file successfully', async () => {
    const { result } = renderHook(() => useFileDecryption());
    const mockDecryptionResult: DecryptionResult = {
      extracted_files: ['/output/file1.txt', '/output/file2.txt'],
      output_dir: '/output',
      manifest_verified: true,
    };

    // First select a file
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/encrypted.age'],
      total_size: 1024,
      file_count: 1,
      selection_type: 'Files',
    };

    mockInvoke.mockResolvedValueOnce(mockFileSelection);
    mockInvoke.mockResolvedValueOnce(mockDecryptionResult);

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
      await result.current.decryptFile();
    });

    expect(result.current.success).toEqual(mockDecryptionResult);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should call decrypt_data command with correct parameters', async () => {
    const { result } = renderHook(() => useFileDecryption());
    const mockDecryptionResult: DecryptionResult = {
      extracted_files: ['/output/file.txt'],
      output_dir: '/output',
      manifest_verified: true,
    };

    // First select a file
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/encrypted.age'],
      total_size: 1024,
      file_count: 1,
      selection_type: 'Files',
    };

    mockInvoke.mockResolvedValueOnce(mockFileSelection);
    mockInvoke.mockResolvedValueOnce(mockDecryptionResult);

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
      await result.current.decryptFile();
    });

    expect(mockInvoke).toHaveBeenCalledWith('decrypt_data', {
      encrypted_file: '/path/to/encrypted.age',
      key_id: 'test-key',
      output_dir: '/output',
      passphrase: 'test-passphrase',
    });
  });

  it('should set up progress listener for decryption', async () => {
    const { result } = renderHook(() => useFileDecryption());
    const mockDecryptionResult: DecryptionResult = {
      extracted_files: ['/output/file.txt'],
      output_dir: '/output',
      manifest_verified: true,
    };

    // First select a file
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/encrypted.age'],
      total_size: 1024,
      file_count: 1,
      selection_type: 'Files',
    };

    mockInvoke.mockResolvedValueOnce(mockFileSelection);
    mockInvoke.mockResolvedValueOnce(mockDecryptionResult);

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
      await result.current.decryptFile();
    });

    expect(mockListen).toHaveBeenCalledWith('decryption-progress', expect.any(Function));
  });
});
