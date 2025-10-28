import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { isTauri } from '../lib/environment/platform';
import { FileSelectionMode, FileSelectionType } from '../types/file-types';
import { logger } from '../lib/logger';

interface UseDragAndDropOptions {
  disabled?: boolean;
  mode?: FileSelectionMode;
  acceptedFormats?: string[];
  onError?: (error: Error) => void;
  onFilesSelected: (paths: string[], selectionType: FileSelectionType) => void;
}

export const useDragAndDrop = ({
  disabled = false,
  mode = 'multiple',
  acceptedFormats = [],
  onError,
  onFilesSelected,
}: UseDragAndDropOptions) => {
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const onFilesSelectedRef = useRef(onFilesSelected);

  // Keep refs up to date
  useEffect(() => {
    onFilesSelectedRef.current = onFilesSelected;
  }, [onFilesSelected]);

  // Tauri v2 drag-drop using webview API
  useEffect(() => {
    if (!isTauri() || disabled) return;

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        logger.debug('useDragAndDrop', 'Setting up Tauri v2 drag-drop listener');

        const webview = getCurrentWebview();
        unlisten = await webview.onDragDropEvent((event) => {
          logger.debug('useDragAndDrop', 'Drag-drop event', event);

          if (event.payload.type === 'over') {
            setIsDragging(true);
          } else if (event.payload.type === 'drop') {
            const paths = event.payload.paths;
            if (paths && paths.length > 0) {
              logger.debug('useDragAndDrop', 'Files dropped', { paths });

              // Validate file formats if specified
              if (acceptedFormats.length > 0) {
                const invalidFiles = paths.filter(
                  (path) => !acceptedFormats.some((format) => path.toLowerCase().endsWith(format)),
                );
                if (invalidFiles.length > 0) {
                  if (onError) {
                    onError(
                      new Error(
                        `Invalid file format. Please select ${acceptedFormats.join(', ')} files only.`,
                      ),
                    );
                  }
                  setIsDragging(false);
                  return;
                }
              }

              // Handle single file mode
              if (mode === 'single' && paths.length > 1) {
                if (onError) {
                  onError(new Error('Please select only one file'));
                }
                setIsDragging(false);
                return;
              }

              // Determine selection type
              const selectionType: FileSelectionType =
                mode === 'folder' || (paths.length === 1 && !paths[0].includes('.'))
                  ? 'Folder'
                  : 'Files';

              onFilesSelectedRef.current(paths, selectionType);
            }
            setIsDragging(false);
          } else {
            // cancelled
            setIsDragging(false);
          }
        });

        logger.debug('useDragAndDrop', 'Tauri drag-drop listener ready');
      } catch (error) {
        logger.error('useDragAndDrop', 'Failed to setup Tauri drag-drop', error as Error);
      }
    };

    setupListener();
    return () => unlisten?.();
  }, [disabled, mode, acceptedFormats, onError]);

  // HTML5 drag handlers for visual feedback only
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const isLeavingDropZone =
      dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node);
    if (isLeavingDropZone) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    logger.debug('useDragAndDrop', 'HTML5 drop event - Tauri should handle natively');
    setIsDragging(false);
  }, []);

  return {
    isDragging,
    dropZoneRef,
    handlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
};
