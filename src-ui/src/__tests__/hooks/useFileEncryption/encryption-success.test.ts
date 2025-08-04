import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import { FileSelection } from '../../../lib/api-types';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeInvoke = vi.mocked(await import('../../../lib/tauri-safe')).safeInvoke;
const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useFileEncryption - Encryption Success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should encrypt files successfully', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const mockEncryptionResult = {
      encrypted_file_path: '/output/encrypted.age',
      original_file_count: 2,
      total_size_encrypted: 2048,
      compression_ratio: 0.8,
      encryption_time_ms: 1500,
    };

    // First select files to set up the state
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/file1.txt', '/path/to/file2.txt'],
      selection_type: 'Files',
      total_size: 1024,
      file_count: 2,
    };

    mockSafeInvoke.mockResolvedValueOnce(mockFileSelection);
    mockSafeInvoke.mockResolvedValueOnce(mockEncryptionResult);

    await act(async () => {
      await result.current.selectFiles(['/mock/path/file1.txt', '/mock/path/file2.txt'], 'Files');
    });

    await act(async () => {
      await result.current.encryptFiles('test-key');
    });

    expect(result.current.success).toEqual(mockEncryptionResult);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should call encrypt_files command with correct parameters', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const mockEncryptionResult = {
      encrypted_file_path: '/output/encrypted.age',
      original_file_count: 1,
      total_size_encrypted: 1024,
      compression_ratio: 0.8,
      encryption_time_ms: 1000,
    };

    // First select files to set up the state
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/file.txt'],
      selection_type: 'Files',
      total_size: 1024,
      file_count: 1,
    };

    mockSafeInvoke.mockResolvedValueOnce(mockFileSelection);
    mockSafeInvoke.mockResolvedValueOnce(mockEncryptionResult);

    await act(async () => {
      await result.current.selectFiles(['/mock/path/file1.txt', '/mock/path/file2.txt'], 'Files');
    });

    await act(async () => {
      await result.current.encryptFiles('test-key');
    });

    expect(mockSafeInvoke).toHaveBeenNthCalledWith(
      2,
      'encrypt_files',
      {
        keyId: 'test-key',
        filePaths: ['/path/to/file.txt'],
        outputName: undefined,
      },
      'useFileEncryption',
    );
  });

  it('should set up progress listener for encryption', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const mockEncryptionResult = {
      encrypted_file_path: '/output/encrypted.age',
      original_file_count: 1,
      total_size_encrypted: 1024,
      compression_ratio: 0.8,
      encryption_time_ms: 1000,
    };

    // First select files to set up the state
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/file.txt'],
      selection_type: 'Files',
      total_size: 1024,
      file_count: 1,
    };

    mockSafeInvoke.mockResolvedValueOnce(mockFileSelection);
    mockSafeInvoke.mockResolvedValueOnce(mockEncryptionResult);

    await act(async () => {
      await result.current.selectFiles(['/mock/path/file1.txt', '/mock/path/file2.txt'], 'Files');
    });

    await act(async () => {
      await result.current.encryptFiles('test-key');
    });

    expect(mockSafeListen).toHaveBeenCalledWith('encryption-progress', expect.any(Function));
  });
});
