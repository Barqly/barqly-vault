import { useCallback, useRef } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { FileSelectionMode, FileSelectionType } from '../types/file-types';
import { logger } from '../lib/logger';

interface UseFileBrowserOptions {
  disabled?: boolean;
  mode?: FileSelectionMode;
  acceptedFormats?: string[];
  onError?: (error: Error) => void;
  onFilesSelected: (paths: string[], selectionType: FileSelectionType) => void;
}

export const useFileBrowser = ({
  disabled = false,
  mode = 'multiple',
  acceptedFormats = [],
  onError,
  onFilesSelected,
}: UseFileBrowserOptions) => {
  const onFilesSelectedRef = useRef(onFilesSelected);

  // Keep ref up to date
  onFilesSelectedRef.current = onFilesSelected;

  const handleBrowseFiles = useCallback(async () => {
    if (disabled) return;

    try {
      const dialogTitle = mode === 'single' ? 'Select File' : 'Select Files';

      const result = await open({
        multiple: mode === 'multiple',
        directory: false,
        title: dialogTitle,
        filters:
          acceptedFormats.length > 0
            ? [
                {
                  name: 'Accepted Files',
                  extensions: acceptedFormats.map((f) => f.replace('.', '')),
                },
              ]
            : undefined,
      });

      if (result) {
        const paths = Array.isArray(result) ? result : [result];

        // Additional validation for single mode
        if (mode === 'single' && paths.length > 1) {
          paths.splice(1); // Keep only first file
        }

        onFilesSelectedRef.current(paths, 'Files');
      }
    } catch (error) {
      logger.error('useFileBrowser', 'File selection error', error as Error);
      if (onError) {
        onError(new Error(`Failed to open file browser: ${error}`));
      }
    }
  }, [disabled, onError, mode, acceptedFormats]);

  const handleBrowseFolder = useCallback(async () => {
    if (disabled || mode === 'single') return;

    try {
      const result = await open({
        multiple: false,
        directory: true,
        title: 'Select Folder',
      });

      if (result) {
        const paths = Array.isArray(result) ? result : [result];
        onFilesSelectedRef.current(paths, 'Folder');
      }
    } catch (error) {
      logger.error('useFileBrowser', 'Folder selection error', error as Error);
      if (onError) {
        onError(new Error(`Failed to open folder browser: ${error}`));
      }
    }
  }, [disabled, onError, mode]);

  return {
    handleBrowseFiles,
    handleBrowseFolder,
  };
};
