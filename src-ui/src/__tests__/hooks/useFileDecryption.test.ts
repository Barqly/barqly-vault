import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileDecryption } from '../../hooks/useFileDecryption';
import { DecryptionResult, CommandError, ErrorCode, FileSelection } from '../../lib/api-types';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;
const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useFileDecryption (4.2.3.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useFileDecryption());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(null);
      expect(result.current.progress).toBe(null);
      expect(result.current.selectedFile).toBe(null);
      expect(result.current.selectedKeyId).toBe(null);
      expect(result.current.passphrase).toBe('');
      expect(result.current.outputPath).toBe(null);
      expect(typeof result.current.selectEncryptedFile).toBe('function');
      expect(typeof result.current.setKeyId).toBe('function');
      expect(typeof result.current.setPassphrase).toBe('function');
      expect(typeof result.current.setOutputPath).toBe('function');
      expect(typeof result.current.decryptFile).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
      expect(typeof result.current.clearSelection).toBe('function');
    });
  });

  describe('File Selection', () => {
    it('should select encrypted file successfully', async () => {
      const { result } = renderHook(() => useFileDecryption());
      const mockFileSelection: FileSelection = {
        paths: ['/path/to/encrypted.age'],
        selection_type: 'Files',
        total_size: 1024,
        file_count: 1,
      };

      mockInvoke.mockResolvedValueOnce(mockFileSelection);

      await act(async () => {
        await result.current.selectEncryptedFile();
      });

      expect(result.current.selectedFile).toBe('/path/to/encrypted.age');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle no file selected', async () => {
      const { result } = renderHook(() => useFileDecryption());
      const mockFileSelection: FileSelection = {
        paths: [],
        selection_type: 'Files',
        total_size: 0,
        file_count: 0,
      };

      mockInvoke.mockResolvedValueOnce(mockFileSelection);

      await act(async () => {
        try {
          await result.current.selectEncryptedFile();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_INPUT,
        message: 'No file selected',
        recovery_guidance: 'Please select an encrypted .age file to decrypt',
        user_actionable: true,
      });
    });

    it('should handle multiple files selected', async () => {
      const { result } = renderHook(() => useFileDecryption());
      const mockFileSelection: FileSelection = {
        paths: ['/path/to/file1.age', '/path/to/file2.age'],
        selection_type: 'Files',
        total_size: 2048,
        file_count: 2,
      };

      mockInvoke.mockResolvedValueOnce(mockFileSelection);

      await act(async () => {
        try {
          await result.current.selectEncryptedFile();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_INPUT,
        message: 'Multiple files selected',
        recovery_guidance: 'Please select only one encrypted .age file to decrypt',
        user_actionable: true,
      });
    });

    it('should validate file extension', async () => {
      const { result } = renderHook(() => useFileDecryption());
      const mockFileSelection: FileSelection = {
        paths: ['/path/to/file.txt'],
        selection_type: 'Files',
        total_size: 1024,
        file_count: 1,
      };

      mockInvoke.mockResolvedValueOnce(mockFileSelection);

      await act(async () => {
        try {
          await result.current.selectEncryptedFile();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_FILE_FORMAT,
        message: 'Selected file is not an encrypted .age file',
        recovery_guidance: 'Please select a valid .age encrypted file',
        user_actionable: true,
      });
    });

    it('should handle file selection errors', async () => {
      const { result } = renderHook(() => useFileDecryption());
      const selectionError: CommandError = {
        code: ErrorCode.PERMISSION_DENIED,
        message: 'Access denied to file',
        recovery_guidance: 'Please check file permissions',
        user_actionable: true,
      };

      mockInvoke.mockRejectedValueOnce(selectionError);

      await act(async () => {
        try {
          await result.current.selectEncryptedFile();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual(selectionError);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('State Management', () => {
    it('should set key ID correctly', () => {
      const { result } = renderHook(() => useFileDecryption());

      act(() => {
        result.current.setKeyId('test-key-123');
      });

      expect(result.current.selectedKeyId).toBe('test-key-123');
      expect(result.current.error).toBe(null); // Should clear previous errors
    });

    it('should set passphrase correctly', () => {
      const { result } = renderHook(() => useFileDecryption());

      act(() => {
        result.current.setPassphrase('test-passphrase');
      });

      expect(result.current.passphrase).toBe('test-passphrase');
      expect(result.current.error).toBe(null); // Should clear previous errors
    });

    it('should set output path correctly', () => {
      const { result } = renderHook(() => useFileDecryption());

      act(() => {
        result.current.setOutputPath('/output/directory');
      });

      expect(result.current.outputPath).toBe('/output/directory');
      expect(result.current.error).toBe(null); // Should clear previous errors
    });

    it('should reset state correctly', () => {
      const { result } = renderHook(() => useFileDecryption());

      // Set some state first
      act(() => {
        result.current.setKeyId('test-key');
        result.current.setPassphrase('test-pass');
        result.current.setOutputPath('/output');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(null);
      expect(result.current.progress).toBe(null);
      expect(result.current.selectedFile).toBe(null);
      expect(result.current.selectedKeyId).toBe(null);
      expect(result.current.passphrase).toBe('');
      expect(result.current.outputPath).toBe(null);
    });

    it('should clear error correctly', async () => {
      const { result } = renderHook(() => useFileDecryption());

      // First, create an error
      await act(async () => {
        try {
          await result.current.decryptFile();
        } catch (error) {
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
      const { result } = renderHook(() => useFileDecryption());

      // First select a file
      const mockFileSelection: FileSelection = {
        paths: ['/path/to/encrypted.age'],
        selection_type: 'Files',
        total_size: 1024,
        file_count: 1,
      };

      mockInvoke.mockResolvedValueOnce(mockFileSelection);

      await act(async () => {
        await result.current.selectEncryptedFile();
      });

      // Set some other state
      act(() => {
        result.current.setKeyId('test-key');
        result.current.setPassphrase('test-pass');
        result.current.setOutputPath('/output');
      });

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedFile).toBe(null);
      expect(result.current.selectedKeyId).toBe(null);
      expect(result.current.passphrase).toBe('');
      expect(result.current.outputPath).toBe(null);
    });
  });

  describe('File Decryption', () => {
    it('should validate required inputs before decryption', async () => {
      const { result } = renderHook(() => useFileDecryption());

      await act(async () => {
        try {
          await result.current.decryptFile();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_INPUT,
        message: 'No encrypted file selected',
        recovery_guidance: 'Please select an encrypted .age file to decrypt',
        user_actionable: true,
      });
    });

    it('should validate key ID is provided', async () => {
      const { result } = renderHook(() => useFileDecryption());

      // First select a file
      const mockFileSelection: FileSelection = {
        paths: ['/path/to/encrypted.age'],
        selection_type: 'Files',
        total_size: 1024,
        file_count: 1,
      };

      mockInvoke.mockResolvedValueOnce(mockFileSelection);

      await act(async () => {
        await result.current.selectEncryptedFile();
      });

      await act(async () => {
        try {
          await result.current.decryptFile();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_INPUT,
        message: 'No decryption key selected',
        recovery_guidance: 'Please select the key that was used to encrypt this file',
        user_actionable: true,
      });
    });

    it('should validate passphrase is provided', async () => {
      const { result } = renderHook(() => useFileDecryption());

      // First select a file
      const mockFileSelection: FileSelection = {
        paths: ['/path/to/encrypted.age'],
        selection_type: 'Files',
        total_size: 1024,
        file_count: 1,
      };

      mockInvoke.mockResolvedValueOnce(mockFileSelection);

      await act(async () => {
        await result.current.selectEncryptedFile();
      });

      // Set key ID but not passphrase
      act(() => {
        result.current.setKeyId('test-key');
      });

      await act(async () => {
        try {
          await result.current.decryptFile();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_INPUT,
        message: 'Passphrase is required',
        recovery_guidance: 'Please enter the passphrase for the selected key',
        user_actionable: true,
      });
    });

    it('should validate output path is provided', async () => {
      const { result } = renderHook(() => useFileDecryption());

      // First select a file
      const mockFileSelection: FileSelection = {
        paths: ['/path/to/encrypted.age'],
        selection_type: 'Files',
        total_size: 1024,
        file_count: 1,
      };

      mockInvoke.mockResolvedValueOnce(mockFileSelection);

      await act(async () => {
        await result.current.selectEncryptedFile();
      });

      // Set key ID and passphrase but not output path
      act(() => {
        result.current.setKeyId('test-key');
        result.current.setPassphrase('test-passphrase');
      });

      await act(async () => {
        try {
          await result.current.decryptFile();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_INPUT,
        message: 'Output directory is required',
        recovery_guidance: 'Please select where to save the decrypted files',
        user_actionable: true,
      });
    });

    it('should decrypt file successfully', async () => {
      const { result } = renderHook(() => useFileDecryption());
      const mockDecryptionResult: DecryptionResult = {
        decrypted_files: ['/output/file1.txt', '/output/file2.txt'],
        original_file_count: 2,
        total_size_decrypted: 2048,
        decryption_time_ms: 1500,
      };

      // First select a file
      const mockFileSelection: FileSelection = {
        paths: ['/path/to/encrypted.age'],
        selection_type: 'Files',
        total_size: 1024,
        file_count: 1,
      };

      mockInvoke.mockResolvedValueOnce(mockFileSelection);
      mockInvoke.mockResolvedValueOnce(mockDecryptionResult);

      await act(async () => {
        await result.current.selectEncryptedFile();
      });

      // Set all required inputs
      act(() => {
        result.current.setKeyId('test-key');
        result.current.setPassphrase('test-passphrase');
        result.current.setOutputPath('/output');
      });

      await act(async () => {
        await result.current.decryptFile();
      });

      expect(result.current.success).toEqual(mockDecryptionResult);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should call decrypt_data command with correct parameters', async () => {
      const { result } = renderHook(() => useFileDecryption());
      const mockDecryptionResult: DecryptionResult = {
        decrypted_files: ['/output/file.txt'],
        original_file_count: 1,
        total_size_decrypted: 1024,
        decryption_time_ms: 1000,
      };

      // First select a file
      const mockFileSelection: FileSelection = {
        paths: ['/path/to/encrypted.age'],
        selection_type: 'Files',
        total_size: 1024,
        file_count: 1,
      };

      mockInvoke.mockResolvedValueOnce(mockFileSelection);
      mockInvoke.mockResolvedValueOnce(mockDecryptionResult);

      await act(async () => {
        await result.current.selectEncryptedFile();
      });

      // Set all required inputs
      act(() => {
        result.current.setKeyId('test-key');
        result.current.setPassphrase('test-passphrase');
        result.current.setOutputPath('/output');
      });

      await act(async () => {
        await result.current.decryptFile();
      });

      expect(mockInvoke).toHaveBeenCalledWith('decrypt_data', {
        input: {
          encrypted_file: '/path/to/encrypted.age',
          key_id: 'test-key',
          passphrase: 'test-passphrase',
          output_dir: '/output',
        },
      });
    });

    it('should handle decryption errors', async () => {
      const { result } = renderHook(() => useFileDecryption());
      const decryptionError: CommandError = {
        code: ErrorCode.DECRYPTION_FAILED,
        message: 'Failed to decrypt file',
        recovery_guidance: 'Please check your key and passphrase',
        user_actionable: true,
      };

      // First select a file
      const mockFileSelection: FileSelection = {
        paths: ['/path/to/encrypted.age'],
        selection_type: 'Files',
        total_size: 1024,
        file_count: 1,
      };

      mockInvoke.mockResolvedValueOnce(mockFileSelection);
      mockInvoke.mockRejectedValueOnce(decryptionError);

      await act(async () => {
        await result.current.selectEncryptedFile();
      });

      // Set all required inputs
      act(() => {
        result.current.setKeyId('test-key');
        result.current.setPassphrase('test-passphrase');
        result.current.setOutputPath('/output');
      });

      await act(async () => {
        try {
          await result.current.decryptFile();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual(decryptionError);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Progress Tracking', () => {
    it('should set up progress listener for decryption', async () => {
      const { result } = renderHook(() => useFileDecryption());
      const mockDecryptionResult: DecryptionResult = {
        decrypted_files: ['/output/file.txt'],
        original_file_count: 1,
        total_size_decrypted: 1024,
        decryption_time_ms: 1000,
      };

      // First select a file
      const mockFileSelection: FileSelection = {
        paths: ['/path/to/encrypted.age'],
        selection_type: 'Files',
        total_size: 1024,
        file_count: 1,
      };

      mockInvoke.mockResolvedValueOnce(mockFileSelection);
      mockInvoke.mockResolvedValueOnce(mockDecryptionResult);

      await act(async () => {
        await result.current.selectEncryptedFile();
      });

      // Set all required inputs
      act(() => {
        result.current.setKeyId('test-key');
        result.current.setPassphrase('test-passphrase');
        result.current.setOutputPath('/output');
      });

      await act(async () => {
        await result.current.decryptFile();
      });

      expect(mockListen).toHaveBeenCalledWith('decryption-progress', expect.any(Function));
    });

    it('should handle progress updates during decryption', async () => {
      const { result } = renderHook(() => useFileDecryption());
      const mockDecryptionResult: DecryptionResult = {
        decrypted_files: ['/output/file.txt'],
        original_file_count: 1,
        total_size_decrypted: 1024,
        decryption_time_ms: 1000,
      };

      let progressCallback: (event: { payload: any }) => void;
      mockListen.mockImplementationOnce((event, callback) => {
        progressCallback = callback;
        return Promise.resolve(() => Promise.resolve());
      });

      // First select a file
      const mockFileSelection: FileSelection = {
        paths: ['/path/to/encrypted.age'],
        selection_type: 'Files',
        total_size: 1024,
        file_count: 1,
      };

      mockInvoke.mockResolvedValueOnce(mockFileSelection);
      mockInvoke.mockResolvedValueOnce(mockDecryptionResult);

      await act(async () => {
        await result.current.selectEncryptedFile();
      });

      // Set all required inputs
      act(() => {
        result.current.setKeyId('test-key');
        result.current.setPassphrase('test-passphrase');
        result.current.setOutputPath('/output');
      });

      await act(async () => {
        result.current.decryptFile();
      });

      // Simulate progress update
      await act(async () => {
        progressCallback!({
          payload: {
            operation_id: 'test-op',
            progress: 0.5,
            message: 'Decrypting files...',
            timestamp: new Date().toISOString(),
          },
        });
      });

      expect(result.current.progress).toEqual({
        operation_id: 'test-op',
        progress: 0.5,
        message: 'Decrypting files...',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors without calling backend', async () => {
      const { result } = renderHook(() => useFileDecryption());

      await act(async () => {
        try {
          await result.current.decryptFile();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(mockInvoke).not.toHaveBeenCalled();
      expect(result.current.error).not.toBe(null);
    });

    it('should re-throw errors for component handling', async () => {
      const { result } = renderHook(() => useFileDecryption());
      const decryptionError: CommandError = {
        code: ErrorCode.DECRYPTION_FAILED,
        message: 'Failed to decrypt file',
        recovery_guidance: 'Please check your key and passphrase',
        user_actionable: true,
      };

      // First select a file
      const mockFileSelection: FileSelection = {
        paths: ['/path/to/encrypted.age'],
        selection_type: 'Files',
        total_size: 1024,
        file_count: 1,
      };

      mockInvoke.mockResolvedValueOnce(mockFileSelection);
      mockInvoke.mockRejectedValueOnce(decryptionError);

      await act(async () => {
        await result.current.selectEncryptedFile();
      });

      // Set all required inputs
      act(() => {
        result.current.setKeyId('test-key');
        result.current.setPassphrase('test-passphrase');
        result.current.setOutputPath('/output');
      });

      let thrownError: CommandError | null = null;

      await act(async () => {
        try {
          await result.current.decryptFile();
        } catch (error) {
          thrownError = error as CommandError;
        }
      });

      expect(thrownError).toEqual(decryptionError);
    });
  });
});
