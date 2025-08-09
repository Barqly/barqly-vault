/**
 * File operation utilities for decryption workflow
 */

import { safeInvoke } from '../tauri-safe';
import { FileSelection } from '../api-types';
import { createFileSelectionError, createFileFormatError } from '../errors/command-error';

/**
 * Validates that a file path is an encrypted .age file
 */
export const validateEncryptedFile = (filePath: string): void => {
  if (!filePath.toLowerCase().endsWith('.age')) {
    throw createFileFormatError('.age encrypted');
  }
};

/**
 * Validates file selection for decryption
 * Ensures only one .age file is selected
 */
export const validateDecryptionFileSelection = (paths: string[]): string => {
  if (paths.length === 0) {
    throw createFileSelectionError(
      'No file selected',
      'Please select an encrypted .age file to decrypt',
    );
  }

  if (paths.length > 1) {
    throw createFileSelectionError(
      'Multiple files selected',
      'Please select only one encrypted .age file to decrypt',
    );
  }

  const selectedFile = paths[0];
  validateEncryptedFile(selectedFile);

  return selectedFile;
};

/**
 * Selects an encrypted file for decryption
 * Handles file dialog and validation
 */
export const selectEncryptedFileForDecryption = async (): Promise<string> => {
  // Call the backend command to select encrypted file
  const result = await safeInvoke<FileSelection>('select_files', 'Files', 'useFileDecryption');

  // Validate and return the selected file
  return validateDecryptionFileSelection(result.paths);
};

/**
 * Extracts metadata from encrypted file path
 * Useful for displaying information about the vault
 */
export const extractVaultMetadata = (
  filePath: string,
): {
  fileName: string;
  creationDate?: string;
} => {
  const fileName = filePath.split('/').pop() || '';
  const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})/);

  return {
    fileName,
    creationDate: dateMatch ? dateMatch[1] : undefined,
  };
};

/**
 * Gets the base name of a file without the .age extension
 * Useful for suggesting output file names
 */
export const getDecryptedFileName = (encryptedPath: string): string => {
  const fileName = encryptedPath.split('/').pop() || '';

  if (fileName.toLowerCase().endsWith('.age')) {
    return fileName.slice(0, -4);
  }

  return fileName;
};
