//! Common test helper functions and utilities
//!
//! This module provides helper functions for:
//! - Enhanced assertions with better error messages
//! - Timing and performance measurement
//! - Parallel-safe file operations
//! - Test result validation

use std::fs;
use std::path::Path;
use std::time::{Duration, Instant};
// use assert2::assert; // Commented out to avoid conflicts
use super::TestSuiteConfig;

/// Enhanced assertion helper with descriptive error messages
pub struct TestAssertions;

impl TestAssertions {
    /// Assert that a file exists with a descriptive error message
    pub fn assert_file_exists<P: AsRef<Path>>(path: P, context: &str) {
        let path = path.as_ref();
        assert!(
            path.exists(),
            "{}: File should exist at {}",
            context,
            path.display()
        );
    }

    /// Assert that a file does not exist with a descriptive error message
    pub fn assert_file_not_exists<P: AsRef<Path>>(path: P, context: &str) {
        let path = path.as_ref();
        assert!(
            !path.exists(),
            "{}: File should not exist at {}",
            context,
            path.display()
        );
    }

    /// Assert that a directory exists with a descriptive error message
    pub fn assert_directory_exists<P: AsRef<Path>>(path: P, context: &str) {
        let path = path.as_ref();
        assert!(
            path.exists() && path.is_dir(),
            "{}: Directory should exist at {}",
            context,
            path.display()
        );
    }

    /// Assert that two files have the same content
    pub fn assert_files_equal<P1: AsRef<Path>, P2: AsRef<Path>>(
        file1: P1,
        file2: P2,
        context: &str,
    ) {
        let file1 = file1.as_ref();
        let file2 = file2.as_ref();

        let content1 = fs::read(file1).expect("Failed to read first file");
        let content2 = fs::read(file2).expect("Failed to read second file");

        assert!(
            content1 == content2,
            "{}: Files should have identical content. {} ({} bytes) vs {} ({} bytes)",
            context,
            file1.display(),
            content1.len(),
            file2.display(),
            content2.len()
        );
    }

    /// Assert that a file has the expected size
    pub fn assert_file_size<P: AsRef<Path>>(path: P, expected_size: u64, context: &str) {
        let path = path.as_ref();
        let metadata = fs::metadata(path).expect("Failed to get file metadata");
        let actual_size = metadata.len();

        assert!(
            actual_size == expected_size,
            "{}: File should have size {} bytes, but got {} bytes at {}",
            context,
            expected_size,
            actual_size,
            path.display()
        );
    }

    /// Assert that a result is Ok with a descriptive error message
    pub fn assert_ok<T, E: std::fmt::Debug>(result: Result<T, E>, context: &str) -> T {
        result.unwrap_or_else(|e| {
            panic!("{context}: Expected Ok result, but got Err: {e:?}");
        })
    }

    /// Assert that a result is Err with a descriptive error message
    pub fn assert_err<T: std::fmt::Debug, E: std::fmt::Debug>(
        result: Result<T, E>,
        context: &str,
    ) -> E {
        match result {
            Ok(t) => panic!("{context}: Expected Err result, but got Ok: {t:?}"),
            Err(e) => e,
        }
    }

    /// Assert that a value is within a range
    pub fn assert_in_range<T: PartialOrd + std::fmt::Display>(
        value: T,
        min: T,
        max: T,
        context: &str,
    ) {
        assert!(
            value >= min && value <= max,
            "{context}: Value {value} should be between {min} and {max}"
        );
    }
}

/// Performance measurement helper for tests
pub struct PerformanceHelper;

impl PerformanceHelper {
    /// Measure the execution time of a function
    pub fn measure_time<F, R>(func: F) -> (R, Duration)
    where
        F: FnOnce() -> R,
    {
        let start = Instant::now();
        let result = func();
        let duration = start.elapsed();
        (result, duration)
    }

    /// Assert that a function executes within a time limit
    pub fn assert_within_time_limit<F, R>(func: F, max_duration: Duration, context: &str) -> R
    where
        F: FnOnce() -> R,
    {
        let (result, duration) = Self::measure_time(func);

        assert!(
            duration <= max_duration,
            "{context}: Function took {duration:?}, but should complete within {max_duration:?}"
        );

        result
    }

    /// Benchmark a function and return the average execution time
    pub fn benchmark<F>(func: F, iterations: usize) -> Duration
    where
        F: Fn() + Copy,
    {
        let mut total_duration = Duration::ZERO;

        for _ in 0..iterations {
            let (_, duration) = Self::measure_time(func);
            total_duration += duration;
        }

        total_duration / iterations as u32
    }
}

/// Parallel-safe file operation helpers
pub struct FileHelpers;

impl FileHelpers {
    /// Create a unique temporary file that won't conflict with parallel tests
    pub fn create_unique_temp_file(
        config: &TestSuiteConfig,
        extension: &str,
    ) -> std::path::PathBuf {
        let filename = format!("temp_{}.{}", config.test_id, extension);
        config.unique_path(&filename)
    }

    /// Create a unique temporary directory that won't conflict with parallel tests
    pub fn create_unique_temp_dir(config: &TestSuiteConfig, name: &str) -> std::path::PathBuf {
        let dirname = format!("temp_dir_{}_{}", config.test_id, name);
        let dir_path = config.unique_path(&dirname);
        fs::create_dir_all(&dir_path).expect("Failed to create temp directory");
        dir_path
    }

    /// Safely copy a file to a unique location
    pub fn copy_file_safely<P: AsRef<Path>>(
        source: P,
        config: &TestSuiteConfig,
        name: &str,
    ) -> std::path::PathBuf {
        let source = source.as_ref();
        let dest = config.unique_path(name);
        fs::copy(source, &dest).expect("Failed to copy file");
        dest
    }

