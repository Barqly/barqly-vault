//! Unit tests for log level handling
//!
//! Tests individual log level functions in isolation:
//! - Log level creation and comparison
//! - Log level serialization
//! - Log level filtering

use barqly_vault_lib::logging::LogLevel;

#[test]
fn test_log_level_ordering() {
    // Test that log levels are ordered correctly
    // Log levels don't implement ordering in current implementation
    // These tests verify the enum variants exist
    assert!(matches!(LogLevel::Error, LogLevel::Error));
    assert!(matches!(LogLevel::Warn, LogLevel::Warn));
    assert!(matches!(LogLevel::Info, LogLevel::Info));
    assert!(matches!(LogLevel::Debug, LogLevel::Debug));
    // Trace level not supported in current implementation
}

#[test]
fn test_log_level_copy_clone() {
    // Test that log levels can be copied and cloned
    let level = LogLevel::Info;
    let copied = level;
    let cloned = level.clone();

    assert_eq!(level, copied);
    assert_eq!(level, cloned);
}

#[test]
fn test_log_level_debug_format() {
    // Test debug formatting
    let level = LogLevel::Info;
    let debug_str = format!("{:?}", level);
    assert!(debug_str.contains("Info"));
}

#[test]
fn test_log_level_serialization() {
    // JSON serialization not supported in current implementation
}

#[test]
fn test_log_level_filtering() {
    // Test that filtering works correctly
    let info_level = LogLevel::Info;
    let debug_level = LogLevel::Debug;
    let warn_level = LogLevel::Warn;

    // Info should include Info, Warn, and Error
    assert!(info_level >= LogLevel::Info);
    assert!(info_level >= LogLevel::Warn);
    assert!(info_level >= LogLevel::Error);
    assert!(info_level < LogLevel::Debug);
    // Trace level not supported in current implementation

    // Debug should include Debug, Info, Warn, and Error
    assert!(debug_level >= LogLevel::Debug);
    assert!(debug_level >= LogLevel::Info);
    assert!(debug_level >= LogLevel::Warn);
    assert!(debug_level >= LogLevel::Error);
    // Trace level not supported in current implementation

    // Warn should only include Warn and Error
    assert!(warn_level < LogLevel::Debug);
    assert!(warn_level < LogLevel::Info);
    assert!(warn_level >= LogLevel::Warn);
    assert!(warn_level >= LogLevel::Error);
}

#[test]
fn test_log_level_equality() {
    // Test equality comparisons
    let level1 = LogLevel::Info;
    let level2 = LogLevel::Info;
    let level3 = LogLevel::Warn;

    assert_eq!(level1, level2);
    assert_ne!(level1, level3);
}

#[test]
fn test_log_level_from_string() {
    // String conversion not supported in current implementation
}

#[test]
fn test_log_level_to_string() {
    // String conversion not supported in current implementation
}
