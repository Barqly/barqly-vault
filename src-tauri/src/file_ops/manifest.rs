//! Manifest generation and verification for archive integrity

use crate::file_ops::archive::extract_archive;
use crate::file_ops::{ArchiveOperation, FileInfo, FileOpsConfig, FileOpsError, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Read;
use std::path::{Path, PathBuf};
use tracing::{info, warn};

/// Manifest file containing metadata about archived files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Manifest {
    /// Manifest version
    pub version: String,
    /// Creation timestamp
    pub created: DateTime<Utc>,
    /// Archive information
    pub archive: ArchiveManifest,
    /// List of files in the archive
    pub files: Vec<FileManifestEntry>,
    /// Manifest hash for integrity verification
    pub manifest_hash: String,
}

/// Archive metadata in manifest
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveManifest {
    /// Archive file path
    pub archive_path: PathBuf,
    /// Archive file size in bytes
    pub archive_size: u64,
    /// Archive SHA-256 hash
    pub archive_hash: String,
    /// Total uncompressed size
    pub total_uncompressed_size: u64,
    /// Number of files
    pub file_count: usize,
    /// Compression type
    pub compression: String,
    /// Archive format
    pub format: String,
}

/// File entry in manifest
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileManifestEntry {
    /// File path relative to archive root
    pub path: PathBuf,
    /// File size in bytes
    pub size: u64,
    /// File modification time
    pub modified: DateTime<Utc>,
    /// SHA-256 hash of file contents
    pub hash: String,
    /// File permissions (Unix only)
    #[cfg(unix)]
    pub permissions: u32,
}

impl Manifest {
    /// Create a new manifest
    pub fn new(
        archive_operation: &ArchiveOperation,
        files: &[FileInfo],
        archive_path: &Path,
    ) -> Result<Self> {
        let archive_manifest = ArchiveManifest {
            archive_path: archive_path.to_path_buf(),
            archive_size: archive_operation.total_size,
            archive_hash: archive_operation.archive_hash.clone(),
            total_uncompressed_size: files.iter().map(|f| f.size).sum(),
            file_count: files.len(),
            compression: "gzip".to_string(),
            format: "tar".to_string(),
        };

        let file_entries: Vec<FileManifestEntry> = files
            .iter()
            .map(|file| FileManifestEntry {
                path: file.path.clone(),
                size: file.size,
                modified: file.modified,
                hash: file.hash.clone(),
                #[cfg(unix)]
                permissions: file.permissions,
            })
            .collect();

        let mut manifest = Self {
            version: "1.0".to_string(),
            created: Utc::now(),
            archive: archive_manifest,
            files: file_entries,
            manifest_hash: String::new(), // Will be calculated after creation
        };

        // Calculate manifest hash
        manifest.manifest_hash = calculate_manifest_hash(&manifest)?;

        Ok(manifest)
    }

    /// Save manifest to file
    pub fn save(&self, path: &Path) -> Result<()> {
        let json = serde_json::to_string_pretty(self).map_err(|e| {
            FileOpsError::ManifestCreationFailed {
                message: format!("Failed to serialize manifest: {e}"),
            }
        })?;

        fs::write(path, json).map_err(|e| FileOpsError::IoError {
            message: format!("Failed to write manifest file: {e}"),
            source: e,
        })?;

        info!("Manifest saved to: {}", path.display());
        Ok(())
    }

    /// Load manifest from file
    pub fn load(path: &Path) -> Result<Self> {
        let content =
            fs::read_to_string(path).map_err(|e| FileOpsError::ManifestVerificationFailed {
                message: format!("Failed to read manifest file: {e}"),
            })?;

        let manifest: Manifest = serde_json::from_str(&content).map_err(|e| {
            FileOpsError::ManifestVerificationFailed {
                message: format!("Failed to parse manifest JSON: {e}"),
            }
        })?;

        info!("Manifest loaded from: {}", path.display());
        Ok(manifest)
    }

    /// Verify manifest integrity
    pub fn verify_integrity(&self) -> Result<()> {
        // Calculate current hash
        let current_hash = calculate_manifest_hash(self)?;

        // Compare with stored hash
        if current_hash != self.manifest_hash {
            return Err(FileOpsError::ManifestVerificationFailed {
                message: "Manifest hash verification failed".to_string(),
            });
        }

        info!("Manifest integrity verified");
        Ok(())
    }

    /// Get file entry by path
    pub fn get_file_entry(&self, path: &Path) -> Option<&FileManifestEntry> {
        self.files.iter().find(|entry| entry.path == path)
    }

    /// Check if file exists in manifest
    pub fn contains_file(&self, path: &Path) -> bool {
        self.get_file_entry(path).is_some()
    }

    /// Get total size of all files
    pub fn total_size(&self) -> u64 {
        self.files.iter().map(|f| f.size).sum()
    }

    /// Get file count
    pub fn file_count(&self) -> usize {
        self.files.len()
    }
}

