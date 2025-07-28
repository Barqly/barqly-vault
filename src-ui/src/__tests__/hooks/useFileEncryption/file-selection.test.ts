import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import { CommandError, ErrorCode, FileSelection } from '../../../lib/api-types';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;
const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useFileEncryption - File Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should select files successfully', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/file1.txt', '/path/to/file2.txt'],
      selection_type: 'Files',
      total_size: 1024,
      file_count: 2,
    };

    mockInvoke.mockResolvedValueOnce(mockFileSelection);

    await act(async () => {
      await result.current.selectFiles('Files');
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

    mockInvoke.mockRejectedValueOnce(selectionError);

    await act(async () => {
      try {
        await result.current.selectFiles('Files');
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

    mockInvoke.mockRejectedValueOnce(genericError);

    await act(async () => {
      try {
        await result.current.selectFiles('Files');
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

    mockInvoke.mockResolvedValueOnce(mockFileSelection);

    await act(async () => {
      await result.current.selectFiles('Files');
    });

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedFiles).toBe(null);
  });
});
