import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProgressTracking } from '../../hooks/useProgressTracking';
import { ProgressUpdate } from '../../lib/api-types';

// Mock the Tauri API
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(),
}));

const mockListen = vi.mocked(await import('@tauri-apps/api/event')).listen;

describe('useProgressTracking (4.2.3.4)', () => {
  const MOCK_OPERATION_ID = 'test-op-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockListen.mockResolvedValue(() => Promise.resolve());
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useProgressTracking('test-event'));

      expect(result.current.progress).toBe(null);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.startTracking).toBe('function');
      expect(typeof result.current.stopTracking).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('Tracking Lifecycle', () => {
    it('should start tracking and listen for events', async () => {
      const { result } = renderHook(() => useProgressTracking('test-event'));

      await act(async () => {
        await result.current.startTracking(MOCK_OPERATION_ID);
      });

      expect(mockListen).toHaveBeenCalledWith('test-event', expect.any(Function));
    });

    it('should stop tracking and unlisten from events', async () => {
      const mockUnlisten = vi.fn();
      mockListen.mockResolvedValue(mockUnlisten);

      const { result } = renderHook(() => useProgressTracking('test-event'));

      await act(async () => {
        await result.current.startTracking(MOCK_OPERATION_ID);
      });

      act(() => {
        result.current.stopTracking();
      });

      expect(mockUnlisten).toHaveBeenCalled();
    });

    it('should handle multiple start calls gracefully', async () => {
      const mockUnlisten = vi.fn();
      mockListen.mockResolvedValue(mockUnlisten);

      const { result } = renderHook(() => useProgressTracking('test-event'));

      // First call to startTracking
      await act(async () => {
        await result.current.startTracking(MOCK_OPERATION_ID);
      });

      // Second call should not create another listener
      await act(async () => {
        await result.current.startTracking(MOCK_OPERATION_ID);
      });

      expect(mockListen).toHaveBeenCalledTimes(1);
      expect(mockUnlisten).not.toHaveBeenCalled();
    });

    it('should handle stop calls without starting', () => {
      const { result } = renderHook(() => useProgressTracking('test-event'));
      const mockUnlisten = vi.fn();
      mockListen.mockResolvedValue(mockUnlisten);

      act(() => {
        result.current.stopTracking();
      });

      expect(mockUnlisten).not.toHaveBeenCalled();
    });
  });

  describe('Progress Updates', () => {
    it('should update progress on receiving a valid event', async () => {
      const { result } = renderHook(() => useProgressTracking('test-event'));
      let progressCallback: (event: { payload: ProgressUpdate }) => void;

      mockListen.mockImplementationOnce((_event, callback) => {
        progressCallback = (event: { payload: ProgressUpdate }) =>
          callback({ event: 'test-event', id: 1, payload: event.payload });
        return Promise.resolve(() => {});
      });

      await act(async () => {
        await result.current.startTracking(MOCK_OPERATION_ID);
      });

      const progressUpdate: ProgressUpdate = {
        operation_id: MOCK_OPERATION_ID,
        progress: 0.5,
        message: 'Halfway there',
        timestamp: new Date().toISOString(),
      };

      act(() => {
        progressCallback({ payload: progressUpdate });
      });

      expect(result.current.progress).toEqual(progressUpdate);
    });

    it('should ignore events for different operations', async () => {
      const { result } = renderHook(() => useProgressTracking('test-event'));
      let progressCallback: (event: { payload: ProgressUpdate }) => void;

      mockListen.mockImplementationOnce((_event, callback) => {
        progressCallback = (event: { payload: any }) =>
          callback({ event: 'test-event', id: 1, payload: event.payload });
        return Promise.resolve(() => {});
      });

      await act(async () => {
        await result.current.startTracking(MOCK_OPERATION_ID);
      });

      const progressUpdate: ProgressUpdate = {
        operation_id: 'different-op-id',
        progress: 0.5,
        message: 'Halfway there',
        timestamp: new Date().toISOString(),
      };

      act(() => {
        progressCallback({ payload: progressUpdate });
      });

      expect(result.current.progress).toBe(null);
    });

    it('should filter events if a custom filter is provided', async () => {
      const filter = (payload: ProgressUpdate) => payload.progress > 0.5;
      const { result } = renderHook(() => useProgressTracking('test-event', filter));
      let progressCallback: (event: { payload: ProgressUpdate }) => void;

      mockListen.mockImplementationOnce((_event, callback) => {
        progressCallback = (event: { payload: any }) =>
          callback({ event: 'test-event', id: 1, payload: event.payload });
        return Promise.resolve(() => {});
      });

      await act(async () => {
        await result.current.startTracking(MOCK_OPERATION_ID);
      });

      const ignoredUpdate: ProgressUpdate = {
        operation_id: MOCK_OPERATION_ID,
        progress: 0.3,
        message: 'Making progress',
        timestamp: new Date().toISOString(),
      };
      const acceptedUpdate: ProgressUpdate = {
        operation_id: MOCK_OPERATION_ID,
        progress: 0.7,
        message: 'Almost there',
        timestamp: new Date().toISOString(),
      };

      act(() => {
        progressCallback({ payload: ignoredUpdate });
      });
      expect(result.current.progress).toBe(null);

      act(() => {
        progressCallback({ payload: acceptedUpdate });
      });
      expect(result.current.progress).toEqual(acceptedUpdate);
    });
  });

  describe('State Reset', () => {
    it('should reset state to initial values', async () => {
      const { result } = renderHook(() => useProgressTracking('test-event'));
      let progressCallback: (event: { payload: ProgressUpdate }) => void;

      mockListen.mockImplementationOnce((_event, callback) => {
        progressCallback = (event: { payload: any }) =>
          callback({ event: 'test-event', id: 1, payload: event.payload });
        return Promise.resolve(() => {});
      });

      await act(async () => {
        await result.current.startTracking(MOCK_OPERATION_ID);
      });

      const progressUpdate: ProgressUpdate = {
        operation_id: MOCK_OPERATION_ID,
        progress: 0.5,
        message: 'Halfway there',
        timestamp: new Date().toISOString(),
      };

      act(() => {
        progressCallback({ payload: progressUpdate });
      });

      expect(result.current.progress).not.toBe(null);

      act(() => {
        result.current.reset();
      });

      expect(result.current.progress).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should stop tracking on reset', async () => {
      const mockUnlisten = vi.fn();
      mockListen.mockResolvedValue(mockUnlisten);

      const { result } = renderHook(() => useProgressTracking('test-event'));

      await act(async () => {
        await result.current.startTracking(MOCK_OPERATION_ID);
      });

      act(() => {
        result.current.reset();
      });

      expect(mockUnlisten).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors during event listening setup', async () => {
      const setupError = new Error('Failed to set up listener');
      mockListen.mockRejectedValue(setupError);

      const { result } = renderHook(() => useProgressTracking('test-event'));

      await act(async () => {
        await result.current.startTracking(MOCK_OPERATION_ID);
      });

      expect(result.current.error).toBe(
        'Failed to set up progress listener: Failed to set up listener',
      );
    });

    it('should clear error on reset', async () => {
      const setupError = new Error('Failed to set up listener');
      mockListen.mockRejectedValue(setupError);

      const { result } = renderHook(() => useProgressTracking('test-event'));

      await act(async () => {
        await result.current.startTracking(MOCK_OPERATION_ID);
      });

      expect(result.current.error).not.toBe(null);

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBe(null);
    });
  });
});
