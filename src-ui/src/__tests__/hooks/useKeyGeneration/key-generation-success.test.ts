import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useKeyGeneration } from '../../../hooks/useKeyGeneration';
import { GenerateKeyResponse } from '../../../lib/api-types';

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

// Mock environment detection
vi.mock('../../../lib/environment/platform', () => ({
  isTauri: vi.fn().mockReturnValue(true),
  isWeb: vi.fn().mockReturnValue(false),
  isTest: vi.fn().mockReturnValue(true),
  isBrowser: vi.fn().mockReturnValue(false),
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

describe('useKeyGeneration - Key Generation Success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.safeListen.mockResolvedValue(() => Promise.resolve());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should generate key successfully', async () => {
    const { result } = renderHook(() => useKeyGeneration());
    const mockKeyResult: GenerateKeyResponse = {
      key_id: 'test-key-id',
      public_key: 'age1...',
      saved_path: '~/.config/barqly-vault/keys/test-key-id.age',
    };

    mocks.safeInvoke
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
    mocks.safeInvoke
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
      'key-generation-workflow',
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
    mocks.safeInvoke
      .mockResolvedValueOnce({ is_valid: true, strength: 'Strong' }) // validate_passphrase
      .mockResolvedValueOnce(mockKeyResult); // generate_key

    act(() => {
      result.current.setLabel('test-key');
      result.current.setPassphrase('StrongP@ssw0rd123!');
    });

    await act(async () => {
      await result.current.generateKey();
    });

    expect(mocks.safeListen).toHaveBeenCalledWith('key-generation-progress', expect.any(Function));
  });
});
