import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileDecryption } from '../../../hooks/useFileDecryption';
import { FileSelection, DecryptionResult } from '../../../lib/api-types';
import { Event } from '@tauri-apps/api/event';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;
const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useFileDecryption - Progress Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should handle progress updates during decryption', async () => {
    const { result } = renderHook(() => useFileDecryption());
    const mockDecryptionResult: DecryptionResult = {
      extracted_files: ['/output/file.txt'],
      output_dir: '/output',
      manifest_verified: true,
    };

    let progressCallback: (event: Event<unknown>) => void;
    mockListen.mockImplementationOnce((_event, callback) => {
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

    mockInvoke.mockResolvedValueOnce(mockFileSelection);
    mockInvoke.mockResolvedValueOnce(mockDecryptionResult);

    await act(async () => {
      await result.current.selectEncryptedFile();
    });

    // Set all required inputs
    act(() => {
      result.current.setKeyId('test-key');
      result.current.setPassphrase('test-passphrase');
      result.current.setOutputPath('/output');
    });

    await act(async () => {
      result.current.decryptFile();
    });

    // Simulate progress update
    await act(async () => {
      progressCallback!({
        event: 'decryption-progress',
        id: 1,
        payload: {
          progress: 0.5,
          message: 'Decrypting files...',
          timestamp: new Date().toISOString(),
        },
      });
    });

    expect(result.current.progress).toEqual({
      progress: 0.5,
      message: 'Decrypting files...',
      timestamp: expect.any(String),
    });
  });
});
