/**
 * Standardized Tauri API mocking utilities for tests
 *
 * This module provides consistent mocking patterns for all Tauri-related tests,
 * ensuring uniform behavior across the test suite.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';
import type { UnlistenFn } from '@tauri-apps/api/event';
import type { ProgressUpdate } from '../../lib/api-types';

/**
 * Mock implementations for tauri-safe module
 */
export interface TauriSafeMocks {
  safeInvoke: Mock;
  safeListen: Mock;
  safeInvokeCommand: Mock;
}

/**
 * Creates standardized mocks for the tauri-safe module
 */
export function createTauriSafeMocks(): TauriSafeMocks {
  return {
    safeInvoke: vi.fn(),
    safeListen: vi.fn().mockResolvedValue(() => Promise.resolve()),
    safeInvokeCommand: vi.fn(),
  };
}

/**
 * Sets up tauri-safe module mocks with the provided implementations
 */
export function setupTauriSafeMocks(mocks: TauriSafeMocks) {
  vi.mock('../../lib/tauri-safe', () => ({
    safeInvoke: mocks.safeInvoke,
    safeListen: mocks.safeListen,
    safeInvokeCommand: mocks.safeInvokeCommand,
  }));
}

/**
 * Mock implementations for Tauri environment detection
 */
export interface TauriEnvironmentMocks {
  isTauri: Mock;
  isWeb: Mock;
}

/**
 * Creates mocks for environment detection
 */
export function createEnvironmentMocks(isTauriEnv: boolean = true): TauriEnvironmentMocks {
  return {
    isTauri: vi.fn().mockReturnValue(isTauriEnv),
    isWeb: vi.fn().mockReturnValue(!isTauriEnv),
  };
}

/**
 * Sets up environment module mocks
 */
export function setupEnvironmentMocks(mocks: TauriEnvironmentMocks) {
  vi.mock('../../lib/environment/platform', () => ({
    isTauri: mocks.isTauri,
    isWeb: mocks.isWeb,
  }));
}

/**
 * Helper to simulate progress updates for async operations
 */
export function createProgressSimulator(
  mockSafeListen: Mock,
  _progressUpdates: Partial<ProgressUpdate>[] = [],
) {
  let progressCallbacks: Map<string, (event: any) => void> = new Map();

  // Setup listen mock to capture callbacks
  mockSafeListen.mockImplementation(async (event: string, callback: (event: any) => void) => {
    progressCallbacks.set(event, callback);
    const unlisten: UnlistenFn = () => {
      progressCallbacks.delete(event);
      return Promise.resolve();
    };
    return unlisten;
  });

  return {
    /**
     * Simulates progress updates for a specific event
     */
    simulateProgress(event: string, updates: Partial<ProgressUpdate>[]) {
      const callback = progressCallbacks.get(event);
      if (callback) {
        updates.forEach((update) => {
          const fullUpdate: ProgressUpdate = {
            operation_id: update.operation_id || 'test-op-123',
            progress: update.progress ?? 0,
            message: update.message || 'Processing...',
            timestamp: update.timestamp || new Date().toISOString(),
          };
          callback({ payload: fullUpdate });
        });
      }
    },

    /**
     * Simulates a complete progress sequence from 0 to 1
     */
    simulateCompleteProgress(event: string, operationId: string = 'test-op-123') {
      this.simulateProgress(event, [
        { operation_id: operationId, progress: 0, message: 'Starting...' },
        { operation_id: operationId, progress: 0.5, message: 'Processing...' },
        { operation_id: operationId, progress: 1, message: 'Complete!' },
      ]);
    },

    /**
     * Gets the callback for a specific event (for manual simulation)
     */
    getCallback(event: string) {
      return progressCallbacks.get(event);
    },

    /**
     * Clears all registered callbacks
     */
    clear() {
      progressCallbacks.clear();
    },
  };
}

/**
 * Standard mock responses for common Tauri commands
 */
export const MOCK_RESPONSES = {
  // File selection responses
  fileSelection: {
    single: {
      paths: ['/test/file.txt'],
      total_size: 1024,
      file_count: 1,
      selection_type: 'Files' as const,
    },
    multiple: {
      paths: ['/test/file1.txt', '/test/file2.txt', '/test/file3.txt'],
      total_size: 3072,
      file_count: 3,
      selection_type: 'Files' as const,
    },
    folder: {
      paths: ['/test/folder'],
      total_size: 10240,
      file_count: 10,
      selection_type: 'Folder' as const,
    },
  },

  // File info responses
  fileInfo: {
    single: [
      {
        path: '/test/file.txt',
        name: 'file.txt',
        size: 1024,
        is_file: true,
        is_directory: false,
        file_count: null,
      },
    ],
    folder: [
      {
        path: '/test/folder',
        name: 'folder',
        size: 10240,
        is_file: false,
        is_directory: true,
        file_count: 10,
      },
    ],
  },

  // Encryption/Decryption results
  encryptionResult: '/output/encrypted.age',

  decryptionResult: {
    extracted_files: ['/output/file1.txt', '/output/file2.txt'],
    output_dir: '/output',
    manifest_verified: true,
  },

  // Key generation result
  keyGenerationResult: {
    key_id: 'test-key-123',
    public_key: 'age1testkey123456789',
    saved_path: '/path/to/key',
  },

  // Key list
  keyList: [
    {
      label: 'test-key-1',
      public_key: 'age1key1...',
      created: '2024-01-15T00:00:00Z',
    },
    {
      label: 'test-key-2',
      public_key: 'age1key2...',
      created: '2024-01-16T00:00:00Z',
    },
  ],
};

/**
 * Creates a standard test environment for Tauri-dependent tests
 */
export function createTauriTestEnvironment(
  options: {
    isTauriEnv?: boolean;
    includeProgressSimulation?: boolean;
  } = {},
) {
  const { isTauriEnv = true, includeProgressSimulation = false } = options;

  const tauriMocks = createTauriSafeMocks();
  const envMocks = createEnvironmentMocks(isTauriEnv);

  setupTauriSafeMocks(tauriMocks);
  setupEnvironmentMocks(envMocks);

  const result: any = {
    mocks: {
      ...tauriMocks,
      ...envMocks,
    },
    responses: MOCK_RESPONSES,
  };

  if (includeProgressSimulation) {
    result.progressSimulator = createProgressSimulator(tauriMocks.safeListen);
  }

  return result;
}

/**
 * Resets all Tauri-related mocks
 */
export function resetTauriMocks() {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
}
