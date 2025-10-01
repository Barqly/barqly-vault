//! Error handling infrastructure
//!
//! Provides centralized error handling utilities for standardized error management
//! across all service layers.

pub mod handler;

// Re-export for convenience
pub use handler::ErrorHandler;
