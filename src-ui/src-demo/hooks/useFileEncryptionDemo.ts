/**
 * Demo wrapper for useFileEncryption hook
 *
 * Provides mock functionality for browser demos
 * without polluting the production hook
 */

import { useState, useCallback } from 'react';
import { FileEncryptionState, UseFileEncryptionReturn } from '../../src/hooks/useFileEncryption';
import { FileSelection, ProgressUpdate } from '../../src/lib/api-types';
import { MOCK_FILE_PATHS, DEMO_DELAYS } from '../data/mock-data';

/**
 * Demo version of useFileEncryption hook
 * Simulates file encryption workflow for browser demos
 */
export const useFileEncryptionDemo = (): UseFileEncryptionReturn => {
  const [state, setState] = useState<FileEncryptionState>({
    isLoading: false,
    error: null,
    success: null,
    progress: null,
    selectedFiles: null,
  });

  const selectFiles = useCallback(async (selectionType: 'Files' | 'Folder'): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    // Simulate file selection delay
    await new Promise((resolve) => setTimeout(resolve, DEMO_DELAYS.fileSelection));

    const mockSelection: FileSelection = {
      paths:
        selectionType === 'Files'
          ? MOCK_FILE_PATHS.toEncrypt
          : ['/Users/demo/Documents/BitcoinBackup'],
      total_size: selectionType === 'Files' ? 1048576 : 5242880,
      file_count: selectionType === 'Files' ? 3 : 12,
      selection_type: selectionType,
    };

    setState((prev) => ({
      ...prev,
      isLoading: false,
      selectedFiles: mockSelection,
    }));
  }, []);

  const encryptFiles = useCallback(async (_keyId: string, outputName?: string): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null, success: null }));

    // Simulate encryption progress
    const progressSteps = [
      { progress: 0.1, message: 'Preparing files...' },
      { progress: 0.3, message: 'Creating archive...' },
      { progress: 0.6, message: 'Encrypting data...' },
      { progress: 0.9, message: 'Finalizing...' },
      { progress: 1.0, message: 'Encryption complete!' },
    ];

    for (const step of progressSteps) {
      const update: ProgressUpdate = {
        operation_id: 'demo-encryption',
        progress: step.progress,
        message: step.message,
        timestamp: new Date().toISOString(),
      };

      setState((prev) => ({ ...prev, progress: update }));
      await new Promise((resolve) => setTimeout(resolve, DEMO_DELAYS.progressStep));
    }

    const outputPath = outputName
      ? `/Users/demo/Documents/${outputName}.age`
      : `/Users/demo/Documents/encrypted-${Date.now()}.age`;

    setState((prev) => ({
      ...prev,
      isLoading: false,
      success: outputPath,
      progress: null,
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      success: null,
      progress: null,
      selectedFiles: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const clearSelection = useCallback(() => {
    setState((prev) => ({ ...prev, selectedFiles: null }));
  }, []);

  return {
    ...state,
    selectFiles,
    encryptFiles,
    reset,
    clearError,
    clearSelection,
  };
};
