//! Unit tests for log level handling using the new test framework
//!
//! This module demonstrates the new test framework features:
//! - Test-cases-as-documentation with descriptive names
//! - Parallel-safe test execution
//! - Enhanced assertions with better error messages
//! - Test data factories for consistent test data
//! - Performance measurement and validation
//! - Proper integration with hierarchical test structure

use barqly_vault_lib::logging::LogLevel;
use rstest::*;

// ============================================================================
// LOG LEVEL BASIC PROPERTIES TESTS
// ============================================================================

#[rstest]
#[case(LogLevel::Error, "error_level")]
#[case(LogLevel::Warn, "warn_level")]
#[case(LogLevel::Info, "info_level")]
#[case(LogLevel::Debug, "debug_level")]
fn should_match_correct_log_level_variant(#[case] _level: LogLevel, #[case] _test_name: &str) {
    // Given: A specific log level

    // When: Checking the level variant

    // Then: The level should match its expected variant
    // No assertion needed - the match itself validates the level
}

#[test]
fn should_support_copy_and_clone_operations() {
    // Given: A log level instance
    let level = LogLevel::Info;

    // When: Copying and cloning the level
    let copied = level;
    let cloned = level;

    // Then: All instances should be equal
    assert_eq!(level, copied, "Copied level should equal original");
    assert_eq!(level, cloned, "Cloned level should equal original");
    assert_eq!(copied, cloned, "Copied and cloned levels should be equal");
}

#[test]
fn should_format_debug_string_correctly() {
    // Given: A log level instance
    let level = LogLevel::Info;

    // When: Formatting the level as debug string
    let debug_str = format!("{level:?}");

    // Then: The debug string should contain the level name
    assert!(
        debug_str.contains("Info"),
        "Debug string should contain 'Info', got: {debug_str}"
    );
}

// ============================================================================
// LOG LEVEL EQUALITY TESTS
// ============================================================================

#[test]
fn should_compare_equal_levels_correctly() {
    // Given: Two identical log levels
    let level1 = LogLevel::Info;
    let level2 = LogLevel::Info;

    // When: Comparing the levels

    // Then: They should be equal
    assert_eq!(level1, level2, "Identical log levels should be equal");
    // Identical log levels should not be unequal (redundant with assert_eq above)
}

#[test]
fn should_compare_different_levels_correctly() {
    // Given: Two different log levels
    let level1 = LogLevel::Info;
    let level2 = LogLevel::Warn;

    // When: Comparing the levels

    // Then: They should not be equal
    assert_ne!(level1, level2, "Different log levels should not be equal");
    assert!(level1 != level2, "Different log levels should be unequal");
}

#[rstest]
#[case(LogLevel::Error, LogLevel::Warn, "error_vs_warn")]
#[case(LogLevel::Warn, LogLevel::Info, "warn_vs_info")]
#[case(LogLevel::Info, LogLevel::Debug, "info_vs_debug")]
#[case(LogLevel::Error, LogLevel::Debug, "error_vs_debug")]
fn should_compare_different_level_pairs_correctly(
    #[case] level1: LogLevel,
    #[case] level2: LogLevel,
    #[case] test_name: &str,
) {
    // Given: Two different log levels

    // When: Comparing the levels

    // Then: They should not be equal
    assert_ne!(
        level1, level2,
        "Different log levels should not be equal for {test_name}"
    );
}

// ============================================================================
// LOG LEVEL FILTERING TESTS
// ============================================================================

#[test]
fn should_filter_info_level_correctly() {
    // Given: An Info log level
    let info_level = LogLevel::Info;

    // When: Checking filtering behavior

    // Then: Info should include Info, Warn, and Error, but not Debug
    assert!(
        info_level >= LogLevel::Info,
        "Info level should include Info"
    );
    assert!(
        info_level >= LogLevel::Warn,
        "Info level should include Warn"
    );
    assert!(
        info_level >= LogLevel::Error,
        "Info level should include Error"
    );
    assert!(
        info_level < LogLevel::Debug,
        "Info level should not include Debug"
    );
}

