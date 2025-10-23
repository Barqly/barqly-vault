import React from 'react';
import { FileText, Shield } from 'lucide-react';
import { SelectedFiles } from '../../types/file-types';
import { formatFileSize, getFileName } from '../../utils/file-validation';

interface SelectedFilesDisplayProps {
  selectedFiles: SelectedFiles;
  onClearFiles?: () => void;
  icon?: 'upload' | 'decrypt';
  className?: string;
}

const SelectedFilesDisplay: React.FC<SelectedFilesDisplayProps> = ({
  selectedFiles,
  onClearFiles,
  icon = 'upload',
  className = '',
}) => {
  const isDecryptMode = icon === 'decrypt';

  return (
    <div
      className={`border rounded-lg p-4 ${
        isDecryptMode
          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
          : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            {isDecryptMode ? (
              <Shield className="w-4 h-4 text-green-600 dark:text-green-500" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>Selected:</span>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedFiles.file_count} {selectedFiles.file_count === 1 ? 'file' : 'files'},{' '}
            {formatFileSize(selectedFiles.total_size)}
          </span>
        </div>
        {onClearFiles && (
          <button
            onClick={onClearFiles}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label="Clear selection"
          >
            Clear
          </button>
        )}
      </div>

      <div className="max-h-32 overflow-y-auto">
        <ul className="space-y-1">
          {selectedFiles.paths.map((path, index) => (
            <li
              key={index}
              className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded px-2 py-1 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                <span className="truncate font-mono text-xs" title={path}>
                  {getFileName(path)}
                </span>
              </div>
              {isDecryptMode && (
                <span className="text-xs text-green-600 dark:text-green-500 font-medium">
                  ✓ Valid encryption format
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SelectedFilesDisplay;
