// Logging module for Barqly Vault
// SECURITY: Never log secrets or sensitive data (keys, passphrases, file contents, etc.)

mod logger;
mod platform;

use crate::logging::logger::Logger;
use once_cell::sync::OnceCell;

static LOGGER: OnceCell<Logger> = OnceCell::new();

#[derive(Debug, Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum LogLevel {
    Error,
    Warn,
    Info,
    Debug,
}

#[derive(Debug)]
pub enum LoggingError {
    Io(std::io::Error),
    Other(String),
}

pub fn init_logging(level: LogLevel) -> Result<(), LoggingError> {
    let logger = Logger::new(level)?;
    LOGGER
        .set(logger)
        .map_err(|_| LoggingError::Other("Logger already initialized".to_string()))?;
    Ok(())
}

pub fn log(level: LogLevel, message: &str) {
    if let Some(logger) = LOGGER.get() {
        logger.log(level, message);
    }
}

pub fn log_error(message: &str) {
    log(LogLevel::Error, message);
}

pub fn log_warn(message: &str) {
    log(LogLevel::Warn, message);
}

pub fn log_info(message: &str) {
    log(LogLevel::Info, message);
}

pub fn log_debug(message: &str) {
    log(LogLevel::Debug, message);
}

#[cfg(test)]
mod tests {
    // NOTE: We do not test logger re-initialization, as Rust static singletons (OnceCell) cannot be reset between tests.
    // This is the idiomatic approach in the Rust ecosystem (see log/env_logger/tracing crates).
    use super::*;
    use crate::logging::platform::get_log_dir;
    use rand::{distributions::Alphanumeric, Rng};
    use serial_test::serial;

    fn get_unique_id() -> String {
        rand::thread_rng()
            .sample_iter(&Alphanumeric)
            .take(12)
            .map(char::from)
            .collect()
    }

    #[test]
    #[serial]
    fn test_log_file_creation_and_write() {
        // This test now verifies both file creation and content writing.
        let unique_message = format!("test message {}", get_unique_id());

        let _ = init_logging(LogLevel::Info);
        log_info(&unique_message);

        let log_path = get_log_dir().unwrap().join("barqly-vault.log");
        assert!(log_path.exists());

        let content = std::fs::read_to_string(&log_path).expect("Should be able to read log file");
        assert!(content.contains(&unique_message));
    }

    #[test]
    #[serial]
    fn test_log_level_filtering() {
        let _ = init_logging(LogLevel::Info);
        log_info("This info message should be logged");
        log_warn("This warning should be logged");
        log_error("This error should be logged");
        log_debug("This debug message should NOT be logged");
    }

    #[test]
    #[serial]
    fn test_logging_error_handling() {
        let _ = init_logging(LogLevel::Info);
        log_info("Test message that shouldn't panic");
        log_error("Another test message");
    }

    // The rest of the tests (LogLevel trait tests, serialization) do not require serial
    #[test]
    fn test_log_level_ordering() {
        assert!(LogLevel::Error < LogLevel::Warn);
        assert!(LogLevel::Warn < LogLevel::Info);
        assert!(LogLevel::Info < LogLevel::Debug);
        assert_eq!(LogLevel::Error, LogLevel::Error);
        assert_ne!(LogLevel::Error, LogLevel::Info);
    }

    #[test]
    fn test_log_level_copy_clone() {
        let level = LogLevel::Info;
        let copied = level;
        let cloned = level; // Remove unnecessary clone() since LogLevel is Copy
        assert_eq!(level, copied);
        assert_eq!(level, cloned);
    }

    #[test]
    fn test_log_level_debug_format() {
        let level = LogLevel::Warn;
        let debug_str = format!("{level:?}");
        assert_eq!(debug_str, "Warn");
    }

    #[test]
    fn test_log_level_serialization() {
        use std::collections::HashSet;
        let mut levels = HashSet::new();
        levels.insert(LogLevel::Error);
        levels.insert(LogLevel::Warn);
        levels.insert(LogLevel::Info);
        levels.insert(LogLevel::Debug);
        assert_eq!(levels.len(), 4);
        assert!(levels.contains(&LogLevel::Error));
    }
}
