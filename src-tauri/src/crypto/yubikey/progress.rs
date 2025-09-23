//! Progress reporting integration for YubiKey operations

use crate::commands::command_types::{
    ProgressDetails, ProgressManager, YubiKeyOperationType, YubiKeyPhase,
};
use std::sync::{Arc, Mutex};

/// YubiKey-specific progress manager
pub struct YubiKeyProgressManager {
    progress_manager: Option<Arc<Mutex<ProgressManager>>>,
    operation_type: YubiKeyOperationType,
    current_phase: YubiKeyPhase,
}

impl YubiKeyProgressManager {
    /// Create new YubiKey progress manager
    pub fn new(
        _operation_id: String,
        operation_type: YubiKeyOperationType,
        progress_manager: Option<Arc<Mutex<ProgressManager>>>,
    ) -> Self {
        Self {
            progress_manager,
            operation_type,
            current_phase: YubiKeyPhase::Starting,
        }
    }

    /// Report YubiKey operation progress
    pub fn report_progress(
        &mut self,
        phase: YubiKeyPhase,
        message: String,
        requires_interaction: bool,
        context: Option<String>,
    ) {
        self.current_phase = phase.clone();

        if let Some(ref manager) = self.progress_manager
            && let Ok(mut pm) = manager.lock()
        {
            let details = ProgressDetails::YubiKeyOperation {
                operation: self.operation_type.clone(),
                phase,
                requires_interaction,
                context,
            };

            // Convert phase to progress percentage
            let progress = self.phase_to_progress(&self.current_phase);
            pm.set_progress(progress, message);
            pm.update_with_details((progress * 100.0) as u64, "", details);
        }
    }

    /// Report that PIN entry is required
    pub fn report_pin_required(&mut self, attempts_remaining: u8) {
        let message = format!("YubiKey PIN required ({attempts_remaining} attempts remaining)");
        let context = Some(format!("attempts_remaining:{attempts_remaining}"));

        self.report_progress(YubiKeyPhase::WaitingForPin, message, true, context);
    }

    /// Report that touch confirmation is required
    pub fn report_touch_required(&mut self) {
        let message = "Touch your YubiKey when it blinks".to_string();

        self.report_progress(YubiKeyPhase::WaitingForTouch, message, true, None);
    }

    /// Report operation completion
    pub fn report_completed(&mut self, message: String) {
        self.report_progress(YubiKeyPhase::Completed, message, false, None);

        if let Some(ref manager) = self.progress_manager
            && let Ok(mut pm) = manager.lock()
        {
            pm.complete("YubiKey operation completed");
        }
    }

    /// Report operation failure
    pub fn report_failed(&mut self, error: String) {
        let phase = YubiKeyPhase::Failed {
            error: error.clone(),
        };

        self.report_progress(
            phase,
            format!("YubiKey operation failed: {error}"),
            false,
            Some(error),
        );
    }

    /// Report operation in progress with percentage
    pub fn report_in_progress(&mut self, percentage: u8, message: String) {
        let phase = YubiKeyPhase::InProgress {
            percentage: Some(percentage),
        };

        self.report_progress(phase, message, false, None);
    }

    /// Convert YubiKey phase to progress percentage
    fn phase_to_progress(&self, phase: &YubiKeyPhase) -> f32 {
        match phase {
            YubiKeyPhase::Starting => 0.0,
            YubiKeyPhase::InProgress { percentage } => {
                percentage.map(|p| p as f32 / 100.0).unwrap_or(0.5)
            }
            YubiKeyPhase::WaitingForPin => 0.3,
            YubiKeyPhase::WaitingForTouch => 0.7,
            YubiKeyPhase::Completing => 0.9,
            YubiKeyPhase::Completed => 1.0,
            YubiKeyPhase::Failed { .. } => 0.0,
        }
    }
}

/// Create progress manager for YubiKey operations
pub fn create_yubikey_progress_manager(
    operation_id: String,
    operation_type: YubiKeyOperationType,
) -> YubiKeyProgressManager {
    // Create standard progress manager for YubiKey operations
    let progress_manager = Arc::new(Mutex::new(ProgressManager::new(operation_id.clone(), 100)));

    YubiKeyProgressManager::new(operation_id, operation_type, Some(progress_manager))
}

/// Helper trait for YubiKey operations with progress reporting
pub trait YubiKeyProgressReporting {
    /// Report that the operation is starting
    fn report_starting(&mut self, _message: &str) {
        // Default implementation - can be overridden
    }

    /// Report that PIN is required
    fn report_pin_required(&mut self, _attempts_remaining: u8) {
        // Default implementation - can be overridden
    }

    /// Report that touch is required
    fn report_touch_required(&mut self) {
        // Default implementation - can be overridden
    }

    /// Report operation progress
    fn report_progress(&mut self, _percentage: u8, _message: &str) {
        // Default implementation - can be overridden
    }

    /// Report operation completion
    fn report_completed(&mut self, _message: &str) {
        // Default implementation - can be overridden
    }

    /// Report operation failure
    fn report_failed(&mut self, _error: &str) {
        // Default implementation - can be overridden
    }
}

/// Progress callback function type for YubiKey operations
pub type YubiKeyProgressCallback =
    Box<dyn Fn(YubiKeyOperationType, YubiKeyPhase, String) + Send + Sync>;

/// Create a progress callback that reports to a YubiKeyProgressManager
pub fn create_progress_callback(
    manager: std::sync::Arc<std::sync::Mutex<YubiKeyProgressManager>>,
) -> YubiKeyProgressCallback {
    Box::new(move |_operation_type, phase, message| {
        let requires_interaction = matches!(
            phase,
            YubiKeyPhase::WaitingForPin | YubiKeyPhase::WaitingForTouch
        );

        if let Ok(mut mgr) = manager.lock() {
            mgr.report_progress(phase, message, requires_interaction, None);
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_phase_to_progress_conversion() {
        let manager = YubiKeyProgressManager::new(
            "test".to_string(),
            YubiKeyOperationType::Initialization,
            None,
        );

        assert_eq!(manager.phase_to_progress(&YubiKeyPhase::Starting), 0.0);
        assert_eq!(manager.phase_to_progress(&YubiKeyPhase::Completed), 1.0);
        assert_eq!(manager.phase_to_progress(&YubiKeyPhase::WaitingForPin), 0.3);
        assert_eq!(
            manager.phase_to_progress(&YubiKeyPhase::WaitingForTouch),
            0.7
        );

        let in_progress = YubiKeyPhase::InProgress {
            percentage: Some(50),
        };
        assert_eq!(manager.phase_to_progress(&in_progress), 0.5);
    }

    #[test]
    fn test_yubikey_progress_manager_creation() {
        let manager = create_yubikey_progress_manager(
            "test_operation".to_string(),
            YubiKeyOperationType::Detection,
        );

        assert!(manager.progress_manager.is_some());
        assert!(matches!(
            manager.operation_type,
            YubiKeyOperationType::Detection
        ));
    }
}
