//! Progress manager for tracking operation progress with debouncing
//!
//! This module provides the ProgressManager for efficient progress reporting.

use super::{ProgressCallback, ProgressDetails, ProgressUpdate};
use crate::constants::*;

/// Progress manager for tracking and reporting operation progress with debouncing
pub struct ProgressManager {
    operation_id: String,
    start_time: chrono::DateTime<chrono::Utc>,
    last_update: chrono::DateTime<chrono::Utc>,
    callback: Option<ProgressCallback>,
    total_work: u64,
    completed_work: u64,
    current_message: String,
    current_details: Option<ProgressDetails>,
    // Debouncing fields
    last_emit_time: std::time::Instant,
    last_emit_progress: f32,
    pending_update: Option<ProgressUpdate>,
}

impl ProgressManager {
    /// Create a new progress manager with debouncing support
    pub fn new(operation_id: String, total_work: u64) -> Self {
        let now = chrono::Utc::now();
        let now_instant = std::time::Instant::now();
        Self {
            operation_id,
            start_time: now,
            last_update: now,
            callback: None,
            total_work,
            completed_work: 0,
            current_message: "Starting operation...".to_string(),
            current_details: None,
            // Initialize debouncing fields
            last_emit_time: now_instant,
            last_emit_progress: 0.0,
            pending_update: None,
        }
    }

    /// Set the progress callback
    pub fn with_callback(mut self, callback: ProgressCallback) -> Self {
        self.callback = Some(callback);
        self
    }

    /// Update progress with completed work
    pub fn update_progress(&mut self, completed: u64, message: impl Into<String>) {
        self.completed_work = completed;
        self.current_message = message.into();
        self.report_progress();
    }

    /// Update progress with details
    pub fn update_with_details(
        &mut self,
        completed: u64,
        message: impl Into<String>,
        details: ProgressDetails,
    ) {
        self.completed_work = completed;
        self.current_message = message.into();
        self.current_details = Some(details);
        self.report_progress();
    }

    /// Increment progress by a specific amount
    pub fn increment(&mut self, increment: u64, message: impl Into<String>) {
        self.completed_work += increment;
        self.current_message = message.into();
        self.report_progress();
    }

    /// Set progress to a specific percentage
    pub fn set_progress(&mut self, percentage: f32, message: impl Into<String>) {
        let completed = (self.total_work as f32 * percentage) as u64;
        self.update_progress(completed, message);
    }

    /// Complete the operation
    pub fn complete(&mut self, message: impl Into<String>) {
        self.completed_work = self.total_work;
        self.current_message = message.into();

        // Flush any pending updates before final completion
        self.flush_pending_update();

        // Report final progress (100% - will be emitted immediately)
        self.report_progress();
    }

