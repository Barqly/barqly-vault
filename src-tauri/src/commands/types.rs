//! Command types and error handling for Tauri bridge
//!
//! This module defines the core types used by all Tauri commands,
//! including error handling, progress updates, and validation traits.

use crate::logging::{log_error_with_context, SpanContext};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;

/// Standard command response wrapper
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "status", content = "data")]
pub enum CommandResult<T> {
    Success(T),
    Error(CommandError),
}

/// Type alias for command results to make them easier to work with
pub type CommandResponse<T> = Result<T, CommandError>;

/// Unified error type for all commands
#[derive(Debug, Serialize, Deserialize)]
pub struct CommandError {
    pub code: ErrorCode,
    pub message: String,
    pub details: Option<String>,
    pub recovery_guidance: Option<String>,
    pub user_actionable: bool,
    pub trace_id: Option<String>,
    pub span_id: Option<String>,
}

/// Error codes for client-side handling
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    // Validation errors
    InvalidInput,
    MissingParameter,
    InvalidPath,
    InvalidKeyLabel,
    WeakPassphrase,
    InvalidFileFormat,
    FileTooLarge,
    TooManyFiles,

    // Permission errors
    PermissionDenied,
    PathNotAllowed,
    InsufficientPermissions,
    ReadOnlyFileSystem,

    // Not found errors
    KeyNotFound,
    FileNotFound,
    DirectoryNotFound,
    OperationNotFound,

    // Operation errors
    EncryptionFailed,
    DecryptionFailed,
    StorageFailed,
    ArchiveCorrupted,
    ManifestInvalid,
    IntegrityCheckFailed,
    ConcurrentOperation,

    // Resource errors
    DiskSpaceInsufficient,
    MemoryInsufficient,
    FileSystemError,
    NetworkError,

    // Security errors
    InvalidKey,
    WrongPassphrase,
    TamperedData,
    UnauthorizedAccess,

    // Internal errors
    InternalError,
    UnexpectedError,
    ConfigurationError,
}

