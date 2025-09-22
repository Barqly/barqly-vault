//! Centralized tracing configuration for Barqly Vault
//!
//! This module provides a unified logging setup using the `tracing` crate,
//! replacing the previous custom logging implementation.

mod formatter;
pub mod redaction;

use directories::ProjectDirs;
use once_cell::sync::OnceCell;
use std::fs;
use std::io;
use std::path::PathBuf;
use tracing::Level;
use tracing_subscriber::filter::EnvFilter;
use tracing_subscriber::fmt;
use tracing_subscriber::fmt::writer::MakeWriterExt;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

use crate::tracing_setup::formatter::BarqlyFormatter;

static INIT: OnceCell<()> = OnceCell::new();

// Build-time information embedded in the binary
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const GIT_HASH: &str = env!("BUILD_GIT_HASH");
pub const GIT_BRANCH: &str = env!("BUILD_GIT_BRANCH");
pub const BUILD_TIMESTAMP: &str = env!("BUILD_TIMESTAMP");
pub const RUSTC_VERSION: &str = env!("BUILD_RUSTC_VERSION");

/// Get the platform-specific log directory
fn get_log_dir() -> Result<PathBuf, io::Error> {
    let proj_dirs = ProjectDirs::from("com", "Barqly", "Vault").ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            "Could not determine project directories",
        )
    })?;

    let log_dir = proj_dirs.data_dir().join("logs");

    // Create directory if it doesn't exist
    if !log_dir.exists() {
        fs::create_dir_all(&log_dir)?;
    }

    Ok(log_dir)
}

/// Initialize the tracing subscriber with our custom configuration
///
/// This should be called once at application startup, typically in main()
pub fn init() -> Result<(), Box<dyn std::error::Error>> {
    INIT.get_or_try_init(|| -> Result<(), Box<dyn std::error::Error>> {
        let log_dir = get_log_dir()?;
        let log_file_path = log_dir.join("barqly-vault.log");

        // Create a file appender
        let file = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_file_path)?;

        // Create our custom formatter
        let custom_formatter = BarqlyFormatter::new();

        // Create the file layer with our custom formatter
        let file_layer = fmt::layer()
            .event_format(custom_formatter.clone())
            .with_writer(file.with_max_level(Level::DEBUG))
            .with_ansi(false); // No ANSI colors in file

        // Create stderr layer for development (with colors)
        let stderr_layer = fmt::layer()
            .event_format(custom_formatter)
            .with_writer(io::stderr.with_max_level(Level::INFO))
            .with_ansi(true); // ANSI colors for terminal

        // Set up the subscriber with both layers
        tracing_subscriber::registry()
            .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                // Default filter: info for our crate, warn for dependencies
                EnvFilter::new("barqly_vault=info,warn")
            }))
            .with(file_layer)
            .with(stderr_layer)
            .try_init()?;

        // Log startup information with better formatting
        let separator = "=".repeat(72);

        // Determine version string based on build type
        let version_info = if GIT_HASH.contains("dirty") || GIT_HASH == "unknown" {
            format!("v{VERSION} (dev: {GIT_HASH})")
        } else if cfg!(debug_assertions) {
            format!("v{}-dev ({})", VERSION, &GIT_HASH[..8.min(GIT_HASH.len())])
        } else {
            format!("v{VERSION}") // Clean production version
        };

        // Get OS and architecture
        let os_info = format!("{} {}", std::env::consts::OS, std::env::consts::ARCH);

        tracing::info!(
            version = VERSION,
            git_commit = GIT_HASH,
            git_branch = GIT_BRANCH,
            build_timestamp = BUILD_TIMESTAMP,
            rustc_version = RUSTC_VERSION,
            log_file = %log_file_path.display(),
            "Application startup"
        );

        // Print formatted header to stderr only (not in log file)
        // These are allowed here as they're for startup display only
        #[allow(clippy::disallowed_macros, clippy::print_stderr)]
        {
            eprintln!("\n{separator}");
            eprintln!("Barqly Vault {version_info}");
            eprintln!("Built: {BUILD_TIMESTAMP}");
            eprintln!("Branch: {GIT_BRANCH}");
            eprintln!(
                "Rust: {}",
                RUSTC_VERSION.split(' ').nth(1).unwrap_or(RUSTC_VERSION)
            );
            eprintln!("OS: {os_info}");
            eprintln!("Log: {}", log_file_path.display());
            eprintln!("{separator}\n");
        }

        Ok(())
    })?;

    Ok(())
}

/// Initialize tracing for tests (outputs to stderr only)
#[cfg(test)]
pub fn init_test() {
    let _ = tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::new("debug"))
        .with_test_writer()
        .try_init();
}

// Re-export commonly used tracing macros for convenience
pub use tracing::{debug, error, info, instrument, span, trace, warn};
pub use tracing::{debug_span, error_span, event, info_span, trace_span, warn_span};
