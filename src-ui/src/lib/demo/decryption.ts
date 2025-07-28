/**
 * Demo utilities for file decryption
 *
 * Provides mock data and simulated behaviors for demo/browser environments
 */

import { DecryptionResult, ProgressUpdate } from '../api-types';

/**
 * Mock encrypted file path for demo
 */
export const MOCK_ENCRYPTED_FILE = '/Users/demo/Documents/bitcoin-backup-encrypted.age';

/**
 * Mock decryption result for demo
 */
export const MOCK_DECRYPTION_RESULT: DecryptionResult = {
  extracted_files: [
    '/Users/demo/Documents/bitcoin-wallet.dat',
    '/Users/demo/Documents/seed-phrase.txt',
    '/Users/demo/Documents/private-key.png',
    '/Users/demo/Documents/manifest.json',
  ],
  output_dir: '/Users/demo/Documents',
  manifest_verified: true,
};

/**
 * Progress steps for simulating decryption
 */
export const DECRYPTION_PROGRESS_STEPS = [
  { progress: 0.1, message: 'Loading encrypted file...' },
  { progress: 0.2, message: 'Validating key and passphrase...' },
  { progress: 0.4, message: 'Decrypting data...' },
  { progress: 0.6, message: 'Extracting archive...' },
  { progress: 0.8, message: 'Verifying file integrity...' },
  { progress: 1.0, message: 'Decryption completed!' },
];

/**
 * Simulate file selection delay
 */
export const DEMO_FILE_SELECTION_DELAY = 1000;

/**
 * Simulate progress step delay
 */
export const DEMO_PROGRESS_STEP_DELAY = 700;

/**
 * Create a progress update for demo
 */
export const createDemoProgressUpdate = (
  progress: number,
  message: string,
  operationId = 'mock-decryption',
): ProgressUpdate => ({
  operation_id: operationId,
  progress,
  message,
  timestamp: new Date().toISOString(),
});

/**
 * Simulate decryption progress with state updates
 */
export const simulateDecryptionProgress = async (
  onProgress: (update: ProgressUpdate) => void,
): Promise<void> => {
  for (const step of DECRYPTION_PROGRESS_STEPS) {
    onProgress(createDemoProgressUpdate(step.progress, step.message));
    await new Promise((resolve) => setTimeout(resolve, DEMO_PROGRESS_STEP_DELAY));
  }
};