/// Create manifest for archive
pub fn create_manifest_for_archive(
    archive_operation: &ArchiveOperation,
    files: &[FileInfo],
    manifest_path: Option<&Path>,
) -> Result<Manifest> {
    info!("Creating manifest for archive: {} files", files.len());

    let manifest = Manifest::new(archive_operation, files, &archive_operation.archive_path)?;

    // Save manifest if path provided
    if let Some(path) = manifest_path {
        manifest.save(path)?;
    }

    info!(
        "Manifest created successfully: {} files, {} bytes",
        manifest.file_count(),
        manifest.total_size()
    );

    Ok(manifest)
}

/// Verify manifest against extracted files
pub fn verify_manifest(
    manifest: &Manifest,
    extracted_files: &[FileInfo],
    _config: &FileOpsConfig,
) -> Result<()> {
    info!(
        "Verifying manifest against {} extracted files",
        extracted_files.len()
    );

    // Verify manifest integrity first
    manifest.verify_integrity()?;

    // Check file count
    if manifest.file_count() != extracted_files.len() {
        return Err(FileOpsError::ManifestVerificationFailed {
            message: format!(
                "File count mismatch: manifest has {}, extracted has {}",
                manifest.file_count(),
                extracted_files.len()
            ),
        });
    }

    // Verify each file
    for extracted_file in extracted_files {
        let manifest_entry = manifest
            .get_file_entry(&extracted_file.path)
            .ok_or_else(|| FileOpsError::ManifestVerificationFailed {
                message: format!(
                    "File not found in manifest: {}",
                    extracted_file.path.display()
                ),
            })?;

        // Verify file size
        if manifest_entry.size != extracted_file.size {
            return Err(FileOpsError::ManifestVerificationFailed {
                message: format!(
                    "File size mismatch for {}: manifest has {}, extracted has {}",
                    extracted_file.path.display(),
                    manifest_entry.size,
                    extracted_file.size
                ),
            });
        }

        // Verify file hash
        if manifest_entry.hash != extracted_file.hash {
            return Err(FileOpsError::ManifestVerificationFailed {
                message: format!(
                    "File hash mismatch for {}: manifest has {}, extracted has {}",
                    extracted_file.path.display(),
                    manifest_entry.hash,
                    extracted_file.hash
                ),
            });
        }

        // Verify file permissions (Unix only)
        #[cfg(unix)]
        {
            if manifest_entry.permissions != extracted_file.permissions {
                warn!(
                    "File permissions mismatch for {}: manifest has {:o}, extracted has {:o}",
                    extracted_file.path.display(),
                    manifest_entry.permissions,
                    extracted_file.permissions
                );
            }
        }
    }

    info!("Manifest verification completed successfully");
    Ok(())
}

/// Extract and verify archive with manifest
pub fn extract_and_verify_archive(
    archive_path: &Path,
    manifest_path: &Path,
    output_dir: &Path,
    config: &FileOpsConfig,
) -> Result<Vec<FileInfo>> {
    info!(
        "Extracting and verifying archive: {} -> {}",
        archive_path.display(),
        output_dir.display()
    );

    // Load manifest
    let manifest = Manifest::load(manifest_path)?;

    // Verify manifest integrity
    manifest.verify_integrity()?;

    // Extract archive
    let extracted_files = extract_archive(archive_path, output_dir, config)?;

    // Verify extracted files against manifest
    verify_manifest(&manifest, &extracted_files, config)?;

    info!(
        "Archive extraction and verification completed: {} files",
        extracted_files.len()
    );
    Ok(extracted_files)
}

/// Create manifest from archive (without external manifest file)
pub fn create_manifest_from_archive(
    archive_path: &Path,
    config: &FileOpsConfig,
) -> Result<Manifest> {
    info!("Creating manifest from archive: {}", archive_path.display());

    // Extract archive to temporary directory
    let temp_dir = tempfile::tempdir().map_err(|e| FileOpsError::ManifestCreationFailed {
        message: format!("Failed to create temporary directory: {e}"),
    })?;

    let extracted_files = extract_archive(archive_path, temp_dir.path(), config)?;

    // Calculate archive hash
    let archive_hash = calculate_file_hash(archive_path)?;

    // Get archive metadata
    let archive_metadata = fs::metadata(archive_path).map_err(|_e| FileOpsError::FileNotFound {
        path: archive_path.to_path_buf(),
    })?;

    // Create archive operation info
    let archive_operation = ArchiveOperation {
        archive_path: archive_path.to_path_buf(),
        manifest_path: None,
        total_size: archive_metadata.len(),
        file_count: extracted_files.len(),
        created: chrono::DateTime::from(
            archive_metadata
                .modified()
                .unwrap_or_else(|_| std::time::SystemTime::now()),
        ),
        archive_hash,
    };

    // Create manifest
    let manifest = Manifest::new(&archive_operation, &extracted_files, archive_path)?;

    info!(
        "Manifest created from archive: {} files, {} bytes",
        manifest.file_count(),
        manifest.total_size()
    );

    Ok(manifest)
}

