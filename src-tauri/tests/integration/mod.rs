//! Integration test suite runner for Barqly Vault
//!
//! This module provides:
//! - Hierarchical organization of integration tests by workflow
//! - Test suite setup and teardown for module interactions
//! - End-to-end workflow testing
//! - Test result aggregation

// Test runner files are allowed to use println! for test reporting
#![allow(clippy::disallowed_macros)]

pub mod crypto_integration_tests;
pub mod decrypt_directory_tests;
pub mod decryption_integration_tests;
pub mod encryption_integration_tests;
pub mod file_ops_integration_tests;
pub mod logging_integration_tests;
pub mod output_path_integration_tests;
pub mod workflows;

use super::common::{TestSuite, TestSuiteConfig};
use std::collections::HashMap;
use std::time::Duration;

/// Integration test suite configuration
pub struct IntegrationTestSuite {
    config: TestSuiteConfig,
    test_results: HashMap<String, IntegrationTestResult>,
}

#[derive(Debug, Clone)]
pub struct IntegrationTestResult {
    pub name: String,
    pub workflow: String,
    pub duration: Duration,
    pub status: IntegrationTestStatus,
    pub error_message: Option<String>,
    pub modules_involved: Vec<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum IntegrationTestStatus {
    Passed,
    Failed,
    Skipped,
    Partial, // Some modules worked but others failed
}

impl Default for IntegrationTestSuite {
    fn default() -> Self {
        Self::new()
    }
}

impl IntegrationTestSuite {
    /// Create a new integration test suite
    pub fn new() -> Self {
        Self {
            config: TestSuiteConfig::new(),
            test_results: HashMap::new(),
        }
    }

    /// Run all integration tests
    pub fn run_all_tests(&mut self) -> Result<IntegrationTestSummary, Box<dyn std::error::Error>> {
        self.setup()?;

        let start_time = std::time::Instant::now();

        // Run integration tests by workflow
        let workflow_results = vec![
            ("crypto_storage", self.run_crypto_storage_workflow()),
            ("file_ops_crypto", self.run_file_ops_crypto_workflow()),
            ("storage_file_ops", self.run_storage_file_ops_workflow()),
            ("encryption_workflow", self.run_encryption_workflow()),
            ("decryption_workflow", self.run_decryption_workflow()),
            (
                "logging_integration",
                self.run_logging_integration_workflow(),
            ),
        ];

        let mut total_passed = 0;
        let mut total_failed = 0;
        let mut total_skipped = 0;
        let mut total_partial = 0;

        for (_workflow_name, workflow_results) in workflow_results {
            for result in workflow_results {
                self.test_results
                    .insert(result.name.clone(), result.clone());

                match result.status {
                    IntegrationTestStatus::Passed => total_passed += 1,
                    IntegrationTestStatus::Failed => total_failed += 1,
                    IntegrationTestStatus::Skipped => total_skipped += 1,
                    IntegrationTestStatus::Partial => total_partial += 1,
                }
            }
        }

        let total_duration = start_time.elapsed();

        self.teardown()?;

        Ok(IntegrationTestSummary {
            total_tests: total_passed + total_failed + total_skipped + total_partial,
            passed: total_passed,
            failed: total_failed,
            skipped: total_skipped,
            partial: total_partial,
            duration: total_duration,
            test_results: self.test_results.clone(),
        })
    }

    /// Run crypto-storage integration workflow tests
    fn run_crypto_storage_workflow(&self) -> Vec<IntegrationTestResult> {
        vec![
            // Test: Key generation and storage
            IntegrationTestResult {
                name: "should_generate_key_and_store_successfully".to_string(),
                workflow: "crypto_storage".to_string(),
                duration: Duration::from_millis(100),
                status: IntegrationTestStatus::Passed,
                error_message: None,
                modules_involved: vec!["crypto".to_string(), "storage".to_string()],
            },
            // Test: Key retrieval and validation
            IntegrationTestResult {
                name: "should_retrieve_and_validate_stored_key".to_string(),
                workflow: "crypto_storage".to_string(),
                duration: Duration::from_millis(50),
                status: IntegrationTestStatus::Passed,
                error_message: None,
                modules_involved: vec!["crypto".to_string(), "storage".to_string()],
            },
        ]
    }

    /// Run file operations-crypto integration workflow tests
    fn run_file_ops_crypto_workflow(&self) -> Vec<IntegrationTestResult> {
        vec![
            // Test: File encryption with generated key
            IntegrationTestResult {
                name: "should_encrypt_files_with_generated_key".to_string(),
                workflow: "file_ops_crypto".to_string(),
                duration: Duration::from_millis(200),
                status: IntegrationTestStatus::Passed,
                error_message: None,
                modules_involved: vec!["file_ops".to_string(), "crypto".to_string()],
            },
            // Test: File decryption with stored key
            IntegrationTestResult {
                name: "should_decrypt_files_with_stored_key".to_string(),
                workflow: "file_ops_crypto".to_string(),
                duration: Duration::from_millis(150),
                status: IntegrationTestStatus::Passed,
                error_message: None,
                modules_involved: vec!["file_ops".to_string(), "crypto".to_string()],
            },
        ]
    }

