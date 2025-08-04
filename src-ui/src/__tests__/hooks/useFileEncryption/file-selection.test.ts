import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import { CommandError, ErrorCode, FileSelection } from '../../../lib/api-types';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeInvoke = vi.mocked(await import('../../../lib/tauri-safe')).safeInvoke;
const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useFileEncryption - File Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should select files successfully', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/file1.txt', '/path/to/file2.txt'],
      selection_type: 'Files',
      total_size: 1024,
      file_count: 2,
    };

    mockSafeInvoke.mockResolvedValueOnce(mockFileSelection);

    await act(async () => {
      await result.current.selectFiles(['/mock/path/file1.txt', '/mock/path/file2.txt'], 'Files');
    });

    expect(result.current.selectedFiles).toEqual(mockFileSelection);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle file selection errors', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const selectionError: CommandError = {
      code: ErrorCode.PERMISSION_DENIED,
      message: 'Access denied to file',
      recovery_guidance: 'Please check file permissions',
      user_actionable: true,
    };

    mockSafeInvoke.mockRejectedValueOnce(selectionError);

    await act(async () => {
      try {
        await result.current.selectFiles(['/mock/path/file1.txt', '/mock/path/file2.txt'], 'Files');
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toEqual(selectionError);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle generic file selection errors', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const genericError = new Error('File system error');

    mockSafeInvoke.mockRejectedValueOnce(genericError);

    await act(async () => {
      try {
        await result.current.selectFiles(['/mock/path/file1.txt', '/mock/path/file2.txt'], 'Files');
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toEqual({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'File system error',
      recovery_guidance:
        'Please try selecting files again. If the problem persists, restart the application.',
      user_actionable: true,
    });
  });

  it('should clear selection correctly', async () => {
    const { result } = renderHook(() => useFileEncryption());

    // First select files to set up the state
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/file.txt'],
      selection_type: 'Files',
      total_size: 1024,
      file_count: 1,
    };

    mockSafeInvoke.mockResolvedValueOnce(mockFileSelection);

    await act(async () => {
      await result.current.selectFiles(['/mock/path/file1.txt', '/mock/path/file2.txt'], 'Files');
    });

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedFiles).toBe(null);
  });
});
