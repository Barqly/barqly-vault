import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileDecryption } from '../../../hooks/useFileDecryption';
import { CommandError, ErrorCode, FileSelection } from '../../../lib/api-types';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeInvoke = vi.mocked(await import('../../../lib/tauri-safe')).safeInvoke;
const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useFileDecryption - File Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should select encrypted file successfully', async () => {
    const { result } = renderHook(() => useFileDecryption());
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/encrypted.age'],
      total_size: 1024,
      file_count: 1,
      selection_type: 'Files',
    };

    mockSafeInvoke.mockResolvedValueOnce(mockFileSelection);

    await act(async () => {
      await result.current.selectEncryptedFile();
    });

    expect(result.current.selectedFile).toBe('/path/to/encrypted.age');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle file selection cancellation', async () => {
    const { result } = renderHook(() => useFileDecryption());
    const mockFileSelection: FileSelection = {
      paths: [],
      total_size: 0,
      file_count: 0,
      selection_type: 'Files',
    };

    mockSafeInvoke.mockResolvedValueOnce(mockFileSelection);

    await act(async () => {
      try {
        await result.current.selectEncryptedFile();
      } catch (error) {
        expect(error).toMatchObject({
          code: ErrorCode.INVALID_INPUT,
          message: 'No file selected',
        });
      }
    });

    expect(result.current.selectedFile).toBe(null);
    expect(result.current.error).not.toBe(null);
  });

  it('should handle multiple file selection error', async () => {
    const { result } = renderHook(() => useFileDecryption());
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/file1.age', '/path/to/file2.age'],
      total_size: 2048,
      file_count: 2,
      selection_type: 'Files',
    };

    mockSafeInvoke.mockResolvedValueOnce(mockFileSelection);

    await act(async () => {
      try {
        await result.current.selectEncryptedFile();
      } catch (error) {
        expect(error).toMatchObject({
          code: ErrorCode.INVALID_INPUT,
          message: 'Multiple files selected',
        });
      }
    });

    expect(result.current.selectedFile).toBe(null);
    expect(result.current.error).not.toBe(null);
  });

  it('should handle file selection API error', async () => {
    const { result } = renderHook(() => useFileDecryption());
    const mockError: CommandError = {
      code: ErrorCode.PERMISSION_DENIED,
      message: 'Permission denied to access file',
      user_actionable: true,
    };

    mockSafeInvoke.mockRejectedValueOnce(mockError);

    await act(async () => {
      try {
        await result.current.selectEncryptedFile();
      } catch (error) {
        expect(error).toEqual(mockError);
      }
    });

    expect(result.current.selectedFile).toBe(null);
    expect(result.current.error).toEqual(mockError);
    expect(result.current.isLoading).toBe(false);
  });

  it('should validate selected file has .age extension', async () => {
    const { result } = renderHook(() => useFileDecryption());
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/file.txt'],
      total_size: 1024,
      file_count: 1,
      selection_type: 'Files',
    };

    mockSafeInvoke.mockResolvedValueOnce(mockFileSelection);

    await act(async () => {
      try {
        await result.current.selectEncryptedFile();
      } catch (error) {
        expect(error).toMatchObject({
          code: ErrorCode.INVALID_FILE_FORMAT,
          message: 'Selected file is not a valid .age encrypted file',
        });
      }
    });

    expect(result.current.selectedFile).toBe(null);
    expect(result.current.error).not.toBe(null);
  });

  it('should clear previous selection when selecting new file', async () => {
    const { result } = renderHook(() => useFileDecryption());

    // First selection
    const firstSelection: FileSelection = {
      paths: ['/path/to/first.age'],
      total_size: 1024,
      file_count: 1,
      selection_type: 'Files',
    };
    mockSafeInvoke.mockResolvedValueOnce(firstSelection);

    await act(async () => {
      await result.current.selectEncryptedFile();
    });

    expect(result.current.selectedFile).toBe('/path/to/first.age');

    // Second selection
    const secondSelection: FileSelection = {
      paths: ['/path/to/second.age'],
      total_size: 2048,
      file_count: 1,
      selection_type: 'Files',
    };
    mockSafeInvoke.mockResolvedValueOnce(secondSelection);

    await act(async () => {
      await result.current.selectEncryptedFile();
    });

    expect(result.current.selectedFile).toBe('/path/to/second.age');
    expect(result.current.isLoading).toBe(false);
  });
});
