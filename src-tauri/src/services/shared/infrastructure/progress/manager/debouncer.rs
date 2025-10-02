//! Progress update debouncing logic
//!
//! This module handles the intelligent debouncing of progress updates to reduce
//! IPC overhead while ensuring important updates are delivered immediately.

use crate::constants::*;
use crate::types::{ProgressCallback, ProgressUpdate};

/// Debouncing state for progress updates
pub struct ProgressDebouncer {
    last_emit_time: std::time::Instant,
    last_emit_progress: f32,
    pending_update: Option<ProgressUpdate>,
    callback: Option<ProgressCallback>,
}

impl ProgressDebouncer {
    /// Create a new progress debouncer
    pub fn new() -> Self {
        Self {
            last_emit_time: std::time::Instant::now(),
            last_emit_progress: 0.0,
            pending_update: None,
            callback: None,
        }
    }

    /// Set the progress callback
    pub fn set_callback(&mut self, callback: ProgressCallback) {
        self.callback = Some(callback);
    }

    /// Process a progress update with debouncing logic
    pub fn process_update(&mut self, update: ProgressUpdate) {
        if self.should_emit_immediately(update.progress) {
            self.emit_progress_update(update);
        } else {
            // Store as pending update for debouncing
            self.pending_update = Some(update);
            // Check if enough time has passed to emit pending update
            self.try_emit_pending_update();
        }
    }

    /// Determine if progress update should be emitted immediately
    fn should_emit_immediately(&self, current_progress: f32) -> bool {
        // Always emit start (0%) and completion (100%)
        if PROGRESS_IMMEDIATE_EMIT_VALUES.contains(&current_progress) {
            return true;
        }

        // Emit if progress change is significant (>10%)
        let progress_change = (current_progress - self.last_emit_progress).abs();
        if progress_change >= PROGRESS_FORCE_EMIT_THRESHOLD {
            return true;
        }

        false
    }

    /// Try to emit pending update if debounce interval has passed
    fn try_emit_pending_update(&mut self) {
        if let Some(pending) = &self.pending_update {
            let now = std::time::Instant::now();
            let elapsed_ms = now.duration_since(self.last_emit_time).as_millis() as u64;

            if elapsed_ms >= PROGRESS_DEBOUNCE_INTERVAL_MS {
                let update = pending.clone();
                self.emit_progress_update(update);
                self.pending_update = None;
            }
        }
    }

    /// Emit progress update to callback and update tracking state
    fn emit_progress_update(&mut self, update: ProgressUpdate) {
        // Update global progress tracker
        if let Some(callback) = &self.callback {
            callback(update.clone());
        }

        // Update debouncing state
        self.last_emit_time = std::time::Instant::now();
        self.last_emit_progress = update.progress;
    }

    /// Force emit any pending update (call before operation completion)
    pub fn flush_pending_update(&mut self) {
        if let Some(pending) = self.pending_update.take() {
            self.emit_progress_update(pending);
        }
    }
}
