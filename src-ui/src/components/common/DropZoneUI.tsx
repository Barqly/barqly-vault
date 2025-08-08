import React from 'react';
import { Upload, Lock } from 'lucide-react';

interface DropZoneUIProps {
  isDragging: boolean;
  disabled?: boolean;
  icon?: 'upload' | 'decrypt';
  title?: string;
  subtitle?: string;
  dropText?: string;
  acceptedFormats?: string[];
  browseButtonText?: string;
  browseFolderButtonText?: string;
  showFolderButton?: boolean;
  onBrowseFiles: () => void;
  onBrowseFolder: () => void;
}

const DropZoneUI: React.FC<DropZoneUIProps> = ({
  isDragging,
  disabled = false,
  icon = 'upload',
  title,
  subtitle,
  dropText = 'Drop files here',
  acceptedFormats = [],
  browseButtonText = 'Browse Files',
  browseFolderButtonText = 'Browse Folder',
  showFolderButton = false,
  onBrowseFiles,
  onBrowseFolder,
}) => {
  const IconComponent = icon === 'decrypt' ? Lock : Upload;

  return (
    <>
      <IconComponent
        className={`w-12 h-12 mb-4 transition-colors ${
          isDragging ? 'text-blue-500' : 'text-gray-400'
        }`}
      />

      {title && <p className="text-base font-medium text-gray-700 mb-2">{title}</p>}

      <p className="text-base text-gray-700 mb-2">{dropText}</p>

      {subtitle && <p className="text-sm text-gray-500 mb-3">{subtitle}</p>}

      {acceptedFormats.length > 0 && (
        <p className="text-xs text-gray-400 mb-3">Accepted formats: {acceptedFormats.join(', ')}</p>
      )}

      <p className="text-sm text-gray-500 mb-1">- or -</p>

      <div className="flex gap-3 mt-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBrowseFiles();
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
          {browseButtonText}
        </button>

        {showFolderButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBrowseFolder();
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
            {browseFolderButtonText}
          </button>
        )}
      </div>
    </>
  );
};

export default DropZoneUI;
