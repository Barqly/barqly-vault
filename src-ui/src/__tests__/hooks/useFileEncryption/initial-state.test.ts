import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useFileEncryption - Initial State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
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
