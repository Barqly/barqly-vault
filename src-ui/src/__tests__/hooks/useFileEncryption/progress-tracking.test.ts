import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import { FileSelection } from '../../../lib/api-types';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;
const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useFileEncryption - Progress Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should handle progress updates during encryption', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const mockEncryptionResult = {
      encrypted_file_path: '/output/encrypted.age',
      original_file_count: 1,
      total_size_encrypted: 1024,
      compression_ratio: 0.8,
      encryption_time_ms: 1000,
    };

    let progressCallback: (event: { payload: any }) => void;
    mockListen.mockImplementationOnce((_event, callback) => {
      progressCallback = (event: { payload: any }) =>
        callback({ event: 'test-event', id: 1, payload: event.payload });
      return Promise.resolve(() => Promise.resolve());
    });

    // First select files to set up the state
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/file.txt'],
      selection_type: 'Files',
      total_size: 1024,
      file_count: 1,
    };

    mockInvoke.mockResolvedValueOnce(mockFileSelection);
    mockInvoke.mockResolvedValueOnce(mockEncryptionResult);

    await act(async () => {
      await result.current.selectFiles('Files');
    });

    await act(async () => {
      result.current.encryptFiles('test-key', '/output');
    });

    // Simulate progress update
    await act(async () => {
      progressCallback!({
        payload: {
          operation_id: 'test-op',
          progress: 0.5,
          message: 'Encrypting files...',
          timestamp: new Date().toISOString(),
        },
      });
    });

    expect(result.current.progress).toEqual({
      operation_id: 'test-op',
      progress: 0.5,
      message: 'Encrypting files...',
      timestamp: expect.any(String),
    });
  });
});
