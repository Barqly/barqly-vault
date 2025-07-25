import { useState, useCallback, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { ProgressUpdate, CommandError } from '../lib/api-types';

// Check if we're in a browser environment (not Tauri desktop)
// In test environment, we should use the real Tauri commands
const isBrowser =
  typeof window !== 'undefined' && !(window as any).__TAURI__ && typeof process === 'undefined';

export interface ProgressTrackingState {
  isLoading: boolean;
  error: CommandError | null;
  progress: ProgressUpdate | null;
  isActive: boolean;
  isComplete: boolean;
  startTime: Date | null;
  endTime: Date | null;
}

export interface ProgressTrackingActions {
  startTracking: (operationId: string) => Promise<void>;
  stopTracking: () => void;
  reset: () => void;
  clearError: () => void;
}

export interface UseProgressTrackingReturn extends ProgressTrackingState, ProgressTrackingActions {}

/**
 * Hook for tracking progress of long-running operations
 *
 * Provides a clean interface for monitoring progress with:
 * - Real-time progress updates
 * - Error handling
 * - Automatic cleanup
 * - Operation timing and completion tracking
 */
export const useProgressTracking = (): UseProgressTrackingReturn => {
  const [state, setState] = useState<ProgressTrackingState>({
    isLoading: false,
    error: null,
    progress: null,
    isActive: false,
    isComplete: false,
    startTime: null,
    endTime: null,
  });

  const startTracking = useCallback(async (_operationId: string): Promise<void> => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      progress: null,
      isActive: true,
      isComplete: false,
      startTime: new Date(),
      endTime: null,
    }));

    try {
      // Create a progress listener
      const unlisten = await listen<ProgressUpdate>('progress', (event) => {
        const isComplete = event.payload.progress >= 1.0;
        setState((prev) => ({
          ...prev,
          progress: event.payload,
          isComplete,
          isActive: !isComplete,
          endTime: isComplete ? new Date() : prev.endTime,
        }));
      });

      // Create an error listener
      const errorUnlisten = await listen<CommandError>('operation-error', (event) => {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: event.payload,
          progress: null,
          isActive: false,
          endTime: new Date(),
        }));
      });

      // Set up cleanup on unmount
      return () => {
        unlisten();
        errorUnlisten();
      };
    } catch (error) {
      // Handle different types of errors
      let commandError: CommandError;

      if (error && typeof error === 'object' && 'code' in error) {
        // This is already a CommandError
        commandError = error as CommandError;
      } else {
        // Convert generic errors to CommandError
        commandError = {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to start progress tracking',
          recovery_guidance: 'Please try again. If the problem persists, restart the application.',
          user_actionable: true,
        };
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: commandError,
        progress: null,
        isActive: false,
        endTime: new Date(),
      }));

      // Re-throw for components that need to handle errors
      throw commandError;
    }
  }, []);

  const stopTracking = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isLoading: false,
      progress: null,
      isActive: false,
      endTime: prev.endTime || new Date(),
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      progress: null,
      isActive: false,
      isComplete: false,
      startTime: null,
      endTime: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
    reset,
    clearError,
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
  const progressTracking = useProgressTracking();

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
