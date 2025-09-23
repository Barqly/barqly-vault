/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFileEncryption } from '../../../hooks/useFileEncryption';
import { ErrorCode } from '../../../lib/api-types';
import { mockInvoke } from '../../../test-setup';

// Mock the environment detection
vi.mock('../../../lib/environment/platform', () => ({
  isTauri: vi.fn(),
}));

// Mock the tauri-safe module
vi.mock('../../../lib/tauri-safe', () => ({
  safeInvoke: vi.fn(),
  safeListen: vi.fn(),
}));

const mockIsTauri = vi.mocked(await import('../../../lib/environment/platform')).isTauri;
const mockSafeListen = vi.mocked(await import('../../../lib/tauri-safe')).safeListen;

describe('useFileEncryption - Environment Specific Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Web Environment (Tauri not available)', () => {
    beforeEach(() => {
      mockIsTauri.mockReturnValue(false);

      // When not in Tauri, safeInvoke should throw an error
      mockInvoke.mockRejectedValue({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'This feature requires the desktop application',
        recovery_guidance: 'Please use the desktop version of Barqly Vault to access this feature',
        user_actionable: true,
      });

      // When not in Tauri, safeListen returns a no-op
      mockSafeListen.mockResolvedValue(() => Promise.resolve());
    });

    it('should handle file selection gracefully in web environment', async () => {
      const { result } = renderHook(() => useFileEncryption());

      await act(async () => {
        try {
          await result.current.selectFiles(['/test/file.txt'], 'Files');
        } catch (_error) {
          // Expected to fail
        }
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error).toMatchObject({
        code: ErrorCode.INTERNAL_ERROR,
        message: expect.stringContaining('desktop application'),
        recovery_guidance: expect.stringContaining('restart the application'),
        user_actionable: true,
      });
      expect(result.current.selectedFiles).toBeNull();
    });

    it('should fail encryption attempts in web environment', async () => {
      const { result } = renderHook(() => useFileEncryption());

      // First select files (which will fail but set the state)
      mockInvoke.mockResolvedValueOnce([
        {
          path: '/test/file.txt',
          name: 'file.txt',
          size: 1024,
          is_file: true,
          is_directory: false,
          file_count: null,
        },
      ]);

      // Temporarily allow file selection to work
      mockIsTauri.mockReturnValueOnce(true);
      await act(async () => {
        await result.current.selectFiles(['/test/file.txt'], 'Files');
      });

      // Now back to web environment
      mockIsTauri.mockReturnValue(false);
      mockInvoke.mockRejectedValue({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'This feature requires the desktop application',
        recovery_guidance: 'Please use the desktop version of Barqly Vault to access this feature',
        user_actionable: true,
      });

      await act(async () => {
        try {
          await result.current.encryptFiles('test-key');
        } catch (_error) {
          // Expected to fail
        }
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error).toMatchObject({
        code: ErrorCode.INTERNAL_ERROR,
        message: expect.stringContaining('desktop application'),
        recovery_guidance: expect.stringContaining('restart the application'),
        user_actionable: true,
      });
      expect(result.current.success).toBeNull();
    });

    it('should provide clear user guidance in web environment', async () => {
      const { result } = renderHook(() => useFileEncryption());

      await act(async () => {
        try {
          await result.current.selectFiles(['/test/file.txt'], 'Files');
        } catch (_error) {
          // Expected to fail
        }
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error).toMatchObject({
        recovery_guidance: expect.stringContaining('restart the application'),
        user_actionable: true,
        code: ErrorCode.INTERNAL_ERROR,
        message: expect.stringContaining('desktop application'),
      });
    });
  });

  describe('Desktop Environment (Tauri available)', () => {
    beforeEach(() => {
      mockIsTauri.mockReturnValue(true);
      mockSafeListen.mockResolvedValue(() => Promise.resolve());
    });

    it('should work normally in desktop environment', async () => {
      const { result } = renderHook(() => useFileEncryption());

      // Mock successful file info response
      mockInvoke.mockResolvedValueOnce([
        {
          path: '/test/file.txt',
          name: 'file.txt',
          size: 1024,
          is_file: true,
          is_directory: false,
          file_count: null,
        },
      ]);

      await act(async () => {
        await result.current.selectFiles(['/test/file.txt'], 'Files');
      });

      expect(result.current.error).toBeNull();
      expect(result.current.selectedFiles).not.toBeNull();
      expect(result.current.selectedFiles).toMatchObject({
        paths: ['/test/file.txt'],
        selection_type: 'Files',
        file_count: 1,
        total_size: 1024,
      });
    });

    it('should handle Tauri API failures gracefully', async () => {
      const { result } = renderHook(() => useFileEncryption());

      // Mock a Tauri API failure (not an environment issue)
      mockInvoke.mockRejectedValueOnce({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'File not found',
        recovery_guidance:
          'Please try selecting files again. If the problem persists, restart the application.',
        user_actionable: true,
      });

      await act(async () => {
        try {
          await result.current.selectFiles(['/nonexistent/file.txt'], 'Files');
        } catch (_error) {
          // Expected to fail
        }
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error).toMatchObject({
        code: ErrorCode.INTERNAL_ERROR,
        message: expect.stringContaining('File not found'),
        recovery_guidance: expect.stringContaining('restart the application'),
        user_actionable: true,
      });
    });

    it('should successfully encrypt in desktop environment', async () => {
      const { result } = renderHook(() => useFileEncryption());
      const mockEncryptionResult = '/output/encrypted.age';

      // Mock file selection
      mockInvoke.mockResolvedValueOnce([
        {
          path: '/test/file.txt',
          name: 'file.txt',
          size: 1024,
          is_file: true,
          is_directory: false,
          file_count: null,
        },
      ]);

      await act(async () => {
        await result.current.selectFiles(['/test/file.txt'], 'Files');
      });

      // Mock encryption success
      mockInvoke.mockResolvedValueOnce(mockEncryptionResult);

      await act(async () => {
        await result.current.encryptFiles('test-key');
      });

      expect(result.current.error).toBeNull();
      expect(result.current.success).toBe('/output/encrypted.age');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Environment Detection Edge Cases', () => {
    it('should handle undefined environment gracefully', async () => {
      mockIsTauri.mockReturnValue(false);

      mockInvoke.mockRejectedValue({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'This feature requires the desktop application',
        recovery_guidance: 'Please use the desktop version of Barqly Vault to access this feature',
        user_actionable: true,
      });

      const { result } = renderHook(() => useFileEncryption());

      await act(async () => {
        try {
          await result.current.selectFiles(['/test/file.txt'], 'Files');
        } catch (_error) {
          // Expected to fail
        }
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error).toMatchObject({
        code: ErrorCode.INTERNAL_ERROR,
        message: expect.stringContaining('desktop application'),
        recovery_guidance: expect.stringContaining('restart the application'),
        user_actionable: true,
      });
    });

    it('should handle environment change mid-operation', async () => {
      const { result } = renderHook(() => useFileEncryption());

      // Start in desktop environment
      mockIsTauri.mockReturnValue(true);

      // Mock successful file selection
      mockInvoke.mockResolvedValueOnce([
        {
          path: '/test/file.txt',
          name: 'file.txt',
          size: 1024,
          is_file: true,
          is_directory: false,
          file_count: null,
        },
      ]);

      await act(async () => {
        await result.current.selectFiles(['/test/file.txt'], 'Files');
      });

      expect(result.current.selectedFiles).not.toBeNull();
      expect(result.current.selectedFiles).toMatchObject({
        paths: ['/test/file.txt'],
        selection_type: 'Files',
        file_count: 1,
        total_size: 1024,
      });

      // Now simulate environment becoming unavailable
      mockIsTauri.mockReturnValue(false);

      mockInvoke.mockRejectedValue({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'This feature requires the desktop application',
        recovery_guidance: 'Please use the desktop version of Barqly Vault to access this feature',
        user_actionable: true,
      });

      await act(async () => {
        try {
          await result.current.encryptFiles('test-key');
        } catch (_error) {
          // Expected to fail
        }
      });

      // The error message may be transformed, so just check key properties
      expect(result.current.error).not.toBeNull();
      expect(result.current.error).toMatchObject({
        code: ErrorCode.INTERNAL_ERROR,
        user_actionable: true,
      });
      expect(result.current.error?.message).toBeDefined();
      expect(result.current.error?.recovery_guidance).toBeDefined();
      expect(result.current.success).toBeNull();
    });
  });
});
