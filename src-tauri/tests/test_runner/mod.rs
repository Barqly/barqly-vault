//! Main test runner for Barqly Vault
//!
//! This module provides:
//! - Unified test execution across all test types
//! - Comprehensive test reporting
//! - Test suite orchestration
//! - Performance monitoring

// Test runner files are allowed to use println! for test reporting
#![allow(clippy::disallowed_macros)]

use std::collections::HashMap;
use std::time::Duration;

use super::common::cleanup::TestSuiteCleanup;
use super::integration::{IntegrationTestSuite, IntegrationTestSummary};
use super::smoke::{SmokeTestSuite, SmokeTestSummary};
use super::unit::{TestSuiteSummary as UnitTestSummary, UnitTestSuite};

/// Complete test execution results
#[derive(Debug)]
pub struct TestExecutionResults {
    pub unit_tests: UnitTestSummary,
    pub integration_tests: IntegrationTestSummary,
    pub smoke_tests: SmokeTestSummary,
    pub total_duration: Duration,
    pub overall_success: bool,
}

/// Test runner configuration
#[derive(Debug, Clone)]
pub struct TestRunnerConfig {
    pub run_unit_tests: bool,
    pub run_integration_tests: bool,
    pub run_smoke_tests: bool,
    pub parallel_execution: bool,
    pub timeout: Duration,
    pub verbose_output: bool,
}

impl Default for TestRunnerConfig {
    fn default() -> Self {
        Self {
            run_unit_tests: true,
            run_integration_tests: true,
            run_smoke_tests: true,
            parallel_execution: true,
            timeout: Duration::from_secs(300), // 5 minutes
            verbose_output: false,
        }
    }
}

/// Main test runner
pub struct TestRunner {
    config: TestRunnerConfig,
}

impl Default for TestRunner {
    fn default() -> Self {
        Self::new()
    }
}

impl TestRunner {
    /// Create a new test runner with default configuration
    pub fn new() -> Self {
        Self {
            config: TestRunnerConfig::default(),
        }
    }

    /// Create a new test runner with custom configuration
    pub fn with_config(config: TestRunnerConfig) -> Self {
        Self { config }
    }

    /// Run all configured test suites
    pub fn run_all_tests(&self) -> Result<TestExecutionResults, Box<dyn std::error::Error>> {
        let start_time = std::time::Instant::now();

        println!("🧪 Starting Barqly Vault Test Suite Execution");
        println!("Configuration: {:?}", self.config);
        println!();

        let mut unit_summary = None;
        let mut integration_summary = None;
        let mut smoke_summary = None;

        // Run unit tests
        if self.config.run_unit_tests {
            println!("📋 Running Unit Tests...");
            let mut unit_suite = UnitTestSuite::new();
            unit_summary = Some(unit_suite.run_all_tests()?);
            if let Some(ref summary) = unit_summary {
                summary.print_summary();
            }
            println!();
        }

        // Run integration tests
        if self.config.run_integration_tests {
            println!("🔗 Running Integration Tests...");
            let mut integration_suite = IntegrationTestSuite::new();
            integration_summary = Some(integration_suite.run_all_tests()?);
            if let Some(ref summary) = integration_summary {
                summary.print_summary();
            }
            println!();
        }

        // Run smoke tests
        if self.config.run_smoke_tests {
            println!("💨 Running Smoke Tests...");
            let mut smoke_suite = SmokeTestSuite::new();
            smoke_summary = Some(smoke_suite.run_health_checks()?);
            if let Some(ref summary) = smoke_summary {
                summary.print_health_summary();
            }
            println!();
        }

        let total_duration = start_time.elapsed();

        // Create results
        let results = TestExecutionResults {
            unit_tests: unit_summary
                .as_ref()
                .unwrap_or(&UnitTestSummary {
                    total_tests: 0,
                    passed: 0,
                    failed: 0,
                    skipped: 0,
                    duration: Duration::ZERO,
                    test_results: HashMap::new(),
                })
                .clone(),
            integration_tests: integration_summary
                .as_ref()
                .unwrap_or(&IntegrationTestSummary {
                    total_tests: 0,
                    passed: 0,
                    failed: 0,
                    skipped: 0,
                    partial: 0,
                    duration: Duration::ZERO,
                    test_results: HashMap::new(),
                })
                .clone(),
            smoke_tests: smoke_summary
                .as_ref()
                .unwrap_or(&SmokeTestSummary {
                    total_checks: 0,
                    healthy: 0,
                    degraded: 0,
                    unhealthy: 0,
                    unknown: 0,
                    overall_health_score: 0.0,
                    duration: Duration::ZERO,
                    test_results: HashMap::new(),
                })
                .clone(),
            total_duration,
            overall_success: self.check_overall_success(
                &unit_summary,
                &integration_summary,
                &smoke_summary,
            ),
        };

        self.print_final_summary(&results);

        // Clean up test artifacts after all tests complete
        TestSuiteCleanup::cleanup_all();

        Ok(results)
    }

