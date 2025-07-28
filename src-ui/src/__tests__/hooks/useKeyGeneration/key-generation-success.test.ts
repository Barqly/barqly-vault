import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKeyGeneration } from '../../../hooks/useKeyGeneration';
import { GenerateKeyResponse } from '../../../lib/api-types';

// Mock the Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockInvoke = vi.mocked(await import('@tauri-apps/api/core')).invoke;
const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useKeyGeneration - Key Generation Success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should generate key successfully', async () => {
    const { result } = renderHook(() => useKeyGeneration());
    const mockKeyResult: GenerateKeyResponse = {
      key_id: 'test-key-id',
      public_key: 'age1...',
      saved_path: '~/.config/barqly-vault/keys/test-key-id.age',
    };

    mockInvoke
      .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' }) // validate_passphrase
      .mockResolvedValueOnce(mockKeyResult); // generate_key

    act(() => {
      result.current.setLabel('test-key');
      result.current.setPassphrase('StrongP@ssw0rd123!');
    });

    await act(async () => {
      await result.current.generateKey();
    });

    expect(result.current.success).toEqual(mockKeyResult);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should call generate_key command with correct parameters', async () => {
    const { result } = renderHook(() => useKeyGeneration());
    const mockKeyResult: GenerateKeyResponse = {
      key_id: 'test-key-id',
      public_key: 'age1...',
      saved_path: '~/.config/barqly-vault/keys/test-key-id.age',
    };

    // Mock passphrase validation and key generation
    mockInvoke
      .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' }) // validate_passphrase
      .mockResolvedValueOnce(mockKeyResult); // generate_key

    act(() => {
      result.current.setLabel('test-key');
      result.current.setPassphrase('StrongP@ssw0rd123!');
    });

    await act(async () => {
      await result.current.generateKey();
    });

    expect(mockInvoke).toHaveBeenCalledWith('generate_key', {
      label: 'test-key',
      passphrase: 'StrongP@ssw0rd123!',
    });
  });

  it('should set up progress listener for key generation', async () => {
    const { result } = renderHook(() => useKeyGeneration());
    const mockKeyResult: GenerateKeyResponse = {
      key_id: 'test-key-id',
      public_key: 'age1...',
      saved_path: '~/.config/barqly-vault/keys/test-key-id.age',
    };

    // Mock passphrase validation and key generation
    mockInvoke
      .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' }) // validate_passphrase
      .mockResolvedValueOnce(mockKeyResult); // generate_key

    act(() => {
      result.current.setLabel('test-key');
      result.current.setPassphrase('StrongP@ssw0rd123!');
    });

    await act(async () => {
      await result.current.generateKey();
    });

    expect(mockListen).toHaveBeenCalledWith('key-generation-progress', expect.any(Function));
  });
});
