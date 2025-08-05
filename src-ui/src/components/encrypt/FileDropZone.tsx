import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from '../../lib/environment/platform';
import { safeInvoke } from '../../lib/tauri-safe';
import { withRetry } from '../../utils/retry';

interface FileDropZoneProps {
  onFilesSelected: (paths: string[], selectionType: 'Files' | 'Folder') => void;
  selectedFiles: { paths: string[]; file_count: number; total_size: number } | null;
  onClearFiles: () => void;
  onError?: (error: Error) => void; // New prop for error handling
  disabled?: boolean;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesSelected,
  selectedFiles,
  onClearFiles,
  onError,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isOverDropZone, setIsOverDropZone] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  // Use a ref to track the drop zone state for the Tauri listener
  const isOverDropZoneRef = useRef(false);
  // Use a ref to always have the latest callback
  const onFilesSelectedRef = useRef(onFilesSelected);

  // Update the refs whenever they change
  useEffect(() => {
    isOverDropZoneRef.current = isOverDropZone;
  }, [isOverDropZone]);

  useEffect(() => {
    onFilesSelectedRef.current = onFilesSelected;
  }, [onFilesSelected]);

  // Native Tauri file-drop listener for better drag-and-drop experience
  useEffect(() => {
    if (!isTauri() || disabled) return;

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        // Listen for Tauri's native file-drop events
        unlisten = await listen<string[]>('tauri://file-drop', async (event) => {
          if (event.payload && event.payload.length > 0) {
            const paths = event.payload;

            console.log('[FileDropZone] Received file-drop event:', {
              timestamp: Date.now(),
              paths,
              pathCount: paths.length,
              firstPath: paths[0],
            });

            try {
              // Call backend to get actual file information
              console.log('[FileDropZone] Querying backend for file metadata...');
              const backendStartTime = Date.now();

              let fileInfos;
              let selectionType: 'Files' | 'Folder' = 'Files';

              try {
                // Try with retry logic for transient failures
                fileInfos = await withRetry(
                  () =>
                    safeInvoke<
                      Array<{
                        path: string;
                        is_file: boolean;
                        is_directory: boolean;
                        name: string;
                        size: number;
                        file_count?: number;
                      }>
                    >('get_file_info', paths, 'FileDropZone'),
                  {
                    maxAttempts: 2,
                    initialDelay: 500,
                    onRetry: (error, attempt) => {
                      console.log(
                        `[FileDropZone] Retrying get_file_info (attempt ${attempt}):`,
                        error.message,
                      );
                    },
                  },
                );

                const backendTime = Date.now() - backendStartTime;
                console.log('[FileDropZone] Received file info from backend:', {
                  fileInfos,
                  responseTime: `${backendTime}ms`,
                  timestamp: Date.now(),
                });

                // Determine selection type from actual file system data
                if (fileInfos && fileInfos.length > 0) {
                  // If we have a single path and it's a directory, it's a folder selection
                  // Otherwise it's a files selection (even if multiple directories)
                  if (paths.length === 1 && fileInfos[0].is_directory) {
                    selectionType = 'Folder';
                  } else {
                    selectionType = 'Files';
                  }
                } else {
                  throw new Error('No file information received from backend');
                }
              } catch (backendError) {
                // Fallback mechanism: if get_file_info fails, try alternative detection
                console.warn(
                  '[FileDropZone] Backend call failed, using fallback detection:',
                  backendError,
                );

                // Fallback: assume folder if single path, files if multiple
                // This is a reasonable heuristic for drag-drop scenarios
                selectionType = paths.length === 1 ? 'Folder' : 'Files';

                console.warn('[FileDropZone] Using fallback selection type:', {
                  selectionType,
                  pathCount: paths.length,
                  reasoning:
                    paths.length === 1
                      ? 'Single path - assuming Folder'
                      : 'Multiple paths - assuming Files',
                });
              }

              console.log('[FileDropZone] Detected drop with type:', {
                paths,
                selectionType,
                fileInfos,
                timestamp: Date.now(),
              });

              // Use the ref to ensure we always have the latest callback
              console.log('[FileDropZone] Calling onFilesSelected callback...');
              const callbackStartTime = Date.now();

              await onFilesSelectedRef.current(paths, selectionType);

              const callbackTime = Date.now() - callbackStartTime;
              console.log('[FileDropZone] Files selected successfully:', {
                callbackTime: `${callbackTime}ms`,
                timestamp: Date.now(),
              });
            } catch (error) {
              console.error('[FileDropZone] Failed to process dropped files:', error);

              // Create a proper Error object with user-friendly message
              const errorObj = error instanceof Error ? error : new Error(String(error));
              const userError = new Error(
                `Failed to process dropped files: ${errorObj.message}. Please try again or use the browse buttons.`,
              );

              // Call the error callback if provided
              if (onError) {
                onError(userError);
              }

              // Log detailed error information for debugging
              console.error('[FileDropZone] Error details:', {
                error,
                errorType: typeof error,
                errorMessage: errorObj.message,
                paths,
                timestamp: Date.now(),
              });
            }

            setIsDragging(false);
            setIsOverDropZone(false);
          }
        });

        // Also listen for drag events to show visual feedback
        const dragOverUnlisten = await listen('tauri://drag-enter', () => {
          console.log('[FileDropZone] Tauri drag-enter event received:', {
            timestamp: Date.now(),
          });
          setIsDragging(true);
        });

        const dragLeaveUnlisten = await listen('tauri://drag-leave', () => {
          console.log('[FileDropZone] Tauri drag-leave event received:', {
            timestamp: Date.now(),
            isOverDropZoneRef: isOverDropZoneRef.current,
          });
          // Only clear dragging state if not over the drop zone
          if (!isOverDropZoneRef.current) {
            setIsDragging(false);
          }
        });

        // Combine unlisteners
        const originalUnlisten = unlisten;
        unlisten = () => {
          originalUnlisten?.();
          dragOverUnlisten?.();
          dragLeaveUnlisten?.();
        };
      } catch (error) {
        console.error('Failed to setup Tauri file-drop listener:', error);
      }
    };

    setupListener();

    return () => {
      unlisten?.();
    };
  }, [disabled]); // Remove onFilesSelected from deps since we use ref

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('[FileDropZone] DragEnter event:', {
      timestamp: Date.now(),
      isDragging: true,
      isOverDropZone: true,
      dataTransferTypes: e.dataTransfer?.types,
      dataTransferItemsCount: e.dataTransfer?.items?.length,
    });

    setIsDragging(true);
    setIsOverDropZone(true);
    isOverDropZoneRef.current = true;
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const isLeavingDropZone =
      dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node);

    console.log('[FileDropZone] DragLeave event:', {
      timestamp: Date.now(),
      isLeavingDropZone,
      relatedTarget: (e.relatedTarget as HTMLElement)?.nodeName || null,
      currentTarget: e.currentTarget?.nodeName,
    });

    if (isLeavingDropZone) {
      setIsDragging(false);
      setIsOverDropZone(false);
      isOverDropZoneRef.current = false;
      console.log('[FileDropZone] Clearing drag state - left drop zone');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Log only occasionally to avoid spam
    if (Math.random() < 0.1) {
      console.log('[FileDropZone] DragOver event (sampled 10%):', {
        timestamp: Date.now(),
      });
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      console.log('[FileDropZone] Drop event received:', {
        timestamp: Date.now(),
        disabled,
        isTauri: isTauri(),
        dataTransferTypes: e.dataTransfer?.types,
        dataTransferFilesCount: e.dataTransfer?.files?.length,
        dataTransferItemsCount: e.dataTransfer?.items?.length,
      });

      setIsDragging(false);
      setIsOverDropZone(false);
      isOverDropZoneRef.current = false;

      if (disabled) {
        console.log('[FileDropZone] Drop ignored - component is disabled');
        return;
      }

      // In non-Tauri environments or as fallback, use the dialog
      if (!isTauri()) {
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
          // Fallback: open file dialog
          console.log('Using fallback file dialog for file selection...');

          try {
            // Default to files mode with multiple selection
            const result = await open({
              multiple: true,
              directory: false,
              title: 'Select the files you just dropped',
            });

            if (result) {
              const paths = Array.isArray(result) ? result : [result];
              onFilesSelectedRef.current(paths, 'Files');
            }
          } catch (error) {
            console.error('File selection error:', error);
            const errorObj = error instanceof Error ? error : new Error(String(error));
            if (onError) {
              onError(new Error(`File selection failed: ${errorObj.message}`));
            }
          }
        }
      }
      // If in Tauri, the native listener will handle the drop event
    },
    [disabled], // Fixed: using ref instead
  );

  const handleBrowseFiles = useCallback(async () => {
    if (disabled) return;

    console.log('[FileDropZone] Browse Files button clicked:', {
      timestamp: Date.now(),
    });

    try {
      const result = await open({
        multiple: true,
        directory: false,
        title: 'Select Files to Encrypt',
      });

      if (result) {
        const paths = Array.isArray(result) ? result : [result];
        console.log('[FileDropZone] Files selected from dialog:', {
          paths,
          pathCount: paths.length,
          timestamp: Date.now(),
        });
        onFilesSelectedRef.current(paths, 'Files');
      }
    } catch (error) {
      console.error('File selection error:', error);
      const errorObj = error instanceof Error ? error : new Error(String(error));
      if (onError) {
        onError(new Error(`Failed to open file browser: ${errorObj.message}`));
      }
    }
  }, [disabled, onError]); // Fixed: using ref instead

  const handleBrowseFolder = useCallback(async () => {
    if (disabled) return;

    console.log('[FileDropZone] Browse Folder button clicked:', {
      timestamp: Date.now(),
    });

    try {
      const result = await open({
        multiple: false,
        directory: true,
        title: 'Select Folder to Encrypt',
      });

      if (result) {
        const paths = Array.isArray(result) ? result : [result];
        console.log('[FileDropZone] Folder selected from dialog:', {
          paths,
          pathCount: paths.length,
          timestamp: Date.now(),
        });
        onFilesSelectedRef.current(paths, 'Folder');
      }
    } catch (error) {
      console.error('File selection error:', error);
      const errorObj = error instanceof Error ? error : new Error(String(error));
      if (onError) {
        onError(new Error(`Failed to open file browser: ${errorObj.message}`));
      }
    }
  }, [disabled, onError]); // Fixed: using ref instead

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileName = (path: string): string => {
    return path.split(/[/\\]/).pop() || path;
  };

  if (selectedFiles) {
    // Show selected files
    return (
      <div className="border border-gray-200 rounded-lg bg-gray-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
              <FileText className="w-4 h-4" />
              <span>Selected:</span>
            </div>
            <span className="text-sm text-gray-600">
              {selectedFiles.file_count} {selectedFiles.file_count === 1 ? 'file' : 'files'},{' '}
              {formatFileSize(selectedFiles.total_size)}
            </span>
          </div>
          <button
            onClick={onClearFiles}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Clear all files"
          >
            Clear
          </button>
        </div>
        <div className="max-h-32 overflow-y-auto">
          <ul className="space-y-1">
            {selectedFiles.paths.map((path, index) => (
              <li
                key={index}
                className="flex items-center justify-between text-sm text-gray-600 hover:bg-gray-100 rounded px-2 py-1 group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  <span className="truncate font-mono text-xs" title={path}>
                    {getFileName(path)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dropZoneRef}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        relative min-h-[160px] border-2 border-dashed rounded-lg
        flex flex-col items-center justify-center p-8
        transition-all duration-200 cursor-pointer
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <Upload
        className={`w-12 h-12 mb-4 transition-colors ${
          isDragging ? 'text-blue-500' : 'text-gray-400'
        }`}
      />
      <p className="text-base font-medium text-gray-700 mb-2">
        Drop files or folders here to encrypt
      </p>
      <p className="text-sm text-gray-500 mb-1">- or -</p>
      <p className="text-xs text-gray-400 mb-3">
        {isTauri()
          ? 'Drag and drop files or folders directly'
          : '(Dropping files will open the file dialog)'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleBrowseFiles();
          }}
          disabled={disabled}
          className={`
            px-4 py-2 text-sm font-medium rounded-md transition-colors
            ${
              !disabled
                ? 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
            }
          `}
        >
          Browse Files
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleBrowseFolder();
          }}
          disabled={disabled}
          className={`
            px-4 py-2 text-sm font-medium rounded-md transition-colors
            ${
              !disabled
                ? 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
            }
          `}
        >
          Browse Folder
        </button>
      </div>
    </div>
  );
};

export default FileDropZone;
