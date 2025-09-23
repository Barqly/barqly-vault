/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKeyGeneration } from '../../../hooks/useKeyGeneration';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useKeyGeneration - Initial State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useKeyGeneration());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(null);
    expect(result.current.progress).toBe(null);
    expect(result.current.label).toBe('');
    expect(result.current.passphrase).toBe('');
    expect(typeof result.current.setLabel).toBe('function');
    expect(typeof result.current.setPassphrase).toBe('function');
    expect(typeof result.current.generateKey).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });
});
