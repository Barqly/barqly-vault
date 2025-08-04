import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';

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

  it('should manage state during file selection', async () => {
    const { result } = renderHook(() => useFileEncryption());
    const testPaths = ['/mock/path/file1.txt', '/mock/path/file2.txt'];

    // The new selectFiles implementation is synchronous after the initial state update
    await act(async () => {
      await result.current.selectFiles(testPaths, 'Files');
    });

    // After the operation completes, loading should be false
    expect(result.current.isLoading).toBe(false);
    expect(result.current.selectedFiles).toBeTruthy();
    expect(result.current.selectedFiles?.file_count).toBe(2);
    expect(result.current.selectedFiles?.paths).toEqual(testPaths);
  });

  it('should clear error when clearError is called', async () => {
    const { result } = renderHook(() => useFileEncryption());

    // First, set up state with selected files
    await act(async () => {
      await result.current.selectFiles(['/test.txt'], 'Files');
    });

    // Mock an error for encryption
    const mockError = new Error('Encryption failed');
    mockSafeInvoke.mockRejectedValueOnce(mockError);

    // Try to encrypt (will fail)
    await act(async () => {
      try {
        await result.current.encryptFiles('test-key', 'output');
      } catch {
        // Expected to fail
      }
    });

    expect(result.current.error).toBeTruthy();

    // Clear the error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  it('should maintain state consistency through multiple operations', async () => {
    const { result } = renderHook(() => useFileEncryption());

    // Initial state
    expect(result.current.selectedFiles).toBe(null);
    expect(result.current.isLoading).toBe(false);

    // Select files
    await act(async () => {
      await result.current.selectFiles(['/file1.txt', '/file2.txt'], 'Files');
    });

    expect(result.current.selectedFiles).toBeTruthy();
    expect(result.current.selectedFiles?.file_count).toBe(2);

    // Clear selection
    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedFiles).toBe(null);

    // Select different files
    await act(async () => {
      await result.current.selectFiles(['/file3.txt'], 'Files');
    });

    expect(result.current.selectedFiles?.file_count).toBe(1);

    // Reset everything
    act(() => {
      result.current.reset();
    });

    expect(result.current.selectedFiles).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(null);
  });
});
