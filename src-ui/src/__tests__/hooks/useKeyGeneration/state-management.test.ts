import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKeyGeneration } from '../../../hooks/useKeyGeneration';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;
const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useKeyGeneration - State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
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
});
