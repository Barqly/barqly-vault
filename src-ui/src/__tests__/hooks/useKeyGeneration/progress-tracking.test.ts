/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKeyGeneration } from '../../../hooks/useKeyGeneration';
import { GenerateKeyResponse } from '../../../lib/api-types';
import { mockInvoke } from '../../../test-setup';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useKeyGeneration - Progress Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should handle progress updates during key generation', async () => {
    const { result } = renderHook(() => useKeyGeneration());
    const mockKeyResult: GenerateKeyResponse = {
      key_id: 'test-key-id',
      public_key: 'age1...',
      saved_path: '~/.config/barqly-vault/keys/test-key-id.age',
    };

    let progressCallback: ((event: { payload: any }) => void) | undefined;
    mockSafeListen.mockImplementationOnce((_event, callback) => {
      progressCallback = callback;
      return Promise.resolve(() => Promise.resolve());
    });

    // Mock passphrase validation and key generation using Tauri invoke
    mockInvoke
      .mockResolvedValueOnce({ is_valid: true, strength: 'strong' }) // validate_passphrase_strength
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
