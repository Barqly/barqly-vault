import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKeyGeneration } from '../../../hooks/useKeyGeneration';
import { GenerateKeyResponse } from '../../../lib/api-types';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;
const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useKeyGeneration - Progress Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
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
