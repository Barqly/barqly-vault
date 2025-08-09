import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeInvoke = vi.mocked(await import('../../../lib/tauri-safe')).safeInvoke;
const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useFileEncryption - State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should reset state correctly', () => {
    const { result } = renderHook(() => useFileEncryption());

    act(() => {
      result.current.reset();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(null);
    expect(result.current.progress).toBe(null);
    expect(result.current.selectedFiles).toBe(null);
  });

  it('should manage state during file selection', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const testPaths = ['/mock/path/file1.txt', '/mock/path/file2.txt'];

    // Mock get_file_info response
    mockSafeInvoke.mockResolvedValueOnce([
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

    // The new selectFiles implementation calls backend for file info
    await act(async () => {
      await result.current.selectFiles(testPaths, 'Files');
    });

    // After the operation completes, loading should be false
    expect(result.current.isLoading).toBe(false);
    expect(result.current.selectedFiles).not.toBeNull();
    expect(result.current.selectedFiles).toMatchObject({
      paths: testPaths,
      selection_type: 'Files',
      file_count: 2,
      total_size: 204800,
    });
  });

  it('should clear error when clearError is called', async () => {
    const { result } = renderHook(() => useFileEncryption());

    // Mock get_file_info for file selection
    mockSafeInvoke.mockResolvedValueOnce([
      {
        path: '/test.txt',
        name: 'test.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ]);

    // First, set up state with selected files
    await act(async () => {
      await result.current.selectFiles(['/test.txt'], 'Files');
    });

    // Mock an error for encryption
    const mockError = new Error('Encryption failed');
    mockSafeInvoke.mockRejectedValueOnce(mockError);

    // Try to encrypt (will fail)
    await act(async () => {
      try {
        await result.current.encryptFiles('test-key', 'output');
      } catch {
        // Expected to fail
      }
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.error).toMatchObject({
      code: expect.any(String),
      message: expect.stringContaining('Encryption failed'),
    });

    // Clear the error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  it('should maintain state consistency through multiple operations', async () => {
    const { result } = renderHook(() => useFileEncryption());

    // Initial state
    expect(result.current.selectedFiles).toBe(null);
    expect(result.current.isLoading).toBe(false);

    // Mock get_file_info for file selection
    mockSafeInvoke.mockResolvedValueOnce([
      {
        path: '/file1.txt',
        name: 'file1.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
      {
        path: '/file2.txt',
        name: 'file2.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ]);

    // Select files
    await act(async () => {
      await result.current.selectFiles(['/file1.txt', '/file2.txt'], 'Files');
    });

    expect(result.current.selectedFiles).not.toBeNull();
    expect(result.current.selectedFiles).toMatchObject({
      paths: ['/file1.txt', '/file2.txt'],
      selection_type: 'Files',
      file_count: 2,
      total_size: 204800,
    });

    // Clear selection
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedFiles).toBe(null);

    // Mock get_file_info for second selection
    mockSafeInvoke.mockResolvedValueOnce([
      {
        path: '/file3.txt',
        name: 'file3.txt',
        size: 102400,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ]);

    // Select different files
    await act(async () => {
      await result.current.selectFiles(['/file3.txt'], 'Files');
    });

    expect(result.current.selectedFiles).not.toBeNull();
    expect(result.current.selectedFiles).toMatchObject({
      paths: ['/file3.txt'],
      selection_type: 'Files',
      file_count: 1,
      total_size: 102400,
    });

    // Reset everything
    act(() => {
      result.current.reset();
    });

    expect(result.current.selectedFiles).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(null);
  });
});
