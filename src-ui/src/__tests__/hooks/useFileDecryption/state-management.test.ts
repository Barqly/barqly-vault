/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFileDecryption } from '../../../hooks/useFileDecryption';
import { FileSelection } from '../../../lib/api-types';

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
import { safeInvoke, safeListen } from '../../../lib/tauri-safe';

const mockSafeInvoke = vi.mocked(safeInvoke);
const mockSafeListen = vi.mocked(safeListen);

// Convenience references for consistency with new pattern
const mocks = {
  safeInvoke: mockSafeInvoke,
  safeListen: mockSafeListen,
};

describe('useFileDecryption - State Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.safeListen.mockResolvedValue(() => Promise.resolve());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should set key ID correctly', () => {
    const { result } = renderHook(() => useFileDecryption());

    act(() => {
      result.current.setKeyId('test-key-123');
    });

    expect(result.current.selectedKeyId).toBe('test-key-123');
    expect(result.current.error).toBe(null); // Should clear previous errors
  });

  it('should set passphrase correctly', () => {
    const { result } = renderHook(() => useFileDecryption());

    act(() => {
      result.current.setPassphrase('test-passphrase');
    });

    expect(result.current.passphrase).toBe('test-passphrase');
    expect(result.current.error).toBe(null); // Should clear previous errors
  });

  it('should set output path correctly', () => {
    const { result } = renderHook(() => useFileDecryption());

    act(() => {
      result.current.setOutputPath('/output/directory');
    });

    expect(result.current.outputPath).toBe('/output/directory');
    expect(result.current.error).toBe(null); // Should clear previous errors
  });

  it('should reset state correctly', () => {
    const { result } = renderHook(() => useFileDecryption());

    // Set some state first
    act(() => {
      result.current.setKeyId('test-key');
      result.current.setPassphrase('test-pass');
      result.current.setOutputPath('/output');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(null);
    expect(result.current.progress).toBe(null);
    expect(result.current.selectedFile).toBe(null);
    expect(result.current.selectedKeyId).toBe(null);
    expect(result.current.passphrase).toBe('');
    expect(result.current.outputPath).toBe(null);
  });

  it('should clear error correctly', async () => {
    const { result } = renderHook(() => useFileDecryption());

    // First, create an error
    await act(async () => {
      try {
        await result.current.decryptFile();
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).not.toBe(null);

    // Clear the error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  it('should clear selection correctly', async () => {
    const { result } = renderHook(() => useFileDecryption());

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

    // Set some other state
    act(() => {
      result.current.setKeyId('test-key');
      result.current.setPassphrase('test-pass');
      result.current.setOutputPath('/output');
    });

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedFile).toBe(null);
    expect(result.current.selectedKeyId).toBe(null);
    expect(result.current.passphrase).toBe('');
    expect(result.current.outputPath).toBe(null);
  });
});
