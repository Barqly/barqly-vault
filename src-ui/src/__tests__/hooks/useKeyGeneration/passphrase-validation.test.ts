/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKeyGeneration } from '../../../hooks/useKeyGeneration';
import { ErrorCode } from '../../../lib/api-types';
import { mockInvoke } from '../../../test-setup';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useKeyGeneration - Passphrase Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
  });

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
    mockInvoke.mockResolvedValueOnce({
      is_valid: false,
      strength: 'weak',
      feedback: ['Too weak'],
      score: 1,
    });

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

  it('should handle passphrase validation errors', async () => {
    const { result } = renderHook(() => useKeyGeneration());

    act(() => {
      result.current.setLabel('test-key');
      result.current.setPassphrase('weak');
    });

    // Mock passphrase validation to return weak passphrase
    mockInvoke.mockResolvedValueOnce({
      is_valid: false,
      strength: 'weak',
      feedback: ['Too weak'],
      score: 1,
    });

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
});
