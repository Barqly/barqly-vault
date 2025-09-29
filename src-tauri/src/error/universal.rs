//! Universal error structure for cross-layer communication
//!
//! This module provides a universal error information structure that can be
//! used across all layers without requiring conversion utilities.

/// Universal error information that can be used across all architectural layers
#[derive(Debug, Clone)]
pub struct ErrorInfo {
    /// Unique identifier for the error type/category
    pub error_id: String,
    /// Human-readable description of what went wrong
    pub description: String,
}

impl ErrorInfo {
    /// Create a new error info with ID and description
    pub fn new(error_id: impl Into<String>, description: impl Into<String>) -> Self {
        Self {
            error_id: error_id.into(),
            description: description.into(),
        }
    }

    /// Create validation error
    pub fn validation(description: impl Into<String>) -> Self {
        Self::new("validation_failed", description)
    }

    /// Create configuration error
    pub fn configuration(description: impl Into<String>) -> Self {
        Self::new("configuration_error", description)
    }

    /// Create operation error
    pub fn operation(description: impl Into<String>) -> Self {
        Self::new("operation_failed", description)
    }

    /// Create not found error
    pub fn not_found(description: impl Into<String>) -> Self {
        Self::new("not_found", description)
    }
}
