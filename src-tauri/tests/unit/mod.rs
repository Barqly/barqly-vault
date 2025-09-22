//! Unit test suite runner for Barqly Vault
//!
//! This module provides:
//! - Hierarchical organization of unit tests by module
//! - Test suite setup and teardown

// Unit test runner files are allowed to use println! for test reporting
#![allow(clippy::disallowed_macros)]
//! - Parallel execution configuration
//! - Test result aggregation

pub mod commands;
pub mod crypto;
pub mod file_ops;
pub mod logging;
pub mod storage;

use super::common::{TestSuite, TestSuiteConfig};
use std::collections::HashMap;
use std::time::Duration;

/// Unit test suite configuration
pub struct UnitTestSuite {
    config: TestSuiteConfig,
    test_results: HashMap<String, TestResult>,
}

#[derive(Debug, Clone)]
pub struct TestResult {
    pub name: String,
    pub duration: Duration,
    pub status: TestStatus,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum TestStatus {
    Passed,
    Failed,
    Skipped,
}

impl Default for UnitTestSuite {
    fn default() -> Self {
        Self::new()
    }
}

impl UnitTestSuite {
    /// Create a new unit test suite
    pub fn new() -> Self {
        Self {
            config: TestSuiteConfig::new(),
            test_results: HashMap::new(),
        }
    }

    /// Run all unit tests in parallel
    pub fn run_all_tests(&mut self) -> Result<TestSuiteSummary, Box<dyn std::error::Error>> {
        self.setup()?;

        let start_time = std::time::Instant::now();

        // Run tests in parallel using rayon
        let test_modules = vec![
            ("commands", self.run_commands_tests()),
            ("crypto", self.run_crypto_tests()),
            ("file_ops", self.run_file_ops_tests()),
            ("storage", self.run_storage_tests()),
            ("logging", self.run_logging_tests()),
        ];

        let mut total_passed = 0;
        let mut total_failed = 0;
        let mut total_skipped = 0;

        for (_module_name, module_results) in test_modules {
            for result in module_results {
                self.test_results
                    .insert(result.name.clone(), result.clone());

                match result.status {
                    TestStatus::Passed => total_passed += 1,
                    TestStatus::Failed => total_failed += 1,
                    TestStatus::Skipped => total_skipped += 1,
                }
            }
        }

        let total_duration = start_time.elapsed();

        self.teardown()?;

        Ok(TestSuiteSummary {
            total_tests: total_passed + total_failed + total_skipped,
            passed: total_passed,
            failed: total_failed,
            skipped: total_skipped,
            duration: total_duration,
            test_results: self.test_results.clone(),
        })
    }

    /// Run crypto module unit tests
    fn run_crypto_tests(&self) -> Vec<TestResult> {
        // Import and run crypto tests
        // use crypto::*;

        // This would be populated with actual test execution
        // For now, return empty results as the actual tests are in separate files
        Vec::new()
    }

    /// Run file operations module unit tests
    fn run_file_ops_tests(&self) -> Vec<TestResult> {
        // Import and run file_ops tests
        // use file_ops::*;

        // This would be populated with actual test execution
        Vec::new()
    }

    /// Run storage module unit tests
    fn run_storage_tests(&self) -> Vec<TestResult> {
        // Import and run storage tests
        // use storage::*;

        // This would be populated with actual test execution
        Vec::new()
    }

    /// Run commands module unit tests
    fn run_commands_tests(&self) -> Vec<TestResult> {
        // Import and run commands tests
        // use commands::*;

        // This would be populated with actual test execution
        Vec::new()
    }

    /// Run logging module unit tests
    fn run_logging_tests(&self) -> Vec<TestResult> {
        // Import and run logging tests
        // use logging::*;

        // This would be populated with actual test execution
        Vec::new()
    }

    /// Get test results for a specific module
    pub fn get_module_results(&self, module_name: &str) -> Vec<&TestResult> {
        self.test_results
            .values()
            .filter(|result| result.name.starts_with(module_name))
            .collect()
    }

