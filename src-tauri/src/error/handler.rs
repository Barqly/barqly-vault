//! Error handling infrastructure
//!
//! Centralized error handling with structured logging, recovery mechanisms,
//! and standardized error conversion across all domains.

use crate::prelude::*;
use crate::types::{CommandError, ErrorCode};

/// Centralized error handler for consistent error processing across domains
#[derive(Debug)]
pub struct ErrorHandler;

impl ErrorHandler {
    pub fn new() -> Self {
        Self
    }

    /// Handle operation errors with structured logging and standardized conversion
    #[instrument(skip(result), fields(context = %context, error_code = ?error_code))]
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

            // Structured logging with contextual information
            error!(
                operation = %context,
                error_type = %std::any::type_name::<E>(),
                error = %e,
                "Operation failed"
            );

            // Standardized error conversion
            let command_error = CommandError::operation(error_code, error_message);
            Box::new(command_error)
        })
    }
}

impl Default for ErrorHandler {
    fn default() -> Self {
        Self::new()
    }
}
