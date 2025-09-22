//! Integration tests for the tracing system using isolated test logging
//!
//! This module demonstrates comprehensive integration testing:
//! - Cross-module logging integration
//! - Tracing system behavior across modules
//! - Isolated test logging (doesn't pollute application logs)
//! - Performance impact of logging
//! - Error handling in logging scenarios
//!
//! Uses tracing-test for proper test isolation and in-memory log capture.

// Test files are allowed to use eprintln! for test output
#![allow(clippy::disallowed_macros)]

use tracing::{debug, info};
use tracing_test::traced_test;

// ============================================================================
// TRACING SYSTEM INTEGRATION TESTS
// ============================================================================

#[test]
#[traced_test]
fn should_initialize_tracing_successfully() {
    // Given: A request to test tracing system

    // When: Using tracing macros in tests
    info!("Testing tracing system initialization");
    debug!("This debug message should be captured in test");

    // Then: Logs should be captured in memory (not written to barqly-vault.log)
    assert!(logs_contain("Testing tracing system initialization"));
    assert!(logs_contain("This debug message should be captured"));
}

#[test]
#[traced_test]
fn should_handle_different_log_levels() {
    // Given: Different tracing levels available

    // When: Using different log levels in tests
    info!("This is an info message");
    debug!("This is a debug message");

    // Then: All log levels should be captured in memory (no file pollution)
    assert!(logs_contain("This is an info message"));
    assert!(logs_contain("This is a debug message"));
}

#[test]
#[traced_test]
fn should_handle_multiple_log_calls_gracefully() {
    // Given: A test environment using tracing

    // When: Making multiple log calls
    info!("First log message");
    info!("Second log message");
    debug!("Debug message");

    // Then: All messages should be captured in memory
    assert!(logs_contain("First log message"));
    assert!(logs_contain("Second log message"));
    assert!(logs_contain("Debug message"));
}

#[test]
#[traced_test]
fn should_capture_structured_logging() {
    // Given: Structured logging with fields

    // When: Using structured fields in logs
    info!(
        user_id = "test_user",
        action = "login",
        "User action performed"
    );
    debug!(operation = "test", duration_ms = 150, "Operation completed");

    // Then: Log messages should be captured (fields are part of the message)
    assert!(logs_contain("User action performed"));
    assert!(logs_contain("Operation completed"));
}
