//! # Command Types and Error Handling for Tauri Bridge
//!
//! This module defines the core types used by all Tauri commands,
//! including error handling, progress updates, and validation traits.
//!
//! ## TypeScript Generation
//! These types are used to generate TypeScript definitions for the frontend.
//! All public types implement `Serialize`/`Deserialize` for Tauri bridge compatibility.
//!
//! ## Error Handling Strategy
//! - All commands return `CommandResponse<T>` (alias for `Result<T, CommandError>`)
//! - Errors include user-friendly messages and recovery guidance
//! - Error codes enable client-side error handling
//!
//! ## Progress Tracking
//! - Long-running operations emit progress updates
//! - Progress includes percentage, message, and operation-specific details
//! - Frontend can subscribe to progress events for real-time updates
//!
//! ## Security Considerations
//! - Sensitive data (passphrases, keys) are never logged
//! - Error messages don't leak sensitive information
//! - All input is validated before processing

use crate::constants::*;
use crate::logging::{log_error_with_context, SpanContext};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;

/// Standard command response wrapper for Tauri bridge
///
/// This enum provides a consistent response format for all commands.
/// The frontend can pattern match on the status to handle success/error cases.
/// The error type is boxed to avoid large error variants.
///
/// # TypeScript Equivalent
/// ```typescript
/// type CommandResult<T> =
///   | { status: 'success'; data: T }
///   | { status: 'error'; data: CommandError };
/// ```
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "status", content = "data")]
pub enum CommandResult<T> {
    /// Successful command execution with result data
    Success(T),
    /// Command failed with error details
    Error(Box<CommandError>),
}

/// Type alias for command results to make them easier to work with
///
/// This is the primary return type for all Tauri commands.
/// It provides a consistent error handling pattern across the application.
/// The error type is boxed to avoid large error variants in Result types.
///
/// # TypeScript Equivalent
/// ```typescript
/// type CommandResponse<T> = T | CommandError;
/// ```
pub type CommandResponse<T> = Result<T, Box<CommandError>>;

/// Unified error type for all commands with comprehensive error information
///
/// This struct provides detailed error information including:
/// - Error code for programmatic handling
/// - User-friendly message for display
/// - Optional technical details for debugging
/// - Recovery guidance for user actions
/// - Trace context for debugging
///
/// # TypeScript Equivalent
/// ```typescript
/// interface CommandError {
///   code: ErrorCode;
///   message: string;
///   details?: string;
///   recovery_guidance?: string;
///   user_actionable: boolean;
///   trace_id?: string;
///   span_id?: string;
/// }
/// ```
#[derive(Debug, Serialize, Deserialize)]
pub struct CommandError {
    /// Error code for client-side handling
    pub code: ErrorCode,
    /// User-friendly error message
    pub message: String,
    /// Optional technical details for debugging
    pub details: Option<String>,
    /// Optional guidance for user recovery
    pub recovery_guidance: Option<String>,
    /// Whether the user can take action to resolve this error
    pub user_actionable: bool,
    /// Optional trace ID for debugging
    pub trace_id: Option<String>,
    /// Optional span ID for debugging
    pub span_id: Option<String>,
}

/// Error codes for client-side handling and internationalization
///
/// These codes enable the frontend to:
/// - Display appropriate error messages
/// - Implement error-specific recovery flows
/// - Provide localized error messages
/// - Handle errors programmatically
///
/// # TypeScript Equivalent
/// ```typescript
/// enum ErrorCode {
///   // Validation errors
///   INVALID_INPUT = 'INVALID_INPUT',
///   MISSING_PARAMETER = 'MISSING_PARAMETER',
///   INVALID_PATH = 'INVALID_PATH',
///   INVALID_KEY_LABEL = 'INVALID_KEY_LABEL',
///   WEAK_PASSPHRASE = 'WEAK_PASSPHRASE',
///   INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',
///   FILE_TOO_LARGE = 'FILE_TOO_LARGE',
///   TOO_MANY_FILES = 'TOO_MANY_FILES',
///   
///   // Permission errors
///   PERMISSION_DENIED = 'PERMISSION_DENIED',
///   PATH_NOT_ALLOWED = 'PATH_NOT_ALLOWED',
///   INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
///   READ_ONLY_FILE_SYSTEM = 'READ_ONLY_FILE_SYSTEM',
///   
///   // Not found errors
///   KEY_NOT_FOUND = 'KEY_NOT_FOUND',
///   FILE_NOT_FOUND = 'FILE_NOT_FOUND',
///   DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
///   OPERATION_NOT_FOUND = 'OPERATION_NOT_FOUND',
///   
///   // Operation errors
///   ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
///   DECRYPTION_FAILED = 'DECRYPTION_FAILED',
///   STORAGE_FAILED = 'STORAGE_FAILED',
///   ARCHIVE_CORRUPTED = 'ARCHIVE_CORRUPTED',
///   MANIFEST_INVALID = 'MANIFEST_INVALID',
///   INTEGRITY_CHECK_FAILED = 'INTEGRITY_CHECK_FAILED',
///   CONCURRENT_OPERATION = 'CONCURRENT_OPERATION',
///   
///   // Resource errors
///   DISK_SPACE_INSUFFICIENT = 'DISK_SPACE_INSUFFICIENT',
///   MEMORY_INSUFFICIENT = 'MEMORY_INSUFFICIENT',
///   FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
///   NETWORK_ERROR = 'NETWORK_ERROR',
///   
///   // Security errors
///   INVALID_KEY = 'INVALID_KEY',
///   WRONG_PASSPHRASE = 'WRONG_PASSPHRASE',
///   TAMPERED_DATA = 'TAMPERED_DATA',
///   UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
///   
///   // Internal errors
///   INTERNAL_ERROR = 'INTERNAL_ERROR',
///   UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
///   CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
/// }
/// ```
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