    /// Report current progress to callback with debouncing
    fn report_progress(&mut self) {
        let progress = if self.total_work > 0 {
            self.completed_work as f32 / self.total_work as f32
        } else {
            0.0
        };

        let estimated_time_remaining = self.calculate_eta();

        let update = ProgressUpdate {
            operation_id: self.operation_id.clone(),
            progress,
            message: self.current_message.clone(),
            details: self.current_details.clone(),
            timestamp: chrono::Utc::now(),
            estimated_time_remaining,
        };

        // Check if we should emit immediately or debounce
        if self.should_emit_immediately(progress) {
            self.emit_progress_update(update);
        } else {
            // Store as pending update for debouncing
            self.pending_update = Some(update);

            // Check if enough time has passed to emit pending update
            self.try_emit_pending_update();
        }

        self.last_update = chrono::Utc::now();
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

    /// Calculate estimated time remaining
    fn calculate_eta(&self) -> Option<u64> {
        if self.completed_work == 0 || self.total_work == 0 {
            return None;
        }

        let elapsed = (chrono::Utc::now() - self.start_time).num_seconds() as u64;
        if elapsed == 0 {
            return None;
        }

        let rate = self.completed_work as f64 / elapsed as f64;
        let remaining_work = self.total_work - self.completed_work;
        let eta = (remaining_work as f64 / rate) as u64;

        Some(eta)
    }

    /// Get current progress percentage
    pub fn progress_percentage(&self) -> u8 {
        if self.total_work > 0 {
            ((self.completed_work as f32 / self.total_work as f32) * PROGRESS_PERCENTAGE_MULTIPLIER)
                as u8
        } else {
            0
        }
    }

    /// Get current progress as fraction
    pub fn progress_fraction(&self) -> f32 {
        if self.total_work > 0 {
            self.completed_work as f32 / self.total_work as f32
        } else {
            0.0
        }
    }

    /// Get current progress update
    pub fn get_current_update(&self) -> ProgressUpdate {
        let progress = self.progress_fraction();
        let estimated_time_remaining = self.calculate_eta();

        ProgressUpdate {
            operation_id: self.operation_id.clone(),
            progress,
            message: self.current_message.clone(),
            details: self.current_details.clone(),
            timestamp: chrono::Utc::now(),
            estimated_time_remaining,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};
    use std::thread;
    use std::time::Duration;

    /// Test helper to capture progress updates
    struct ProgressCapture {
        updates: Arc<Mutex<Vec<ProgressUpdate>>>,
    }

    impl ProgressCapture {
        fn new() -> Self {
            Self {
                updates: Arc::new(Mutex::new(Vec::new())),
            }
        }

        fn create_callback(&self) -> Box<dyn Fn(ProgressUpdate) + Send + Sync> {
            let updates = Arc::clone(&self.updates);
            Box::new(move |update| {
                updates.lock().unwrap().push(update);
            })
        }

        fn get_updates(&self) -> Vec<ProgressUpdate> {
            self.updates.lock().unwrap().clone()
        }

        fn update_count(&self) -> usize {
            self.updates.lock().unwrap().len()
        }
    }

    #[test]
    fn should_emit_start_progress_immediately() {
        let capture = ProgressCapture::new();
        let callback = capture.create_callback();
        let mut progress_manager =
            ProgressManager::new("test_op".to_string(), 100).with_callback(callback);

        // Set progress to 0% (start)
        progress_manager.set_progress(0.0, "Starting operation");

        // Should emit immediately for start (0%)
        assert_eq!(capture.update_count(), 1);
        let updates = capture.get_updates();
        assert_eq!(updates[0].progress, 0.0);
        assert_eq!(updates[0].message, "Starting operation");
    }

    #[test]
    fn should_emit_completion_progress_immediately() {
        let capture = ProgressCapture::new();
        let callback = capture.create_callback();
        let mut progress_manager =
            ProgressManager::new("test_op".to_string(), 100).with_callback(callback);

        // Complete the operation (100%)
        progress_manager.complete("Operation completed");

        // Should emit immediately for completion (100%)
        assert!(capture.update_count() >= 1);
        let updates = capture.get_updates();
        let last_update = updates.last().unwrap();
        assert_eq!(last_update.progress, 1.0);
        assert_eq!(last_update.message, "Operation completed");
    }

    #[test]
    fn should_debounce_small_progress_changes() {
        let capture = ProgressCapture::new();
        let callback = capture.create_callback();
        let mut progress_manager =
            ProgressManager::new("test_op".to_string(), 100).with_callback(callback);

        // Start with 0%
        progress_manager.set_progress(0.0, "Starting");
        let initial_count = capture.update_count();

        // Make small incremental changes (each < 10% threshold)
        progress_manager.set_progress(0.05, "5% complete");
        progress_manager.set_progress(0.08, "8% complete");
        progress_manager.set_progress(0.09, "9% complete");

        // These should be debounced (not immediately emitted)
        // Should still be the initial count since small changes are pending
        assert_eq!(capture.update_count(), initial_count);
    }

    #[test]
    fn should_reduce_ipc_calls_significantly() {
        let capture = ProgressCapture::new();
        let callback = capture.create_callback();
        let mut progress_manager =
            ProgressManager::new("test_op".to_string(), 100).with_callback(callback);

        // Simulate many small progress updates (like what would happen during encryption)
        let progress_steps = 50; // Simulate 50 progress updates

        for i in 0..progress_steps {
            let progress = (i as f32) / (progress_steps as f32);
            progress_manager.set_progress(progress, format!("Step {i}"));

            // Add small delays to simulate real operation timing
            thread::sleep(Duration::from_millis(5));
        }

        // Complete the operation
        progress_manager.complete("All steps completed");

        let total_updates = capture.update_count();

        // Should have significantly fewer updates than the number of progress steps
        // With debouncing, we should have much fewer updates than input
        assert!(
            total_updates < progress_steps / 2,
            "Expected fewer than {} updates, got {}",
            progress_steps / 2,
            total_updates
        );

        // Should still have start and end updates
        let updates = capture.get_updates();
        assert!(updates.len() >= 2); // At least start and end
        assert_eq!(updates[0].progress, 0.0); // First should be 0%
        assert_eq!(updates.last().unwrap().progress, 1.0); // Last should be 100%
    }

    #[test]
    fn should_handle_zero_total_work_gracefully() {
        let capture = ProgressCapture::new();
        let callback = capture.create_callback();
        let mut progress_manager =
            ProgressManager::new("test_op".to_string(), 0).with_callback(callback);

        // Should handle zero total work without panicking
        progress_manager.set_progress(0.0, "Starting with zero work");
        progress_manager.complete("Completed with zero work");

        let updates = capture.get_updates();
        assert!(!updates.is_empty());

        // All progress values should be 0.0 for zero total work
        for update in &updates {
            assert_eq!(update.progress, 0.0);
        }
    }
}
