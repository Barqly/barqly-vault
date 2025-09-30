//! Standardized error handling with structured logging
//!
//! This module provides the ErrorHandler for consistent error handling and logging.

use super::{CommandError, ErrorCode};
use crate::prelude::*;

/// Standardized error handling with structured tracing
pub struct ErrorHandler {}

impl ErrorHandler {
    pub fn new() -> Self {
        Self {}
    }

    /// Deprecated: Span context is now handled by tracing infrastructure
    /// This method is kept for backward compatibility but does nothing
    pub fn with_span<T>(self, _span_context: T) -> Self {
        self
    }

    /// Handle operation errors with structured logging
    #[instrument(skip(self, result), fields(context = %context, error_code = ?error_code))]
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

            // Log error with structured fields
            error!(
                operation = %context,
                error_type = %std::any::type_name::<E>(),
                error = %e,
                "Operation failed"
            );

            // Create command error with tracing context automatically captured
            let command_error = CommandError::operation(error_code, error_message);
            Box::new(command_error)
        })
    }

    /// Handle crypto operation errors with specific error type handling
    #[instrument(skip(self, result), fields(context = %context))]
    pub fn handle_crypto_operation_error<T>(
        &self,
        result: Result<T, crate::services::crypto::infrastructure::CryptoError>,
        context: &str,
    ) -> Result<T, Box<CommandError>> {
        result.map_err(|e| {
            let (error_code, error_message) = match &e {
                crate::services::crypto::infrastructure::CryptoError::WrongPassphrase => {
                    debug!(
                        operation = %context,
                        error_type = "WrongPassphrase",
                        "Passphrase validation failed"
                    );
                    (
                        ErrorCode::WrongPassphrase,
                        "Incorrect passphrase for the selected key".to_string(),
                    )
                }
                crate::services::crypto::infrastructure::CryptoError::InvalidKeyFormat(msg) => {
                    error!(
                        operation = %context,
                        error_type = "InvalidKeyFormat",
                        error = %e,
                        "Invalid key format"
                    );
                    (ErrorCode::InvalidKey, format!("Invalid key format: {msg}"))
                }
                crate::services::crypto::infrastructure::CryptoError::DecryptionFailed(msg) => {
                    error!(
                        operation = %context,
                        error_type = "DecryptionFailed",
                        error = %e,
                        "Decryption operation failed"
                    );
                    (
                        ErrorCode::DecryptionFailed,
                        format!("Decryption failed: {msg}"),
                    )
                }
                crate::services::crypto::infrastructure::CryptoError::EncryptionFailed(msg) => {
                    error!(
                        operation = %context,
                        error_type = "EncryptionFailed",
                        error = %e,
                        "Encryption operation failed"
                    );
                    (
                        ErrorCode::EncryptionFailed,
                        format!("Encryption failed: {msg}"),
                    )
                }
                _ => {
                    error!(
                        operation = %context,
                        error_type = %std::any::type_name::<crate::services::crypto::infrastructure::CryptoError>(),
                        error = %e,
                        "Crypto operation failed"
                    );
                    (ErrorCode::InternalError, format!("{context} failed: {e}"))
                }
            };

            // Create command error with appropriate error code and message
            let command_error = CommandError::operation(error_code, error_message)
                .with_details(format!("Crypto error in {context}: {e}"));
            Box::new(command_error)
        })
    }

    /// Handle validation errors with structured logging
    #[instrument(skip(self), fields(field = %field, reason = %reason))]
    pub fn handle_validation_error(&self, field: &str, reason: &str) -> Box<CommandError> {
        let error_message = format!("Validation failed for {field}: {reason}");

        // Log validation error with structured fields
        error!(
            field = %field,
            reason = %reason,
            "Validation failed"
        );

        // Create command error with tracing context automatically captured
        let command_error = CommandError::validation(error_message);
        Box::new(command_error)
    }
}

impl Default for ErrorHandler {
    fn default() -> Self {
        Self::new()
    }
}
