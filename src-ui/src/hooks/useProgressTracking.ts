import { useState, useCallback } from 'react';
import { safeListen } from '../lib/tauri-safe';
import { ProgressUpdate } from '../lib/api-types';

export interface ProgressTrackingState {
  progress: ProgressUpdate | null;
  error: string | null;
}

export interface ProgressTrackingActions {
  startTracking: (operationId: string) => Promise<void>;
  stopTracking: () => void;
  reset: () => void;
}

export interface UseProgressTrackingReturn extends ProgressTrackingState, ProgressTrackingActions {}

/**
 * Hook for tracking progress of long-running operations.
 *
 * @param eventName The name of the Tauri event to listen for.
 * @param filter Optional function to filter incoming progress events.
 */
export const useProgressTracking = (
  eventName: string,
  filter?: (payload: ProgressUpdate) => boolean,
): UseProgressTrackingReturn => {
  const [state, setState] = useState<ProgressTrackingState>({
    progress: null,
    error: null,
  });
  const [unlisten, setUnlisten] = useState<(() => void) | null>(null);

  const startTracking = useCallback(
    async (operationId: string) => {
      if (unlisten) {
        return; // Already listening
      }

      try {
        const unsubscribe = await safeListen<ProgressUpdate>(eventName, (event) => {
          if (event.payload.operation_id === operationId) {
            if (!filter || filter(event.payload)) {
              setState((prev) => ({ ...prev, progress: event.payload }));
            }
          }
        });

        setUnlisten(() => unsubscribe);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setState((prev) => ({
          ...prev,
          error: `Failed to set up progress listener: ${errorMessage}`,
        }));
      }
    },
    [eventName, filter, unlisten],
  );

  const stopTracking = useCallback(() => {
    if (unlisten) {
      unlisten();
      setUnlisten(null);
    }
  }, [unlisten]);

  const reset = useCallback(() => {
    stopTracking();
    setState({
      progress: null,
      error: null,
    });
  }, [stopTracking]);

  return {
    ...state,
    startTracking,
    stopTracking,
    reset,
  };
};

/**
 * Hook for tracking progress with automatic operation ID management
 *
 * This variant automatically generates operation IDs and manages
 * the tracking lifecycle for common operations.
 */
export const useAutoProgressTracking = () => {
  const [operationId, setOperationId] = useState<string | null>(null);
  const progressTracking = useProgressTracking('auto-progress');

  const startAutoTracking = useCallback(() => {
    const newOperationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setOperationId(newOperationId);
    return progressTracking.startTracking(newOperationId);
  }, [progressTracking]);

  const resetAuto = useCallback(() => {
    setOperationId(null);
    progressTracking.reset();
  }, [progressTracking]);

  return {
    ...progressTracking,
    operationId,
    startAutoTracking,
    reset: resetAuto,
  };
};
