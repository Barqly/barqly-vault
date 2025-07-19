//! Test data factories for creating consistent, isolated test data
//!
//! This module provides factories for creating test data that is:
//! - Isolated: Each test gets its own data
//! - Consistent: Same structure across test runs
//! - Parallel-safe: No shared state between tests

use super::TestSuiteConfig;
use barqly_vault_lib::crypto::{generate_keypair, KeyPair};
use barqly_vault_lib::storage::{save_encrypted_key, KeyInfo};
use secrecy::SecretString;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

/// Test data factory for creating crypto-related test data
pub struct CryptoFixtures;

impl CryptoFixtures {
    /// Create a test key pair with a given label
    pub fn create_test_key_pair(_label: &str) -> KeyPair {
        generate_keypair().expect("Failed to generate test key pair")
    }

    /// Create multiple test key pairs for testing key management
    pub fn create_test_key_pairs(count: usize) -> Vec<KeyPair> {
        (0..count)
            .map(|i| Self::create_test_key_pair(&format!("test_key_{i}")))
            .collect()
    }

    /// Create a test passphrase
    pub fn create_test_passphrase() -> SecretString {
        SecretString::new("test_passphrase_123".to_string())
    }

    /// Create test passphrases with different strengths
    pub fn create_test_passphrases() -> HashMap<String, SecretString> {
        let mut passphrases = HashMap::new();
        passphrases.insert("weak".to_string(), SecretString::new("123".to_string()));
        passphrases.insert(
            "medium".to_string(),
            SecretString::new("test_pass_123".to_string()),
        );
        passphrases.insert(
            "strong".to_string(),
            SecretString::new("SuperSecurePassphrase123!@#".to_string()),
        );
        passphrases
    }
}

/// Test data factory for creating file system test data
pub struct FileSystemFixtures;

impl FileSystemFixtures {
    /// Create a temporary directory structure for testing
    pub fn create_test_directory_structure(config: &TestSuiteConfig) -> PathBuf {
        let base_dir = config.unique_path("test_files");
        fs::create_dir_all(&base_dir).expect("Failed to create test directory");

        // Create subdirectories
        let subdirs = vec!["documents", "images", "backup"];
        for subdir in subdirs {
            let subdir_path = base_dir.join(subdir);
            fs::create_dir_all(&subdir_path).expect("Failed to create subdirectory");
        }

        base_dir
    }

    /// Create test files with different content types
    pub fn create_test_files(config: &TestSuiteConfig) -> Vec<PathBuf> {
        let base_dir = Self::create_test_directory_structure(config);
        let mut files = Vec::new();

        // Create text files
        let text_files = vec![
            ("documents/readme.txt", "This is a test readme file."),
            (
                "documents/config.json",
                r#"{"setting": "value", "enabled": true}"#,
            ),
            ("backup/wallet.dat", "mock_wallet_data_here"),
        ];

        for (relative_path, content) in text_files {
            let file_path = base_dir.join(relative_path);
            fs::write(&file_path, content).expect("Failed to create test file");
            files.push(file_path);
        }

        // Create binary file (simulated)
        let binary_path = base_dir.join("images/icon.png");
        let binary_data = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]; // PNG header
        fs::write(&binary_path, binary_data).expect("Failed to create binary test file");
        files.push(binary_path);

        files
    }

    /// Create a large test file for performance testing
    pub fn create_large_test_file(config: &TestSuiteConfig, size_mb: usize) -> PathBuf {
        let file_path = config.unique_path("large_file.dat");
        let data = vec![0x42; size_mb * 1024 * 1024]; // Create file with specified size
        fs::write(&file_path, data).expect("Failed to create large test file");
        file_path
    }

    /// Create test files with specific extensions
    pub fn create_files_by_extension(
        config: &TestSuiteConfig,
        extensions: &[&str],
    ) -> Vec<PathBuf> {
        let base_dir = config.unique_path("extension_test");
        fs::create_dir_all(&base_dir).expect("Failed to create extension test directory");

        extensions
            .iter()
            .map(|ext| {
                let file_path = base_dir.join(format!("test_file.{ext}"));
                let content = format!("Test content for .{ext} file");
                fs::write(&file_path, content).expect("Failed to create extension test file");
                file_path
            })
            .collect()
    }
}

