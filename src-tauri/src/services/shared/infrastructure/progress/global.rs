//! Global progress tracking for long-running operations
//!
//! Provides centralized progress state management that can be queried
//! by progress commands and updated by service operations.

use crate::types::ProgressUpdate;
use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::atomic::AtomicBool;

/// Global operation state to prevent race conditions
pub static ENCRYPTION_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

/// Global progress tracking
pub static PROGRESS_TRACKER: once_cell::sync::Lazy<Mutex<HashMap<String, ProgressUpdate>>> =
    once_cell::sync::Lazy::new(|| Mutex::new(HashMap::new()));

/// Update global progress for an operation
pub fn update_global_progress(operation_id: &str, progress: ProgressUpdate) {
    if let Ok(mut tracker) = PROGRESS_TRACKER.lock() {
        tracker.insert(operation_id.to_string(), progress);
    }
}

/// Get global progress for an operation
pub fn get_global_progress(operation_id: &str) -> Option<ProgressUpdate> {
    if let Ok(tracker) = PROGRESS_TRACKER.lock() {
        tracker.get(operation_id).cloned()
    } else {
        None
    }
}
