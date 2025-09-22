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
