/**
 * YubiKey Workflow State Machine
 *
 * Manages the complete YubiKey setup and usage workflow with clear states
 * and transitions. This replaces scattered state management with a centralized,
 * predictable state machine.
 */

import { ProtectionMode } from '../lib/api-types';
import { YubiKeyDevice } from './YubiKeyService';

// Workflow States
export type YubiKeyWorkflowState =
  | 'idle' // No YubiKey interaction, user browsing options
  | 'mode_selected' // User selected YubiKey mode, but not committed
  | 'requirements_shown' // Showing YubiKey requirements to user
  | 'hardware_detecting' // Actively detecting YubiKey hardware
  | 'hardware_detected' // Hardware found, showing device selection
  | 'hardware_error' // Hardware detection failed
  | 'device_selected' // User selected specific device
  | 'device_initializing' // Initializing device with PIN/slot
  | 'device_ready' // Device initialized and ready for use
  | 'encryption_ready' // Ready to encrypt with YubiKey
  | 'decryption_ready'; // Ready to decrypt with YubiKey

// Workflow Events
export type YubiKeyWorkflowEvent =
  | { type: 'SELECT_MODE'; mode: ProtectionMode }
  | { type: 'SHOW_REQUIREMENTS' }
  | { type: 'COMMIT_TO_YUBIKEY' }
  | { type: 'DETECTION_STARTED' }
  | { type: 'DETECTION_SUCCESS'; devices: YubiKeyDevice[] }
  | { type: 'DETECTION_FAILED'; error: string }
  | { type: 'SELECT_DEVICE'; device: YubiKeyDevice }
  | { type: 'START_INITIALIZATION'; pin: string; slot: number }
  | { type: 'INITIALIZATION_SUCCESS' }
  | { type: 'INITIALIZATION_FAILED'; error: string }
  | { type: 'READY_FOR_ENCRYPTION' }
  | { type: 'READY_FOR_DECRYPTION' }
  | { type: 'RESET_WORKFLOW' }
  | { type: 'GO_BACK' };

// Workflow Context
export interface YubiKeyWorkflowContext {
  selectedMode: ProtectionMode | null;
  availableDevices: YubiKeyDevice[];
  selectedDevice: YubiKeyDevice | null;
  error: string | null;
  isLoading: boolean;

  // Hardware detection state
  hasAttemptedDetection: boolean;
  detectionError: string | null;

  // Initialization state
  initializationProgress: number;
  initializationStep: string | null;
}

export const initialContext: YubiKeyWorkflowContext = {
  selectedMode: null,
  availableDevices: [],
  selectedDevice: null,
  error: null,
  isLoading: false,
  hasAttemptedDetection: false,
  detectionError: null,
  initializationProgress: 0,
  initializationStep: null,
};

/**
 * State transition function
 * Defines valid state transitions and context updates
 */
