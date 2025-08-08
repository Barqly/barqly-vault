export type FileSelectionMode = 'single' | 'multiple' | 'folder';
export type FileSelectionType = 'Files' | 'Folder';

export interface SelectedFiles {
  paths: string[];
  file_count: number;
  total_size: number;
}

export interface FileDropZoneProps {
  onFilesSelected: (paths: string[], selectionType: FileSelectionType) => void;
  selectedFiles?: SelectedFiles | null;
  onClearFiles?: () => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  mode?: FileSelectionMode;
  acceptedFormats?: string[];
  title?: string;
  subtitle?: string;
  dropText?: string;
  browseButtonText?: string;
  browseFolderButtonText?: string;
  icon?: 'upload' | 'decrypt';
  className?: string;
}
