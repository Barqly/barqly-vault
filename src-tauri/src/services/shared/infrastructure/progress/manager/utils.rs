//! Utility functions for progress management
//!
//! This module provides helper functions for calculating progress metrics,
//! ETAs, and formatting progress information.

use crate::commands::command_types::{ProgressDetails, ProgressUpdate};
use crate::constants::PROGRESS_PERCENTAGE_MULTIPLIER;

/// Calculate estimated time remaining based on progress
pub fn calculate_eta(
    completed_work: u64,
    total_work: u64,
    start_time: chrono::DateTime<chrono::Utc>,
) -> Option<u64> {
    if completed_work == 0 || total_work == 0 {
        return None;
    }

    let elapsed = (chrono::Utc::now() - start_time).num_seconds() as u64;
    if elapsed == 0 {
        return None;
    }

    let rate = completed_work as f64 / elapsed as f64;
    let remaining_work = total_work - completed_work;
    let eta = (remaining_work as f64 / rate) as u64;

    Some(eta)
}

/// Convert progress to percentage (0-100)
pub fn progress_to_percentage(completed_work: u64, total_work: u64) -> u8 {
    if total_work > 0 {
        ((completed_work as f32 / total_work as f32) * PROGRESS_PERCENTAGE_MULTIPLIER) as u8
    } else {
        0
    }
}

/// Convert progress to fraction (0.0-1.0)
pub fn progress_to_fraction(completed_work: u64, total_work: u64) -> f32 {
    if total_work > 0 {
        completed_work as f32 / total_work as f32
    } else {
        0.0
    }
}

/// Create a progress update with current state
pub fn create_progress_update(
    operation_id: &str,
    completed_work: u64,
    total_work: u64,
    message: &str,
    details: Option<&ProgressDetails>,
    start_time: chrono::DateTime<chrono::Utc>,
) -> ProgressUpdate {
    let progress = progress_to_fraction(completed_work, total_work);
    let estimated_time_remaining = calculate_eta(completed_work, total_work, start_time);

    ProgressUpdate {
        operation_id: operation_id.to_string(),
        progress,
        message: message.to_string(),
        details: details.cloned(),
        timestamp: chrono::Utc::now(),
        estimated_time_remaining,
    }
}
