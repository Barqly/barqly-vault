/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKeyGeneration } from '../../../hooks/useKeyGeneration';
import { CommandError, ErrorCode } from '../../../lib/api-types';
import { mockInvoke } from '../../../test-setup';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useKeyGeneration - Key Generation Failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
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
