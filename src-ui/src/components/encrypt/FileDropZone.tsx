import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, FolderOpen } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';

interface FileDropZoneProps {
  mode: 'files' | 'folder' | null;
  onFilesSelected: (paths: string[]) => void;
  selectedFiles: { paths: string[]; file_count: number; total_size: number } | null;
  onClearFiles: () => void;
  disabled?: boolean;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
  mode,
  onFilesSelected,
  selectedFiles,
  onClearFiles,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled || !mode) return;

      // In Tauri desktop apps, drag and drop from the file system doesn't provide
      // full file paths through the web drag API for security reasons.
      // We need to use the native file dialog instead.

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        // Since we can't get the actual file paths from the drag event,
        // we'll open the file dialog for the user to select the files
        // This is a limitation of the web security model in Tauri
        console.log('Files were dropped, opening file dialog for proper selection...');

        try {
          const result = await open({
            multiple: mode === 'files',
            directory: mode === 'folder',
            title:
              mode === 'files'
                ? 'Select the files you just dropped'
                : 'Select the folder you just dropped',
          });

          if (result) {
            const paths = Array.isArray(result) ? result : [result];
            onFilesSelected(paths);
          }
        } catch (error) {
          console.error('File selection error:', error);
        }
      }
    },
    [disabled, mode, onFilesSelected],
  );

  const handleBrowse = useCallback(async () => {
    if (disabled || !mode) return;

    try {
      const result = await open({
        multiple: mode === 'files',
        directory: mode === 'folder',
        title: mode === 'files' ? 'Select Files to Encrypt' : 'Select Folder to Encrypt',
      });

      if (result) {
        const paths = Array.isArray(result) ? result : [result];
        onFilesSelected(paths);
      }
    } catch (error) {
      console.error('File selection error:', error);
    }
  }, [disabled, mode, onFilesSelected]);

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
                  {mode === 'folder' ? (
                    <FolderOpen className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  ) : (
                    <FileText className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  )}
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
        ${!mode ? 'bg-gray-50' : ''}
      `}
      onClick={mode ? handleBrowse : undefined}
    >
      <Upload
        className={`w-12 h-12 mb-4 transition-colors ${
          isDragging ? 'text-blue-500' : 'text-gray-400'
        }`}
      />
      <p className="text-base font-medium text-gray-700 mb-2">
        {mode
          ? `Drop ${mode === 'files' ? 'files' : 'a folder'} here to select`
          : 'Select a mode first'}
      </p>
      <p className="text-sm text-gray-500 mb-1">- or -</p>
      <p className="text-xs text-gray-400 mb-3">
        {mode && '(Dropping files will open the file dialog)'}
      </p>
      <div className="flex gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (mode === 'files') handleBrowse();
          }}
          disabled={disabled || mode !== 'files'}
          className={`
            px-4 py-2 text-sm font-medium rounded-md transition-colors
            ${
              mode === 'files'
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
            if (mode === 'folder') handleBrowse();
          }}
          disabled={disabled || mode !== 'folder'}
          className={`
            px-4 py-2 text-sm font-medium rounded-md transition-colors
            ${
              mode === 'folder'
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