    /// Recursively copy a directory to a unique location
    pub fn copy_dir_safely<P: AsRef<Path>>(
        source: P,
        config: &TestSuiteConfig,
        name: &str,
    ) -> std::path::PathBuf {
        let source = source.as_ref();
        let dest = config.unique_path(name);

        if source.is_dir() {
            fs::create_dir_all(&dest).expect("Failed to create destination directory");

            for entry in fs::read_dir(source).expect("Failed to read source directory") {
                let entry = entry.expect("Failed to read directory entry");
                let entry_path = entry.path();
                let dest_path = dest.join(entry.file_name());

                if entry_path.is_dir() {
                    Self::copy_dir_safely(entry_path, config, &dest_path.to_string_lossy());
                } else {
                    fs::copy(entry_path, dest_path).expect("Failed to copy file");
                }
            }
        }

        dest
    }

    /// Clean up a file or directory safely
    pub fn cleanup_safely<P: AsRef<Path>>(path: P) {
        let path = path.as_ref();
        if path.exists() {
            if path.is_dir() {
                fs::remove_dir_all(path).ok();
            } else {
                fs::remove_file(path).ok();
            }
        }
    }
}

/// Test result validation helpers
pub struct ValidationHelpers;

impl ValidationHelpers {
    /// Validate that a key pair is properly formatted
    pub fn validate_key_pair_format(
        key_pair: &barqly_vault_lib::services::crypto::infrastructure::KeyPair,
    ) -> bool {
        let public_key = &key_pair.public_key;
        let private_key = &key_pair.private_key;

        // Check that public key starts with age1
        public_key.as_str().starts_with("age1") &&
        // Check that private key starts with AGE-SECRET-KEY-1
        private_key.expose_secret().starts_with("AGE-SECRET-KEY-1")
    }

    /// Validate that a manifest contains expected files
    pub fn validate_manifest_files(
        manifest: &barqly_vault_lib::services::file::infrastructure::file_operations::archive_manifest::Manifest,
        expected_files: &[&str],
    ) -> bool {
        let manifest_files: Vec<String> = manifest
            .files
            .iter()
            .map(|entry| entry.path.to_string_lossy().to_string())
            .collect();

        expected_files.iter().all(|expected| {
            manifest_files
                .iter()
                .any(|actual| actual.contains(expected))
        })
    }

    /// Validate that an archive contains expected files
    pub fn validate_archive_contents<P: AsRef<Path>>(
        archive_path: P,
        expected_files: &[&str],
    ) -> bool {
        let archive_path = archive_path.as_ref();
        let file = fs::File::open(archive_path).expect("Failed to open archive");
        let gz = flate2::read::GzDecoder::new(file);
        let mut tar = tar::Archive::new(gz);

        let archive_files: Vec<String> = tar
            .entries()
            .expect("Failed to read archive entries")
            .filter_map(|entry| {
                entry
                    .ok()
                    .map(|entry| entry.path().unwrap().to_string_lossy().to_string())
            })
            .collect();

        expected_files
            .iter()
            .all(|expected| archive_files.iter().any(|actual| actual.contains(expected)))
    }
}

/// Test data generation helpers
pub struct DataHelpers;

impl DataHelpers {
    /// Generate random test data of specified size
    pub fn generate_random_data(size: usize) -> Vec<u8> {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        (0..size).map(|_| rng.r#gen()).collect()
    }

    /// Generate deterministic test data for reproducible tests
    pub fn generate_deterministic_data(size: usize, seed: u64) -> Vec<u8> {
        use rand::rngs::StdRng;
        use rand::{Rng, SeedableRng};

        let mut rng = StdRng::seed_from_u64(seed);
        (0..size).map(|_| rng.r#gen()).collect()
    }

    /// Create a test file with specific content
    pub fn create_test_file_with_content<P: AsRef<Path>>(
        path: P,
        content: &str,
    ) -> std::path::PathBuf {
        let path = path.as_ref();
        fs::write(path, content).expect("Failed to create test file");
        path.to_path_buf()
    }

    /// Create a test file with random content
    pub fn create_test_file_with_random_content<P: AsRef<Path>>(
        path: P,
        size: usize,
    ) -> std::path::PathBuf {
        let path = path.as_ref();
        let data = Self::generate_random_data(size);
        fs::write(path, data).expect("Failed to create test file");
        path.to_path_buf()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_assertions_file_exists() {
        let config = TestSuiteConfig::new();
        let test_file = config.unique_path("test_assert.txt");
        fs::write(&test_file, "test content").expect("Failed to create test file");

        TestAssertions::assert_file_exists(&test_file, "Test context");
    }

    #[test]
    fn test_performance_helper_measure_time() {
        let (_, duration) = PerformanceHelper::measure_time(|| {
            std::thread::sleep(Duration::from_millis(10));
        });

        assert!(duration >= Duration::from_millis(10));
    }

    #[test]
    fn test_file_helpers_create_unique_temp_file() {
        let config = TestSuiteConfig::new();
        let temp_file = FileHelpers::create_unique_temp_file(&config, "txt");

        assert!(temp_file.extension().unwrap() == "txt");
        assert!(temp_file.to_string_lossy().contains(&config.test_id));
    }

    #[test]
    fn test_data_helpers_generate_deterministic_data() {
        let data1 = DataHelpers::generate_deterministic_data(100, 42);
        let data2 = DataHelpers::generate_deterministic_data(100, 42);

        assert_eq!(data1, data2);
    }
}
