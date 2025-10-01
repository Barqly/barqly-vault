//! Error handling infrastructure
//!
//! This module provides centralized error handling, logging, conversion,
//! and recovery mechanisms across all domains. Designed for future
//! enhancement with advanced error handling capabilities.

pub mod handler;
pub mod storage;
pub mod universal;

pub use handler::*;
pub use storage::StorageError;
pub use universal::*;
