import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKeyGeneration } from '../../../hooks/useKeyGeneration';
import { GenerateKeyResponse } from '../../../lib/api-types';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockSafeInvoke = vi.mocked(await import('../../../lib/tauri-safe')).safeInvoke;
const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useKeyGeneration - Key Generation Success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeListen.mockResolvedValue(() => Promise.resolve());
  });

  it('should generate key successfully', async () => {
    const { result } = renderHook(() => useKeyGeneration());
    const mockKeyResult: GenerateKeyResponse = {
      key_id: 'test-key-id',
      public_key: 'age1...',
      saved_path: '~/.config/barqly-vault/keys/test-key-id.age',
    };

    mockSafeInvoke
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
    mockSafeInvoke
      .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' }) // validate_passphrase
      .mockResolvedValueOnce(mockKeyResult); // generate_key

    act(() => {
      result.current.setLabel('test-key');
      result.current.setPassphrase('StrongP@ssw0rd123!');
    });

    await act(async () => {
      await result.current.generateKey();
    });

    expect(mockSafeInvoke).toHaveBeenCalledWith(
      'generate_key',
      {
        label: 'test-key',
        passphrase: 'StrongP@ssw0rd123!',
      },
      'useKeyGeneration',
    );
  });

  it('should set up progress listener for key generation', async () => {
    const { result } = renderHook(() => useKeyGeneration());
    const mockKeyResult: GenerateKeyResponse = {
      key_id: 'test-key-id',
      public_key: 'age1...',
      saved_path: '~/.config/barqly-vault/keys/test-key-id.age',
    };

    // Mock passphrase validation and key generation
    mockSafeInvoke
      .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' }) // validate_passphrase
      .mockResolvedValueOnce(mockKeyResult); // generate_key

    act(() => {
      result.current.setLabel('test-key');
      result.current.setPassphrase('StrongP@ssw0rd123!');
    });

    await act(async () => {
      await result.current.generateKey();
    });

    expect(mockSafeListen).toHaveBeenCalledWith('key-generation-progress', expect.any(Function));
  });
});