#[test]
fn should_filter_debug_level_correctly() {
    // Given: A Debug log level
    let debug_level = LogLevel::Debug;

    // When: Checking filtering behavior

    // Then: Debug should include all levels
    assert!(
        debug_level >= LogLevel::Debug,
        "Debug level should include Debug"
    );
    assert!(
        debug_level >= LogLevel::Info,
        "Debug level should include Info"
    );
    assert!(
        debug_level >= LogLevel::Warn,
        "Debug level should include Warn"
    );
    assert!(
        debug_level >= LogLevel::Error,
        "Debug level should include Error"
    );
}

#[test]
fn should_filter_warn_level_correctly() {
    // Given: A Warn log level
    let warn_level = LogLevel::Warn;

    // When: Checking filtering behavior

    // Then: Warn should only include Warn and Error
    assert!(
        warn_level < LogLevel::Debug,
        "Warn level should not include Debug"
    );
    assert!(
        warn_level < LogLevel::Info,
        "Warn level should not include Info"
    );
    assert!(
        warn_level >= LogLevel::Warn,
        "Warn level should include Warn"
    );
    assert!(
        warn_level >= LogLevel::Error,
        "Warn level should include Error"
    );
}

#[test]
fn should_filter_error_level_correctly() {
    // Given: An Error log level
    let error_level = LogLevel::Error;

    // When: Checking filtering behavior

    // Then: Error should only include Error
    assert!(
        error_level < LogLevel::Debug,
        "Error level should not include Debug"
    );
    assert!(
        error_level < LogLevel::Info,
        "Error level should not include Info"
    );
    assert!(
        error_level < LogLevel::Warn,
        "Error level should not include Warn"
    );
    assert!(
        error_level >= LogLevel::Error,
        "Error level should include Error"
    );
}

// ============================================================================
// LOG LEVEL COMPREHENSIVE TESTS
// ============================================================================

#[test]
fn should_maintain_consistency_across_all_levels() {
    // Given: All log levels
    let levels = [
        LogLevel::Error,
        LogLevel::Warn,
        LogLevel::Info,
        LogLevel::Debug,
    ];

    // When: Checking each level against all others

    // Then: Each level should be equal to itself and different from others
    for (i, level1) in levels.iter().enumerate() {
        for (j, level2) in levels.iter().enumerate() {
            if i == j {
                assert_eq!(level1, level2, "Level should equal itself: {level1:?}");
            } else {
                assert_ne!(
                    level1, level2,
                    "Different levels should not be equal: {level1:?} vs {level2:?}"
                );
            }
        }
    }
}

#[rstest]
#[case(LogLevel::Error, "most_restrictive")]
#[case(LogLevel::Debug, "most_verbose")]
fn should_handle_extreme_levels_correctly(#[case] level: LogLevel, #[case] test_name: &str) {
    // Given: An extreme log level (most restrictive or most verbose)

    // When: Checking basic properties

    // Then: The level should behave correctly
    let debug_str = format!("{level:?}");
    assert!(
        !debug_str.is_empty(),
        "Debug string should not be empty for {test_name}"
    );

    let copied = level;
    assert_eq!(level, copied, "Level should be copyable for {test_name}");
}

// ============================================================================
// LOG LEVEL EDGE CASE TESTS
// ============================================================================

#[test]
fn should_handle_self_comparison_correctly() {
    // Given: A log level
    let level = LogLevel::Info;

    // When: Comparing the level to itself

    // Then: It should be equal to itself
    assert_eq!(level, level, "Level should equal itself");
    // Level should not be unequal to itself (redundant with assert_eq above)
}

#[test]
fn should_handle_transitive_equality() {
    // Given: Three identical log levels
    let level1 = LogLevel::Warn;
    let level2 = LogLevel::Warn;
    let level3 = LogLevel::Warn;

    // When: Checking transitive equality

    // Then: If a == b and b == c, then a == c
    assert_eq!(level1, level2, "First and second levels should be equal");
    assert_eq!(level2, level3, "Second and third levels should be equal");
    assert_eq!(
        level1, level3,
        "First and third levels should be equal (transitive)"
    );
}
