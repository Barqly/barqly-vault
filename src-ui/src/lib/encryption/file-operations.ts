import { commands, FileInfo, FileSelection } from '../../bindings';
import { logger } from '../logger';

// FileInfo type is now imported from bindings

/**
 * Processes file information and calculates totals for encryption
 */
export const processFileInfoForEncryption = (
  fileInfos: FileInfo[],
): { totalSize: number; fileCount: number } => {
  console.log('[processFileInfo] Processing file info for size calculation...');

  let totalSize = 0;
  let fileCount = 0;

  for (const fileInfo of fileInfos) {
    totalSize += fileInfo.size;

    if (fileInfo.is_file) {
      fileCount += 1;
      console.log('[processFileInfo] Processing file:', {
        name: fileInfo.name,
        size: fileInfo.size,
        path: fileInfo.path,
      });
    } else if (fileInfo.is_directory && fileInfo.file_count !== null) {
      // Use the actual file count from the backend for directories
      fileCount += fileInfo.file_count;
      console.log('[processFileInfo] Processing directory with file count:', {
        name: fileInfo.name,
        size: fileInfo.size,
        fileCount: fileInfo.file_count,
        path: fileInfo.path,
      });
    } else if (fileInfo.is_directory) {
      // Fallback: estimate if file_count is not provided
      const estimatedFiles = Math.max(1, Math.round(fileInfo.size / (100 * 1024)));
      fileCount += estimatedFiles;
      console.log('[processFileInfo] Processing directory (estimated):', {
        name: fileInfo.name,
        size: fileInfo.size,
        estimatedFiles,
        path: fileInfo.path,
      });
    }
  }

  console.log('[processFileInfo] File info processing complete:', {
    totalSize,
    fileCount,
    timestamp: Date.now(),
  });

  return { totalSize, fileCount };
};

/**
 * Gets file information from the backend and processes it for encryption
 */
export const getFileInfoForEncryption = async (
  paths: string[],
  selectionType: 'Files' | 'Folder',
): Promise<FileSelection> => {
  console.log('[getFileInfo] Calling backend get_file_info with paths:', paths);
  const startTime = Date.now();

  try {
    // Call the backend command using generated function
    const result = await commands.getFileInfo(paths);

    if (result.status === 'error') {
      throw new Error(result.error.message || 'Failed to get file info');
    }

    const fileInfos = result.data;
    const backendTime = Date.now() - startTime;
    console.log('[getFileInfo] Backend get_file_info response:', {
      fileInfos,
      responseTime: `${backendTime}ms`,
      fileCount: fileInfos.length,
      timestamp: Date.now(),
    });

    const { totalSize, fileCount } = processFileInfoForEncryption(fileInfos);

    const fileSelection: FileSelection = {
      paths,
      total_size: totalSize,
      file_count: fileCount,
      selection_type: selectionType,
    };

    console.log('[getFileInfo] File selection result prepared:', {
      result: fileSelection,
      timestamp: Date.now(),
    });

    return fileSelection;
  } catch (error) {
    logger.error('file-operations', 'Failed to get file info', error as Error);
    throw error;
  }
};
