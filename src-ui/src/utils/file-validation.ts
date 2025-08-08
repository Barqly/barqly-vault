import { FileSelectionMode } from '../types/file-types';

/**
 * Validates file paths against accepted formats
 */
export const validateFileFormats = (
  paths: string[],
  acceptedFormats: string[],
): { valid: boolean; invalidFiles: string[] } => {
  if (acceptedFormats.length === 0) {
    return { valid: true, invalidFiles: [] };
  }

  const invalidFiles = paths.filter(
    (path) => !acceptedFormats.some((format) => path.toLowerCase().endsWith(format)),
  );

  return {
    valid: invalidFiles.length === 0,
    invalidFiles,
  };
};

/**
 * Validates file count based on selection mode
 */
export const validateFileCount = (
  paths: string[],
  mode: FileSelectionMode,
): { valid: boolean; error?: string } => {
  if (mode === 'single' && paths.length > 1) {
    return {
      valid: false,
      error: 'Please select only one file',
    };
  }

  return { valid: true };
};

/**
 * Formats file size in human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Extracts filename from full path
 */
export const getFileName = (path: string): string => {
  return path.split(/[/\\]/).pop() || path;
};

/**
 * Determines if a path is likely a folder based on extension
 */
export const isLikelyFolder = (path: string): boolean => {
  return !path.includes('.');
};

/**
 * Creates an error message for invalid file formats
 */
export const getFormatErrorMessage = (acceptedFormats: string[]): string => {
  return `Invalid file format. Please select ${acceptedFormats.join(', ')} files only.`;
};