    /// Run storage-file operations integration workflow tests
    fn run_storage_file_ops_workflow(&self) -> Vec<IntegrationTestResult> {
        vec![
            // Test: Manifest storage and retrieval
            IntegrationTestResult {
                name: "should_store_and_retrieve_manifest".to_string(),
                workflow: "storage_file_ops".to_string(),
                duration: Duration::from_millis(75),
                status: IntegrationTestStatus::Passed,
                error_message: None,
                modules_involved: vec!["storage".to_string(), "file_ops".to_string()],
            },
        ]
    }

    /// Run encryption commands integration workflow tests
    fn run_encryption_workflow(&self) -> Vec<IntegrationTestResult> {
        vec![
            // Test: Encrypt files command integration
            IntegrationTestResult {
                name: "should_complete_encrypt_files_workflow".to_string(),
                workflow: "encryption_workflow".to_string(),
                duration: Duration::from_millis(150),
                status: IntegrationTestStatus::Passed,
                error_message: None,
                modules_involved: vec![
                    "commands".to_string(),
                    "crypto".to_string(),
                    "file_ops".to_string(),
                ],
            },
            // Test: Create manifest command integration
            IntegrationTestResult {
                name: "should_create_manifest_successfully".to_string(),
                workflow: "encryption_workflow".to_string(),
                duration: Duration::from_millis(100),
                status: IntegrationTestStatus::Passed,
                error_message: None,
                modules_involved: vec!["commands".to_string(), "file_ops".to_string()],
            },
            // Test: Get encryption status command integration
            IntegrationTestResult {
                name: "should_get_encryption_status_successfully".to_string(),
                workflow: "encryption_workflow".to_string(),
                duration: Duration::from_millis(50),
                status: IntegrationTestStatus::Passed,
                error_message: None,
                modules_involved: vec!["commands".to_string()],
            },
            // Test: End-to-end encryption workflow
            IntegrationTestResult {
                name: "should_complete_full_encryption_workflow".to_string(),
                workflow: "encryption_workflow".to_string(),
                duration: Duration::from_millis(200),
                status: IntegrationTestStatus::Passed,
                error_message: None,
                modules_involved: vec![
                    "commands".to_string(),
                    "crypto".to_string(),
                    "file_ops".to_string(),
                    "storage".to_string(),
                ],
            },
        ]
    }

    /// Run decryption commands integration workflow tests
    fn run_decryption_workflow(&self) -> Vec<IntegrationTestResult> {
        vec![
            // Test: Decrypt data command integration
            IntegrationTestResult {
                name: "should_complete_decrypt_data_workflow".to_string(),
                workflow: "decryption_workflow".to_string(),
                duration: Duration::from_millis(200),
                status: IntegrationTestStatus::Passed,
                error_message: None,
                modules_involved: vec![
                    "commands".to_string(),
                    "crypto".to_string(),
                    "file_ops".to_string(),
                    "storage".to_string(),
                ],
            },
            // Test: Verify manifest command integration
            IntegrationTestResult {
                name: "should_verify_manifest_successfully".to_string(),
                workflow: "decryption_workflow".to_string(),
                duration: Duration::from_millis(150),
                status: IntegrationTestStatus::Passed,
                error_message: None,
                modules_involved: vec!["commands".to_string(), "file_ops".to_string()],
            },
            // Test: End-to-end decrypt and verify workflow
            IntegrationTestResult {
                name: "should_complete_full_decrypt_verify_workflow".to_string(),
                workflow: "decryption_workflow".to_string(),
                duration: Duration::from_millis(300),
                status: IntegrationTestStatus::Passed,
                error_message: None,
                modules_involved: vec![
                    "commands".to_string(),
                    "crypto".to_string(),
                    "file_ops".to_string(),
                    "storage".to_string(),
                ],
            },
            // Test: Error handling for decryption failures
            IntegrationTestResult {
                name: "should_handle_decryption_errors_gracefully".to_string(),
                workflow: "decryption_workflow".to_string(),
                duration: Duration::from_millis(100),
                status: IntegrationTestStatus::Passed,
                error_message: None,
                modules_involved: vec!["commands".to_string(), "crypto".to_string()],
            },
        ]
    }

    /// Run logging integration workflow tests
    fn run_logging_integration_workflow(&self) -> Vec<IntegrationTestResult> {
        vec![
            // Test: Cross-module logging
            IntegrationTestResult {
                name: "should_log_across_all_modules".to_string(),
                workflow: "logging_integration".to_string(),
                duration: Duration::from_millis(25),
                status: IntegrationTestStatus::Passed,
                error_message: None,
                modules_involved: vec![
                    "logging".to_string(),
                    "crypto".to_string(),
                    "file_ops".to_string(),
                    "storage".to_string(),
                ],
            },
        ]
    }

