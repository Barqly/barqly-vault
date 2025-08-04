import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import { ProgressUpdate } from '../../../lib/api-types';

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
    const mockEncryptionResult = '/output/encrypted.age';

    // Mock the encryption result
    mockSafeInvoke.mockResolvedValueOnce(mockEncryptionResult);

    // First select files using the new signature
    await act(async () => {
      await result.current.selectFiles(['/path/to/file1.txt', '/path/to/file2.txt'], 'Files');
    });

    // Verify files were selected
    expect(result.current.selectedFiles).toBeTruthy();
    expect(result.current.selectedFiles?.file_count).toBe(2);

    // Now encrypt
    await act(async () => {
      await result.current.encryptFiles('test-key');
    });

    expect(result.current.success).toEqual(mockEncryptionResult);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should call encrypt_files command with correct snake_case parameters', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const mockEncryptionResult = '/output/encrypted.age';
    const testPaths = ['/path/to/file.txt'];

    mockSafeInvoke.mockResolvedValueOnce(mockEncryptionResult);

    // Select files first
    await act(async () => {
      await result.current.selectFiles(testPaths, 'Files');
    });

    // Encrypt with all parameters
    await act(async () => {
      await result.current.encryptFiles('test-key', 'my-archive', '/output/path');
    });

    // Check that encrypt_files was called with snake_case field names
    expect(mockSafeInvoke).toHaveBeenCalledWith(
      'encrypt_files',
      {
        key_id: 'test-key', // snake_case
        file_paths: testPaths, // snake_case
        output_name: 'my-archive', // snake_case
        output_path: '/output/path', // snake_case
      },
      'useFileEncryption',
    );
  });

  it('should handle optional parameters correctly', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const mockEncryptionResult = '/output/encrypted.age';

    mockSafeInvoke.mockResolvedValueOnce(mockEncryptionResult);

    // Select files
    await act(async () => {
      await result.current.selectFiles(['/file.txt'], 'Files');
    });

    // Encrypt without optional parameters
    await act(async () => {
      await result.current.encryptFiles('test-key');
    });

    // Verify undefined optional parameters are passed
    expect(mockSafeInvoke).toHaveBeenCalledWith(
      'encrypt_files',
      {
        key_id: 'test-key',
        file_paths: ['/file.txt'],
        output_name: undefined,
        output_path: undefined,
      },
      'useFileEncryption',
    );
  });

  it('should set up progress listener for encryption', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const mockEncryptionResult = '/output/encrypted.age';
    const mockProgressUpdate: ProgressUpdate = {
      operation_id: 'encrypt-123',
      progress: 0.5,
      message: 'Encrypting...',
      timestamp: new Date().toISOString(),
    };

    // Mock the progress listener
    let progressCallback: ((event: any) => void) | null = null;
    mockSafeListen.mockImplementationOnce(async (_event, callback) => {
      progressCallback = callback;
      return () => Promise.resolve();
    });

    mockSafeInvoke.mockResolvedValueOnce(mockEncryptionResult);

    // Select files
    await act(async () => {
      await result.current.selectFiles(['/file.txt'], 'Files');
    });

    // Start encryption
    const encryptPromise = act(async () => {
      await result.current.encryptFiles('test-key');
    });

    // Simulate progress update
    if (progressCallback) {
      act(() => {
        progressCallback!({ payload: mockProgressUpdate });
      });
    }

    await encryptPromise;

    // Verify progress listener was set up
    expect(mockSafeListen).toHaveBeenCalledWith('encryption-progress', expect.any(Function));
    expect(result.current.success).toEqual(mockEncryptionResult);
  });

  it('should handle encryption with multiple files', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const mockEncryptionResult = '/output/encrypted.age';
    const multiplePaths = ['/path/to/file1.txt', '/path/to/file2.txt', '/path/to/file3.txt'];

    mockSafeInvoke.mockResolvedValueOnce(mockEncryptionResult);

    // Select multiple files
    await act(async () => {
      await result.current.selectFiles(multiplePaths, 'Files');
    });

    expect(result.current.selectedFiles?.file_count).toBe(3);

    // Encrypt
    await act(async () => {
      await result.current.encryptFiles('test-key', 'multi-file-archive');
    });

    // Verify all paths were included
    expect(mockSafeInvoke).toHaveBeenCalledWith(
      'encrypt_files',
      expect.objectContaining({
        key_id: 'test-key',
        file_paths: multiplePaths,
        output_name: 'multi-file-archive',
      }),
      'useFileEncryption',
    );

    expect(result.current.success).toEqual(mockEncryptionResult);
  });

  it('should handle folder encryption', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const mockEncryptionResult = '/output/encrypted.age';
    const folderPath = ['/path/to/folder'];

    mockSafeInvoke.mockResolvedValueOnce(mockEncryptionResult);

    // Select a folder
    await act(async () => {
      await result.current.selectFiles(folderPath, 'Folder');
    });

    expect(result.current.selectedFiles?.selection_type).toBe('Folder');

    // Encrypt the folder
    await act(async () => {
      await result.current.encryptFiles('test-key', 'folder-archive');
    });

    expect(mockSafeInvoke).toHaveBeenCalledWith(
      'encrypt_files',
      expect.objectContaining({
        key_id: 'test-key',
        file_paths: folderPath,
        output_name: 'folder-archive',
      }),
      'useFileEncryption',
    );

    expect(result.current.success).toEqual(mockEncryptionResult);
  });
});
