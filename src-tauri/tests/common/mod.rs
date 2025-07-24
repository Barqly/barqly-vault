//! Common test utilities and setup for the Barqly Vault test suite
//!
//! This module provides shared functionality for all test types:
//! - Test suite setup and teardown
//! - Test data factories
//! - Common test helpers
//! - Parallel-safe test utilities

pub mod cleanup;
pub mod fixtures;
pub mod helpers;

use std::path::PathBuf;
use std::sync::Once;
use tempfile::{tempdir, TempDir};

// Type aliases to reduce complexity
type SetupFn = Box<dyn Fn() -> Result<(), Box<dyn std::error::Error>>>;
type TeardownFn = Box<dyn Fn() -> Result<(), Box<dyn std::error::Error>>>;

static INIT: Once = Once::new();

/// Initialize the test environment once for the entire test suite
pub fn init_test_environment() {
    INIT.call_once(|| {
        // Set up logging for tests
        tracing_subscriber::fmt()
            .with_env_filter("debug")
            .with_test_writer()
            .init();
    });
}

/// Test suite configuration for parallel execution
pub struct TestSuiteConfig {
    /// Unique identifier for this test run
    pub test_id: String,
    /// Temporary directory for this test
    pub temp_dir: TempDir,
    /// Whether tests should run in parallel
    pub parallel: bool,
}

impl Default for TestSuiteConfig {
    fn default() -> Self {
        Self::new()
    }
}

impl TestSuiteConfig {
    /// Create a new test suite configuration with unique identifiers
    pub fn new() -> Self {
        let test_id = format!(
            "test_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );

        Self {
            test_id,
            temp_dir: tempdir().expect("Failed to create temp directory"),
            parallel: true,
        }
    }

    /// Get a unique path for this test
    pub fn unique_path(&self, name: &str) -> PathBuf {
        self.temp_dir
            .path()
            .join(format!("{}_{}", self.test_id, name))
    }

    /// Get the temporary directory path
    pub fn temp_path(&self) -> PathBuf {
        self.temp_dir.path().to_path_buf()
    }
}

/// Test suite setup trait for consistent test lifecycle management
pub trait TestSuite {
    /// Set up the test suite before running tests
    fn setup(&mut self) -> Result<(), Box<dyn std::error::Error>>;

    /// Clean up after tests complete
    fn teardown(&mut self) -> Result<(), Box<dyn std::error::Error>>;

    /// Get the test configuration
    fn config(&self) -> &TestSuiteConfig;
}

/// Default implementation for test suites
pub struct DefaultTestSuite {
    config: TestSuiteConfig,
}

impl Default for DefaultTestSuite {
    fn default() -> Self {
        Self::new()
    }
}

impl DefaultTestSuite {
    pub fn new() -> Self {
        Self {
            config: TestSuiteConfig::new(),
        }
    }
}

impl TestSuite for DefaultTestSuite {
    fn setup(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        init_test_environment();
        Ok(())
    }

    fn teardown(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        // Cleanup is handled automatically by TempDir
        Ok(())
    }

    fn config(&self) -> &TestSuiteConfig {
        &self.config
    }
}

/// Macro to create a test suite with automatic setup/teardown
#[macro_export]
macro_rules! test_suite {
    ($name:ident, $body:block) => {
        #[test]
        fn $name() {
            let mut suite = DefaultTestSuite::new();
            suite.setup().expect("Test suite setup failed");

            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| $body));

            suite.teardown().expect("Test suite teardown failed");

            if let Err(e) = result {
                std::panic::resume_unwind(e);
            }
        }
    };
}

/// Macro for parameterized tests using rstest
#[macro_export]
macro_rules! parameterized_test {
    ($name:ident, $cases:expr, $body:block) => {
        #[rstest]
        #[case($cases)]
        fn $name(#[case] case: TestCase) {
            let mut suite = DefaultTestSuite::new();
            suite.setup().expect("Test suite setup failed");

            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| $body));

            suite.teardown().expect("Test suite teardown failed");

            if let Err(e) = result {
                std::panic::resume_unwind(e);
            }
        }
    };
}

/// Test case structure for parameterized tests
pub struct TestCase {
    pub name: String,
    pub description: String,
    pub setup: Option<SetupFn>,
    pub teardown: Option<TeardownFn>,
}

impl TestCase {
    pub fn new(name: &str, description: &str) -> Self {
        Self {
            name: name.to_string(),
            description: description.to_string(),
            setup: None,
            teardown: None,
        }
    }

    pub fn with_setup<F>(mut self, setup: F) -> Self
    where
        F: Fn() -> Result<(), Box<dyn std::error::Error>> + 'static,
    {
        self.setup = Some(Box::new(setup));
        self
    }

    pub fn with_teardown<F>(mut self, teardown: F) -> Self
    where
        F: Fn() -> Result<(), Box<dyn std::error::Error>> + 'static,
    {
        self.teardown = Some(Box::new(teardown));
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_suite_config_creates_unique_paths() {
        let config1 = TestSuiteConfig::new();
        let config2 = TestSuiteConfig::new();

        let path1 = config1.unique_path("test");
        let path2 = config2.unique_path("test");

        assert_ne!(path1, path2);
    }

    #[test]
    fn test_suite_lifecycle() {
        let mut suite = DefaultTestSuite::new();

        assert!(suite.setup().is_ok());
        assert!(suite.teardown().is_ok());
    }
}