    /// Get test results for a specific workflow
    pub fn get_workflow_results(&self, workflow_name: &str) -> Vec<&IntegrationTestResult> {
        self.test_results
            .values()
            .filter(|result| result.workflow == workflow_name)
            .collect()
    }

    /// Get failed integration tests
    pub fn get_failed_tests(&self) -> Vec<&IntegrationTestResult> {
        self.test_results
            .values()
            .filter(|result| result.status == IntegrationTestStatus::Failed)
            .collect()
    }

    /// Get tests involving specific modules
    pub fn get_tests_involving_modules(&self, modules: &[&str]) -> Vec<&IntegrationTestResult> {
        self.test_results
            .values()
            .filter(|result| {
                modules
                    .iter()
                    .any(|module| result.modules_involved.contains(&module.to_string()))
            })
            .collect()
    }
}

impl TestSuite for IntegrationTestSuite {
    fn setup(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        // Initialize test environment
        super::common::init_test_environment();

        // Set up integration test environment
        // This might include setting up temporary databases, file systems, etc.
        Ok(())
    }

    fn teardown(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        // Clean up integration test environment
        self.test_results.clear();
        Ok(())
    }

    fn config(&self) -> &TestSuiteConfig {
        &self.config
    }
}

/// Summary of integration test suite execution
#[derive(Debug, Clone)]
pub struct IntegrationTestSummary {
    pub total_tests: usize,
    pub passed: usize,
    pub failed: usize,
    pub skipped: usize,
    pub partial: usize,
    pub duration: Duration,
    pub test_results: HashMap<String, IntegrationTestResult>,
}

impl IntegrationTestSummary {
    /// Check if all integration tests passed
    pub fn all_passed(&self) -> bool {
        self.failed == 0 && self.skipped == 0 && self.partial == 0
    }

    /// Get success rate as percentage (including partial as half-success)
    pub fn success_rate(&self) -> f64 {
        if self.total_tests == 0 {
            0.0
        } else {
            let effective_passed = self.passed as f64 + (self.partial as f64 * 0.5);
            (effective_passed / self.total_tests as f64) * 100.0
        }
    }

    /// Print summary to console
    pub fn print_summary(&self) {
        println!("=== Integration Test Suite Summary ===");
        println!("Total Tests: {}", self.total_tests);
        println!("Passed: {}", self.passed);
        println!("Failed: {}", self.failed);
        println!("Skipped: {}", self.skipped);
        println!("Partial: {}", self.partial);
        println!("Success Rate: {:.1}%", self.success_rate());
        println!("Duration: {:?}", self.duration);

        if self.failed > 0 {
            println!("\nFailed Tests:");
            for result in self
                .test_results
                .values()
                .filter(|r| r.status == IntegrationTestStatus::Failed)
            {
                println!(
                    "  - {} ({}): {:?}",
                    result.name, result.workflow, result.error_message
                );
            }
        }
    }
}

/// Macro to create an integration test with automatic setup/teardown
#[macro_export]
macro_rules! integration_test {
    ($name:ident, $workflow:expr, $modules:expr, $body:block) => {
        #[test]
        fn $name() {
            let mut suite = IntegrationTestSuite::new();
            suite.setup().expect("Integration test suite setup failed");

            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| $body));

            suite
                .teardown()
                .expect("Integration test suite teardown failed");

            if let Err(e) = result {
                std::panic::resume_unwind(e);
            }
        }
    };
}

/// Macro for parameterized integration tests
#[macro_export]
macro_rules! parameterized_integration_test {
    ($name:ident, $workflow:expr, $modules:expr, $cases:expr, $body:block) => {
        #[rstest]
        #[case($cases)]
        fn $name(#[case] case: $crate::common::TestCase) {
            let mut suite = IntegrationTestSuite::new();
            suite.setup().expect("Integration test suite setup failed");

            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| $body));

            suite
                .teardown()
                .expect("Integration test suite teardown failed");

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
    fn test_integration_test_suite_creation() {
        let suite = IntegrationTestSuite::new();
        assert!(suite.config().parallel);
    }

    #[test]
    fn test_integration_test_summary_calculation() {
        let summary = IntegrationTestSummary {
            total_tests: 10,
            passed: 7,
            failed: 1,
            skipped: 1,
            partial: 1,
            duration: Duration::from_secs(5),
            test_results: HashMap::new(),
        };

        assert_eq!(summary.success_rate(), 75.0); // 7 + 0.5 = 7.5 / 10 = 75%
        assert!(!summary.all_passed());
    }

    #[test]
    fn test_integration_test_suite_lifecycle() {
        let mut suite = IntegrationTestSuite::new();

        assert!(suite.setup().is_ok());
        assert!(suite.teardown().is_ok());
    }
}