/// Calculate SHA-256 hash of manifest content
fn calculate_manifest_hash(manifest: &Manifest) -> Result<String> {
    use sha2::{Digest, Sha256};

    // Create a copy without the hash field for calculation
    let mut manifest_copy = manifest.clone();
    manifest_copy.manifest_hash = String::new();

    let json = serde_json::to_string(&manifest_copy).map_err(|e| {
        FileOpsError::ManifestCreationFailed {
            message: format!("Failed to serialize manifest for hash calculation: {e}"),
        }
    })?;

    let mut hasher = Sha256::new();
    hasher.update(json.as_bytes());
    let result = hasher.finalize();

    Ok(hex::encode(result))
}

/// Calculate SHA-256 hash of a file
fn calculate_file_hash(path: &Path) -> Result<String> {
    use sha2::{Digest, Sha256};

    let mut file = File::open(path).map_err(|_e| FileOpsError::FileNotFound {
        path: path.to_path_buf(),
    })?;

    let mut hasher = Sha256::new();
    let mut buffer = [0; 8192];

    loop {
        let n = file
            .read(&mut buffer)
            .map_err(|e| FileOpsError::HashCalculationFailed {
                message: format!("Failed to read file: {e}"),
            })?;

        if n == 0 {
            break;
        }

        hasher.update(&buffer[..n]);
    }

    let result = hasher.finalize();
    Ok(hex::encode(result))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::file_ops::{create_archive, FileSelection};
    use std::fs;
    use std::io::Write;
    use std::path::PathBuf;
    use tempfile::tempdir;

    fn create_test_file(dir: &Path, name: &str, content: &str) -> PathBuf {
        let file_path = dir.join(name);
        let mut file = fs::File::create(&file_path).unwrap();
        file.write_all(content.as_bytes()).unwrap();
        file_path
    }

    #[test]
    fn test_create_manifest() {
        let temp_dir = tempdir().unwrap();
        let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
        let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2");

        let selection = FileSelection::Files(vec![file1, file2]);
        let archive_path = temp_dir.path().join("test.tar.gz");
        let config = FileOpsConfig::default();

        // Create archive
        let archive_operation = create_archive(&selection, &archive_path, &config).unwrap();

        // Create file infos
        let file_infos = vec![
            FileInfo {
                path: PathBuf::from("test1.txt"),
                size: 8,
                modified: Utc::now(),
                hash: "hash1".to_string(),
                #[cfg(unix)]
                permissions: 0o644,
            },
            FileInfo {
                path: PathBuf::from("test2.txt"),
                size: 8,
                modified: Utc::now(),
                hash: "hash2".to_string(),
                #[cfg(unix)]
                permissions: 0o644,
            },
        ];

        // Create manifest
        let manifest = Manifest::new(&archive_operation, &file_infos, &archive_path).unwrap();

        assert_eq!(manifest.file_count(), 2);
        assert_eq!(manifest.total_size(), 16);
        assert!(!manifest.manifest_hash.is_empty());
    }

    #[test]
    fn test_save_and_load_manifest() {
        let temp_dir = tempdir().unwrap();
        let manifest_path = temp_dir.path().join("manifest.json");

        // Create a simple manifest
        let archive_operation = ArchiveOperation {
            archive_path: PathBuf::from("test.tar.gz"),
            manifest_path: None,
            total_size: 100,
            file_count: 1,
            created: Utc::now(),
            archive_hash: "test_hash".to_string(),
        };

        let file_infos = vec![FileInfo {
            path: PathBuf::from("test.txt"),
            size: 100,
            modified: Utc::now(),
            hash: "file_hash".to_string(),
            #[cfg(unix)]
            permissions: 0o644,
        }];

        let manifest = Manifest::new(
            &archive_operation,
            &file_infos,
            &PathBuf::from("test.tar.gz"),
        )
        .unwrap();

        // Save manifest
        manifest.save(&manifest_path).unwrap();
        assert!(manifest_path.exists());

        // Load manifest
        let loaded_manifest = Manifest::load(&manifest_path).unwrap();
        assert_eq!(loaded_manifest.file_count(), 1);
        assert_eq!(loaded_manifest.total_size(), 100);
    }

    #[test]
    fn test_manifest_integrity_verification() {
        let archive_operation = ArchiveOperation {
            archive_path: PathBuf::from("test.tar.gz"),
            manifest_path: None,
            total_size: 100,
            file_count: 1,
            created: Utc::now(),
            archive_hash: "test_hash".to_string(),
        };

        let file_infos = vec![FileInfo {
            path: PathBuf::from("test.txt"),
            size: 100,
            modified: Utc::now(),
            hash: "file_hash".to_string(),
            #[cfg(unix)]
            permissions: 0o644,
        }];

        let manifest = Manifest::new(
            &archive_operation,
            &file_infos,
            &PathBuf::from("test.tar.gz"),
        )
        .unwrap();

        // Verify integrity
        assert!(manifest.verify_integrity().is_ok());
    }
}
