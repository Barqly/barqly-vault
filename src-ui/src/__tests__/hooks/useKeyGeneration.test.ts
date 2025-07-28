import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKeyGeneration } from '../../hooks/useKeyGeneration';
import { GenerateKeyResponse, CommandError, ErrorCode } from '../../lib/api-types';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;
const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useKeyGeneration (4.2.3.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useKeyGeneration());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(null);
      expect(result.current.progress).toBe(null);
      expect(result.current.label).toBe('');
      expect(result.current.passphrase).toBe('');
      expect(typeof result.current.setLabel).toBe('function');
      expect(typeof result.current.setPassphrase).toBe('function');
      expect(typeof result.current.generateKey).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('Key Generation', () => {
    it('should validate label is provided', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      await act(async () => {
        try {
          await result.current.generateKey();
        } catch (_error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_INPUT,
        message: 'Key label is required',
        recovery_guidance: 'Please provide a unique label for the new key',
        user_actionable: true,
      });
    });

    it('should validate passphrase is provided', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      act(() => {
        result.current.setLabel('test-key');
      });

      await act(async () => {
        try {
          await result.current.generateKey();
        } catch (_error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_INPUT,
        message: 'Passphrase is required',
        recovery_guidance: 'Please provide a strong passphrase to protect the key',
        user_actionable: true,
      });
    });

    it('should validate passphrase is not weak', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('weak');
      });

      // Mock passphrase validation
      mockInvoke.mockResolvedValueOnce({ is_strong: false, score: 1, feedback: 'Too weak' });

      await act(async () => {
        try {
          await result.current.generateKey();
        } catch (_error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.WEAK_PASSPHRASE,
        message: 'Passphrase is too weak',
        recovery_guidance: 'Please use a stronger passphrase',
        user_actionable: true,
      });
    });

    it('should generate key successfully', async () => {
      const { result } = renderHook(() => useKeyGeneration());
      const mockKeyResult: GenerateKeyResponse = {
        key_id: 'test-key-id',
        public_key: 'age1...',
        saved_path: '~/.config/barqly-vault/keys/test-key-id.age',
      };

      mockInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' }) // validate_passphrase
        .mockResolvedValueOnce(mockKeyResult); // generate_key

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('StrongP@ssw0rd123!');
      });

      await act(async () => {
        await result.current.generateKey();
      });

      expect(result.current.success).toEqual(mockKeyResult);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should call generate_key command with correct parameters', async () => {
      const { result } = renderHook(() => useKeyGeneration());
      const mockKeyResult: GenerateKeyResponse = {
        key_id: 'test-key-id',
        public_key: 'age1...',
        saved_path: '~/.config/barqly-vault/keys/test-key-id.age',
      };

      // Mock passphrase validation and key generation
      mockInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' }) // validate_passphrase
        .mockResolvedValueOnce(mockKeyResult); // generate_key

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('StrongP@ssw0rd123!');
      });

      await act(async () => {
        await result.current.generateKey();
      });

      expect(mockInvoke).toHaveBeenCalledWith('generate_key', {
        label: 'test-key',
        passphrase: 'StrongP@ssw0rd123!',
      });
    });

    it('should handle key generation errors', async () => {
      const { result } = renderHook(() => useKeyGeneration());
      const generationError: CommandError = {
        code: ErrorCode.KEY_GENERATION_FAILED,
        message: 'Failed to generate key',
        recovery_guidance: 'Please try again',
        user_actionable: true,
      };

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('strong-passphrase-123!');
      });

      // Mock passphrase validation and key generation
      mockInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' }) // validate_passphrase
        .mockRejectedValueOnce(generationError); // generate_key fails

      await act(async () => {
        try {
          await result.current.generateKey();
        } catch (_error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual(generationError);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle passphrase validation errors', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('weak');
      });

      // Mock passphrase validation to return weak passphrase
      mockInvoke.mockResolvedValueOnce({ is_valid: false, strength: 'Weak' });

      await act(async () => {
        try {
          await result.current.generateKey();
        } catch (_error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.WEAK_PASSPHRASE,
        message: 'Passphrase is too weak',
        recovery_guidance: 'Please use a stronger passphrase',
        user_actionable: true,
      });
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Progress Tracking', () => {
    it('should set up progress listener for key generation', async () => {
      const { result } = renderHook(() => useKeyGeneration());
      const mockKeyResult: GenerateKeyResponse = {
        key_id: 'test-key-id',
        public_key: 'age1...',
        saved_path: '~/.config/barqly-vault/keys/test-key-id.age',
      };

      // Mock passphrase validation and key generation
      mockInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' }) // validate_passphrase
        .mockResolvedValueOnce(mockKeyResult); // generate_key

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('StrongP@ssw0rd123!');
      });

      await act(async () => {
        await result.current.generateKey();
      });

      expect(mockListen).toHaveBeenCalledWith('key-generation-progress', expect.any(Function));
    });

    it('should handle progress updates during key generation', async () => {
      const { result } = renderHook(() => useKeyGeneration());
      const mockKeyResult: GenerateKeyResponse = {
        key_id: 'test-key-id',
        public_key: 'age1...',
        saved_path: '~/.config/barqly-vault/keys/test-key-id.age',
      };

      let progressCallback: ((event: { payload: any }) => void) | undefined;
      mockListen.mockImplementationOnce((_event, callback) => {
        progressCallback = (event: { payload: any }) =>
          callback({ event: 'test-event', id: 1, payload: event.payload });
        return Promise.resolve(() => Promise.resolve());
      });

      // Mock passphrase validation and key generation
      mockInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' }) // validate_passphrase
        .mockResolvedValueOnce(mockKeyResult); // generate_key

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('StrongP@ssw0rd123!');
      });

      // Start key generation but don't await it yet
      let generatePromise: Promise<void>;
      act(() => {
        generatePromise = result.current.generateKey();
      });

      // Wait for the listener to be set up
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Simulate progress update while generation is in progress
      act(() => {
        if (progressCallback) {
          progressCallback({
            payload: {
              operation_id: 'test-op',
              progress: 0.5,
              message: 'Generating key...',
              timestamp: new Date().toISOString(),
            },
          });
        }
      });

      // Check progress before generation completes
      expect(result.current.progress).toEqual({
        operation_id: 'test-op',
        progress: 0.5,
        message: 'Generating key...',
        timestamp: expect.any(String),
      });

      // Now complete the generation
      await act(async () => {
        await generatePromise;
      });
    });
  });

  describe('State Management', () => {
    it('should reset state correctly', () => {
      const { result } = renderHook(() => useKeyGeneration());

      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(null);
      expect(result.current.progress).toBe(null);
      expect(result.current.label).toBe('');
      expect(result.current.passphrase).toBe('');
    });

    it('should clear error correctly', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      // First, create an error
      await act(async () => {
        try {
          await result.current.generateKey();
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
  });

  describe('Error Handling', () => {
    it('should set loading state during operations', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      mockInvoke
        .mockImplementationOnce(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve({ is_valid: true, strength: 'Strong' }), 100),
            ),
        )
        .mockResolvedValueOnce({
          key_id: 'test-key-id',
          public_key: 'age1...',
          saved_path: '~/.config/barqly-vault/keys/test-key-id.age',
        });

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('StrongP@ssw0rd123!');
      });

      // Start generating without await to check loading state
      let generatePromise: Promise<void>;
      act(() => {
        generatePromise = result.current.generateKey();
      });

      expect(result.current.isLoading).toBe(true);

      // Wait for the promise to complete
      await act(async () => {
        await generatePromise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle validation errors without calling backend', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      await act(async () => {
        try {
          await result.current.generateKey();
        } catch (_error) {
          // Expected to throw
        }
      });

      expect(mockInvoke).not.toHaveBeenCalled();
      expect(result.current.error).not.toBe(null);
    });

    it('should re-throw errors for component handling', async () => {
      const { result } = renderHook(() => useKeyGeneration());
      const generationError: CommandError = {
        code: ErrorCode.KEY_GENERATION_FAILED,
        message: 'Failed to generate key',
        recovery_guidance: 'Please try again',
        user_actionable: true,
      };

      // Mock passphrase validation and key generation
      mockInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' }) // validate_passphrase
        .mockRejectedValueOnce(generationError); // generate_key fails

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('StrongP@ssw0rd123!');
      });

      let thrownError: CommandError | null = null;

      await act(async () => {
        try {
          await result.current.generateKey();
        } catch (error) {
          thrownError = error as CommandError;
        }
      });

      expect(thrownError).toEqual(generationError);
    });
  });
});
