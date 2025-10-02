//! Core command types for Tauri bridge
//!
//! This module defines the fundamental types used by all Tauri commands.

use serde::{Deserialize, Serialize};

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
    Error(Box<super::CommandError>),
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
pub type CommandResponse<T> = Result<T, Box<super::CommandError>>;

/// Progress callback function type for Tauri commands
pub type ProgressCallback = Box<dyn Fn(super::ProgressUpdate) + Send + Sync>;
