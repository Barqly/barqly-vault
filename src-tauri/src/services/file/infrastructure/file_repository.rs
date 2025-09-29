use crate::commands::{
    FileInfo as CommandFileInfo, FileSelection as CommandFileSelection,
    SelectionType as CommandSelectionType,
};
use crate::file_ops::{self, ArchiveOperation, FileOpsConfig, FileSelection as FileOpsSelection};
use crate::services::file::domain::{FileError, FileResult};
use std::path::PathBuf;

pub struct FileRepository;

impl FileRepository {
    pub fn new() -> Self {
        Self
    }

    /// Get file information by delegating to file_ops
    pub async fn get_file_info(&self, paths: Vec<String>) -> FileResult<Vec<CommandFileInfo>> {
        // Convert paths to PathBuf and create file_ops FileSelection
        let path_bufs: Vec<PathBuf> = paths.iter().map(PathBuf::from).collect();
        let file_ops_selection = if path_bufs.len() == 1 && path_bufs[0].is_dir() {
            FileOpsSelection::Folder(path_bufs[0].clone())
        } else {
            FileOpsSelection::Files(path_bufs)
        };

        // Get file info from file_ops
        let file_ops_info = file_ops_selection
            .get_file_info()
            .map_err(|e| FileError::IoError(e.to_string()))?;

        // Convert file_ops::FileInfo to command::FileInfo
        let command_file_info: Vec<CommandFileInfo> = file_ops_info
            .into_iter()
            .map(|info| CommandFileInfo {
                path: info.path.to_string_lossy().to_string(),
                name: info
                    .path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string(),
                size: info.size,
                is_file: info.path.is_file(),
                is_directory: info.path.is_dir(),
                file_count: None, // TODO: Count files in directory if needed
            })
            .collect();

        Ok(command_file_info)
    }

    /// Create archive by delegating to file_ops
    pub async fn create_archive(
        &self,
        selection: CommandFileSelection,
        output_path: PathBuf,
    ) -> FileResult<ArchiveOperation> {
        let config = FileOpsConfig::default();

        // Convert command FileSelection to file_ops FileSelection
        let path_bufs: Vec<PathBuf> = selection.paths.iter().map(PathBuf::from).collect();
        let file_ops_selection = match selection.selection_type.as_str() {
            "folder" => FileOpsSelection::Folder(path_bufs[0].clone()),
            _ => FileOpsSelection::Files(path_bufs),
        };

        file_ops::create_archive(&file_ops_selection, &output_path, &config)
            .map_err(|e| FileError::ArchiveCreationFailed(e.to_string()))
    }

    /// Handle file selection dialog
    pub async fn select_files(
        &self,
        selection_type: CommandSelectionType,
    ) -> FileResult<CommandFileSelection> {
        // TODO: Implement actual file selection dialog integration
        // For now, return empty selection matching the command pattern
        Ok(CommandFileSelection {
            paths: vec![],
            total_size: 0,
            file_count: 0,
            selection_type: match selection_type {
                CommandSelectionType::Files => "files".to_string(),
                CommandSelectionType::Folder => "folder".to_string(),
            },
        })
    }

    /// Handle directory selection dialog
    pub async fn select_directory(&self, _title: Option<String>) -> FileResult<String> {
        // Use tauri dialog for directory selection
        // This is a simplified implementation - the actual file commands use tauri APIs
        Err(FileError::ValidationFailed(
            "Directory selection needs tauri integration".to_string(),
        ))
    }
}

impl Default for FileRepository {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_repository_creation() {
        let repo = FileRepository::new();
        assert!(std::mem::size_of_val(&repo) == 0);
    }
}
