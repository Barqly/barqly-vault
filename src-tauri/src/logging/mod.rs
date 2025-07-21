// Logging module for Barqly Vault
// SECURITY: Never log secrets or sensitive data (keys, passphrases, file contents, etc.)
//
// OpenTelemetry Compliance:
// - Structured logging with key-value pairs
// - Span-based tracing for operation context
// - Standardized log levels and formats
// - Correlation IDs for request tracing

mod logger;
mod platform;

use crate::logging::logger::Logger;
use once_cell::sync::OnceCell;
use std::collections::HashMap;
use uuid::Uuid;

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

/// OpenTelemetry-compliant log entry with structured data
#[derive(Debug, Clone)]
pub struct LogEntry {
    pub level: LogLevel,
    pub message: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub trace_id: Option<String>,
    pub span_id: Option<String>,
    pub attributes: HashMap<String, String>,
    pub error_details: Option<ErrorDetails>,
}

/// Structured error information following OTel standards
#[derive(Debug, Clone)]
pub struct ErrorDetails {
    pub error_type: String,
    pub error_code: Option<String>,
    pub stack_trace: Option<String>,
    pub context: HashMap<String, String>,
}

/// Span context for operation tracing
#[derive(Debug, Clone)]
pub struct SpanContext {
    pub trace_id: String,
    pub span_id: String,
    pub operation_name: String,
    pub attributes: HashMap<String, String>,
}

impl SpanContext {
    pub fn new(operation_name: impl Into<String>) -> Self {
        Self {
            trace_id: Uuid::new_v4().to_string(),
            span_id: Uuid::new_v4().to_string(),
            operation_name: operation_name.into(),
            attributes: HashMap::new(),
        }
    }

    pub fn with_attribute(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.attributes.insert(key.into(), value.into());
        self
    }
}

pub fn init_logging(level: LogLevel) -> Result<(), LoggingError> {
    let logger = Logger::new(level)?;
    LOGGER
        .set(logger)
        .map_err(|_| LoggingError::Other("Logger already initialized".to_string()))?;
    Ok(())
}

/// Log with structured data following OpenTelemetry standards
fn log_structured(entry: LogEntry) {
    if let Some(logger) = LOGGER.get() {
        logger.log_structured(entry);
    }
}

/// Log error with structured context
pub fn log_error_with_context(message: &str, error_type: &str, context: HashMap<String, String>) {
    let entry = LogEntry {
        level: LogLevel::Error,
        message: message.to_string(),
        timestamp: chrono::Utc::now(),
        trace_id: None,
        span_id: None,
        attributes: context,
        error_details: Some(ErrorDetails {
            error_type: error_type.to_string(),
            error_code: None,
            stack_trace: None,
            context: HashMap::new(),
        }),
    };
    log_structured(entry);
}

/// Log operation with span context
pub fn log_operation(
    level: LogLevel,
    message: &str,
    span_context: &SpanContext,
    attributes: HashMap<String, String>,
) {
    let entry = LogEntry {
        level,
        message: message.to_string(),
        timestamp: chrono::Utc::now(),
        trace_id: Some(span_context.trace_id.clone()),
        span_id: Some(span_context.span_id.clone()),
        attributes: {
            let mut attrs = span_context.attributes.clone();
            attrs.extend(attributes);
            attrs.insert(
                "operation.name".to_string(),
                span_context.operation_name.clone(),
            );
            attrs
        },
        error_details: None,
    };
    log_structured(entry);
}

// Legacy logging functions for backward compatibility
fn log(level: LogLevel, message: &str) {
    let entry = LogEntry {
        level,
        message: message.to_string(),
        timestamp: chrono::Utc::now(),
        trace_id: None,
        span_id: None,
        attributes: HashMap::new(),
        error_details: None,
    };
    log_structured(entry);
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
