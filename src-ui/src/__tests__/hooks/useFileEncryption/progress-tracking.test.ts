import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import { FileSelection } from '../../../lib/api-types';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeInvoke = vi.mocked(await import('../../../lib/tauri-safe')).safeInvoke;
const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useFileEncryption - Progress Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
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
    mockSafeListen.mockImplementationOnce((_event, callback) => {
      progressCallback = callback;
      return Promise.resolve(() => Promise.resolve());
    });

    // First select files to set up the state
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/file.txt'],
      selection_type: 'Files',
      total_size: 1024,
      file_count: 1,
    };

    mockSafeInvoke.mockResolvedValueOnce(mockFileSelection);
    mockSafeInvoke.mockResolvedValueOnce(mockEncryptionResult);

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
