use chrono::Local;
use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::sync::Mutex;

use super::platform::get_log_dir;
use super::{LogLevel, LoggingError};

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

    pub fn log(&self, level: LogLevel, message: &str) {
        if level > self.level {
            return;
        }
        let now = Local::now().format("%Y-%m-%d %H:%M:%S");
        let log_line = format!("[{now}] [{level:?}] {message}\n");
        if let Ok(mut file_opt) = self.log_file.lock() {
            if let Some(file) = file_opt.as_mut() {
                if let Err(e) = file.write_all(log_line.as_bytes()) {
                    eprintln!("Failed to write to log file: {e}");
                }
            }
        }
    }
}
