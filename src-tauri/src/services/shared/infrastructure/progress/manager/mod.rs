//! Progress manager for tracking operation progress with debouncing
//!
//! This module provides the ProgressManager for efficient progress reporting.

mod debouncer;
mod utils;

use self::debouncer::ProgressDebouncer;
use self::utils::{create_progress_update, progress_to_fraction, progress_to_percentage};
use crate::commands::command_types::{ProgressCallback, ProgressDetails, ProgressUpdate};

/// Progress manager for tracking and reporting operation progress with debouncing
pub struct ProgressManager {
    operation_id: String,
    start_time: chrono::DateTime<chrono::Utc>,
    last_update: chrono::DateTime<chrono::Utc>,
    total_work: u64,
    completed_work: u64,
    current_message: String,
    current_details: Option<ProgressDetails>,
    debouncer: ProgressDebouncer,
}

impl ProgressManager {
    /// Create a new progress manager with debouncing support
    pub fn new(operation_id: String, total_work: u64) -> Self {
        let now = chrono::Utc::now();
        Self {
            operation_id,
            start_time: now,
            last_update: now,
            total_work,
            completed_work: 0,
            current_message: "Starting operation...".to_string(),
            current_details: None,
            debouncer: ProgressDebouncer::new(),
        }
    }

    /// Set the progress callback
    pub fn with_callback(mut self, callback: ProgressCallback) -> Self {
        self.debouncer.set_callback(callback);
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
        let update = create_progress_update(
            &self.operation_id,
            self.completed_work,
            self.total_work,
            &self.current_message,
            self.current_details.as_ref(),
            self.start_time,
        );

        self.debouncer.process_update(update);
        self.last_update = chrono::Utc::now();
    }

    /// Force emit any pending update (call before operation completion)
    pub fn flush_pending_update(&mut self) {
        self.debouncer.flush_pending_update();
    }

    /// Get current progress percentage
    pub fn progress_percentage(&self) -> u8 {
        progress_to_percentage(self.completed_work, self.total_work)
    }

    /// Get current progress as fraction
    pub fn progress_fraction(&self) -> f32 {
        progress_to_fraction(self.completed_work, self.total_work)
    }

    /// Get current progress update
    pub fn get_current_update(&self) -> ProgressUpdate {
        create_progress_update(
            &self.operation_id,
            self.completed_work,
            self.total_work,
            &self.current_message,
            self.current_details.as_ref(),
            self.start_time,
        )
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
