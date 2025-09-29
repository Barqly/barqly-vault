//! Error handling infrastructure
//!
//! This module provides centralized error handling, logging, conversion,
//! and recovery mechanisms across all domains. Designed for future
//! enhancement with advanced error handling capabilities.

pub mod handler;

pub use handler::*;
