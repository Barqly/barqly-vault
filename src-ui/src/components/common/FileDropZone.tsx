import React from 'react';
import { FileDropZoneProps } from '../../types/file-types';
import { useDragAndDrop } from '../../hooks/useDragAndDrop';
import { useFileBrowser } from '../../hooks/useFileBrowser';
import SelectedFilesDisplay from './SelectedFilesDisplay';
import DropZoneUI from './DropZoneUI';

// Re-export types for backward compatibility
export type { FileSelectionMode, FileSelectionType } from '../../types/file-types';

const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesSelected,
  selectedFiles,
  onClearFiles,
  onError,
  disabled = false,
  mode = 'multiple',
  acceptedFormats = [],
  title,
  subtitle,
  dropText = 'Drop files here',
  browseButtonText = 'Browse Files',
  browseFolderButtonText = 'Browse Folder',
  icon = 'upload',
  className = '',
  autoFocus = false,
}) => {
  // Use custom hooks for drag-and-drop and file browsing
  // IMPORTANT: All hooks must be called unconditionally to comply with React's Rules of Hooks
  const { isDragging, dropZoneRef, handlers } = useDragAndDrop({
    disabled,
    mode,
    acceptedFormats,
    onError,
    onFilesSelected,
  });

  const { handleBrowseFiles, handleBrowseFolder } = useFileBrowser({
    disabled,
    mode,
    acceptedFormats,
    onError,
    onFilesSelected,
  });

  // Handle keyboard accessibility for Enter key
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      // Trigger file selection on Enter or Space key
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleBrowseFiles();
      }
    },
    [disabled, handleBrowseFiles],
  );

  // Render selected files view
  // NOTE: This conditional rendering happens AFTER all hooks are called
  if (selectedFiles) {
    return (
      <SelectedFilesDisplay
        selectedFiles={selectedFiles}
        onClearFiles={onClearFiles}
        icon={icon}
        className={className}
      />
    );
  }

  // Render drop zone
  const showFolderButton = mode !== 'single' && mode !== 'folder';

  return (
    <div
      ref={dropZoneRef}
      {...handlers}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label={mode === 'single' ? 'Select a file' : 'Select files'}
      onKeyDown={handleKeyDown}
      className={`
        relative min-h-[160px] border-2 border-dashed rounded-lg
        flex flex-col items-center justify-center p-8
        transition-all duration-200 cursor-pointer
        ${
          isDragging
            ? icon === 'decrypt'
              ? 'border-blue-500 bg-blue-50'
              : 'border-blue-500 bg-blue-50'
            : 'border-slate-200 hover:border-slate-300'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <DropZoneUI
        isDragging={isDragging}
        disabled={disabled}
        icon={icon}
        title={title}
        subtitle={subtitle}
        dropText={dropText}
        browseButtonText={browseButtonText}
        browseFolderButtonText={browseFolderButtonText}
        showFolderButton={showFolderButton}
        autoFocus={autoFocus}
        onBrowseFiles={handleBrowseFiles}
        onBrowseFolder={handleBrowseFolder}
      />
    </div>
  );
};

export default FileDropZone;
