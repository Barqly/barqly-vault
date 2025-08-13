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
        className={`w-12 h-12 mb-2 transition-colors ${
          isDragging ? 'text-blue-500' : 'text-slate-400'
        }`}
      />

      {title && <p className="text-base font-medium text-slate-700 mb-2">{title}</p>}

      <p className="text-base text-slate-600 mb-2">{dropText}</p>

      {subtitle && <p className="text-sm text-slate-500 mb-3">{subtitle}</p>}

      <p className="text-sm text-slate-500 mb-1">- or -</p>

      {/* Side-by-side buttons with unified styling for cohesion */}
      <div className={`flex items-center justify-center mt-3 ${showFolderButton ? 'gap-3' : ''}`}>
        <button
          ref={browseButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            onBrowseFiles();
          }}
          disabled={disabled}
          aria-label={showFolderButton ? 'Select one or more files to encrypt' : browseButtonText}
          className={`
            inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium
            transition-colors duration-150 ease-in-out focus:outline-none
            focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2
            ${showFolderButton ? 'w-32' : 'w-auto'}
            ${
              !disabled
                ? 'border border-blue-600 text-blue-600 bg-white hover:bg-blue-50/50 hover:border-blue-700 active:bg-blue-50/80'
                : 'border border-slate-300 text-slate-400 bg-white cursor-not-allowed'
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
            aria-label="Select an entire folder to encrypt"
            className={`
              inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium w-32
              transition-colors duration-150 ease-in-out focus:outline-none
              focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2
              ${
                !disabled
                  ? 'border border-blue-600 text-blue-600 bg-white hover:bg-blue-50/50 hover:border-blue-700 active:bg-blue-50/80'
                  : 'border border-slate-300 text-slate-400 bg-white cursor-not-allowed'
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