    /// Check if all test suites passed
    fn check_overall_success(
        &self,
        unit_summary: &Option<UnitTestSummary>,
        integration_summary: &Option<IntegrationTestSummary>,
        smoke_summary: &Option<SmokeTestSummary>,
    ) -> bool {
        let unit_success = unit_summary
            .as_ref()
            .map(|s| s.all_passed())
            .unwrap_or(true);
        let integration_success = integration_summary
            .as_ref()
            .map(|s| s.all_passed())
            .unwrap_or(true);
        let smoke_success = smoke_summary
            .as_ref()
            .map(|s| s.is_healthy())
            .unwrap_or(true);

        unit_success && integration_success && smoke_success
    }

    /// Print final test execution summary
    fn print_final_summary(&self, results: &TestExecutionResults) {
        println!("🎯 Final Test Execution Summary");
        println!("=================================");
        println!("Total Execution Time: {:?}", results.total_duration);
        println!(
            "Overall Success: {}",
            if results.overall_success {
                "✅ PASSED"
            } else {
                "❌ FAILED"
            }
        );
        println!();

        // Unit test summary
        if self.config.run_unit_tests {
            println!("📋 Unit Tests:");
            println!("  Total: {}", results.unit_tests.total_tests);
            println!("  Passed: {}", results.unit_tests.passed);
            println!("  Failed: {}", results.unit_tests.failed);
            println!("  Success Rate: {:.1}%", results.unit_tests.success_rate());
            println!();
        }

        // Integration test summary
        if self.config.run_integration_tests {
            println!("🔗 Integration Tests:");
            println!("  Total: {}", results.integration_tests.total_tests);
            println!("  Passed: {}", results.integration_tests.passed);
            println!("  Failed: {}", results.integration_tests.failed);
            println!("  Partial: {}", results.integration_tests.partial);
            println!(
                "  Success Rate: {:.1}%",
                results.integration_tests.success_rate()
            );
            println!();
        }

        // Smoke test summary
        if self.config.run_smoke_tests {
            println!("💨 Smoke Tests:");
            println!("  Total Checks: {}", results.smoke_tests.total_checks);
            println!("  Healthy: {}", results.smoke_tests.healthy);
            println!("  Degraded: {}", results.smoke_tests.degraded);
            println!("  Unhealthy: {}", results.smoke_tests.unhealthy);
            println!(
                "  Health Score: {:.1}%",
                results.smoke_tests.health_percentage()
            );
            println!();
        }

        // Performance metrics
        self.print_performance_metrics(results);
    }

