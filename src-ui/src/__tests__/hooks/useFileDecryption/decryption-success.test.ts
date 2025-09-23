/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFileDecryption } from '../../../hooks/useFileDecryption';
import { FileSelection, DecryptionResult } from '../../../lib/api-types';
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

describe('useFileDecryption - Decryption Success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.safeListen.mockResolvedValue(() => Promise.resolve());
  });

  afterEach(() => {
    vi.clearAllMocks();
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

    mocks.safeInvoke.mockResolvedValueOnce(mockFileSelection);
    mocks.safeInvoke.mockResolvedValueOnce(mockDecryptionResult);

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

    mocks.safeInvoke.mockResolvedValueOnce(mockFileSelection);
    mocks.safeInvoke.mockResolvedValueOnce(mockDecryptionResult);

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

    expect(mockInvoke).toHaveBeenNthCalledWith(
      2,
      'decrypt_data',
      {
        encrypted_file: '/path/to/encrypted.age', // snake_case
        key_id: 'test-key', // snake_case
        output_dir: '/output',
        passphrase: 'test-passphrase',
      },
      'useFileDecryption',
    );
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

    mocks.safeInvoke.mockResolvedValueOnce(mockFileSelection);
    mocks.safeInvoke.mockResolvedValueOnce(mockDecryptionResult);

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

    expect(mocks.safeListen).toHaveBeenCalledWith('decryption-progress', expect.any(Function));
  });
});
