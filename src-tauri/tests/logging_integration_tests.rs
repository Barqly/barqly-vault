// Integration tests for the logging module
// NOTE: Logger initialization can only be tested once per process due to Rust's global singleton pattern (OnceCell).
// Do not attempt to re-initialize the logger in multiple tests; this is the idiomatic Rust approach.

use barqly_vault_lib::logging::{init_logging, LogLevel};

#[test]
fn test_logging_initialization_integration() {
    // Test that logging can be initialized from the library
    let result = init_logging(LogLevel::Info);
    assert!(result.is_ok(), "Logging initialization should succeed");
}

// Other integration tests that require logger initialization are omitted due to singleton limitation.
// If you need to test logging behavior, do so in the same test or use unit tests for non-global logic.
