import React, { useRef, useEffect } from 'react';
import { Upload, Lock } from 'lucide-react';

interface DropZoneUIProps {
  isDragging: boolean;
  disabled?: boolean;
  icon?: 'upload' | 'decrypt';
  title?: string;
  subtitle?: string;
  dropText?: string;
  browseButtonText?: string;
  browseFolderButtonText?: string;
  showFolderButton?: boolean;
  autoFocus?: boolean;
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
  browseButtonText = 'Browse Files',
  browseFolderButtonText = 'Browse Folder',
  showFolderButton = false,
  autoFocus = false,
  onBrowseFiles,
  onBrowseFolder,
}) => {
  const IconComponent = icon === 'decrypt' ? Lock : Upload;
  const browseButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the browse button when requested and component is enabled
  useEffect(() => {
    if (autoFocus && !disabled && browseButtonRef.current) {
      // Use a small timeout to ensure the component is fully rendered
      const timeoutId = setTimeout(() => {
        browseButtonRef.current?.focus();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [autoFocus, disabled]);

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

      <p className="text-sm text-gray-500 mb-1">- or -</p>

      {/* Button group container - visually grouped for consistency */}
      <div className={`inline-flex mt-3 ${showFolderButton ? 'button-group' : ''}`}>
        <button
          ref={browseButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            onBrowseFiles();
          }}
          disabled={disabled}
          aria-label={browseButtonText}
          className={`
            px-4 py-2 text-sm font-medium transition-colors focus:z-10
            ${showFolderButton ? 'rounded-l-md border-r-0' : 'rounded-md'}
            ${
              !disabled
                ? 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 focus:outline-none'
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
            aria-label={browseFolderButtonText}
            className={`
              px-4 py-2 text-sm font-medium rounded-r-md transition-colors focus:z-10
              ${
                !disabled
                  ? 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 focus:outline-none'
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
