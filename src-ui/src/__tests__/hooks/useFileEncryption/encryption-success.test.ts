import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import { FileSelection } from '../../../lib/api-types';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;
const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useFileEncryption - Encryption Success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
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

    mockInvoke.mockResolvedValueOnce(mockFileSelection);
    mockInvoke.mockResolvedValueOnce(mockEncryptionResult);

    await act(async () => {
      await result.current.selectFiles('Files');
    });

    await act(async () => {
      await result.current.encryptFiles('test-key', '/output');
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

    mockInvoke.mockResolvedValueOnce(mockFileSelection);
    mockInvoke.mockResolvedValueOnce(mockEncryptionResult);

    await act(async () => {
      await result.current.selectFiles('Files');
    });

    await act(async () => {
      await result.current.encryptFiles('test-key', '/output');
    });

    expect(mockInvoke).toHaveBeenCalledWith('encrypt_files', {
      file_paths: ['/path/to/file.txt'],
      key_id: 'test-key',
      output_name: undefined,
    });
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

    mockInvoke.mockResolvedValueOnce(mockFileSelection);
    mockInvoke.mockResolvedValueOnce(mockEncryptionResult);

    await act(async () => {
      await result.current.selectFiles('Files');
    });

    await act(async () => {
      await result.current.encryptFiles('test-key', '/output');
    });

    expect(mockListen).toHaveBeenCalledWith('encryption-progress', expect.any(Function));
  });
});
