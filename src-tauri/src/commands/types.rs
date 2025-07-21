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

    // Permission errors
    PermissionDenied,
    PathNotAllowed,

    // Not found errors
    KeyNotFound,
    FileNotFound,

    // Operation errors
    EncryptionFailed,
    DecryptionFailed,
    StorageFailed,

    // Internal errors
    InternalError,
}

/// Progress update for streaming operations
#[derive(Debug, Serialize, Deserialize)]
pub struct ProgressUpdate {
    pub operation_id: String,
    pub progress: f32, // 0.0 to 1.0
    pub message: String,
    pub details: Option<ProgressDetails>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ProgressDetails {
    FileOperation {
        current_file: String,
        total_files: usize,
        current_file_progress: f32,
    },
    Encryption {
        bytes_processed: u64,
        total_bytes: u64,
    },
}

/// Trait for validatable command inputs
pub trait ValidateInput {
    fn validate(&self) -> Result<(), CommandError>;
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
            trace_id: None,
            span_id: None,
        }
    }

    /// Create a new operation error
    pub fn operation(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            details: None,
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
}

impl fmt::Display for CommandError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for CommandError {}
