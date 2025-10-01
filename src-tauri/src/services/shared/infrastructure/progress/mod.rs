//! Progress tracking infrastructure for long-running operations
//!
//! This module provides:
//! - ProgressManager: Debounced progress reporting for efficient UI updates
//! - Global progress state: Centralized tracking for querying operation status

pub mod global;
pub mod manager;

// Re-export for convenience
pub use global::{
    ENCRYPTION_IN_PROGRESS, PROGRESS_TRACKER, get_global_progress, update_global_progress,
};
pub use manager::ProgressManager;
