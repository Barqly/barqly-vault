/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import { mockInvoke } from '../../../test-setup';
// Types are imported but not used in this file since we're mocking everything

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

describe('useFileEncryption - File Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should select files successfully', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const testPaths = ['/mock/path/file1.txt', '/mock/path/file2.txt'];

    // Mock the get_file_info command response
    mockInvoke.mockResolvedValueOnce([
      {
        path: testPaths[0],
        name: 'file1.txt',
        size: 102400, // 100KB
        is_file: true,
        is_directory: false,
        file_count: null,
      },
      {
        path: testPaths[1],
        name: 'file2.txt',
        size: 102400, // 100KB
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ]);

    await act(async () => {
      await result.current.selectFiles(testPaths, 'Files');
    });

    // The function now creates FileSelection directly with actual sizes from backend
    expect(result.current.selectedFiles).toEqual({
      paths: testPaths,
      selection_type: 'Files',
      total_size: 204800, // 2 files * 100KB each (100 * 1024 * 2)
      file_count: 2,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle empty file selection', async () => {
    const { result } = renderHook(() => useFileEncryption());

    // Mock empty response for empty paths
    mockInvoke.mockResolvedValueOnce([]);

    await act(async () => {
      await result.current.selectFiles([], 'Files');
    });

    // Empty selection should still create a valid FileSelection object
    expect(result.current.selectedFiles).toEqual({
      paths: [],
      selection_type: 'Files',
      total_size: 0,
      file_count: 0,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle folder selection', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const folderPath = ['/mock/path/folder'];

    // Mock folder info with file_count
    mockInvoke.mockResolvedValueOnce([
      {
        path: folderPath[0],
        name: 'folder',
        size: 512000, // 500KB total folder size
        is_file: false,
        is_directory: true,
        file_count: 5, // 5 files in the folder
      },
    ]);

    await act(async () => {
      await result.current.selectFiles(folderPath, 'Folder');
    });

    expect(result.current.selectedFiles).toEqual({
      paths: folderPath,
      selection_type: 'Folder',
      total_size: 512000, // 500KB
      file_count: 5, // 5 files in the folder
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle multiple file selection', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const testPaths = [
      '/mock/path/file1.txt',
      '/mock/path/file2.txt',
      '/mock/path/file3.txt',
      '/mock/path/file4.txt',
      '/mock/path/file5.txt',
    ];

    // Mock file info for all 5 files
    mockInvoke.mockResolvedValueOnce(
      testPaths.map((path, index) => ({
        path,
        name: `file${index + 1}.txt`,
        size: 102400, // 100KB each
        is_file: true,
        is_directory: false,
        file_count: null,
      })),
    );

    await act(async () => {
      await result.current.selectFiles(testPaths, 'Files');
    });

    expect(result.current.selectedFiles).toEqual({
      paths: testPaths,
      selection_type: 'Files',
      total_size: 512000, // 5 files * 100KB each (100 * 1024 * 5)
      file_count: 5,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should clear selection correctly', async () => {
    const { result } = renderHook(() => useFileEncryption());

    // Mock file info for initial selection
    mockInvoke.mockResolvedValueOnce([
      {
        path: '/path/to/file.txt',
        name: 'file.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ]);

    // First select files to set up the state
    await act(async () => {
      await result.current.selectFiles(['/path/to/file.txt'], 'Files');
    });

    expect(result.current.selectedFiles).not.toBeNull();
    expect(result.current.selectedFiles).toMatchObject({
      paths: ['/path/to/file.txt'],
      selection_type: 'Files',
      total_size: 102400,
      file_count: 1,
    });

    // Clear the selection
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedFiles).toBe(null);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should replace previous selection with new selection', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const firstPaths = ['/first/file1.txt', '/first/file2.txt'];
    const secondPaths = ['/second/file1.txt'];

    // Mock first selection
    mockInvoke.mockResolvedValueOnce(
      firstPaths.map((path, index) => ({
        path,
        name: `file${index + 1}.txt`,
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      })),
    );

    // First selection
    await act(async () => {
      await result.current.selectFiles(firstPaths, 'Files');
    });

    expect(result.current.selectedFiles?.paths).toEqual(firstPaths);
    expect(result.current.selectedFiles?.file_count).toBe(2);

    // Mock second selection
    mockInvoke.mockResolvedValueOnce([
      {
        path: secondPaths[0],
        name: 'file1.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ]);

    // Second selection should replace the first
    await act(async () => {
      await result.current.selectFiles(secondPaths, 'Files');
    });

    expect(result.current.selectedFiles?.paths).toEqual(secondPaths);
    expect(result.current.selectedFiles?.file_count).toBe(1);
  });

  it('should handle switching between files and folder selection', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const filePaths = ['/file1.txt', '/file2.txt'];
    const folderPath = ['/my/folder'];

    // Mock files info
    mockInvoke.mockResolvedValueOnce(
      filePaths.map((path, index) => ({
        path,
        name: `file${index + 1}.txt`,
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      })),
    );

    // Select files first
    await act(async () => {
      await result.current.selectFiles(filePaths, 'Files');
    });

    expect(result.current.selectedFiles?.selection_type).toBe('Files');
    expect(result.current.selectedFiles?.file_count).toBe(2);

    // Mock folder info
    mockInvoke.mockResolvedValueOnce([
      {
        path: folderPath[0],
        name: 'folder',
        size: 307200, // 300KB
        is_file: false,
        is_directory: true,
        file_count: 3, // 3 files in folder
      },
    ]);

    // Switch to folder selection
    await act(async () => {
      await result.current.selectFiles(folderPath, 'Folder');
    });

    expect(result.current.selectedFiles?.selection_type).toBe('Folder');
    expect(result.current.selectedFiles?.file_count).toBe(3);
    expect(result.current.selectedFiles?.paths).toEqual(folderPath);
  });
});