/// Progress update for streaming operations with detailed information
///
/// This struct provides comprehensive progress information for long-running operations.
/// The frontend can use this to display progress bars, status messages, and estimated completion times.
///
/// # TypeScript Equivalent
/// ```typescript
/// interface ProgressUpdate {
///   operation_id: string;
///   progress: number; // 0.0 to 1.0
///   message: string;
///   details?: ProgressDetails;
///   timestamp: string; // ISO 8601
///   estimated_time_remaining?: number; // seconds
/// }
/// ```
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProgressUpdate {
    /// Unique identifier for the operation
    pub operation_id: String,
    /// Progress percentage from 0.0 to 1.0
    pub progress: f32,
    /// Human-readable status message
    pub message: String,
    /// Optional operation-specific progress details
    pub details: Option<ProgressDetails>,
    /// Timestamp of the progress update
    pub timestamp: chrono::DateTime<chrono::Utc>,
    /// Estimated time remaining in seconds
    pub estimated_time_remaining: Option<u64>,
}

/// Operation-specific progress details for different command types
///
/// This enum provides detailed progress information specific to different operation types.
/// The frontend can use this to display operation-specific progress indicators.
///
/// # TypeScript Equivalent
/// ```typescript
/// type ProgressDetails =
///   | { type: 'FileOperation'; current_file: string; total_files: number; current_file_progress: number; current_file_size: number; total_size: number }
///   | { type: 'Encryption'; bytes_processed: number; total_bytes: number; encryption_rate?: number }
///   | { type: 'Decryption'; bytes_processed: number; total_bytes: number; decryption_rate?: number }
///   | { type: 'ArchiveOperation'; files_processed: number; total_files: number; bytes_processed: number; total_bytes: number; compression_ratio?: number }
///   | { type: 'ManifestOperation'; files_verified: number; total_files: number; current_file: string };
/// ```
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum ProgressDetails {
    /// File operation progress (copying, moving, etc.)
    FileOperation {
        /// Current file being processed
        current_file: String,
        /// Total number of files to process
        total_files: usize,
        /// Progress within current file (0.0 to 1.0)
        current_file_progress: f32,
        /// Size of current file in bytes
        current_file_size: u64,
        /// Total size of all files in bytes
        total_size: u64,
    },
    /// Encryption operation progress
    Encryption {
        /// Bytes processed so far
        bytes_processed: u64,
        /// Total bytes to process
        total_bytes: u64,
        /// Encryption rate in bytes per second
        encryption_rate: Option<f64>,
    },
    /// Decryption operation progress
    Decryption {
        /// Bytes processed so far
        bytes_processed: u64,
        /// Total bytes to process
        total_bytes: u64,
        /// Decryption rate in bytes per second
        decryption_rate: Option<f64>,
    },
    /// Archive operation progress (compression, extraction)
    ArchiveOperation {
        /// Files processed so far
        files_processed: usize,
        /// Total files to process
        total_files: usize,
        /// Bytes processed so far
        bytes_processed: u64,
        /// Total bytes to process
        total_bytes: u64,
        /// Compression ratio achieved
        compression_ratio: Option<f32>,
    },
    /// Manifest operation progress (verification, generation)
    ManifestOperation {
        /// Files verified so far
        files_verified: usize,
        /// Total files to verify
        total_files: usize,
        /// Current file being verified
        current_file: String,
    },
}

/// Trait for validatable command inputs
pub trait ValidateInput {
    fn validate(&self) -> Result<(), Box<CommandError>>;
}

/// Enhanced validation trait with detailed error reporting
pub trait ValidateInputDetailed {
    fn validate_detailed(&self) -> Result<(), Box<CommandError>>;

    /// Get field-specific validation rules
    fn get_validation_rules() -> HashMap<String, String> {
        HashMap::new()
    }

    /// Validate a specific field
    fn validate_field(&self, _field_name: &str) -> Result<(), Box<CommandError>> {
        self.validate_detailed()
    }
}

/// Validation helper for consistent error messages
pub struct ValidationHelper;

impl ValidationHelper {
    /// Validate that a string is not empty
    pub fn validate_not_empty(value: &str, field_name: &str) -> Result<(), Box<CommandError>> {
        if value.trim().is_empty() {
            return Err(Box::new(
                CommandError::validation(format!("{field_name} cannot be empty"))
                    .with_recovery_guidance(format!("Please provide a {field_name}")),
            ));
        }
        Ok(())
    }

