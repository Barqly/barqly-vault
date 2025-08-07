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

// Module declarations
mod core;
mod error;
mod error_code;
mod error_handler;
mod error_recovery;
mod progress;
mod progress_manager;
mod validation;

// Re-export all types for backward compatibility
pub use core::{CommandResponse, CommandResult, ProgressCallback};
pub use error::CommandError;
pub use error_code::ErrorCode;
pub use error_handler::ErrorHandler;
pub use progress::{ProgressDetails, ProgressUpdate};
pub use progress_manager::ProgressManager;
pub use validation::{ValidateInput, ValidateInputDetailed, ValidationHelper};
