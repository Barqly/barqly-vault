/**
 * YubiKey Workflow Hook - Clean Architecture Implementation
 *
 * This hook replaces the scattered useYubiKeySetupWorkflow with a clean,
 * state-machine driven approach. It separates UI state from business logic
 * and provides proper timing for hardware detection.
 */

import { useCallback, useEffect, useReducer } from 'react';
import { ProtectionMode } from '../bindings';
import { yubiKeyService, YubiKeyService, YubiKeyServiceEvent } from '../services/YubiKeyService';
import {
  YubiKeyWorkflowState,
  YubiKeyWorkflowContext,
  YubiKeyWorkflowEvent,
  yubiKeyWorkflowReducer,
  initialContext,
  YubiKeyWorkflowQueries,
} from '../services/YubiKeyWorkflowStateMachine';
import { logger } from '../lib/logger';

export interface UseYubiKeyWorkflowReturn {
  // State
  state: YubiKeyWorkflowState;
  context: YubiKeyWorkflowContext;

  // Computed state
  isLoading: boolean;
  canProceed: boolean;
  requiresHardware: boolean;

  // Actions - these are the ONLY ways to interact with YubiKey functionality
  actions: {
    selectProtectionMode: (mode: ProtectionMode) => void;
    showRequirements: () => void;
    commitToYubiKey: () => void; // This is when hardware detection actually happens
    selectDevice: (device: any) => void;
    startInitialization: (pin: string, slot: number) => void;
    goBack: () => void;
    reset: () => void;
  };
}

export interface UseYubiKeyWorkflowOptions {
  service?: YubiKeyService;
  onStateChange?: (state: YubiKeyWorkflowState, context: YubiKeyWorkflowContext) => void;
  onError?: (error: string) => void;
}

/**
 * Main YubiKey workflow hook - replaces useYubiKeySetupWorkflow
 */
export function useYubiKeyWorkflow(
  options: UseYubiKeyWorkflowOptions = {},
): UseYubiKeyWorkflowReturn {
  const { service = yubiKeyService, onStateChange, onError } = options;

  // State machine
  const [{ state, context }, dispatch] = useReducer(
    (
      current: { state: YubiKeyWorkflowState; context: YubiKeyWorkflowContext },
      event: YubiKeyWorkflowEvent,
    ) => {
      const result = yubiKeyWorkflowReducer(current.state, current.context, event);

      // Log state transitions for debugging
      if (result.state !== current.state) {
        logger.logComponentLifecycle('YubiKeyWorkflow', 'State transition', {
          from: current.state,
          to: result.state,
          event: event.type,
        });
      }

      return result;
    },
    { state: 'idle' as YubiKeyWorkflowState, context: initialContext },
  );

  // Service event handler
  const handleServiceEvent = useCallback((event: YubiKeyServiceEvent) => {
    console.log('📡 YubiKeyWorkflow: Received service event:', event);

    switch (event.type) {
      case 'DETECTION_STARTED':
        console.log('🔍 YubiKeyWorkflow: Detection started event received');
        // State machine handles this via commitToYubiKey action
        break;

      case 'DETECTION_COMPLETED':
        console.log(
          '✅ YubiKeyWorkflow: Detection completed event received, devices:',
          event.devices,
        );
        dispatch({ type: 'DETECTION_SUCCESS', devices: event.devices });
        break;

      case 'DETECTION_FAILED':
        console.error('❌ YubiKeyWorkflow: Detection failed event received, error:', event.error);
        dispatch({ type: 'DETECTION_FAILED', error: event.error });
        break;

      // Handle other service events as needed
      default:
        console.log('📡 YubiKeyWorkflow: Unhandled service event:', event.type);
        break;
    }
  }, []);

  // Subscribe to service events
  useEffect(() => {
    const unsubscribe = service.addEventListener(handleServiceEvent);
    return unsubscribe;
  }, [service, handleServiceEvent]);

  // Notify parent of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(state, context);
    }
  }, [state, context, onStateChange]);

  // Notify parent of errors
  useEffect(() => {
    if (context.error && onError) {
      onError(context.error);
    }
  }, [context.error, onError]);

  // Actions - these are the clean interface for UI components
  const actions = {
    /**
     * Select protection mode - NO hardware detection happens here
     * This is purely UI state management
     */
    selectProtectionMode: useCallback((mode: ProtectionMode) => {
      logger.logComponentLifecycle('YubiKeyWorkflow', 'Protection mode selected', { mode });
      dispatch({ type: 'SELECT_MODE', mode });
    }, []),

    /**
     * Show YubiKey requirements to user before any hardware interaction
     */
    showRequirements: useCallback(() => {
      dispatch({ type: 'SHOW_REQUIREMENTS' });
    }, []),

    /**
     * User commits to using YubiKey - THIS is when hardware detection starts
     * This is the proper timing for hardware detection
     */
    commitToYubiKey: useCallback(async () => {
      console.log('🚀 YubiKeyWorkflow: commitToYubiKey() called - user committed to YubiKey');
      logger.logComponentLifecycle(
        'YubiKeyWorkflow',
        'User committed to YubiKey, starting hardware detection',
      );

      dispatch({ type: 'COMMIT_TO_YUBIKEY' });

      try {
        console.log('🔄 YubiKeyWorkflow: About to call service.detectDevices()...');
        // This is the ONLY place hardware detection is triggered
        await service.detectDevices({ useCache: false });
        console.log('✅ YubiKeyWorkflow: service.detectDevices() completed successfully');
        // Service will emit events that update the state machine
      } catch (error: any) {
        console.error('❌ YubiKeyWorkflow: service.detectDevices() failed:', error);
        // Service already emitted error event, state machine will handle it
        logger.logComponentLifecycle('YubiKeyWorkflow', 'Hardware detection failed', {
          error: error.message,
        });
      }
    }, [service]),

    /**
     * Select specific YubiKey device
     */
    selectDevice: useCallback((device: any) => {
      dispatch({ type: 'SELECT_DEVICE', device });
    }, []),

    /**
     * Start device initialization with PIN and slot
     */
    startInitialization: useCallback(
      async (pin: string, slot: number) => {
        if (!context.selectedDevice) {
          logger.logComponentLifecycle('YubiKeyWorkflow', 'Cannot initialize: no device selected');
          return;
        }

        dispatch({ type: 'START_INITIALIZATION', pin, slot });

        try {
          await service.initializeDevice(context.selectedDevice.device_id, pin, slot);
          dispatch({ type: 'INITIALIZATION_SUCCESS' });
        } catch (error: any) {
          dispatch({ type: 'INITIALIZATION_FAILED', error: error.message });
        }
      },
      [service, context.selectedDevice],
    ),

    /**
     * Go back to previous step
     */
    goBack: useCallback(() => {
      dispatch({ type: 'GO_BACK' });
    }, []),

    /**
     * Reset entire workflow to initial state
     */
    reset: useCallback(() => {
      dispatch({ type: 'RESET_WORKFLOW' });
      service.clearCache(); // Clear any cached hardware detection
    }, [service]),
  };

  // Computed state
  const isLoading = YubiKeyWorkflowQueries.isLoading(state) || context.isLoading;
  const canProceed = YubiKeyWorkflowQueries.isHardwareReady(state);
  const requiresHardware = YubiKeyWorkflowQueries.requiresYubiKey(context);

  return {
    state,
    context,
    isLoading,
    canProceed,
    requiresHardware,
    actions,
  };
}

/**
 * Hook for getting YubiKey service instance
 * Useful for components that need direct service access
 */
export function useYubiKeyService(): YubiKeyService {
  return yubiKeyService;
}
