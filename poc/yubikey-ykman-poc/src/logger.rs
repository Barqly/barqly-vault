use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use chrono::Local;
use log::{Level, LevelFilter, Log, Metadata, Record};

pub struct FileLogger {
    debug_file: Arc<Mutex<File>>,
    pty_file: Arc<Mutex<File>>,
    age_file: Arc<Mutex<File>>,
    console_level: LevelFilter,
}

impl FileLogger {
    pub fn new(log_dir: &str, console_level: LevelFilter) -> Result<Self, std::io::Error> {
        // Create logs directory if it doesn't exist
        fs::create_dir_all(log_dir)?;

        // Create timestamp for this session
        let timestamp = Local::now().format("%Y-%m-%d_%H-%M-%S");

        // Create log files
        let debug_path = PathBuf::from(log_dir).join(format!("{}_debug.log", timestamp));
        let pty_path = PathBuf::from(log_dir).join(format!("{}_pty.log", timestamp));
        let age_path = PathBuf::from(log_dir).join(format!("{}_age.log", timestamp));

        let debug_file = File::create(&debug_path)?;
        let pty_file = File::create(&pty_path)?;
        let age_file = File::create(&age_path)?;

        // Create symlink to latest
        let latest_path = PathBuf::from(log_dir).join("latest_debug.log");
        let _ = fs::remove_file(&latest_path);
        #[cfg(unix)]
        let _ = std::os::unix::fs::symlink(&debug_path, &latest_path);

        println!("📝 Logging to:");
        println!("   Debug: {}", debug_path.display());
        println!("   PTY:   {}", pty_path.display());
        println!("   Age:   {}", age_path.display());

        Ok(FileLogger {
            debug_file: Arc::new(Mutex::new(debug_file)),
            pty_file: Arc::new(Mutex::new(pty_file)),
            age_file: Arc::new(Mutex::new(age_file)),
            console_level,
        })
    }

    fn write_to_file(&self, file: &Arc<Mutex<File>>, record: &Record) {
        if let Ok(mut file) = file.lock() {
            let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
            let _ = writeln!(
                file,
                "[{}] {} {} - {}",
                timestamp,
                record.level(),
                record.target(),
                record.args()
            );
            let _ = file.flush();
        }
    }
}

impl Log for FileLogger {
    fn enabled(&self, metadata: &Metadata) -> bool {
        metadata.level() <= Level::Trace
    }

    fn log(&self, record: &Record) {
        if !self.enabled(record.metadata()) {
            return;
        }

        // Always write to debug file
        self.write_to_file(&self.debug_file, record);

        // Write to specialized files based on module
        let target = record.target();
        if target.contains("pty") {
            self.write_to_file(&self.pty_file, record);
        }
        if target.contains("age") || target.contains("decrypt") {
            self.write_to_file(&self.age_file, record);
        }

        // Also print to console if level is high enough
        if record.level() <= self.console_level {
            let timestamp = Local::now().format("%H:%M:%S");
            println!(
                "[{}] {} {} - {}",
                timestamp,
                record.level(),
                record.target(),
                record.args()
            );
        }
    }

    fn flush(&self) {
        if let Ok(mut file) = self.debug_file.lock() {
            let _ = file.flush();
        }
        if let Ok(mut file) = self.pty_file.lock() {
            let _ = file.flush();
        }
        if let Ok(mut file) = self.age_file.lock() {
            let _ = file.flush();
        }
    }
}

pub fn init_logger(console_level: Option<LevelFilter>) -> Result<(), Box<dyn std::error::Error>> {
    // Determine console level from env or parameter
    let console_level = console_level.unwrap_or_else(|| {
        match std::env::var("RUST_LOG") {
            Ok(level) => match level.to_lowercase().as_str() {
                "trace" => LevelFilter::Trace,
                "debug" => LevelFilter::Debug,
                "info" => LevelFilter::Info,
                "warn" => LevelFilter::Warn,
                "error" => LevelFilter::Error,
                _ => LevelFilter::Info,
            },
            Err(_) => LevelFilter::Info,
        }
    });

    let logger = FileLogger::new("logs", console_level)?;
    log::set_boxed_logger(Box::new(logger))?;
    log::set_max_level(LevelFilter::Trace); // Always capture everything to files

    Ok(())
}

// Helper macros for specialized logging
#[macro_export]
macro_rules! log_pty {
    ($($arg:tt)*) => {
        log::debug!(target: "pty", $($arg)*);
    };
}

#[macro_export]
macro_rules! log_pty_raw {
    ($data:expr) => {
        log::trace!(target: "pty_raw", "RAW: {:?}", $data);
    };
}

#[macro_export]
macro_rules! log_age {
    ($($arg:tt)*) => {
        log::debug!(target: "age", $($arg)*);
    };
}

#[macro_export]
macro_rules! log_cmd {
    ($cmd:expr, $args:expr) => {
        log::info!(target: "command", "Executing: {} {:?}", $cmd, $args);
    };
}