/// Test data factory for creating storage-related test data
pub struct StorageFixtures;

impl StorageFixtures {
    /// Create a test key store with sample keys
    pub fn create_test_key_store(_config: &TestSuiteConfig) -> Vec<KeyInfo> {
        // Create test keys and save them
        let test_keys = CryptoFixtures::create_test_key_pairs(3);
        let mut key_infos = Vec::new();

        for (i, key_pair) in test_keys.iter().enumerate() {
            let key_name = format!(
                "test_key_{}_{}",
                i,
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            );
            let encrypted_key = b"mock_encrypted_key_data"; // In real test, this would be encrypted

            // Save the key (this would normally encrypt it)
            let key_path =
                save_encrypted_key(&key_name, encrypted_key, Some(key_pair.public_key.as_str()))
                    .expect("Failed to save test key");

            // Create key info using the actual saved path
            key_infos.push(KeyInfo::new(
                key_name,
                key_path,
                Some(key_pair.public_key.as_str().to_string()),
            ));
        }

        key_infos
    }

    /// Create test configuration data
    pub fn create_test_config() -> HashMap<String, serde_json::Value> {
        let mut config = HashMap::new();
        config.insert("max_file_size".to_string(), serde_json::json!(100_000_000)); // 100MB
        config.insert("compression_enabled".to_string(), serde_json::json!(true));
        config.insert("backup_manifest".to_string(), serde_json::json!(true));
        config
    }
}

/// Test data factory for creating manifest test data
pub struct ManifestFixtures;

impl ManifestFixtures {
    /// Create a test manifest with sample file entries
    pub fn create_test_manifest(
        config: &TestSuiteConfig,
    ) -> barqly_vault_lib::file_ops::manifest::Manifest {
        use barqly_vault_lib::file_ops::manifest::Manifest;
        use barqly_vault_lib::file_ops::{ArchiveOperation, FileInfo};
        use chrono::Utc;
        use std::path::PathBuf;

        // Create a test archive operation
        let archive_operation = ArchiveOperation {
            archive_path: config.unique_path("test_archive.tar.gz"),
            manifest_path: None,
            total_size: 1024,
            file_count: 1,
            created: Utc::now(),
            archive_hash: "test_hash".to_string(),
        };

        // Create test file info
        let file_info = FileInfo {
            path: PathBuf::from("test_file.txt"),
            size: 1024,
            modified: Utc::now(),
            hash: "test_file_hash".to_string(),
            #[cfg(unix)]
            permissions: 0o644,
        };

        // Create manifest using the proper API
        Manifest::new(
            &archive_operation,
            &[file_info],
            &archive_operation.archive_path,
        )
        .expect("Failed to create test manifest")
    }
}

/// Test data factory for creating archive test data
pub struct ArchiveFixtures;

impl ArchiveFixtures {
    /// Create a test archive with sample files
    pub fn create_test_archive(config: &TestSuiteConfig) -> PathBuf {
        let files = FileSystemFixtures::create_test_files(config);
        let archive_path = config.unique_path("test_archive.tar.gz");

        // Create tar archive
        let file = fs::File::create(&archive_path).expect("Failed to create archive file");
        let gz = flate2::write::GzEncoder::new(file, flate2::Compression::default());
        let mut tar = tar::Builder::new(gz);

        for file_path in files {
            let name = file_path.file_name().unwrap().to_string_lossy();
            tar.append_path_with_name(&file_path, &*name)
                .expect("Failed to add file to archive");
        }

        tar.finish().expect("Failed to finish archive");
        archive_path
    }
}

