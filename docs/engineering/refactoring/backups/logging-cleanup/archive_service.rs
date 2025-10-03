use crate::prelude::*;
use crate::services::file::domain::models::{FileInfo, FileSelection, SelectionType};
use crate::services::file::domain::{FileError, FileResult, FileRules};
use crate::services::file::infrastructure::file_operations::{
    self as file_operations, ArchiveOperation,
};
use std::path::PathBuf;

pub struct ArchiveService;

impl ArchiveService {
    pub fn new() -> Self {
        Self
    }

    /// Get file information with exact logic from commands/file/selection.rs
    pub async fn get_file_info(&self, paths: Vec<String>) -> FileResult<Vec<FileInfo>> {
        use std::path::PathBuf;
        use walkdir::WalkDir;

        info!("Getting file info for {} paths", paths.len());

        let file_infos: Vec<FileInfo> = paths
            .into_iter()
            .map(|path| {
                let path_buf = PathBuf::from(&path);

                // Get file metadata with proper error handling
                let metadata = std::fs::metadata(&path_buf)
                    .map_err(|e| FileError::FileNotFound(format!("{}: {}", path, e)))?;

                // Calculate size and file count - for directories, calculate recursively
                let (size, file_count) = if metadata.is_dir() {
                    // Calculate total size and count of all files in directory recursively
                    let mut total_size = 0u64;
                    let mut total_count = 0usize;

                    for entry in WalkDir::new(&path_buf)
                        .into_iter()
                        .filter_map(|e| e.ok())
                        .filter(|e| e.file_type().is_file())
                    {
                        if let Ok(m) = entry.metadata() {
                            total_size += m.len();
                            total_count += 1;
                        }
                    }

                    (total_size, Some(total_count))
                } else {
                    (metadata.len(), None)
                };

                Ok(FileInfo {
                    path: path.clone(),
                    name: path_buf
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string(),
                    size,
                    is_file: metadata.is_file(),
                    is_directory: metadata.is_dir(),
                    file_count,
                })
            })
            .collect::<Result<Vec<FileInfo>, FileError>>()?;

        Ok(file_infos)
    }

    /// Create archive with validation and business rules
    pub async fn create_archive(
        &self,
        selection: FileSelection,
        output_path: PathBuf,
    ) -> FileResult<ArchiveOperation> {
        // Validate selection meets business rules
        FileRules::validate_file_paths(&selection.paths)?;
        FileRules::validate_total_size(selection.total_size)?;

        // Convert command types to file_operations types using canonical method
        let path_bufs: Vec<PathBuf> = selection.paths.iter().map(PathBuf::from).collect();
        let file_ops_selection = file_operations::FileSelection::from_paths(&path_bufs);

        // Call file_operations directly
        let config = file_operations::FileOpsConfig::default();
        file_operations::create_archive(&file_ops_selection, &output_path, &config)
            .map_err(|e| FileError::ArchiveCreationFailed(e.to_string()))
    }

    /// Handle file selection with exact logic from commands/file/selection.rs
    pub async fn select_files(&self, selection_type: &str) -> FileResult<FileSelection> {
        use std::path::Path;
        use walkdir::WalkDir;

        let sel_type = match selection_type {
            "files" => SelectionType::Files,
            "folder" => SelectionType::Folder,
            _ => {
                return Err(FileError::ValidationFailed(format!(
                    "Invalid selection type: {}",
                    selection_type
                )));
            }
        };

        info!("Opening file dialog for selection type: {:?}", sel_type);

        // Placeholder paths for testing - frontend will need to implement dialog
        let paths: Vec<String> = vec![];

        if paths.is_empty() {
            // Return a placeholder response for now - frontend handles actual dialog
            // This allows the UI to work while we implement proper dialog integration
            let selection_type_str = match sel_type {
                SelectionType::Files => "files",
                SelectionType::Folder => "folder",
            };

            return Ok(FileSelection {
                paths: vec![],
                total_size: 0,
                file_count: 0,
                selection_type: selection_type_str.to_string(),
            });
        }

        // Calculate total size and file count when we have actual paths
        let mut total_size = 0u64;
        let mut file_count = 0usize;

        // Process paths once dialog integration is complete
        for path_str in &paths {
            let path = Path::new(path_str);
            if path.is_file() {
                if let Ok(metadata) = std::fs::metadata(path) {
                    total_size += metadata.len();
                    file_count += 1;
                }
            } else if path.is_dir() {
                // Count all files in directory recursively
                if let Ok(entries) = WalkDir::new(path)
                    .into_iter()
                    .filter_map(Result::ok)
                    .filter(|e| e.file_type().is_file())
                    .try_fold((0u64, 0usize), |(size, count), entry| {
                        entry.metadata().map(|m| (size + m.len(), count + 1))
                    })
                {
                    total_size += entries.0;
                    file_count += entries.1;
                }
            }
        }

        let selection_type_str = match sel_type {
            SelectionType::Files => "files",
            SelectionType::Folder => "folder",
        };

        Ok(FileSelection {
            paths,
            total_size,
            file_count,
            selection_type: selection_type_str.to_string(),
        })
    }

    /// Handle directory selection with exact logic from commands/file/selection.rs
    pub async fn select_directory(&self, _title: Option<String>) -> FileResult<String> {
        // For now, return an error that the frontend can handle gracefully

        info!("Directory selection dialog requested - pending implementation");

        Err(FileError::ValidationFailed(
            "Directory selection dialog integration pending. Please type the path manually."
                .to_string(),
        ))
    }
}

impl Default for ArchiveService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_archive_service_creation() {
        let _service = ArchiveService::new();
        // Just verify creation works
    }
}
