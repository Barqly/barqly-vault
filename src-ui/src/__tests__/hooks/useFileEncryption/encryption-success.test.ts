/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import { mockInvoke } from '../../../test-setup';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useFileEncryption - Encryption Success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should encrypt files successfully', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const mockEncryptionResult = '/output/encrypted.age';
    const testPaths = ['/path/to/file1.txt', '/path/to/file2.txt'];

    // Mock the get_file_info response for file selection
    mockInvoke.mockResolvedValueOnce([
      {
        path: testPaths[0],
        name: 'file1.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
      {
        path: testPaths[1],
        name: 'file2.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ]);

    // First select files using the new signature
    await act(async () => {
      await result.current.selectFiles(testPaths, 'Files');
    });

    // Verify files were selected
    expect(result.current.selectedFiles).toBeTruthy();
    expect(result.current.selectedFiles?.file_count).toBe(2);

    // Mock the encryption result
    mockInvoke.mockResolvedValueOnce(mockEncryptionResult);

    // Now encrypt
    await act(async () => {
      await result.current.encryptFiles('test-key');
    });

    expect(result.current.success).toEqual(mockEncryptionResult);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should complete encryption with custom output name and path', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const mockEncryptionResult = '/output/encrypted.age';
    const testPaths = ['/path/to/file.txt'];

    // Mock get_file_info for file selection
    mockInvoke.mockResolvedValueOnce([
      {
        path: testPaths[0],
        name: 'file.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ]);

    // Select files first
    await act(async () => {
      await result.current.selectFiles(testPaths, 'Files');
    });

    // Mock encryption result
    mockInvoke.mockResolvedValueOnce(mockEncryptionResult);

    // Encrypt with all parameters
    await act(async () => {
      await result.current.encryptFiles('test-key', 'my-archive', '/output/path');
    });

    // Test behavior: Does encryption complete with the expected result?
    expect(result.current.success).toBe('/output/encrypted.age');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle optional parameters correctly', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const mockEncryptionResult = '/output/encrypted.age';

    // Mock get_file_info
    mockInvoke.mockResolvedValueOnce([
      {
        path: '/file.txt',
        name: 'file.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ]);

    // Select files
    await act(async () => {
      await result.current.selectFiles(['/file.txt'], 'Files');
    });

    // Mock encryption result
    mockInvoke.mockResolvedValueOnce(mockEncryptionResult);

    // Encrypt without optional parameters
    await act(async () => {
      await result.current.encryptFiles('test-key');
    });

    // Verify undefined optional parameters are passed
    expect(mockInvoke).toHaveBeenCalledWith(
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

  it('should handle encryption with multiple files', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const mockEncryptionResult = '/output/encrypted.age';
    const multiplePaths = ['/path/to/file1.txt', '/path/to/file2.txt', '/path/to/file3.txt'];

    // Mock get_file_info for multiple files
    mockInvoke.mockResolvedValueOnce(
      multiplePaths.map((path, index) => ({
        path,
        name: `file${index + 1}.txt`,
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      })),
    );

    // Select multiple files
    await act(async () => {
      await result.current.selectFiles(multiplePaths, 'Files');
    });

    expect(result.current.selectedFiles?.file_count).toBe(3);

    // Mock encryption result
    mockInvoke.mockResolvedValueOnce(mockEncryptionResult);

    // Encrypt
    await act(async () => {
      await result.current.encryptFiles('test-key', 'multi-file-archive');
    });

    // Verify all paths were included
    expect(mockInvoke).toHaveBeenCalledWith(
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

    // Mock get_file_info for folder
    mockInvoke.mockResolvedValueOnce([
      {
        path: folderPath[0],
        name: 'folder',
        size: 1024000, // 1MB folder
        is_file: false,
        is_directory: true,
        file_count: 10, // 10 files in folder
      },
    ]);

    // Select a folder
    await act(async () => {
      await result.current.selectFiles(folderPath, 'Folder');
    });

    expect(result.current.selectedFiles?.selection_type).toBe('Folder');

    // Mock encryption result
    mockInvoke.mockResolvedValueOnce(mockEncryptionResult);

    // Encrypt the folder
    await act(async () => {
      await result.current.encryptFiles('test-key', 'folder-archive');
    });

    expect(mockInvoke).toHaveBeenCalledWith(
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
