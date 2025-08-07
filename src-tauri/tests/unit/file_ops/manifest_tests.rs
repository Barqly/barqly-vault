//! Unit tests for archive manifest functionality

use barqly_vault_lib::file_ops::archive_manifest::*;
use barqly_vault_lib::file_ops::{
    create_archive, ArchiveOperation, FileInfo, FileOpsConfig, FileSelection,
};
use chrono::Utc;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
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