/// Progress update for streaming operations
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProgressUpdate {
    pub operation_id: String,
    pub progress: f32, // 0.0 to 1.0
    pub message: String,
    pub details: Option<ProgressDetails>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub estimated_time_remaining: Option<u64>, // in seconds
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum ProgressDetails {
    FileOperation {
        current_file: String,
        total_files: usize,
        current_file_progress: f32,
        current_file_size: u64,
        total_size: u64,
    },
    Encryption {
        bytes_processed: u64,
        total_bytes: u64,
        encryption_rate: Option<f64>, // bytes per second
    },
    Decryption {
        bytes_processed: u64,
        total_bytes: u64,
        decryption_rate: Option<f64>, // bytes per second
    },
    ArchiveOperation {
        files_processed: usize,
        total_files: usize,
        bytes_processed: u64,
        total_bytes: u64,
        compression_ratio: Option<f32>,
    },
    ManifestOperation {
        files_verified: usize,
        total_files: usize,
        current_file: String,
    },
}

/// Trait for validatable command inputs
pub trait ValidateInput {
    fn validate(&self) -> Result<(), CommandError>;
}

/// Enhanced validation trait with detailed error reporting
pub trait ValidateInputDetailed {
    fn validate_detailed(&self) -> Result<(), CommandError>;

    /// Get field-specific validation rules
    fn get_validation_rules() -> HashMap<String, String> {
        HashMap::new()
    }

    /// Validate a specific field
    fn validate_field(&self, _field_name: &str) -> Result<(), CommandError> {
        self.validate_detailed()
    }
}

/// Validation helper for consistent error messages
pub struct ValidationHelper;

impl ValidationHelper {
    /// Validate that a string is not empty
    pub fn validate_not_empty(value: &str, field_name: &str) -> Result<(), CommandError> {
        if value.trim().is_empty() {
            return Err(
                CommandError::validation(format!("{field_name} cannot be empty"))
                    .with_recovery_guidance(format!("Please provide a {field_name}")),
            );
        }
        Ok(())
    }

    /// Validate string length
    pub fn validate_length(
        value: &str,
        field_name: &str,
        min: usize,
        max: usize,
    ) -> Result<(), CommandError> {
        let len = value.len();
        if len < min {
            return Err(CommandError::validation(format!(
                "{field_name} is too short (minimum {min} characters)"
            ))
            .with_recovery_guidance(format!("Please provide a longer {field_name}")));
        }
        if len > max {
            return Err(CommandError::validation(format!(
                "{field_name} is too long (maximum {max} characters)"
            ))
            .with_recovery_guidance(format!("Please provide a shorter {field_name}")));
        }
        Ok(())
    }

    /// Validate path exists and is accessible
    pub fn validate_path_exists(path: &str, field_name: &str) -> Result<(), CommandError> {
        let path_buf = std::path::Path::new(path);
        if !path_buf.exists() {
            return Err(CommandError::operation(
                ErrorCode::FileNotFound,
                format!("{field_name} not found: {path}"),
            )
            .with_recovery_guidance("Please check the path and try again"));
        }
        Ok(())
    }

    /// Validate path is a file
    pub fn validate_is_file(path: &str, field_name: &str) -> Result<(), CommandError> {
        let path_buf = std::path::Path::new(path);
        if !path_buf.is_file() {
            return Err(
                CommandError::validation(format!("{field_name} must be a file: {path}"))
                    .with_recovery_guidance("Please select a valid file"),
            );
        }
        Ok(())
    }

    /// Validate path is a directory
    pub fn validate_is_directory(path: &str, field_name: &str) -> Result<(), CommandError> {
        let path_buf = std::path::Path::new(path);
        if !path_buf.is_dir() {
            return Err(CommandError::validation(format!(
                "{field_name} must be a directory: {path}"
            ))
            .with_recovery_guidance("Please select a valid directory"));
        }
        Ok(())
    }

    /// Validate file size is within limits
    pub fn validate_file_size(path: &str, max_size_mb: u64) -> Result<(), CommandError> {
        let path_buf = std::path::Path::new(path);
        if let Ok(metadata) = std::fs::metadata(path_buf) {
            let size_mb = metadata.len() / (1024 * 1024);
            if size_mb > max_size_mb {
                return Err(CommandError::operation(
                    ErrorCode::FileTooLarge,
                    format!("File too large: {size_mb} MB (maximum {max_size_mb} MB)"),
                )
                .with_recovery_guidance("Please select a smaller file"));
            }
        }
        Ok(())
    }

    /// Validate key label format
    pub fn validate_key_label(label: &str) -> Result<(), CommandError> {
        // Key labels should only contain letters, numbers, and dashes
        if !label.chars().all(|c| c.is_alphanumeric() || c == '-') {
            return Err(CommandError::operation(
                ErrorCode::InvalidKeyLabel,
                "Key label contains invalid characters",
            )
            .with_recovery_guidance("Use only letters, numbers, and dashes"));
        }
        Ok(())
    }

    /// Validate passphrase strength
    pub fn validate_passphrase_strength(passphrase: &str) -> Result<(), CommandError> {
        if passphrase.len() < 8 {
            return Err(CommandError::operation(
                ErrorCode::WeakPassphrase,
                "Passphrase is too short (minimum 8 characters)",
            )
            .with_recovery_guidance("Use a longer passphrase"));
        }

        let has_letter = passphrase.chars().any(|c| c.is_alphabetic());
        let has_digit = passphrase.chars().any(|c| c.is_numeric());
        let _has_special = passphrase.chars().any(|c| !c.is_alphanumeric());

        if !has_letter || !has_digit {
            return Err(CommandError::operation(
                ErrorCode::WeakPassphrase,
                "Passphrase must contain letters and numbers",
            )
            .with_recovery_guidance("Include letters, numbers, and symbols for better security"));
        }

        Ok(())
    }
}

/// Standardized error handling with OpenTelemetry logging
pub struct ErrorHandler {
    span_context: Option<SpanContext>,
}

impl ErrorHandler {
    pub fn new() -> Self {
        Self { span_context: None }
    }

    pub fn with_span(mut self, span_context: SpanContext) -> Self {
        self.span_context = Some(span_context);
        self
    }

    /// Handle operation errors with structured logging
    pub fn handle_operation_error<T, E>(
        &self,
        result: Result<T, E>,
        context: &str,
        error_code: ErrorCode,
    ) -> Result<T, CommandError>
    where
        E: std::error::Error + 'static,
    {
        result.map_err(|e| {
            let error_message = format!("{context} failed: {e}");

            // Create structured error context
            let mut error_context = HashMap::new();
            error_context.insert("operation".to_string(), context.to_string());
            error_context.insert(
                "error_type".to_string(),
                std::any::type_name::<E>().to_string(),
            );

            if let Some(span) = &self.span_context {
                error_context.insert("trace_id".to_string(), span.trace_id.clone());
                error_context.insert("span_id".to_string(), span.span_id.clone());
            }

            // Log error with structured context
            log_error_with_context(&error_message, "operation_failed", error_context);

            // Create command error
            let mut command_error = CommandError::operation(error_code, error_message);

            // Add span context if available
            if let Some(span) = &self.span_context {
                command_error.trace_id = Some(span.trace_id.clone());
                command_error.span_id = Some(span.span_id.clone());
            }

            command_error
        })
    }

    /// Handle validation errors with structured logging
    pub fn handle_validation_error(&self, field: &str, reason: &str) -> CommandError {
        let error_message = format!("Validation failed for {field}: {reason}");

        // Create structured error context
        let mut error_context = HashMap::new();
        error_context.insert("field".to_string(), field.to_string());
        error_context.insert("reason".to_string(), reason.to_string());

        if let Some(span) = &self.span_context {
            error_context.insert("trace_id".to_string(), span.trace_id.clone());
            error_context.insert("span_id".to_string(), span.span_id.clone());
        }

        // Log validation error
        log_error_with_context(&error_message, "validation_failed", error_context);

        // Create command error
        let mut command_error = CommandError::validation(error_message);

        if let Some(span) = &self.span_context {
            command_error.trace_id = Some(span.trace_id.clone());
            command_error.span_id = Some(span.span_id.clone());
        }

        command_error
    }
}

impl Default for ErrorHandler {
    fn default() -> Self {
        Self::new()
    }
}

impl CommandError {
    /// Create a new validation error
    pub fn validation(message: impl Into<String>) -> Self {
        Self {
            code: ErrorCode::InvalidInput,
            message: message.into(),
            details: None,
            recovery_guidance: None,
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }
    }

    /// Create a new permission error
    pub fn permission(message: impl Into<String>) -> Self {
        Self {
            code: ErrorCode::PermissionDenied,
            message: message.into(),
            details: None,
            recovery_guidance: Some("Check file permissions and try again".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }
    }

    /// Create a new not found error
    pub fn not_found(message: impl Into<String>) -> Self {
        Self {
            code: ErrorCode::KeyNotFound,
            message: message.into(),
            details: None,
            recovery_guidance: Some("Verify the key exists and try again".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }
    }

    /// Create a new operation error
    pub fn operation(code: ErrorCode, message: impl Into<String>) -> Self {
        let (recovery_guidance, user_actionable) = Self::get_recovery_guidance(&code);
        Self {
            code,
            message: message.into(),
            details: None,
            recovery_guidance,
            user_actionable,
            trace_id: None,
            span_id: None,
        }
    }

    /// Add details to an error
    pub fn with_details(mut self, details: impl Into<String>) -> Self {
        self.details = Some(details.into());
        self
    }

    /// Add trace context to an error
    pub fn with_trace_context(
        mut self,
        trace_id: impl Into<String>,
        span_id: impl Into<String>,
    ) -> Self {
        self.trace_id = Some(trace_id.into());
        self.span_id = Some(span_id.into());
        self
    }

    /// Add recovery guidance to an error
    pub fn with_recovery_guidance(mut self, guidance: impl Into<String>) -> Self {
        self.recovery_guidance = Some(guidance.into());
        self
    }

    /// Mark error as not user actionable
    pub fn not_user_actionable(mut self) -> Self {
        self.user_actionable = false;
        self
    }

    /// Get recovery guidance and user actionable flag for an error code
    fn get_recovery_guidance(code: &ErrorCode) -> (Option<String>, bool) {
        match code {
            // Validation errors - user actionable
            ErrorCode::InvalidInput => (
                Some("Please check your input and try again".to_string()),
                true,
            ),
            ErrorCode::MissingParameter => (
                Some("Please provide all required information".to_string()),
                true,
            ),
            ErrorCode::InvalidPath => (
                Some("Please select a valid file or folder".to_string()),
                true,
            ),
            ErrorCode::InvalidKeyLabel => (
                Some("Use only letters, numbers, and dashes for key labels".to_string()),
                true,
            ),
            ErrorCode::WeakPassphrase => (
                Some("Use a stronger passphrase with letters, numbers, and symbols".to_string()),
                true,
            ),
            ErrorCode::InvalidFileFormat => {
                (Some("Please select a valid file format".to_string()), true)
            }
            ErrorCode::FileTooLarge => (
                Some("File is too large. Please select a smaller file".to_string()),
                true,
            ),
            ErrorCode::TooManyFiles => (
                Some("Too many files selected. Please reduce the selection".to_string()),
                true,
            ),

            // Permission errors - user actionable
            ErrorCode::PermissionDenied => (
                Some("Check file permissions and try again".to_string()),
                true,
            ),
            ErrorCode::PathNotAllowed => (
                Some("Please select a file from an allowed location".to_string()),
                true,
            ),
            ErrorCode::InsufficientPermissions => (
                Some("Run the application with appropriate permissions".to_string()),
                true,
            ),
            ErrorCode::ReadOnlyFileSystem => (
                Some(
                    "Cannot write to read-only location. Choose a different destination"
                        .to_string(),
                ),
                true,
            ),

            // Not found errors - user actionable
            ErrorCode::KeyNotFound => (
                Some("Verify the key exists and try again".to_string()),
                true,
            ),
            ErrorCode::FileNotFound => (
                Some("File not found. Please check the path and try again".to_string()),
                true,
            ),
            ErrorCode::DirectoryNotFound => (
                Some("Directory not found. Please check the path and try again".to_string()),
                true,
            ),
            ErrorCode::OperationNotFound => (
                Some("Operation not found. Please try again".to_string()),
                true,
            ),

            // Operation errors - some user actionable
            ErrorCode::EncryptionFailed => (
                Some("Encryption failed. Please check your files and try again".to_string()),
                true,
            ),
            ErrorCode::DecryptionFailed => (
                Some("Decryption failed. Please check your key and passphrase".to_string()),
                true,
            ),
            ErrorCode::StorageFailed => (
                Some("Storage operation failed. Please check disk space and try again".to_string()),
                true,
            ),
            ErrorCode::ArchiveCorrupted => (
                Some("Archive appears corrupted. Please use a different backup".to_string()),
                true,
            ),
            ErrorCode::ManifestInvalid => (
                Some("Manifest is invalid. Archive may be corrupted".to_string()),
                true,
            ),
            ErrorCode::IntegrityCheckFailed => (
                Some("Integrity check failed. Archive may be corrupted".to_string()),
                true,
            ),
            ErrorCode::ConcurrentOperation => (
                Some("Another operation is in progress. Please wait and try again".to_string()),
                true,
            ),

            // Resource errors - some user actionable
            ErrorCode::DiskSpaceInsufficient => (
                Some("Insufficient disk space. Please free up space and try again".to_string()),
                true,
            ),
            ErrorCode::MemoryInsufficient => (
                Some(
                    "Insufficient memory. Please close other applications and try again"
                        .to_string(),
                ),
                true,
            ),
            ErrorCode::FileSystemError => (
                Some("File system error. Please check your disk and try again".to_string()),
                true,
            ),
            ErrorCode::NetworkError => (
                Some("Network error. Please check your connection and try again".to_string()),
                true,
            ),

            // Security errors - user actionable
            ErrorCode::InvalidKey => (
                Some("Invalid key. Please select the correct encryption key".to_string()),
                true,
            ),
            ErrorCode::WrongPassphrase => {
                (Some("Wrong passphrase. Please try again".to_string()), true)
            }
            ErrorCode::TamperedData => (
                Some("Data appears to have been tampered with".to_string()),
                true,
            ),
            ErrorCode::UnauthorizedAccess => (
                Some("Unauthorized access. Please check your permissions".to_string()),
                true,
            ),

            // Internal errors - not user actionable
            ErrorCode::InternalError => (
                Some("An internal error occurred. Please restart the application".to_string()),
                false,
            ),
            ErrorCode::UnexpectedError => (
                Some("An unexpected error occurred. Please restart the application".to_string()),
                false,
            ),
            ErrorCode::ConfigurationError => (
                Some("Configuration error. Please reinstall the application".to_string()),
                false,
            ),
        }
    }
}

impl fmt::Display for CommandError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for CommandError {}

// ============================================================================
// PROGRESS REPORTING INFRASTRUCTURE
// ============================================================================

/// Progress callback function type for Tauri commands
pub type ProgressCallback = Box<dyn Fn(ProgressUpdate) + Send + Sync>;

/// Progress manager for tracking and reporting operation progress
pub struct ProgressManager {
    operation_id: String,
    start_time: chrono::DateTime<chrono::Utc>,
    last_update: chrono::DateTime<chrono::Utc>,
    callback: Option<ProgressCallback>,
    total_work: u64,
    completed_work: u64,
    current_message: String,
    current_details: Option<ProgressDetails>,
}

impl ProgressManager {
    /// Create a new progress manager
    pub fn new(operation_id: String, total_work: u64) -> Self {
        let now = chrono::Utc::now();
        Self {
            operation_id,
            start_time: now,
            last_update: now,
            callback: None,
            total_work,
            completed_work: 0,
            current_message: "Starting operation...".to_string(),
            current_details: None,
        }
    }

    /// Set the progress callback
    pub fn with_callback(mut self, callback: ProgressCallback) -> Self {
        self.callback = Some(callback);
        self
    }

    /// Update progress with completed work
    pub fn update_progress(&mut self, completed: u64, message: impl Into<String>) {
        self.completed_work = completed;
        self.current_message = message.into();
        self.report_progress();
    }

    /// Update progress with details
    pub fn update_with_details(
        &mut self,
        completed: u64,
        message: impl Into<String>,
        details: ProgressDetails,
    ) {
        self.completed_work = completed;
        self.current_message = message.into();
        self.current_details = Some(details);
        self.report_progress();
    }

    /// Increment progress by a specific amount
    pub fn increment(&mut self, increment: u64, message: impl Into<String>) {
        self.completed_work += increment;
        self.current_message = message.into();
        self.report_progress();
    }

    /// Set progress to a specific percentage
    pub fn set_progress(&mut self, percentage: f32, message: impl Into<String>) {
        let completed = (self.total_work as f32 * percentage) as u64;
        self.update_progress(completed, message);
    }

    /// Complete the operation
    pub fn complete(&mut self, message: impl Into<String>) {
        self.completed_work = self.total_work;
        self.current_message = message.into();
        self.report_progress();
    }

    /// Report current progress to callback
    fn report_progress(&mut self) {
        let progress = if self.total_work > 0 {
            self.completed_work as f32 / self.total_work as f32
        } else {
            0.0
        };

        let estimated_time_remaining = self.calculate_eta();

        let update = ProgressUpdate {
            operation_id: self.operation_id.clone(),
            progress,
            message: self.current_message.clone(),
            details: self.current_details.clone(),
            timestamp: chrono::Utc::now(),
            estimated_time_remaining,
        };

        // Update global progress tracker
        if let Some(callback) = &self.callback {
            callback(update.clone());
        }

        self.last_update = chrono::Utc::now();
    }

    /// Calculate estimated time remaining
    fn calculate_eta(&self) -> Option<u64> {
        if self.completed_work == 0 || self.total_work == 0 {
            return None;
        }

        let elapsed = (chrono::Utc::now() - self.start_time).num_seconds() as u64;
        if elapsed == 0 {
            return None;
        }

        let rate = self.completed_work as f64 / elapsed as f64;
        let remaining_work = self.total_work - self.completed_work;
        let eta = (remaining_work as f64 / rate) as u64;

        Some(eta)
    }

    /// Get current progress percentage
    pub fn progress_percentage(&self) -> u8 {
        if self.total_work > 0 {
            ((self.completed_work as f32 / self.total_work as f32) * 100.0) as u8
        } else {
            0
        }
    }

    /// Get current progress as fraction
    pub fn progress_fraction(&self) -> f32 {
        if self.total_work > 0 {
            self.completed_work as f32 / self.total_work as f32
        } else {
            0.0
        }
    }

    /// Get current progress update
    pub fn get_current_update(&self) -> ProgressUpdate {
        let progress = self.progress_fraction();
        let estimated_time_remaining = self.calculate_eta();

        ProgressUpdate {
            operation_id: self.operation_id.clone(),
            progress,
            message: self.current_message.clone(),
            details: self.current_details.clone(),
            timestamp: chrono::Utc::now(),
            estimated_time_remaining,
        }
    }
}