    /// Validate string length
    pub fn validate_length(
        value: &str,
        field_name: &str,
        min: usize,
        max: usize,
    ) -> Result<(), Box<CommandError>> {
        let len = value.len();
        if len < min {
            return Err(Box::new(
                CommandError::validation(format!(
                    "{field_name} is too short (minimum {min} characters)"
                ))
                .with_recovery_guidance(format!("Please provide a longer {field_name}")),
            ));
        }
        if len > max {
            return Err(Box::new(
                CommandError::validation(format!(
                    "{field_name} is too long (maximum {max} characters)"
                ))
                .with_recovery_guidance(format!("Please provide a shorter {field_name}")),
            ));
        }
        Ok(())
    }

    /// Validate path exists and is accessible
    pub fn validate_path_exists(path: &str, field_name: &str) -> Result<(), Box<CommandError>> {
        let path_buf = std::path::Path::new(path);
        if !path_buf.exists() {
            return Err(Box::new(
                CommandError::operation(
                    ErrorCode::FileNotFound,
                    format!("{field_name} not found: {path}"),
                )
                .with_recovery_guidance("Please check the path and try again"),
            ));
        }
        Ok(())
    }

    /// Validate path is a file
    pub fn validate_is_file(path: &str, field_name: &str) -> Result<(), Box<CommandError>> {
        let path_buf = std::path::Path::new(path);
        if !path_buf.is_file() {
            return Err(Box::new(
                CommandError::validation(format!("{field_name} must be a file: {path}"))
                    .with_recovery_guidance("Please select a valid file"),
            ));
        }
        Ok(())
    }

    /// Validate path is a directory
    pub fn validate_is_directory(path: &str, field_name: &str) -> Result<(), Box<CommandError>> {
        let path_buf = std::path::Path::new(path);
        if !path_buf.is_dir() {
            return Err(Box::new(
                CommandError::validation(format!("{field_name} must be a directory: {path}"))
                    .with_recovery_guidance("Please select a valid directory"),
            ));
        }
        Ok(())
    }

    /// Validate file size is within limits
    pub fn validate_file_size(path: &str, max_size_mb: u64) -> Result<(), Box<CommandError>> {
        let path_buf = std::path::Path::new(path);
        if let Ok(metadata) = std::fs::metadata(path_buf) {
            let size_mb = metadata.len() / BYTES_PER_MB;
            if size_mb > max_size_mb {
                return Err(Box::new(
                    CommandError::operation(
                        ErrorCode::FileTooLarge,
                        format!("File too large: {size_mb} MB (maximum {max_size_mb} MB)"),
                    )
                    .with_recovery_guidance("Please select a smaller file"),
                ));
            }
        }
        Ok(())
    }

    /// Validate key label format
    pub fn validate_key_label(label: &str) -> Result<(), Box<CommandError>> {
        // Key labels should only contain letters, numbers, and dashes
        if !label.chars().all(|c| c.is_alphanumeric() || c == '-') {
            return Err(Box::new(
                CommandError::operation(
                    ErrorCode::InvalidKeyLabel,
                    "Key label contains invalid characters",
                )
                .with_recovery_guidance("Use only letters, numbers, and dashes"),
            ));
        }
        Ok(())
    }

    /// Validate passphrase strength
    pub fn validate_passphrase_strength(passphrase: &str) -> Result<(), Box<CommandError>> {
        if passphrase.len() < MIN_PASSPHRASE_LENGTH_BASIC {
            return Err(Box::new(
                CommandError::operation(
                    ErrorCode::WeakPassphrase,
                    format!(
                        "Passphrase is too short (minimum {MIN_PASSPHRASE_LENGTH_BASIC} characters)"
                    )
                    .as_str(),
                )
                .with_recovery_guidance("Use a longer passphrase"),
            ));
        }

        let has_letter = passphrase.chars().any(|c| c.is_alphabetic());
        let has_digit = passphrase.chars().any(|c| c.is_numeric());
        let _has_special = passphrase.chars().any(|c| !c.is_alphanumeric());

        if !has_letter || !has_digit {
            return Err(Box::new(
                CommandError::operation(
                    ErrorCode::WeakPassphrase,
                    "Passphrase must contain letters and numbers",
                )
                .with_recovery_guidance(
                    "Include letters, numbers, and symbols for better security",
                ),
            ));
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
    ) -> Result<T, Box<CommandError>>
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

            Box::new(command_error)
        })
    }

    /// Handle validation errors with structured logging
    pub fn handle_validation_error(&self, field: &str, reason: &str) -> Box<CommandError> {
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

        Box::new(command_error)
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

impl From<Box<CommandError>> for CommandError {
    fn from(boxed_error: Box<CommandError>) -> Self {
        *boxed_error
    }
}

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
            ((self.completed_work as f32 / self.total_work as f32) * PROGRESS_PERCENTAGE_MULTIPLIER)
                as u8
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
