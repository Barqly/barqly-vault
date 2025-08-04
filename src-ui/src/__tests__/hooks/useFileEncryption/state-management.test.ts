import { renderHook, act, waitFor } from '@testing-library/react';
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

describe('useFileEncryption - State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should reset state correctly', () => {
    const { result } = renderHook(() => useFileEncryption());

    act(() => {
      result.current.reset();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(null);
    expect(result.current.progress).toBe(null);
    expect(result.current.selectedFiles).toBe(null);
  });

  it('should set loading state during operations', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const mockFileSelection: FileSelection = {
      paths: ['/path/to/file.txt'],
      selection_type: 'Files',
      total_size: 1024,
      file_count: 1,
    };

    mockSafeInvoke.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(mockFileSelection), 100)),
    );

    act(() => {
      result.current.selectFiles(['/mock/path/file1.txt', '/mock/path/file2.txt'], 'Files');
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
