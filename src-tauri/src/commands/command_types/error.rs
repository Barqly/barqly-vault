//! Command error type and implementations
//!
//! This module defines the CommandError struct used for all command error handling.

use super::ErrorCode;
use serde::{Deserialize, Serialize};
use std::fmt;

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
#[derive(Debug, Serialize, Deserialize, specta::Type)]
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
        let (recovery_guidance, user_actionable) =
            super::error_recovery::get_recovery_guidance(&code);
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

    /// Create a context-aware error with operation-specific recovery guidance
    pub fn with_operation_context(mut self, operation: &str) -> Self {
        if self.recovery_guidance.is_none() {
            self.recovery_guidance = Some(get_operation_specific_guidance(operation, &self.code));
        }
        self
    }
}

/// Get operation-specific recovery guidance
fn get_operation_specific_guidance(operation: &str, code: &ErrorCode) -> String {
    match (operation, code) {
        ("key_generation", ErrorCode::WeakPassphrase) => {
            "For Bitcoin key protection, use a strong passphrase you'll remember. Consider: 'MyBitcoin-Inheritance2024!'".to_string()
        },
        ("file_encryption", ErrorCode::FileNotFound) => {
            "Ensure the wallet files or keys you want to encrypt are still in their original location".to_string()
        },
        ("file_encryption", ErrorCode::FileTooLarge) => {
            "Bitcoin wallet files are typically small. If encrypting a blockchain database, consider backing up just the wallet.dat file instead".to_string()
        },
        ("file_decryption", ErrorCode::WrongPassphrase) => {
            "This is the passphrase you created when generating the key (not your Bitcoin wallet password). Try typing it carefully".to_string()
        },
        ("file_decryption", ErrorCode::InvalidKey) => {
            "Use the same key that was used to encrypt these files. Check the key label to ensure it matches".to_string()
        },
        ("file_decryption", ErrorCode::ArchiveCorrupted) => {
            "The encrypted backup may be damaged. Check if you have another copy of this backup file".to_string()
        },
        ("key_storage", ErrorCode::PermissionDenied) => {
            "Barqly Vault needs permission to save your encryption keys securely. Allow file system access".to_string()
        },
        _ => super::error_recovery::get_recovery_guidance(code).0.unwrap_or_else(|| "Please try again".to_string())
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