    /// Print performance metrics
    fn print_performance_metrics(&self, results: &TestExecutionResults) {
        println!("⚡ Performance Metrics:");
        println!("  Total Execution Time: {:?}", results.total_duration);

        let total_tests = results.unit_tests.total_tests
            + results.integration_tests.total_tests
            + results.smoke_tests.total_checks;
        if total_tests > 0 {
            let avg_time_per_test = results.total_duration.as_millis() as f64 / total_tests as f64;
            println!("  Average Time per Test: {avg_time_per_test:.2}ms");
        }

        // Check if we're within performance targets
        let performance_target = Duration::from_secs(30); // 30 seconds target
        if results.total_duration <= performance_target {
            println!(
                "  Performance: ✅ Within target ({:?} <= {:?})",
                results.total_duration, performance_target
            );
        } else {
            println!(
                "  Performance: ⚠️  Exceeded target ({:?} > {:?})",
                results.total_duration, performance_target
            );
        }
        println!();
    }

    /// Run only unit tests
    pub fn run_unit_tests_only(&self) -> Result<UnitTestSummary, Box<dyn std::error::Error>> {
        let mut config = self.config.clone();
        config.run_integration_tests = false;
        config.run_smoke_tests = false;

        let runner = TestRunner::with_config(config);
        let results = runner.run_all_tests()?;
        Ok(results.unit_tests)
    }

    /// Run only integration tests
    pub fn run_integration_tests_only(
        &self,
    ) -> Result<IntegrationTestSummary, Box<dyn std::error::Error>> {
        let mut config = self.config.clone();
        config.run_unit_tests = false;
        config.run_smoke_tests = false;

        let runner = TestRunner::with_config(config);
        let results = runner.run_all_tests()?;
        Ok(results.integration_tests)
    }

    /// Run only smoke tests
    pub fn run_smoke_tests_only(&self) -> Result<SmokeTestSummary, Box<dyn std::error::Error>> {
        let mut config = self.config.clone();
        config.run_unit_tests = false;
        config.run_integration_tests = false;

        let runner = TestRunner::with_config(config);
        let results = runner.run_all_tests()?;
        Ok(results.smoke_tests)
    }
}

/// Convenience function to run all tests with default configuration
pub fn run_all_tests() -> Result<TestExecutionResults, Box<dyn std::error::Error>> {
    let runner = TestRunner::new();
    runner.run_all_tests()
}

/// Convenience function to run tests with custom configuration
pub fn run_tests_with_config(
    config: TestRunnerConfig,
) -> Result<TestExecutionResults, Box<dyn std::error::Error>> {
    let runner = TestRunner::with_config(config);
    runner.run_all_tests()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_test_runner_creation() {
        let runner = TestRunner::new();
        assert!(runner.config.run_unit_tests);
        assert!(runner.config.run_integration_tests);
        assert!(runner.config.run_smoke_tests);
    }

    #[test]
    fn test_test_runner_config_default() {
        let config = TestRunnerConfig::default();
        assert!(config.run_unit_tests);
        assert!(config.run_integration_tests);
        assert!(config.run_smoke_tests);
        assert!(config.parallel_execution);
    }

    #[test]
    fn test_overall_success_check() {
        let runner = TestRunner::new();

        // All passed
        let unit_summary = Some(UnitTestSummary {
            total_tests: 10,
            passed: 10,
            failed: 0,
            skipped: 0,
            duration: Duration::from_secs(1),
            test_results: HashMap::new(),
        });

        let integration_summary = Some(IntegrationTestSummary {
            total_tests: 5,
            passed: 5,
            failed: 0,
            skipped: 0,
            partial: 0,
            duration: Duration::from_secs(1),
            test_results: HashMap::new(),
        });

        let smoke_summary = Some(SmokeTestSummary {
            total_checks: 3,
            healthy: 3,
            degraded: 0,
            unhealthy: 0,
            unknown: 0,
            overall_health_score: 1.0,
            duration: Duration::from_secs(1),
            test_results: HashMap::new(),
        });

        let success =
            runner.check_overall_success(&unit_summary, &integration_summary, &smoke_summary);
        assert!(success);
    }
}
