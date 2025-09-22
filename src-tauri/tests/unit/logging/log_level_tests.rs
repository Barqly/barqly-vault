//! Unit tests for tracing level handling using isolated test logging
//!
//! This module demonstrates the modern test framework features:
//! - Test-cases-as-documentation with descriptive names
//! - Parallel-safe test execution
//! - Enhanced assertions with better error messages
//! - Isolated in-memory test logging

// Test files are allowed to use eprintln! for test output
#![allow(clippy::disallowed_macros)]

use tracing::{debug, error, info, warn, Level};
use tracing_test::traced_test;

// ============================================================================
// TRACING LEVEL BASIC PROPERTIES TESTS
// ============================================================================

#[test]
#[traced_test]
fn should_work_with_info_level() {
    // Given: Info level logging

    // When: Logging info message
    info!("This is an info level message");

    // Then: Message should be captured
    assert!(logs_contain("This is an info level message"));
}

#[test]
#[traced_test]
fn should_work_with_debug_level() {
    // Given: Debug level logging

    // When: Logging debug message
    debug!("This is a debug level message");

    // Then: Message should be captured
    assert!(logs_contain("This is a debug level message"));
}

#[test]
#[traced_test]
fn should_work_with_error_level() {
    // Given: Error level logging

    // When: Logging error message
    error!("This is an error level message");

    // Then: Message should be captured
    assert!(logs_contain("This is an error level message"));
}

#[test]
#[traced_test]
fn should_work_with_warn_level() {
    // Given: Warn level logging

    // When: Logging warn message
    warn!("This is a warn level message");

    // Then: Message should be captured
    assert!(logs_contain("This is a warn level message"));
}

#[test]
fn should_have_level_constants() {
    // Given: Tracing Level constants

    // When: Accessing level constants
    let levels = [
        Level::ERROR,
        Level::WARN,
        Level::INFO,
        Level::DEBUG,
        Level::TRACE,
    ];

    // Then: All levels should be available
    assert_eq!(levels.len(), 5);
    assert!(levels.contains(&Level::INFO));
    assert!(levels.contains(&Level::DEBUG));
}
