//! Command types and error handling for Tauri bridge
//!
//! This module defines the core types used by all Tauri commands,
//! including error handling, progress updates, and validation traits.

use serde::{Deserialize, Serialize};
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

impl CommandError {
    /// Create a new validation error
    pub fn validation(message: impl Into<String>) -> Self {
        Self {
            code: ErrorCode::InvalidInput,
            message: message.into(),
            details: None,
        }
    }

    /// Create a new permission error
    pub fn permission(message: impl Into<String>) -> Self {
        Self {
            code: ErrorCode::PermissionDenied,
            message: message.into(),
            details: None,
        }
    }

    /// Create a new not found error
    pub fn not_found(message: impl Into<String>) -> Self {
        Self {
            code: ErrorCode::KeyNotFound,
            message: message.into(),
            details: None,
        }
    }

    /// Create a new operation error
    pub fn operation(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
            details: None,
        }
    }

    /// Add details to an error
    pub fn with_details(mut self, details: impl Into<String>) -> Self {
        self.details = Some(details.into());
        self
    }
}

impl fmt::Display for CommandError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for CommandError {}
