import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKeyGeneration } from '../../../hooks/useKeyGeneration';
import { CommandError, ErrorCode } from '../../../lib/api-types';

// Mock the safe wrappers
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn().mockResolvedValue(() => Promise.resolve()),
}));

const mockSafeInvoke = vi.mocked(await import('../../../lib/tauri-safe')).safeInvoke;
const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useKeyGeneration - Tauri Integration & Regression Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
  });

  describe('Critical Tauri API Regression Prevention', () => {
    it('should handle safeInvoke throwing "Cannot read properties of undefined" error gracefully', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      // Mock the specific error that was occurring in the regression
      const tauriInvokeError = new TypeError(
        "Cannot read properties of undefined (reading 'invoke')",
      );
      mockSafeInvoke.mockRejectedValue(tauriInvokeError);

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('StrongP@ssw0rd123!');
      });

      await act(async () => {
        await expect(result.current.generateKey()).rejects.toThrow();
      });

      // Should handle the error gracefully and set appropriate error state
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.current.error?.user_actionable).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle web environment CommandError from safeInvoke', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      // Mock the web environment error from tauri-safe
      const webEnvironmentError: CommandError = {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'This feature requires the desktop application',
        recovery_guidance: 'Please use the desktop version of Barqly Vault to access this feature',
        user_actionable: true,
      };

      mockSafeInvoke.mockRejectedValue(webEnvironmentError);

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('StrongP@ssw0rd123!');
      });

      await act(async () => {
        await expect(result.current.generateKey()).rejects.toEqual(webEnvironmentError);
      });

      // Should preserve the original CommandError structure
      expect(result.current.error).toEqual(webEnvironmentError);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle safeListen setup failures', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      // Mock successful validation but failed listener setup
      mockSafeInvoke.mockResolvedValueOnce({ is_valid: true, strength: 'Strong' });
      mockSafeListen.mockRejectedValue(new Error('Failed to set up progress listener'));

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('StrongP@ssw0rd123!');
      });

      await act(async () => {
        await expect(result.current.generateKey()).rejects.toThrow(
          'Failed to set up progress listener',
        );
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });

    it('should ensure unlisten is called even when generateKey fails', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      const mockUnlisten = vi.fn(() => Promise.resolve());
      mockSafeInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' }) // validate_passphrase
        .mockRejectedValueOnce(new Error('Key generation failed')); // generate_key
      mockSafeListen.mockResolvedValue(mockUnlisten);

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('StrongP@ssw0rd123!');
      });

      await act(async () => {
        await expect(result.current.generateKey()).rejects.toThrow('Key generation failed');
      });

      // Verify unlisten was called despite the error
      expect(mockUnlisten).toHaveBeenCalledTimes(1);
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Environment-Specific Behavior', () => {
    it('should handle environment detection changes during operation', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      // Start with successful validation
      mockSafeInvoke.mockResolvedValueOnce({ is_valid: true, strength: 'Strong' });

      // Then environment changes (e.g., Tauri becomes unavailable)
      const environmentError: CommandError = {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'This feature requires the desktop application',
        recovery_guidance: 'Please use the desktop version of Barqly Vault to access this feature',
        user_actionable: true,
      };
      mockSafeInvoke.mockRejectedValueOnce(environmentError);

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('StrongP@ssw0rd123!');
      });

      await act(async () => {
        await expect(result.current.generateKey()).rejects.toEqual(environmentError);
      });

      expect(result.current.error).toEqual(environmentError);
    });

    it('should handle partial operation failures gracefully', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      // Validation succeeds
      mockSafeInvoke.mockResolvedValueOnce({ is_valid: true, strength: 'Strong' });

      // Listener setup succeeds
      const mockUnlisten = vi.fn(() => Promise.resolve());
      mockSafeListen.mockResolvedValue(mockUnlisten);

      // But key generation fails
      mockSafeInvoke.mockRejectedValueOnce(new Error('Crypto operation failed'));

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('StrongP@ssw0rd123!');
      });

      await act(async () => {
        await expect(result.current.generateKey()).rejects.toThrow('Crypto operation failed');
      });

      // Should clean up properly
      expect(mockUnlisten).toHaveBeenCalledTimes(1);
      expect(result.current.error).toBeTruthy();
      expect(result.current.progress).toBeNull();
    });
  });

  describe('Progress Tracking Integration', () => {
    it('should handle progress events through safeListen', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      let progressHandler: ((event: { payload: any }) => void) | null = null;

      mockSafeInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' })
        .mockResolvedValueOnce({
          key_id: 'test-key',
          public_key: 'age1test',
          saved_path: '/path',
        });

      mockSafeListen.mockImplementation(async (event, handler) => {
        progressHandler = handler;
        return () => Promise.resolve();
      });

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('StrongP@ssw0rd123!');
      });

      const generatePromise = act(async () => {
        await result.current.generateKey();
      });

      // Simulate progress events
      if (progressHandler) {
        act(() => {
          progressHandler({ payload: { progress: 25, message: 'Generating keys...' } });
        });

        expect(result.current.progress).toEqual({ progress: 25, message: 'Generating keys...' });

        act(() => {
          progressHandler({ payload: { progress: 75, message: 'Encrypting private key...' } });
        });

        expect(result.current.progress).toEqual({
          progress: 75,
          message: 'Encrypting private key...',
        });
      }

      await generatePromise;

      expect(result.current.success).toBeTruthy();
      expect(result.current.progress).toBeNull(); // Should clear on completion
    });

    it('should clear progress on reset', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      // Set some progress manually (simulating a previous operation)
      act(() => {
        result.current.setLabel('test');
        result.current.setPassphrase('test');
      });

      // Mock an operation that sets progress
      mockSafeInvoke.mockResolvedValueOnce({ is_valid: true, strength: 'Strong' });
      mockSafeListen.mockImplementation(async (event, handler) => {
        // Immediately fire a progress event
        handler({ payload: { progress: 50, message: 'In progress...' } });
        return () => Promise.resolve();
      });
      mockSafeInvoke.mockRejectedValueOnce(new Error('Cancelled'));

      // Start generation (will fail)
      await act(async () => {
        await expect(result.current.generateKey()).rejects.toThrow('Cancelled');
      });

      expect(result.current.progress).toBeNull(); // Should be cleared on error

      // Reset should also clear any remaining progress
      act(() => {
        result.current.reset();
      });

      expect(result.current.progress).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.success).toBeNull();
    });
  });

  describe('State Management Integration', () => {
    it('should maintain correct loading state throughout API calls', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      // Create controlled promises to test loading states
      let resolveValidation: (value: any) => void;
      let resolveGeneration: (value: any) => void;

      const validationPromise = new Promise((resolve) => {
        resolveValidation = resolve;
      });
      const generationPromise = new Promise((resolve) => {
        resolveGeneration = resolve;
      });

      mockSafeInvoke.mockReturnValueOnce(validationPromise).mockReturnValueOnce(generationPromise);

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('StrongP@ssw0rd123!');
      });

      // Start generation
      const generatePromise = act(async () => {
        return result.current.generateKey();
      });

      // Should be loading immediately
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();

      // Resolve validation
      act(() => {
        resolveValidation!({ is_valid: true, strength: 'Strong' });
      });

      // Should still be loading
      expect(result.current.isLoading).toBe(true);

      // Resolve generation
      act(() => {
        resolveGeneration!({
          key_id: 'test-key',
          public_key: 'age1test',
          saved_path: '/path',
        });
      });

      await generatePromise;

      // Should no longer be loading
      expect(result.current.isLoading).toBe(false);
      expect(result.current.success).toBeTruthy();
    });

    it('should handle concurrent generateKey calls correctly', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      // Mock slow operations
      const slowOperation = () => new Promise((resolve) => setTimeout(resolve, 100));

      mockSafeInvoke
        .mockImplementation(async () => {
          await slowOperation();
          return { is_valid: true, strength: 'Strong' };
        })
        .mockImplementation(async () => {
          await slowOperation();
          return {
            key_id: 'test-key',
            public_key: 'age1test',
            saved_path: '/path',
          };
        });

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('StrongP@ssw0rd123!');
      });

      // Start first generation
      const firstGeneration = act(async () => {
        await result.current.generateKey();
      });

      expect(result.current.isLoading).toBe(true);

      // Try to start second generation while first is running
      act(() => {
        result.current.generateKey().catch(() => {
          // This might throw due to validation failing on empty state
          // or it might be ignored - both behaviors are acceptable
        });
      });

      // Should still be in loading state from first call
      expect(result.current.isLoading).toBe(true);

      await firstGeneration;

      expect(result.current.isLoading).toBe(false);
      expect(result.current.success).toBeTruthy();
    });
  });

  describe('Error Recovery Integration', () => {
    it('should allow retry after API failure', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      // First attempt fails
      mockSafeInvoke.mockRejectedValueOnce(new Error('Network error'));

      act(() => {
        result.current.setLabel('test-key');
        result.current.setPassphrase('StrongP@ssw0rd123!');
      });

      await act(async () => {
        await expect(result.current.generateKey()).rejects.toThrow('Network error');
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);

      // Clear error and retry
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();

      // Second attempt succeeds
      mockSafeInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' })
        .mockResolvedValueOnce({
          key_id: 'test-key',
          public_key: 'age1test',
          saved_path: '/path',
        });

      await act(async () => {
        await result.current.generateKey();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.success).toBeTruthy();
    });

    it('should maintain state consistency during error recovery', async () => {
      const { result } = renderHook(() => useKeyGeneration());

      // Set initial state
      act(() => {
        result.current.setLabel('original-key');
        result.current.setPassphrase('OriginalP@ssw0rd123!');
      });

      // First attempt fails during generation (after validation)
      mockSafeInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' })
        .mockRejectedValueOnce(new Error('Generation failed'));

      await act(async () => {
        await expect(result.current.generateKey()).rejects.toThrow('Generation failed');
      });

      // State should be preserved after error
      expect(result.current.label).toBe('original-key');
      expect(result.current.passphrase).toBe('OriginalP@ssw0rd123!');
      expect(result.current.error).toBeTruthy();

      // Modify state and retry
      act(() => {
        result.current.setLabel('modified-key');
        result.current.setPassphrase('ModifiedP@ssw0rd123!');
      });

      // Should clear error when state changes
      expect(result.current.error).toBeNull();

      // Retry with new state
      mockSafeInvoke
        .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' })
        .mockResolvedValueOnce({
          key_id: 'modified-key',
          public_key: 'age1modified',
          saved_path: '/modified/path',
        });

      await act(async () => {
        await result.current.generateKey();
      });

      expect(result.current.success?.key_id).toBe('modified-key');
      expect(result.current.error).toBeNull();
    });
  });
});
