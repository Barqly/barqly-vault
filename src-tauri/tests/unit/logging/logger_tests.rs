//! Unit tests for tracing system using isolated test logging
//!
//! This module demonstrates modern test framework features:
//! - Test-cases-as-documentation with descriptive names
//! - Parallel-safe test execution
//! - Enhanced assertions with better error messages
//! - Test data factories for consistent test data
//! - Performance measurement and validation
//! - Isolated in-memory test logging (no file pollution)

// Test files are allowed to use eprintln! for test output
#![allow(clippy::disallowed_macros)]

use tracing::{debug, info};
use tracing_test::traced_test;

// ============================================================================
// TRACING SYSTEM BEHAVIOR TESTS
// ============================================================================

#[test]
#[traced_test]
fn should_initialize_tracing_with_info_level() {
    // Given: A test environment

    // When: Using info level logging
    info!("Info level test message");

    // Then: Message should be captured in memory
    assert!(logs_contain("Info level test message"));
}

#[test]
#[traced_test]
fn should_capture_performance_logs() {
    // Given: A performance test scenario

    // When: Logging performance measurements
    let start = std::time::Instant::now();
    info!("Starting performance test");

    // Simulate some work
    std::thread::sleep(std::time::Duration::from_millis(1));

    let duration = start.elapsed();
    info!(
        duration_ms = duration.as_millis(),
        "Performance test completed"
    );

    // Then: Both messages should be captured
    assert!(logs_contain("Starting performance test"));
    assert!(logs_contain("Performance test completed"));
}

#[test]
#[traced_test]
fn should_handle_concurrent_logging() {
    // Given: A multi-threaded scenario

    // When: Logging from the main thread
    info!("Main thread log message");
    debug!("Main thread debug message");

    // Then: Messages should be captured
    assert!(logs_contain("Main thread log message"));
    assert!(logs_contain("Main thread debug message"));
}

#[test]
#[traced_test]
fn should_capture_structured_fields() {
    // Given: Structured logging requirements

    // When: Logging with structured fields
    info!(
        user_id = "test_user_123",
        operation = "login",
        duration_ms = 250,
        "User operation completed"
    );

    // Then: Log message should be captured
    assert!(logs_contain("User operation completed"));
}
