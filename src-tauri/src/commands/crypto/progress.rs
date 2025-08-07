//! Progress tracking commands
//!
//! This module provides Tauri commands for tracking and reporting progress
//! of long-running encryption and decryption operations.

use crate::commands::types::{
    CommandError, CommandResponse, ErrorHandler, ProgressDetails, ValidateInput, ValidationHelper,
};
use crate::constants::*;
use crate::logging::{log_operation, SpanContext};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::instrument;

/// Input for encryption status command
#[derive(Debug, Deserialize)]
pub struct GetEncryptionStatusInput {
    pub operation_id: String,
}

/// Input for progress status command
#[derive(Debug, Deserialize)]
pub struct GetProgressInput {
    pub operation_id: String,
}

/// Response from progress status command
#[derive(Debug, Serialize)]
pub struct GetProgressResponse {
    pub operation_id: String,
    pub progress: f32,
    pub message: String,
    pub details: Option<ProgressDetails>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub estimated_time_remaining: Option<u64>,
    pub is_complete: bool,
}

/// Response from encryption status command
#[derive(Debug, Serialize)]
pub struct EncryptionStatusResponse {
    pub operation_id: String,
    pub status: EncryptionStatus,
    pub progress_percentage: u8,
    pub current_file: Option<String>,
    pub total_files: usize,
    pub processed_files: usize,
    pub total_size: u64,
    pub processed_size: u64,
    pub estimated_time_remaining: Option<u64>, // in seconds
    pub error_message: Option<String>,
}

/// Encryption operation status
#[derive(Debug, Serialize)]
pub enum EncryptionStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
    Cancelled,
}

impl ValidateInput for GetEncryptionStatusInput {
    fn validate(&self) -> Result<(), Box<CommandError>> {
        ValidationHelper::validate_not_empty(&self.operation_id, "Operation ID")?;
        ValidationHelper::validate_length(
            &self.operation_id,
            "Operation ID",
            1,
            MAX_OPERATION_ID_LENGTH,
        )?;
        Ok(())
    }
}

impl ValidateInput for GetProgressInput {
    fn validate(&self) -> Result<(), Box<CommandError>> {
        ValidationHelper::validate_not_empty(&self.operation_id, "Operation ID")?;
        ValidationHelper::validate_length(
            &self.operation_id,
            "Operation ID",
            1,
            MAX_OPERATION_ID_LENGTH,
        )?;
        Ok(())
    }
}

/// Get encryption operation status
#[tauri::command]
#[instrument(skip(input), fields(operation_id = %input.operation_id))]
pub async fn get_encryption_status(
    input: GetEncryptionStatusInput,
) -> CommandResponse<EncryptionStatusResponse> {
    // Create span context for operation tracing
    let span_context = SpanContext::new("get_encryption_status")
        .with_attribute("operation_id", &input.operation_id);

    // Create error handler with span context
    let error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Validate input
    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    // Log operation start with structured context
    let mut attributes = HashMap::new();
    attributes.insert("operation_id".to_string(), input.operation_id.clone());
    log_operation(
        crate::logging::LogLevel::Info,
        "Getting encryption status",
        &span_context,
        attributes,
    );

    // TODO: Implement actual status tracking
    // For now, return a placeholder response indicating the operation is completed
    // In a real implementation, this would query a status store or progress tracker

    let response = EncryptionStatusResponse {
        operation_id: input.operation_id,
        status: EncryptionStatus::Completed,
        progress_percentage: 100,
        current_file: None,
        total_files: 1,
        processed_files: 1,
        total_size: 1024,
        processed_size: 1024,
        estimated_time_remaining: None,
        error_message: None,
    };

    // Log operation completion
    let mut completion_attributes = HashMap::new();
    completion_attributes.insert("status".to_string(), "Completed".to_string());
    completion_attributes.insert("progress_percentage".to_string(), "100".to_string());
    log_operation(
        crate::logging::LogLevel::Info,
        "Encryption status retrieved successfully",
        &span_context,
        completion_attributes,
    );

    Ok(response)
}

/// Get progress for a long-running operation
#[tauri::command]
#[instrument(skip(input), fields(operation_id = %input.operation_id))]
pub async fn get_progress(input: GetProgressInput) -> CommandResponse<GetProgressResponse> {
    // Create span context for operation tracing
    let span_context =
        SpanContext::new("get_progress").with_attribute("operation_id", &input.operation_id);

    // Create error handler with span context
    let error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Validate input
    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    // Get progress from global tracker
    match super::get_global_progress(&input.operation_id) {
        Some(progress) => {
            let is_complete = progress.progress >= 1.0;

            Ok(GetProgressResponse {
                operation_id: progress.operation_id,
                progress: progress.progress,
                message: progress.message,
                details: progress.details,
                timestamp: progress.timestamp,
                estimated_time_remaining: progress.estimated_time_remaining,
                is_complete,
            })
        }
        None => {
            // Return not found error
            Err(error_handler.handle_validation_error(
                "operation_id",
                &format!("Operation '{}' not found", input.operation_id),
            ))
        }
    }
}
