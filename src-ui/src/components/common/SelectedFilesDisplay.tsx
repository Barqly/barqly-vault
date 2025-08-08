import React from 'react';
import { FileText, Shield } from 'lucide-react';
import { SelectedFiles } from '../../types/file-types';
import { formatFileSize, getFileName } from '../../utils/file-validation';

interface SelectedFilesDisplayProps {
  selectedFiles: SelectedFiles;
  onClearFiles?: () => void;
  icon?: 'upload' | 'decrypt';
  acceptedFormats?: string[];
  className?: string;
}

const SelectedFilesDisplay: React.FC<SelectedFilesDisplayProps> = ({
  selectedFiles,
  onClearFiles,
  icon = 'upload',
  acceptedFormats = [],
  className = '',
}) => {
  const isDecryptMode = icon === 'decrypt';

  return (
    <div
      className={`border rounded-lg p-4 ${
        isDecryptMode ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
      } ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
            {isDecryptMode ? (
              <Shield className="w-4 h-4 text-green-600" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>Selected:</span>
          </div>
          <span className="text-sm text-gray-600">
            {selectedFiles.file_count} {selectedFiles.file_count === 1 ? 'file' : 'files'},{' '}
            {formatFileSize(selectedFiles.total_size)}
          </span>
        </div>
        {onClearFiles && (
          <button
            onClick={onClearFiles}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
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
              className="flex items-center justify-between text-sm text-gray-600 hover:bg-white/50 rounded px-2 py-1 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 flex-shrink-0 text-gray-400" />
                <span className="truncate font-mono text-xs" title={path}>
                  {getFileName(path)}
                </span>
              </div>
              {isDecryptMode && acceptedFormats.includes('.age') && (
                <span className="text-xs text-green-600 font-medium">
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