export function yubiKeyWorkflowReducer(
  state: YubiKeyWorkflowState,
  context: YubiKeyWorkflowContext,
  event: YubiKeyWorkflowEvent,
): { state: YubiKeyWorkflowState; context: YubiKeyWorkflowContext } {
  switch (state) {
    case 'idle':
      switch (event.type) {
        case 'SELECT_MODE':
          return {
            state: event.mode === ProtectionMode.PASSPHRASE_ONLY ? 'idle' : 'mode_selected',
            context: {
              ...context,
              selectedMode: event.mode,
              error: null,
            },
          };

        default:
          return { state, context };
      }

    case 'mode_selected':
      switch (event.type) {
        case 'SHOW_REQUIREMENTS':
          return {
            state: 'requirements_shown',
            context,
          };

        case 'RESET_WORKFLOW':
          return {
            state: 'idle',
            context: initialContext,
          };

        default:
          return { state, context };
      }

    case 'requirements_shown':
      switch (event.type) {
        case 'COMMIT_TO_YUBIKEY':
          return {
            state: 'hardware_detecting',
            context: {
              ...context,
              isLoading: true,
              error: null,
            },
          };

        case 'GO_BACK':
          return {
            state: 'mode_selected',
            context: { ...context, error: null },
          };

        default:
          return { state, context };
      }

    case 'hardware_detecting':
      switch (event.type) {
        case 'DETECTION_SUCCESS':
          if (event.devices.length === 0) {
            return {
              state: 'hardware_error',
              context: {
                ...context,
                isLoading: false,
                hasAttemptedDetection: true,
                detectionError: 'No YubiKey devices found. Please connect a YubiKey and try again.',
                availableDevices: [],
              },
            };
          }

          return {
            state: 'hardware_detected',
            context: {
              ...context,
              isLoading: false,
              hasAttemptedDetection: true,
              availableDevices: event.devices,
              selectedDevice: event.devices.length === 1 ? event.devices[0] : null,
              detectionError: null,
            },
          };

        case 'DETECTION_FAILED':
          return {
            state: 'hardware_error',
            context: {
              ...context,
              isLoading: false,
              hasAttemptedDetection: true,
              detectionError: event.error,
              availableDevices: [],
            },
          };

        default:
          return { state, context };
      }

    case 'hardware_detected':
      switch (event.type) {
        case 'SELECT_DEVICE':
          return {
            state: 'device_selected',
            context: {
              ...context,
              selectedDevice: event.device,
            },
          };

        case 'GO_BACK':
          return {
            state: 'requirements_shown',
            context: { ...context, error: null },
          };

        default:
          return { state, context };
      }

    case 'hardware_error':
      switch (event.type) {
        case 'COMMIT_TO_YUBIKEY': // Retry detection
          return {
            state: 'hardware_detecting',
            context: {
              ...context,
              isLoading: true,
              error: null,
              detectionError: null,
            },
          };

        case 'GO_BACK':
          return {
            state: 'requirements_shown',
            context: { ...context, error: null, detectionError: null },
          };

        default:
          return { state, context };
      }

    case 'device_selected':
      switch (event.type) {
        case 'START_INITIALIZATION':
          return {
            state: 'device_initializing',
            context: {
              ...context,
              isLoading: true,
              error: null,
              initializationProgress: 0,
              initializationStep: 'Connecting to YubiKey...',
            },
          };

        case 'GO_BACK':
          return {
            state: 'hardware_detected',
            context: { ...context, error: null },
          };

        default:
          return { state, context };
      }

    case 'device_initializing':
      switch (event.type) {
        case 'INITIALIZATION_SUCCESS':
          return {
            state: 'device_ready',
            context: {
              ...context,
              isLoading: false,
              error: null,
              initializationProgress: 100,
              initializationStep: 'Complete',
            },
          };

        case 'INITIALIZATION_FAILED':
          return {
            state: 'device_selected',
            context: {
              ...context,
              isLoading: false,
              error: event.error,
              initializationProgress: 0,
              initializationStep: null,
            },
          };

        default:
          return { state, context };
      }

    case 'device_ready':
      switch (event.type) {
        case 'READY_FOR_ENCRYPTION':
          return {
            state: 'encryption_ready',
            context,
          };

        case 'READY_FOR_DECRYPTION':
          return {
            state: 'decryption_ready',
            context,
          };

        default:
          return { state, context };
      }

    // Terminal states can reset
    case 'encryption_ready':
    case 'decryption_ready':
      switch (event.type) {
        case 'RESET_WORKFLOW':
          return {
            state: 'idle',
            context: initialContext,
          };

        default:
          return { state, context };
      }

    default:
      return { state, context };
  }
}

/**
 * Helper functions for state machine queries
 */
export const YubiKeyWorkflowQueries = {
  canDetectHardware: (state: YubiKeyWorkflowState) =>
    state === 'requirements_shown' || state === 'hardware_error',

  canSelectDevice: (state: YubiKeyWorkflowState) => state === 'hardware_detected',

  canInitializeDevice: (state: YubiKeyWorkflowState) => state === 'device_selected',

  isHardwareReady: (state: YubiKeyWorkflowState) =>
    ['device_ready', 'encryption_ready', 'decryption_ready'].includes(state),

  isLoading: (state: YubiKeyWorkflowState) =>
    ['hardware_detecting', 'device_initializing'].includes(state),

  hasError: (state: YubiKeyWorkflowState) => state === 'hardware_error',

  requiresYubiKey: (context: YubiKeyWorkflowContext) =>
    context.selectedMode === ProtectionMode.YUBIKEY_ONLY ||
    context.selectedMode === ProtectionMode.HYBRID,
};
