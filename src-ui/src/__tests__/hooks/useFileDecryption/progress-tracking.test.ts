/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFileDecryption } from '../../../hooks/useFileDecryption';
import { FileSelection, DecryptionResult } from '../../../lib/api-types';
import { Event } from '@tauri-apps/api/event';
import { mockInvoke } from '../../../test-setup';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

// Mock environment detection
vi.mock('../../../lib/environment/platform', () => ({
  isTauri: vi.fn().mockReturnValue(true),
  isWeb: vi.fn().mockReturnValue(false),
}));

// Import after mocking
import { safeListen } from '../../../lib/tauri-safe';

const mockSafeListen = vi.mocked(safeListen);

// Convenience references for consistency with new pattern
const mocks = {
  safeInvoke: mockInvoke,
  safeListen: mockSafeListen,
};

describe('useFileDecryption - Progress Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.safeListen.mockResolvedValue(() => Promise.resolve());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should handle progress updates during decryption', async () => {
    const { result } = renderHook(() => useFileDecryption());
    const mockDecryptionResult: DecryptionResult = {
      extracted_files: ['/output/file.txt'],
      output_dir: '/output',
      manifest_verified: true,
    };

    let progressCallback: ((event: Event<unknown>) => void) | undefined;
    mocks.safeListen.mockImplementation((_event, callback) => {
      progressCallback = callback as (event: Event<unknown>) => void;
      return Promise.resolve(() => Promise.resolve());
    });

    // First select a file
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/encrypted.age'],
      total_size: 1024,
      file_count: 1,
      selection_type: 'Files',
    };

    mocks.safeInvoke.mockResolvedValueOnce(mockFileSelection);

    await act(async () => {
      await result.current.selectEncryptedFile();
    });

    // Set all required inputs
    act(() => {
      result.current.setKeyId('test-key');
      result.current.setPassphrase('test-passphrase');
      result.current.setOutputPath('/output');
    });

    // Mock the decryption call to not resolve immediately
    let decryptResolve: ((value: DecryptionResult) => void) | undefined;
    const decryptPromise = new Promise<DecryptionResult>((resolve) => {
      decryptResolve = resolve;
    });
    mocks.safeInvoke.mockReturnValueOnce(decryptPromise);

    // Start decryption (non-blocking)
    act(() => {
      result.current.decryptFile();
    });

    // Wait for the listener to be set up
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Simulate progress update
    await act(async () => {
      if (progressCallback) {
        progressCallback({
          payload: {
            operation_id: 'test-decrypt',
            progress: 50,
            message: 'Decrypting files...',
            timestamp: new Date().toISOString(),
          },
        } as Event<unknown>);
      }
    });

    // Check progress was updated
    expect(result.current.progress).toEqual({
      operation_id: 'test-decrypt',
      progress: 50,
      message: 'Decrypting files...',
      timestamp: expect.any(String),
    });

    // Complete the decryption
    await act(async () => {
      if (decryptResolve) {
        decryptResolve(mockDecryptionResult);
      }
    });
  });
});
