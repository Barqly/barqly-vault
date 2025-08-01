import React, { useState, useCallback } from 'react';
import { FolderOpen, FileText, Loader2 } from 'lucide-react';

export interface FileFilter {
  name: string;
  extensions: string[];
}

export type SelectionMode = 'files' | 'folder';

export interface FileSelectionButtonProps {
  onSelectionChange: (selectedPaths: string[]) => void;

  onError?: (error: Error) => void;
  mode?: SelectionMode;
  multiple?: boolean;
  filters?: FileFilter[];
  buttonText?: string;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
  title?: string;
}

const FileSelectionButton: React.FC<FileSelectionButtonProps> = ({
  onSelectionChange,
  onError,
  mode = 'files',
  multiple = false,
  filters,
  buttonText,
  loadingText = 'Selecting...',
  disabled = false,
  className = '',
  title,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  // Determine button text based on mode and props
  const getButtonText = () => {
    if (isLoading) return loadingText;
    if (buttonText) return buttonText;

    if (mode === 'folder') {
      return 'Select Folder';
    }

    return multiple ? 'Select Files' : 'Select File';
  };

  // Determine icon based on mode
  const getIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-5 w-5 animate-spin" />;
    }

    return mode === 'folder' ? (
      <FolderOpen className="h-5 w-5" />
    ) : (
      <FileText className="h-5 w-5" />
    );
  };

  // Determine dialog title
  const getDialogTitle = () => {
    if (title) return title;

    if (mode === 'folder') {
      return 'Select Folder';
    }

    return multiple ? 'Select Files' : 'Select File';
  };

  // Handle file/folder selection
  const handleSelection = useCallback(async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      // Dynamically import the Tauri dialog plugin for testability
      const { open } = await import('@tauri-apps/plugin-dialog');
      const result = await open({
        multiple: mode === 'files' ? multiple : false,
        directory: mode === 'folder',
        filters,
        title: getDialogTitle(),
      });

      // Handle selection result
      if (result) {
        onSelectionChange(Array.isArray(result) ? result : [result]);
      }
      // If result is null, user cancelled - no action needed
    } catch (error) {
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      setIsLoading(false);
    }
  }, [disabled, isLoading, mode, multiple, filters, onSelectionChange, onError, getDialogTitle]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelection();
      }
    },
    [handleSelection],
  );

  return (
    <button
      type="button"
      onClick={handleSelection}
      onKeyDown={handleKeyDown}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-2 px-4 py-2 
        border border-gray-400 rounded-md shadow-sm 
        text-sm font-medium text-gray-700 
        bg-white hover:bg-gray-50 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200
        ${className}
      `}
      aria-label={getButtonText().toLowerCase()}
    >
      {getIcon()}
      <span>{getButtonText()}</span>
    </button>
  );
};

export default FileSelectionButton;