/// Test data factory for creating error condition test data
pub struct ErrorFixtures;

impl ErrorFixtures {
    /// Create a corrupted file for testing error handling
    pub fn create_corrupted_file(config: &TestSuiteConfig) -> PathBuf {
        let file_path = config.unique_path("corrupted.dat");
        let corrupted_data = vec![0xFF, 0xFE, 0xFD, 0xFC]; // Invalid data
        fs::write(&file_path, corrupted_data).expect("Failed to create corrupted file");
        file_path
    }

    /// Create a file with invalid permissions
    pub fn create_readonly_file(config: &TestSuiteConfig) -> PathBuf {
        let file_path = config.unique_path("readonly.txt");
        fs::write(&file_path, "readonly content").expect("Failed to create readonly file");

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&file_path).unwrap().permissions();
            perms.set_mode(0o444); // Read-only
            fs::set_permissions(&file_path, perms).expect("Failed to set readonly permissions");
        }

        file_path
    }

    /// Create a non-existent path for testing file not found scenarios
    pub fn create_nonexistent_path(config: &TestSuiteConfig) -> PathBuf {
        config.unique_path("nonexistent_file.txt")
    }
}

/// Test data factory for creating performance test data
pub struct PerformanceFixtures;

impl PerformanceFixtures {
    /// Create files of various sizes for performance testing
    pub fn create_size_variants(config: &TestSuiteConfig) -> Vec<(PathBuf, usize)> {
        let sizes = vec![1, 10, 100, 1024]; // KB, 10KB, 100KB, 1MB
        let mut files = Vec::new();

        for size in sizes {
            let file_path = config.unique_path(&format!("size_variant_{size}kb.dat"));
            let data = vec![0x42; size * 1024]; // Create file with specified size in KB
            fs::write(&file_path, data).expect("Failed to create size variant file");
            files.push((file_path, size * 1024)); // Convert to bytes
        }

        files
    }

    /// Create many small files for testing bulk operations
    pub fn create_many_small_files(config: &TestSuiteConfig, count: usize) -> Vec<PathBuf> {
        let base_dir = config.unique_path("many_files");
        fs::create_dir_all(&base_dir).expect("Failed to create many files directory");

        (0..count)
            .map(|i| {
                let file_path = base_dir.join(format!("file_{i:04}.txt"));
                let content = format!("Content for file {i}");
                fs::write(&file_path, content).expect("Failed to create small file");
                file_path
            })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_crypto_fixtures_create_key_pairs() {
        let key_pairs = CryptoFixtures::create_test_key_pairs(3);
        assert_eq!(key_pairs.len(), 3);

        for key_pair in key_pairs.iter() {
            // Key pairs don't have labels in the current API
            assert!(key_pair.public_key.as_str().starts_with("age1"));
        }
    }

    #[test]
    fn test_file_system_fixtures_create_directory_structure() {
        let config = TestSuiteConfig::new();
        let base_dir = FileSystemFixtures::create_test_directory_structure(&config);

        assert!(base_dir.exists());
        assert!(base_dir.join("documents").exists());
        assert!(base_dir.join("images").exists());
        assert!(base_dir.join("backup").exists());
    }

    #[test]
    fn test_storage_fixtures_create_key_store() {
        let config = TestSuiteConfig::new();
        let key_infos = StorageFixtures::create_test_key_store(&config);

        assert_eq!(key_infos.len(), 3);
    }

    #[test]
    fn test_performance_fixtures_create_size_variants() {
        let config = TestSuiteConfig::new();
        let files = PerformanceFixtures::create_size_variants(&config);

        assert_eq!(files.len(), 4);
        for (file_path, expected_size) in files {
            let metadata = fs::metadata(&file_path).expect("Failed to get file metadata");
            assert_eq!(metadata.len() as usize, expected_size);
        }
    }
}
