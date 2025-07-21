use serde_json::json;
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

        // Create structured log entry in JSON format
        let log_data = json!({
            "timestamp": entry.timestamp.to_rfc3339(),
            "level": format!("{:?}", entry.level),
            "message": entry.message,
            "trace_id": entry.trace_id,
            "span_id": entry.span_id,
            "attributes": entry.attributes,
            "error": entry.error_details.map(|error| json!({
                "type": error.error_type,
                "code": error.error_code,
                "stack_trace": error.stack_trace,
                "context": error.context
            }))
        });

        let log_line = format!("{log_data}\n");

        if let Ok(mut file_opt) = self.log_file.lock() {
            if let Some(file) = file_opt.as_mut() {
                if let Err(e) = file.write_all(log_line.as_bytes()) {
                    eprintln!("Failed to write to log file: {e}");
                }
            }
        }
    }
}
