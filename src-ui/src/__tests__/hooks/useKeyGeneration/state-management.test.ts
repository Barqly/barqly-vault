import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKeyGeneration } from '../../../hooks/useKeyGeneration';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeInvoke = vi.mocked(await import('../../../lib/tauri-safe')).safeInvoke;
const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useKeyGeneration - State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
  });

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

  it('should set loading state during operations', async () => {
    const { result } = renderHook(() => useKeyGeneration());

    mockSafeInvoke
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
});
