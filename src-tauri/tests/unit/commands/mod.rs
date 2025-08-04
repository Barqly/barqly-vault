//! Unit tests for commands module
//!
//! This module provides comprehensive unit testing for:
//! - Command types and error handling
//! - Input validation logic
//! - Command result serialization/deserialization
//! - Error code mapping and formatting
//! - Progress update structures

pub mod output_path_tests;
pub mod types_tests;
pub mod validation_tests;

use std::collections::HashMap;
use std::time::Duration;

/// Commands unit test suite configuration
pub struct CommandsUnitTestSuite {
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

impl Default for CommandsUnitTestSuite {
    fn default() -> Self {
        Self::new()
    }
}

impl CommandsUnitTestSuite {
    /// Create a new commands unit test suite
    pub fn new() -> Self {
        Self {
            test_results: HashMap::new(),
        }
    }

    /// Run all commands unit tests
    pub fn run_all_tests(&mut self) -> Result<TestSuiteSummary, Box<dyn std::error::Error>> {
        self.setup()?;

        let start_time = std::time::Instant::now();

        // Run test modules
        let test_modules = vec![
            ("types", self.run_types_tests()),
            ("validation", self.run_validation_tests()),
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

    /// Run types module unit tests
    fn run_types_tests(&self) -> Vec<TestResult> {
        // This would be populated with actual test execution
        // For now, return empty results as the actual tests are in separate files
        Vec::new()
    }

    /// Run validation module unit tests
    fn run_validation_tests(&self) -> Vec<TestResult> {
        // This would be populated with actual test execution
        // For now, return empty results as the actual tests are in separate files
        Vec::new()
    }

    fn setup(&self) -> Result<(), Box<dyn std::error::Error>> {
        // Setup test environment
        Ok(())
    }

    fn teardown(&self) -> Result<(), Box<dyn std::error::Error>> {
        // Cleanup test environment
        Ok(())
    }
}

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
    pub fn success_rate(&self) -> f64 {
        if self.total_tests == 0 {
            0.0
        } else {
            self.passed as f64 / self.total_tests as f64
        }
    }

    pub fn is_successful(&self) -> bool {
        self.failed == 0 && self.total_tests > 0
    }
}
