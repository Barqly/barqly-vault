import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../hooks/useFileEncryption';
import { CommandError, ErrorCode, FileSelection } from '../../lib/api-types';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;
const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useFileEncryption (4.2.3.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useFileEncryption());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(null);
      expect(result.current.progress).toBe(null);
      expect(result.current.selectedFiles).toBe(null);
      expect(typeof result.current.selectFiles).toBe('function');
      expect(typeof result.current.encryptFiles).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.clearSelection).toBe('function');
    });
  });

  describe('File Selection', () => {
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
  });

  describe('File Encryption', () => {
    it('should validate required inputs before encryption', async () => {
      const { result } = renderHook(() => useFileEncryption());

      await act(async () => {
        try {
          await result.current.encryptFiles('', '/output');
        } catch (_error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_INPUT,
        message: 'No files selected for encryption',
        recovery_guidance: 'Please select files or folders to encrypt',
        user_actionable: true,
      });
    });

    it('should validate key ID is provided', async () => {
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

      await act(async () => {
        try {
          await result.current.encryptFiles('', '/output');
        } catch (_error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_INPUT,
        message: 'Encryption key is required',
        recovery_guidance: 'Please select an encryption key',
        user_actionable: true,
      });
    });

    it('should validate output path is provided', async () => {
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

      await act(async () => {
        try {
          await result.current.encryptFiles('test-key', '');
        } catch (_error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_INPUT,
        message: 'Output path is required',
        recovery_guidance: 'Please specify where to save the encrypted file',
        user_actionable: true,
      });
    });

    // Compression level is no longer part of the API, so this test is removed
    it.skip('should validate compression level range', async () => {
      // This test is skipped because compression level is not part of the new API
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

    it('should handle encryption errors', async () => {
      const { result } = renderHook(() => useFileEncryption());
      const encryptionError: CommandError = {
        code: ErrorCode.ENCRYPTION_FAILED,
        message: 'Failed to encrypt files',
        recovery_guidance: 'Please check your files and try again',
        user_actionable: true,
      };

      // First select files to set up the state
      const mockFileSelection: FileSelection = {
        paths: ['/path/to/file.txt'],
        selection_type: 'Files',
        total_size: 1024,
        file_count: 1,
      };

      mockInvoke.mockResolvedValueOnce(mockFileSelection);
      mockInvoke.mockRejectedValueOnce(encryptionError);

      await act(async () => {
        await result.current.selectFiles('Files');
      });

      await act(async () => {
        try {
          await result.current.encryptFiles('test-key', '/output');
        } catch (_error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual(encryptionError);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Progress Tracking', () => {
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

    it('should handle progress updates during encryption', async () => {
      const { result } = renderHook(() => useFileEncryption());
      const mockEncryptionResult = {
        encrypted_file_path: '/output/encrypted.age',
        original_file_count: 1,
        total_size_encrypted: 1024,
        compression_ratio: 0.8,
        encryption_time_ms: 1000,
      };

      let progressCallback: (event: { payload: any }) => void;
      mockListen.mockImplementationOnce((_event, callback) => {
        progressCallback = (event: { payload: any }) =>
          callback({ event: 'test-event', id: 1, payload: event.payload });
        return Promise.resolve(() => Promise.resolve());
      });

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
        result.current.encryptFiles('test-key', '/output');
      });

      // Simulate progress update
      await act(async () => {
        progressCallback!({
          payload: {
            operation_id: 'test-op',
            progress: 0.5,
            message: 'Encrypting files...',
            timestamp: new Date().toISOString(),
          },
        });
      });

      expect(result.current.progress).toEqual({
        operation_id: 'test-op',
        progress: 0.5,
        message: 'Encrypting files...',
        timestamp: expect.any(String),
      });
    });
  });

  describe('State Management', () => {
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

    it('should clear error correctly', async () => {
      const { result } = renderHook(() => useFileEncryption());

      // First, create an error
      await act(async () => {
        try {
          await result.current.encryptFiles('', '/output');
        } catch (_error) {
          // Expected to throw
        }
      });

      expect(result.current.error).not.toBe(null);

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
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

    it('should set loading state during operations', async () => {
      const { result } = renderHook(() => useFileEncryption());
      const mockFileSelection: FileSelection = {
        paths: ['/path/to/file.txt'],
        selection_type: 'Files',
        total_size: 1024,
        file_count: 1,
      };

      mockInvoke.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(mockFileSelection), 100)),
      );

      act(() => {
        result.current.selectFiles('Files');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors without calling backend', async () => {
      const { result } = renderHook(() => useFileEncryption());

      await act(async () => {
        try {
          await result.current.encryptFiles('', '/output');
        } catch (_error) {
          // Expected to throw
        }
      });

      expect(mockInvoke).not.toHaveBeenCalled();
      expect(result.current.error).not.toBe(null);
    });

    it('should re-throw errors for component handling', async () => {
      const { result } = renderHook(() => useFileEncryption());
      const encryptionError: CommandError = {
        code: ErrorCode.ENCRYPTION_FAILED,
        message: 'Failed to encrypt files',
        recovery_guidance: 'Please check your files and try again',
        user_actionable: true,
      };

      // First select files to set up the state
      const mockFileSelection: FileSelection = {
        paths: ['/path/to/file.txt'],
        selection_type: 'Files',
        total_size: 1024,
        file_count: 1,
      };

      mockInvoke.mockResolvedValueOnce(mockFileSelection);
      mockInvoke.mockRejectedValueOnce(encryptionError);

      await act(async () => {
        await result.current.selectFiles('Files');
      });

      let thrownError: CommandError | null = null;

      await act(async () => {
        try {
          await result.current.encryptFiles('test-key', '/output');
        } catch (error) {
          thrownError = error as CommandError;
        }
      });

      expect(thrownError).toEqual(encryptionError);
    });
  });
});
