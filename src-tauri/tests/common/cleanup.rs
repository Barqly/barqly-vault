//! Test cleanup utilities for Barqly Vault
//!
//! This module provides cleanup functionality to ensure test artifacts
//! are properly removed after test execution, similar to JUnit's @AfterClass.
//!
//! # Usage
//! ```rust
//! use crate::tests::common::cleanup::TestCleanup;
//!
//! fn example_usage() {
//!     let cleanup = TestCleanup::new();
//!     
//!     // Your test code here...
//!     
//!     // Cleanup will happen automatically when cleanup goes out of scope
//! }
//! ```

use std::sync::Once;
use std::time::{Duration, Instant};

use barqly_vault_lib::storage;

/// Global test cleanup state
static CLEANUP_INIT: Once = Once::new();
#[allow(dead_code)]
static mut TEST_ARTIFACTS: Vec<String> = Vec::new();

/// Test cleanup manager
///
/// Automatically cleans up test artifacts when dropped.
/// Similar to JUnit's @AfterClass but with automatic scope management.
pub struct TestCleanup {
    start_time: Instant,
    artifacts: Vec<String>,
}

impl TestCleanup {
    /// Create a new test cleanup instance
    pub fn new() -> Self {
        Self {
            start_time: Instant::now(),
            artifacts: Vec::new(),
        }
    }

    /// Create a new test cleanup instance with automatic key cleanup
    /// This is a convenience method that sets up common cleanup patterns
    pub fn with_auto_key_cleanup() -> Self {
        let mut cleanup = Self::new();

        // Pre-register any keys that match common test patterns
        if let Ok(keys_dir) = storage::get_keys_directory() {
            if keys_dir.exists() {
                // Register any existing test keys for cleanup
                if let Ok(entries) = std::fs::read_dir(&keys_dir) {
                    for entry in entries.flatten() {
                        let file_name = entry.file_name();
                        let file_name = file_name.to_string_lossy();

                        // Only register keys created in this session (recent test keys)
                        if file_name.contains("test_key_")
                            && file_name.contains(&format!(
                                "{}",
                                std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .unwrap()
                                    .as_secs()
                                    / 3600 // Within the current hour
                            ))
                        {
                            cleanup
                                .artifacts
                                .push(entry.path().to_string_lossy().to_string());
                        }
                    }
                }
            }
        }

        cleanup
    }

    /// Register a test artifact for cleanup
    pub fn register_artifact(&mut self, artifact_path: String) {
        self.artifacts.push(artifact_path);
    }

    /// Register a key label for cleanup
    pub fn register_key(&mut self, key_label: &str) {
        if let Ok(keys_dir) = storage::get_keys_directory() {
            let key_file = keys_dir.join(format!("barqly-{key_label}.agekey.enc"));
            let meta_file = keys_dir.join(format!("barqly-{key_label}.agekey.meta"));

            self.register_artifact(key_file.to_string_lossy().to_string());
            self.register_artifact(meta_file.to_string_lossy().to_string());
        }
    }

    /// Clean up all registered artifacts
    pub fn cleanup(&self) {
        for artifact in &self.artifacts {
            if let Err(e) = std::fs::remove_file(artifact) {
                eprintln!("Warning: Failed to clean up test artifact {artifact}: {e}");
            }
        }
    }

    /// Get test duration
    pub fn duration(&self) -> Duration {
        self.start_time.elapsed()
    }
}

impl Drop for TestCleanup {
    fn drop(&mut self) {
        self.cleanup();
    }
}

impl Default for TestCleanup {
    fn default() -> Self {
        Self::new()
    }
}

/// Global test suite cleanup
///
/// This should be called once at the end of the entire test suite
/// to clean up any remaining artifacts.
pub struct TestSuiteCleanup;

impl TestSuiteCleanup {
    /// Clean up all test artifacts from the entire test suite
    pub fn cleanup_all() {
        println!("🧹 Cleaning up test suite artifacts...");

        // Clean up all test keys
        if let Ok(keys_dir) = storage::get_keys_directory() {
            if let Ok(entries) = std::fs::read_dir(keys_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if let Some(file_name) = path.file_name() {
                        let file_name = file_name.to_string_lossy();

                        // Remove test keys (those with test-related names)
                        if file_name.contains("test")
                            || file_name.contains("key1")
                            || file_name.contains("key2")
                            || file_name.contains("key3")
                            || file_name.contains("concurrent")
                        {
                            if let Err(e) = std::fs::remove_file(&path) {
                                eprintln!("Warning: Failed to clean up test key {file_name}: {e}");
                            } else {
                                println!("  Cleaned up: {file_name}");
                            }
                        }
                    }
                }
            }
        }

        // Clean up any temporary files
        Self::cleanup_temp_files();

        println!("✅ Test suite cleanup complete");
    }

    /// Clean up temporary files created during testing
    fn cleanup_temp_files() {
        // Clean up any .tmp files in the project directory
        if let Ok(current_dir) = std::env::current_dir() {
            for entry in walkdir::WalkDir::new(&current_dir)
                .max_depth(3)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                let path = entry.path();
                if let Some(file_name) = path.file_name() {
                    let file_name = file_name.to_string_lossy();

                    // Remove temporary files
                    if file_name.ends_with(".tmp")
                        || file_name.ends_with(".temp")
                        || file_name.contains("test_")
                    {
                        if let Err(e) = std::fs::remove_file(path) {
                            eprintln!("Warning: Failed to clean up temp file {file_name}: {e}");
                        }
                    }
                }
            }
        }
    }
}

/// Initialize global test cleanup
pub fn init_test_cleanup() {
    CLEANUP_INIT.call_once(|| {
        // Register cleanup handler for when the process exits
        ctrlc::set_handler(|| {
            println!("\n🧹 Cleaning up test artifacts before exit...");
            TestSuiteCleanup::cleanup_all();
            std::process::exit(0);
        })
        .expect("Failed to set cleanup handler");
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cleanup_creation() {
        let cleanup = TestCleanup::new();
        assert!(cleanup.artifacts.is_empty());
    }

    #[test]
    fn test_artifact_registration() {
        let mut cleanup = TestCleanup::new();
        cleanup.register_artifact("/tmp/test_file.txt".to_string());
        assert_eq!(cleanup.artifacts.len(), 1);
        assert_eq!(cleanup.artifacts[0], "/tmp/test_file.txt");
    }

    #[test]
    fn test_key_registration() {
        let mut cleanup = TestCleanup::new();
        cleanup.register_key("test-key");
        assert_eq!(cleanup.artifacts.len(), 2); // .enc and .meta files
    }

    #[test]
    fn test_cleanup_duration() {
        let cleanup = TestCleanup::new();
        std::thread::sleep(Duration::from_millis(10));
        let duration = cleanup.duration();
        assert!(duration >= Duration::from_millis(10));
    }
}