    /// Get failed tests
    pub fn get_failed_tests(&self) -> Vec<&TestResult> {
        self.test_results
            .values()
            .filter(|result| result.status == TestStatus::Failed)
            .collect()
    }

    /// Get slow tests (taking longer than threshold)
    pub fn get_slow_tests(&self, threshold: Duration) -> Vec<&TestResult> {
        self.test_results
            .values()
            .filter(|result| result.duration > threshold)
            .collect()
    }
}

impl TestSuite for UnitTestSuite {
    fn setup(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        // Initialize test environment
        super::common::init_test_environment();

        // Set up any global test state
        Ok(())
    }

    fn teardown(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        // Clean up any global test state
        self.test_results.clear();
        Ok(())
    }

    fn config(&self) -> &TestSuiteConfig {
        &self.config
    }
}

/// Summary of unit test suite execution
#[derive(Debug, Clone)]
pub struct TestSuiteSummary {
    pub total_tests: usize,
    pub passed: usize,
    pub failed: usize,
    pub skipped: usize,
    pub duration: Duration,
    pub test_results: HashMap<String, TestResult>,
}

impl TestSuiteSummary {
    /// Check if all tests passed
    pub fn all_passed(&self) -> bool {
        self.failed == 0 && self.skipped == 0
    }

    /// Get success rate as percentage
    pub fn success_rate(&self) -> f64 {
        if self.total_tests == 0 {
            0.0
        } else {
            (self.passed as f64 / self.total_tests as f64) * 100.0
        }
    }

    /// Print summary to console
    pub fn print_summary(&self) {
        println!("=== Unit Test Suite Summary ===");
        println!("Total Tests: {}", self.total_tests);
        println!("Passed: {}", self.passed);
        println!("Failed: {}", self.failed);
        println!("Skipped: {}", self.skipped);
        println!("Success Rate: {:.1}%", self.success_rate());
        println!("Duration: {:?}", self.duration);

        if self.failed > 0 {
            println!("\nFailed Tests:");
            for result in self
                .test_results
                .values()
                .filter(|r| r.status == TestStatus::Failed)
            {
                println!("  - {}: {:?}", result.name, result.error_message);
            }
        }
    }
}

/// Macro to create a unit test with automatic setup/teardown
#[macro_export]
macro_rules! unit_test {
    ($name:ident, $body:block) => {
        #[test]
        fn $name() {
            let mut suite = UnitTestSuite::new();
            suite.setup().expect("Unit test suite setup failed");

            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| $body));

            suite.teardown().expect("Unit test suite teardown failed");

            if let Err(e) = result {
                std::panic::resume_unwind(e);
            }
        }
    };
}

/// Macro for parameterized unit tests
#[macro_export]
macro_rules! parameterized_unit_test {
    ($name:ident, $cases:expr, $body:block) => {
        #[rstest]
        #[case($cases)]
        fn $name(#[case] case: $crate::common::TestCase) {
            let mut suite = UnitTestSuite::new();
            suite.setup().expect("Unit test suite setup failed");

            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| $body));

            suite.teardown().expect("Unit test suite teardown failed");

            if let Err(e) = result {
                std::panic::resume_unwind(e);
            }
        }
    };
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_unit_test_suite_creation() {
        let suite = UnitTestSuite::new();
        assert!(suite.config().parallel);
    }

    #[test]
    fn test_test_suite_summary_calculation() {
        let summary = TestSuiteSummary {
            total_tests: 10,
            passed: 8,
            failed: 1,
            skipped: 1,
            duration: Duration::from_secs(5),
            test_results: HashMap::new(),
        };

        assert_eq!(summary.success_rate(), 80.0);
        assert!(!summary.all_passed());
    }

    #[test]
    fn test_unit_test_suite_lifecycle() {
        let mut suite = UnitTestSuite::new();

        assert!(suite.setup().is_ok());
        assert!(suite.teardown().is_ok());
    }
}
