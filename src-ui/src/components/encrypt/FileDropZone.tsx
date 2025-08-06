import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { isTauri } from '../../lib/environment/platform';

interface FileDropZoneProps {
  onFilesSelected: (paths: string[], selectionType: 'Files' | 'Folder') => void;
  selectedFiles: { paths: string[]; file_count: number; total_size: number } | null;
  onClearFiles: () => void;
  onError?: (error: Error) => void;
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
        console.log('[FileDropZone] Setting up Tauri v2 drag-drop listener...');

        const webview = getCurrentWebview();
        unlisten = await webview.onDragDropEvent((event) => {
          console.log('[FileDropZone] Drag-drop event:', event);

          if (event.payload.type === 'over') {
            setIsDragging(true);
          } else if (event.payload.type === 'drop') {
            const paths = event.payload.paths;
            if (paths && paths.length > 0) {
              console.log('[FileDropZone] Files dropped:', paths);

              // Simple heuristic: single item = folder, multiple = files
              const selectionType: 'Files' | 'Folder' = paths.length === 1 ? 'Folder' : 'Files';
              onFilesSelectedRef.current(paths, selectionType);
            }
            setIsDragging(false);
          } else {
            // cancelled
            setIsDragging(false);
          }
        });

        console.log('[FileDropZone] Tauri drag-drop listener ready');
      } catch (error) {
        console.error('Failed to setup Tauri drag-drop:', error);
      }
    };

    setupListener();
    return () => unlisten?.();
  }, [disabled]);

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
    console.log('[FileDropZone] HTML5 drop event - Tauri should handle natively');
    setIsDragging(false);
  }, []);

  const handleBrowseFiles = useCallback(async () => {
    if (disabled) return;

    try {
      const result = await open({
        multiple: true,
        directory: false,
        title: 'Select Files to Encrypt',
      });

      if (result) {
        const paths = Array.isArray(result) ? result : [result];
        onFilesSelectedRef.current(paths, 'Files');
      }
    } catch (error) {
      console.error('File selection error:', error);
      if (onError) {
        onError(new Error(`Failed to open file browser: ${error}`));
      }
    }
  }, [disabled, onError]);

  const handleBrowseFolder = useCallback(async () => {
    if (disabled) return;

    try {
      const result = await open({
        multiple: false,
        directory: true,
        title: 'Select Folder to Encrypt',
      });

      if (result) {
        const paths = Array.isArray(result) ? result : [result];
        onFilesSelectedRef.current(paths, 'Folder');
      }
    } catch (error) {
      console.error('Folder selection error:', error);
      if (onError) {
        onError(new Error(`Failed to open folder browser: ${error}`));
      }
    }
  }, [disabled, onError]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileName = (path: string): string => {
    return path.split(/[/\\]/).pop() || path;
  };

  if (selectedFiles) {
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
      <p className="text-xs text-gray-400 mb-3">Drag and drop files or folders directly</p>
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
