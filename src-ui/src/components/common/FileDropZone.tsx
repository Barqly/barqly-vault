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
}) => {
  // Use custom hooks for drag-and-drop and file browsing
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

  // Render selected files view
  if (selectedFiles) {
    return (
      <SelectedFilesDisplay
        selectedFiles={selectedFiles}
        onClearFiles={onClearFiles}
        icon={icon}
        acceptedFormats={acceptedFormats}
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
      className={`
        relative min-h-[160px] border-2 border-dashed rounded-lg
        flex flex-col items-center justify-center p-8
        transition-all duration-200 cursor-pointer
        ${
          isDragging
            ? icon === 'decrypt'
              ? 'border-blue-500 bg-blue-50'
              : 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
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
        acceptedFormats={acceptedFormats}
        browseButtonText={browseButtonText}
        browseFolderButtonText={browseFolderButtonText}
        showFolderButton={showFolderButton}
        onBrowseFiles={handleBrowseFiles}
        onBrowseFolder={handleBrowseFolder}
      />
    </div>
  );
};

export default FileDropZone;
