import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useFileDecryption } from '../../../hooks/useFileDecryption';

describe('useFileDecryption - Initial State', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useFileDecryption());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(null);
    expect(result.current.progress).toBe(null);
    expect(result.current.selectedFile).toBe(null);
    expect(result.current.selectedKeyId).toBe(null);
    expect(result.current.passphrase).toBe('');
    expect(result.current.outputPath).toBe(null);
    expect(typeof result.current.selectEncryptedFile).toBe('function');
    expect(typeof result.current.setKeyId).toBe('function');
    expect(typeof result.current.setPassphrase).toBe('function');
    expect(typeof result.current.setOutputPath).toBe('function');
    expect(typeof result.current.decryptFile).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
    expect(typeof result.current.clearSelection).toBe('function');
  });
});
