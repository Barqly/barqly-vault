//! Unit tests for tracing level handling
//!
//! Basic tests for tracing Level constants and behavior
//! NOTE: Tracing-test integration temporarily disabled due to global subscriber conflicts

// Test files are allowed to use eprintln! for test output
#![allow(clippy::disallowed_macros)]

use tracing::Level;

// ============================================================================
// TRACING LEVEL BASIC TESTS
// ============================================================================

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
    assert!(levels.contains(&Level::ERROR));
}

#[test]
fn should_compare_levels() {
    // Test that level comparison works
    assert!(Level::ERROR < Level::WARN);
    assert!(Level::WARN < Level::INFO);
    assert!(Level::INFO < Level::DEBUG);
    assert!(Level::DEBUG < Level::TRACE);
}

// TODO: Re-enable tracing-test integration after resolving subscriber conflicts
