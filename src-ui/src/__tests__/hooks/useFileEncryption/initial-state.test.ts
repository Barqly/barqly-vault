/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useFileEncryption - Initial State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useFileEncryption());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(null);
    expect(result.current.progress).toBe(null);
    expect(result.current.selectedFiles).toBe(null);
    expect(typeof result.current.selectFiles).toBe('function');
    expect(typeof result.current.encryptFiles).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
    expect(typeof result.current.clearSelection).toBe('function');
  });
});
