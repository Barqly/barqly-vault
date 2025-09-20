use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::sync::Mutex;

use super::platform::get_log_dir;
use super::{LogEntry, LogLevel, LoggingError};

// SECURITY: Never log secrets or sensitive data (keys, passphrases, file contents, etc.)

pub struct Logger {
    log_file: Mutex<Option<std::fs::File>>,
    level: LogLevel,
}

impl Logger {
    pub fn new(level: LogLevel) -> Result<Self, LoggingError> {
        let log_dir = get_log_dir()
            .ok_or_else(|| LoggingError::Other("Could not determine log directory".to_string()))?;
        create_dir_all(&log_dir).map_err(LoggingError::Io)?;
        let log_path = log_dir.join("barqly-vault.log");
        let file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_path)
            .map_err(LoggingError::Io)?;
        Ok(Logger {
            log_file: Mutex::new(Some(file)),
            level,
        })
    }

    /// Log structured entry following OpenTelemetry standards
    pub fn log_structured(&self, entry: LogEntry) {
        if entry.level > self.level {
            return;
        }

        // Create human-readable log format with separators
        let level_str = match entry.level {
            LogLevel::Debug => "DEBUG",
            LogLevel::Info => "INFO ",
            LogLevel::Warn => "WARN ",
            LogLevel::Error => "ERROR",
        };

        // Format: TIMESTAMP | LEVEL | MESSAGE | ATTRIBUTES | ERROR
        let mut log_parts = vec![
            entry.timestamp.to_rfc3339(),
            level_str.to_string(),
            entry.message.clone(),
        ];

        // Add attributes if present
        if !entry.attributes.is_empty() {
            let attrs = serde_json::to_string(&entry.attributes).unwrap_or_default();
            log_parts.push(attrs);
        }

        // Add error details if present
        if let Some(error) = entry.error_details {
            let error_info = format!(
                "Error(type={}, code={:?}, context={})",
                error.error_type,
                error.error_code,
                serde_json::to_string(&error.context).unwrap_or_default()
            );
            log_parts.push(error_info);
        }

        // Join with separator for easy parsing
        let log_line = format!("{}\n", log_parts.join(" | "));

        if let Ok(mut file_opt) = self.log_file.lock() {
            if let Some(file) = file_opt.as_mut() {
                if let Err(e) = file.write_all(log_line.as_bytes()) {
                    eprintln!("Failed to write to log file: {e}");
                }
            }
        }
    }
}
