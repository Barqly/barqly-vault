import { renderHook, act } from '@testing-library/react';
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
      expect(typeof result.current.generateKey).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('Input Validation', () => {
    it('should validate required key label', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      await act(async () => {
        try {
          await result.current.generateKey({ label: '', passphrase: 'testpass123' });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_INPUT,
        message: 'Key label is required',
        recovery_guidance: 'Please enter a label for your encryption key',
        user_actionable: true,
      });
    });

    it('should validate required passphrase', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      await act(async () => {
        try {
          await result.current.generateKey({ label: 'Test Key', passphrase: '' });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_INPUT,
        message: 'Passphrase is required',
        recovery_guidance: 'Please enter a passphrase to protect your private key',
        user_actionable: true,
      });
    });

    it('should validate key label minimum length', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      await act(async () => {
        try {
          await result.current.generateKey({ label: 'ab', passphrase: 'testpass123' });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_KEY_LABEL,
        message: 'Key label must be at least 3 characters long',
        recovery_guidance: 'Please enter a longer label for your key',
        user_actionable: true,
      });
    });

    it('should validate key label maximum length', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      const longLabel = 'a'.repeat(51);

      await act(async () => {
        try {
          await result.current.generateKey({ label: longLabel, passphrase: 'testpass123' });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_KEY_LABEL,
        message: 'Key label must be less than 50 characters',
        recovery_guidance: 'Please enter a shorter label for your key',
        user_actionable: true,
      });
    });

    it('should validate key label format', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      await act(async () => {
        try {
          await result.current.generateKey({ label: 'Test@Key', passphrase: 'testpass123' });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INVALID_KEY_LABEL,
        message: 'Key label contains invalid characters',
        recovery_guidance: 'Only letters, numbers, spaces, hyphens, and underscores are allowed',
        user_actionable: true,
      });
    });

    it('should validate passphrase minimum length', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      await act(async () => {
        try {
          await result.current.generateKey({ label: 'Test Key', passphrase: 'short' });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.WEAK_PASSPHRASE,
        message: 'Passphrase must be at least 8 characters long',
        recovery_guidance: 'Please choose a longer passphrase for better security',
        user_actionable: true,
      });
    });

    it('should accept valid input', async () => {
      const { result } = renderHook(() => useKeyGeneration());
      const mockResponse: GenerateKeyResponse = {
        public_key: 'age1testpublickey',
        key_label: 'Test Key',
        key_id: 'test-key-123',
      };

      mockInvoke.mockResolvedValueOnce(mockResponse);

      await act(async () => {
        await result.current.generateKey({ label: 'Test Key', passphrase: 'testpass123' });
      });

      expect(result.current.success).toEqual(mockResponse);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Backend Integration', () => {
    it('should call generate_key command with valid input', async () => {
      const { result } = renderHook(() => useKeyGeneration());
      const mockResponse: GenerateKeyResponse = {
        public_key: 'age1testpublickey',
        key_label: 'Test Key',
        key_id: 'test-key-123',
      };

      mockInvoke.mockResolvedValueOnce(mockResponse);

      await act(async () => {
        await result.current.generateKey({ label: 'Test Key', passphrase: 'testpass123' });
      });

      expect(mockInvoke).toHaveBeenCalledWith('generate_key', {
        input: { label: 'Test Key', passphrase: 'testpass123' },
      });
    });

    it('should handle backend errors', async () => {
      const { result } = renderHook(() => useKeyGeneration());
      const backendError: CommandError = {
        code: ErrorCode.ENCRYPTION_FAILED,
        message: 'Failed to generate key',
        recovery_guidance: 'Please try again',
        user_actionable: true,
      };

      mockInvoke.mockRejectedValueOnce(backendError);

      await act(async () => {
        try {
          await result.current.generateKey({ label: 'Test Key', passphrase: 'testpass123' });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual(backendError);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle generic errors', async () => {
      const { result } = renderHook(() => useKeyGeneration());
      const genericError = new Error('Network error');

      mockInvoke.mockRejectedValueOnce(genericError);

      await act(async () => {
        try {
          await result.current.generateKey({ label: 'Test Key', passphrase: 'testpass123' });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Network error',
        recovery_guidance: 'Please try again. If the problem persists, restart the application.',
        user_actionable: true,
      });
    });
  });

  describe('Progress Tracking', () => {
    it('should set up progress listener', async () => {
      const { result } = renderHook(() => useKeyGeneration());
      const mockResponse: GenerateKeyResponse = {
        public_key: 'age1testpublickey',
        key_label: 'Test Key',
        key_id: 'test-key-123',
      };

      mockInvoke.mockResolvedValueOnce(mockResponse);

      await act(async () => {
        await result.current.generateKey({ label: 'Test Key', passphrase: 'testpass123' });
      });

      expect(mockListen).toHaveBeenCalledWith('key-generation-progress', expect.any(Function));
    });

    it('should handle progress updates', async () => {
      const { result } = renderHook(() => useKeyGeneration());
      const mockResponse: GenerateKeyResponse = {
        public_key: 'age1testpublickey',
        key_label: 'Test Key',
        key_id: 'test-key-123',
      };

      let progressCallback: (event: { payload: any }) => void;
      mockListen.mockImplementationOnce((event, callback) => {
        progressCallback = callback;
        return Promise.resolve(() => Promise.resolve());
      });

      mockInvoke.mockResolvedValueOnce(mockResponse);

      // Start the operation
      await act(async () => {
        result.current.generateKey({ label: 'Test Key', passphrase: 'testpass123' });
      });

      // Simulate progress update
      await act(async () => {
        progressCallback!({
          payload: {
            operation_id: 'test-op',
            progress: 0.5,
            message: 'Generating key...',
            timestamp: new Date().toISOString(),
          },
        });
      });

      expect(result.current.progress).toEqual({
        operation_id: 'test-op',
        progress: 0.5,
        message: 'Generating key...',
        timestamp: expect.any(String),
      });
    });
  });

  describe('State Management', () => {
    it('should reset state correctly', () => {
      const { result } = renderHook(() => useKeyGeneration());

      // Set some state
      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(null);
      expect(result.current.progress).toBe(null);
    });

    it('should clear error correctly', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      // First, create an error
      await act(async () => {
        try {
          await result.current.generateKey({ label: '', passphrase: 'testpass123' });
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

    it('should set loading state during operation', async () => {
      const { result } = renderHook(() => useKeyGeneration());
      const mockResponse: GenerateKeyResponse = {
        public_key: 'age1testpublickey',
        key_label: 'Test Key',
        key_id: 'test-key-123',
      };

      mockInvoke.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100)),
      );

      act(() => {
        result.current.generateKey({ label: 'Test Key', passphrase: 'testpass123' });
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors without calling backend', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      await act(async () => {
        try {
          await result.current.generateKey({ label: '', passphrase: 'testpass123' });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(mockInvoke).not.toHaveBeenCalled();
      expect(result.current.error).not.toBe(null);
    });

    it('should re-throw errors for component handling', async () => {
      const { result } = renderHook(() => useKeyGeneration());
      const backendError: CommandError = {
        code: ErrorCode.ENCRYPTION_FAILED,
        message: 'Failed to generate key',
        recovery_guidance: 'Please try again',
        user_actionable: true,
      };

      mockInvoke.mockRejectedValueOnce(backendError);

      let thrownError: CommandError | null = null;

      await act(async () => {
        try {
          await result.current.generateKey({ label: 'Test Key', passphrase: 'testpass123' });
        } catch (error) {
          thrownError = error as CommandError;
        }
      });

      expect(thrownError).toEqual(backendError);
    });
  });
});
