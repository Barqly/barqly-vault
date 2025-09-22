//! Project-wide prelude for common imports
//!
//! This module re-exports commonly used items to reduce boilerplate
//! across the codebase. Import with `use crate::prelude::*;`

// Re-export tracing macros for logging
pub use crate::tracing_setup::{debug, error, info, trace, warn};
pub use crate::tracing_setup::{debug_span, error_span, info_span, trace_span, warn_span};
pub use crate::tracing_setup::{event, instrument, span};

// Re-export redaction utilities for sensitive data
pub use crate::tracing_setup::redaction::{Sensitive, redact_pin, redact_key, redact_serial};
pub use crate::log_sensitive;

// Re-export common error types
pub use crate::commands::command_types::{CommandError, CommandResponse, ErrorCode};

// Common traits that are used frequently
pub use async_trait::async_trait;
pub use serde::{Deserialize, Serialize};

// Note: We don't re-export Result<T> to avoid conflicts with existing Result types
// Files should use their specific Result types or std::result::Result directly