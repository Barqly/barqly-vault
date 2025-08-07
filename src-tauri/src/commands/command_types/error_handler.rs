//! Standardized error handling with structured logging
//!
//! This module provides the ErrorHandler for consistent error handling and logging.

use super::{CommandError, ErrorCode};
use crate::logging::{log_error_with_context, SpanContext};
use std::collections::HashMap;

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
