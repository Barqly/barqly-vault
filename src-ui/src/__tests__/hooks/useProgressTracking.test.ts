import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProgressTracking, useAutoProgressTracking } from '../../hooks/useProgressTracking';
import { ProgressUpdate, CommandError } from '../../lib/api-types';

// Mock the Tauri API
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useProgressTracking (4.2.3.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useProgressTracking());

      expect(result.current.isActive).toBe(false);
      expect(result.current.progress).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.startTime).toBe(null);
      expect(result.current.endTime).toBe(null);
      expect(typeof result.current.startTracking).toBe('function');
      expect(typeof result.current.stopTracking).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('Progress Tracking', () => {
    it('should start tracking successfully', async () => {
      const { result } = renderHook(() => useProgressTracking());

      await act(async () => {
        await result.current.startTracking('test-operation-123');
      });

      expect(result.current.isActive).toBe(true);
      expect(result.current.startTime).toBeInstanceOf(Date);
      expect(result.current.endTime).toBe(null);
      expect(result.current.progress).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.isComplete).toBe(false);
    });

    it('should handle progress updates', async () => {
      const { result } = renderHook(() => useProgressTracking());

      let progressCallback: (event: { payload: ProgressUpdate }) => void;
      mockListen.mockImplementationOnce((event, callback) => {
        progressCallback = callback;
        return Promise.resolve(() => Promise.resolve());
      });

      await act(async () => {
        await result.current.startTracking('test-operation-123');
      });

      // Simulate progress update
      await act(async () => {
        progressCallback!({
          payload: {
            operation_id: 'test-operation-123',
            progress: 0.5,
            message: 'Processing...',
            timestamp: new Date().toISOString(),
          },
        });
      });

      expect(result.current.progress).toEqual({
        operation_id: 'test-operation-123',
        progress: 0.5,
        message: 'Processing...',
        timestamp: expect.any(String),
      });
      expect(result.current.isComplete).toBe(false);
    });

    it('should detect completion when progress reaches 1.0', async () => {
      const { result } = renderHook(() => useProgressTracking());

      let progressCallback: (event: { payload: ProgressUpdate }) => void;
      mockListen.mockImplementationOnce((event, callback) => {
        progressCallback = callback;
        return Promise.resolve(() => Promise.resolve());
      });

      await act(async () => {
        await result.current.startTracking('test-operation-123');
      });

      // Simulate completion
      await act(async () => {
        progressCallback!({
          payload: {
            operation_id: 'test-operation-123',
            progress: 1.0,
            message: 'Complete',
            timestamp: new Date().toISOString(),
          },
        });
      });

      expect(result.current.progress).toEqual({
        operation_id: 'test-operation-123',
        progress: 1.0,
        message: 'Complete',
        timestamp: expect.any(String),
      });
      expect(result.current.isComplete).toBe(true);
      expect(result.current.isActive).toBe(false);
      expect(result.current.endTime).toBeInstanceOf(Date);
    });

    it('should handle error events', async () => {
      const { result } = renderHook(() => useProgressTracking());

      let progressCallback: (event: { payload: ProgressUpdate }) => void;
      let errorCallback: (event: { payload: CommandError }) => void;

      mockListen.mockImplementation((event, callback) => {
        if (event === 'progress') {
          progressCallback = callback;
        } else if (event === 'operation-error') {
          errorCallback = callback;
        }
        return Promise.resolve(() => Promise.resolve());
      });

      await act(async () => {
        await result.current.startTracking('test-operation-123');
      });

      // Simulate error
      await act(async () => {
        errorCallback!({
          payload: {
            code: 'INTERNAL_ERROR',
            message: 'Operation failed',
            recovery_guidance: 'Please try again',
            user_actionable: true,
            trace_id: 'test-operation-123',
          },
        });
      });

      expect(result.current.error).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'Operation failed',
        recovery_guidance: 'Please try again',
        user_actionable: true,
        trace_id: 'test-operation-123',
      });
      expect(result.current.isActive).toBe(false);
      expect(result.current.endTime).toBeInstanceOf(Date);
    });

    it('should handle tracking start errors', async () => {
      const { result } = renderHook(() => useProgressTracking());

      mockListen.mockRejectedValueOnce(new Error('Failed to start tracking'));

      await act(async () => {
        await result.current.startTracking('test-operation-123');
      });

      expect(result.current.error).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'Failed to start progress tracking',
        recovery_guidance: 'Please try again',
        user_actionable: true,
      });
      expect(result.current.isActive).toBe(false);
      expect(result.current.endTime).toBeInstanceOf(Date);
    });
  });

  describe('State Management', () => {
    it('should stop tracking correctly', async () => {
      const { result } = renderHook(() => useProgressTracking());

      await act(async () => {
        await result.current.startTracking('test-operation-123');
      });

      act(() => {
        result.current.stopTracking();
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.endTime).toBeInstanceOf(Date);
    });

    it('should reset state correctly', async () => {
      const { result } = renderHook(() => useProgressTracking());

      // Start tracking first
      await act(async () => {
        await result.current.startTracking('test-operation-123');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.progress).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.startTime).toBe(null);
      expect(result.current.endTime).toBe(null);
    });

    it('should clear error correctly', async () => {
      const { result } = renderHook(() => useProgressTracking());

      // Create an error first
      mockListen.mockRejectedValueOnce(new Error('Failed to start tracking'));

      await act(async () => {
        await result.current.startTracking('test-operation-123');
      });

      expect(result.current.error).not.toBe(null);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Auto-completion', () => {
    it('should auto-stop when operation completes', async () => {
      const { result } = renderHook(() => useProgressTracking());

      let progressCallback: (event: { payload: ProgressUpdate }) => void;
      mockListen.mockImplementationOnce((event, callback) => {
        progressCallback = callback;
        return Promise.resolve(() => Promise.resolve());
      });

      await act(async () => {
        await result.current.startTracking('test-operation-123');
      });

      // Simulate completion
      await act(async () => {
        progressCallback!({
          payload: {
            operation_id: 'test-operation-123',
            progress: 1.0,
            message: 'Complete',
            timestamp: new Date().toISOString(),
          },
        });
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.isComplete).toBe(true);
      expect(result.current.endTime).toBeInstanceOf(Date);
    });

    it('should auto-stop when error occurs', async () => {
      const { result } = renderHook(() => useProgressTracking());

      let errorCallback: (event: { payload: CommandError }) => void;
      mockListen.mockImplementation((event, callback) => {
        if (event === 'progress') {
          return Promise.resolve(() => Promise.resolve());
        } else if (event === 'operation-error') {
          errorCallback = callback;
          return Promise.resolve(() => Promise.resolve());
        }
        return Promise.resolve(() => Promise.resolve());
      });

      await act(async () => {
        await result.current.startTracking('test-operation-123');
      });

      // Simulate error
      await act(async () => {
        if (errorCallback) {
          errorCallback({
            payload: {
              code: 'INTERNAL_ERROR',
              message: 'Operation failed',
              recovery_guidance: 'Please try again',
              user_actionable: true,
              trace_id: 'test-operation-123',
            },
          });
        }
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.error).not.toBe(null);
      expect(result.current.endTime).toBeInstanceOf(Date);
    });
  });
});

describe('useAutoProgressTracking (4.2.3.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAutoProgressTracking());

      expect(result.current.isActive).toBe(false);
      expect(result.current.progress).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.startTime).toBe(null);
      expect(result.current.endTime).toBe(null);
      expect(result.current.operationId).toBe(null);
      expect(typeof result.current.startAutoTracking).toBe('function');
      expect(typeof result.current.stopTracking).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('Auto Progress Tracking', () => {
    it('should generate operation ID and start tracking', async () => {
      const { result } = renderHook(() => useAutoProgressTracking());

      await act(async () => {
        await result.current.startAutoTracking();
      });

      expect(result.current.operationId).toMatch(/^op_\d+_[a-z0-9]+$/);
      expect(result.current.isActive).toBe(true);
      expect(result.current.startTime).toBeInstanceOf(Date);
    });

    it('should reset operation ID when resetting', async () => {
      const { result } = renderHook(() => useAutoProgressTracking());

      await act(async () => {
        await result.current.startAutoTracking();
      });

      expect(result.current.operationId).not.toBe(null);

      act(() => {
        result.current.reset();
      });

      expect(result.current.operationId).toBe(null);
      expect(result.current.isActive).toBe(false);
      expect(result.current.progress).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should handle progress updates with auto-generated operation ID', async () => {
      const { result } = renderHook(() => useAutoProgressTracking());

      let progressCallback: (event: { payload: ProgressUpdate }) => void;
      mockListen.mockImplementationOnce((event, callback) => {
        progressCallback = callback;
        return Promise.resolve(() => Promise.resolve());
      });

      await act(async () => {
        await result.current.startAutoTracking();
      });

      const operationId = result.current.operationId;

      // Simulate progress update
      await act(async () => {
        progressCallback!({
          payload: {
            operation_id: operationId!,
            progress: 0.5,
            message: 'Processing...',
            timestamp: new Date().toISOString(),
          },
        });
      });

      expect(result.current.progress).toEqual({
        operation_id: operationId,
        progress: 0.5,
        message: 'Processing...',
        timestamp: expect.any(String),
      });
    });

    it('should handle completion with auto-generated operation ID', async () => {
      const { result } = renderHook(() => useAutoProgressTracking());

      let progressCallback: (event: { payload: ProgressUpdate }) => void;
      mockListen.mockImplementationOnce((event, callback) => {
        progressCallback = callback;
        return Promise.resolve(() => Promise.resolve());
      });

      await act(async () => {
        await result.current.startAutoTracking();
      });

      const operationId = result.current.operationId;

      // Simulate completion
      await act(async () => {
        progressCallback!({
          payload: {
            operation_id: operationId!,
            progress: 1.0,
            message: 'Complete',
            timestamp: new Date().toISOString(),
          },
        });
      });

      expect(result.current.isComplete).toBe(true);
      expect(result.current.isActive).toBe(false);
      expect(result.current.endTime).toBeInstanceOf(Date);
    });
  });
});
