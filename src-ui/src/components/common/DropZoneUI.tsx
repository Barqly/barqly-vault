import React, { useRef, useEffect, useCallback } from 'react';
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
  const browseFolderButtonRef = useRef<HTMLButtonElement>(null);

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

  // Handle keyboard navigation for focus trap between the two buttons
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, isFirstButton: boolean) => {
      if (!showFolderButton || disabled) return;

      if (e.key === 'Tab') {
        // If we have two buttons, trap focus between them
        if (isFirstButton && !e.shiftKey) {
          // Tab from first button -> go to second button
          e.preventDefault();
          browseFolderButtonRef.current?.focus();
        } else if (!isFirstButton && e.shiftKey) {
          // Shift+Tab from second button -> go to first button
          e.preventDefault();
          browseButtonRef.current?.focus();
        } else if (!isFirstButton && !e.shiftKey) {
          // Tab from second button -> wrap back to first button
          e.preventDefault();
          browseButtonRef.current?.focus();
        } else if (isFirstButton && e.shiftKey) {
          // Shift+Tab from first button -> wrap to second button
          e.preventDefault();
          browseFolderButtonRef.current?.focus();
        }
      }
    },
    [showFolderButton, disabled]
  );

  return (
    <>
      <IconComponent
        className={`w-12 h-12 mb-2 transition-colors ${
          isDragging ? 'text-blue-500' : 'text-slate-400'
        }`}
      />

      {title && <p className="text-base font-medium text-slate-700 dark:text-slate-300 mb-2">{title}</p>}

      <p className="text-base text-slate-600 dark:text-slate-400 mb-2">{dropText}</p>

      {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{subtitle}</p>}

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">- or -</p>

      {/* Side-by-side buttons with unified styling for cohesion */}
      <div className={`flex items-center justify-center mt-3 ${showFolderButton ? 'gap-3' : ''}`}>
        <button
          ref={browseButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            onBrowseFiles();
          }}
          onKeyDown={(e) => handleKeyDown(e, true)}
          disabled={disabled}
          aria-label={showFolderButton ? 'Select one or more files to encrypt' : browseButtonText}
          className={`
            inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium
            transition-colors duration-150 ease-in-out focus:outline-none
            focus-visible:ring-2 focus-visible:ring-blue-300 dark:focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800
            ${showFolderButton ? 'w-32' : 'w-auto'}
            ${
              !disabled
                ? 'border border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-700 hover:bg-blue-50/50 dark:hover:bg-slate-600 hover:border-blue-700 dark:hover:border-blue-400 active:bg-blue-50/80 dark:active:bg-slate-600'
                : 'border border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-700 cursor-not-allowed'
            }
          `}
        >
          {browseButtonText}
        </button>

        {showFolderButton && (
          <button
            ref={browseFolderButtonRef}
            onClick={(e) => {
              e.stopPropagation();
              onBrowseFolder();
            }}
            onKeyDown={(e) => handleKeyDown(e, false)}
            disabled={disabled}
            aria-label="Select an entire folder to encrypt"
            className={`
              inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium w-32
              transition-colors duration-150 ease-in-out focus:outline-none
              focus-visible:ring-2 focus-visible:ring-blue-300 dark:focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800
              ${
                !disabled
                  ? 'border border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-700 hover:bg-blue-50/50 dark:hover:bg-slate-600 hover:border-blue-700 dark:hover:border-blue-400 active:bg-blue-50/80 dark:active:bg-slate-600'
                  : 'border border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-700 cursor-not-allowed'
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
